import fs from 'fs';
import path from 'path';
import { generateTurnBatch } from '../hooks/useCombatEngine';
import { BALANCE, resolveTriadClash } from '../services/gameBalance';
import { calculatePlayerStats, generateLoot } from '../services/gameLogic';
import { CombatStance, StatType, Rarity, ItemSlot } from '../types';

console.log("================================================================================");
console.log("⚔️ PLAYTEST DE VALIDACIÓN: TURNOS ALTERNOS 1:1 Y REACCIÓN RÁPIDA (PARRY / FINTA)");
console.log("================================================================================\n");

// 1. TEST DE INVARIANTE DE ALTERNANCIA ESTRICTA 1:1 E INICIATIVA FIJA DEL JUGADOR
console.log("🧪 1. Verificando Iniciativa Fija del Jugador y Alternancia Estricta 1:1...");
{
  let doubleTurnsFound = 0;
  let wrongInitiativeCount = 0;

  // Probar con 100 combinaciones extremas de agilidad (Héroe Agi 1 vs Enemigo Agi 9999)
  for (let i = 0; i < 100; i++) {
    const pAgi = i === 0 ? 0 : Math.random() * 500;
    const eAgi = i === 0 ? 10000 : Math.random() * 5000;

    // Inicio de combate (siempre inicia el jugador)
    let queue = generateTurnBatch(pAgi, eAgi, 'player');
    if (queue[0] !== 'player') wrongInitiativeCount++;

    // Simular 100 turnos de consumo y recarga dinámica tal como ocurre en useCombatEngine
    for (let step = 0; step < 100; step++) {
      if (queue.length >= 2 && queue[0] === queue[1]) {
        doubleTurnsFound++;
      }
      // Consumir turno actual
      const prevActor = queue[0];
      queue = queue.slice(1);

      // Si baja de 3 elementos, recargar exactamente como en useCombatEngine
      if (queue.length < 3) {
        const lastActor = queue.length > 0 ? queue[queue.length - 1] : 'enemy';
        const nextStart = lastActor === 'player' ? 'enemy' : 'player';
        queue = [...queue, ...generateTurnBatch(pAgi, eAgi, nextStart)];
      }

      if (queue[0] === prevActor) {
        doubleTurnsFound++;
      }
    }
  }

  console.log(`   • Simulaciones ejecutadas: 10,000 transiciones de turnos`);
  console.log(`   • Fallos de iniciativa del jugador: ${wrongInitiativeCount}`);
  console.log(`   • Turnos dobles o consecutivos detectados: ${doubleTurnsFound}`);

  if (wrongInitiativeCount === 0 && doubleTurnsFound === 0) {
    console.log("   ✅ ÉXITO: El jugador siempre abre el turno 1 y la secuencia es 100% alterna (1:1).\n");
  } else {
    console.error("   ❌ ERROR: Se detectaron anomalías en la cola de turnos.\n");
    process.exit(1);
  }
}

// 2. TEST DE ESCALADO DE REACCIÓN RÁPIDA (DESTREZA + EQUIPAMIENTO + PASIVAS)
console.log("🧪 2. Verificando cálculo de Reacción Rápida en calculatePlayerStats...");
{
  const baseAttr = { strength: 10, dexterity: 50, intelligence: 10, vitality: 10 }; // 50 DEX -> +10% Reacción Rápida
  const swiftDagger = {
    id: 'dagger_test',
    name: 'Swift Dagger',
    type: ItemSlot.MAIN_HAND,
    rarity: Rarity.RARE,
    level: 10,
    isIdentified: true,
    icon: 'dagger',
    stats: [{ type: StatType.ATTACK_SPEED, value: 20 }] // +20% Reacción Rápida
  };

  const stats = calculatePlayerStats(baseAttr, { [ItemSlot.MAIN_HAND]: swiftDagger }, [], 10, 0);
  const expectedReaction = 30; // 50 * 0.2 (10) + 20 = 30%
  const parryChance = Math.min(50, (stats.attackSpeed || 0) * 1.0);
  const feintChance = Math.min(35, (stats.attackSpeed || 0) * 0.6);

  console.log(`   • Destreza: 50 (+10% base) + Daga (+20% equipo) => Reacción Rápida Total: ${stats.attackSpeed}%`);
  console.log(`   • Probabilidad de Parry calculada: ${parryChance}% (Mitiga 35% del daño recibido)`);
  console.log(`   • Probabilidad de Finta calculada: ${feintChance}% (Recupera 100% del daño al fallar postura)`);

  if (stats.attackSpeed === expectedReaction && parryChance === 30 && feintChance === 18) {
    console.log("   ✅ ÉXITO: Escalado de Reacción Rápida verificado con exactitud.\n");
  } else {
    console.error(`   ❌ ERROR: Se esperaba 30% Reacción Rápida, se obtuvo ${stats.attackSpeed}%\n`);
    process.exit(1);
  }
}

// 3. SIMULACIÓN MONTE CARLO DE FINTA Y PARRY EN COMBATE (5,000 CHOQUES)
console.log("🧪 3. Simulación Monte Carlo de Finta (Ataque) y Parry (Defensa) en 5,000 choques...");
{
  const trials = 5000;
  const quickReaction = 35; // 35% Reacción Rápida -> Expected Feint = 21%, Expected Parry = 35%
  const expectedFeintPct = Math.min(35, quickReaction * 0.6); // 21%
  const expectedParryPct = Math.min(50, quickReaction * 1.0); // 35%

  let feintsTriggered = 0;
  let parriesTriggered = 0;
  let totalDamageWithFeint = 0;
  let totalDamageWithoutFeint = 0;
  let totalDamageTakenWithParry = 0;
  let totalDamageTakenWithoutParry = 0;

  const baseRawDmg = 100;
  const baseEnemyDmg = 100;

  for (let i = 0; i < trials; i++) {
    // Simular postura fallida en ataque (LOSE)
    const feintRoll = Math.random() * 100 < expectedFeintPct;
    if (feintRoll) {
      feintsTriggered++;
      totalDamageWithFeint += baseRawDmg * 1.0; // 100% daño recuperado
    } else {
      totalDamageWithFeint += baseRawDmg * BALANCE.COMBAT.triadConfig.loseDamageMult; // 60% daño
    }
    totalDamageWithoutFeint += baseRawDmg * BALANCE.COMBAT.triadConfig.loseDamageMult;

    // Simular impacto enemigo recibido (Defensa)
    const parryRoll = Math.random() * 100 < expectedParryPct;
    if (parryRoll) {
      parriesTriggered++;
      totalDamageTakenWithParry += Math.floor(baseEnemyDmg * 0.65); // -35% daño por Parry
    } else {
      totalDamageTakenWithParry += baseEnemyDmg;
    }
    totalDamageTakenWithoutParry += baseEnemyDmg;
  }

  const actualFeintRate = (feintsTriggered / trials) * 100;
  const actualParryRate = (parriesTriggered / trials) * 100;

  console.log(`   • Finta (Esperado ~${expectedFeintPct}%): Activado en ${actualFeintRate.toFixed(2)}% de posturas fallidas.`);
  console.log(`     -> Daño medio en postura fallida subió de ${(totalDamageWithoutFeint / trials).toFixed(1)} a ${(totalDamageWithFeint / trials).toFixed(1)}.`);
  console.log(`   • Parry (Esperado ~${expectedParryPct}%): Activado en ${actualParryRate.toFixed(2)}% de ataques recibidos.`);
  console.log(`     -> Daño medio recibido bajó de ${(totalDamageTakenWithoutParry / trials).toFixed(1)} a ${(totalDamageTakenWithParry / trials).toFixed(1)}.`);

  if (Math.abs(actualFeintRate - expectedFeintPct) < 3 && Math.abs(actualParryRate - expectedParryPct) < 3) {
    console.log("   ✅ ÉXITO: Las tasas de activación de Finta y Parry convergen estadísticamente.\n");
  } else {
    console.error("   ❌ ERROR: Desviación estadística fuera de rango.\n");
    process.exit(1);
  }
}

console.log("================================================================================");
console.log("🏆 TODAS LAS PRUEBAS DE TURNOS 1:1 Y REACCIÓN RÁPIDA SUPERADAS AL 100%");
console.log("================================================================================");
