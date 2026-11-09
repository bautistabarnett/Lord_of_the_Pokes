import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Monster, PlayerStats, CombatStatusEffect, ActiveEffect, CombatStance, CombatTrigger, LogEntry, TerrainType, PassiveSkill } from '../types';
import { COMPOSITE_SYNERGIES, PASSIVE_SET_BONUSES, PASSIVE_SKILLS_POOL } from '../constants';
import { BALANCE, resolveTriadClash, STANCE_META, TriadClashResult } from '../services/gameBalance';

interface UseCombatEngineProps {
  playerStats: PlayerStats | null;
  playerHp: number;
  setPlayerHp: React.Dispatch<React.SetStateAction<number>>;
  onVictory: (monsters: Monster[]) => void;
  onDefeat: () => void;
  addLog: (msg: string, type?: LogEntry['type']) => void;
  environment?: {
      terrain: TerrainType;
      isNight: boolean;
      activeSkillIds: string[];
  };
}

export const generateTurnBatch = (playerAgi: number, enemyAgi: number): ('player' | 'enemy')[] => {
    const pAgi = Math.max(1, playerAgi);
    const eAgi = Math.max(1, enemyAgi);

    // Continuous Action Gauge: eliminates dead zones so every +1% speed matters
    let pGauge = pAgi >= eAgi ? pAgi - eAgi : 0;
    let eGauge = eAgi > pAgi ? eAgi - pAgi : 0;
    const batch: ('player' | 'enemy')[] = [];

    for (let step = 0; step < 8 && batch.length < 6; step++) {
        pGauge += pAgi;
        eGauge += eAgi;

        while ((pGauge >= 100 || eGauge >= 100) && batch.length < 6) {
            if (pGauge >= eGauge && pGauge >= 100) {
                batch.push('player');
                pGauge -= 100;
            } else if (eGauge >= 100) {
                batch.push('enemy');
                eGauge -= 100;
            } else {
                break;
            }
        }
    }

    if (batch.length === 0) {
        batch.push(pAgi >= eAgi ? 'player' : 'enemy');
        batch.push(pAgi >= eAgi ? 'enemy' : 'player');
    }
    return batch;
};

// Helper to consolidate stacking effects
const applyStatusEffects = (current: CombatStatusEffect[], incoming: CombatStatusEffect[]): CombatStatusEffect[] => {
    const next = [...current];
    incoming.forEach(inc => {
        // Match by type, target type, name, AND specific monster target ID if present
        const existingIdx = next.findIndex(e => 
            e.type === inc.type && 
            e.target === inc.target && 
            e.name === inc.name &&
            e.source === inc.source && // Important to separate distinct sources if needed
            (e as any).targetId === (inc as any).targetId // Check specific target
        );

        if (existingIdx >= 0) {
            const existing = next[existingIdx];
            // Determine if this effect type stacks
            const isHardCC = ['stun', 'freeze', 'shield', 'cleanse'].includes(inc.type);
            
            // Scaling strength specifically adds value on stack
            const isScaling = inc.type === 'scaling_strength';
            
            next[existingIdx] = {
                ...existing,
                duration: inc.duration, // Refresh duration
                stacks: isHardCC ? 1 : existing.stacks + 1, // Hard CC/Shield doesn't stack intensity, just refreshes
                value: isScaling ? existing.value + inc.value : Math.max(existing.value, inc.value) // Scaling adds, others take max
            };
        } else {
            next.push(inc);
        }
    });
    return next;
};

export const useCombatEngine = ({ 
  playerStats, 
  playerHp, 
  setPlayerHp, 
  onVictory, 
  onDefeat,
  addLog,
  environment
}: UseCombatEngineProps) => {
  const [isFighting, setIsFighting] = useState(false);
  const [activeMonsters, setActiveMonsters] = useState<Monster[]>([]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [turnQueue, setTurnQueue] = useState<('player' | 'enemy')[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatStance, setCombatStance] = useState<CombatStance>(CombatStance.WILL);
  const [actionTimerProgress, setActionTimerProgress] = useState<number>(0);
  const [lastClashResult, setLastClashResult] = useState<{
    playerStance: CombatStance;
    enemyStance: CombatStance;
    result: TriadClashResult;
    timestamp: number;
  } | null>(null);

  const combatStanceRef = useRef<CombatStance>(combatStance);
  useEffect(() => {
    combatStanceRef.current = combatStance;
  }, [combatStance]);

  const actionIntervalRef = useRef<any>(null);
  const turnTimeoutRef = useRef<any>(null);

  const [combatStatusEffects, setCombatStatusEffects] = useState<CombatStatusEffect[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [potionsRemaining, setPotionsRemaining] = useState<number>(2);
  
  // Track Cooldowns for Skills (SkillID -> Turns Remaining)
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});

  const addToCombatLog = (msg: string) => setCombatLog(prev => [...prev, msg]);

  // --- BATTLE START ---
  const startBattle = useCallback(async (monsters: Monster[], level: number) => {
    if (!playerStats) return;
    setActiveMonsters(monsters);
    setPlayerHp(playerStats.maxHp);
    
    // Average enemy dexterity for turn calculation
    const avgEnemyDex = monsters.reduce((sum, m) => sum + m.dexterity, 0) / monsters.length;
    const effectivePlayerAgi = playerStats.dexterity * (1 + (playerStats.attackSpeed || 0) / 100);
    setTurnQueue(generateTurnBatch(effectivePlayerAgi, avgEnemyDex));
    
    if (monsters.length > 1) {
        addToCombatLog(`Encountered a group of ${monsters.length} enemies!`);
    } else {
        addToCombatLog(`Encountered ${monsters[0].name} (${monsters[0].rarity})!`);
    }
    
    setCombatStatusEffects([]);
    setSkillCooldowns({});
    setTurnCount(1);
    setSelectedTargetId(monsters.length > 0 ? monsters[0].id : null);
    setPotionsRemaining(2);
    setIsFighting(true);
    setCombatStance(CombatStance.WILL);
    combatStanceRef.current = CombatStance.WILL;
    setActionTimerProgress(0);
    setLastClashResult(null);
    
    // Initial Environment Check & Battle Start Triggers
    if (environment) {
        const { terrain, isNight, activeSkillIds } = environment;
        const initEffects: CombatStatusEffect[] = [];

        if (activeSkillIds.includes('night_prowler') && isNight) {
            addToCombatLog("🌑 Nightstalker active! Crit Chance increased.");
        }

        if (activeSkillIds.includes('tidal_affinity') && (terrain === TerrainType.SWAMP)) {
            addToCombatLog("🌊 Tidal Affinity: Regenerating in the swamp.");
            initEffects.push({
                id: 'tidal-regen', type: 'regen', name: 'Tidal Ward', duration: 10, value: 0.05, stacks: 1, source: 'environment', target: 'player', description: 'Swamp Healing'
            });
        }
        
        if (activeSkillIds.includes('void_form')) {
             const skill = PASSIVE_SKILLS_POOL.find(s => s.id === 'void_form');
             if(skill) {
                 addToCombatLog(`🌌 ${skill.name} activates! Ethereal form entered.`);
                 initEffects.push({
                    id: 'void-form', type: 'dodge_boost' as any, name: 'Void Form', duration: 2, value: 50, stacks: 1, source: 'skill', target: 'player', description: '+50% Dodge'
                });
             }
        }
        
        if (initEffects.length > 0) {
            setCombatStatusEffects(prev => applyStatusEffects(prev, initEffects));
        }
    }

    // Trigger onBattleStart procs (item Bastion / Aegis shields and Mastery Titles)
    if (playerStats.equippedItemProcs && playerStats.equippedItemProcs.length > 0) {
        const battleStartEffects: CombatStatusEffect[] = [];
        playerStats.equippedItemProcs.forEach(itemProc => {
            if (itemProc.proc.trigger === 'onBattleStart' && Math.random() <= itemProc.proc.chance) {
                const isTitle = itemProc.id.startsWith('title_');
                if (itemProc.proc.effect.type === 'shield') {
                    battleStartEffects.push({
                        id: `${itemProc.id}-start`,
                        type: 'shield',
                        name: itemProc.name,
                        duration: itemProc.proc.effect.duration || 3,
                        value: itemProc.proc.effect.value,
                        stacks: 1,
                        source: isTitle ? 'skill' : 'item',
                        target: 'player',
                        description: itemProc.proc.description
                    });
                    addToCombatLog(`🛡️ ${itemProc.name}: Bastion ward active!`);
                } else if (itemProc.proc.effect.type === 'buff' && itemProc.proc.effect.subType) {
                    battleStartEffects.push({
                        id: `${itemProc.id}-start`,
                        type: itemProc.proc.effect.subType as any,
                        name: itemProc.name,
                        duration: itemProc.proc.effect.duration || 3,
                        value: itemProc.proc.effect.value,
                        stacks: 1,
                        source: isTitle ? 'skill' : 'item',
                        target: 'player',
                        description: itemProc.proc.description
                    });
                    addToCombatLog(`✨ ${itemProc.name} empowers you!`);
                }
            }
        });
        if (battleStartEffects.length > 0) {
            setCombatStatusEffects(prev => applyStatusEffects(prev, battleStartEffects));
        }
    }
  }, [playerStats, setPlayerHp, environment]);

  const updateMonsterImage = useCallback((url: string) => {
      // Updates the first monster for now, assuming boss or main target visual
      setActiveMonsters(prev => prev.length > 0 ? [{ ...prev[0], imageUrl: url }, ...prev.slice(1)] : []);
  }, []);

  // --- DYNAMIC AGILITY RECALC ---
  useEffect(() => {
      if (!isFighting || activeMonsters.length === 0 || !playerStats) return;
      
      const playerChillStacks = combatStatusEffects
        .filter(e => e.target === 'player' && e.type === 'chill')
        .reduce((acc, curr) => acc + curr.stacks, 0);
      
      const avgDex = activeMonsters.reduce((sum, m) => sum + m.dexterity, 0) / activeMonsters.length;
      
      // Calculate group chill? For now, ignore enemy chill on turn recalc complexity
      const pAgi = playerStats.dexterity * (1 + (playerStats.attackSpeed || 0) / 100) * Math.pow(0.8, playerChillStacks);
      const eAgi = avgDex; // Simplified group agility

      if (turnQueue.length < 2) {
          const nextBatch = generateTurnBatch(pAgi, eAgi);
          setTurnQueue(prev => [...prev, ...nextBatch]);
      }
  }, [turnQueue, playerStats, activeMonsters, combatStatusEffects, isFighting]);

  // --- TRIGGERS ---
  const processTriggers = (trigger: CombatTrigger, actor: 'player' | 'enemy', damageDealt: number = 0, targetMonsterIndex: number = 0): number => {
      if (!playerStats || activeMonsters.length === 0) return 0;
      const newEffects: CombatStatusEffect[] = [];
      let triggerDamage = 0;
      
      const targetMonster = activeMonsters[targetMonsterIndex];

      // 1. PLAYER PASSIVES & SKILLS
      if (actor === 'player') {
          // Environmental Triggers
          if (environment) {
              const { terrain, activeSkillIds } = environment;
              if (trigger === 'onHit' && activeSkillIds.includes('forest_fire') && terrain === TerrainType.FOREST) {
                   if (Math.random() < 0.4 && targetMonster) {
                       newEffects.push({
                           id: `wildfire-${Date.now()}`, type: 'burn', name: 'Wildfire', duration: 3, value: 0.1, stacks: 1, source: 'environment', target: 'enemy', description: 'Forest fueling fire',
                           targetId: targetMonster.id
                       } as any);
                       addToCombatLog("🌲🔥 Wildfire spreads!");
                   }
              }
          }

          // A. Set Bonuses
          playerStats.activeSetBonuses.forEach(theme => {
              const bonus = PASSIVE_SET_BONUSES.find(b => b.theme === theme);
              if (bonus && bonus.triggerCondition === trigger && Math.random() < bonus.procChance) {
                  let target: 'player' | 'enemy' = 'enemy';
                  if (['regen', 'crit_boost', 'reflect'].includes(bonus.procEffect.type)) target = 'player';
                  
                  const effectObj: any = {
                      id: Date.now() + Math.random().toString(),
                      type: bonus.procEffect.type,
                      name: bonus.name,
                      duration: bonus.procEffect.duration,
                      value: bonus.procEffect.value,
                      stacks: 1,
                      source: 'set_bonus',
                      target: target,
                      description: `Proc from ${bonus.name}`
                  };

                  if (target === 'enemy' && targetMonster) {
                      effectObj.targetId = targetMonster.id;
                  }

                  newEffects.push(effectObj);
                  addToCombatLog(`>> ${bonus.name} Triggered!`);
              }
          });

          // B. Complex Skill & Equipped Item Procs
          const equippedSkills = PASSIVE_SKILLS_POOL.filter(s => playerStats.equippedSkillIds.includes(s.id));
          const allProcSources: { id: string; name: string; proc?: any; isItem?: boolean }[] = [
              ...equippedSkills,
              ...((playerStats.equippedItemProcs || []).map(ip => ({ id: ip.id, name: ip.name, proc: ip.proc, isItem: true })))
          ];
          
          allProcSources.forEach(skill => {
              if (skill.proc && skill.proc.trigger === trigger) {
                  if ((skillCooldowns[skill.id] || 0) > 0) return;
                  if (Math.random() > skill.proc.chance) return;

                  if (skill.proc.conditions) {
                      const conditionsMet = skill.proc.conditions.every(cond => {
                          if (cond.type === 'hp_below') return (playerHp / playerStats.maxHp) < Number(cond.value);
                          if (cond.type === 'hp_above') return (playerHp / playerStats.maxHp) > Number(cond.value);
                          if (cond.type === 'enemy_hp_below') return targetMonster ? (targetMonster.currentHp / targetMonster.maxHp) < Number(cond.value) : false;
                          if (cond.type === 'turn_count_multiple') return (turnCount % Number(cond.value)) === 0;
                          if (cond.type === 'has_buff') return combatStatusEffects.some(e => e.target === 'player' && e.type === cond.value);
                          if (cond.type === 'enemy_has_debuff') return targetMonster ? combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === cond.value) : false;
                          return true;
                      });
                      if (!conditionsMet) return;
                  }

                  if (skill.proc.cost) {
                      let costVal = 0;
                      if (skill.proc.cost.type === 'hp_percent') costVal = Math.floor(playerStats.maxHp * skill.proc.cost.value);
                      if (skill.proc.cost.type === 'hp_flat') costVal = skill.proc.cost.value;
                      
                      if (playerHp <= costVal) return;
                      
                      setPlayerHp(prev => Math.max(1, prev - costVal));
                      addToCombatLog(`🩸 ${skill.name} sacrifices ${costVal} HP!`);
                  }

                  const eff = skill.proc.effect;
                  
                  if (eff.type === 'multi_hit') {
                       const chainedDmg = Math.floor(damageDealt * eff.value);
                       triggerDamage += chainedDmg;
                       // Damage is applied in main loop, we just return the value here
                       addToCombatLog(`⚔️ ${skill.name}: Echo strike for ${chainedDmg}!`);
                  } 
                  else if (eff.type === 'damage_phys' || eff.type === 'damage_magic') {
                       let dmg = Math.floor(playerStats.damage * eff.value);
                       if (eff.type === 'damage_magic' && (playerStats.spellPower || 0) > 0) {
                           dmg = Math.floor(dmg * (1 + (playerStats.spellPower || 0) / 100));
                       }
                       triggerDamage += dmg;
                       // Direct dmg trigger often applies to current target
                       addToCombatLog(`⚡ ${skill.name} triggers for ${dmg} damage!`);
                  }
                  else if (eff.type === 'heal') {
                       const healVal = Math.floor(playerStats.maxHp * eff.value);
                       setPlayerHp(prev => Math.min(playerStats.maxHp, prev + healVal));
                       addToCombatLog(`💚 ${skill.name} heals you for ${healVal}!`);
                  }
                  else if (eff.type === 'cleanse') {
                       setCombatStatusEffects(prev => prev.filter(e => e.target !== 'player' || !['burn','poison','freeze','blind','chill','stun'].includes(e.type)));
                       addToCombatLog(`✨ ${skill.name} purifies you!`);
                  }
                  else if (eff.type === 'buff' || eff.type === 'debuff') {
                      let target: 'player' | 'enemy' = 'player';
                      if (eff.type === 'debuff') target = 'enemy';
                      if (eff.subType === 'burn' || eff.subType === 'poison') target = 'enemy';
                      
                      const effectObj: any = {
                          id: `${skill.id}-${Date.now()}`,
                          type: (eff.subType || 'buff') as any,
                          name: skill.name,
                          duration: eff.duration || 3,
                          value: eff.value,
                          stacks: 1,
                          source: 'skill',
                          target: target,
                          description: skill.proc.description
                      };

                      if (target === 'enemy' && targetMonster) {
                          effectObj.targetId = targetMonster.id;
                      }

                      newEffects.push(effectObj);
                      addToCombatLog(`✨ ${skill.name} activates!`);
                  }
                  else if (eff.type === 'shield') {
                       newEffects.push({
                          id: `${skill.id}-${Date.now()}`,
                          type: 'shield',
                          name: skill.name,
                          duration: eff.duration || 1,
                          value: eff.value,
                          stacks: 1,
                          source: 'skill',
                          target: 'player',
                          description: 'Shielded'
                      });
                      addToCombatLog(`🛡️ ${skill.name} shields you!`);
                  }

                  if (skill.proc.cooldown > 0) {
                      setSkillCooldowns(prev => ({ ...prev, [skill.id]: skill.proc.cooldown }));
                  }
              }
          });

          // C. Synergies
          playerStats.activeSynergies.forEach(synId => {
              const synergy = COMPOSITE_SYNERGIES.find(s => s.id === synId);
              if (synergy && synergy.effect.trigger === trigger) {
                  if (synergy.id === 'frostburn' && targetMonster) {
                      const isChilled = combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'chill');
                      if (isChilled) {
                          const burst = Math.floor(playerStats.damage * synergy.effect.value);
                          triggerDamage += burst;
                          addToCombatLog(`❄️🔥 FROSTBURN! Steam explosion deals ${burst} dmg!`);
                      }
                  }
                  else if (synergy.id === 'biohazard' && trigger === 'onTakeDamage' && targetMonster) {
                      newEffects.push({
                          id: `biohazard-retaliate-${Date.now()}`,
                          type: 'poison',
                          name: 'Biohazard Spores',
                          duration: 3,
                          value: 0.04,
                          stacks: 1,
                          source: 'synergy',
                          target: 'enemy',
                          targetId: targetMonster.id,
                          description: 'Biohazard Contagion'
                      });
                      addToCombatLog(`☣️ Biohazard: Toxic spores retaliate, poisoning ${targetMonster.name}!`);
                  }
                  else if (synergy.id === 'dark_momentum' && trigger === 'onCrit') {
                      newEffects.push({
                          id: `dark-momentum-${Date.now()}`,
                          type: 'dodge_boost' as any,
                          name: 'Dark Momentum',
                          duration: 2,
                          value: 35,
                          stacks: 1,
                          source: 'synergy',
                          target: 'player',
                          description: '+35% Dodge & Immediate Turn Surge'
                      });
                      setTurnQueue(prev => ['player', ...prev]);
                      addToCombatLog(`🌑 Dark Momentum: Critical surge! Extra turn gained & +35% Dodge!`);
                  }
              }
          });
      }

      // 2. ENEMY MALEDICTS (Active) - Process all active monsters
      if (actor === 'enemy') {
          activeMonsters.forEach(monster => {
              // Only alive monsters trigger stuff
              if (monster.currentHp <= 0) return;

              monster.maledicts.forEach(m => {
                  if (m.trigger === trigger) {
                       if (m.id === 'arcane' && m.triggerEffect?.type === 'reflect') {
                           newEffects.push({
                               id: `arcane-shield-${monster.id}-${Date.now()}`, type: 'shield', name: 'Arcane Shield', duration: 1, value: 1, stacks: 1, source: 'maledict', target: 'enemy', description: 'Nullifies next hit.',
                               targetId: monster.id
                           } as any);
                           addToCombatLog(`✨ ${monster.name}'s ${m.name} activates!`);
                      }
                      else if (m.id === 'plague' && m.triggerEffect?.type === 'ground_hazard') {
                          newEffects.push({
                               id: `plague-${Date.now()}`, type: 'poison', name: 'Plague Cloud', duration: 3, value: m.triggerEffect.value, stacks: 1, source: 'maledict', target: 'player', description: 'Poisoned.'
                           });
                           addToCombatLog(`🤢 ${monster.name} radiates Poison!`);
                      }
                      else if (m.triggerEffect && Math.random() < m.triggerEffect.chance) {
                           const eff = m.triggerEffect;
                           if (eff.type === 'shuffle_turn') {
                               addToCombatLog(`⏳ ${m.name}: Turn queue shuffled.`);
                               setTurnQueue(prev => [...prev].sort(() => Math.random() - 0.5));
                           }
                           if (eff.type === 'debuff_player') {
                               newEffects.push({
                                   id: Date.now() + Math.random().toString(), type: 'burn', name: m.name, duration: 3, value: eff.value, stacks: 1, source: 'maledict', target: 'player', description: 'Burned.'
                               });
                               addToCombatLog(`🔥 ${monster.name} burns you!`);
                           }
                      }
                  }
              });
          });
      }

      // 3. ENEMY REACTIVE (Triggered by Player Action on a specific target)
      if (actor === 'player' && trigger === 'onHit' && targetMonster) {
           targetMonster.maledicts.forEach(m => {
                if (m.trigger === 'onTakeDamage' && m.triggerEffect && Math.random() < m.triggerEffect.chance) {
                     if (m.triggerEffect.type === 'debuff_player') {
                          newEffects.push({
                              id: Date.now() + Math.random().toString(), type: 'burn', name: m.name, duration: 2, value: m.triggerEffect.value, stacks: 1, source: 'maledict', target: 'player'
                          });
                          addToCombatLog(`⚠️ ${targetMonster.name} reacts!`);
                     }
                }
           });
      }

      if (newEffects.length > 0) {
          setCombatStatusEffects(prev => applyStatusEffects(prev, newEffects));
      }
      return triggerDamage;
  };

  const processCombatEffects = (target: 'player' | 'enemy') => {
      if (activeMonsters.length === 0 || !playerStats) return;
      
      let newPlayerHp = playerHp;
      const monsterUpdates: { id: string, hp: number }[] = [];
      const effectsToRemoveIds: string[] = [];

      // Player Effects
      if (target === 'player') {
          const effects = combatStatusEffects.filter(e => e.target === 'player');
          effects.forEach(effect => {
              const stacks = effect.stacks;
              const baseVal = effect.value;
              
              if (effect.type === 'burn' || effect.type === 'poison') {
                  // Controlled DoT damage: max 5% HP per stack to prevent instant death
                  const cappedBaseVal = Math.min(0.05, baseVal);
                  const dot = Math.max(1, Math.floor(playerStats.maxHp * cappedBaseVal * stacks));
                  newPlayerHp -= dot;
                  addToCombatLog(`Hero takes ${dot} ${effect.type} dmg.`);
              }
              if (effect.type === 'regen') {
                  const heal = Math.floor(playerStats.maxHp * baseVal * stacks);
                  newPlayerHp = Math.min(playerStats.maxHp, newPlayerHp + heal);
                  addToCombatLog(`Hero heals ${heal}.`);
              }
              effectsToRemoveIds.push(effect.id); // Mark for duration decrement
          });
          setPlayerHp(newPlayerHp);
      } 
      // Enemy Effects (Iterate through all monsters)
      else {
          activeMonsters.forEach(m => {
              if (m.currentHp <= 0) return;
              let hp = m.currentHp;
              // Filter effects targeting THIS monster
              const effects = combatStatusEffects.filter(e => e.target === 'enemy' && (e as any).targetId === m.id);
              
              effects.forEach(effect => {
                  const stacks = effect.stacks;
                  const baseVal = effect.value;
                  
                  if (effect.type === 'burn' || effect.type === 'poison') {
                      const spellMultiplier = effect.source !== 'maledict' ? (1 + (playerStats.spellPower || 0) / 100) : 1;
                      const dot = Math.max(1, Math.floor(m.maxHp * baseVal * stacks * spellMultiplier));
                      hp -= dot;
                      addToCombatLog(`${m.name} takes ${dot} ${effect.type} dmg.`);
                  }
                  // Enemy regen?
                  effectsToRemoveIds.push(effect.id);
              });
              if (hp !== m.currentHp) monsterUpdates.push({ id: m.id, hp });
          });

          if (monsterUpdates.length > 0) {
              setActiveMonsters(prev => prev.map(m => {
                  const update = monsterUpdates.find(u => u.id === m.id);
                  return update ? { ...m, currentHp: update.hp } : m;
              }));
          }
      }
      
      // Decrement durations for the processed effects
      setCombatStatusEffects(prev => prev.map(e => {
          if (e.target !== target) return e;
          // Player reaction defensive buffs (shield, dodge_boost) only decrement on enemy attack turns
          if (target === 'player' && ['shield', 'dodge_boost'].includes(e.type)) {
              return e;
          }
          return { ...e, duration: e.duration - 1 };
      }).filter(e => e.duration > 0));
  };

  // --- TURN RESOLUTION ---
  const resolveCombatTurn = (overrideStance?: CombatStance) => {
    if (activeMonsters.length === 0 || !playerStats) return;
    
    // Decrease skill cooldowns
    setSkillCooldowns(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
            if (next[k] > 0) next[k] -= 1;
            if (next[k] <= 0) delete next[k];
        });
        return next;
    });

    const isFrozen = combatStatusEffects.some(e => e.target === 'player' && (e.type === 'freeze' || e.type === 'stun'));
    if (isFrozen) {
        addToCombatLog("You are Frozen/Stunned and cannot act!");
        processCombatEffects('player');
        return;
    }

    const synergyDmg = processTriggers('onStartTurn', 'player');
    processCombatEffects('player');

    // Vitality Health Regeneration: Turn-based sustained defense
    if ((playerStats.healthRegen || 0) > 0 && playerHp < playerStats.maxHp) {
        const regenAmt = Math.min(playerStats.healthRegen || 1, playerStats.maxHp - playerHp);
        setPlayerHp(p => Math.min(playerStats.maxHp, p + regenAmt));
        addToCombatLog(`💚 Vitality: Hero regenerates +${regenAmt} HP.`);
    }
    
    if (playerHp <= 0) { handleDefeatInternal(); return; }

    // TARGETING: User-selected target if alive, otherwise first living monster
    let targetIndex = activeMonsters.findIndex(m => m.id === selectedTargetId && m.currentHp > 0);
    if (targetIndex === -1) {
        targetIndex = activeMonsters.findIndex(m => m.currentHp > 0);
    }
    if (targetIndex === -1) {
        handleVictoryInternal(activeMonsters);
        return;
    }
    const targetMonster = activeMonsters[targetIndex];

    // Check for Arcane Shield on Target
    const isShielded = combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'shield');

    let monsterHp = targetMonster.currentHp - synergyDmg;

    // SCALING STRENGTH BUFF
    const scalingStrength = combatStatusEffects.find(e => e.target === 'player' && e.type === 'scaling_strength');
    let dynamicStr = 0;
    if (scalingStrength) {
        dynamicStr = scalingStrength.value;
        if (dynamicStr === 5 || dynamicStr % 15 === 0) addToCombatLog(`💪 Scaling Strength: +${dynamicStr} Dmg`);
    }

    let rawDmg = (playerStats.damage + dynamicStr) * (0.8 + Math.random() * 0.4);

    // Lucky Strike: Every 20% Magic Find gives +1% chance of Lucky Strike (max 10% chance)
    const luckyChance = Math.min(10, Math.floor((playerStats.magicFind || 0) / 20));
    const isLucky = luckyChance > 0 && Math.random() * 100 < luckyChance;
    if (isLucky) {
        rawDmg *= 1.25;
        addToCombatLog("🍀 Lucky Strike! Fortune favors your blow (+25% damage)!");
    }
    
    if (environment) {
        if (environment.activeSkillIds.includes('forest_fire') && environment.terrain === TerrainType.FOREST) {
            rawDmg *= 1.2;
        }
    }

    const activeStance = overrideStance || combatStanceRef.current;
    const enemyStance = targetMonster.currentStance || CombatStance.RESOLVE;
    const clash = resolveTriadClash(activeStance, enemyStance);

    setLastClashResult({
      playerStance: activeStance,
      enemyStance,
      result: clash,
      timestamp: Date.now()
    });

    if (clash === 'WIN') {
      rawDmg *= BALANCE.COMBAT.triadConfig.winDamageMult;
      addToCombatLog(`⚔️ ¡TRIUNFO! Tu ${STANCE_META[activeStance].name} quiebra el ${STANCE_META[enemyStance].name} de ${targetMonster.name} (+35% daño)!`);
    } else if (clash === 'LOSE') {
      rawDmg *= BALANCE.COMBAT.triadConfig.loseDamageMult;
      addToCombatLog(`⚠️ ¡DESVENTAJA! El ${STANCE_META[enemyStance].name} de ${targetMonster.name} resiste tu ${STANCE_META[activeStance].name} (daño al 60%).`);
    } else {
      addToCombatLog(`⚖️ Choque parejo: Ambas posturas son ${STANCE_META[activeStance].name}.`);
    }

    const isPoisoned = combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'poison');
    const isFrozenEnemy = combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'freeze');
    
    if (isPoisoned && playerStats.activeSynergies.includes('biohazard')) rawDmg *= 1.2;
    if (isFrozenEnemy) {
        rawDmg *= 1.5;
        addToCombatLog("Shattering strike!");
    }

    let critMult = BALANCE.COMBAT.critMultiplier;
    const critBoost = combatStatusEffects.find(e => e.type === 'crit_boost');
    if (critBoost) critMult += (critBoost.value / 100);

    let finalCritChance = playerStats.critChance;
    if (environment && environment.isNight && environment.activeSkillIds.includes('night_prowler')) {
        finalCritChance += 25;
    }

    const isCrit = Math.random() * 100 < finalCritChance;
    if (isCrit) rawDmg *= critMult;

    const onAttackDmg = processTriggers('onAttack', 'player', 0, targetIndex);
    monsterHp -= onAttackDmg;

    // Asymptotic monster armor mitigation
    const monsterMitigationPercent = BALANCE.COMBAT.calculateMitigationPercent(targetMonster.armor, targetMonster.level);
    let dmg = Math.max(1, Math.floor(rawDmg * (1 - monsterMitigationPercent)));
    
    if (isShielded) {
        dmg = 0;
        addToCombatLog(`🚫 Blocked by ${targetMonster.name}'s Shield!`);
        setCombatStatusEffects(prev => prev.filter(e => !(e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'shield')));
    } else {
        // Cleave / Splash Damage on Overkill: 50% of overkill transfers to next living monster
        const overkill = dmg - monsterHp;
        monsterHp -= dmg;

        if (overkill > 0 && activeMonsters.length > 1) {
            const nextTargetIdx = activeMonsters.findIndex((m, i) => i !== targetIndex && m.currentHp > 0);
            if (nextTargetIdx >= 0) {
                const splashDmg = Math.max(1, Math.floor(overkill * 0.5));
                const splashTarget = activeMonsters[nextTargetIdx];
                activeMonsters[nextTargetIdx] = { ...splashTarget, currentHp: Math.max(0, splashTarget.currentHp - splashDmg) };
                addToCombatLog(`💥 Cleave! Overkill deals ${splashDmg} splash dmg to ${splashTarget.name}!`);
            }
        }

        const onHitDmg = processTriggers('onHit', 'player', dmg, targetIndex);
        monsterHp -= onHitDmg;
        
        if (isCrit) {
            addToCombatLog(`CRITICAL! ${targetMonster.name} takes ${dmg}!`);
            processTriggers('onCrit', 'player', dmg, targetIndex);
        } else addToCombatLog(`Hit ${targetMonster.name} for ${dmg}.`);

        let lifeStealVal = playerStats.lifeSteal;
        if (environment && environment.activeSkillIds.includes('grave_born') && (environment.terrain === TerrainType.CRYPT || environment.terrain === TerrainType.RUINS)) {
            lifeStealVal += 15;
        }

        // Lifesteal capped to effective damage dealt (no free full heals on 1 HP targets)
        if (lifeStealVal > 0) {
            const effectiveDmg = Math.min(dmg, Math.max(0, targetMonster.currentHp));
            const heal = Math.floor(effectiveDmg * (lifeStealVal / 100));
            if (heal > 0) {
                setPlayerHp(p => Math.min(playerStats.maxHp, p + heal));
            }
        }

        // Thorns Reflection on net damage received: Capped at 15% player max HP to prevent one-shot suicide on high crits
        if (targetMonster.thorns > 0 && dmg > 0) {
            const maxThornCap = Math.max(5, Math.floor(playerStats.maxHp * 0.15));
            const rawThorn = Math.max(1, Math.floor(dmg * (targetMonster.thorns / 100)));
            const thorn = Math.min(maxThornCap, rawThorn);
            setPlayerHp(p => Math.max(0, p - thorn));
            addToCombatLog(`🌵 Thorns: ${targetMonster.name} reflects ${thorn} dmg!`);
            if (playerHp - thorn <= 0) {
                handleDefeatInternal();
                return;
            }
        }
    }

    // Update active monsters state
    const nextMonsters = [...activeMonsters];
    nextMonsters[targetIndex] = { ...targetMonster, currentHp: monsterHp };
    setActiveMonsters(nextMonsters);

    if (nextMonsters.every(m => m.currentHp <= 0)) {
        processTriggers('onKill', 'player');
        handleVictoryInternal(nextMonsters);
    }
  };

  const executeEnemyTurn = () => {
      if (activeMonsters.length === 0 || !playerStats) return;

      // Group Attack Phase
      processTriggers('onStartTurn', 'enemy');
      processCombatEffects('enemy'); // Enemy DoTs tick here

      // Check victory after DoTs
      if (activeMonsters.every(m => m.currentHp <= 0)) { handleVictoryInternal(activeMonsters); return; }

      // Loop through all ALIVE enemies
      let totalDmgTaken = 0;

      activeMonsters.forEach(monster => {
          if (monster.currentHp <= 0) return;

          const isStunned = combatStatusEffects.some(e => e.target === 'enemy' && (e as any).targetId === monster.id && (e.type === 'stun' || e.type === 'freeze'));
          if (isStunned) {
              addToCombatLog(`${monster.name} is stunned!`);
              return;
          }

          // Dodge Check
          let dodgeChance = playerStats.dodgeChance;
          const dodgeBoost = combatStatusEffects.find(e => e.target === 'player' && e.type === 'dodge_boost');
          if (dodgeBoost) dodgeChance += dodgeBoost.value;

          const isDodge = Math.random() * 100 < dodgeChance;
          if (isDodge) {
              addToCombatLog(`Dodged ${monster.name}'s attack!`);
              if ((playerStats.thorns || 0) > 0) {
                  const dodgeReflect = Math.max(1, Math.floor((playerStats.thorns || 0) * 0.5));
                  setActiveMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, currentHp: Math.max(0, m.currentHp - dodgeReflect) } : m));
                  addToCombatLog(`💨 Retaliation: Dodged and reflected ${dodgeReflect} thorn dmg to ${monster.name}!`);
              }
              return;
          }

          let dmg = monster.damage * (0.8 + Math.random() * 0.4);
          
          if (monster.maledicts.some(m => m.id === 'executioner')) {
               if (playerHp < playerStats.maxHp * 0.3) {
                    dmg *= 2;
                    addToCombatLog("🪓 Executioner: DOUBLE DAMAGE!");
               }
          }

          if (Math.random() * 100 < monster.critChance) { dmg *= BALANCE.COMBAT.critMultiplier; addToCombatLog(`${monster.name} Crit!`); }
          
          // Asymptotic player armor mitigation
          const baseMitigationPercent = BALANCE.COMBAT.calculateMitigationPercent(playerStats.armor, playerStats.level);
          
          // Triad Clash on enemy attack
          const enemyStance = monster.currentStance || CombatStance.RESOLVE;
          const enemyClash = resolveTriadClash(enemyStance, combatStanceRef.current);

          let finalMitigationPercent = baseMitigationPercent;
          if (enemyClash === 'WIN') {
              // Enemy attack has advantage over player stance
              finalMitigationPercent = Math.max(0, baseMitigationPercent - BALANCE.COMBAT.triadConfig.loseDefensePenaltyBonus);
              addToCombatLog(`💥 ¡VULNERABLE! El ataque de ${STANCE_META[enemyStance].name} de ${monster.name} penetra tu ${STANCE_META[combatStanceRef.current].name}!`);
          } else if (enemyClash === 'LOSE') {
              // Player stance counters enemy attack
              finalMitigationPercent = Math.min(0.85, baseMitigationPercent + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus);
              addToCombatLog(`🛡️ ¡DESVÍO! Tu ${STANCE_META[combatStanceRef.current].name} amortigua el ataque de ${STANCE_META[enemyStance].name} de ${monster.name}!`);
          }

          const final = Math.max(1, Math.floor(dmg * (1 - finalMitigationPercent)));

          // Dynamically rotate monster stance for upcoming turn:
          // Pick from the remaining postures so a 45% rotation actually shifts to another stance
          const otherStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE].filter(s => s !== enemyStance);
          const shouldRotate = Math.random() < 0.45;
          const nextStance = shouldRotate ? otherStances[Math.floor(Math.random() * otherStances.length)] : enemyStance;
          const nextHidden = monster.rarity === 'Unique' ? (Math.random() < 0.6) : monster.isStanceHidden;
          setActiveMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, currentStance: nextStance, isStanceHidden: nextHidden } : m));
          
          // Check for Player Shield
          const playerShield = combatStatusEffects.find(e => e.target === 'player' && e.type === 'shield');
          
          if (playerShield) {
              addToCombatLog(`🛡️ Shield blocked ${monster.name}!`);
              setCombatStatusEffects(prev => prev.filter(e => !(e.target === 'player' && e.type === 'shield')));
          } else {
              setPlayerHp(p => p - final);
              totalDmgTaken += final;
              processTriggers('onHit', 'enemy', final, activeMonsters.indexOf(monster)); 
              processTriggers('onTakeDamage', 'player', final, activeMonsters.indexOf(monster));

              // Player Thorns: Synergizes with raw incoming damage (pre-mitigation) + 5% armor bonus
              if ((playerStats.thorns || 0) > 0) {
                  const armorBonus = Math.floor(playerStats.armor * 0.05);
                  const reflected = Math.max(1, Math.floor(dmg * ((playerStats.thorns || 0) / 100)) + armorBonus);
                  setActiveMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, currentHp: Math.max(0, m.currentHp - reflected) } : m));
                  addToCombatLog(`🌵 Thorns reflects ${reflected} dmg to ${monster.name}!`);
              }
          }

          if (monster.lifeSteal > 0 && final > 0) {
              const heal = Math.floor(final * (monster.lifeSteal/100));
              // Update local ref to monster for lifesteal visual (will be batched in next render)
          }
      });

      // Decrement player defensive reaction buffs (shield, dodge_boost) on enemy turn completion
      setCombatStatusEffects(prev => prev.map(e => {
          if (e.target === 'player' && ['shield', 'dodge_boost'].includes(e.type)) {
              return { ...e, duration: e.duration - 1 };
          }
          return e;
      }).filter(e => e.duration > 0));

      if (totalDmgTaken > 0) addToCombatLog(`Took ${totalDmgTaken} total damage.`);
      
      if (playerHp - totalDmgTaken <= 0) handleDefeatInternal();
  };

  const handleVictoryInternal = (monsters: Monster[]) => {
     onVictory(monsters);
     setIsFighting(false);
     setActiveMonsters([]);
     setCombatStatusEffects([]);
     setTurnQueue([]);
     setSkillCooldowns({});
  };

  const handleDefeatInternal = () => {
      onDefeat();
      setIsFighting(false);
      setActiveMonsters([]);
      setTurnQueue([]);
      setCombatStatusEffects([]);
      setSkillCooldowns({});
  };

  const handleFlee = () => { 
      if (Math.random() < 0.5) { 
          setIsFighting(false); 
          setActiveMonsters([]); 
          setTurnQueue([]); 
          addLog("Escaped!", 'combat'); 
      } else { 
          addToCombatLog("Failed to escape!"); 
          setTurnQueue(p => p.slice(1)); 
      } 
  };

  // --- COMBAT LOOP WITH ACTION TIMER ---
  useEffect(() => {
    if (!isFighting || activeMonsters.length === 0 || !playerStats) {
      if (actionIntervalRef.current) {
        clearInterval(actionIntervalRef.current);
        actionIntervalRef.current = null;
      }
      if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
        turnTimeoutRef.current = null;
      }
      setActionTimerProgress(0);
      return;
    }

    if (turnQueue.length === 0) return;

    const currentActor = turnQueue[0];
    const isPlayer = currentActor === 'player';
    setIsPlayerTurn(isPlayer);

    if (isPlayer) {
      setTurnCount(prev => prev + 1);
      // Action Timer for Player: 2500ms
      const ACTION_TIME_MS = 2500;
      const startTime = Date.now();
      setActionTimerProgress(100);

      if (actionIntervalRef.current) clearInterval(actionIntervalRef.current);

      actionIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPct = Math.max(0, 100 - (elapsed / ACTION_TIME_MS) * 100);
        setActionTimerProgress(remainingPct);

        if (elapsed >= ACTION_TIME_MS) {
          clearInterval(actionIntervalRef.current);
          actionIntervalRef.current = null;
          setActionTimerProgress(0);
          resolveCombatTurn(combatStanceRef.current);
          setTurnQueue(prev => prev.slice(1));
        }
      }, 50);

      return () => {
        if (actionIntervalRef.current) {
          clearInterval(actionIntervalRef.current);
          actionIntervalRef.current = null;
        }
      };
    } else {
      // Enemy Turn: brief pause of 900ms then execute
      setActionTimerProgress(0);
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);

      turnTimeoutRef.current = setTimeout(() => {
        if (!isFighting) return;
        executeEnemyTurn();
        setTurnQueue(prev => prev.slice(1));
      }, 900);

      return () => {
        if (turnTimeoutRef.current) {
          clearTimeout(turnTimeoutRef.current);
          turnTimeoutRef.current = null;
        }
      };
    }
  }, [isFighting, activeMonsters, turnQueue, playerHp]);

  // Direct Stance Trigger (Player clicks one of the triad buttons during action timer)
  const executeStanceAction = useCallback((chosenStance: CombatStance) => {
    setCombatStance(chosenStance);
    combatStanceRef.current = chosenStance;

    // If it's the player's active turn and timer is running, resolve immediately!
    if (isPlayerTurn && actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
      setActionTimerProgress(0);
      resolveCombatTurn(chosenStance);
      setTurnQueue(prev => prev.slice(1));
    }
  }, [isPlayerTurn]);

  const usePotion = useCallback(() => {
      if (!isFighting || potionsRemaining <= 0 || !playerStats) return false;
      const healAmount = Math.max(15, Math.floor(playerStats.maxHp * 0.35));
      setPlayerHp(prev => Math.min(playerStats.maxHp, prev + healAmount));
      setPotionsRemaining(prev => prev - 1);
      addToCombatLog(`🧪 Potion used! Restored ${healAmount} HP (${potionsRemaining - 1} left).`);
      return true;
  }, [isFighting, potionsRemaining, playerStats, setPlayerHp]);

  return {
      battleState: {
          isFighting,
          activeMonsters,
          activeMonster: activeMonsters.find(m => m.currentHp > 0) || activeMonsters[0], // Compat
          selectedTargetId,
          potionsRemaining,
          turnQueue,
          isPlayerTurn,
          combatLog,
          combatStatusEffects,
          combatStance,
          actionTimerProgress,
          lastClashResult
      },
      battleActions: {
          startBattle,
          flee: handleFlee,
          setCombatStance,
          executeStanceAction,
          setSelectedTargetId,
          usePotion,
          updateMonsterImage
      }
  };
};