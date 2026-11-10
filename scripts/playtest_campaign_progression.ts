import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap, PlayerStats, TerrainType, MapNode
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats, generatePassiveSkill } from '../services/gameLogic';
import { INITIAL_WORLD_MAP, PASSIVE_SKILLS_POOL } from '../constants';
import { simulateBattle, Playstyle } from './playtest_triad_and_progression';

console.log("================================================================================");
console.log("🏰 PLAYTEST DE CAMPAÑA: PROGRESIÓN COMPLETA DE ÁREAS (NIVEL 1 A 25+)");
console.log("================================================================================\n");

interface CampaignStats {
  clearedAreas: number;
  finalLevel: number;
  totalBattles: number;
  totalDeaths: number;
  potionsDrank: number;
  bossesSlain: number;
  triadWins: number;
  triadLosses: number;
  triadTies: number;
  feintsCount: number;
  parriesCount: number;
  finalDmg: number;
  finalHp: number;
  finalArmor: number;
}

function simulateFullCampaign(playstyle: Playstyle): CampaignStats {
  let level = 1;
  let xp = 0;
  let gold = 50;
  let statPoints = 0;
  let passives: any[] = [];
  let equipment: EquipmentMap = {};

  const baseAttrs: BaseAttributes = {
    strength: BALANCE.STATS.base.strength,
    dexterity: BALANCE.STATS.base.dexterity,
    intelligence: BALANCE.STATS.base.intelligence,
    vitality: BALANCE.STATS.base.vitality
  };

  // Starter item
  const starterWeapon = generateLoot(1, 1.0, 0, Rarity.COMMON);
  if (starterWeapon) {
    starterWeapon.type = ItemSlot.MAIN_HAND;
    starterWeapon.isIdentified = true;
    equipment[ItemSlot.MAIN_HAND] = starterWeapon;
  }

  let totalBattles = 0;
  let totalDeaths = 0;
  let potionsDrank = 0;
  let bossesSlain = 0;
  let triadWins = 0;
  let triadLosses = 0;
  let triadTies = 0;
  let feintsCount = 0;
  let parriesCount = 0;
  let clearedAreas = 0;

  // Level up helper
  const checkLevelUp = () => {
    let xpNeeded = Math.floor(100 * Math.pow(1.35, level - 1));
    while (xp >= xpNeeded && level < 60) {
      xp -= xpNeeded;
      level++;
      statPoints += BALANCE.STATS.perLevel.statPoints;

      // Allocate stats: 1 STR, 1 VIT, 1 DEX/INT alternating
      baseAttrs.strength += 1;
      baseAttrs.vitality += 1;
      if (level % 2 === 0) baseAttrs.dexterity += 1;
      else baseAttrs.intelligence += 1;

      // Learn or upgrade a passive skill
      const newPassive = generatePassiveSkill(passives);
      const existingIdx = passives.findIndex(p => p.id === newPassive.skill.id);
      if (existingIdx >= 0) {
        passives[existingIdx] = newPassive.skill;
      } else {
        passives.push(newPassive.skill);
      }

      xpNeeded = Math.floor(100 * Math.pow(1.35, level - 1));
    }
  };

  // Traverse the 8 areas in sequence
  for (const area of INITIAL_WORLD_MAP) {
    let areaProgress = 0;
    let battlesInArea = 0;

    while (areaProgress < 100 && battlesInArea < 40) {
      battlesInArea++;
      totalBattles++;

      const isBoss = areaProgress >= 90;
      const monsterLvl = Math.max(area.level, Math.floor((level + area.level) / 2));
      const diff = isBoss ? 1.5 : 1.0;
      const monster = generateMonster(monsterLvl, diff, area.terrain);

      if (isBoss) {
        monster.rarity = MonsterRarity.UNIQUE;
        monster.name = `Overlord ${monster.name}`;
        monster.maxHp *= 2;
        monster.currentHp = monster.maxHp;
        monster.isBoss = true;
      }

      const playerStats = calculatePlayerStats(baseAttrs, equipment, passives, level, statPoints);
      const battleResult = simulateBattle(playerStats, monster, playstyle);

      triadWins += battleResult.playerClashesWon;
      triadLosses += battleResult.playerClashesLost;
      triadTies += battleResult.playerClashesTied;
      feintsCount += battleResult.feintsTriggered;
      parriesCount += battleResult.parriesTriggered;
      potionsDrank += battleResult.potionsUsed;

      if (battleResult.won) {
        // Gain XP and progress
        const xpGain = Math.floor(monster.level * 25 * BALANCE.MONSTER.rarityConfig[monster.rarity].xpMult);
        xp += xpGain;
        checkLevelUp();

        // Loot drop
        const drop = generateLoot(monsterLvl, diff, playerStats.magicFind);
        if (drop) {
          drop.isIdentified = true;
          // Equip if slot is empty or if item has higher level/rarity
          const current = equipment[drop.type];
          if (!current || drop.level > current.level) {
            equipment[drop.type] = drop;
          }
        }

        if (isBoss) {
          bossesSlain++;
          clearedAreas++;
          areaProgress = 100;
          break;
        } else {
          areaProgress += Math.floor(15 + Math.random() * 10);
        }
      } else {
        totalDeaths++;
        // On defeat: small setback, heal and continue
        areaProgress = Math.max(0, areaProgress - 15);
      }
    }
  }

  const finalStats = calculatePlayerStats(baseAttrs, equipment, passives, level, statPoints);

  return {
    clearedAreas,
    finalLevel: level,
    totalBattles,
    totalDeaths,
    potionsDrank,
    bossesSlain,
    triadWins,
    triadLosses,
    triadTies,
    feintsCount,
    parriesCount,
    finalDmg: finalStats.damage,
    finalHp: finalStats.maxHp,
    finalArmor: finalStats.armor
  };
}

// Run 50 full campaigns per playstyle and summarize
const styles: Playstyle[] = [
  'OPTIMAL_TACTICIAN',
  'CASUAL_ADAPTIVE',
  'RANDOM_BLIND',
  'WORST_COUNTERED'
];

for (const style of styles) {
  console.log(`🗡️ Ejecutando 50 campañas completas con playstyle: ${style}...`);
  const runs = 50;
  let totalCleared = 0;
  let totalLvl = 0;
  let totalBattles = 0;
  let totalDeaths = 0;
  let totalPots = 0;
  let totalBosses = 0;
  let winsClash = 0;
  let lossesClash = 0;
  let tiesClash = 0;
  let feints = 0;
  let parries = 0;
  let totalDmg = 0;
  let totalHp = 0;
  let totalArm = 0;

  for (let i = 0; i < runs; i++) {
    const res = simulateFullCampaign(style);
    totalCleared += res.clearedAreas;
    totalLvl += res.finalLevel;
    totalBattles += res.totalBattles;
    totalDeaths += res.totalDeaths;
    totalPots += res.potionsDrank;
    totalBosses += res.bossesSlain;
    winsClash += res.triadWins;
    lossesClash += res.triadLosses;
    tiesClash += res.triadTies;
    feints += res.feintsCount;
    parries += res.parriesCount;
    totalDmg += res.finalDmg;
    totalHp += res.finalHp;
    totalArm += res.finalArmor;
  }

  const avgCleared = (totalCleared / runs).toFixed(1);
  const avgLvl = (totalLvl / runs).toFixed(1);
  const avgBattles = (totalBattles / runs).toFixed(1);
  const avgDeaths = (totalDeaths / runs).toFixed(1);
  const avgPots = (totalPots / runs).toFixed(1);
  const avgBosses = (totalBosses / runs).toFixed(1);
  const winRate = (((totalBattles - totalDeaths) / totalBattles) * 100).toFixed(1);
  const totalClashes = winsClash + lossesClash + tiesClash;
  const winPct = ((winsClash / totalClashes) * 100).toFixed(1);
  const tiePct = ((tiesClash / totalClashes) * 100).toFixed(1);
  const lossPct = ((lossesClash / totalClashes) * 100).toFixed(1);
  const feintRecoveryPct = lossesClash > 0 ? ((feints / lossesClash) * 100).toFixed(1) : '0';
  const parriesPerCampaign = (parries / runs).toFixed(1);

  console.log(`   • Áreas Completadas: ${avgCleared} / 8.0`);
  console.log(`   • Nivel Final Promedio: ${avgLvl}`);
  console.log(`   • Combates Totales: ${avgBattles} | Muertes: ${avgDeaths} | WinRate: ${winRate}%`);
  console.log(`   • Jefes Derrotados: ${avgBosses} / 8.0 | Pociones Usadas: ${avgPots}`);
  console.log(`   • Distribución de Choques: Victorias ${winPct}% | Empates ${tiePct}% | Derrotas ${lossPct}%`);
  console.log(`   • Fintas Activadas: ${feints} (${feintRecoveryPct}% de choques perdidos rescatados a 100% daño)`);
  console.log(`   • Paradas (Parry) por Campaña: ${parriesPerCampaign} desvíos de daño (-35%)`);
  console.log(`   • Stats Finales Promedio: HP ${Math.round(totalHp / runs)} | Daño ${Math.round(totalDmg / runs)} | Armadura ${Math.round(totalArm / runs)}\n`);
}

console.log("================================================================================");
console.log("✅ PLAYTEST DE CAMPAÑA FINALIZADO");
console.log("================================================================================");
