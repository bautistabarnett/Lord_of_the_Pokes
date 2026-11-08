

import { Rarity, MonsterRarity, Item, ItemSlot, StatType, CombatStance } from '../types';

export const BALANCE = {
  STATS: {
    base: {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      vitality: 10,
    },
    derived: {
      damage: 5,
      armor: 0,
      magicFind: 0,
    },
    perLevel: {
      hp: 15,
      statPoints: 3,
      skillPoints: 1, // New: 1 point per level to spend in tree
    }
  },
  
  ITEM_VALUE: {
    baseMultiplier: 15,
    rarityMultipliers: {
      [Rarity.COMMON]: 1,
      [Rarity.MAGIC]: 2.5,
      [Rarity.RARE]: 6,
      [Rarity.UNIQUE]: 15,
    },
    identifyPenalty: 0.5, // Unidentified items sell for 50%
    statBonusMultiplier: 0.5, // Gold added per point of total stats
    buyMarkup: 3, // Buying items costs 3x their sell value
  },

  COSTS: {
    identify: {
      [Rarity.COMMON]: 10,
      [Rarity.MAGIC]: 50,
      [Rarity.RARE]: 150,
      [Rarity.UNIQUE]: 500,
    }
  },

  COMBAT: {
    critMultiplier: 1.5,
    baseCritChance: 5,
    baseDodgeChance: 0,
    
    // Asymptotic Armor Mitigation (Diablo/PoE Curve)
    // Formula: Mitigation% = Armor / (Armor + 40 * Level + 50)
    // Caps at 80% to avoid true invulnerability
    calculateMitigationPercent: (armor: number, level: number = 1): number => {
      const safeArmor = Math.max(0, armor);
      const k = Math.max(50, 40 * level + 50);
      const percent = safeArmor / (safeArmor + k);
      return Math.min(0.80, percent); // Max 80% damage reduction
    },

    stanceMultipliers: {
      [CombatStance.AGGRESSIVE]: { damage: 1.3, mitigation: 0.7 },
      [CombatStance.DEFENSIVE]: { damage: 0.7, mitigation: 1.5 },
      [CombatStance.BALANCED]: { damage: 1.0, mitigation: 1.0 },
    },

    // Turn Logic
    calculateTurns: (playerAgi: number, enemyAgi: number) => {
      const pAgi = Math.max(1, playerAgi);
      const eAgi = Math.max(1, enemyAgi);
      const playerAttacks = Math.max(1, Math.round(pAgi / eAgi));
      const enemyAttacks = Math.max(1, Math.round(eAgi / pAgi));
      return { playerAttacks, enemyAttacks, playerGoesFirst: pAgi >= eAgi };
    }
  },

  LOOT: {
    baseDropChance: 0.4,
    difficultyScaling: 0.1, // Added to drop chance per difficulty level
    magicFindFactor: 0.01, // 1 MF = 1% increase

    // Base probabilities before MF
    rarityChances: {
      [Rarity.UNIQUE]: 0.01,
      [Rarity.RARE]: 0.05,
      [Rarity.MAGIC]: 0.20,
    },
    
    // Caps to prevent 100% unique drops
    caps: {
      [Rarity.UNIQUE]: 0.25,
      [Rarity.RARE]: 0.50,
      [Rarity.MAGIC]: 0.90,
    }
  },

  MONSTER: {
    rarityConfig: {
        [MonsterRarity.COMMON]:   { statMult: 1.0, xpMult: 1.0, goldMult: 1.0, maledictCount: 0, color: 'text-stone-400', glow: 'shadow-stone-900' },
        [MonsterRarity.UNCOMMON]: { statMult: 1.3, xpMult: 1.5, goldMult: 1.5, maledictCount: 1, color: 'text-green-400', glow: 'shadow-green-900' },
        [MonsterRarity.RARE]:     { statMult: 1.8, xpMult: 2.5, goldMult: 2.5, maledictCount: 2, color: 'text-yellow-400', glow: 'shadow-yellow-900' },
        [MonsterRarity.EPIC]:     { statMult: 2.5, xpMult: 5.0, goldMult: 4.0, maledictCount: 3, color: 'text-purple-400', glow: 'shadow-purple-900' },
        [MonsterRarity.MYTHIC]:   { statMult: 3.5, xpMult: 10.0, goldMult: 8.0, maledictCount: 4, color: 'text-red-500', glow: 'shadow-red-900' },
        [MonsterRarity.UNIQUE]:   { statMult: 5.0, xpMult: 25.0, goldMult: 15.0, maledictCount: 5, color: 'text-amber-500', glow: 'shadow-amber-500' },
    }
  }
};