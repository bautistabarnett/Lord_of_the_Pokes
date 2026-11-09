

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
    baseMultiplier: 10,
    rarityMultipliers: {
      [Rarity.COMMON]: 1,
      [Rarity.MAGIC]: 2.0,
      [Rarity.RARE]: 4.5,
      [Rarity.UNIQUE]: 10,
    },
    identifyPenalty: 0.5, // Unidentified items sell for 50%
    statBonusMultiplier: 0.25, // Gold added per point of total stats
    buyMarkup: 3, // Buying items costs 3x their sell value
  },

  COSTS: {
    identify: {
      [Rarity.COMMON]: 10,
      [Rarity.MAGIC]: 30,
      [Rarity.RARE]: 100,
      [Rarity.UNIQUE]: 300,
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

    triadConfig: {
      advantages: {
        [CombatStance.WILL]: CombatStance.SPIRIT,     // Voluntad vence a Espíritu
        [CombatStance.SPIRIT]: CombatStance.RESOLVE,  // Espíritu vence a Temple
        [CombatStance.RESOLVE]: CombatStance.WILL,    // Temple vence a Voluntad
      },
      winDamageMult: 1.35,     // +35% daño al triunfar
      tieDamageMult: 1.00,     // 100% neutro
      loseDamageMult: 0.60,    // 60% daño (reducción acordada)
      winDefenseMitigationBonus: 0.20, // Jugador recibe 20% menos daño si su postura vence al atacante
      loseDefensePenaltyBonus: 0.15,   // Jugador recibe 15% más daño si su postura es vulnerable al atacante
      actionTimerSeconds: 2.5, // Temporizador de acción para el jugador
    },

    // Turn Logic (Smooth continuous turns)
    calculateTurns: (playerAgi: number, enemyAgi: number) => {
      const pAgi = Math.max(1, playerAgi);
      const eAgi = Math.max(1, enemyAgi);
      const ratio = pAgi / eAgi;
      const playerAttacks = ratio >= 1 ? Math.min(3, Math.max(1, Math.round(ratio))) : 1;
      const enemyAttacks = ratio < 1 ? Math.min(3, Math.max(1, Math.round(1 / ratio))) : 1;
      return { playerAttacks, enemyAttacks, playerGoesFirst: pAgi >= eAgi };
    }
  },

  LOOT: {
    baseDropChance: 0.35,
    difficultyScaling: 0.05, // Added to drop chance per difficulty level
    magicFindFactor: 0.005, // Used in diminishing returns curve

    // Base probabilities before MF and difficulty
    rarityChances: {
      [Rarity.UNIQUE]: 0.005, // 0.5% base
      [Rarity.RARE]: 0.035,   // 3.5% base
      [Rarity.MAGIC]: 0.18,   // 18.0% base
    },
    
    // Strict caps even with maximum MF and boss encounters
    caps: {
      [Rarity.UNIQUE]: 0.018, // 1.8% hard cap
      [Rarity.RARE]: 0.085,   // 8.5% hard cap
      [Rarity.MAGIC]: 0.35,   // 35.0% hard cap
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

/**
 * Calculates dynamic identification cost scaled gently with item level,
 * ensuring early game drops are affordable while scaling smoothly into high tiers.
 */
export const getIdentifyCost = (item: Item): number => {
  const baseCosts = BALANCE.COSTS.identify;
  const base = baseCosts[item.rarity] || 50;
  const lvlMult = Math.max(0.4, Math.min(1.5, 0.4 + (item.level || 1) * 0.05));
  return Math.max(5, Math.round(base * lvlMult));
};

export type TriadClashResult = 'WIN' | 'TIE' | 'LOSE';

export const resolveTriadClash = (attackerStance: CombatStance, defenderStance: CombatStance): TriadClashResult => {
  if (attackerStance === defenderStance) return 'TIE';
  if (BALANCE.COMBAT.triadConfig.advantages[attackerStance] === defenderStance) return 'WIN';
  return 'LOSE';
};

export const STANCE_META: Record<CombatStance, { name: string, icon: string, color: string, ringColor: string, beats: string, weakTo: string, desc: string }> = {
  [CombatStance.WILL]: {
    name: 'Voluntad',
    icon: '🔴',
    color: 'text-red-400 border-red-500 bg-red-950/50 hover:bg-red-900/60 shadow-[0_0_12px_rgba(239,68,68,0.35)]',
    ringColor: 'ring-red-500',
    beats: 'Espíritu',
    weakTo: 'Temple',
    desc: 'Ímpetu y fuerza. Vence a Espíritu pero cede ante Temple.'
  },
  [CombatStance.SPIRIT]: {
    name: 'Espíritu',
    icon: '🟣',
    color: 'text-purple-400 border-purple-500 bg-purple-950/50 hover:bg-purple-900/60 shadow-[0_0_12px_rgba(168,85,247,0.35)]',
    ringColor: 'ring-purple-500',
    beats: 'Temple',
    weakTo: 'Voluntad',
    desc: 'Arcano y mente. Vence a Temple pero cede ante Voluntad.'
  },
  [CombatStance.RESOLVE]: {
    name: 'Temple',
    icon: '🟢',
    color: 'text-emerald-400 border-emerald-500 bg-emerald-950/50 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]',
    ringColor: 'ring-emerald-500',
    beats: 'Voluntad',
    weakTo: 'Espíritu',
    desc: 'Guardia y resiliencia. Vence a Voluntad pero cede ante Espíritu.'
  }
};