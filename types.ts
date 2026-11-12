

export enum Rarity {
  COMMON = 'Common',
  MAGIC = 'Magic',
  RARE = 'Rare',
  UNIQUE = 'Unique'
}

export enum MonsterRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  MYTHIC = 'Mythic',
  UNIQUE = 'Unique'
}

export enum ItemSlot {
  HEAD = 'Head',
  CHEST = 'Chest',
  GLOVES = 'Gloves',
  MAIN_HAND = 'Main Hand',
  OFF_HAND = 'Off Hand',
  LEGS = 'Legs',
  BOOTS = 'Boots',
  AMULET = 'Amulet',
  RING = 'Ring'
}

export enum StatType {
  STRENGTH = 'Strength',
  DEXTERITY = 'Dexterity',
  INTELLIGENCE = 'Intelligence',
  VITALITY = 'Vitality',
  DAMAGE = 'Damage',
  ARMOR = 'Armor',
  CRIT_CHANCE = 'Crit Chance',
  ATTACK_SPEED = 'Attack Speed',
  MAGIC_FIND = 'Magic Find',
  LIFE_STEAL = 'Life Steal',
  THORNS = 'Thorns', // Enemy specific usually
  DODGE_CHANCE = 'Dodge Chance'
}

export enum CombatStance {
  WILL = 'Will',       // Voluntad (🔴 Vence a Espíritu)
  SPIRIT = 'Spirit',   // Espíritu (🟣 Vence a Temple)
  RESOLVE = 'Resolve', // Temple (🟢 Vence a Voluntad)
}

export interface ItemStat {
  type: StatType;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  trueName?: string; // Revealed name when identified
  type: ItemSlot;
  rarity: Rarity;
  stats: ItemStat[];
  level: number;
  isIdentified: boolean; // For Unique items that need AI identification
  flavorText?: string;
  icon: string; // Fallback icon name
  imageUrl?: string; // Pixel-art sprite path or custom URL
  proc?: SkillProcDefinition; // Optional combat trigger tuned to LoTD engine
}

export interface BaseAttributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
}

export enum PassiveTheme {
  PYROMANCY = 'Pyromancy', // Fire / Damage / Str
  CRYOMANCY = 'Cryomancy', // Ice / Armor / Int
  SHADOW = 'Shadow',       // Poison / Crit / Dex / Life Steal
  SENTINEL = 'Sentinel',   // Defense / Vit / Thorns
  FORTUNE = 'Fortune',      // Magic Find / Gold
  WARFARE = 'Warfare',
  NATURE = 'Nature',
  ARCANE = 'Arcane',
  SCOUTING = 'Scouting'
}

// Complex Skill Logic Types
export type ProcTrigger = 'onStartTurn' | 'onEndTurn' | 'onAttack' | 'onHit' | 'onCrit' | 'onTakeDamage' | 'onKill' | 'onBattleStart';

export interface ProcCondition {
    type: 'hp_below' | 'hp_above' | 'enemy_hp_below' | 'has_buff' | 'enemy_has_debuff' | 'turn_count_multiple';
    value: number | string; // e.g. 0.3 (30%), 'burn', 3 (every 3rd turn)
}

export interface ProcCost {
    type: 'hp_flat' | 'hp_percent';
    value: number;
}

export interface SkillProcDefinition {
    trigger: ProcTrigger;
    chance: number; // 0-1
    cooldown: number; // Turns
    cost?: ProcCost;
    conditions?: ProcCondition[];
    effect: {
        type: 'damage_phys' | 'damage_magic' | 'heal' | 'buff' | 'debuff' | 'cleanse' | 'multi_hit' | 'shield';
        subType?: 'burn' | 'freeze' | 'poison' | 'blind' | 'regen' | 'crit_boost' | 'chill' | 'stun' | 'explode' | 'shield' | 'scaling_strength' | 'dodge_boost';
        value: number; // Multiplier of relevant stat OR flat value
        duration?: number;
        isStackable?: boolean;
    };
    description: string; // Short proc description for UI
}

export interface PassiveSkill {
  id: string;
  name: string;
  description: string;
  theme: PassiveTheme;
  level: number;
  rarity: Rarity; 
  statType?: StatType; 
  value: number; // The current calculated value
  baseValue: number;
  valuePerLevel: number;
  flavorText?: string;
  
  // Tree Properties
  tier: 1 | 2 | 3 | 4; // Vertical Slice
  maxRank: number;
  prerequisiteId?: string; // ID of parent node
  treeX?: number; // Visual X position (0-4)
  
  // Active Component
  proc?: SkillProcDefinition;
}

export type CombatTrigger = ProcTrigger;

export interface PassiveSetBonus {
    theme: PassiveTheme;
    name: string;
    description: string;
    requiredCount: number; // Number of unique skills needed
    staticStats: ItemStat[]; // Permanent stats granted when active
    
    // Complex Logic
    triggerCondition: CombatTrigger;
    procChance: number; // 0-1 (e.g., 0.2 for 20%)
    procEffect: {
        type: 'burn' | 'freeze' | 'poison' | 'blind' | 'regen' | 'crit_boost' | 'chill' | 'explode' | 'stun' | 'shield' | 'scaling_strength' | 'dodge_boost';
        duration: number; // Turns
        value: number; // Damage amount or percent or stack count
        isStackable?: boolean;
    }
}

export interface SynergyDefinition {
    id: string;
    name: string;
    themes: [PassiveTheme, PassiveTheme]; // The two themes required
    description: string;
    effect: {
        trigger: CombatTrigger;
        type: 'synergy_burst' | 'synergy_buff' | 'synergy_debuff';
        value: number;
    };
    requiredCountPerTheme?: number; // Minimum equipped skills per theme (defaults to 2)
}

export interface CombatStatusEffect {
    id: string;
    type: 'burn' | 'freeze' | 'poison' | 'blind' | 'regen' | 'crit_boost' | 'chill' | 'stun' | 'explode' | 'shield' | 'scaling_strength' | 'dodge_boost';
    name: string;
    duration: number; // Turns remaining
    value: number;
    stacks: number;
    source: 'set_bonus' | 'skill' | 'maledict' | 'synergy' | 'environment' | 'item';
    target: 'player' | 'enemy';
    targetId?: string;
    description?: string;
}

export interface ActiveEffect {
  id: string;
  name: string;
  description: string;
  statType?: StatType;
  value: number;
  duration: number; // Number of battles remaining
  isDebuff: boolean;
  icon: string;
}

export interface BuildLoadout {
    id: string;
    name: string;
    timestamp: number;
    equippedSkillIds: string[];
    description?: string;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  damage: number;
  armor: number;
  maxHp: number;
  magicFind: number;
  lifeSteal: number;
  critChance: number;
  dodgeChance: number;
  attackSpeed?: number;
  thorns?: number;
  spellPower?: number; // Spell, DoT & Proc damage bonus % derived from Intelligence
  healthRegen?: number; // Turn-based health regeneration derived from Vitality
  statPoints: number;
  skillPoints: number; // New currency for tree
  activeSetBonuses: PassiveTheme[];
  activeSynergies: string[]; // IDs of active synergies
  heroImageUrl?: string; // Custom Hero Avatar
  equippedSkillIds: string[]; // Access to IDs for combat engine
  equippedItemProcs?: { id: string; name: string; proc: SkillProcDefinition }[];
  activeTitleId?: string; // Mastery Title currently granting its combat trigger
}

export type MaledictCategory = 'TRAIT' | 'INFAMY';

export interface MaledictAffix {
    id: string;
    name: string;
    description: string;
    category: MaledictCategory; // 'TRAIT' (Efecto permanente) | 'INFAMY' (Efecto activable con cooldown temporal)
    statModifiers: Partial<Record<StatType, number>>; 
    icon: string;
    
    // Configuración para 'INFAMY' (activables con cooldown temporal)
    cooldownSeconds?: number; // Periodo base de recarga en tiempo real (segundos)
    jitterSeconds?: number;   // Variación orgánica (±X segundos) para evitar predictibilidad
    durationTurns?: number;   // Duración en turnos del efecto activado

    // Reactive Logic
    trigger?: CombatTrigger | 'onStanceClash' | 'onPlayerTurnStart' | 'onEnemyTurnStart';
    triggerEffect?: {
        type: 'reflect' | 'lifesteal_burst' | 'shuffle_turn' | 'debuff_player' | 'ground_hazard' | 'compress_action_timer' | 'stance_punish' | 'shield_break' | 'hide_stance' | 'bulwark_guard';
        chance: number;
        value: number;
    }
}

export interface InfamyRuntimeState {
    readyAtTimestamp: number;
    isActive: boolean;
    activeUntilTurn?: number;
    fracturedUntilTurn?: number;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  rarity: MonsterRarity;
  isBoss?: boolean;
  
  // Core Attributes
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;

  // Derived Combat Stats
  maxHp: number;
  currentHp: number;
  damage: number;
  armor: number;
  critChance: number;
  dodgeChance: number;
  lifeSteal: number;
  thorns: number; // Return damage %
  
  icon: string;
  imageUrl?: string; // AI generated monster visual
  
  maledicts: MaledictAffix[];
  currentStance?: CombatStance;
  isStanceHidden?: boolean;
}

export type EquipmentMap = {
  [key in ItemSlot]?: Item;
};

export interface LogEntry {
  id: number;
  message: string;
  type: 'combat' | 'loot' | 'system' | 'event';
  timestamp: number;
}

export enum TerrainType {
    RUINS = 'Ruins',
    FOREST = 'Forest',
    CRYPT = 'Crypt',
    SWAMP = 'Swamp',
    PLAINS = 'Plains',
    VOID = 'Void'
}

export interface MapNode {
  id: string;
  name: string;
  level: number; // Area level
  description: string;
  terrain: TerrainType;
  coordinates: { x: number; y: number }; // Percentages 0-100
  connections: string[]; // IDs of connected nodes
  isUnlocked: boolean;
  isCleared: boolean;
  icon: string;
}

export enum EventType {
  SHRINE = 'Shrine',
  TREASURE = 'Treasure',
  TRAP = 'Trap',
  ENCOUNTER = 'Encounter'
}

export interface ExplorationEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  grantSkillRarity?: Rarity; // New: Event can grant a specific rarity skill
  effect: {
    statType?: StatType;
    value?: number; // For stats or damage
    duration?: number; // For buffs/debuffs
    goldMin?: number;
    goldMax?: number;
    itemChance?: number;
    xpMultiplier?: number;
    hpLossPercent?: number;
  };
  icon: string;
}

export interface SmugglingBundle {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: string; // crate, chest, etc
    guaranteedRarity?: Rarity;
    dropChances: {
        [Rarity.UNIQUE]: number;
        [Rarity.RARE]: number;
        [Rarity.MAGIC]: number;
    }
}

export interface SaveSlotMetadata {
    id: number;
    timestamp: number;
    label: string; // e.g. "Level 5 Hero"
    isEmpty: boolean;
    heroName?: string;
}

export interface SaveData {
    level: number;
    xp: number;
    gold: number;
    baseAttributes: BaseAttributes;
    statPoints: number;
    skillPoints: number;
    passiveSkills: PassiveSkill[];
    equippedSkillIds: string[]; // New: Track active skills
    buildLoadouts: BuildLoadout[]; // New: Saved builds
    activeEffects: ActiveEffect[];
    inventory: (Item | null)[];
    equipment: EquipmentMap;
    mapNodes: MapNode[];
    currentAreaId: string;
    areaProgress: number;
    worldDifficulty: number;
    merchantStock: Item[];
    groundItems: Item[];
    heroImageUrl?: string;
    // Mastery Titles (per save slot)
    bossTrophies?: number;
    unlockedTitleIds?: string[];
    activeTitleId?: string;
    timestamp: number;
    // We could save day/night here too, but defaulting to Day on load is fine
}