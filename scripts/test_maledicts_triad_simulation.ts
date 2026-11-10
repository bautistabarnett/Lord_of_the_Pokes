import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap, PlayerStats, MaledictAffix
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats } from '../services/gameLogic';
import { createPlayerForLevel, Playstyle } from './playtest_triad_and_progression';

console.log("================================================================================");
console.log("🔮 EVALUACIÓN DE MALEDICTS ACTUALES vs MALEDICTS SINTONIZADOS CON LA TRÍADA");
console.log("================================================================================\n");

// Definition of New Triad-Synergized Maledicts:
export const EXPANDED_TRIAD_MALEDICTS: MaledictAffix[] = [
  // 1. Existing Classics (Evaluated)
  { id: 'vampiric', name: 'Vampiric', category: 'TRAIT', description: 'Heals 50% of damage dealt.', icon: '🩸', statModifiers: { [StatType.LIFE_STEAL]: 50 } },
  { id: 'thorns', name: 'Iron Maiden', category: 'TRAIT', description: 'Reflects 30% of damage received.', icon: '🌵', statModifiers: { [StatType.THORNS]: 30 } },
  { id: 'molten', name: 'Molten', category: 'TRAIT', description: 'Hitting this enemy applies Burn.', icon: '🔥', statModifiers: {}, trigger: 'onTakeDamage', triggerEffect: { type: 'debuff_player', chance: 0.5, value: 0.05 } },
  { id: 'arcane', name: 'Arcane Shield', category: 'INFAMY', description: 'Nullifies first hit.', icon: '✨', statModifiers: { [StatType.INTELLIGENCE]: 30, [StatType.ARMOR]: 50 }, trigger: 'onStartTurn' },
  { id: 'executioner', name: 'Executioner', category: 'TRAIT', description: 'Double damage if hero < 30% HP.', icon: '🪓', statModifiers: { [StatType.CRIT_CHANCE]: 20 } },
  { id: 'plague', name: 'Plaguebearer', category: 'TRAIT', description: 'Radiates Poison cloud.', icon: '🤢', statModifiers: { [StatType.VITALITY]: 40 }, trigger: 'onStartTurn', triggerEffect: { type: 'ground_hazard', chance: 1.0, value: 0.03 } },

  // 2. NEW TRIAD-TUNED MALEDICTS (Addressing Punto 1, 2, 3)
  // Punto 1: Simetría ofensiva / Contragolpe implacable
  {
    id: 'predator',
    name: 'Predator (Depredador)',
    category: 'INFAMY',
    description: 'When enemy stance beats hero, deals +50% damage and punctures armor.',
    icon: '🐅',
    statModifiers: { [StatType.DAMAGE]: 15 }
  },
  // Punto 2: Fortaleza impenetrable ante posturas erróneas
  {
    id: 'bulwark',
    name: 'Rune Bulwark (Baluarte Rúnico)',
    category: 'INFAMY',
    description: 'Attacking this monster in stance disadvantage reduces hero damage by 75% instead of 40%.',
    icon: '🛡️',
    statModifiers: { [StatType.ARMOR]: 40 }
  },
  // Punto 3: Coraza adaptable contra daño masivo
  {
    id: 'adamantine',
    name: 'Adamantine Shell (Coraza Adamantina)',
    category: 'INFAMY',
    description: 'Increases armor by 80%. Stance victory (WIN) fractures this shell, stripping 50% armor.',
    icon: '💎',
    statModifiers: { [StatType.ARMOR]: 80, [StatType.VITALITY]: 25 }
  },
  // Extra: Duelo mental de postura
  {
    id: 'mirage',
    name: 'Mirage Stance (Espejismo)',
    category: 'INFAMY',
    description: 'Hides monster stance completely and changes stance after being countered.',
    icon: '🎭',
    statModifiers: { [StatType.DODGE_CHANCE]: 10 }
  }
];

function simulateCombatWithMaledicts(
  playerStats: PlayerStats,
  monster: Monster,
  playstyle: Playstyle,
  useTriadMaledicts: boolean
) {
  let playerHp = playerStats.maxHp;
  let monsterHp = monster.maxHp;
  let monsterArmor = monster.armor;
  let playerPotions = 2;
  let turns = 0;

  let currentEnemyStance = monster.currentStance || CombatStance.RESOLVE;
  let isEnemyStanceHidden = monster.isStanceHidden || false;

  const hasMaledict = (id: string) => monster.maledicts.some(m => m.id === id);

  if (useTriadMaledicts && hasMaledict('mirage')) {
    isEnemyStanceHidden = true;
  }
  if (useTriadMaledicts && hasMaledict('adamantine')) {
    monsterArmor = Math.floor(monsterArmor * 1.6);
  }

  const allStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE];
  const getCounter = (s: CombatStance) => s === CombatStance.SPIRIT ? CombatStance.WILL : s === CombatStance.RESOLVE ? CombatStance.SPIRIT : CombatStance.RESOLVE;
  const getWeakTo = (s: CombatStance) => s === CombatStance.WILL ? CombatStance.SPIRIT : s === CombatStance.SPIRIT ? CombatStance.RESOLVE : CombatStance.WILL;

  let fracturedArmorTurns = 0;

  while (playerHp > 0 && monsterHp > 0 && turns < 60) {
    turns++;

    // 1. PLAYER TURN
    let playerChoice: CombatStance;
    if (playstyle === 'OPTIMAL_TACTICIAN') {
      playerChoice = !isEnemyStanceHidden ? getCounter(currentEnemyStance) : getCounter(monster.currentStance || CombatStance.RESOLVE);
    } else if (playstyle === 'RANDOM_BLIND') {
      playerChoice = allStances[Math.floor(Math.random() * allStances.length)];
    } else {
      playerChoice = getWeakTo(currentEnemyStance);
    }

    const playerClash = resolveTriadClash(playerChoice, currentEnemyStance);
    let rawDmg = playerStats.damage * (0.85 + Math.random() * 0.3);

    if (playerClash === 'WIN') {
      rawDmg *= BALANCE.COMBAT.triadConfig.winDamageMult;
      // Adamantine fracture trigger:
      if (useTriadMaledicts && hasMaledict('adamantine')) {
        fracturedArmorTurns = 2;
      }
    } else if (playerClash === 'LOSE') {
      const feintChance = Math.min(35, (playerStats.attackSpeed || 0) * 0.6);
      if (!(feintChance > 0 && Math.random() * 100 < feintChance)) {
        if (useTriadMaledicts && hasMaledict('bulwark')) {
          rawDmg *= 0.25; // Bulwark severely penalizes wrong stance!
        } else {
          rawDmg *= BALANCE.COMBAT.triadConfig.loseDamageMult; // 0.60
        }
      }
    }

    const effectiveArm = fracturedArmorTurns > 0 ? Math.floor(monsterArmor * 0.5) : monsterArmor;
    const mMit = BALANCE.COMBAT.calculateMitigationPercent(effectiveArm, monster.level);
    const netPlayerDmg = Math.max(1, Math.floor(rawDmg * (1 - mMit)));
    monsterHp -= netPlayerDmg;

    if (fracturedArmorTurns > 0) fracturedArmorTurns--;
    if (monsterHp <= 0) break;

    // 2. ENEMY TURN
    let rawEnemyDmg = monster.damage * (0.85 + Math.random() * 0.3);
    const enemyClash = resolveTriadClash(currentEnemyStance, playerChoice);

    if (enemyClash === 'WIN') {
      if (useTriadMaledicts && hasMaledict('predator')) {
        rawEnemyDmg *= 1.50; // Predator deals +50% punish!
      }
    }

    const baseMit = BALANCE.COMBAT.calculateMitigationPercent(playerStats.armor, playerStats.level);
    let finalMit = baseMit;
    if (enemyClash === 'WIN') {
      finalMit = Math.max(0, baseMit - (hasMaledict('predator') ? 0.25 : 0.15));
    } else if (enemyClash === 'LOSE') {
      finalMit = Math.min(0.85, baseMit + BALANCE.COMBAT.triadConfig.winDefenseMitigationBonus);
    }

    if (hasMaledict('executioner') && playerHp < playerStats.maxHp * 0.3) {
      rawEnemyDmg *= 2.0;
    }

    let netEnemyDmg = Math.max(1, Math.floor(rawEnemyDmg * (1 - finalMit)));

    const parryChance = Math.min(50, (playerStats.attackSpeed || 0) * 1.0);
    if (parryChance > 0 && Math.random() * 100 < parryChance) {
      netEnemyDmg = Math.max(1, Math.floor(netEnemyDmg * 0.65));
    }

    playerHp -= netEnemyDmg;

    if (playerHp > 0 && playerHp < playerStats.maxHp * 0.35 && playerPotions > 0) {
      playerPotions--;
      playerHp = Math.min(playerStats.maxHp, playerHp + Math.floor(playerStats.maxHp * 0.35));
    }

    // Stance rotation
    if (Math.random() < 0.45 || (useTriadMaledicts && hasMaledict('mirage') && playerClash === 'WIN')) {
      const other = allStances.filter(s => s !== currentEnemyStance);
      currentEnemyStance = other[Math.floor(Math.random() * other.length)];
    }
  }

  return { won: playerHp > 0, turns, playerHpPct: Math.round((Math.max(0, playerHp) / playerStats.maxHp) * 100) };
}

// Compare current pool vs expanded triad pool
const testLevels = [15, 25, 40];
const testRarities = [MonsterRarity.RARE, MonsterRarity.EPIC, MonsterRarity.UNIQUE];

console.log("--------------------------------------------------------------------------------");
console.log("SIMULACIÓN COMPARATIVA: MALEDICTS ACTUALES vs MALEDICTS SINTONIZADOS CON LA TRÍADA");
console.log("--------------------------------------------------------------------------------\n");

for (const lvl of testLevels) {
  for (const rar of testRarities) {
    console.log(`⚔️ NIVEL ${lvl} vs ${rar.toUpperCase()}:`);
    const pWell = createPlayerForLevel(lvl, 'WELL_GEARED');

    const runComparison = (label: string, useTriad: boolean, maledictPool: MaledictAffix[]) => {
      let optWins = 0, rndWins = 0, wstWins = 0;
      let optHp = 0, rndHp = 0, wstHp = 0;
      let optTtk = 0, rndTtk = 0, wstTtk = 0;
      const runs = 250;

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

        // Assign maledicts from specified pool
        const shuffled = [...maledictPool].sort(() => 0.5 - Math.random());
        m.maledicts = shuffled.slice(0, cfg.maledictCount);

        const rOpt = simulateCombatWithMaledicts(pWell.stats, m, 'OPTIMAL_TACTICIAN', useTriad);
        const rRnd = simulateCombatWithMaledicts(pWell.stats, m, 'RANDOM_BLIND', useTriad);
        const rWst = simulateCombatWithMaledicts(pWell.stats, m, 'WORST_COUNTERED', useTriad);

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

      console.log(`   [${label.padEnd(20)}] Óptimo: ${optRate.padStart(6)} (HP: ${optAvgHp.padStart(4)}) | Random: ${rndRate.padStart(6)} (HP: ${rndAvgHp.padStart(4)}) | Peor: ${wstRate.padStart(6)} (HP: ${wstAvgHp.padStart(4)})`);
    };

    runComparison("Maledicts Actuales", false, EXPANDED_TRIAD_MALEDICTS.slice(0, 6));
    runComparison("Maledicts Tríada", true, EXPANDED_TRIAD_MALEDICTS);
    console.log("");
  }
}
