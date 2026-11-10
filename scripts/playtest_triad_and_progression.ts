import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap, PlayerStats, PassiveSkill 
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META, TriadClashResult } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats } from '../services/gameLogic';

console.log("================================================================================");
console.log("⚔️ PLAYTEST INTEGRAL: SISTEMA DE TRÍADA Y CALIBRACIÓN DE LA PROGRESIÓN DE STATS");
console.log("================================================================================\n");

export type Playstyle = 'OPTIMAL_TACTICIAN' | 'CASUAL_ADAPTIVE' | 'RANDOM_BLIND' | 'WORST_COUNTERED';

export interface CombatRunResult {
  won: boolean;
  turns: number;
  playerHpPercentRemaining: number;
  maxDamageTakenSingleHit: number;
  oneShotOccurred: boolean;
  potionsUsed: number;
  playerClashesWon: number;
  playerClashesTied: number;
  playerClashesLost: number;
  feintsTriggered: number;
  parriesTriggered: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
}

// Helper to equip a player for a given level and gear quality
export function createPlayerForLevel(
  level: number, 
  gearQuality: 'UNDERGEARED' | 'STANDARD' | 'WELL_GEARED' = 'STANDARD',
  includePassives: boolean = true
): { stats: PlayerStats, baseAttrs: BaseAttributes } {
  // Attribute progression: 3 stat points per level allocated according to a balanced ARPG build
  // 1.0 STR, 0.8 VIT, 0.7 DEX, 0.5 INT per level
  const points = (level - 1) * BALANCE.STATS.perLevel.statPoints;
  const strAlloc = Math.round(points * 0.35);
  const vitAlloc = Math.round(points * 0.30);
  const dexAlloc = Math.round(points * 0.20);
  const intAlloc = points - (strAlloc + vitAlloc + dexAlloc);

  const baseAttrs: BaseAttributes = {
    strength: BALANCE.STATS.base.strength + strAlloc,
    vitality: BALANCE.STATS.base.vitality + vitAlloc,
    dexterity: BALANCE.STATS.base.dexterity + dexAlloc,
    intelligence: BALANCE.STATS.base.intelligence + intAlloc,
  };

  const equipment: EquipmentMap = {};
  const slots: ItemSlot[] = [
    ItemSlot.MAIN_HAND,
    ItemSlot.OFF_HAND,
    ItemSlot.HEAD,
    ItemSlot.CHEST,
    ItemSlot.LEGS,
    ItemSlot.BOOTS,
    ItemSlot.GLOVES,
    ItemSlot.AMULET,
    ItemSlot.RING
  ];

  // Populate equipment based on gear quality
  let slotsToEquip = 6;
  let targetRarity = Rarity.MAGIC;
  let itemLevel = level;

  if (gearQuality === 'UNDERGEARED') {
    slotsToEquip = Math.max(2, Math.floor(slots.length * 0.4));
    targetRarity = Rarity.COMMON;
    itemLevel = Math.max(1, Math.floor(level * 0.6));
  } else if (gearQuality === 'STANDARD') {
    slotsToEquip = Math.min(slots.length, 5 + Math.floor(level / 8));
    targetRarity = level >= 15 ? Rarity.RARE : Rarity.MAGIC;
    itemLevel = level;
  } else if (gearQuality === 'WELL_GEARED') {
    slotsToEquip = slots.length;
    targetRarity = level >= 20 ? Rarity.UNIQUE : Rarity.RARE;
    itemLevel = level + 2;
  }

  for (let i = 0; i < slotsToEquip; i++) {
    const slot = slots[i];
    const item = generateLoot(itemLevel, 1.0, 20, targetRarity);
    if (item) {
      item.type = slot;
      item.isIdentified = true;
      equipment[slot] = item;
    }
  }

  // Realistic Passive Skills Progression
  const passives: PassiveSkill[] = [];
  if (includePassives && level >= 2) {
    const passiveCount = Math.min(10, Math.floor(level * 0.4) + 1);
    // Select a synergistic mix: Sentinel (vitality/armor) & Pyromancy (str/dmg)
    const sentinelSkills = [
      { id: 'unyielding', name: 'Unyielding', theme: 'Sentinel' as any, statType: StatType.VITALITY, baseValue: 8, valuePerLevel: 4, maxRank: 10 },
      { id: 'iron_skin', name: 'Iron Skin', theme: 'Sentinel' as any, statType: StatType.ARMOR, baseValue: 20, valuePerLevel: 10, maxRank: 10 },
      { id: 'deflection', name: 'Deflection', theme: 'Sentinel' as any, statType: StatType.DODGE_CHANCE, baseValue: 3, valuePerLevel: 1.5, maxRank: 10 },
      { id: 'shield_bash', name: 'Shield Bash', theme: 'Sentinel' as any, statType: StatType.DAMAGE, baseValue: 5, valuePerLevel: 5, maxRank: 5 },
    ];
    const offensiveSkills = [
      { id: 'magma_veins', name: 'Magma Veins', theme: 'Pyromancy' as any, statType: StatType.STRENGTH, baseValue: 5, valuePerLevel: 3, maxRank: 10 },
      { id: 'burning_rage', name: 'Burning Rage', theme: 'Pyromancy' as any, statType: StatType.DAMAGE, baseValue: 3, valuePerLevel: 2, maxRank: 10 },
      { id: 'gold_lust', name: 'Gold Lust', theme: 'Fortune' as any, statType: StatType.ATTACK_SPEED, baseValue: 5, valuePerLevel: 2, maxRank: 5 },
    ];

    const pool = [...sentinelSkills, ...offensiveSkills];
    const selected = pool.slice(0, passiveCount);
    selected.forEach(p => {
      const rank = Math.min(p.maxRank, 1 + Math.floor((level - 1) / 8));
      passives.push({
        ...p,
        level: rank,
        value: p.baseValue + (rank - 1) * p.valuePerLevel,
        rarity: Rarity.COMMON,
        tier: 1,
        maxRank: p.maxRank
      } as PassiveSkill);
    });
  }

  const stats = calculatePlayerStats(baseAttrs, equipment, passives, level, 0);
  return { stats, baseAttrs };
}

// Simulates a single combat battle following useCombatEngine.ts rules
export function simulateBattle(
  playerStats: PlayerStats,
  monster: Monster,
  playstyle: Playstyle
): CombatRunResult {
  let playerHp = playerStats.maxHp;
  let monsterHp = monster.maxHp;
  let playerPotions = 2; // standard 2 charges per battle

  let turns = 0;
  let maxDamageTakenSingleHit = 0;
  let playerClashesWon = 0;
  let playerClashesTied = 0;
  let playerClashesLost = 0;
  let feintsTriggered = 0;
  let parriesTriggered = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;

  let currentEnemyStance = monster.currentStance || CombatStance.RESOLVE;
  let isEnemyStanceHidden = monster.isStanceHidden || false;

  const allStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE];

  // Helper to get winning counter
  const getCounter = (stance: CombatStance): CombatStance => {
    if (stance === CombatStance.SPIRIT) return CombatStance.WILL;
    if (stance === CombatStance.RESOLVE) return CombatStance.SPIRIT;
    return CombatStance.RESOLVE; // beats Will
  };

  // Helper to get losing stance
  const getWeakTo = (stance: CombatStance): CombatStance => {
    if (stance === CombatStance.WILL) return CombatStance.SPIRIT;
    if (stance === CombatStance.SPIRIT) return CombatStance.RESOLVE;
    return CombatStance.WILL;
  };

  // 1:1 Strict Turn Loop (Max 100 turns safety cap)
  while (playerHp > 0 && monsterHp > 0 && turns < 100) {
    turns++;

    // -------------------------------------------------------------------------
    // 1. PLAYER'S TURN (Turn 1 Initiative)
    // -------------------------------------------------------------------------
    let playerChoice: CombatStance;

    if (playstyle === 'OPTIMAL_TACTICIAN') {
      if (!isEnemyStanceHidden) {
        playerChoice = getCounter(currentEnemyStance);
      } else {
        // Deduce based on monster stats
        if (monster.strength >= monster.intelligence && monster.strength >= monster.dexterity) {
          playerChoice = getCounter(CombatStance.WILL);
        } else if (monster.intelligence >= monster.strength && monster.intelligence >= monster.dexterity) {
          playerChoice = getCounter(CombatStance.SPIRIT);
        } else {
          playerChoice = getCounter(CombatStance.RESOLVE);
        }
      }
    } else if (playstyle === 'CASUAL_ADAPTIVE') {
      // 70% chance to counter if visible, random on hidden
      if (!isEnemyStanceHidden && Math.random() < 0.70) {
        playerChoice = getCounter(currentEnemyStance);
      } else {
        playerChoice = allStances[Math.floor(Math.random() * allStances.length)];
      }
    } else if (playstyle === 'RANDOM_BLIND') {
      playerChoice = allStances[Math.floor(Math.random() * allStances.length)];
    } else {
      // WORST_COUNTERED: deliberately choose the losing stance
      playerChoice = getWeakTo(currentEnemyStance);
    }

    // Resolve Player Attack Clash
    const playerClash = resolveTriadClash(playerChoice, currentEnemyStance);
    let rawDmg = playerStats.damage * (0.8 + Math.random() * 0.4);

    // Lucky Strike
    const luckyChance = Math.min(10, Math.floor((playerStats.magicFind || 0) / 20));
    if (luckyChance > 0 && Math.random() * 100 < luckyChance) {
      rawDmg *= 1.25;
    }

    if (playerClash === 'WIN') {
      playerClashesWon++;
      rawDmg *= BALANCE.COMBAT.triadConfig.winDamageMult; // 1.35x
    } else if (playerClash === 'LOSE') {
      playerClashesLost++;
      // Quick Reaction -> Feint Check
      const effectiveReaction = playerStats.attackSpeed || 0;
      const feintChance = Math.min(35, effectiveReaction * 0.6);
      if (feintChance > 0 && Math.random() * 100 < feintChance) {
        feintsTriggered++;
        // Feint salvages damage back to 100%
      } else {
        rawDmg *= BALANCE.COMBAT.triadConfig.loseDamageMult; // 0.60x
      }
    } else {
      playerClashesTied++;
      // 1.00x
    }

    // Crit check
    if (Math.random() * 100 < playerStats.critChance) {
      rawDmg *= BALANCE.COMBAT.critMultiplier;
    }

    // Monster armor mitigation
    const monsterMitigation = BALANCE.COMBAT.calculateMitigationPercent(monster.armor, monster.level);
    const netPlayerDmg = Math.max(1, Math.floor(rawDmg * (1 - monsterMitigation)));

    monsterHp = Math.max(0, monsterHp - netPlayerDmg);
    totalDamageDealt += netPlayerDmg;

    // Player Life Steal
    if (playerStats.lifeSteal > 0 && netPlayerDmg > 0) {
      const heal = Math.floor(netPlayerDmg * (playerStats.lifeSteal / 100));
      playerHp = Math.min(playerStats.maxHp, playerHp + heal);
    }

    if (monsterHp <= 0) break;

    // -------------------------------------------------------------------------
    // 2. ENEMY'S TURN
    // -------------------------------------------------------------------------
    let rawEnemyDmg = monster.damage * (0.8 + Math.random() * 0.4);

    // Maledict Executioner
    if (monster.maledicts.some(m => m.id === 'executioner') && playerHp < playerStats.maxHp * 0.3) {
      rawEnemyDmg *= 2.0;
    }

    // Monster Crit
    if (Math.random() * 100 < monster.critChance) {
      rawEnemyDmg *= BALANCE.COMBAT.critMultiplier;
    }

    // Armor Mitigation with Triad Clash
    const baseMitigation = BALANCE.COMBAT.calculateMitigationPercent(playerStats.armor, playerStats.level);
    const enemyClash = resolveTriadClash(currentEnemyStance, playerChoice);
    let finalMitigation = baseMitigation;

    if (enemyClash === 'WIN') {
      // Enemy counters player stance: 15% armor mitigation penalty
      finalMitigation = Math.max(0, baseMitigation - BALANCE.COMBAT.triadConfig.loseDefensePenaltyBonus);
    } else if (enemyClash === 'LOSE') {
      // Player stance counters enemy: +20% mitigation bonus
      finalMitigation = Math.min(0.85, baseMitigation + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus);
    }

    let netEnemyDmg = Math.max(1, Math.floor(rawEnemyDmg * (1 - finalMitigation)));

    // Quick Reaction -> Parry Check
    const effectiveReaction = playerStats.attackSpeed || 0;
    const parryChance = Math.min(50, effectiveReaction * 1.0);
    if (parryChance > 0 && Math.random() * 100 < parryChance) {
      parriesTriggered++;
      netEnemyDmg = Math.max(1, Math.floor(netEnemyDmg * 0.65)); // -35% damage reduction
    }

    if (netEnemyDmg > maxDamageTakenSingleHit) {
      maxDamageTakenSingleHit = netEnemyDmg;
    }

    playerHp = Math.max(0, playerHp - netEnemyDmg);
    totalDamageTaken += netEnemyDmg;

    // Player Thorns
    if ((playerStats.thorns || 0) > 0) {
      const armorBonus = Math.floor(playerStats.armor * 0.05);
      const reflected = Math.max(1, Math.floor(rawEnemyDmg * ((playerStats.thorns || 0) / 100)) + armorBonus);
      monsterHp = Math.max(0, monsterHp - reflected);
    }

    // Monster Life Steal
    if (monster.lifeSteal > 0 && netEnemyDmg > 0) {
      const heal = Math.floor(netEnemyDmg * (monster.lifeSteal / 100));
      monsterHp = Math.min(monster.maxHp, monsterHp + heal);
    }

    // Player Emergency Potions (35% threshold)
    if (playerHp > 0 && playerHp < playerStats.maxHp * 0.35 && playerPotions > 0) {
      playerPotions--;
      playerHp = Math.min(playerStats.maxHp, playerHp + Math.floor(playerStats.maxHp * 0.35));
    }

    // Monster Stance Rotation (45% probability)
    if (Math.random() < 0.45) {
      const remainingStances = allStances.filter(s => s !== currentEnemyStance);
      currentEnemyStance = remainingStances[Math.floor(Math.random() * remainingStances.length)];
    }
  }

  const won = playerHp > 0;
  const oneShotOccurred = maxDamageTakenSingleHit >= playerStats.maxHp;

  return {
    won,
    turns,
    playerHpPercentRemaining: Math.round((Math.max(0, playerHp) / playerStats.maxHp) * 100),
    maxDamageTakenSingleHit,
    oneShotOccurred,
    potionsUsed: 2 - playerPotions,
    playerClashesWon,
    playerClashesTied,
    playerClashesLost,
    feintsTriggered,
    parriesTriggered,
    totalDamageDealt,
    totalDamageTaken
  };
}

// Runs a batch of simulations and produces statistical aggregations
export function runSimulationBatch(
  level: number,
  monsterRarity: MonsterRarity,
  playstyle: Playstyle,
  gearQuality: 'UNDERGEARED' | 'STANDARD' | 'WELL_GEARED',
  runs: number = 200
) {
  let wins = 0;
  let totalTurns = 0;
  let totalHpRemainingPct = 0;
  let maxSingleHitSeen = 0;
  let oneShots = 0;
  let totalPotions = 0;
  let totalWinsClash = 0;
  let totalTiesClash = 0;
  let totalLossesClash = 0;
  let totalFeints = 0;
  let totalParries = 0;
  let totalDmgDealt = 0;
  let totalDmgTaken = 0;

  const { stats: playerStats } = createPlayerForLevel(level, gearQuality);

  for (let i = 0; i < runs; i++) {
    // Generate a fresh monster each run
    const monster = generateMonster(level, 1.0);
    // Force target rarity if specified
    if (monsterRarity !== MonsterRarity.COMMON) {
      monster.rarity = monsterRarity;
      const cfg = BALANCE.MONSTER.rarityConfig[monsterRarity];
      const baseAttr = Math.floor(10 + (level * 2));
      const mult = cfg.statMult;
      monster.strength = Math.floor(baseAttr * mult);
      monster.dexterity = Math.floor(baseAttr * mult);
      monster.intelligence = Math.floor(baseAttr * mult);
      monster.vitality = Math.floor(baseAttr * mult);
      monster.maxHp = Math.floor((monster.vitality * 8) + (level * 20));
      monster.damage = Math.floor((monster.strength * 0.6) + (level * 3));
      monster.armor = Math.floor((monster.dexterity * 0.5) + (level * 2));
    }

    const res = simulateBattle(playerStats, monster, playstyle);

    if (res.won) wins++;
    totalTurns += res.turns;
    totalHpRemainingPct += res.playerHpPercentRemaining;
    if (res.maxDamageTakenSingleHit > maxSingleHitSeen) maxSingleHitSeen = res.maxDamageTakenSingleHit;
    if (res.oneShotOccurred) oneShots++;
    totalPotions += res.potionsUsed;
    totalWinsClash += res.playerClashesWon;
    totalTiesClash += res.playerClashesTied;
    totalLossesClash += res.playerClashesLost;
    totalFeints += res.feintsTriggered;
    totalParries += res.parriesTriggered;
    totalDmgDealt += res.totalDamageDealt;
    totalDmgTaken += res.totalDamageTaken;
  }

  const winRate = ((wins / runs) * 100).toFixed(1);
  const avgTurns = (totalTurns / runs).toFixed(1);
  const avgHpRemaining = (totalHpRemainingPct / runs).toFixed(1);
  const avgPotions = (totalPotions / runs).toFixed(2);
  const totalClashes = totalWinsClash + totalTiesClash + totalLossesClash;
  const winClashPct = totalClashes > 0 ? ((totalWinsClash / totalClashes) * 100).toFixed(1) : '0';
  const tieClashPct = totalClashes > 0 ? ((totalTiesClash / totalClashes) * 100).toFixed(1) : '0';
  const loseClashPct = totalClashes > 0 ? ((totalLossesClash / totalClashes) * 100).toFixed(1) : '0';
  const feintRate = totalLossesClash > 0 ? ((totalFeints / totalLossesClash) * 100).toFixed(1) : '0';
  const parryPerFight = (totalParries / runs).toFixed(2);
  const maxHitVsPlayerHpPct = ((maxSingleHitSeen / playerStats.maxHp) * 100).toFixed(1);

  return {
    level,
    rarity: monsterRarity,
    playstyle,
    gearQuality,
    runs,
    playerHp: playerStats.maxHp,
    playerDamage: playerStats.damage,
    playerArmor: playerStats.armor,
    quickReaction: playerStats.attackSpeed || 0,
    winRate: `${winRate}%`,
    avgTurns,
    avgHpRemaining: `${avgHpRemaining}%`,
    avgPotions,
    maxHitVsPlayerHpPct: `${maxHitVsPlayerHpPct}%`,
    maxSingleHitSeen,
    oneShots,
    clashBreakdown: `W:${winClashPct}% / T:${tieClashPct}% / L:${loseClashPct}%`,
    feintRate: `${feintRate}%`,
    parryPerFight
  };
}

// ============================================================================
// SUITE 1: PLAYSTYLE COMPARISON ACROSS LEVELS (OPTIMAL vs CASUAL vs BLIND vs WORST)
// ============================================================================
console.log("📊 SUITE 1: COMPARACIÓN DE PLAYSTYLES EN LA TRÍADA (COMMON MONSTERS)");
console.log("--------------------------------------------------------------------------------");
const levelsToTest = [1, 5, 10, 20, 30, 50];
const playstylesToCompare: Playstyle[] = [
  'OPTIMAL_TACTICIAN',
  'CASUAL_ADAPTIVE',
  'RANDOM_BLIND',
  'WORST_COUNTERED'
];

const suite1Results: any[] = [];
for (const lvl of levelsToTest) {
  for (const style of playstylesToCompare) {
    const res = runSimulationBatch(lvl, MonsterRarity.COMMON, style, 'STANDARD', 250);
    suite1Results.push(res);
    console.log(
      `Lvl ${lvl.toString().padStart(2)} | ${style.padEnd(17)} | WinRate: ${res.winRate.padStart(6)} | TTK: ${res.avgTurns.padStart(4)}t | HP Rem: ${res.avgHpRemaining.padStart(5)} | Pots: ${res.avgPotions} | MaxHit/HP: ${res.maxHitVsPlayerHpPct.padStart(5)} | Feint: ${res.feintRate.padStart(5)} | Parries: ${res.parryPerFight}`
    );
  }
  console.log("--------------------------------------------------------------------------------");
}

// ============================================================================
// SUITE 2: RARITY PROGRESSION & BOSS PRESSURE (COMMON -> UNCOMMON -> RARE -> EPIC -> MYTHIC -> UNIQUE)
// ============================================================================
console.log("\n👑 SUITE 2: ESCALADO DE RAREZAS DE MONSTRUOS Y JEFES (LEVEL 15, STANDARD GEAR)");
console.log("--------------------------------------------------------------------------------");
const raritiesToTest = [
  MonsterRarity.COMMON,
  MonsterRarity.UNCOMMON,
  MonsterRarity.RARE,
  MonsterRarity.EPIC,
  MonsterRarity.MYTHIC,
  MonsterRarity.UNIQUE
];

const suite2Results: any[] = [];
for (const rar of raritiesToTest) {
  for (const style of ['OPTIMAL_TACTICIAN', 'CASUAL_ADAPTIVE', 'RANDOM_BLIND'] as Playstyle[]) {
    const res = runSimulationBatch(15, rar, style, 'STANDARD', 250);
    suite2Results.push(res);
    console.log(
      `${rar.padEnd(8)} | ${style.padEnd(17)} | WinRate: ${res.winRate.padStart(6)} | TTK: ${res.avgTurns.padStart(4)}t | HP Rem: ${res.avgHpRemaining.padStart(5)} | Pots: ${res.avgPotions} | MaxHit/HP: ${res.maxHitVsPlayerHpPct.padStart(5)}`
    );
  }
  console.log("--------------------------------------------------------------------------------");
}

// ============================================================================
// SUITE 3: GEAR QUALITY IMPACT (UNDERGEARED vs STANDARD vs WELL-GEARED AT LEVEL 25)
// ============================================================================
console.log("\n🛡️ SUITE 3: SENSIBILIDAD DEL SISTEMA AL EQUIPAMIENTO (LEVEL 25 vs RARE ENEMY)");
console.log("--------------------------------------------------------------------------------");
const gearQualities: ('UNDERGEARED' | 'STANDARD' | 'WELL_GEARED')[] = ['UNDERGEARED', 'STANDARD', 'WELL_GEARED'];
const suite3Results: any[] = [];
for (const gear of gearQualities) {
  for (const style of ['OPTIMAL_TACTICIAN', 'RANDOM_BLIND'] as Playstyle[]) {
    const res = runSimulationBatch(25, MonsterRarity.RARE, style, gear, 250);
    suite3Results.push(res);
    console.log(
      `${gear.padEnd(12)} | ${style.padEnd(17)} | Player HP: ${res.playerHp} | Dmg: ${res.playerDamage} | Arm: ${res.playerArmor} | WinRate: ${res.winRate.padStart(6)} | TTK: ${res.avgTurns}t | HP Rem: ${res.avgHpRemaining} | Pots: ${res.avgPotions}`
    );
  }
}

// ============================================================================
// SUITE 4: EXTREME CHECK: ONE-SHOT AND INFLATION RESISTANCE UP TO LEVEL 60
// ============================================================================
console.log("\n🚀 SUITE 4: VERIFICACIÓN DE RESISTENCIA A ONE-SHOT E INFLACIÓN (LEVEL 1 A 60)");
console.log("--------------------------------------------------------------------------------");
const extremeLevels = [1, 5, 10, 20, 30, 40, 50, 60];
const suite4Results: any[] = [];
for (const lvl of extremeLevels) {
  const common = runSimulationBatch(lvl, MonsterRarity.COMMON, 'OPTIMAL_TACTICIAN', 'STANDARD', 200);
  const boss = runSimulationBatch(lvl, MonsterRarity.UNIQUE, 'OPTIMAL_TACTICIAN', 'STANDARD', 200);
  suite4Results.push({ lvl, common, boss });
  console.log(
    `Lvl ${lvl.toString().padStart(2)} | Common TTK: ${common.avgTurns.padStart(4)}t (MaxHit: ${common.maxHitVsPlayerHpPct.padStart(5)}) | Boss TTK: ${boss.avgTurns.padStart(4)}t (WinRate: ${boss.winRate.padStart(6)}, MaxHit: ${boss.maxHitVsPlayerHpPct.padStart(5)}, OneShots: ${boss.oneShots})`
  );
}

console.log("\n================================================================================");
console.log("✅ PLAYTEST FINALIZADO CON ÉXITO");
console.log("================================================================================");
