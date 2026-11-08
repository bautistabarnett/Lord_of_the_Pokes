

import { Rarity, ItemSlot, StatType, PassiveSkill, MapNode, ExplorationEvent, EventType, SmugglingBundle, PassiveTheme, PassiveSetBonus, MonsterRarity, MaledictAffix, SynergyDefinition, TerrainType } from './types';

export const RARITY_COLORS = {
  [Rarity.COMMON]: 'text-stone-300', // White/Grey
  [Rarity.MAGIC]: 'text-blue-400',   // Blue
  [Rarity.RARE]: 'text-yellow-300',  // Yellow
  [Rarity.UNIQUE]: 'text-amber-500', // Gold/Orange
};

export const RARITY_BG_COLORS = {
  [Rarity.COMMON]: 'bg-stone-800 border-stone-600',
  [Rarity.MAGIC]: 'bg-blue-950/30 border-blue-800',
  [Rarity.RARE]: 'bg-yellow-950/30 border-yellow-700',
  [Rarity.UNIQUE]: 'bg-amber-950/40 border-amber-600',
};

// Complex Enemy Auras that react to gameplay
export const MALEDICT_AFFIXES: MaledictAffix[] = [
    { 
        id: 'vampiric', name: 'Vampiric', description: 'Heals 50% of damage dealt.', icon: '🩸', 
        statModifiers: { [StatType.LIFE_STEAL]: 50 } 
    },
    { 
        id: 'thorns', name: 'Iron Maiden', description: 'Reflects 30% of damage received.', icon: '🌵', 
        statModifiers: { [StatType.THORNS]: 30 } 
    },
    { 
        id: 'molten', name: 'Molten', description: 'Hitting this enemy applies Burn to you.', icon: '🔥', 
        statModifiers: {},
        trigger: 'onTakeDamage',
        triggerEffect: { type: 'debuff_player', chance: 0.5, value: 0.05 } // 5% HP Burn
    },
    { 
        id: 'timewarp', name: 'Chronobreaker', description: 'Chance to shuffle Turn Order on hit.', icon: '⏳', 
        statModifiers: { [StatType.DEXTERITY]: 20 },
        trigger: 'onAttack',
        triggerEffect: { type: 'shuffle_turn', chance: 0.3, value: 0 } 
    },
    { 
        id: 'arcane', name: 'Arcane Shield', description: 'High Armor. Nullifies first hit each turn.', icon: '✨', 
        statModifiers: { [StatType.INTELLIGENCE]: 30, [StatType.ARMOR]: 50 },
        trigger: 'onStartTurn',
        triggerEffect: { type: 'reflect', chance: 1.0, value: 0 } // Logic handled in App to simulate shield
    },
    { 
        id: 'executioner', name: 'Executioner', description: 'Deals double damage if you are below 30% HP.', icon: '🪓', 
        statModifiers: { [StatType.CRIT_CHANCE]: 20 }
    },
    { 
        id: 'plague', name: 'Plaguebearer', description: 'Radiates Poison at start of turn.', icon: '🤢', 
        statModifiers: { [StatType.VITALITY]: 40 },
        trigger: 'onStartTurn',
        triggerEffect: { type: 'ground_hazard', chance: 1.0, value: 0.03 } // 3% HP Poison
    }
];

export const PASSIVE_THEME_COLORS: Record<PassiveTheme, { text: string, bg: string, border: string, icon: string }> = {
  [PassiveTheme.PYROMANCY]: { text: 'text-orange-500', bg: 'bg-orange-950/50', border: 'border-orange-700', icon: '🔥' },
  [PassiveTheme.CRYOMANCY]: { text: 'text-cyan-400', bg: 'bg-cyan-950/50', border: 'border-cyan-700', icon: '❄️' },
  [PassiveTheme.SHADOW]:    { text: 'text-purple-400', bg: 'bg-purple-950/50', border: 'border-purple-700', icon: '☠️' },
  [PassiveTheme.SENTINEL]:  { text: 'text-stone-300', bg: 'bg-stone-700/50', border: 'border-stone-500', icon: '🛡️' },
  [PassiveTheme.FORTUNE]:   { text: 'text-yellow-400', bg: 'bg-yellow-950/50', border: 'border-yellow-600', icon: '🍀' },
  [PassiveTheme.WARFARE]:   { text: 'text-red-500', bg: 'bg-red-950/50', border: 'border-red-700', icon: '⚔️' },
  [PassiveTheme.NATURE]:    { text: 'text-green-500', bg: 'bg-green-950/50', border: 'border-green-700', icon: '🌿' },
  [PassiveTheme.ARCANE]:    { text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/50', border: 'border-fuchsia-700', icon: '🔮' },
  [PassiveTheme.SCOUTING]:  { text: 'text-emerald-400', bg: 'bg-emerald-950/50', border: 'border-emerald-700', icon: '🏹' },
};

export const SLOT_ICONS: Record<ItemSlot, string> = {
  [ItemSlot.HEAD]: 'empty_head',
  [ItemSlot.CHEST]: 'empty_chest',
  [ItemSlot.GLOVES]: 'empty_gloves',
  [ItemSlot.MAIN_HAND]: 'empty_main',
  [ItemSlot.OFF_HAND]: 'empty_off',
  [ItemSlot.LEGS]: 'empty_legs',
  [ItemSlot.BOOTS]: 'empty_boots',
  [ItemSlot.AMULET]: 'empty_amulet',
  [ItemSlot.RING]: 'empty_ring',
};

export const MAX_INVENTORY_SIZE = 40;

// Full Branching Skill Trees
// Positioning: Center=2, Left=1, FarLeft=0, Right=3, FarRight=4
export const PASSIVE_SKILLS_POOL: Omit<PassiveSkill, 'level' | 'value'>[] = [
  
  // ==========================================================================================
  // OFFENSE TREES
  // ==========================================================================================

  // --- PYROMANCY (Fire / Str / DoT) ---
  { 
      id: 'magma_veins', name: 'Magma Veins', rarity: Rarity.COMMON, 
      description: 'Your blood boils, increasing Strength by {value}.', theme: PassiveTheme.PYROMANCY, 
      statType: StatType.STRENGTH, baseValue: 5, valuePerLevel: 3, 
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left Branch (Raw Damage)
  { 
      id: 'burning_rage', name: 'Burning Rage', rarity: Rarity.COMMON, 
      description: 'Seething heat adds {value} base Damage.', theme: PassiveTheme.PYROMANCY, 
      statType: StatType.DAMAGE, baseValue: 3, valuePerLevel: 2, 
      tier: 2, maxRank: 10, prerequisiteId: 'magma_veins', treeX: 1
  },
  { 
      id: 'inferno_touch', name: 'Inferno Touch', rarity: Rarity.MAGIC, 
      description: 'Chance to find better loot in the ashes. +{value}% Magic Find.', theme: PassiveTheme.PYROMANCY, 
      statType: StatType.MAGIC_FIND, baseValue: 5, valuePerLevel: 3,
      tier: 3, maxRank: 5, prerequisiteId: 'burning_rage', treeX: 1
  },
  // Right Branch (Sustainability/AoE)
  { 
      id: 'cinderheart', name: 'Cinderheart', rarity: Rarity.COMMON, 
      description: 'Fire fuels your life. +{value} Vitality.', theme: PassiveTheme.PYROMANCY, 
      statType: StatType.VITALITY, baseValue: 5, valuePerLevel: 3,
      tier: 2, maxRank: 10, prerequisiteId: 'magma_veins', treeX: 3
  },
  { 
      id: 'forest_fire', name: 'Wildfire', rarity: Rarity.RARE, 
      description: 'Massive damage bonus ({value}) in FOREST terrain.', theme: PassiveTheme.PYROMANCY, 
      statType: StatType.DAMAGE, baseValue: 10, valuePerLevel: 5,
      tier: 3, maxRank: 3, prerequisiteId: 'cinderheart', treeX: 3
  },
  // Ultimate
  { 
    id: 'phoenix_protocol', name: 'Phoenix Protocol', rarity: Rarity.UNIQUE,
    description: 'When hit below 30% HP, gain massive Regeneration (Cooldown: 10 turns).', 
    theme: PassiveTheme.PYROMANCY, baseValue: 0, valuePerLevel: 0,
    tier: 4, maxRank: 1, prerequisiteId: 'forest_fire', treeX: 2,
    proc: {
        trigger: 'onTakeDamage',
        chance: 1.0,
        cooldown: 10,
        conditions: [{ type: 'hp_below', value: 0.3 }],
        effect: { type: 'buff', subType: 'regen', value: 0.20, duration: 3 },
        description: 'Emerg. Regen'
    }
  },

  // --- WARFARE (Physical / Combat) ---
  { 
      id: 'battle_fury', name: 'Battle Fury', rarity: Rarity.COMMON, 
      description: 'Combat fuels you. +{value} Strength.', theme: PassiveTheme.WARFARE, 
      statType: StatType.STRENGTH, baseValue: 8, valuePerLevel: 3,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left Branch (Brutality)
  { 
      id: 'brutal_swing', name: 'Brutal Swing', rarity: Rarity.COMMON, 
      description: 'Heavy swings deal +{value} Damage.', theme: PassiveTheme.WARFARE, 
      statType: StatType.DAMAGE, baseValue: 4, valuePerLevel: 2,
      tier: 2, maxRank: 10, prerequisiteId: 'battle_fury', treeX: 1
  },
  { 
    id: 'echo_strike', name: 'Echo Strike', rarity: Rarity.RARE,
    description: 'Critical Hits trigger a second strike for 50% damage.', 
    theme: PassiveTheme.WARFARE, baseValue: 0, valuePerLevel: 0,
    tier: 3, maxRank: 1, prerequisiteId: 'brutal_swing', treeX: 1,
    proc: {
        trigger: 'onCrit',
        chance: 1.0,
        cooldown: 0,
        effect: { type: 'multi_hit', value: 0.5 },
        description: 'Double Hit'
    }
  },
  // Right Branch (Precision)
  { 
      id: 'war_precision', name: 'Precision', rarity: Rarity.COMMON, 
      description: 'Find the weak spot. +{value}% Crit Chance.', theme: PassiveTheme.WARFARE, 
      statType: StatType.CRIT_CHANCE, baseValue: 3, valuePerLevel: 1,
      tier: 2, maxRank: 10, prerequisiteId: 'battle_fury', treeX: 3
  },
  { 
      id: 'killing_spree', name: 'Killing Spree', rarity: Rarity.RARE, 
      description: 'Momentum builds. +{value}% Attack Speed.', theme: PassiveTheme.WARFARE, 
      statType: StatType.ATTACK_SPEED, baseValue: 5, valuePerLevel: 2,
      tier: 3, maxRank: 5, prerequisiteId: 'war_precision', treeX: 3
  },
  // Ultimate
  {
      id: 'apex_predator', name: 'Apex Predator', rarity: Rarity.UNIQUE,
      description: 'Killing an enemy instantly restores 30% Max HP.',
      theme: PassiveTheme.WARFARE, baseValue: 0, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'echo_strike', treeX: 2,
      proc: {
          trigger: 'onKill',
          chance: 1.0,
          cooldown: 0,
          effect: { type: 'heal', value: 0.3 },
          description: 'Heal on Kill'
      }
  },

  // ==========================================================================================
  // DEFENSE TREES
  // ==========================================================================================

  // --- SENTINEL (Tank / Thorns) ---
  { 
      id: 'unyielding', name: 'Unyielding', rarity: Rarity.COMMON, 
      description: 'Refuse to fall. Increases Vitality by {value}.', theme: PassiveTheme.SENTINEL, 
      statType: StatType.VITALITY, baseValue: 8, valuePerLevel: 4,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left Branch (Armor)
  { 
      id: 'iron_skin', name: 'Iron Skin', rarity: Rarity.COMMON, 
      description: 'Hardens flesh to steel. Increases Armor by {value}.', theme: PassiveTheme.SENTINEL, 
      statType: StatType.ARMOR, baseValue: 20, valuePerLevel: 10,
      tier: 2, maxRank: 10, prerequisiteId: 'unyielding', treeX: 1
  },
  { 
      id: 'thorns_aura', name: 'Spiked Soul', rarity: Rarity.MAGIC, 
      description: 'Your armor hurts to touch. +{value} Thorns damage.', theme: PassiveTheme.SENTINEL, 
      statType: StatType.THORNS, baseValue: 5, valuePerLevel: 5,
      tier: 3, maxRank: 10, prerequisiteId: 'iron_skin', treeX: 1
  },
  // Right Branch (Avoidance)
  { 
      id: 'deflection', name: 'Deflection', rarity: Rarity.COMMON, 
      description: 'Turn the blade aside. +{value}% Dodge Chance.', theme: PassiveTheme.SENTINEL, 
      statType: StatType.DODGE_CHANCE, baseValue: 3, valuePerLevel: 1.5,
      tier: 2, maxRank: 10, prerequisiteId: 'unyielding', treeX: 3
  },
  { 
      id: 'shield_bash', name: 'Shield Bash', rarity: Rarity.RARE, 
      description: 'Blocking opens opportunities. +{value} Damage.', theme: PassiveTheme.SENTINEL, 
      statType: StatType.DAMAGE, baseValue: 5, valuePerLevel: 5,
      tier: 3, maxRank: 5, prerequisiteId: 'deflection', treeX: 3
  },
  // Ultimate
  {
      id: 'titans_gaze', name: 'Titan\'s Gaze', rarity: Rarity.UNIQUE,
      description: 'Your attacks have a 20% chance to STUN the enemy.',
      theme: PassiveTheme.SENTINEL, baseValue: 0, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'thorns_aura', treeX: 2,
      proc: {
          trigger: 'onHit',
          chance: 0.2,
          cooldown: 0,
          effect: { type: 'debuff', subType: 'stun', value: 1, duration: 1 },
          description: 'Stun Chance'
      }
  },

  // --- CRYOMANCY (Ice / Armor / Int) ---
  { 
      id: 'glacial_ward', name: 'Glacial Ward', rarity: Rarity.COMMON, 
      description: 'Layers of ice protect you. +{value} Armor.', theme: PassiveTheme.CRYOMANCY, 
      statType: StatType.ARMOR, baseValue: 15, valuePerLevel: 8,
      tier: 1, maxRank: 10, treeX: 2
  },
  { 
      id: 'crystalline_mind', name: 'Crystalline Mind', rarity: Rarity.COMMON, 
      description: 'Sharp focus improves Intelligence by {value}.', theme: PassiveTheme.CRYOMANCY, 
      statType: StatType.INTELLIGENCE, baseValue: 5, valuePerLevel: 3,
      tier: 2, maxRank: 10, prerequisiteId: 'glacial_ward', treeX: 2
  },
  // Split at Tier 3
  { 
      id: 'frost_walker', name: 'Frost Walker', rarity: Rarity.MAGIC, 
      description: 'Enemies slip and miss. Increases Dodge Chance by {value}%.', theme: PassiveTheme.CRYOMANCY, 
      statType: StatType.DODGE_CHANCE, baseValue: 5, valuePerLevel: 4,
      tier: 3, maxRank: 5, prerequisiteId: 'crystalline_mind', treeX: 1
  },
  { 
      id: 'shatter_point', name: 'Shatter Point', rarity: Rarity.MAGIC, 
      description: 'Exploit frozen cracks. Increases Crit Chance by {value}%.', theme: PassiveTheme.CRYOMANCY, 
      statType: StatType.CRIT_CHANCE, baseValue: 2, valuePerLevel: 1,
      tier: 3, maxRank: 5, prerequisiteId: 'crystalline_mind', treeX: 3
  },
  // Ultimate
  { 
    id: 'static_discharge', name: 'Static Field', rarity: Rarity.UNIQUE,
    description: 'Every 3rd turn, discharge energy to Stun the enemy.', 
    theme: PassiveTheme.CRYOMANCY, baseValue: 0, valuePerLevel: 0,
    tier: 4, maxRank: 1, prerequisiteId: 'shatter_point', treeX: 2,
    proc: {
        trigger: 'onStartTurn',
        chance: 1.0,
        cooldown: 0,
        conditions: [{ type: 'turn_count_multiple', value: 3 }],
        effect: { type: 'debuff', subType: 'stun', value: 1, duration: 1 },
        description: 'Auto-Stun'
    }
  },

  // ==========================================================================================
  // CONTROL TREES
  // ==========================================================================================

  // --- SHADOW (Poison / Crit / Life Steal) ---
  { 
      id: 'shadow_step', name: 'Shadow Step', rarity: Rarity.COMMON, 
      description: 'Move unseen. Increases Dexterity by {value}.', theme: PassiveTheme.SHADOW, 
      statType: StatType.DEXTERITY, baseValue: 5, valuePerLevel: 3,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left Branch (Poison)
  { 
      id: 'venom_coating', name: 'Venom Coating', rarity: Rarity.COMMON, 
      description: 'Coats weapons in toxin. +{value}% Crit Chance.', theme: PassiveTheme.SHADOW, 
      statType: StatType.CRIT_CHANCE, baseValue: 3, valuePerLevel: 1.5,
      tier: 2, maxRank: 10, prerequisiteId: 'shadow_step', treeX: 1
  },
  { 
      id: 'toxic_cloud', name: 'Toxic Cloud', rarity: Rarity.MAGIC, 
      description: 'Poison chokes the air. +{value} Vitality.', theme: PassiveTheme.SHADOW, 
      statType: StatType.VITALITY, baseValue: 5, valuePerLevel: 3,
      tier: 3, maxRank: 5, prerequisiteId: 'venom_coating', treeX: 1
  },
  // Right Branch (Life Steal / Dmg)
  { 
      id: 'assassins_eye', name: 'Assassin\'s Eye', rarity: Rarity.COMMON, 
      description: 'Knowing where to strike. +{value} Damage.', theme: PassiveTheme.SHADOW, 
      statType: StatType.DAMAGE, baseValue: 3, valuePerLevel: 2,
      tier: 2, maxRank: 10, prerequisiteId: 'shadow_step', treeX: 3
  },
  { 
      id: 'void_hunger', name: 'Void Hunger', rarity: Rarity.MAGIC, 
      description: 'Drains life from foes. Increases Life Steal by {value}%.', theme: PassiveTheme.SHADOW, 
      statType: StatType.LIFE_STEAL, baseValue: 2, valuePerLevel: 1,
      tier: 3, maxRank: 5, prerequisiteId: 'assassins_eye', treeX: 3
  },
  // Ultimate
  { 
    id: 'blood_rite', name: 'Blood Rite', rarity: Rarity.UNIQUE,
    description: 'Sacrifice 5% HP at start of turn to gain Scaling Strength (Stacking).', 
    theme: PassiveTheme.SHADOW, baseValue: 0, valuePerLevel: 0,
    tier: 4, maxRank: 1, prerequisiteId: 'void_hunger', treeX: 2,
    proc: {
        trigger: 'onStartTurn',
        chance: 1.0,
        cooldown: 0,
        cost: { type: 'hp_percent', value: 0.05 },
        effect: { type: 'buff', subType: 'scaling_strength', value: 5, duration: 99, isStackable: true }, 
        description: 'HP -> Str'
    }
  },

  // --- ARCANE (Magic / Shields) ---
  { 
      id: 'ley_lines', name: 'Ley Lines', rarity: Rarity.COMMON, 
      description: 'Tap into magic. +{value} Intelligence.', theme: PassiveTheme.ARCANE, 
      statType: StatType.INTELLIGENCE, baseValue: 8, valuePerLevel: 3,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left: Defensive Magic
  { 
      id: 'arcane_armor', name: 'Mage Armor', rarity: Rarity.COMMON, 
      description: 'Magic solidifies. +{value} Armor.', theme: PassiveTheme.ARCANE, 
      statType: StatType.ARMOR, baseValue: 10, valuePerLevel: 8,
      tier: 2, maxRank: 10, prerequisiteId: 'ley_lines', treeX: 1
  },
  { 
    id: 'mana_shield', name: 'Mana Shield', rarity: Rarity.RARE,
    description: 'When hit, reduce damage by 50% but lose Gold (as Mana substitute).', 
    theme: PassiveTheme.ARCANE, baseValue: 0, valuePerLevel: 0,
    tier: 3, maxRank: 1, prerequisiteId: 'arcane_armor', treeX: 1,
    proc: {
        trigger: 'onTakeDamage', 
        chance: 0.5,
        cooldown: 2,
        effect: { type: 'shield', value: 1, duration: 1 },
        description: 'Dmg Mitigation'
    }
  },
  // Right: Offensive Magic
  { 
      id: 'mystic_focus', name: 'Mystic Focus', rarity: Rarity.COMMON, 
      description: 'Channeling power. +{value}% Crit Chance.', theme: PassiveTheme.ARCANE, 
      statType: StatType.CRIT_CHANCE, baseValue: 2, valuePerLevel: 1,
      tier: 2, maxRank: 10, prerequisiteId: 'ley_lines', treeX: 3
  },
  { 
      id: 'arcane_power', name: 'Overload', rarity: Rarity.RARE,
      description: 'Pure magic flow. +{value} Damage.', 
      theme: PassiveTheme.ARCANE, statType: StatType.DAMAGE, baseValue: 10, valuePerLevel: 5,
      tier: 3, maxRank: 5, prerequisiteId: 'mystic_focus', treeX: 3,
  },
  // Ultimate
  {
      id: 'time_dilation', name: 'Time Dilation', rarity: Rarity.UNIQUE,
      description: 'Gain a massive burst of Agility (Dexterity) at the start of battle.',
      theme: PassiveTheme.ARCANE, baseValue: 0, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'arcane_power', treeX: 2,
      proc: {
          trigger: 'onBattleStart',
          chance: 1.0,
          cooldown: 0,
          effect: { type: 'buff', subType: 'dodge_boost', value: 100, duration: 2 }, // Using dodge boost as proxy for agility/speed
          description: 'Time Slow'
      }
  },

  // ==========================================================================================
  // UTILITY & EXPLORATION
  // ==========================================================================================

  // --- FORTUNE (Loot / Gold) ---
  { 
      id: 'gold_lust', name: 'Gold Lust', rarity: Rarity.COMMON, 
      description: 'Greed fuels you. Increases Attack Speed by {value}%.', theme: PassiveTheme.FORTUNE, 
      statType: StatType.ATTACK_SPEED, baseValue: 5, valuePerLevel: 2,
      tier: 1, maxRank: 5, treeX: 2
  },
  // Left: Loot
  { 
      id: 'midas_touch', name: 'Midas Touch', rarity: Rarity.MAGIC, 
      description: 'Fortune favors the bold. Increases Magic Find by {value}%.', theme: PassiveTheme.FORTUNE, 
      statType: StatType.MAGIC_FIND, baseValue: 15, valuePerLevel: 5,
      tier: 2, maxRank: 5, prerequisiteId: 'gold_lust', treeX: 1
  },
  { 
      id: 'lucky_charm', name: 'Lucky Charm', rarity: Rarity.RARE, 
      description: 'Serendipity saves lives. Increases Dodge Chance by {value}%.', theme: PassiveTheme.FORTUNE, 
      statType: StatType.DEXTERITY, baseValue: 3, valuePerLevel: 2,
      tier: 3, maxRank: 5, prerequisiteId: 'midas_touch', treeX: 1
  },
  // Right: Survival
  { 
      id: 'gamblers_dodge', name: 'Gambler\'s Dodge', rarity: Rarity.MAGIC, 
      description: 'High stakes reflexes. +{value}% Dodge Chance.', theme: PassiveTheme.FORTUNE, 
      statType: StatType.DODGE_CHANCE, baseValue: 5, valuePerLevel: 3,
      tier: 2, maxRank: 5, prerequisiteId: 'gold_lust', treeX: 3
  },
  { 
      id: 'bribe_fate', name: 'Bribe Fate', rarity: Rarity.RARE, 
      description: 'When hit, 20% chance to stun the attacker.', theme: PassiveTheme.FORTUNE, 
      baseValue: 0, valuePerLevel: 0,
      tier: 3, maxRank: 1, prerequisiteId: 'gamblers_dodge', treeX: 3,
      proc: {
          trigger: 'onTakeDamage',
          chance: 0.2,
          cooldown: 0,
          effect: { type: 'debuff', subType: 'stun', value: 1, duration: 1 },
          description: 'Bribe Stun'
      }
  },
  // Ultimate
  {
      id: 'tycoon', name: 'Tycoon', rarity: Rarity.UNIQUE,
      description: 'Massive Magic Find boost +100%.',
      theme: PassiveTheme.FORTUNE, statType: StatType.MAGIC_FIND, baseValue: 100, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'lucky_charm', treeX: 2
  },

  // --- SCOUTING (Exploration) ---
  { 
      id: 'pathfinder', name: 'Pathfinder', rarity: Rarity.COMMON, 
      description: 'Knowledge of the land increases Dexterity by {value}.', theme: PassiveTheme.SCOUTING, 
      statType: StatType.DEXTERITY, baseValue: 8, valuePerLevel: 3,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left: Combat Advantage
  { 
      id: 'night_prowler', name: 'Nightstalker', rarity: Rarity.RARE, 
      description: 'At NIGHT, gain +{value}% Crit Chance and First Strike.', theme: PassiveTheme.SCOUTING, 
      statType: StatType.CRIT_CHANCE, baseValue: 15, valuePerLevel: 5,
      tier: 2, maxRank: 5, prerequisiteId: 'pathfinder', treeX: 1
  },
  { 
    id: 'ambush_tactics', name: 'Ambush', rarity: Rarity.RARE,
    description: 'Deal massive damage on Turn 1, then effect fades.', 
    theme: PassiveTheme.SCOUTING, baseValue: 0, valuePerLevel: 0,
    tier: 3, maxRank: 1, prerequisiteId: 'night_prowler', treeX: 1,
    proc: {
        trigger: 'onStartTurn',
        chance: 1.0,
        cooldown: 99, 
        conditions: [{ type: 'turn_count_multiple', value: 1 }], 
        effect: { type: 'damage_phys', value: 2.0 },
        description: 'First Strike'
    }
  },
  // Right: Explorer
  { 
      id: 'trailblazer', name: 'Trailblazer', rarity: Rarity.MAGIC, 
      description: 'Move swiftly through terrain. +{value} Vitality.', theme: PassiveTheme.SCOUTING, 
      statType: StatType.VITALITY, baseValue: 10, valuePerLevel: 5,
      tier: 2, maxRank: 5, prerequisiteId: 'pathfinder', treeX: 3
  },
  { 
      id: 'cartography', name: 'Cartography', rarity: Rarity.RARE, 
      description: 'Find hidden stashes. +{value}% Magic Find.', theme: PassiveTheme.SCOUTING, 
      statType: StatType.MAGIC_FIND, baseValue: 20, valuePerLevel: 5,
      tier: 3, maxRank: 5, prerequisiteId: 'trailblazer', treeX: 3
  },
  // Ultimate
  {
      id: 'omniscience', name: 'Omniscience', rarity: Rarity.UNIQUE,
      description: 'Start every battle with 100% Dodge for 1 turn.',
      theme: PassiveTheme.SCOUTING, baseValue: 0, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'ambush_tactics', treeX: 2,
      proc: {
          trigger: 'onBattleStart',
          chance: 1.0,
          cooldown: 0,
          effect: { type: 'buff', subType: 'dodge_boost', value: 100, duration: 1 },
          description: 'Predict Move'
      }
  },

  // --- NATURE (Terrain / Regen) ---
  { 
      id: 'oak_skin', name: 'Oak Skin', rarity: Rarity.COMMON, 
      description: 'Tough as bark. +{value} Vitality.', theme: PassiveTheme.NATURE, 
      statType: StatType.VITALITY, baseValue: 8, valuePerLevel: 3,
      tier: 1, maxRank: 10, treeX: 2
  },
  // Left: Adaptation
  { 
      id: 'swamp_thing', name: 'Mire Soul', rarity: Rarity.RARE, 
      description: 'In SWAMPS, poison enemies on contact. +{value} Armor.', theme: PassiveTheme.NATURE, 
      statType: StatType.ARMOR, baseValue: 15, valuePerLevel: 5,
      tier: 2, maxRank: 5, prerequisiteId: 'oak_skin', treeX: 1
  },
  { 
      id: 'entangle', name: 'Entangle', rarity: Rarity.RARE, 
      description: 'Attacks have 30% chance to Slow (Chill) enemy.', theme: PassiveTheme.NATURE, 
      baseValue: 0, valuePerLevel: 0,
      tier: 3, maxRank: 1, prerequisiteId: 'swamp_thing', treeX: 1,
      proc: {
          trigger: 'onHit',
          chance: 0.3,
          cooldown: 0,
          effect: { type: 'debuff', subType: 'chill', value: 0.2, duration: 2 },
          description: 'Slow'
      }
  },
  // Right: Recovery
  { 
      id: 'herbalism', name: 'Herbalism', rarity: Rarity.COMMON, 
      description: 'Knowledge of roots. +{value} Life Steal %.', theme: PassiveTheme.NATURE, 
      statType: StatType.LIFE_STEAL, baseValue: 2, valuePerLevel: 1,
      tier: 2, maxRank: 10, prerequisiteId: 'oak_skin', treeX: 3
  },
  {
      id: 'photosynthesis', name: 'Photosynthesis', rarity: Rarity.RARE,
      description: 'Regenerate {value}% HP every turn.', theme: PassiveTheme.NATURE,
      statType: StatType.VITALITY, baseValue: 0, valuePerLevel: 0, // Effect handled via proc logic usually, but here simulating via constant proc
      tier: 3, maxRank: 1, prerequisiteId: 'herbalism', treeX: 3,
      proc: {
          trigger: 'onStartTurn',
          chance: 1.0,
          cooldown: 0,
          effect: { type: 'heal', value: 0.05 },
          description: 'Regen 5%'
      }
  },
  // Ultimate
  {
      id: 'force_of_nature', name: 'Force of Nature', rarity: Rarity.UNIQUE,
      description: 'Massive Vitality and Thorns boost.',
      theme: PassiveTheme.NATURE, statType: StatType.THORNS, baseValue: 50, valuePerLevel: 0,
      tier: 4, maxRank: 1, prerequisiteId: 'photosynthesis', treeX: 2
  },
  
  // -- ISOLATED / LOOT ONLY SKILLS (Tier 0 or no Tier) --
  { 
      id: 'void_form', name: 'Void Form', rarity: Rarity.UNIQUE,
      description: 'Shift into the void at the start of battle, gaining massive Dodge chance for 2 turns.',
      theme: PassiveTheme.SHADOW, baseValue: 0, valuePerLevel: 0,
      tier: 4, maxRank: 1, treeX: 2,
      proc: {
          trigger: 'onBattleStart',
          chance: 1.0,
          cooldown: 0,
          effect: { type: 'buff', subType: 'dodge_boost', value: 50, duration: 2 },
          description: 'Ethereal'
      }
  },
  {
      id: 'purifying_light', name: 'Purifying Light', rarity: Rarity.RARE,
      description: 'Taking damage has a 20% chance to Cleanse all negative effects.',
      theme: PassiveTheme.SENTINEL, baseValue: 0, valuePerLevel: 0,
      tier: 3, maxRank: 1, treeX: 3,
      proc: {
          trigger: 'onTakeDamage',
          chance: 0.2,
          cooldown: 0,
          effect: { type: 'cleanse', value: 0 },
          description: 'Cleanse'
      }
  },
  { id: 'tidal_affinity', name: 'Tidal Ward', rarity: Rarity.RARE, description: 'In SWAMPS or near WATER, gain +{value} Vitality and regenerate health.', theme: PassiveTheme.CRYOMANCY, statType: StatType.VITALITY, baseValue: 10, valuePerLevel: 5, tier: 2, maxRank: 5, treeX: 3 },
  { id: 'grave_born', name: 'Graveborn', rarity: Rarity.RARE, description: 'In CRYPTS or RUINS, gain +{value}% Life Steal.', theme: PassiveTheme.SHADOW, statType: StatType.LIFE_STEAL, baseValue: 5, valuePerLevel: 2, tier: 2, maxRank: 5, treeX: 2 },
];

// Game Changing Set Bonuses
export const PASSIVE_SET_BONUSES: PassiveSetBonus[] = [
    {
        theme: PassiveTheme.PYROMANCY,
        name: 'Avatar of Flame',
        description: 'Attacks ignite enemies. Stacks infinite times.',
        requiredCount: 3,
        staticStats: [{ type: StatType.DAMAGE, value: 20 }],
        triggerCondition: 'onHit',
        procChance: 0.5,
        procEffect: { type: 'burn', duration: 3, value: 0.1, isStackable: true } // 10% weapon dmg stack
    },
    {
        theme: PassiveTheme.CRYOMANCY,
        name: 'Absolute Zero',
        description: 'Attacks CHILL enemies, reducing their Agility (Turn Speed). Crit on Frozen.',
        requiredCount: 3,
        staticStats: [{ type: StatType.ARMOR, value: 50 }],
        triggerCondition: 'onHit',
        procChance: 0.4,
        procEffect: { type: 'chill', duration: 3, value: 0.2, isStackable: true } // Reduces Agility by 20%
    },
    {
        theme: PassiveTheme.SHADOW,
        name: 'Assassin\'s Creed',
        description: 'Applying Poison also Blinds. Crits against Poisoned enemies deal +50% dmg.',
        requiredCount: 3,
        staticStats: [{ type: StatType.CRIT_CHANCE, value: 10 }],
        triggerCondition: 'onCrit',
        procChance: 1.0,
        procEffect: { type: 'poison', duration: 4, value: 0.15, isStackable: true }
    },
    {
        theme: PassiveTheme.SENTINEL,
        name: 'Iron Fortress',
        description: 'When hit, 20% chance to Stun attacker and Regen HP.',
        requiredCount: 3,
        staticStats: [{ type: StatType.VITALITY, value: 20 }],
        triggerCondition: 'onTakeDamage',
        procChance: 0.2,
        procEffect: { type: 'regen', duration: 2, value: 0.05 }
    },
    {
        theme: PassiveTheme.FORTUNE,
        name: 'Jackpot',
        description: 'Critical Hits have a chance to grant a massive visual buff and drop Gold.',
        requiredCount: 2,
        staticStats: [{ type: StatType.MAGIC_FIND, value: 50 }],
        triggerCondition: 'onCrit',
        procChance: 0.3,
        procEffect: { type: 'crit_boost', duration: 1, value: 100 } // +100% Crit Dmg next turn
    }
];

// Synergy Combinations (Roguelike Elements)
export const COMPOSITE_SYNERGIES: SynergyDefinition[] = [
    {
        id: 'frostburn',
        name: 'Frostburn',
        themes: [PassiveTheme.PYROMANCY, PassiveTheme.CRYOMANCY],
        description: 'Hitting Chilled enemies with Fire causes a Steam Explosion (Instant Dmg).',
        effect: { trigger: 'onHit', type: 'synergy_burst', value: 2.0 } // 200% DMG burst
    },
    {
        id: 'biohazard',
        name: 'Biohazard',
        themes: [PassiveTheme.SHADOW, PassiveTheme.SENTINEL],
        description: 'Being hit retaliates with Poison, and attacks deal +20% damage against poisoned enemies.',
        effect: { trigger: 'onTakeDamage', type: 'synergy_debuff', value: 0.1 }
    },
    {
        id: 'dark_momentum',
        name: 'Dark Momentum',
        themes: [PassiveTheme.SHADOW, PassiveTheme.FORTUNE],
        description: 'Crits grant +35% Dodge and an instant extra turn in the combat queue.',
        effect: { trigger: 'onCrit', type: 'synergy_buff', value: 1.5 } // 50% Agi boost
    }
];

export const INITIAL_WORLD_MAP: MapNode[] = [
  { id: 'town', name: 'Tristram Ruins', level: 1, description: 'The remains of a once-great town, now infested with the undead.', terrain: TerrainType.RUINS, coordinates: { x: 10, y: 50 }, connections: ['graveyard', 'fields'], isUnlocked: true, isCleared: false, icon: 'location_town' },
  { id: 'graveyard', name: 'Old Graveyard', level: 5, description: 'Restless spirits and shambling corpses guard this sacred ground.', terrain: TerrainType.CRYPT, coordinates: { x: 30, y: 30 }, connections: ['town', 'crypt'], isUnlocked: false, isCleared: false, icon: 'location_crypt' },
  { id: 'fields', name: 'Blighted Fields', level: 3, description: 'Overgrown farmlands where scavengers roam.', terrain: TerrainType.PLAINS, coordinates: { x: 30, y: 70 }, connections: ['town', 'forest'], isUnlocked: false, isCleared: false, icon: 'location_forest' },
  { id: 'crypt', name: 'Royal Crypts', level: 10, description: 'Ancient tombs holding the bones of kings and darker things.', terrain: TerrainType.CRYPT, coordinates: { x: 50, y: 25 }, connections: ['graveyard', 'ruins'], isUnlocked: false, isCleared: false, icon: 'location_crypt' },
  { id: 'forest', name: 'Dark Wood', level: 8, description: 'The trees whisper madness to those who enter.', terrain: TerrainType.FOREST, coordinates: { x: 50, y: 75 }, connections: ['fields', 'ruins', 'swamp'], isUnlocked: false, isCleared: false, icon: 'location_forest' },
  { id: 'swamp', name: 'Festering Swamp', level: 12, description: 'Thick fog and poisonous waters.', terrain: TerrainType.SWAMP, coordinates: { x: 65, y: 85 }, connections: ['forest', 'ruins'], isUnlocked: false, isCleared: false, icon: 'location_void' },
  { id: 'ruins', name: 'Temple Ruins', level: 15, description: 'A fallen temple, the source of the corruption.', terrain: TerrainType.RUINS, coordinates: { x: 75, y: 50 }, connections: ['crypt', 'forest', 'swamp', 'void'], isUnlocked: false, isCleared: false, icon: 'location_ruins' },
  { id: 'void', name: 'The Void Rift', level: 25, description: 'The tear in reality where the Void Lords await.', terrain: TerrainType.VOID, coordinates: { x: 90, y: 50 }, connections: ['ruins'], isUnlocked: false, isCleared: false, icon: 'location_void' }
];

export const EXPLORATION_EVENTS: ExplorationEvent[] = [
  { id: 'shrine_might', title: 'Shrine of Might', description: 'You find a glowing red obelisk. You feel power coursing through your veins.', type: EventType.SHRINE, effect: { statType: StatType.DAMAGE, value: 20, duration: 5 }, icon: '🔥' },
  { id: 'shrine_protection', title: 'Shrine of Stone', description: 'An ancient statue hums with defensive energy. Your skin hardens.', type: EventType.SHRINE, effect: { statType: StatType.ARMOR, value: 50, duration: 5 }, icon: '🛡️' },
  { id: 'shrine_fortune', title: 'Shrine of Fortune', description: 'A golden aura surrounds this shrine. You feel lucky.', type: EventType.SHRINE, effect: { statType: StatType.MAGIC_FIND, value: 50, duration: 5 }, icon: '🍀' },
  { id: 'chest_common', title: 'Rotting Chest', description: 'You kick open an old wooden chest found in the mud.', type: EventType.TREASURE, effect: { goldMin: 10, goldMax: 50, itemChance: 0.3 }, icon: '📦' },
  { id: 'chest_rare', title: 'Gilded Chest', description: 'A beautifully crafted chest sits untouched in the shadows.', type: EventType.TREASURE, effect: { goldMin: 100, goldMax: 300, itemChance: 1.0 }, icon: '⚱️' },
  { id: 'trap_spikes', title: 'Spike Trap', description: 'You step on a pressure plate! Spikes shoot up from the ground.', type: EventType.TRAP, effect: { hpLossPercent: 0.15 }, icon: '🩸' },
  { id: 'trap_poison', title: 'Poison Gas', description: 'A vent releases a cloud of green gas. You cough violently.', type: EventType.TRAP, effect: { statType: StatType.VITALITY, value: -5, duration: 3, hpLossPercent: 0.05 }, icon: '🤢' },
  { id: 'curse_weakness', title: 'Cursed Idol', description: 'You disturb a small idol. A feeling of crushing weakness washes over you.', type: EventType.TRAP, effect: { statType: StatType.DAMAGE, value: -5, duration: 4 }, icon: '💀' },
  { id: 'encounter_tome', title: 'Ancient Tome', description: 'You find a dusty tome containing forgotten combat techniques.', type: EventType.ENCOUNTER, effect: { xpMultiplier: 0.5 }, icon: '📖' },
  // NEW SKILL REWARD EVENT
  { id: 'ancient_obelisk', title: 'Ancient Obelisk', description: 'A monolith etched with glowing runes pulses with knowledge. It offers a secret technique.', type: EventType.ENCOUNTER, grantSkillRarity: Rarity.RARE, effect: {}, icon: '📜' }
];

export const SMUGGLING_BUNDLES: SmugglingBundle[] = [
    { id: 'sack', name: 'Thief\'s Sack', description: 'A dusty sack collected from the roadside. Cheap and mostly worthless, but sometimes...', cost: 250, icon: 'sack', dropChances: { [Rarity.UNIQUE]: 0.01, [Rarity.RARE]: 0.10, [Rarity.MAGIC]: 0.50 } },
    { id: 'crate', name: 'Smuggler\'s Crate', description: 'A reinforced crate smuggled past the guards. Contains decent gear.', cost: 1000, icon: 'crate', guaranteedRarity: Rarity.MAGIC, dropChances: { [Rarity.UNIQUE]: 0.05, [Rarity.RARE]: 0.30, [Rarity.MAGIC]: 1.0 } },
    { id: 'chest', name: 'Void-Touched Chest', description: 'A chest radiating dark energy. High risk, high reward.', cost: 5000, icon: 'chest', guaranteedRarity: Rarity.RARE, dropChances: { [Rarity.UNIQUE]: 0.15, [Rarity.RARE]: 1.0, [Rarity.MAGIC]: 1.0 } }
];
