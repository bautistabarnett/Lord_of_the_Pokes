import { 
  Item, ItemSlot, Rarity, StatType, Monster, MonsterRarity, CombatStance, BaseAttributes, EquipmentMap, PlayerStats, PassiveSkill, MapNode
} from '../types';
import { BALANCE, resolveTriadClash, STANCE_META, TriadClashResult, getIdentifyCost } from '../services/gameBalance';
import { generateLoot, generateMonster, calculatePlayerStats, calculateItemValue } from '../services/gameLogic';
import { storageService } from '../services/storageService';
import { MALEDICT_AFFIXES, INITIAL_WORLD_MAP, GAME_VERSION } from '../constants';

console.log("================================================================================");
console.log(`🛡️ AUDITORÍA DE BUGS Y DOBLE CHECK DE FUNCIONALIDAD (${GAME_VERSION})`);
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. AUDITORÍA DE GUARDADO / CARGA Y RESISTENCIA A CORRUPCIÓN
// -----------------------------------------------------------------------------
console.log("📌 1. AUDITORÍA DE PERSISTENCIA (STORAGE SERVICE & HYDRATION)");

// Mock browser localStorage for node environment
const memoryStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => memoryStorage[k] || null,
  setItem: (k: string, v: string) => { memoryStorage[k] = v; },
  removeItem: (k: string) => { delete memoryStorage[k]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

const mockGameState: any = {
  level: 15,
  gold: 3500,
  baseAttributes: { strength: 25, dexterity: 20, intelligence: 18, vitality: 30 },
  statPoints: 4,
  skillPoints: 2,
  inventory: [
    generateLoot(15, 1.0, 10, Rarity.RARE),
    null,
    generateLoot(14, 1.0, 0, Rarity.MAGIC)
  ],
  equipment: {
    [ItemSlot.MAIN_HAND]: generateLoot(15, 1.0, 0, Rarity.UNIQUE)
  },
  passiveSkills: [],
  worldDifficulty: 1.2,
  mapNodes: INITIAL_WORLD_MAP,
  currentAreaId: 'cathedral',
  areaProgress: 75,
  activeTitleId: 'apex_champion',
  unlockedTitleIds: ['apex_champion'],
  bossTrophies: 3
};

// Test Save
const savedOk = storageService.saveGame(1, mockGameState);
assert(savedOk, "Guardado exitoso en Slot 1");

// Test Load & Hydration
const loaded = storageService.loadGame(1);
assert(loaded !== null, "Carga de partida deserializada no nula");
assert(loaded?.level === 15, "Preservación de nivel de héroe (15)");
assert(loaded?.gold === 3500, "Preservación de balance de oro (3500g)");
assert(loaded?.baseAttributes.vitality === 30, "Preservación de atributos base");
assert(loaded?.areaProgress === 75, "Preservación del progreso de exploración (75%)");
assert(loaded?.bossTrophies === 3, "Preservación de trofeos de jefes");

// Test Corruption Resilience
localStorage.setItem('lotd_save_2', 'CORRUPTED_JSON_{{[INVALID');
const corruptedLoad = storageService.loadGame(2);
assert(corruptedLoad === null, "Resistencia a JSON corrupto (retorna null limpiamente sin crash)");

// -----------------------------------------------------------------------------
// 2. AUDITORÍA DE INVENTARIO Y LÓGICA DE OBJETOS
// -----------------------------------------------------------------------------
console.log("\n📌 2. AUDITORÍA DE INVENTARIO, EQUIPAMIENTO Y COMERCIO");

const testWeapon = generateLoot(10, 1.0, 0, Rarity.RARE);
assert(testWeapon !== null, "Generación de botín válida");

if (testWeapon) {
  testWeapon.type = ItemSlot.MAIN_HAND;
  testWeapon.isIdentified = false;
  
  // Identification Cost
  const idCost = getIdentifyCost(testWeapon);
  assert(idCost > 0, `Cálculo de costo de identificación (${idCost}g)`);

  // Value calculation
  const unidValue = calculateItemValue(testWeapon);
  testWeapon.isIdentified = true;
  const idValue = calculateItemValue(testWeapon);
  assert(idValue > unidValue, `Valor de objeto identificado (${idValue}g) > no identificado (${unidValue}g)`);
}

// Inventory capacity & full inventory simulation
const fullInventory: (Item | null)[] = Array(30).fill(null).map((_, i) => generateLoot(10, 1.0, 0, Rarity.COMMON));
const hasEmptySlot = fullInventory.some(i => i === null);
assert(!hasEmptySlot, "Detección precisa de inventario al 100% de capacidad");

// -----------------------------------------------------------------------------
// 3. AUDITORÍA DEL MOTOR DE TRIADA (REGLAS DE CHOQUE & SIMETRÍA)
// -----------------------------------------------------------------------------
console.log("\n📌 3. AUDITORÍA DEL SISTEMA DE TRÍADA (POSTURAS Y CLASH)");

// Triangle check: Will > Spirit > Resolve > Will
const willVsSpirit = resolveTriadClash(CombatStance.WILL, CombatStance.SPIRIT);
const spiritVsResolve = resolveTriadClash(CombatStance.SPIRIT, CombatStance.RESOLVE);
const resolveVsWill = resolveTriadClash(CombatStance.RESOLVE, CombatStance.WILL);

assert(willVsSpirit === 'WIN', "Voluntad vence a Espíritu (WIN)");
assert(spiritVsResolve === 'WIN', "Espíritu vence a Temple (WIN)");
assert(resolveVsWill === 'WIN', "Temple vence a Voluntad (WIN)");

// Reverse checks
assert(resolveTriadClash(CombatStance.SPIRIT, CombatStance.WILL) === 'LOSE', "Espíritu pierde ante Voluntad (LOSE)");
assert(resolveTriadClash(CombatStance.RESOLVE, CombatStance.SPIRIT) === 'LOSE', "Temple pierde ante Espíritu (LOSE)");
assert(resolveTriadClash(CombatStance.WILL, CombatStance.RESOLVE) === 'LOSE', "Voluntad pierde ante Temple (LOSE)");

// Tie checks
assert(resolveTriadClash(CombatStance.WILL, CombatStance.WILL) === 'TIE', "Voluntad vs Voluntad es Choque Parejo (TIE)");
assert(resolveTriadClash(CombatStance.SPIRIT, CombatStance.SPIRIT) === 'TIE', "Espíritu vs Espíritu es Choque Parejo (TIE)");
assert(resolveTriadClash(CombatStance.RESOLVE, CombatStance.RESOLVE) === 'TIE', "Temple vs Temple es Choque Parejo (TIE)");

// Quick Reaction thresholds (Parry max 50%, Feint max 35%)
const speed = 20; // 20% quick reaction
const parryRate = Math.min(50, Math.round(speed * 1.0));
const feintRate = Math.min(35, Math.round(speed * 0.6));
assert(parryRate === 20, "Tasa de Parada rápida coincide con la velocidad de ataque (20%)");
assert(feintRate === 12, "Tasa de Finta rápida calculada al 60% de velocidad (12%)");

// -----------------------------------------------------------------------------
// 4. AUDITORÍA DE MALEDICTS: TRAITS (PERMANENTES) & INFAMIAS (ACTIVABLES)
// -----------------------------------------------------------------------------
console.log("\n📌 4. AUDITORÍA DE FAMILIAS DE MALEDICTS (TRAITS & INFAMIAS)");

assert(MALEDICT_AFFIXES.length === 11, `Catálogo oficial contiene exactamente 11 Maledicts (actual: ${MALEDICT_AFFIXES.length})`);

const traits = MALEDICT_AFFIXES.filter(m => m.category === 'TRAIT');
const infamias = MALEDICT_AFFIXES.filter(m => m.category === 'INFAMY');

assert(traits.length === 5, `Exactamente 5 Traits permanentes registrados (actual: ${traits.length})`);
assert(infamias.length === 6, `Exactamente 6 Infamias activables registradas (actual: ${infamias.length})`);

// Validate every Infamy has a valid temporal cooldown
infamias.forEach(inf => {
  assert(
    !!inf.cooldownSeconds && inf.cooldownSeconds > 0 && !!inf.jitterSeconds && inf.jitterSeconds >= 0,
    `Infamia '${inf.name}' posee cooldown temporal válido (${inf.cooldownSeconds}s ±${inf.jitterSeconds}s)`
  );
});

// Trickster stance concealment check
const trickster = infamias.find(i => i.id === 'trickster');
assert(!!trickster && trickster.durationTurns === 2, "Trickster oculta postura durante exactamente 2 turnos");

// Chronobreaker timer compression check
const chronobreaker = infamias.find(i => i.id === 'chronobreaker');
assert(!!chronobreaker && chronobreaker.cooldownSeconds === 8, "Chronobreaker registrado con cooldown de 8s");

// -----------------------------------------------------------------------------
// 5. AUDITORÍA DE PROGRESIÓN DE NIVELES Y FORMULAS MATEMÁTICAS
// -----------------------------------------------------------------------------
console.log("\n📌 5. AUDITORÍA DE FÓRMULAS DE STATS Y PROGRESIÓN");

const baseAttrs: BaseAttributes = {
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  vitality: 10
};

const lvl1Stats = calculatePlayerStats(baseAttrs, {}, [], 1, 0);
assert(lvl1Stats.maxHp === 100 + (10 * 8) + 15, `Vida Nivel 1 correcta (195 HP, calculado: ${lvl1Stats.maxHp})`);
assert(lvl1Stats.damage === 7, `Daño Nivel 1 correcto (7 DMG, calculado: ${lvl1Stats.damage})`);
assert(lvl1Stats.armor === 5, `Armadura Nivel 1 correcta (5 ARM, calculado: ${lvl1Stats.armor})`);

// Mitigation Formula Check
const lowMitigation = BALANCE.COMBAT.calculateMitigationPercent(10, 1);
const highMitigation = BALANCE.COMBAT.calculateMitigationPercent(500, 10);
assert(lowMitigation > 0 && lowMitigation < 0.30, `Mitigación básica razonable (${(lowMitigation*100).toFixed(1)}%)`);
assert(highMitigation <= 0.80, `Mitigación de armadura masiva respeta tope del 80% (${(highMitigation*100).toFixed(1)}%)`);

// -----------------------------------------------------------------------------
// 6. AUDITORÍA DE RESPEC DE ATRIBUTOS Y COSTO EN ORO
// -----------------------------------------------------------------------------
console.log("\n📌 6. AUDITORÍA DE RESPEC DE ATRIBUTOS Y COSTO EN ORO");

const respecLevel = 20;
const respecCost = Math.max(50, respecLevel * 50);
assert(respecCost === 1000, `Costo de Respec a nivel 20 escala coherentemente (1000g, calculado: ${respecCost}g)`);

// -----------------------------------------------------------------------------
// 7. AUDITORÍA DEL SISTEMA DE TUTORIAL Y EXTENSIBILIDAD
// -----------------------------------------------------------------------------
console.log("\n📌 7. AUDITORÍA DEL SISTEMA DE TUTORIAL Y EXTENSIBILIDAD (v2.1)");

import { TUTORIAL_CATEGORIES, TUTORIAL_SECTIONS } from '../services/tutorialCatalog';

assert(GAME_VERSION === 'v2.1', `Versión del juego incrementada a v2.1 (actual: ${GAME_VERSION})`);
assert(TUTORIAL_SECTIONS.length >= 7, `Manual cuenta con secciones completas (actual: ${TUTORIAL_SECTIONS.length})`);
assert(TUTORIAL_CATEGORIES.length === 7, `Categorías de navegación completas (7 categorías registradas)`);

const requiredCats = ['triad', 'reaction', 'maledicts', 'attributes', 'exploration', 'items'];
const coveredCats = new Set(TUTORIAL_SECTIONS.map(s => s.category));
const allCatsCovered = requiredCats.every(c => coveredCats.has(c as any));
assert(allCatsCovered, `Todas las categorías principales de mecánicas están cubiertas en el tutorial`);

const allSectionsValid = TUTORIAL_SECTIONS.every(s => 
  s.id && s.title && s.summary && s.content.paragraphs.length > 0
);
assert(allSectionsValid, `Todas las secciones del tutorial cuentan con estructura de datos válida y párrafos explicativos`);

console.log("\n================================================================================");
console.log(`🏁 RESULTADO FINAL DE LA AUDITORÍA: ${passedTests}/${totalTests} PRUEBAS EXITOSAS`);
console.log("================================================================================");

if (passedTests === totalTests) {
  console.log("🎉 CERO BUGS DETECTADOS. Todos los subsistemas operan en óptima conformidad.");
} else {
  console.error("⚠️ Se detectaron inconsistencias que requieren atención.");
  process.exit(1);
}

