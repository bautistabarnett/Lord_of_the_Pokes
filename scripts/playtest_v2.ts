import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap 
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats } from '../services/gameLogic';

interface PlaytestReport {
  lootResults: any;
  stanceComparison: any;
  bossEncounters: any;
  progressionRun: any;
}

console.log("=================================================");
console.log("🎮 INICIANDO PLAYTEST COMPLETO: LORD OF THE DUNGEON (V2)");
console.log("=================================================\n");

// ============================================================================
// 1. PLAYTEST DE BOTÍN Y ECONOMÍA
// ============================================================================
console.log("📦 1. Playtest de Economía de Botín y Probabilidades de Caída...");

const testLootDistribution = (iterations: number, magicFind: number) => {
  const counts: Record<Rarity, number> = {
    [Rarity.COMMON]: 0,
    [Rarity.MAGIC]: 0,
    [Rarity.RARE]: 0,
    [Rarity.UNIQUE]: 0,
  };

  let generatedCount = 0;
  const statSamplesLevel10: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Generate drop with forced drop = true
    const item = generateLoot(10, 1, magicFind, undefined);
    if (!item) continue;
    generatedCount++;
    counts[item.rarity]++;

    if (item.level === 10) {
      item.stats.forEach(st => {
        if ([StatType.STRENGTH, StatType.DEXTERITY, StatType.INTELLIGENCE, StatType.VITALITY].includes(st.type)) {
          statSamplesLevel10.push(st.value);
        }
      });
    }
  }

  const rates = {
    totalItems: generatedCount,
    commonPct: ((counts[Rarity.COMMON] / generatedCount) * 100).toFixed(2) + '%',
    magicPct: ((counts[Rarity.MAGIC] / generatedCount) * 100).toFixed(2) + '%',
    rarePct: ((counts[Rarity.RARE] / generatedCount) * 100).toFixed(2) + '%',
    uniquePct: ((counts[Rarity.UNIQUE] / generatedCount) * 100).toFixed(2) + '%',
    avgPrimaryStatLvl10: statSamplesLevel10.length > 0 
      ? (statSamplesLevel10.reduce((a, b) => a + b, 0) / statSamplesLevel10.length).toFixed(1)
      : 'N/A',
    minPrimaryStatLvl10: statSamplesLevel10.length > 0 ? Math.min(...statSamplesLevel10) : 'N/A',
    maxPrimaryStatLvl10: statSamplesLevel10.length > 0 ? Math.max(...statSamplesLevel10) : 'N/A',
  };

  return { counts, rates };
};

const loot0MF = testLootDistribution(3000, 0);
const loot50MF = testLootDistribution(3000, 50);
const loot150MF = testLootDistribution(3000, 150);
const loot300MF = testLootDistribution(3000, 300);

console.log("   • 0 MF:  ", loot0MF.rates);
console.log("   • 50 MF: ", loot50MF.rates);
console.log("   • 150 MF:", loot150MF.rates);
console.log("   • 300 MF:", loot300MF.rates);

// ============================================================================
// 2. PLAYTEST DE COMBATE: EVALUACIÓN DE ESTRATEGIAS DE POSTURA
// ============================================================================
console.log("\n⚔️ 2. Playtest de Combate y Efectividad de Posturas...");

type StrategyType = 'TACTICAL_OPTIMAL' | 'RANDOM_STANCE' | 'STATIC_TEMPLE' | 'POOR_PLAY';

interface BattleResult {
  won: boolean;
  turns: number;
  playerHpRemaining: number;
  damageDealt: number;
  damageTaken: number;
  clashesWon: number;
  clashesLost: number;
  clashesTied: number;
}

const simulateV2Combat = (
  playerLevel: number, 
  monsterRarity: MonsterRarity, 
  strategy: StrategyType,
  equippedItemsCount: number = 6
): BattleResult => {
  // Generate Player Stats
  const baseAttr: BaseAttributes = {
    strength: BALANCE.STATS.base.strength + (playerLevel - 1) * 2,
    dexterity: BALANCE.STATS.base.dexterity + (playerLevel - 1) * 2,
    intelligence: BALANCE.STATS.base.intelligence + (playerLevel - 1) * 1,
    vitality: BALANCE.STATS.base.vitality + (playerLevel - 1) * 2,
  };
  const equipMap: EquipmentMap = {};
  // Equip baseline items
  for (let i = 0; i < equippedItemsCount; i++) {
    const it = generateLoot(playerLevel, 1, 0, Rarity.MAGIC);
    if (it) equipMap[it.slot] = it;
  }
  const playerStats = calculatePlayerStats(baseAttr, equipMap, [], playerLevel, 0);
  let playerHp = playerStats.maxHp;
  let playerPotions = 2;

  // Generate Monster
  const monster = generateMonster(playerLevel, 1, monsterRarity);
  let monsterHp = monster.maxHp;

  let turn = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let clashesWon = 0;
  let clashesLost = 0;
  let clashesTied = 0;

  let currentEnemyStance = monster.currentStance || CombatStance.RESOLVE;
  let isEnemyStanceHidden = monster.isStanceHidden || false;

  const stances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE];

  while (playerHp > 0 && monsterHp > 0 && turn < 60) {
    turn++;

    // --- PLAYER ACTION ---
    let playerChoice: CombatStance;

    if (strategy === 'TACTICAL_OPTIMAL') {
      if (!isEnemyStanceHidden) {
        // Counter visible enemy stance (Pick stance that beats enemy)
        if (currentEnemyStance === CombatStance.SPIRIT) playerChoice = CombatStance.WILL;
        else if (currentEnemyStance === CombatStance.RESOLVE) playerChoice = CombatStance.SPIRIT;
        else playerChoice = CombatStance.RESOLVE;
      } else {
        // Deduce based on monster primary attributes
        if (monster.strength >= monster.intelligence && monster.strength >= monster.dexterity) {
          // Monster likely favors Will -> Counter with Resolve
          playerChoice = CombatStance.RESOLVE;
        } else if (monster.intelligence >= monster.strength && monster.intelligence >= monster.dexterity) {
          // Monster likely favors Spirit -> Counter with Will
          playerChoice = CombatStance.WILL;
        } else {
          // Monster likely favors Resolve -> Counter with Spirit
          playerChoice = CombatStance.SPIRIT;
        }
      }
    } else if (strategy === 'RANDOM_STANCE') {
      playerChoice = stances[Math.floor(Math.random() * stances.length)];
    } else if (strategy === 'STATIC_TEMPLE') {
      playerChoice = CombatStance.RESOLVE;
    } else {
      // Poor play: pick weak to enemy
      if (currentEnemyStance === CombatStance.WILL) playerChoice = CombatStance.SPIRIT;
      else if (currentEnemyStance === CombatStance.SPIRIT) playerChoice = CombatStance.RESOLVE;
      else playerChoice = CombatStance.WILL;
    }

    // Resolve Player Attack Clash
    const playerClash = resolveTriadClash(playerChoice, currentEnemyStance);
    if (playerClash === 'WIN') clashesWon++;
    else if (playerClash === 'LOSE') clashesLost++;
    else clashesTied++;

    let playerDamage = playerStats.damage;
    if (playerClash === 'WIN') playerDamage *= BALANCE.COMBAT.triadConfig.winDamageMult;
    else if (playerClash === 'LOSE') playerDamage *= BALANCE.COMBAT.triadConfig.loseDamageMult;

    const monsterMitigation = BALANCE.COMBAT.calculateMitigationPercent(monster.armor, monster.level);
    const netPlayerDmg = Math.max(1, Math.floor(playerDamage * (1 - monsterMitigation)));
    monsterHp -= netPlayerDmg;
    damageDealt += netPlayerDmg;

    if (monsterHp <= 0) break;

    // --- ENEMY ACTION ---
    const enemyClash = resolveTriadClash(currentEnemyStance, playerChoice);
    let baseMitigation = BALANCE.COMBAT.calculateMitigationPercent(playerStats.armor, playerStats.level);
    let effectiveMitigation = baseMitigation;

    if (enemyClash === 'WIN') {
      effectiveMitigation = Math.max(0, baseMitigation - BALANCE.COMBAT.triadConfig.loseDefensePenaltyBonus);
    } else if (enemyClash === 'LOSE') {
      effectiveMitigation = Math.min(0.85, baseMitigation + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus);
    }

    const enemyRawDmg = monster.damage * (0.85 + Math.random() * 0.3);
    const netEnemyDmg = Math.max(1, Math.floor(enemyRawDmg * (1 - effectiveMitigation)));
    playerHp -= netEnemyDmg;
    damageTaken += netEnemyDmg;

    // Standard battle potions (2 charges per battle restoring 35% HP)
    if (playerHp > 0 && playerHp < playerStats.maxHp * 0.35 && playerPotions > 0) {
      playerPotions--;
      playerHp = Math.min(playerStats.maxHp, playerHp + Math.floor(playerStats.maxHp * 0.35));
    }

    // Monster stance rotation post-turn (45% pick between other 2 stances)
    if (Math.random() < 0.45) {
      const otherStances = stances.filter(s => s !== currentEnemyStance);
      currentEnemyStance = otherStances[Math.floor(Math.random() * otherStances.length)];
    }
  }

  return {
    won: playerHp > 0,
    turns: turn,
    playerHpRemaining: Math.max(0, playerHp),
    damageDealt,
    damageTaken,
    clashesWon,
    clashesLost,
    clashesTied,
  };
};

const runStrategyBenchmark = (strategy: StrategyType, rarity: MonsterRarity, battles: number = 200) => {
  let wins = 0;
  let totalTurns = 0;
  let totalHpRemaining = 0;
  let totalDmgTaken = 0;
  let totalClashWins = 0;
  let totalClashLosses = 0;

  for (let i = 0; i < battles; i++) {
    const res = simulateV2Combat(5, rarity, strategy);
    if (res.won) wins++;
    totalTurns += res.turns;
    totalHpRemaining += res.playerHpRemaining;
    totalDmgTaken += res.damageTaken;
    totalClashWins += res.clashesWon;
    totalClashLosses += res.clashesLost;
  }

  const winRate = ((wins / battles) * 100).toFixed(1) + '%';
  const avgTurns = (totalTurns / battles).toFixed(1);
  const avgHpRem = (totalHpRemaining / battles).toFixed(0);
  const avgDmgTaken = (totalDmgTaken / battles).toFixed(0);
  const clashWinRatio = ((totalClashWins / (totalClashWins + totalClashLosses || 1)) * 100).toFixed(1) + '%';

  return { winRate, avgTurns, avgHpRem, avgDmgTaken, clashWinRatio };
};

console.log("\n   📊 Combates contra Monstruos Normales (Level 5):");
console.log("   • Estrategia Óptima (Contragolpe):  ", runStrategyBenchmark('TACTICAL_OPTIMAL', MonsterRarity.COMMON));
console.log("   • Estrategia Aleatoria (Casual):     ", runStrategyBenchmark('RANDOM_STANCE', MonsterRarity.COMMON));
console.log("   • Estrategia Estática (Siempre Temple):", runStrategyBenchmark('STATIC_TEMPLE', MonsterRarity.COMMON));
console.log("   • Estrategia Desfavorable (Error):   ", runStrategyBenchmark('POOR_PLAY', MonsterRarity.COMMON));

console.log("\n   👹 Combates contra Élites (Level 5, 40% postura oculta):");
console.log("   • Estrategia Óptima (Con Deducción):", runStrategyBenchmark('TACTICAL_OPTIMAL', MonsterRarity.RARE));
console.log("   • Estrategia Aleatoria:             ", runStrategyBenchmark('RANDOM_STANCE', MonsterRarity.RARE));
console.log("   • Estrategia Estática:              ", runStrategyBenchmark('STATIC_TEMPLE', MonsterRarity.RARE));

console.log("\n   👑 Combates contra Jefes Únicos (Level 5, 60% postura oculta):");
console.log("   • Estrategia Óptima (Con Deducción):", runStrategyBenchmark('TACTICAL_OPTIMAL', MonsterRarity.UNIQUE));
console.log("   • Estrategia Aleatoria:             ", runStrategyBenchmark('RANDOM_STANCE', MonsterRarity.UNIQUE));
console.log("   • Estrategia Estática:              ", runStrategyBenchmark('STATIC_TEMPLE', MonsterRarity.UNIQUE));

// ============================================================================
// 3. PLAYTEST DE PROGRESIÓN (MAZMORRA DE 5 HABITACIONES)
// ============================================================================
console.log("\n🏰 3. Playtest de Progresión de Mazmorra (Run de Nivel 1 a Jefe Nivel 3)...");

const simulateDungeonRun = () => {
  let heroLevel = 1;
  let heroXp = 0;
  let potions = 2;
  const inventory: Item[] = [];
  const equipped: EquipmentMap = {};

  let heroBaseAttr: BaseAttributes = {
    strength: BALANCE.STATS.base.strength,
    dexterity: BALANCE.STATS.base.dexterity,
    intelligence: BALANCE.STATS.base.intelligence,
    vitality: BALANCE.STATS.base.vitality
  };

  const logEvents: string[] = [];
  let roomsCleared = 0;
  let survived = true;

  // 5 Rooms: Room 1-3 Common, Room 4 Elite, Room 5 Boss
  const roomConfig = [
    { room: 1, rarity: MonsterRarity.COMMON, lvl: 1 },
    { room: 2, rarity: MonsterRarity.COMMON, lvl: 1 },
    { room: 3, rarity: MonsterRarity.COMMON, lvl: 2 },
    { room: 4, rarity: MonsterRarity.RARE, lvl: 2 },
    { room: 5, rarity: MonsterRarity.UNIQUE, lvl: 3 }
  ];

  let currentHp = 0;

  for (const encounter of roomConfig) {
    const heroStats = calculatePlayerStats(heroBaseAttr, equipped, [], heroLevel, 0);
    const monster = generateMonster(encounter.lvl, 1, encounter.rarity);
    let monsterHp = monster.maxHp;
    let enemyStance = monster.currentStance || CombatStance.RESOLVE;
    currentHp = heroStats.maxHp;
    potions = 2;

    let turns = 0;
    while (currentHp > 0 && monsterHp > 0 && turns < 50) {
      turns++;

      // Optimal counter choice with deduction
      let pChoice: CombatStance;
      if (!monster.isStanceHidden) {
        if (enemyStance === CombatStance.SPIRIT) pChoice = CombatStance.WILL;
        else if (enemyStance === CombatStance.RESOLVE) pChoice = CombatStance.SPIRIT;
        else pChoice = CombatStance.RESOLVE;
      } else {
        pChoice = monster.strength >= monster.intelligence ? CombatStance.RESOLVE : CombatStance.WILL;
      }

      // Clash
      const pClash = resolveTriadClash(pChoice, enemyStance);
      let pDmg = heroStats.damage * (pClash === 'WIN' ? 1.35 : pClash === 'LOSE' ? 0.60 : 1.0);
      const mMit = BALANCE.COMBAT.calculateMitigationPercent(monster.armor, monster.level);
      const netDmg = Math.max(1, Math.floor(pDmg * (1 - mMit)));
      monsterHp -= netDmg;

      if (monsterHp <= 0) break;

      // Enemy hit
      const eClash = resolveTriadClash(enemyStance, pChoice);
      let hMit = BALANCE.COMBAT.calculateMitigationPercent(heroStats.armor, heroLevel);
      if (eClash === 'WIN') hMit = Math.max(0, hMit - 0.15);
      else if (eClash === 'LOSE') hMit = Math.min(0.85, hMit + 0.20);

      const netEnemy = Math.max(1, Math.floor(monster.damage * (1 - hMit)));
      currentHp -= netEnemy;

      // Use potion if below 35%
      if (currentHp < heroStats.maxHp * 0.35 && potions > 0) {
        potions--;
        currentHp = Math.min(heroStats.maxHp, currentHp + Math.floor(heroStats.maxHp * 0.35));
      }

      // Rotate monster stance
      if (Math.random() < 0.45) {
        const others = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE].filter(s => s !== enemyStance);
        enemyStance = others[Math.floor(Math.random() * others.length)];
      }
    }

    if (currentHp <= 0) {
      survived = false;
      logEvents.push(`💀 Héroe cayó en Habitación ${encounter.room} contra ${monster.name} (${encounter.rarity})`);
      break;
    }

    roomsCleared++;
    // Loot drop
    const drop = generateLoot(encounter.lvl, 1, 0);
    if (drop) {
      inventory.push(drop);
      // Auto-equip if slot empty or better
      const currentEquip = equipped[drop.slot];
      if (!currentEquip) {
        equipped[drop.slot] = drop;
        logEvents.push(`🎁 Habitación ${encounter.room}: Obtenido y equipado [${drop.rarity}] ${drop.name}`);
      } else {
        logEvents.push(`📦 Habitación ${encounter.room}: Obtenido [${drop.rarity}] ${drop.name}`);
      }
    }

    // XP & Level up check
    heroXp += 40 * encounter.lvl;
    if (heroXp >= 100 && heroLevel === 1) {
      heroLevel = 2;
      heroBaseAttr.strength += 2;
      heroBaseAttr.vitality += 2;
      logEvents.push(`⭐ ¡Subida a Nivel 2!`);
    } else if (heroXp >= 250 && heroLevel === 2) {
      heroLevel = 3;
      heroBaseAttr.strength += 2;
      heroBaseAttr.vitality += 2;
      logEvents.push(`⭐ ¡Subida a Nivel 3!`);
    }
  }

  return { survived, roomsCleared, finalHp: Math.max(0, currentHp), potionsRemaining: potions, itemsFound: inventory.length, logEvents };
};

const runSimulationsBatch = (count: number = 100) => {
  let completedRuns = 0;
  let totalRooms = 0;
  let itemsTotal = 0;

  for (let i = 0; i < count; i++) {
    const res = simulateDungeonRun();
    if (res.survived) completedRuns++;
    totalRooms += res.roomsCleared;
    itemsTotal += res.itemsFound;
  }

  return {
    completionRate: ((completedRuns / count) * 100).toFixed(1) + '%',
    avgRoomsCleared: (totalRooms / count).toFixed(2) + ' / 5',
    avgItemsPerRun: (itemsTotal / count).toFixed(1)
  };
};

const dungeonBenchmark = runSimulationsBatch(100);
console.log("   • Rendimiento en Mazmorra (100 Runs):", dungeonBenchmark);

const sampleRun = simulateDungeonRun();
console.log("\n   📜 Ejemplo de Run Detallada:", sampleRun.survived ? 'VICTORIA COMPLETA' : 'DERROTA');
sampleRun.logEvents.forEach(e => console.log("      " + e));

console.log("\n=================================================");
console.log("🏁 PLAYTEST COMPLETADO CON ÉXITO");
console.log("=================================================");
