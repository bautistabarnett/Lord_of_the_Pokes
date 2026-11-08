import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Item, ItemSlot, PlayerStats, EquipmentMap, LogEntry, Rarity, Monster, BaseAttributes, PassiveSkill, MapNode, ExplorationEvent, ActiveEffect, EventType, CombatStatusEffect, CombatStance, MonsterRarity, CombatTrigger, SaveData, BuildLoadout } from './types';
import { generateLoot, calculatePlayerStats, generateMonster, generatePassiveSkill, calculateItemValue, generateEncounter } from './services/gameLogic';
import { identifyItemWithGemini, generateEncounterDescription, generatePassiveLore, generateCombatNarrative, generateImage } from './services/geminiService';
import { RARITY_COLORS, SLOT_ICONS, MAX_INVENTORY_SIZE, INITIAL_WORLD_MAP, EXPLORATION_EVENTS, PASSIVE_SET_BONUSES, COMPOSITE_SYNERGIES, PASSIVE_SKILLS_POOL } from './constants';
import { BALANCE } from './services/gameBalance';
import { storageService } from './services/storageService';
import { BaseModal } from './components/BaseModal';
import InventorySlot from './components/InventorySlot';
import Tooltip from './components/Tooltip';
import CombatModal from './components/CombatModal';
import LevelUpModal from './components/LevelUpModal';
import SkillRewardModal from './components/SkillRewardModal';
import GameIcon from './components/GameIcon';
import WorldMapModal from './components/WorldMapModal';
import EventModal from './components/EventModal';
import SmugglingModal from './components/SmugglingModal';
import SkillsModal from './components/SkillsModal';
import StatsModal from './components/StatsModal';
import VisualizerModal from './components/VisualizerModal';
import { MainMenu } from './components/MainMenu';
import SystemModal from './components/SystemModal';
import BalanceDashboard from './components/BalanceDashboard';
import { useCombatEngine, generateTurnBatch } from './hooks/useCombatEngine';
import { HERO_AVATARS, DEFAULT_HERO_AVATAR } from './services/spriteCatalog';
import { hydrateLegacyItem } from './services/itemCatalog';

type MobileTab = 'hero' | 'adventure' | 'merchant';
type GameStatus = 'MENU' | 'PLAYING';

export default function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('MENU');
  const [currentSlotId, setCurrentSlotId] = useState<number>(1);
  
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [gold, setGold] = useState(0);
  const [baseAttributes, setBaseAttributes] = useState<BaseAttributes>({
    strength: BALANCE.STATS.base.strength, dexterity: BALANCE.STATS.base.dexterity,
    intelligence: BALANCE.STATS.base.intelligence, vitality: BALANCE.STATS.base.vitality
  });
  const [statPoints, setStatPoints] = useState(0);
  const [skillPoints, setSkillPoints] = useState(0); // New state for tree currency
  const [passiveSkills, setPassiveSkills] = useState<PassiveSkill[]>([]);
  const [equippedSkillIds, setEquippedSkillIds] = useState<string[]>([]); 
  const [buildLoadouts, setBuildLoadouts] = useState<BuildLoadout[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [currentEvent, setCurrentEvent] = useState<ExplorationEvent | null>(null);
  const [inventory, setInventory] = useState<(Item | null)[]>(Array(MAX_INVENTORY_SIZE).fill(null));
  const [equipment, setEquipment] = useState<EquipmentMap>({});
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [groundItems, setGroundItems] = useState<Item[]>([]);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [merchantStock, setMerchantStock] = useState<Item[]>([]);
  const [merchantMode, setMerchantMode] = useState<'buy' | 'sell'>('sell');
  const [sellStaging, setSellStaging] = useState<Item[]>([]);
  const [worldDifficulty, setWorldDifficulty] = useState(1.0);
  const [mapNodes, setMapNodes] = useState<MapNode[]>(INITIAL_WORLD_MAP);
  const [currentAreaId, setCurrentAreaId] = useState<string>('town');
  const [areaProgress, setAreaProgress] = useState<number>(0); 
  const [combatsSinceLastEvent, setCombatsSinceLastEvent] = useState<number>(3); // Requires at least 3 combats between exploration events
  const [isNight, setIsNight] = useState<boolean>(false);
  
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSmugglingModal, setShowSmugglingModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  const [isVisualizeMode, setIsVisualizeMode] = useState(false);
  const [visualizingItem, setVisualizingItem] = useState<Item | null>(null);
  const [isVisualizingHero, setIsVisualizingHero] = useState(false);
  const [isUIBlocked, setIsUIBlocked] = useState(false);
  const [playerCurrentHp, setPlayerCurrentHp] = useState(() => 100 + (BALANCE.STATS.base.vitality * 8) + (1 * BALANCE.STATS.perLevel.hp));
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [lastGainedPassive, setLastGainedPassive] = useState<{ skill: PassiveSkill, isNew: boolean } | null>(null);
  const [passiveFlavorText, setPassiveFlavorText] = useState<string>("");
  const [hoverItem, setHoverItem] = useState<Item | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>(DEFAULT_HERO_AVATAR);
  const [showHeroClassModal, setShowHeroClassModal] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('adventure');
  
  // New State for Skill Reward
  const [skillReward, setSkillReward] = useState<{ skill: PassiveSkill, isNew: boolean } | null>(null);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'system') => {
      setLogs(prev => [{ id: Date.now(), message: msg, type, timestamp: Date.now() }, ...prev].slice(30));
  }, []);

  // --- SAVE / LOAD LOGIC ---
  const handleSaveGame = useCallback(() => {
      const saveData: SaveData = {
          level, xp, gold, baseAttributes, statPoints, skillPoints, passiveSkills, activeEffects,
          inventory, equipment, mapNodes, currentAreaId, areaProgress, worldDifficulty,
          merchantStock, groundItems, heroImageUrl, timestamp: Date.now(),
          equippedSkillIds, buildLoadouts
      };
      storageService.saveGame(currentSlotId, saveData);
      addLog("Game Saved.", 'system');
  }, [level, xp, gold, baseAttributes, statPoints, skillPoints, passiveSkills, activeEffects, inventory, equipment, mapNodes, currentAreaId, areaProgress, worldDifficulty, merchantStock, groundItems, heroImageUrl, currentSlotId, equippedSkillIds, buildLoadouts, addLog]);

  const handleLoadGame = useCallback((slotId: number) => {
      const data = storageService.loadGame(slotId);
      if (!data) return;
      
      setLevel(data.level);
      setXp(data.xp);
      setGold(data.gold);
      setBaseAttributes(data.baseAttributes);
      setStatPoints(data.statPoints);
      setSkillPoints(data.skillPoints || 0);
      setPassiveSkills(data.passiveSkills);
      if (!data.equippedSkillIds && data.passiveSkills.length > 0) {
          setEquippedSkillIds(data.passiveSkills.slice(0, 6).map(s => s.id));
      } else {
          setEquippedSkillIds(data.equippedSkillIds || []);
      }
      setBuildLoadouts(data.buildLoadouts || []);

      const hydratedEquipment: EquipmentMap = {};
      Object.entries(data.equipment || {}).forEach(([slot, it]) => {
          if (it) hydratedEquipment[slot as ItemSlot] = hydrateLegacyItem(it) || undefined;
      });

      setActiveEffects(data.activeEffects);
      setInventory((data.inventory || []).map(it => hydrateLegacyItem(it)));
      setEquipment(hydratedEquipment);
      setMapNodes(data.mapNodes);
      setCurrentAreaId(data.currentAreaId);
      setAreaProgress(data.areaProgress);
      setWorldDifficulty(data.worldDifficulty);
      setMerchantStock((data.merchantStock || []).map(it => hydrateLegacyItem(it)!).filter(Boolean));
      setGroundItems((data.groundItems || []).map(it => hydrateLegacyItem(it)!).filter(Boolean));
      setHeroImageUrl(data.heroImageUrl || DEFAULT_HERO_AVATAR);
      
      setCurrentSlotId(slotId);
      setGameStatus('PLAYING');
  }, []);

  const handleStartNewGame = useCallback((slotId: number) => {
      setLevel(1);
      setXp(0);
      setGold(0);
      setBaseAttributes({
        strength: BALANCE.STATS.base.strength, dexterity: BALANCE.STATS.base.dexterity,
        intelligence: BALANCE.STATS.base.intelligence, vitality: BALANCE.STATS.base.vitality
      });
      setStatPoints(0);
      setSkillPoints(0);
      setPassiveSkills([]);
      setEquippedSkillIds([]);
      setBuildLoadouts([]);
      setActiveEffects([]);
      setInventory(Array(MAX_INVENTORY_SIZE).fill(null));
      setEquipment({});
      setMapNodes(INITIAL_WORLD_MAP);
      setCurrentAreaId('town');
      setAreaProgress(0);
      setWorldDifficulty(1.0);
      setGroundItems([]);
      setHeroImageUrl(DEFAULT_HERO_AVATAR);
      const initialHp = 100 + (BALANCE.STATS.base.vitality * 8) + (1 * BALANCE.STATS.perLevel.hp);
      setPlayerCurrentHp(initialHp);
      setLogs([]);
      setIsNight(false);
      
      const s = []; 
      for(let i=0; i<4; i++) { 
          const it = generateLoot(1); 
          if(it) { it.isIdentified = true; s.push(it); } 
      } 
      setMerchantStock(s);

      setCurrentSlotId(slotId);
      setGameStatus('PLAYING');
      
      setTimeout(() => {
           const initialSave: SaveData = {
              level: 1, xp: 0, gold: 0, 
              baseAttributes: { strength: BALANCE.STATS.base.strength, dexterity: BALANCE.STATS.base.dexterity, intelligence: BALANCE.STATS.base.intelligence, vitality: BALANCE.STATS.base.vitality },
              statPoints: 0, skillPoints: 0, passiveSkills: [], activeEffects: [], inventory: Array(MAX_INVENTORY_SIZE).fill(null), equipment: {}, 
              mapNodes: INITIAL_WORLD_MAP, currentAreaId: 'town', areaProgress: 0, worldDifficulty: 1.0, merchantStock: s, groundItems: [], timestamp: Date.now(),
              equippedSkillIds: [], buildLoadouts: []
           };
           storageService.saveGame(slotId, initialSave);
      }, 100);
  }, []);

  const derivedStats = useMemo(() => {
    return calculatePlayerStats(
      baseAttributes, 
      equipment, 
      passiveSkills, 
      level, 
      statPoints, 
      activeEffects,
      equippedSkillIds
    );
  }, [baseAttributes, equipment, passiveSkills, level, statPoints, activeEffects, equippedSkillIds]);

  const stats: PlayerStats = useMemo(() => ({
    ...derivedStats,
    xp,
    xpToNextLevel: level * 100,
    gold,
    skillPoints,
    heroImageUrl
  }), [derivedStats, xp, level, gold, skillPoints, heroImageUrl]);

  const handleEquipSkill = useCallback((skillId: string) => {
      setEquippedSkillIds(prev => {
          if (prev.includes(skillId)) return prev;
          if (prev.length >= 6) return prev; 
          return [...prev, skillId];
      });
  }, []);

  const handleUnequipSkill = useCallback((skillId: string) => {
      setEquippedSkillIds(prev => prev.filter(id => id !== skillId));
  }, []);
  
  const handleUnlockTreeSkill = useCallback((skillId: string) => {
      if (skillPoints <= 0) {
          addLog("Not enough Skill Points!", 'system');
          return;
      }
      
      const poolSkill = PASSIVE_SKILLS_POOL.find(s => s.id === skillId);
      if (!poolSkill) return;

      const existingSkill = passiveSkills.find(s => s.id === skillId);
      const maxRank = existingSkill ? (existingSkill.maxRank || poolSkill.maxRank || 5) : (poolSkill.maxRank || 5);
      
      // Max rank check BEFORE deducting any skill point!
      if (existingSkill && existingSkill.level >= maxRank) {
          addLog(`${existingSkill.name} is already at Max Rank (${maxRank})!`, 'system');
          return;
      }
      
      // Check Prereqs
      if (poolSkill.prerequisiteId) {
          const parent = passiveSkills.find(s => s.id === poolSkill.prerequisiteId);
          if (!parent) {
              addLog("Prerequisite not met!", 'system');
              return;
          }
      }

      setSkillPoints(prev => prev - 1);
      
      if (existingSkill) {
          // Upgrade
          const nextLevel = existingSkill.level + 1;
          const upgraded = { ...existingSkill, level: nextLevel, value: existingSkill.baseValue + (nextLevel - 1) * existingSkill.valuePerLevel };
          
          setPassiveSkills(prev => prev.map(p => p.id === skillId ? upgraded : p));
          addLog(`Upgraded ${existingSkill.name} to Rank ${nextLevel}`, 'system');
      } else {
          // Unlock
          const newSkill = { ...poolSkill, level: 1, value: poolSkill.baseValue };
          setPassiveSkills(prev => [...prev, newSkill]);
          addLog(`Learned ${newSkill.name}`, 'system');
          
          // Auto-equip if space
          setEquippedSkillIds(prev => {
             if (prev.length < 6) return [...prev, newSkill.id];
             return prev;
          });
      }
  }, [skillPoints, passiveSkills, addLog]);

  const handleSaveBuild = useCallback((name: string) => {
      const loadout: BuildLoadout = {
          id: Date.now().toString(),
          name,
          timestamp: Date.now(),
          equippedSkillIds: [...equippedSkillIds]
      };
      setBuildLoadouts(prev => [loadout, ...prev].slice(0, 5)); 
      addLog(`Build "${name}" saved.`, 'system');
  }, [equippedSkillIds, addLog]);

  const handleLoadBuild = useCallback((loadout: BuildLoadout) => {
      setEquippedSkillIds(loadout.equippedSkillIds);
      addLog(`Loaded build "${loadout.name}"`, 'system');
  }, [addLog]);

  const handleRespecAttributes = useCallback(() => {
      const resetCost = Math.max(50, level * 50);
      if (gold < resetCost) {
          addLog(`Need ${resetCost}g to respec.`, 'system');
          return;
      }
      
      const totalStatPoints = (level - 1) * BALANCE.STATS.perLevel.statPoints;
      const totalSkillPoints = (level - 1) * (BALANCE.STATS.perLevel.skillPoints || 1);
      setBaseAttributes({
          strength: BALANCE.STATS.base.strength,
          dexterity: BALANCE.STATS.base.dexterity,
          intelligence: BALANCE.STATS.base.intelligence,
          vitality: BALANCE.STATS.base.vitality
      });
      setStatPoints(totalStatPoints);
      setSkillPoints(totalSkillPoints);
      setPassiveSkills([]);
      setEquippedSkillIds([]);
      setGold(p => p - resetCost);
      addLog(`Full Respec: Attributes and Skill Points refunded! (-${resetCost}g)`, 'system');
  }, [gold, level, addLog]);

  const addToInventory = useCallback((item: Item): boolean => {
    let success = false;
    setInventory(prev => {
        const idx = prev.findIndex(i => i === null);
        if (idx !== -1) {
            const n = [...prev];
            n[idx] = item;
            success = true;
            return n;
        }
        return prev;
    });
    
    const idx = inventory.findIndex(i => i === null);
    if (idx !== -1) {
         addLog(`Picked up: ${item.name}`, 'loot');
         return true;
    }
    addLog("Inventory is full!", 'system');
    return false;
  }, [inventory, addLog]);

  // Grant a specific skill or upgrade
  const grantSkill = useCallback((skillData: { skill: PassiveSkill, isNew: boolean }) => {
      if (skillData.isNew) {
        setPassiveSkills(prev => [...prev, skillData.skill]);
        // Auto-equip if space
        setEquippedSkillIds(prev => {
            if (prev.length < 6) return [...prev, skillData.skill.id];
            return prev;
        });
        addLog(`Discovered Skill: ${skillData.skill.name}!`, 'system');
      } else {
        setPassiveSkills(prev => prev.map(p => p.id === skillData.skill.id ? skillData.skill : p));
        addLog(`Upgraded Skill: ${skillData.skill.name}`, 'system');
      }
      setSkillReward(skillData);
  }, [addLog]);

  const handleLevelUp = useCallback((overflowXp: number) => {
    const newLevel = level + 1; 
    setLevel(newLevel); 
    setXp(overflowXp); 
    setStatPoints(prev => prev + BALANCE.STATS.perLevel.statPoints);
    setSkillPoints(prev => prev + (BALANCE.STATS.perLevel.skillPoints || 1));
    setLastGainedPassive(null);
    setPassiveFlavorText("Your mind expands as ancient knowledge unlocks inside the skill tree."); 
    addLog(`Level Up! Reached Level ${newLevel}. +${BALANCE.STATS.perLevel.statPoints} Stat Points, +1 Skill Point!`, 'system'); 
    setShowLevelUpModal(true);
  }, [level, addLog]);

  const onVictory = useCallback((monsters: Monster[]) => {
     let totalXp = 0;
     let totalGold = 0;
     let difficultyBump = 0;
     
     monsters.forEach(m => {
        const conf = BALANCE.MONSTER.rarityConfig[m.rarity];
        totalXp += Math.floor((20 + level * 5) * conf.xpMult);
        totalGold += Math.floor((Math.random() * 50 + level * 10) * conf.goldMult);
        difficultyBump += (m.rarity === MonsterRarity.UNIQUE ? 0.05 : 0.02);
     });

     setWorldDifficulty(p => Math.min(3.5, p + difficultyBump));
     setGold(p => p + totalGold);
     
     if (monsters.length > 1) {
         addLog(`Victory! Defeated ${monsters.length} enemies. +${totalXp} XP`, 'combat');
     } else {
         addLog(`Slain ${monsters[0].name}! +${totalXp} XP`, 'combat');
     }
     
     setCombatsSinceLastEvent(prev => prev + 1);
     
     // Correct Aura Decrement Logic
     setActiveEffects(prev => {
         const next: ActiveEffect[] = [];
         prev.forEach(eff => {
             const newDuration = eff.duration - 1;
             if (newDuration > 0) {
                 next.push({ ...eff, duration: newDuration });
             } else {
                 addLog(`${eff.name} has faded.`, 'system');
             }
         });
         return next;
     });
     
     const nStock: Item[] = [];
     for(let i=0; i<2; i++) { 
         const it = generateLoot(level, worldDifficulty * 1.2); 
         if (it) { it.isIdentified = true; nStock.push(it); } 
     }
     setMerchantStock(p => [...p, ...nStock].slice(-8));

     // Boss Kill Logic
     const area = mapNodes.find(n => n.id === currentAreaId)!;
     // Check if any monster was unique/overlord or explicitly flagged as boss
     const boss = monsters.find(m => m.isBoss || (m.rarity === MonsterRarity.UNIQUE && m.name.includes('Overlord')));

     if (!area.isCleared) {
         if (boss) {
             setMapNodes(prev => prev.map(n => n.id === area.id ? { ...n, isCleared: true } : area.connections.includes(n.id) ? { ...n, isUnlocked: true } : n));
             addLog("Area Cleared!", 'system');
         } else setAreaProgress(p => Math.min(100, p + 10 * monsters.length));
     }
     
     // Check for skill drops from any elite monster
     monsters.forEach(monster => {
         if (monster.rarity === MonsterRarity.UNIQUE || monster.rarity === MonsterRarity.MYTHIC) {
             if (Math.random() < 0.3) {
                 const rarityTarget = monster.rarity === MonsterRarity.UNIQUE ? Rarity.UNIQUE : Rarity.RARE;
                 const skillDrop = generatePassiveSkill(passiveSkills, { minRarity: rarityTarget });
                 grantSkill(skillDrop);
             }
         }
     });

     if (xp + totalXp >= level * 100) handleLevelUp(xp + totalXp - level * 100); else setXp(p => p + totalXp);
     
     // Loot drops from all
     const drops: Item[] = [];
     monsters.forEach(m => {
        const conf = BALANCE.MONSTER.rarityConfig[m.rarity];
        const rolls = m.rarity === MonsterRarity.UNIQUE ? 5 : m.rarity === MonsterRarity.RARE ? 2 : 1;
        for(let i=0; i<rolls; i++) { 
            const l = generateLoot(level, worldDifficulty * conf.statMult, stats.magicFind || 0); 
            if (l) drops.push(l); 
        }
     });
     
     if (drops.length) setGroundItems(p => [...p, ...drops]);
  }, [level, worldDifficulty, mapNodes, currentAreaId, xp, stats, handleLevelUp, addLog, grantSkill]);

  const onDefeat = useCallback(() => {
      addLog("You have fallen... but the Void spares your spirit.", 'combat');
      // Gentle penalty: 5% gold loss, no XP loss, reset HP to 50%
      setGold(p => Math.floor(p * 0.95));
      setPlayerCurrentHp(Math.max(10, Math.floor(stats.maxHp * 0.5)));
      setCombatsSinceLastEvent(prev => prev + 1);

      setActiveEffects(prev => {
         const next: ActiveEffect[] = [];
         prev.forEach(eff => {
             const newDuration = eff.duration - 1;
             if (newDuration > 0) {
                 next.push({ ...eff, duration: newDuration });
             } else {
                 addLog(`${eff.name} has faded.`, 'system');
             }
         });
         return next;
     });
  }, [addLog]);

  const currentArea = mapNodes.find(n => n.id === currentAreaId)!;

  const { battleState, battleActions } = useCombatEngine({
      playerStats: stats,
      playerHp: playerCurrentHp,
      setPlayerHp: setPlayerCurrentHp,
      onVictory,
      onDefeat,
      addLog,
      environment: {
          terrain: currentArea.terrain,
          isNight: isNight,
          activeSkillIds: equippedSkillIds
      }
  });

  useEffect(() => {
    if (!battleState.isFighting) {
        setPlayerCurrentHp(prev => Math.min(prev, stats.maxHp));
    }
  }, [stats.maxHp, battleState.isFighting]);

  useEffect(() => {
      const anyModalOpen = showMapModal || showSmugglingModal || showSkillsModal || showLevelUpModal || showStatsModal || !!currentEvent || !!visualizingItem || isVisualizingHero || showSystemModal || !!skillReward || showBalanceModal || showHeroClassModal;
      setIsUIBlocked(anyModalOpen);
  }, [showMapModal, showSmugglingModal, showSkillsModal, showLevelUpModal, showStatsModal, currentEvent, visualizingItem, isVisualizingHero, showSystemModal, skillReward, showBalanceModal, showHeroClassModal]);

  const handleDragStart = useCallback((e: React.DragEvent, source: 'inventory' | 'equipment' | 'sell', index: number | string) => {
    if (isUIBlocked || isVisualizeMode) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/json', JSON.stringify({ source, index }));
    e.dataTransfer.effectAllowed = 'move';
    setHoverItem(null); 
  }, [isUIBlocked, isVisualizeMode]);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const moveItemToInventory = useCallback((item: Item, source: string, sourceIndex: number | string, targetIndex: number) => {
    const newInv = [...inventory]; const targetItem = newInv[targetIndex];
    if (source === 'inventory') newInv[sourceIndex as number] = null;
    if (source === 'equipment') { 
        setEquipment(prev => {
            const n = { ...prev }; 
            delete n[sourceIndex as ItemSlot]; 
            return n;
        }); 
    }
    
    if (targetItem) {
      if (source === 'inventory') { 
          newInv[sourceIndex as number] = targetItem; 
          newInv[targetIndex] = item; 
      }
      else if (source === 'equipment') {
         if (targetItem.type === (sourceIndex as ItemSlot)) { 
             setEquipment(prev => ({ ...prev, [sourceIndex as string]: targetItem })); 
             newInv[targetIndex] = item; 
         }
         else { 
             if (source === 'equipment') setEquipment(prev => ({ ...prev, [sourceIndex as string]: item })); 
             return; 
         }
      }
    } else {
        newInv[targetIndex] = item;
    }
    setInventory(newInv);
  }, [inventory]);

  const moveItemToEquipment = useCallback((item: Item, source: string, sourceIndex: number | string, targetSlot: ItemSlot) => {
    if (item.type !== targetSlot) return;
    const currentEquipped = equipment[targetSlot];
    setEquipment(prev => ({ ...prev, [targetSlot]: item }));
    
    if (source === 'inventory') { 
        const n = [...inventory]; 
        n[sourceIndex as number] = currentEquipped || null; 
        setInventory(n); 
    }
    else if (source === 'equipment' && sourceIndex !== targetSlot) {
        setEquipment(prev => {
            const n = { ...prev }; 
            delete n[sourceIndex as ItemSlot]; 
            n[targetSlot] = item;
            return n;
        });
        if (currentEquipped) addToInventory(currentEquipped); 
    }
    addLog(`Equipped ${item.name}`, 'system');
  }, [equipment, inventory, addToInventory, addLog]);

  const moveItemToSell = useCallback((item: Item, source: string, sourceIndex: number | string) => {
      if (source === 'sell') return;
      setSellStaging(prev => [...prev, item]);
      if (source === 'inventory') { 
          const n = [...inventory]; 
          n[sourceIndex as number] = null; 
          setInventory(n); 
      }
      else if (source === 'equipment') { 
          setEquipment(prev => {
              const n = { ...prev }; 
              delete n[sourceIndex as ItemSlot]; 
              return n;
          });
      }
  }, [inventory]);

  const handleDrop = useCallback((e: React.DragEvent, targetContext: 'inventory' | 'equipment' | 'sell', targetIndex?: number | string) => {
    e.preventDefault();
    if (isUIBlocked || isVisualizeMode) return;
    const json = e.dataTransfer.getData('application/json');
    if (!json) return;
    const { source, index } = JSON.parse(json);
    let item: Item | null = null;
    if (source === 'inventory') item = inventory[index as number];
    else if (source === 'equipment') item = equipment[index as ItemSlot] || null;
    else if (source === 'sell') item = sellStaging[index as number];
    if (!item) return;

    if (targetContext === 'inventory') {
        if (source === 'sell') {
             const newSell = [...sellStaging]; newSell.splice(index as number, 1); setSellStaging(newSell);
             const newInv = [...inventory];
             if (typeof targetIndex === 'number' && !newInv[targetIndex]) newInv[targetIndex] = item;
             else { const empty = newInv.findIndex(x => x === null); if (empty !== -1) newInv[empty] = item; else { setSellStaging(prev => [...prev, item as Item]); return; } }
             setInventory(newInv);
        } else moveItemToInventory(item, source, index, targetIndex as number);
    } else if (targetContext === 'equipment') {
       if (source === 'sell') return; 
       moveItemToEquipment(item, source, index, targetIndex as ItemSlot);
    } else if (targetContext === 'sell' && merchantMode === 'sell') moveItemToSell(item, source, index);
  }, [isUIBlocked, isVisualizeMode, inventory, equipment, sellStaging, merchantMode, moveItemToInventory, moveItemToEquipment, moveItemToSell]);
  
  const handleConfirmSell = useCallback(() => {
      if (sellStaging.length === 0) return;
      const val = sellStaging.reduce((sum, i) => sum + calculateItemValue(i), 0);
      setGold(prev => prev + val); 
      addLog(`Sold ${sellStaging.length} items for ${val}g`, 'loot'); 
      setSellStaging([]);
  }, [sellStaging, addLog]);

  const handleBuyItem = useCallback((item: Item, idx: number) => {
      const price = calculateItemValue(item) * BALANCE.ITEM_VALUE.buyMarkup;
      if (gold < price) { addLog("Not enough gold!", 'system'); return; }
      if (addToInventory(item)) { 
          setGold(prev => prev - price); 
          setMerchantStock(prev => {
              const n = [...prev]; 
              n.splice(idx, 1); 
              return n;
          });
      }
  }, [gold, addToInventory, addLog]);

  const handleAllocatePoint = useCallback((attr: keyof BaseAttributes) => {
    if (statPoints > 0) { 
        setBaseAttributes(prev => ({ ...prev, [attr]: prev[attr] + 1 })); 
        setStatPoints(prev => prev - 1); 
    }
  }, [statPoints]);

  const handleTravel = useCallback((id: string) => {
    const node = mapNodes.find(n => n.id === id);
    if (node && node.isUnlocked) { 
        setCurrentAreaId(id); 
        setAreaProgress(node.isCleared ? 100 : 0); 
        setShowMapModal(false); 
        // Travel consumes time
        setIsNight(prev => !prev);
        addLog(isNight ? "The sun rises." : "Night falls...", 'event');
    }
  }, [mapNodes, isNight, addLog]);

  const triggerRandomEvent = useCallback(() => {
    const event = EXPLORATION_EVENTS[Math.floor(Math.random() * EXPLORATION_EVENTS.length)];
    setCurrentEvent(event);
    
    // Exploration events also uncover the area (+5% progress toward boss, max 95%)
    setAreaProgress(p => Math.min(95, p + 5));

    if (event.grantSkillRarity) {
        // Handle skill reward event
        const skillDrop = generatePassiveSkill(passiveSkills, { minRarity: event.grantSkillRarity });
        grantSkill(skillDrop);
        // Don't process other effects if granting skill, usually
    }

    if (event.effect.goldMin) { 
        const amt = Math.floor(Math.random() * (event.effect.goldMax! - event.effect.goldMin + 1)) + event.effect.goldMin; 
        setGold(p => p + amt); 
    }
    if (event.effect.itemChance && Math.random() < event.effect.itemChance) { 
        const loot = generateLoot(level, 1, (stats.magicFind || 0) + 20); 
        if (loot) addToInventory(loot); 
    }
    if (event.effect.hpLossPercent) {
        setPlayerCurrentHp(p => Math.max(1, p - Math.floor(stats.maxHp * event.effect.hpLossPercent!)));
    }
    if (event.effect.xpMultiplier) { 
        const gain = Math.floor(stats.xpToNextLevel * event.effect.xpMultiplier * 0.1); 
        const n = xp + gain; 
        if (n >= level * 100) handleLevelUp(n - level * 100); else setXp(n); 
    }
    
    // Improved Aura Stacking Logic with cap of 10 turns
    if (event.effect.statType) { 
        const effectName = event.title;
        setActiveEffects(prev => {
            // Check if this effect already exists
            const existing = prev.find(e => e.name === effectName);
            if (existing) {
                // Stack duration up to 10
                addLog(`${effectName} duration extended!`, 'event');
                return prev.map(e => e.name === effectName ? { ...e, duration: Math.min(10, e.duration + (event.effect.duration || 0)) } : e);
            }
            // Add new effect
            return [...prev, { 
                id: Date.now().toString(), 
                name: effectName, 
                description: event.description, 
                statType: event.effect.statType, 
                value: event.effect.value || 0, 
                duration: event.effect.duration!, 
                isDebuff: (event.effect.value||0) < 0, 
                icon: event.icon 
            }];
        }); 
    }
  }, [level, xp, stats, handleLevelUp, addToInventory, passiveSkills, grantSkill, addLog]);

  const handleExplore = useCallback(async () => {
    if (battleState.isFighting || isUIBlocked || !stats) return;
    setGroundItems([]);
    const area = mapNodes.find(n => n.id === currentAreaId)!;
    const isBoss = areaProgress >= 100 && !area.isCleared;

    // Encounter pacing: Non-combat exploration events require at least 3 combats since the last event
    // and have a balanced 12% probability (guaranteeing consecutive event streaks never replace combat).
    const canTriggerEvent = !isBoss && combatsSinceLastEvent >= 3 && Math.random() < 0.12;
    if (canTriggerEvent) { 
        setCombatsSinceLastEvent(0);
        triggerRandomEvent(); 
        return; 
    }
    
    const diff = isBoss ? worldDifficulty * 1.5 : worldDifficulty;
    
    // Use generateEncounter for scaling groups
    let monsters: Monster[] = [];

    if (isBoss) { 
        const boss = generateMonster(Math.max(area.level, Math.floor((level + area.level)/2)), diff, area.terrain);
        boss.rarity = MonsterRarity.UNIQUE; 
        boss.name = `Overlord ${boss.name}`; 
        boss.icon = 'boss'; 
        boss.maxHp *= 2; 
        boss.currentHp = boss.maxHp;
        boss.isBoss = true;
        monsters = [boss];
    } else {
        monsters = generateEncounter(Math.max(area.level, Math.floor((level + area.level)/2)), diff, area.terrain);
    }
    
    battleActions.startBattle(monsters, level);

    // AI Generation Trigger - Just target the first one or boss
    const mainMonster = monsters[0];
    const prompt = `A terrifying, high-fidelity dark fantasy digital painting of a ${mainMonster.rarity} monster named "${mainMonster.name}". The creature appears as a ${mainMonster.icon} type. Atmospheric lighting, visceral texture, Diablo-style concept art, centered composition.`;
    generateImage(prompt).then(url => {
        if (url) battleActions.updateMonsterImage(url);
    });

  }, [battleState.isFighting, isUIBlocked, stats, mapNodes, currentAreaId, areaProgress, worldDifficulty, level, combatsSinceLastEvent, battleActions, triggerRandomEvent]);

  const handleIdentifyAll = useCallback(async () => {
      const unID = inventory.filter(i => i && !i.isIdentified) as Item[];
      if (!unID.length) return;
      const cost = unID.reduce((s, i) => s + BALANCE.COSTS.identify[i.rarity], 0);
      if (gold < cost) { addLog("Not enough gold", 'system'); return; }
      setIsIdentifying(true);
      const nInv = [...inventory];
      for (let i=0; i<nInv.length; i++) {
          const it = nInv[i];
          if (it && !it.isIdentified) {
              if (it.trueName) {
                  nInv[i] = { ...it, name: it.trueName, isIdentified: true };
              } else {
                  try { const res = await identifyItemWithGemini(it); nInv[i] = { ...it, ...res, isIdentified: true }; }
                  catch { nInv[i] = { ...it, isIdentified: true, name: it.name.replace('Unidentified ', '') }; }
              }
          }
      }
      setInventory(nInv); setGold(p => p - cost); setIsIdentifying(false);
  }, [inventory, gold, addLog]);

  const handleEquip = useCallback((item: Item, idx: number) => { 
      if (isVisualizeMode) { setVisualizingItem(item); return; } 
      if (!item.isIdentified) return; 
      moveItemToEquipment(item, 'inventory', idx, item.type); 
  }, [isVisualizeMode, moveItemToEquipment]);

  const handleUnequip = useCallback((slot: ItemSlot) => { 
      const i = equipment[slot]; 
      if (!i) return; 
      if (isVisualizeMode) { setVisualizingItem(i); return; } 
      if (addToInventory(i)) { 
          setEquipment(prev => {
              const n = { ...prev }; 
              delete n[slot]; 
              return n;
          });
      } 
  }, [equipment, isVisualizeMode, addToInventory]);

  const handleSellAllCommons = useCallback(() => {
      const commonsToSell: Item[] = [];
      setInventory(prev => prev.map(item => {
          if (item && item.rarity === Rarity.COMMON) {
              commonsToSell.push(item);
              return null;
          }
          return item;
      }));
      if (commonsToSell.length > 0) {
          setSellStaging(prev => [...prev, ...commonsToSell]);
          addLog(`Staged ${commonsToSell.length} common items for sale.`, 'system');
      } else {
          addLog("No common items in inventory to sell.", 'system');
      }
  }, [addLog]);

  const handleItemRightClick = useCallback((item: Item | null, source: 'inventory' | 'equipment', idx?: number | ItemSlot) => {
      if (!item) return;
      if (activeTab === 'merchant' && merchantMode === 'sell' && source === 'inventory' && typeof idx === 'number') {
          moveItemToSell(item, 'inventory', idx);
      } else if (source === 'inventory' && typeof idx === 'number') {
          if (!item.isIdentified) {
              const cost = BALANCE.COSTS.identify[item.rarity] || 25;
              if (gold < cost) {
                  addLog(`Need ${cost}g to identify ${item.name}.`, 'system');
                  return;
              }
              const identifiedName = item.trueName || item.name.replace('Unidentified ', '');
              const updatedItem: Item = { ...item, name: identifiedName, isIdentified: true };
              setInventory(prev => {
                  const next = [...prev];
                  next[idx] = updatedItem;
                  return next;
              });
              setGold(p => p - cost);
              setHoverItem(updatedItem);
              addLog(`Identified: ${identifiedName}! (-${cost}g)`, 'loot');
              return;
          }
          handleEquip(item, idx);
      } else if (source === 'equipment' && typeof idx === 'string') {
          handleUnequip(idx as ItemSlot);
      }
  }, [activeTab, merchantMode, moveItemToSell, handleEquip, handleUnequip, gold, addLog]);

  const handleSaveVisual = useCallback((url: string) => { 
      if (isVisualizingHero) { 
          setHeroImageUrl(url); 
          setIsVisualizingHero(false); 
      } else if (visualizingItem) { 
          const n = { ...visualizingItem, imageUrl: url }; 
          if (equipment[n.type]?.id === n.id) {
              setEquipment(p => ({ ...p, [n.type]: n })); 
          } else { 
              const idx = inventory.findIndex(x => x?.id === n.id); 
              if (idx !== -1) { 
                  setInventory(prev => {
                      const inv = [...prev]; 
                      inv[idx] = n; 
                      return inv;
                  }); 
              } 
          } 
          setVisualizingItem(null); 
      } 
  }, [isVisualizingHero, visualizingItem, equipment, inventory]);

  // Global Touch Handler to clear Tooltips on mobile interaction with background
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
        // If touching something that isn't a slot, clear hover
        const target = e.target as HTMLElement;
        if (!target.closest('.slot') && !target.closest('.tooltip-card')) {
            setHoverItem(null);
        }
    };
    window.addEventListener('touchstart', handleTouchStart);
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, []);

  const threat = (diff: number) => {
      if (diff < 0.8) return { text: "Feeble", color: "text-green-400" };
      if (diff < 1.1) return { text: "Normal", color: "text-stone-400" };
      if (diff < 1.5) return { text: "Dangerous", color: "text-yellow-500" };
      if (diff < 2.0) return { text: "Torment", color: "text-orange-500" };
      return { text: "Hell", color: "text-red-600" };
  };
  const area = mapNodes.find(n => n.id === currentAreaId)!;
  const unIDCount = inventory.filter(i => i && !i.isIdentified).length;
  const sellVal = sellStaging.reduce((s, i) => s + calculateItemValue(i), 0);
  
  const renderEquipSlot = (slot: ItemSlot) => {
      const item = equipment[slot];
      return (
          <div 
              className="slot flex flex-col items-center relative group" 
              onClick={() => handleUnequip(slot)} 
              onContextMenu={(e) => { e.preventDefault(); if (item) handleItemRightClick(item, 'equipment', slot); }}
              onMouseEnter={(e) => { if (item) { setHoverItem(item); setCursorPos({ x: e.clientX, y: e.clientY }); } }}
              onMouseMove={(e) => { if (item) { setHoverItem(item); setCursorPos({ x: e.clientX, y: e.clientY }); } }}
              onMouseLeave={() => setHoverItem(null)}
              onDragOver={handleDragOver} 
              onDrop={(e) => handleDrop(e, 'equipment', slot)}
          >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 border rounded-[4px] ${item ? (item.rarity === 'Unique' ? 'border-amber-500' : 'border-stone-600') : 'border-stone-800 bg-[#0a0a0a]'} flex items-center justify-center relative shadow-inner transition-all hover:border-stone-400`}>
                 {item ? <GameIcon name={item.icon} imageUrl={item.imageUrl} className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 ${RARITY_COLORS[item.rarity]}`} /> : <GameIcon name={SLOT_ICONS[slot]} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 opacity-20 text-stone-500" />}
              </div>
          </div>
      );
  };

  if (gameStatus === 'MENU') {
      return (
          <MainMenu 
            onStartGame={(slotId, isNew) => {
                if (isNew) handleStartNewGame(slotId);
                else handleLoadGame(slotId);
            }}
          />
      );
  }

  // Main Responsive Container
  return (
    <div className="container-principal relative w-full h-full bg-[#0c0a09] shadow-2xl overflow-hidden flex flex-col sm:grid sm:grid-cols-12 sm:grid-rows-[minmax(0,1fr)] panel-border text-xs lg:text-base">
      {hoverItem && <Tooltip item={hoverItem} comparedItem={equipment[hoverItem.type]} position={cursorPos} />}
      {currentEvent && <EventModal event={currentEvent} onClose={() => setCurrentEvent(null)} />}
      {showLevelUpModal && <LevelUpModal newPassive={lastGainedPassive ? lastGainedPassive.skill : null} isUpgrade={lastGainedPassive ? !lastGainedPassive.isNew : false} pointsAvailable={statPoints} baseAttributes={baseAttributes} flavorText={passiveFlavorText} onAllocate={handleAllocatePoint} onClose={() => setShowLevelUpModal(false)} />}
      {showMapModal && <WorldMapModal nodes={mapNodes} currentNodeId={currentAreaId} areaProgress={areaProgress} onTravel={handleTravel} onClose={() => setShowMapModal(false)} />}
      {showSmugglingModal && <SmugglingModal gold={gold} onPurchase={(c) => setGold(p => p - c)} onGenerateLoot={(d) => generateLoot(level, d, stats.magicFind||0)} onClose={() => setShowSmugglingModal(false)} addToInventory={addToInventory} />}
      {showSkillsModal && <SkillsModal passiveSkills={passiveSkills} activeEffects={activeEffects} equippedSkillIds={equippedSkillIds} buildLoadouts={buildLoadouts} playerStats={stats} onEquip={handleEquipSkill} onUnequip={handleUnequipSkill} onUnlockTreeSkill={handleUnlockTreeSkill} onSaveBuild={handleSaveBuild} onLoadBuild={handleLoadBuild} onRespecAttributes={handleRespecAttributes} onClose={() => setShowSkillsModal(false)} />}
      {showStatsModal && <StatsModal stats={stats} baseAttributes={baseAttributes} statPoints={statPoints} passiveSkills={passiveSkills} onAllocate={handleAllocatePoint} onClose={() => setShowStatsModal(false)} />}
      {(visualizingItem || isVisualizingHero) && <VisualizerModal target={isVisualizingHero ? { name: "Hero", type: "Hero", imageUrl: heroImageUrl, icon: "hero" } : visualizingItem} onSave={handleSaveVisual} onClose={() => { setVisualizingItem(null); setIsVisualizingHero(false); }} />}
      {showSystemModal && <SystemModal currentSlotId={currentSlotId} onSave={handleSaveGame} onQuit={() => setGameStatus('MENU')} onOpenBalance={() => setShowBalanceModal(true)} onClose={() => setShowSystemModal(false)} />}
      {showBalanceModal && <BalanceDashboard playerStats={stats} currentLevel={level} onClose={() => setShowBalanceModal(false)} />}
      
      {/* Hero Trainer Avatar Selection Modal */}
      {showHeroClassModal && (
        <BaseModal.Container zIndex="z-[110]" maxWidth="max-w-3xl">
          <BaseModal.Header 
            title="Trainer & Hero Skins" 
            subtitle="Animated Battle Sprites" 
            icon="🧢" 
            textColor="text-amber-500" 
            onClose={() => setShowHeroClassModal(false)} 
          />
          <BaseModal.Body className="bg-stone-950 p-3 lg:p-4 max-h-[75dvh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 lg:gap-3">
              {HERO_AVATARS.map(avatar => {
                const isSelected = heroImageUrl === avatar.imageUrl;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      setHeroImageUrl(avatar.imageUrl);
                      setShowHeroClassModal(false);
                      addLog(`Chosen Trainer: ${avatar.name} (${avatar.className})`, 'system');
                    }}
                    className={`flex flex-col items-center p-2 lg:p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-500' 
                        : 'border-stone-800 bg-stone-900/60 hover:border-stone-600 hover:bg-stone-800'
                    }`}
                  >
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-black/60 border border-stone-700 flex items-center justify-center mb-1.5 overflow-hidden shadow-inner">
                      <img 
                        src={avatar.imageUrl} 
                        alt={avatar.name} 
                        className="w-9 h-9 lg:w-12 lg:h-12 object-contain drop-shadow" 
                      />
                    </div>
                    <span className="text-[11px] lg:text-xs font-bold text-stone-200">{avatar.name}</span>
                    <span className="text-[9px] lg:text-[10px] text-amber-500/80 font-mono text-center">{avatar.className}</span>
                  </button>
                );
              })}
            </div>
          </BaseModal.Body>
        </BaseModal.Container>
      )}
      
      {/* NEW: Rare Skill Discovery Modal */}
      {skillReward && (
          <SkillRewardModal 
            skill={skillReward.skill} 
            isUpgrade={!skillReward.isNew} 
            onClose={() => setSkillReward(null)} 
          />
      )}
      
      {battleState.isFighting && battleState.activeMonsters.length > 0 && stats && (
          <CombatModal 
            playerStats={stats} 
            playerHp={playerCurrentHp} 
            monster={battleState.activeMonsters[0]} 
            activeMonsters={battleState.activeMonsters}
            onFlee={battleActions.flee} 
            combatLog={battleState.combatLog} 
            isPlayerTurn={battleState.isPlayerTurn} 
            combatStatusEffects={battleState.combatStatusEffects} 
            activeEffects={activeEffects} 
            combatStance={battleState.combatStance} 
            onSetStance={battleActions.setCombatStance} 
            turnQueue={battleState.turnQueue} 
            terrain={currentArea.terrain}
            selectedTargetId={battleState.selectedTargetId}
            onSelectTarget={battleActions.setSelectedTargetId}
            potionsRemaining={battleState.potionsRemaining}
            onUsePotion={battleActions.usePotion}
          />
      )}

      {/* LEFT PANEL: Character */}
      <div className={`col-span-12 sm:col-span-3 lg:col-span-3 bg-texture-leather border-r border-[#292524] relative flex-col z-10 shadow-xl h-full min-h-0 overflow-hidden ${activeTab === 'hero' ? 'flex flex-1' : 'hidden sm:flex'}`}>
          <div className="h-full min-h-0 flex flex-col justify-between p-2 lg:p-4 overflow-y-auto custom-scrollbar">
              {/* Header row with Level and Trainer Switcher */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 lg:pb-2 mb-1.5 lg:mb-3 shrink-0">
                  <h2 className="text-base lg:text-2xl text-gold-gradient diablo-font tracking-widest leading-none">
                    {level} <span className="text-[10px] lg:text-xs text-stone-500 align-middle ml-1">Lv</span>
                  </h2>
                  <button 
                    onClick={() => setShowHeroClassModal(true)} 
                    className="text-[10px] lg:text-[11px] font-mono uppercase text-amber-500 hover:text-amber-300 bg-stone-900/80 border border-stone-700 hover:border-amber-500/60 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer shadow shrink-0"
                    title="Change Trainer Skin"
                  >
                    <span>🧢</span>
                    <span className="truncate max-w-[70px] lg:max-w-none">{HERO_AVATARS.find(a => a.imageUrl === heroImageUrl)?.name || 'Trainer'}</span>
                    <span className="text-[8px] text-stone-500">▾</span>
                  </button>
              </div>
              
              {/* Avatar & Slots */}
              <div className="relative flex-grow flex flex-col items-center justify-center min-h-0 gap-1.5 lg:gap-2">
                  <div className="w-full aspect-square max-w-[148px] sm:max-w-[152px] lg:max-w-[230px] xl:max-w-[260px] 2xl:max-w-[320px] bg-[#080808] rounded-t-full border border-stone-800 relative overflow-visible shadow-inner flex items-center justify-center shrink-0 my-auto">
                    {/* Centered Animated Hero Trainer Sprite */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                        <img 
                            src={heroImageUrl || DEFAULT_HERO_AVATAR} 
                            alt="Hero Trainer"
                            className="w-3/5 h-3/5 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]" 
                        />
                    </div>
                    <div className="absolute inset-0 grid grid-cols-3 gap-1 lg:gap-2.5 content-center justify-items-center p-1.5 lg:p-2 z-10">
                        <div className="col-start-2 -mt-1 lg:-mt-2">{renderEquipSlot(ItemSlot.HEAD)}</div>
                        <div className="col-start-1 mt-2 lg:mt-4">{renderEquipSlot(ItemSlot.MAIN_HAND)}</div>
                        <div className="col-start-2">{renderEquipSlot(ItemSlot.CHEST)}</div>
                        <div className="col-start-3 mt-2 lg:mt-4">{renderEquipSlot(ItemSlot.OFF_HAND)}</div>
                        <div className="col-start-1">{renderEquipSlot(ItemSlot.GLOVES)}</div>
                        <div className="col-start-2">{renderEquipSlot(ItemSlot.LEGS)}</div>
                        <div className="col-start-3">{renderEquipSlot(ItemSlot.BOOTS)}</div>
                        <div className="col-start-1 translate-x-2 lg:translate-x-4">{renderEquipSlot(ItemSlot.RING)}</div>
                        <div className="col-start-3 -translate-x-2 lg:-translate-x-4">{renderEquipSlot(ItemSlot.AMULET)}</div>
                    </div>
                  </div>
                  
                  {/* Compact Stats Summary */}
                  <div className="w-full grid grid-cols-2 gap-x-2 gap-y-0.5 lg:gap-2 text-[10px] lg:text-sm font-mono text-stone-400 bg-black/30 px-2 py-1 lg:p-2 rounded border border-stone-800 shrink-0">
                     <div className="flex justify-between"><span>STR</span><span className="text-red-400">{stats.strength}</span></div>
                     <div className="flex justify-between"><span>DMG</span><span className="text-white">{stats.damage}</span></div>
                     <div className="flex justify-between"><span>DEX</span><span className="text-green-400">{stats.dexterity}</span></div>
                     <div className="flex justify-between"><span>ARM</span><span className="text-white">{stats.armor}</span></div>
                     <div className="flex justify-between"><span>INT</span><span className="text-blue-400">{stats.intelligence}</span></div>
                     <div className="flex justify-between"><span>HP</span><span className="text-white">{stats.maxHp}</span></div>
                  </div>
              </div>
              
              <button onClick={() => setShowStatsModal(true)} className="w-full mt-1.5 lg:mt-3 py-1.5 lg:py-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-500 font-bold uppercase tracking-widest text-[10px] lg:text-sm transition-colors shrink-0 rounded">
                Full Stats {statPoints > 0 && <span className="text-green-500 ml-1">(+{statPoints})</span>}
              </button>
          </div>
      </div>

      {/* CENTER PANEL: Adventure */}
      <div className={`col-span-12 sm:col-span-5 lg:col-span-6 flex-col bg-texture-stone relative z-0 shadow-inner h-full min-h-0 overflow-hidden ${activeTab === 'adventure' ? 'flex flex-1' : 'hidden sm:flex'}`}>
          {/* Header */}
          <div className="h-11 lg:h-16 shrink-0 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between px-3 lg:px-6 backdrop-blur-sm z-20">
              <div className="min-w-0">
                 <div className="text-[10px] lg:text-xs text-stone-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span>{area.terrain}</span>
                    <span className="text-stone-700">•</span>
                    <span className={isNight ? 'text-blue-400' : 'text-amber-400'}>{isNight ? 'Night' : 'Day'}</span>
                 </div>
                 <div className="text-sm lg:text-xl text-stone-200 diablo-font leading-tight truncate">{area.name}</div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                  <div className="text-amber-400 font-mono font-bold text-sm lg:text-xl drop-shadow-sm leading-tight">{gold.toLocaleString()}g</div>
                  <div className={`text-[9px] lg:text-xs uppercase font-bold leading-tight ${threat(worldDifficulty).color}`}>{threat(worldDifficulty).text}</div>
              </div>
          </div>

          {/* Action Bar */}
          <div className="px-3 py-1.5 lg:p-4 bg-[#0c0a09]/90 flex gap-3 lg:gap-4 border-b border-stone-800 items-center z-10 shrink-0">
              <div className="flex-grow h-2 lg:h-3 bg-stone-900 border border-stone-700 rounded-full relative overflow-hidden">
                <div className="absolute h-full bg-gradient-to-r from-amber-900 to-amber-600" style={{ width: `${area.isCleared ? 100 : areaProgress}%` }}></div>
              </div>
              <button 
                onClick={handleExplore} 
                disabled={battleState.isFighting} 
                className="px-4 py-1.5 lg:px-8 lg:py-3 bg-gradient-to-b from-stone-800 to-stone-900 border border-stone-600 text-stone-200 font-bold uppercase tracking-[0.12em] hover:from-stone-700 hover:to-stone-800 hover:text-white hover:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-xs lg:text-base rounded shrink-0"
              >
                Explore
              </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col p-2 lg:p-4 gap-2 lg:gap-4">
              
              {/* Ground Items */}
              {groundItems.length > 0 && (
                <div className="shrink-0 h-11 lg:h-16 bg-black/40 border border-stone-800 rounded flex items-center px-2 gap-1.5 overflow-x-auto custom-scrollbar">
                   <span className="text-[9px] lg:text-[10px] text-stone-500 uppercase font-bold mr-1 shrink-0">Ground:</span>
                   {groundItems.map((i,idx) => (
                     <div key={idx} onClick={() => { addToInventory(i); setGroundItems(g => g.filter((_,ix) => ix !== idx)); }} className="shrink-0 scale-90 cursor-pointer hover:scale-100 transition-transform">
                       <InventorySlot item={i} onClick={()=>{}} onRightClick={()=>{}} setHoverItem={()=>{}} />
                     </div>
                   ))}
                </div>
              )}

              {/* Adventure Log */}
              <div className="flex-1 min-h-0 border border-stone-800 bg-black/20 rounded p-2.5 lg:p-4 overflow-y-auto custom-scrollbar font-mono text-[11px] lg:text-sm 2xl:text-base space-y-1 shadow-inner">
                  {logs.map((log) => (
                      <div key={log.id} className={`${log.type === 'combat' ? 'text-red-400' : log.type === 'loot' ? 'text-amber-400' : log.type === 'event' ? 'text-blue-300' : 'text-stone-500'} border-b border-white/5 pb-1 mb-1`}>
                          <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString().slice(0,5)}]</span>
                          {log.message}
                      </div>
                  ))}
                  {logs.length === 0 && <div className="text-stone-600 italic text-center mt-4 lg:mt-10">The journey begins...</div>}
              </div>

              {/* Bottom Controls */}
              <div className="grid grid-cols-4 gap-1.5 lg:gap-2 h-8 lg:h-12 shrink-0">
                  <button onClick={() => setShowMapModal(true)} className="bg-stone-900 border border-stone-700 hover:border-amber-500 hover:text-amber-500 text-stone-400 rounded flex items-center justify-center gap-1 lg:gap-2 transition-colors px-1">
                    <span className="text-sm lg:text-lg">🗺️</span> <span className="text-[10px] lg:text-xs uppercase font-bold truncate">Map</span>
                  </button>
                  <button onClick={() => setShowSmugglingModal(true)} className="bg-stone-900 border border-stone-700 hover:border-amber-500 hover:text-amber-500 text-stone-400 rounded flex items-center justify-center gap-1 lg:gap-2 transition-colors px-1">
                    <span className="text-sm lg:text-lg">💰</span> <span className="text-[10px] lg:text-xs uppercase font-bold truncate">Smuggler</span>
                  </button>
                  <button onClick={() => setShowSkillsModal(true)} className="bg-stone-900 border border-stone-700 hover:border-amber-500 hover:text-amber-500 text-stone-400 rounded flex items-center justify-center gap-1 lg:gap-2 transition-colors relative px-1">
                    <span className="text-sm lg:text-lg">📜</span> <span className="text-[10px] lg:text-xs uppercase font-bold truncate">Skills</span>
                    {/* Badge for skill points */}
                    {skillPoints > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[9px] font-bold rounded-full animate-bounce flex items-center justify-center">
                            {skillPoints}
                        </div>
                    )}
                  </button>
                  <button onClick={() => setShowSystemModal(true)} className="bg-stone-900 border border-stone-700 hover:border-red-500 hover:text-red-500 text-stone-400 rounded flex items-center justify-center gap-1 lg:gap-2 transition-colors px-1">
                    <span className="text-sm lg:text-lg">⚙️</span> <span className="text-[10px] lg:text-xs uppercase font-bold truncate">System</span>
                  </button>
              </div>
          </div>
      </div>

      {/* RIGHT PANEL: Inventory/Shop */}
      <div 
        className={`col-span-12 sm:col-span-4 lg:col-span-3 bg-[#080808] border-l border-[#292524] flex-col z-10 relative shadow-xl h-full min-h-0 overflow-hidden ${activeTab === 'merchant' ? 'flex flex-1' : 'hidden sm:flex'}`} 
        onDragOver={handleDragOver} 
        onDrop={(e) => handleDrop(e, 'sell')}
      >
           {/* Header */}
           <div className="h-11 lg:h-16 shrink-0 border-b border-stone-800 flex items-center justify-between px-2.5 lg:px-4 bg-stone-950/50 gap-1">
               <h2 className="text-stone-300 diablo-font text-sm lg:text-xl truncate">Inventory</h2>
               <div className="flex gap-1 shrink-0 items-center">
                    <button onClick={() => setIsVisualizeMode(!isVisualizeMode)} className={`w-7 h-7 lg:w-9 lg:h-9 rounded flex items-center justify-center border transition-all text-xs lg:text-sm ${isVisualizeMode ? 'bg-purple-900/50 border-purple-500 text-purple-300' : 'bg-stone-900 border-stone-700 text-stone-500 hover:text-stone-300'}`}>👁️</button>
                    <button onClick={handleIdentifyAll} disabled={unIDCount === 0} className="h-7 lg:h-9 px-2 lg:px-3 text-[10px] lg:text-xs bg-stone-900 border border-stone-700 text-amber-500 rounded hover:bg-stone-800 disabled:opacity-30 uppercase font-bold">Identify</button>
               </div>
           </div>

           {/* Grid Container */}
           <div className="flex-1 min-h-0 p-2 lg:p-4 overflow-y-auto custom-scrollbar bg-black/20 flex flex-col justify-between gap-2">
               {/* Standard Inventory Grid */}
               <div className="grid grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1 lg:gap-2.5 justify-items-center content-start shrink-0">
                  {inventory.map((item, idx) => (
                      <InventorySlot 
                        key={idx} 
                        item={item} 
                        onClick={() => item && (activeTab === 'merchant' && merchantMode === 'sell' ? moveItemToSell(item, 'inventory', idx) : handleEquip(item, idx))} 
                        onRightClick={() => item && handleItemRightClick(item, 'inventory', idx)} 
                        setHoverItem={(i, p) => { setHoverItem(i); if(p) setCursorPos(p); }} 
                        draggable={!!item} 
                        onDragStart={(e) => item && handleDragStart(e, 'inventory', idx)} 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'inventory', idx)} 
                        isVisualizeMode={isVisualizeMode} 
                      />
                  ))}
               </div>
               
               <div className="pt-2 lg:pt-3 border-t border-stone-800 shrink-0">
                   <div className="text-[9px] lg:text-xs text-stone-600 uppercase text-center mb-1 lg:mb-2 font-bold tracking-widest">Merchant Exchange</div>
                   <div className="flex bg-stone-900 rounded p-0.5 lg:p-1 mb-1.5 lg:mb-2">
                       <button onClick={() => setMerchantMode('sell')} className={`flex-1 text-[10px] lg:text-xs uppercase py-1 lg:py-1.5 rounded transition-colors ${merchantMode === 'sell' ? 'bg-amber-900 text-white font-bold shadow' : 'text-stone-500 hover:text-stone-300'}`}>Sell</button>
                       <button onClick={() => setMerchantMode('buy')} className={`flex-1 text-[10px] lg:text-xs uppercase py-1 lg:py-1.5 rounded transition-colors ${merchantMode === 'buy' ? 'bg-amber-900 text-white font-bold shadow' : 'text-stone-500 hover:text-stone-300'}`}>Buy</button>
                   </div>

                   {merchantMode === 'sell' ? (
                       <div className="bg-black/40 border border-stone-800 rounded p-1.5 lg:p-2 flex flex-col gap-1.5 lg:gap-2">
                            <div className="grid grid-cols-5 gap-1 justify-items-center">
                                {sellStaging.map((i, idx) => (
                                    <div key={idx} onClick={() => { const n = [...sellStaging]; n.splice(idx, 1); setSellStaging(n); addToInventory(i); }}>
                                        <InventorySlot 
                                            item={i} 
                                            onClick={()=>{}} 
                                            onRightClick={() => { const n = [...sellStaging]; n.splice(idx, 1); setSellStaging(n); addToInventory(i); }} 
                                            setHoverItem={()=>{}} 
                                        />
                                    </div>
                                ))}
                                {Array(5 - (sellStaging.length % 5)).fill(null).map((_, i) => <div key={i} className="w-9 h-9 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 border border-stone-800/30 rounded-[3px]"></div>)}
                            </div>
                            <div className="flex gap-1.5 lg:gap-2 mt-auto">
                                <button 
                                    onClick={handleSellAllCommons} 
                                    className="flex-1 py-1.5 lg:py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] lg:text-xs uppercase font-bold rounded border border-stone-600 transition-colors"
                                    title="Stage all common items from inventory for sale"
                                >
                                    Sell Commons
                                </button>
                                <button 
                                    onClick={handleConfirmSell} 
                                    disabled={!sellStaging.length} 
                                    className="flex-1 py-1.5 lg:py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-[10px] lg:text-xs uppercase font-bold rounded shadow disabled:opacity-50 disabled:bg-stone-800"
                                >
                                    Confirm {sellVal > 0 && `(${sellVal}g)`}
                                </button>
                            </div>
                       </div>
                   ) : (
                       <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                           {merchantStock.map((i, idx) => (
                               <button key={idx} onClick={() => handleBuyItem(i, idx)} className="bg-stone-900 border border-stone-700 p-1 rounded hover:border-amber-500 flex flex-col items-center gap-0.5 group">
                                   <InventorySlot item={i} onClick={()=>{}} onRightClick={()=>{}} setHoverItem={(itm, p) => { setHoverItem(itm); if(p) setCursorPos(p); }} />
                                   <span className="text-[9px] text-amber-500 font-mono group-hover:text-white">{calculateItemValue(i)*BALANCE.ITEM_VALUE.buyMarkup}g</span>
                               </button>
                           ))}
                       </div>
                   )}
               </div>
           </div>
      </div>

      {/* Mobile Portrait Tab Bar */}
      <div 
        className="sm:hidden col-span-12 h-14 shrink-0 bg-[#0c0a09] border-t border-stone-700 flex items-center justify-around z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
          <button onClick={() => setActiveTab('hero')} className={`flex flex-col items-center ${activeTab === 'hero' ? 'text-amber-500 scale-110' : 'text-stone-500'}`}>
              <div className="text-lg">👤</div>
              <div className="text-[9px] uppercase mt-0.5">Hero</div>
          </button>
          <button onClick={() => setActiveTab('adventure')} className={`flex flex-col items-center ${activeTab === 'adventure' ? 'text-amber-500 scale-110' : 'text-stone-500'}`}>
              <div className="text-lg">⚔️</div>
              <div className="text-[9px] uppercase mt-0.5">Play</div>
          </button>
          <button onClick={() => setActiveTab('merchant')} className={`flex flex-col items-center ${activeTab === 'merchant' ? 'text-amber-500 scale-110' : 'text-stone-500'}`}>
               <div className="text-lg">⚖️</div>
               <div className="text-[9px] uppercase mt-0.5">Items</div>
          </button>
      </div>
    </div>
  );
}