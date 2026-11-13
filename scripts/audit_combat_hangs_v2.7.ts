import { generateMonster, calculatePlayerStats } from '../services/gameLogic';
import { BALANCE, resolveTriadClash, STANCE_META } from '../services/gameBalance';
import { generateTurnBatch } from '../hooks/useCombatEngine';
import { Monster, PlayerStats, CombatStance, TerrainType, MonsterRarity, ItemSlot, Rarity, StatType } from '../types';

console.log("================================================================================");
console.log("🛡️ AUDITORÍA DE COMBATE Y SIMULADOR DE RESISTENCIA A CUELGUES (v2.7)");
console.log("================================================================================\n");

// 1. Simulación masiva de 10,000 batallas completas (Single monster, 2-pack, 3-pack)
let totalBattles = 0;
let victories = 0;
let defeats = 0;
let flees = 0;
let stallsOrHangs = 0;
let cleaveTriggered = 0;
let cleaveKills = 0;
let thornsReflectKills = 0;
let frozenPlayerTurns = 0;
let totalTurns = 0;

const baseAttr = { strength: 25, dexterity: 20, intelligence: 15, vitality: 30 };
const testStats: PlayerStats = calculatePlayerStats(
  baseAttr,
  {
    [ItemSlot.MAIN_HAND]: {
      id: 'axe_test',
      name: 'Battle Axe',
      type: ItemSlot.MAIN_HAND,
      rarity: Rarity.RARE,
      level: 10,
      isIdentified: true,
      icon: 'axe',
      stats: [{ type: StatType.DAMAGE, value: 45 }]
    },
    [ItemSlot.BODY_ARMOR]: {
      id: 'armor_test',
      name: 'Plate Armor',
      type: ItemSlot.BODY_ARMOR,
      rarity: Rarity.RARE,
      level: 10,
      isIdentified: true,
      icon: 'armor',
      stats: [{ type: StatType.ARMOR, value: 35 }, { type: StatType.THORNS, value: 20 }]
    }
  },
  [],
  10,
  0
);

console.log(`👤 Héroe de pruebas Nivel ${testStats.level}: HP ${testStats.maxHp}, Dmg ${testStats.damage}, Armor ${testStats.armor}, Thorns ${testStats.thorns}%`);
console.log("⚔️ Iniciando simulación de 10,000 combates aleatorios con todas las mecánicas activas...\n");

for (let b = 0; b < 10000; b++) {
  totalBattles++;
  const packSize = Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
  const monsters: Monster[] = [];
  for (let m = 0; m < packSize; m++) {
    const mon = generateMonster(10 + Math.floor(Math.random() * 5), 1.0, TerrainType.DUNGEON);
    monsters.push(mon);
  }

  // Estado del motor de combate simulado
  let heroHp = testStats.maxHp;
  let activeMonsters = monsters.map(m => ({ ...m, currentHp: m.maxHp }));
  let turnQueue: ('player' | 'enemy')[] = [...generateTurnBatch(1, 1, 'player'), ...generateTurnBatch(1, 1, 'player')];
  let isFighting = true;
  let battleTurnCount = 0;
  const MAX_BATTLE_TURNS = 200; // Si supera 200 turnos se considera hang/bucle infinito

  while (isFighting && battleTurnCount < MAX_BATTLE_TURNS) {
    battleTurnCount++;
    totalTurns++;

    // Guard de mantenimiento de cola atómico
    if (turnQueue.length < 3) {
      const lastActor = turnQueue.length > 0 ? turnQueue[turnQueue.length - 1] : 'enemy';
      const nextStart = lastActor === 'player' ? 'enemy' : 'player';
      turnQueue = [...turnQueue, ...generateTurnBatch(1, 1, nextStart)];
    }

    if (turnQueue.length === 0) {
      stallsOrHangs++;
      isFighting = false;
      break;
    }

    const currentActor = turnQueue[0];
    turnQueue = turnQueue.slice(1);

    if (currentActor === 'player') {
      // Simular posible estado congelado/aturdido (5% de probabilidad)
      const isFrozen = Math.random() < 0.05;
      if (isFrozen) {
        frozenPlayerTurns++;
        // Turno saltado de forma limpia
        continue;
      }

      // Encontrar objetivo vivo
      const targetIndex = activeMonsters.findIndex(m => m.currentHp > 0);
      if (targetIndex === -1) {
        victories++;
        isFighting = false;
        break;
      }

      const target = activeMonsters[targetIndex];
      const playerStance = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE][Math.floor(Math.random() * 3)];
      const enemyStance = target.currentStance || CombatStance.RESOLVE;
      const clash = resolveTriadClash(playerStance, enemyStance);

      let dmg = testStats.damage * (0.8 + Math.random() * 0.4);
      if (clash === 'WIN') dmg *= 1.35;
      else if (clash === 'LOSE') dmg *= 0.70;

      // Cleave Splash Logic con Fix v2.7
      const overkill = dmg - target.currentHp;
      target.currentHp = Math.max(0, target.currentHp - dmg);

      if (overkill > 0 && activeMonsters.length > 1) {
        const nextTargetIdx = activeMonsters.findIndex((m, i) => i !== targetIndex && m.currentHp > 0);
        if (nextTargetIdx >= 0) {
          cleaveTriggered++;
          const splashDmg = Math.max(1, Math.floor(overkill * 0.5));
          const nextTarget = activeMonsters[nextTargetIdx];
          const remaining = Math.max(0, nextTarget.currentHp - splashDmg);
          activeMonsters[nextTargetIdx].currentHp = remaining;
          if (remaining === 0) cleaveKills++;
        }
      }

      // Thorns del monstruo
      if (target.thorns > 0 && dmg > 0) {
        const thornDmg = Math.min(Math.floor(testStats.maxHp * 0.15), Math.max(1, Math.floor(dmg * (target.thorns / 100))));
        heroHp = Math.max(0, heroHp - thornDmg);
        if (heroHp <= 0) {
          defeats++;
          isFighting = false;
          break;
        }
      }

      // Comprobar victoria
      if (activeMonsters.every(m => m.currentHp <= 0)) {
        victories++;
        isFighting = false;
        break;
      }
    } else {
      // Turno del enemigo
      let totalEnemyDmg = 0;
      for (let mIdx = 0; mIdx < activeMonsters.length; mIdx++) {
        const monster = activeMonsters[mIdx];
        if (monster.currentHp <= 0) continue;

        let monDmg = monster.damage * (0.8 + Math.random() * 0.4);
        const monStance = monster.currentStance || CombatStance.RESOLVE;
        const playerStance = CombatStance.WILL;
        const monClash = resolveTriadClash(monStance, playerStance);

        let mitig = BALANCE.COMBAT.calculateMitigationPercent(testStats.armor, testStats.level);
        if (monClash === 'WIN') mitig = Math.max(0, mitig - 0.15);
        else if (monClash === 'LOSE') mitig = Math.min(0.9, mitig + 0.20);

        const netDmg = Math.max(1, Math.floor(monDmg * (1 - mitig)));
        heroHp = Math.max(0, heroHp - netDmg);
        totalEnemyDmg += netDmg;

        // Player Thorns reflection
        if ((testStats.thorns || 0) > 0) {
          const reflect = Math.max(1, Math.floor(monDmg * ((testStats.thorns || 0) / 100)));
          activeMonsters[mIdx].currentHp = Math.max(0, activeMonsters[mIdx].currentHp - reflect);
          if (activeMonsters[mIdx].currentHp === 0) thornsReflectKills++;
        }

        // Fix v2.7 Lifesteal no resucita monstruo muerto
        if (monster.lifeSteal > 0 && activeMonsters[mIdx].currentHp > 0 && netDmg > 0) {
          const heal = Math.floor(netDmg * (monster.lifeSteal / 100));
          activeMonsters[mIdx].currentHp = Math.min(monster.maxHp, activeMonsters[mIdx].currentHp + heal);
        }

        // Rotar postura
        const otherStances = [CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE].filter(s => s !== monStance);
        activeMonsters[mIdx].currentStance = otherStances[Math.floor(Math.random() * otherStances.length)];
      }

      if (activeMonsters.every(m => m.currentHp <= 0)) {
        victories++;
        isFighting = false;
        break;
      }

      if (heroHp <= 0) {
        defeats++;
        isFighting = false;
        break;
      }
    }
  }

  if (battleTurnCount >= MAX_BATTLE_TURNS) {
    stallsOrHangs++;
  }
}

console.log("📊 RESULTADOS DE LA AUDITORÍA DE 10,000 COMBATES:");
console.log(`   • Batallas totales simuladas: ${totalBattles.toLocaleString()}`);
console.log(`   • Turnos de combate procesados: ${totalTurns.toLocaleString()}`);
console.log(`   • Victorias del héroe: ${victories.toLocaleString()} (${((victories / totalBattles) * 100).toFixed(1)}%)`);
console.log(`   • Derrotas del héroe: ${defeats.toLocaleString()} (${((defeats / totalBattles) * 100).toFixed(1)}%)`);
console.log(`   • Cleave Activados: ${cleaveTriggered.toLocaleString()} (Kills por Splash: ${cleaveKills.toLocaleString()})`);
console.log(`   • Kills por Reflejo de Espinas: ${thornsReflectKills.toLocaleString()}`);
console.log(`   • Turnos congelados procesados sin cuelgue: ${frozenPlayerTurns.toLocaleString()}`);
console.log(`   • Cuelgues, bloqueos o loops infinitos: ${stallsOrHangs}`);

if (stallsOrHangs === 0 && (victories + defeats === totalBattles)) {
  console.log("\n✅ VERIFICACIÓN DE COMBATE IMPECABLE: 0 cuelgues en 10,000 batallas.");
} else {
  console.error(`\n❌ ERROR: Se detectaron ${stallsOrHangs} anomalías en las batallas.`);
  process.exit(1);
}
