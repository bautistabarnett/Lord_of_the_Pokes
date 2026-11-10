import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap, PlayerStats 
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats } from '../services/gameLogic';
import { createPlayerForLevel, Playstyle } from './playtest_triad_and_progression';

console.log("================================================================================");
console.log("🔍 AUDITORÍA DE SOBREPOTENCIA: TRÍADA vs GEAR STATS Y PROPUESTAS DE CALIBRACIÓN");
console.log("================================================================================\n");

// Test a battle under modified balance rules
function simulateBattleWithRules(
  playerStats: PlayerStats,
  monster: Monster,
  playstyle: Playstyle,
  rules: {
    playerLoseDmgMult: number;     // Current: 0.60 -> Proposed: 0.45
    enemyWinDmgMult: number;       // Current: 1.00 -> Proposed: 1.35 (symmetric with player!)
    enemyWinMitPenalty: number;    // Current: 0.15 -> Proposed: 0.20
    monsterArmorMult: number;      // Current: 1.0 -> Proposed: 1.8
    monsterHpMult: number;         // Current: 1.0 -> Proposed: 1.35
  }
) {
  let playerHp = playerStats.maxHp;
  let monsterHp = Math.floor(monster.maxHp * rules.monsterHpMult);
  const effectiveMonsterArmor = Math.floor(monster.armor * rules.monsterArmorMult);
  let playerPotions = 2;

  let turns = 0;
  let playerClashesWon = 0;
  let playerClashesLost = 0;
  let currentEnemyStance = monster.currentStance || CombatStance.RESOLVE;
  const allStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE];

  const getCounter = (s: CombatStance) => s === CombatStance.SPIRIT ? CombatStance.WILL : s === CombatStance.RESOLVE ? CombatStance.SPIRIT : CombatStance.RESOLVE;
  const getWeakTo = (s: CombatStance) => s === CombatStance.WILL ? CombatStance.SPIRIT : s === CombatStance.SPIRIT ? CombatStance.RESOLVE : CombatStance.WILL;

  while (playerHp > 0 && monsterHp > 0 && turns < 60) {
    turns++;

    // 1. PLAYER TURN
    let playerChoice: CombatStance;
    if (playstyle === 'OPTIMAL_TACTICIAN') {
      playerChoice = getCounter(currentEnemyStance);
    } else if (playstyle === 'RANDOM_BLIND') {
      playerChoice = allStances[Math.floor(Math.random() * allStances.length)];
    } else {
      playerChoice = getWeakTo(currentEnemyStance);
    }

    const playerClash = resolveTriadClash(playerChoice, currentEnemyStance);
    let rawDmg = playerStats.damage * (0.85 + Math.random() * 0.3);

    if (playerClash === 'WIN') {
      playerClashesWon++;
      rawDmg *= BALANCE.COMBAT.triadConfig.winDamageMult; // 1.35
    } else if (playerClash === 'LOSE') {
      playerClashesLost++;
      // Feint check
      const feintChance = Math.min(35, (playerStats.attackSpeed || 0) * 0.6);
      if (!(feintChance > 0 && Math.random() * 100 < feintChance)) {
        rawDmg *= rules.playerLoseDmgMult;
      }
    }

    const mMit = BALANCE.COMBAT.calculateMitigationPercent(effectiveMonsterArmor, monster.level);
    const netPlayerDmg = Math.max(1, Math.floor(rawDmg * (1 - mMit)));
    monsterHp -= netPlayerDmg;

    if (monsterHp <= 0) break;

    // 2. ENEMY TURN
    let rawEnemyDmg = monster.damage * (0.85 + Math.random() * 0.3);
    const enemyClash = resolveTriadClash(currentEnemyStance, playerChoice);

    if (enemyClash === 'WIN') {
      rawEnemyDmg *= rules.enemyWinDmgMult;
    }

    const baseMit = BALANCE.COMBAT.calculateMitigationPercent(playerStats.armor, playerStats.level);
    let finalMit = baseMit;
    if (enemyClash === 'WIN') {
      finalMit = Math.max(0, baseMit - rules.enemyWinMitPenalty);
    } else if (enemyClash === 'LOSE') {
      finalMit = Math.min(0.85, baseMit + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus);
    }

    let netEnemyDmg = Math.max(1, Math.floor(rawEnemyDmg * (1 - finalMit)));

    // Parry check
    const parryChance = Math.min(50, (playerStats.attackSpeed || 0) * 1.0);
    if (parryChance > 0 && Math.random() * 100 < parryChance) {
      netEnemyDmg = Math.max(1, Math.floor(netEnemyDmg * 0.65));
    }

    playerHp -= netEnemyDmg;

    // Potion check
    if (playerHp > 0 && playerHp < playerStats.maxHp * 0.35 && playerPotions > 0) {
      playerPotions--;
      playerHp = Math.min(playerStats.maxHp, playerHp + Math.floor(playerStats.maxHp * 0.35));
    }

    // Stance rotation
    if (Math.random() < 0.45) {
      const other = allStances.filter(s => s !== currentEnemyStance);
      currentEnemyStance = other[Math.floor(Math.random() * other.length)];
    }
  }

  return { won: playerHp > 0, turns, playerHpPct: Math.round((Math.max(0, playerHp) / playerStats.maxHp) * 100) };
}

// Compare current vs proposed rules
const currentRules = {
  playerLoseDmgMult: 0.60,
  enemyWinDmgMult: 1.00,
  enemyWinMitPenalty: 0.15,
  monsterArmorMult: 1.0,
  monsterHpMult: 1.0
};

const proposedRulesA = {
  // Option A: Symmetric Triad for Monster (+35% dmg when monster counters player) & sharper lose mult (0.50x)
  playerLoseDmgMult: 0.50,
  enemyWinDmgMult: 1.35,
  enemyWinMitPenalty: 0.15,
  monsterArmorMult: 1.25,
  monsterHpMult: 1.20
};

const proposedRulesB = {
  // Option B: High-Stakes Triad (0.40x on lose, 1.40x on enemy win, robust monster armor)
  playerLoseDmgMult: 0.40,
  enemyWinDmgMult: 1.40,
  enemyWinMitPenalty: 0.20,
  monsterArmorMult: 1.50,
  monsterHpMult: 1.30
};

const testLevels = [15, 25, 40];
const targetRarities = [MonsterRarity.RARE, MonsterRarity.EPIC, MonsterRarity.UNIQUE];

console.log("--------------------------------------------------------------------------------");
console.log("EVALUACIÓN COMPARATIVA: SISTEMA ACTUAL vs REGLAS OPTIMIZADAS");
console.log("--------------------------------------------------------------------------------\n");

for (const lvl of testLevels) {
  for (const rar of targetRarities) {
    console.log(`⚔️ NIVEL ${lvl} vs ${rar.toUpperCase()}:`);
    const pWell = createPlayerForLevel(lvl, 'WELL_GEARED');

    const testScenario = (ruleName: string, rules: any) => {
      let optWins = 0, rndWins = 0, wstWins = 0;
      let optHp = 0, rndHp = 0, wstHp = 0;
      let optTtk = 0, rndTtk = 0, wstTtk = 0;
      const runs = 200;

      for (let i = 0; i < runs; i++) {
        const m = generateMonster(lvl, 1.0);
        m.rarity = rar;
        const cfg = BALANCE.MONSTER.rarityConfig[rar];
        const baseAttr = Math.floor(10 + (lvl * 2));
        m.strength = Math.floor(baseAttr * cfg.statMult);
        m.vitality = Math.floor(baseAttr * cfg.statMult);
        m.dexterity = Math.floor(baseAttr * cfg.statMult);
        m.maxHp = Math.floor((m.vitality * 8) + (lvl * 20));
        m.damage = Math.floor((m.strength * 0.6) + (lvl * 3));
        m.armor = Math.floor((m.dexterity * 0.5) + (lvl * 2));
        if (rar === MonsterRarity.UNIQUE) { m.maxHp *= 2; }

        const rOpt = simulateBattleWithRules(pWell.stats, m, 'OPTIMAL_TACTICIAN', rules);
        const rRnd = simulateBattleWithRules(pWell.stats, m, 'RANDOM_BLIND', rules);
        const rWst = simulateBattleWithRules(pWell.stats, m, 'WORST_COUNTERED', rules);

        if (rOpt.won) { optWins++; optHp += rOpt.playerHpPct; optTtk += rOpt.turns; }
        if (rRnd.won) { rndWins++; rndHp += rRnd.playerHpPct; rndTtk += rRnd.turns; }
        if (rWst.won) { wstWins++; wstHp += rWst.playerHpPct; wstTtk += rWst.turns; }
      }

      const optRate = ((optWins / runs) * 100).toFixed(1) + '%';
      const rndRate = ((rndWins / runs) * 100).toFixed(1) + '%';
      const wstRate = ((wstWins / runs) * 100).toFixed(1) + '%';
      const optAvgHp = optWins > 0 ? (optHp / optWins).toFixed(0) + '%' : '0%';
      const rndAvgHp = rndWins > 0 ? (rndHp / rndWins).toFixed(0) + '%' : '0%';
      const wstAvgHp = wstWins > 0 ? (wstHp / wstWins).toFixed(0) + '%' : '0%';

      console.log(`   [${ruleName.padEnd(14)}] Óptimo: ${optRate.padStart(6)} (HP: ${optAvgHp.padStart(4)}) | Random: ${rndRate.padStart(6)} (HP: ${rndAvgHp.padStart(4)}) | Peor: ${wstRate.padStart(6)} (HP: ${wstAvgHp.padStart(4)})`);
    };

    testScenario("Actual", currentRules);
    testScenario("Propuesta A", proposedRulesA);
    testScenario("Propuesta B", proposedRulesB);
    console.log("");
  }
}
