import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Monster, PlayerStats, CombatStatusEffect, ActiveEffect, CombatStance, CombatTrigger, LogEntry, TerrainType, PassiveSkill, InfamyRuntimeState, MaledictAffix, PassiveTheme } from '../types';
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

export const generateTurnBatch = (_playerAgi?: number, _enemyAgi?: number, startWith: 'player' | 'enemy' = 'player'): ('player' | 'enemy')[] => {
    // V2 Triad Combat Rule: Strictly 1:1 alternating turns, no double turns or speed acceleration.
    // By default, the player always has initiative on turn 1.
    return startWith === 'player'
        ? ['player', 'enemy', 'player', 'enemy', 'player', 'enemy']
        : ['enemy', 'player', 'enemy', 'player', 'enemy', 'player'];
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
  const isFightingRef = useRef<boolean>(false);
  useEffect(() => {
    isFightingRef.current = isFighting;
  }, [isFighting]);

  const [turnStep, setTurnStep] = useState<number>(1);
  const isResolvingTurnRef = useRef<boolean>(false);
  const turnStartTimeRef = useRef<number>(Date.now());

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

  const activeMonstersRef = useRef<Monster[]>(activeMonsters);
  useEffect(() => {
    activeMonstersRef.current = activeMonsters;
  }, [activeMonsters]);

  const playerHpRef = useRef<number>(playerHp);
  useEffect(() => {
    playerHpRef.current = playerHp;
  }, [playerHp]);

  const actionIntervalRef = useRef<any>(null);
  const turnTimeoutRef = useRef<any>(null);

  // Combat Pause Management (e.g. while reading Codex or tactical inspect)
  const [isCombatPaused, setIsCombatPaused] = useState<boolean>(false);
  const isCombatPausedRef = useRef<boolean>(false);
  useEffect(() => {
    isCombatPausedRef.current = isCombatPaused;
  }, [isCombatPaused]);

  const pausedAtRef = useRef<number>(0);
  const actionStartTimeRef = useRef<number>(0);
  const actionTotalDurationMsRef = useRef<number>(2500);
  const actionRemainingMsRef = useRef<number>(2500);
  const enemyTurnStartTimeRef = useRef<number>(0);
  const enemyRemainingDelayMsRef = useRef<number>(900);

  const [combatStatusEffects, setCombatStatusEffects] = useState<CombatStatusEffect[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [potionsRemaining, setPotionsRemaining] = useState<number>(2);
  
  // Track Cooldowns for Skills (SkillID -> Turns Remaining)
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});

  // Infamias State & Temporal Cooldowns
  const [infamyStates, setInfamyStates] = useState<Record<string, InfamyRuntimeState>>({});
  const infamyStatesRef = useRef<Record<string, InfamyRuntimeState>>({});
  useEffect(() => {
    infamyStatesRef.current = infamyStates;
  }, [infamyStates]);

  const [isChronobreakerActive, setIsChronobreakerActive] = useState<boolean>(false);
  const turnInfamyTriggeredRef = useRef<boolean>(false);

  // Helper: check and expire infamias that have exceeded durationTurns
  const checkInfamyExpirations = (currentTurn: number) => {
    let hasChanges = false;
    const nextStates: Record<string, InfamyRuntimeState> = { ...infamyStatesRef.current };

    Object.keys(nextStates).forEach(key => {
      const state = nextStates[key];
      if (!state) return;
      if (state.isActive && state.activeUntilTurn && currentTurn >= state.activeUntilTurn) {
        nextStates[key] = { ...state, isActive: false };
        hasChanges = true;

        if (key.endsWith('_trickster')) {
          const mId = key.substring(0, key.lastIndexOf('_trickster'));
          setActiveMonsters(prev => prev.map(m => m.id === mId ? { ...m, isStanceHidden: false } : m));
          activeMonstersRef.current = activeMonstersRef.current.map(m => m.id === mId ? { ...m, isStanceHidden: false } : m);
        }
      }
    });

    if (hasChanges) {
      infamyStatesRef.current = nextStates;
      setInfamyStates(nextStates);
    }
  };

  // Helper: Try to trigger exactly ONE eligible Infamia this turn
  const tryTriggerInfamy = (
    trigger: 'onPlayerTurnStart' | 'onEnemyTurnStart' | 'onStanceClash',
    targetMonsterId?: string
  ): { infamyId: string; monster: Monster } | null => {
    if (turnInfamyTriggeredRef.current) return null;

    const now = Date.now();
    const liveMonsters = activeMonstersRef.current.filter(m => m.currentHp > 0);
    const candidates: { monster: Monster; affix: MaledictAffix; key: string }[] = [];

    liveMonsters.forEach(m => {
      if (targetMonsterId && m.id !== targetMonsterId) return;
      m.maledicts.forEach(affix => {
        if (affix.category === 'INFAMY' && affix.trigger === trigger) {
          const key = `${m.id}_${affix.id}`;
          const current = infamyStatesRef.current[key];
          if (current && now >= current.readyAtTimestamp && !current.isActive) {
            candidates.push({ monster: m, affix, key });
          }
        }
      });
    });

    if (candidates.length === 0) return null;

    // Arbitration: pick one candidate
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    turnInfamyTriggeredRef.current = true;

    const baseCd = picked.affix.cooldownSeconds || 8.0;
    const jitter = picked.affix.jitterSeconds || 1.5;
    const cdSec = Math.max(3.5, baseCd + (Math.random() * 2 - 1) * jitter);
    const nextReady = now + Math.floor(cdSec * 1000);
    const duration = picked.affix.durationTurns || 1;

    const nextStates = {
      ...infamyStatesRef.current,
      [picked.key]: {
        readyAtTimestamp: nextReady,
        isActive: true,
        activeUntilTurn: turnCount + duration,
        fracturedUntilTurn: 0
      }
    };
    infamyStatesRef.current = nextStates;
    setInfamyStates(nextStates);

    return { infamyId: picked.affix.id, monster: picked.monster };
  };

  const addToCombatLog = (msg: string) => setCombatLog(prev => [...prev, msg]);

  // --- BATTLE START ---
  const startBattle = useCallback(async (monsters: Monster[], level: number) => {
    if (!playerStats) return;
    setActiveMonsters(monsters);
    activeMonstersRef.current = monsters;
    setPlayerHp(playerStats.maxHp);
    playerHpRef.current = playerStats.maxHp;
    isFightingRef.current = true;
    isResolvingTurnRef.current = false;
    turnStartTimeRef.current = Date.now();
    setTurnStep(1);
    
    // V2 Triad Combat Rule: Player always takes the first turn, prefill deep queue (6 turns)
    setTurnQueue([...generateTurnBatch(1, 1, 'player'), ...generateTurnBatch(1, 1, 'player')]);
    
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
    setIsCombatPaused(false);
    isCombatPausedRef.current = false;
    pausedAtRef.current = 0;
    setCombatStance(CombatStance.WILL);
    combatStanceRef.current = CombatStance.WILL;
    setActionTimerProgress(0);
    setLastClashResult(null);

    // Initialize Infamias Runtime State
    const initInfamies: Record<string, InfamyRuntimeState> = {};
    const now = Date.now();
    monsters.forEach(m => {
        m.maledicts.forEach(affix => {
            if (affix.category === 'INFAMY') {
                const key = `${m.id}_${affix.id}`;
                const initialDelaySec = (affix.cooldownSeconds || 7.0) * 0.4 + (Math.random() * (affix.jitterSeconds || 1.0));
                initInfamies[key] = {
                    readyAtTimestamp: now + Math.floor(initialDelaySec * 1000),
                    isActive: false
                };
            }
        });
    });
    setInfamyStates(initInfamies);
    infamyStatesRef.current = initInfamies;
    setIsChronobreakerActive(false);
    turnInfamyTriggeredRef.current = false;
    
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

  // --- STRICT 1:1 TURN QUEUE MAINTENANCE ---
  useEffect(() => {
      if (!isFighting || activeMonstersRef.current.length === 0 || !playerStats) return;

      if (turnQueue.length < 3) {
          setTurnQueue(prev => {
              const lastActor = prev.length > 0 ? prev[prev.length - 1] : 'enemy';
              const nextStart = lastActor === 'player' ? 'enemy' : 'player';
              return [...prev, ...generateTurnBatch(1, 1, nextStart)];
          });
      }
  }, [turnQueue, isFighting, playerStats]);

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
                  if (['regen', 'crit_boost', 'reflect', 'scaling_strength', 'shield', 'dodge_boost'].includes(bonus.procEffect.type)) target = 'player';
                  
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
                  else if (synergy.id === 'spellblade' && trigger === 'onHit' && targetMonster) {
                      const burst = Math.floor(Math.max(15, (playerStats.spellPower || 15)) * synergy.effect.value);
                      triggerDamage += burst;
                      addToCombatLog(`⚔️🔮 SPELLBLADE! Ether detonation deals ${burst} magic damage!`);
                  }
                  else if (synergy.id === 'verdant_bulwark' && trigger === 'onTakeDamage') {
                      newEffects.push({
                          id: `verdant-bark-${Date.now()}`,
                          type: 'shield',
                          name: 'Living Bark',
                          duration: 2,
                          value: Math.floor(playerStats.maxHp * 0.1),
                          stacks: 1,
                          source: 'synergy',
                          target: 'player',
                          description: 'Living Bark absorbs incoming damage'
                      });
                      addToCombatLog(`🛡️🌿 VERDANT BULWARK: Living bark erects a shield!`);
                  }
                  else if (synergy.id === 'shadow_stalker' && trigger === 'onCrit') {
                      newEffects.push({
                          id: `shadow-stalker-${Date.now()}`,
                          type: 'dodge_boost',
                          name: 'Shadow Stalker',
                          duration: 2,
                          value: 20,
                          stacks: 1,
                          source: 'synergy',
                          target: 'player',
                          description: '+20% Dodge on Critical strike'
                      });
                      addToCombatLog(`🏹👥 SHADOW STALKER: Strike from the shadows! +20% Dodge!`);
                  }
              }
          });
      }

      // 2. ENEMY TRAITS (Permanent passive triggers) - Process all active monsters
      if (actor === 'enemy') {
          activeMonsters.forEach(monster => {
              if (monster.currentHp <= 0) return;

              monster.maledicts.forEach(m => {
                  if (m.category === 'TRAIT' && (m.trigger === trigger || (m.trigger === 'onEnemyTurnStart' && trigger === 'onStartTurn'))) {
                      if (m.id === 'plague' && m.triggerEffect?.type === 'ground_hazard') {
                          newEffects.push({
                               id: `plague-${Date.now()}`, type: 'poison', name: 'Plague Cloud', duration: 3, value: m.triggerEffect.value, stacks: 1, source: 'maledict', target: 'player', description: 'Poisoned.'
                           });
                           addToCombatLog(`🤢 ${monster.name} radiates Poison!`);
                      }
                  }
              });
          });
      }

      // 3. ENEMY REACTIVE TRAITS (Triggered by Player Action on a specific target)
      if (actor === 'player' && trigger === 'onHit' && targetMonster) {
           targetMonster.maledicts.forEach(m => {
                if (m.category === 'TRAIT' && m.trigger === 'onTakeDamage' && m.triggerEffect && Math.random() < m.triggerEffect.chance) {
                     if (m.triggerEffect.type === 'debuff_player') {
                          newEffects.push({
                              id: Date.now() + Math.random().toString(), type: 'burn', name: m.name, duration: 2, value: m.triggerEffect.value, stacks: 1, source: 'maledict', target: 'player'
                          });
                          addToCombatLog(`🔥 ¡Molten! ${targetMonster.name} reacts burning you!`);
                     }
                }
           });
      }

      if (newEffects.length > 0) {
          setCombatStatusEffects(prev => applyStatusEffects(prev, newEffects));
      }
      return triggerDamage;
  };

  const processCombatEffects = (target: 'player' | 'enemy'): number | Monster[] => {
      if (activeMonstersRef.current.length === 0 || !playerStats) return target === 'player' ? playerHpRef.current : activeMonstersRef.current;
      
      let newPlayerHp = playerHpRef.current;
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
          newPlayerHp = Math.max(0, newPlayerHp);
          playerHpRef.current = newPlayerHp;
          setPlayerHp(newPlayerHp);
      } 
      // Enemy Effects (Iterate through all monsters)
      else {
          const currentList = activeMonstersRef.current;
          const nextList = currentList.map(m => {
              if (m.currentHp <= 0) return m;
              let hp = m.currentHp;
              // Filter effects targeting THIS monster
              const effects = combatStatusEffects.filter(e => e.target === 'enemy' && (e as any).targetId === m.id);
              
              effects.forEach(effect => {
                  const stacks = effect.stacks;
                  const baseVal = effect.value;
                  
                  if (effect.type === 'burn' || effect.type === 'poison') {
                      const spellMultiplier = effect.source !== 'maledict' ? (1 + (playerStats.spellPower || 0) / 100) : 1;
                      const dot = Math.max(1, Math.floor(m.maxHp * baseVal * stacks * spellMultiplier));
                      hp = Math.max(0, hp - dot);
                      addToCombatLog(`${m.name} takes ${dot} ${effect.type} dmg.`);
                  }
                  effectsToRemoveIds.push(effect.id);
              });
              return { ...m, currentHp: hp };
          });
          activeMonstersRef.current = nextList;
          setActiveMonsters(nextList);
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

      return target === 'player' ? newPlayerHp : activeMonstersRef.current;
  };

  // --- TURN RESOLUTION ---
  const resolveCombatTurn = (overrideStance?: CombatStance) => {
    if (activeMonstersRef.current.length === 0 || !playerStats) return;
    
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
        const hpAfterDot = (processCombatEffects('player') as number) ?? playerHpRef.current;
        if (hpAfterDot <= 0) {
            handleDefeatInternal();
        }
        return;
    }

    const synergyDmg = processTriggers('onStartTurn', 'player');
    const hpAfterDot = (processCombatEffects('player') as number) ?? playerHpRef.current;

    let currentHeroHp = hpAfterDot;
    // Vitality Health Regeneration: Turn-based sustained defense
    if ((playerStats.healthRegen || 0) > 0 && currentHeroHp < playerStats.maxHp && currentHeroHp > 0) {
        const regenAmt = Math.min(playerStats.healthRegen || 1, playerStats.maxHp - currentHeroHp);
        currentHeroHp = Math.min(playerStats.maxHp, currentHeroHp + regenAmt);
        playerHpRef.current = currentHeroHp;
        setPlayerHp(currentHeroHp);
        addToCombatLog(`💚 Vitality: Hero regenerates +${regenAmt} HP.`);
    }
    
    if (currentHeroHp <= 0) { handleDefeatInternal(); return; }

    const liveMonsters = activeMonstersRef.current;
    // TARGETING: User-selected target if alive, otherwise first living monster
    let targetIndex = liveMonsters.findIndex(m => m.id === selectedTargetId && m.currentHp > 0);
    if (targetIndex === -1) {
        targetIndex = liveMonsters.findIndex(m => m.currentHp > 0);
    }
    if (targetIndex === -1) {
        handleVictoryInternal(liveMonsters);
        return;
    }
    const targetMonster = liveMonsters[targetIndex];

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

    // Check Infamias on Target Monster for Stance Clash (Rune Bulwark & Adamantine Shell)
    const bulwarkKey = `${targetMonster.id}_bulwark`;
    let isBulwarkActive = infamyStatesRef.current[bulwarkKey]?.isActive;
    if (!isBulwarkActive && infamyStatesRef.current[bulwarkKey] && Date.now() >= infamyStatesRef.current[bulwarkKey].readyAtTimestamp) {
      if (tryTriggerInfamy('onStanceClash', targetMonster.id)) {
        isBulwarkActive = true;
      }
    }

    const adamantineKey = `${targetMonster.id}_adamantine`;
    let isAdamantineActive = infamyStatesRef.current[adamantineKey]?.isActive;
    if (!isAdamantineActive && infamyStatesRef.current[adamantineKey] && Date.now() >= infamyStatesRef.current[adamantineKey].readyAtTimestamp) {
      if (tryTriggerInfamy('onStanceClash', targetMonster.id)) {
        isAdamantineActive = true;
      }
    }

    if (clash === 'WIN') {
      const clashWinBonus = (playerStats.clashWinDamageBonus || 0) / 100;
      const totalWinMult = BALANCE.COMBAT.triadConfig.winDamageMult + clashWinBonus;
      rawDmg *= totalWinMult;
      const bonusPct = Math.round((totalWinMult - 1) * 100);
      addToCombatLog(`⚔️ ¡TRIUNFO! Tu ${STANCE_META[activeStance].name} quiebra el ${STANCE_META[enemyStance].name} de ${targetMonster.name} (+${bonusPct}% daño)!`);
      
      // Arcane Singularity Clash Win bonus:
      if (activeStance === CombatStance.SPIRIT && playerStats.activeSetBonuses.includes(PassiveTheme.ARCANE)) {
        setCombatStatusEffects(prev => applyStatusEffects(prev, [{
          id: `arcane_shield_${Date.now()}`,
          name: 'Arcane Shield',
          type: 'shield',
          duration: 2,
          value: 45,
          stacks: 1,
          source: 'set_bonus',
          target: 'player'
        }]));
        addToCombatLog(`🔮 ¡RESONANCIA DE ÉTER! Triunfo en Espíritu canaliza un escudo arcano (+45 absorción).`);
      }
      
      // Spellblade Synergy Clash Win detonation:
      if (playerStats.activeSynergies.includes('spellblade')) {
        const spellbladeDmg = Math.max(5, Math.round(playerStats.intelligence * 1.5));
        monsterHp -= spellbladeDmg;
        addToCombatLog(`✨ ¡FILO DEL CONJURO! Tu triunfo marcial detona una ráfaga de éter (${spellbladeDmg} daño mágico).`);
      }
    } else if (clash === 'LOSE') {
      // If Rune Bulwark is active, it severely punishes losing the clash: 25% damage instead of 60%
      if (isBulwarkActive) {
        rawDmg *= 0.25;
        addToCombatLog(`🛡️ ¡RUNE BULWARK! Las runas defensivas de ${targetMonster.name} sofocan tu golpe en desventaja (daño reducido drásticamente al 25%).`);
      } else {
        // Quick Reaction -> Feint (Finta): Chance to recover from a failed stance and deal 100% normal damage
        const chillStacks = combatStatusEffects
          .filter(e => e.target === 'player' && e.type === 'chill')
          .reduce((acc, curr) => acc + curr.stacks, 0);
        const effectiveReaction = Math.max(0, (playerStats.attackSpeed || 0) * Math.pow(0.8, chillStacks));
        const feintBonus = playerStats.feintChanceBonus || 0;
        const feintChance = Math.min(65, Math.round(effectiveReaction * 0.6) + feintBonus);

        if (feintChance > 0 && Math.random() * 100 < feintChance) {
          addToCombatLog(`🤺 ¡FINTA RÁPIDA! Pese a fallar la postura (${STANCE_META[activeStance].name} vs ${STANCE_META[enemyStance].name}), tu Reacción Rápida (${feintChance}%) corrige el golpe (100% daño)!`);
          if (playerStats.activeSynergies.includes('shadow_stalker')) {
            rawDmg *= BALANCE.COMBAT.critMultiplier;
            addToCombatLog(`👁️ ¡EMBOSCADA DE SOMBRAS! La Finta expone el punto ciego de ${targetMonster.name} (¡Golpe Crítico garantizado!).`);
          }
        } else {
          rawDmg *= BALANCE.COMBAT.triadConfig.loseDamageMult;
          addToCombatLog(`⚠️ ¡DESVENTAJA! El ${STANCE_META[enemyStance].name} de ${targetMonster.name} resiste tu ${STANCE_META[activeStance].name} (daño al 60%).`);
        }
      }
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

    // Asymptotic monster armor mitigation (modified by Adamantine Shell if active)
    let effectiveMonsterArmor = targetMonster.armor;
    if (isAdamantineActive) {
      if (clash === 'WIN') {
        effectiveMonsterArmor = 0;
        addToCombatLog(`💎 ¡FRACTURA DE ADAMANTINA! Tu triunfo de postura ha destrozado la coraza de ${targetMonster.name} (¡Armadura reducida a 0)!`);
      } else {
        effectiveMonsterArmor = targetMonster.armor * 4;
        addToCombatLog(`💎 ¡ADAMANTINE SHELL! La densa coraza diamantina de ${targetMonster.name} (+300% armadura) repele el impacto.`);
      }
    }

    const monsterMitigationPercent = BALANCE.COMBAT.calculateMitigationPercent(effectiveMonsterArmor, targetMonster.level);
    let dmg = Math.max(1, Math.floor(rawDmg * (1 - monsterMitigationPercent)));
    
    const updatedMonsters = [...activeMonstersRef.current];

    if (isShielded) {
        dmg = 0;
        addToCombatLog(`🚫 Blocked by ${targetMonster.name}'s Shield!`);
        setCombatStatusEffects(prev => prev.filter(e => !(e.target === 'enemy' && (e as any).targetId === targetMonster.id && e.type === 'shield')));
        updatedMonsters[targetIndex] = { ...targetMonster, currentHp: monsterHp };
    } else {
        // Cleave / Splash Damage on Overkill: 50% of overkill transfers to next living monster
        const overkill = dmg - monsterHp;
        monsterHp = Math.max(0, monsterHp - dmg);
        updatedMonsters[targetIndex] = { ...targetMonster, currentHp: monsterHp };

        if (overkill > 0 && updatedMonsters.length > 1) {
            const nextTargetIdx = updatedMonsters.findIndex((m, i) => i !== targetIndex && m.currentHp > 0);
            if (nextTargetIdx >= 0) {
                const splashDmg = Math.max(1, Math.floor(overkill * 0.5));
                const splashTarget = updatedMonsters[nextTargetIdx];
                const splashRemainingHp = Math.max(0, splashTarget.currentHp - splashDmg);
                updatedMonsters[nextTargetIdx] = { ...splashTarget, currentHp: splashRemainingHp };
                addToCombatLog(`💥 Cleave! Overkill deals ${splashDmg} splash dmg to ${splashTarget.name}!`);
            }
        }

        const onHitDmg = processTriggers('onHit', 'player', dmg, targetIndex);
        monsterHp = Math.max(0, monsterHp - onHitDmg);
        updatedMonsters[targetIndex] = { ...targetMonster, currentHp: monsterHp };
        
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
                currentHeroHp = Math.min(playerStats.maxHp, currentHeroHp + heal);
                playerHpRef.current = currentHeroHp;
                setPlayerHp(currentHeroHp);
            }
        }

        // Thorns Reflection on net damage received: Capped at 15% player max HP to prevent one-shot suicide on high crits
        if (targetMonster.thorns > 0 && dmg > 0) {
            const maxThornCap = Math.max(5, Math.floor(playerStats.maxHp * 0.15));
            const rawThorn = Math.max(1, Math.floor(dmg * (targetMonster.thorns / 100)));
            const thorn = Math.min(maxThornCap, rawThorn);
            currentHeroHp = Math.max(0, currentHeroHp - thorn);
            playerHpRef.current = currentHeroHp;
            setPlayerHp(currentHeroHp);
            addToCombatLog(`🌵 Thorns: ${targetMonster.name} reflects ${thorn} dmg!`);
            if (currentHeroHp <= 0) {
                handleDefeatInternal();
                return;
            }
        }
    }

    // Update active monsters state with preserved cleave splash damage
    activeMonstersRef.current = updatedMonsters;
    setActiveMonsters(updatedMonsters);

    if (updatedMonsters.every(m => m.currentHp <= 0)) {
        processTriggers('onKill', 'player');
        handleVictoryInternal(updatedMonsters);
    }
  };

  const executeEnemyTurn = () => {
      if (activeMonstersRef.current.length === 0 || !playerStats) return;

      // Group Attack Phase
      processTriggers('onStartTurn', 'enemy');

      // Attempt to trigger onEnemyTurnStart Infamia (e.g. Arcane Shield)
      const triggeredEnemyTurn = tryTriggerInfamy('onEnemyTurnStart');
      if (triggeredEnemyTurn && triggeredEnemyTurn.infamyId === 'arcane') {
          setCombatStatusEffects(prev => applyStatusEffects(prev, [{
              id: `arcane-shield-${triggeredEnemyTurn.monster.id}-${Date.now()}`,
              type: 'shield',
              name: 'Arcane Shield',
              duration: 1,
              value: 1,
              stacks: 1,
              source: 'maledict',
              target: 'enemy',
              description: 'Nullifies next hit.',
              targetId: triggeredEnemyTurn.monster.id
          } as any]));
          addToCombatLog(`✨ ¡ARCANE SHIELD! ${triggeredEnemyTurn.monster.name} levanta una barrera prismática.`);
      }

      const updatedMonstersAfterDot = (processCombatEffects('enemy') as Monster[]) || activeMonstersRef.current;

      // Check victory after DoTs
      if (updatedMonstersAfterDot.every(m => m.currentHp <= 0)) { 
          handleVictoryInternal(updatedMonstersAfterDot); 
          return; 
      }

      let workingMonsters = [...updatedMonstersAfterDot];
      let currentHeroHp = playerHpRef.current;
      let totalDmgTaken = 0;

      workingMonsters.forEach((monster, mIdx) => {
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
                  const newHp = Math.max(0, monster.currentHp - dodgeReflect);
                  workingMonsters[mIdx] = { ...monster, currentHp: newHp };
                  addToCombatLog(`💨 Retaliation: Dodged and reflected ${dodgeReflect} thorn dmg to ${monster.name}!`);
              }
              return;
          }

          let dmg = monster.damage * (0.8 + Math.random() * 0.4);
          
          if (monster.maledicts.some(m => m.id === 'executioner')) {
               if (currentHeroHp < playerStats.maxHp * 0.3) {
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

          // Check Predator Stance Infamia on enemy
          const predatorKey = `${monster.id}_predator`;
          let isPredatorActive = infamyStatesRef.current[predatorKey]?.isActive;
          if (!isPredatorActive && infamyStatesRef.current[predatorKey] && Date.now() >= infamyStatesRef.current[predatorKey].readyAtTimestamp) {
              if (tryTriggerInfamy('onStanceClash', monster.id)) {
                  isPredatorActive = true;
              }
          }

          if (isPredatorActive && enemyClash === 'WIN') {
              dmg *= 1.5;
              addToCombatLog(`🐅 ¡PREDATOR STANCE! ${monster.name} explota tu vulnerabilidad (+50% de daño extra)!`);
          }

          let finalMitigationPercent = baseMitigationPercent;
          if (enemyClash === 'WIN') {
              // Enemy attack has advantage over player stance
              finalMitigationPercent = Math.max(0, baseMitigationPercent - BALANCE.COMBAT.triadConfig.loseDefensePenaltyBonus);
              addToCombatLog(`💥 ¡VULNERABLE! El ataque de ${STANCE_META[enemyStance].name} de ${monster.name} penetra tu ${STANCE_META[combatStanceRef.current].name}!`);
          } else if (enemyClash === 'LOSE') {
              // Player stance counters enemy attack!
              const defendBonus = (playerStats.clashDefendMitigationBonus || 0) / 100;
              finalMitigationPercent = Math.min(0.90, baseMitigationPercent + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus + defendBonus);
              const totalDefMitPct = Math.round((BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus + defendBonus) * 100);
              addToCombatLog(`🛡️ ¡DESVÍO! Tu ${STANCE_META[combatStanceRef.current].name} amortigua el ataque de ${STANCE_META[enemyStance].name} de ${monster.name} (+${totalDefMitPct}% mitigación)!`);

              if (combatStanceRef.current === CombatStance.RESOLVE && playerStats.activeSynergies.includes('verdant_bulwark')) {
                const thornsDmg = Math.max(5, Math.round((playerStats.thorns || 0) * 0.5));
                workingMonsters[mIdx] = { ...workingMonsters[mIdx], currentHp: Math.max(0, workingMonsters[mIdx].currentHp - thornsDmg) };
                addToCombatLog(`🌿 ¡ESPINAS VIVIENTES! Tu desvío en Temple clava astillas vivientes a ${monster.name} (${thornsDmg} daño reflejado).`);
              }
          }

          let final = Math.max(1, Math.floor(dmg * (1 - finalMitigationPercent)));

          // Quick Reaction -> Parry (Parada): Chance to partially deflect incoming blow for -35% damage
          const chillStacks = combatStatusEffects
            .filter(e => e.target === 'player' && e.type === 'chill')
            .reduce((acc, curr) => acc + curr.stacks, 0);
          const effectiveReaction = Math.max(0, (playerStats.attackSpeed || 0) * Math.pow(0.8, chillStacks));
          const parryBonus = playerStats.parryChanceBonus || 0;
          const parryChance = Math.min(75, Math.round(effectiveReaction * 1.0) + parryBonus);

          if (parryChance > 0 && Math.random() * 100 < parryChance) {
              final = Math.max(1, Math.floor(final * 0.65));
              addToCombatLog(`🗡️ ¡PARRY! Tu Reacción Rápida (${parryChance}% prob) desvía el impacto de ${monster.name} (-35% daño)!`);
          }

          // Dynamically rotate monster stance for upcoming turn:
          const otherStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE].filter(s => s !== enemyStance);
          const shouldRotate = Math.random() < 0.45;
          const nextStance = shouldRotate ? otherStances[Math.floor(Math.random() * otherStances.length)] : enemyStance;
          
          // Check if Trickster Infamia is active on this monster
          const tricksterKey = `${monster.id}_trickster`;
          const isTricksterActive = !!infamyStatesRef.current[tricksterKey]?.isActive;
          const nextHidden = isTricksterActive || (monster.rarity === 'Unique' ? (Math.random() < 0.6) : monster.isStanceHidden);
          workingMonsters[mIdx] = { ...workingMonsters[mIdx], currentStance: nextStance, isStanceHidden: nextHidden };
          
          // Check for Player Shield
          const playerShield = combatStatusEffects.find(e => e.target === 'player' && e.type === 'shield');
          
          if (playerShield) {
              addToCombatLog(`🛡️ Shield blocked ${monster.name}!`);
              setCombatStatusEffects(prev => prev.filter(e => !(e.target === 'player' && e.type === 'shield')));
          } else {
              currentHeroHp = Math.max(0, currentHeroHp - final);
              totalDmgTaken += final;
              processTriggers('onHit', 'enemy', final, mIdx); 
              processTriggers('onTakeDamage', 'player', final, mIdx);

              // Player Thorns: Synergizes with raw incoming damage (pre-mitigation) + 5% armor bonus
              if ((playerStats.thorns || 0) > 0) {
                  const armorBonus = Math.floor(playerStats.armor * 0.05);
                  const reflected = Math.max(1, Math.floor(dmg * ((playerStats.thorns || 0) / 100)) + armorBonus);
                  const newHp = Math.max(0, workingMonsters[mIdx].currentHp - reflected);
                  workingMonsters[mIdx] = { ...workingMonsters[mIdx], currentHp: newHp };
                  addToCombatLog(`🌵 Thorns reflects ${reflected} dmg to ${monster.name}!`);
              }
          }

          if (workingMonsters[mIdx].currentHp > 0 && monster.lifeSteal > 0 && final > 0) {
              const heal = Math.floor(final * (monster.lifeSteal/100));
              workingMonsters[mIdx] = { ...workingMonsters[mIdx], currentHp: Math.min(workingMonsters[mIdx].maxHp, workingMonsters[mIdx].currentHp + heal) };
          }
      });

      playerHpRef.current = currentHeroHp;
      setPlayerHp(currentHeroHp);
      activeMonstersRef.current = workingMonsters;
      setActiveMonsters(workingMonsters);

      // Decrement player defensive reaction buffs (shield, dodge_boost) on enemy turn completion
      setCombatStatusEffects(prev => prev.map(e => {
          if (e.target === 'player' && ['shield', 'dodge_boost'].includes(e.type)) {
              return { ...e, duration: e.duration - 1 };
          }
          return e;
      }).filter(e => e.duration > 0));

      if (totalDmgTaken > 0) addToCombatLog(`Took ${totalDmgTaken} total damage.`);
      
      // Check victory if all enemies died from Thorns reflection or DoTs
      if (workingMonsters.every(m => m.currentHp <= 0)) {
          handleVictoryInternal(workingMonsters);
          return;
      }

      if (currentHeroHp <= 0) {
          handleDefeatInternal();
          return;
      }
  };

  const handleVictoryInternal = (monsters: Monster[]) => {
     isFightingRef.current = false;
     activeMonstersRef.current = [];
     if (actionIntervalRef.current) {
       clearInterval(actionIntervalRef.current);
       actionIntervalRef.current = null;
     }
     if (turnTimeoutRef.current) {
       clearTimeout(turnTimeoutRef.current);
       turnTimeoutRef.current = null;
     }
     setActionTimerProgress(0);
     setIsChronobreakerActive(false);
     onVictory(monsters);
     setIsFighting(false);
     setActiveMonsters([]);
     setCombatStatusEffects([]);
     setTurnQueue([]);
     setSkillCooldowns({});
  };

  const handleDefeatInternal = () => {
      isFightingRef.current = false;
      activeMonstersRef.current = [];
      if (actionIntervalRef.current) {
        clearInterval(actionIntervalRef.current);
        actionIntervalRef.current = null;
      }
      if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
        turnTimeoutRef.current = null;
      }
      setActionTimerProgress(0);
      setIsChronobreakerActive(false);
      onDefeat();
      setIsFighting(false);
      setActiveMonsters([]);
      setTurnQueue([]);
      setCombatStatusEffects([]);
      setSkillCooldowns({});
  };

  const handleFlee = () => { 
      if (Math.random() < 0.5) { 
          isFightingRef.current = false; 
          activeMonstersRef.current = [];
          if (actionIntervalRef.current) {
            clearInterval(actionIntervalRef.current);
            actionIntervalRef.current = null;
          }
          if (turnTimeoutRef.current) {
            clearTimeout(turnTimeoutRef.current);
            turnTimeoutRef.current = null;
          }
          setActionTimerProgress(0);
          setIsChronobreakerActive(false);
          setIsFighting(false); 
          setActiveMonsters([]); 
          setTurnQueue([]); 
          addLog("Escaped!", 'combat'); 
      } else { 
          addToCombatLog("Failed to escape!"); 
          advanceCombatTurn(() => {}); 
      } 
  };

  // Atomic Turn Advancement Guard (Shields against race conditions, exceptions, and freezes)
  const advanceCombatTurn = (action: () => void) => {
    if (!isFightingRef.current) return;
    if (isResolvingTurnRef.current) return;
    isResolvingTurnRef.current = true;

    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
    setActionTimerProgress(0);
    setIsChronobreakerActive(false);

    try {
      action();
    } catch (err) {
      console.error("[Combat Engine] Error in combat turn resolution:", err);
    } finally {
      if (isFightingRef.current && activeMonstersRef.current.some(m => m.currentHp > 0)) {
        setTurnQueue(prev => {
          const next = prev.length > 0 ? prev.slice(1) : [];
          if (next.length < 4) {
            const lastActor = next.length > 0 ? next[next.length - 1] : 'enemy';
            const nextStart = lastActor === 'player' ? 'enemy' : 'player';
            return [...next, ...generateTurnBatch(1, 1, nextStart)];
          }
          return next;
        });
        setTurnStep(s => s + 1);
        turnStartTimeRef.current = Date.now();
      }
      isResolvingTurnRef.current = false;
    }
  };

  // Helper to run action timer countdown for player
  const runPlayerActionInterval = (durationMsToRun: number, totalDurationMs: number) => {
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
    const intervalStart = Date.now();
    actionIntervalRef.current = setInterval(() => {
      if (isCombatPausedRef.current) return;
      const elapsed = Date.now() - intervalStart;
      const currentRemaining = Math.max(0, durationMsToRun - elapsed);
      actionRemainingMsRef.current = currentRemaining;

      const remainingPct = Math.max(0, (currentRemaining / totalDurationMs) * 100);
      setActionTimerProgress(remainingPct);

      if (currentRemaining <= 0) {
        clearInterval(actionIntervalRef.current);
        actionIntervalRef.current = null;
        advanceCombatTurn(() => resolveCombatTurn(combatStanceRef.current));
      }
    }, 50);
  };

  // Helper to schedule enemy turn timeout
  const runEnemyTurnTimeout = (delayMs: number) => {
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
    enemyTurnStartTimeRef.current = Date.now();
    enemyRemainingDelayMsRef.current = delayMs;

    turnTimeoutRef.current = setTimeout(() => {
      if (!isFightingRef.current || isCombatPausedRef.current) return;
      advanceCombatTurn(() => executeEnemyTurn());
    }, delayMs);
  };

  // --- COMBAT LOOP WITH ACTION TIMER & STEP ADVANCEMENT ---
  useEffect(() => {
    if (!isFighting || activeMonstersRef.current.length === 0 || !playerStats) {
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

    if (turnQueue.length === 0) {
      if (activeMonstersRef.current.some(m => m.currentHp > 0)) {
        setTurnQueue(generateTurnBatch(1, 1, 'player'));
      }
      return;
    }

    const currentActor = turnQueue[0];
    const isPlayer = currentActor === 'player';
    setIsPlayerTurn(isPlayer);
    turnStartTimeRef.current = Date.now();

    if (isPlayer) {
      const nextTurn = turnCount + 1;
      setTurnCount(nextTurn);
      turnInfamyTriggeredRef.current = false;
      checkInfamyExpirations(nextTurn);

      // Fast-forward Stunned / Frozen Hero with clear status logging (no 4.5s hang)
      const isFrozen = combatStatusEffects.some(e => e.target === 'player' && (e.type === 'freeze' || e.type === 'stun'));
      if (isFrozen) {
        addToCombatLog("💫 You are Frozen/Stunned and cannot act!");
        setActionTimerProgress(0);
        turnTimeoutRef.current = setTimeout(() => {
          advanceCombatTurn(() => {
            const hpAfterDot = (processCombatEffects('player') as number) ?? playerHpRef.current;
            if (hpAfterDot <= 0) {
              handleDefeatInternal();
            }
          });
        }, 600);
        return () => {
          if (turnTimeoutRef.current) {
            clearTimeout(turnTimeoutRef.current);
            turnTimeoutRef.current = null;
          }
        };
      }

      // Attempt to trigger onPlayerTurnStart Infamia (Chronobreaker or Trickster)
      const triggered = tryTriggerInfamy('onPlayerTurnStart');
      let chronoActive = false;

      if (triggered) {
        if (triggered.infamyId === 'chronobreaker') {
          chronoActive = true;
          setIsChronobreakerActive(true);
          addToCombatLog(`⏳ ¡CHRONOBREAKER! ${triggered.monster.name} altera el tiempo: ¡Solo tienes 1.2s para reaccionar!`);
        } else if (triggered.infamyId === 'trickster') {
          setActiveMonsters(prev => prev.map(m => m.id === triggered.monster.id ? { ...m, isStanceHidden: true } : m));
          activeMonstersRef.current = activeMonstersRef.current.map(m => m.id === triggered.monster.id ? { ...m, isStanceHidden: true } : m);
          addToCombatLog(`🃏 ¡TRICKSTER! ${triggered.monster.name} teje un velo de misterio y oculta su postura.`);
        }
      } else {
        setIsChronobreakerActive(false);
      }

      // Action Timer for Player: 2500ms normal (+ actionTimerBonusMs), or compressed 1200ms under Chronobreaker!
      const timerBonus = playerStats.actionTimerBonusMs || 0;
      const baseActionTime = chronoActive ? 1200 : 2500;
      const ACTION_TIME_MS = Math.min(4500, baseActionTime + timerBonus);
      actionTotalDurationMsRef.current = ACTION_TIME_MS;
      actionRemainingMsRef.current = ACTION_TIME_MS;
      actionStartTimeRef.current = Date.now();
      setActionTimerProgress(100);

      if (!isCombatPausedRef.current) {
        runPlayerActionInterval(ACTION_TIME_MS, ACTION_TIME_MS);
      }

      return () => {
        if (actionIntervalRef.current) {
          clearInterval(actionIntervalRef.current);
          actionIntervalRef.current = null;
        }
      };
    } else {
      // Enemy Turn: brief pause of 900ms then execute
      setActionTimerProgress(0);
      setIsChronobreakerActive(false);

      if (!isCombatPausedRef.current) {
        runEnemyTurnTimeout(900);
      }

      return () => {
        if (turnTimeoutRef.current) {
          clearTimeout(turnTimeoutRef.current);
          turnTimeoutRef.current = null;
        }
      };
    }
  }, [isFighting, turnStep]);

  // --- COMBAT WATCHDOG & FAILSAFE ---
  useEffect(() => {
    if (!isFighting) return;

    const watchdogInterval = setInterval(() => {
      if (!isFightingRef.current || isCombatPausedRef.current) return;
      const now = Date.now();

      // 1. Guard against empty turn queue during active fight
      if (turnQueue.length === 0 && activeMonstersRef.current.some(m => m.currentHp > 0)) {
        console.warn("[Combat Watchdog] Empty turn queue detected during active combat. Auto-recovering...");
        setTurnQueue(generateTurnBatch(1, 1, 'player'));
        setTurnStep(s => s + 1);
        turnStartTimeRef.current = now;
        return;
      }

      // 2. Guard against stalled turn (> 6.5 seconds without progress)
      const turnElapsed = now - turnStartTimeRef.current;
      if (turnElapsed > 6500 && !isResolvingTurnRef.current) {
        console.warn(`[Combat Watchdog] Turn stalled for ${turnElapsed}ms. Forcing turn progression...`);
        const actor = turnQueue[0] || 'player';
        if (actor === 'player') {
          advanceCombatTurn(() => resolveCombatTurn(combatStanceRef.current));
        } else {
          advanceCombatTurn(() => executeEnemyTurn());
        }
      }
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [isFighting, turnQueue]);

  // Pause / Resume API (Pauses battle when Codex or Inspector is open)
  const pauseCombat = useCallback(() => {
    if (!isFighting || isCombatPausedRef.current) return;
    isCombatPausedRef.current = true;
    setIsCombatPaused(true);
    pausedAtRef.current = Date.now();

    // Freeze action interval
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }

    // Freeze enemy timeout
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
      const elapsed = Date.now() - enemyTurnStartTimeRef.current;
      enemyRemainingDelayMsRef.current = Math.max(100, enemyRemainingDelayMsRef.current - elapsed);
    }
  }, [isFighting]);

  const resumeCombat = useCallback(() => {
    if (!isFighting || !isCombatPausedRef.current) return;
    const pauseDuration = Math.max(0, Date.now() - pausedAtRef.current);
    isCombatPausedRef.current = false;
    setIsCombatPaused(false);
    turnStartTimeRef.current += pauseDuration;

    // Shift Infamias ready timestamps so time spent paused in Codex doesn't burn cooldowns
    if (pauseDuration > 0) {
      const nextStates = { ...infamyStatesRef.current };
      let hasShifts = false;
      Object.keys(nextStates).forEach(key => {
        const state = nextStates[key];
        if (state && !state.isActive && state.readyAtTimestamp > pausedAtRef.current) {
          nextStates[key] = {
            ...state,
            readyAtTimestamp: state.readyAtTimestamp + pauseDuration
          };
          hasShifts = true;
        }
      });
      if (hasShifts) {
        infamyStatesRef.current = nextStates;
        setInfamyStates(nextStates);
      }
    }

    // Resume the timer for the active turn
    if (isPlayerTurn) {
      const remaining = Math.max(100, actionRemainingMsRef.current);
      runPlayerActionInterval(remaining, actionTotalDurationMsRef.current);
    } else {
      const remainingDelay = Math.max(100, enemyRemainingDelayMsRef.current);
      runEnemyTurnTimeout(remainingDelay);
    }
  }, [isFighting, isPlayerTurn]);

  // Direct Stance Trigger (Player clicks one of the triad buttons during action timer)
  const executeStanceAction = useCallback((chosenStance: CombatStance) => {
    if (isCombatPausedRef.current || isResolvingTurnRef.current || !isFightingRef.current) return;

    setCombatStance(chosenStance);
    combatStanceRef.current = chosenStance;

    // If it's the player's active turn, resolve immediately!
    if (isPlayerTurn) {
      advanceCombatTurn(() => resolveCombatTurn(chosenStance));
    }
  }, [isPlayerTurn]);

  const usePotion = useCallback(() => {
      if (!isFighting || isCombatPausedRef.current || potionsRemaining <= 0 || !playerStats) return false;
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
          lastClashResult,
          infamyStates,
          isChronobreakerActive,
          isCombatPaused
      },
      battleActions: {
          startBattle,
          flee: handleFlee,
          setCombatStance,
          executeStanceAction,
          setSelectedTargetId,
          usePotion,
          updateMonsterImage,
          pauseCombat,
          resumeCombat
      }
  };
};