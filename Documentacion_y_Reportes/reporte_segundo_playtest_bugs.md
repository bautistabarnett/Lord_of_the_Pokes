# 🛡️ Reporte Forense: Segundo Playtest de Búsqueda de Bugs (Lord of the Dungeon V2)

**Fecha de Ejecución:** 9 de Noviembre de 2026  
**Entorno de Pruebas:** Node.js v24.22.2 LTS / Debian 12 / Vite 6.4.5  
**Harness de Auditoría:** [`scripts/playtest_bugs_v2.ts`](file:///home/antigravity/LoTD-main/scripts/playtest_bugs_v2.ts)  
**Estado General:** 8 Vectores Analizados | 6 Bugs Identificados y Subsanados (100%) | 0 Regresiones  

---

## 1. Resumen Ejecutivo

En seguimiento al primer playtest general de balance macroeconómico y distribución de posturas, se ejecutó una segunda auditoría de juego orientada **exclusivamente a la detección de fallos de borde, condiciones de carrera de concurrencia, violaciones de invariantes de estado y exploits en el ciclo de combate de la Versión 2**.

A través del arnés de pruebas automatizado [`scripts/playtest_bugs_v2.ts`](file:///home/antigravity/LoTD-main/scripts/playtest_bugs_v2.ts), se analizaron 8 vectores de estrés en el motor de combate ([`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts)), la gestión del inventario ([`App.tsx`](file:///home/antigravity/LoTD-main/App.tsx)) y los componentes de visualización ([`components/CombatModal.tsx`](file:///home/antigravity/LoTD-main/components/CombatModal.tsx)).

| ID | Vector Analizado | Severidad | Estado Previo | Estado Actual |
| :--- | :--- | :---: | :---: | :---: |
| **`BUG-INV-01`** | Pérdida de objetos del suelo con inventario 30/30 | **CRÍTICA** | ❌ Destrucción permanente | ✅ Preservación asegurada |
| **`BUG-CMB-01`** | Muerte por DoT letal bajo estado Congelado/Aturdido | **CRÍTICA** | ❌ Bypass de derrota (Zombie) | ✅ Derrota instantánea |
| **`BUG-CMB-02`** | Muerte de monstruo por Espinas (Thorns) en su turno | **ALTA** | ❌ Victoria omitida | ✅ Victoria inmediata |
| **`BUG-CMB-04`** | Exploit de reseteo de temporizador de 2.5s con poción | **ALTA** | ❌ Tiempo infinito y `turnCount` inflado | ✅ Temporizador continuo |
| **`BUG-UI-01`** | HP negativo en monstruos y renderizado `-X / Max` | **MEDIA** | ❌ Glitch visual en HealthBar | ✅ Clamping a 0 garantizado |
| **`BUG-CMB-03`** | Mutación directa de estado React en daño Cleave | **MEDIA** | ❌ Violación de inmutabilidad | ✅ Copia pura e inmutable |
| **`BUG-SAV-01`** | Desincronización de HP residual al cargar partidas | **MEDIA** | ❌ HP residual heredado | ✅ HP íntegro restaurado |
| **`SAFE-CORE-01`** | Invariantes matemáticas extremas y Tríada Yan Ken Po | **BAJA** | ✅ Robusto | ✅ 100% Coherente |

---

## 2. Detalle Forense de los Bugs Encontrados y Soluciones Aplicadas

### 2.1. BUG-INV-01: Destrucción Permanente de Ítems en el Suelo (Severidad: CRÍTICA)
* **Archivo Afectado:** [`App.tsx`](file:///home/antigravity/LoTD-main/App.tsx#L1180)
* **Mecánica Implicada:** Recogida de botín tras victoria (`groundItems`).
* **Causa Raíz:** Al hacer clic en un objeto del suelo, el código ejecutaba:
  ```tsx
  // Código Vulnerable Previo
  onClick={() => { addToInventory(i); setGroundItems(g => g.filter((_,ix) => ix !== idx)); }}
  ```
  `setGroundItems` filtraba y eliminaba el ítem del suelo de forma **incondicional**, sin comprobar si `addToInventory(i)` retornaba `false` por falta de espacio en los 30 slots del inventario. Si el jugador tenía el inventario lleno y cliqueaba un botín único o legendario, el ítem se esfumaba del juego sin entrar al inventario. Idéntico problema afectaba al unstaging del mercader (`sellStaging`).
* **Solución Implementada:**
  ```tsx
  // Código Corregido y Blindado
  onClick={() => { 
    if (addToInventory(i)) { 
      setGroundItems(g => g.filter((_,ix) => ix !== idx)); 
    } 
  }}
  ```
  Se replicó la misma salvaguarda en la bandeja de venta del mercader (`sellStaging`). Si el inventario está lleno, el sistema emite el log `"Inventory is full!"` y el objeto permanece seguro en el suelo.

---

### 2.2. BUG-CMB-01: Bypass de Derrota con DoT Letal bajo Aturdimiento (Severidad: CRÍTICA)
* **Archivo Afectado:** [`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts#L616-L625)
* **Mecánica Implicada:** Resolución de turnos del héroe congelado o aturdido.
* **Causa Raíz:**
  ```ts
  // Código Vulnerable Previo
  const isFrozen = combatStatusEffects.some(e => e.target === 'player' && (e.type === 'freeze' || e.type === 'stun'));
  if (isFrozen) {
      addToCombatLog("You are Frozen/Stunned and cannot act!");
      processCombatEffects('player');
      return; // <--- ERROR: Retorno anticipado sin comprobar muerte!
  }
  ...
  if (playerHp <= 0) { handleDefeatInternal(); return; } // Línea inalcanzable
  ```
  Si el jugador recibía daño letal de Veneno o Quemadura en `processCombatEffects('player')` mientras estaba aturdido, el `return;` salía de la función inmediatamente. La comprobación `handleDefeatInternal()` nunca se ejecutaba. El combate avanzaba a la siguiente acción en la cola (`turnQueue`), permitiendo que el enemigo continuara atacando a un héroe con 0 o HP negativo.
* **Solución Implementada:**
  Se modificó `processCombatEffects('player')` para que retorne el valor de HP actualizado sincrónicamente (`hpAfterDot`), añadiendo el check de derrota antes de salir:
  ```ts
  if (isFrozen) {
      addToCombatLog("You are Frozen/Stunned and cannot act!");
      const hpAfterDot = (processCombatEffects('player') as number) ?? playerHpRef.current;
      if (hpAfterDot <= 0) {
          handleDefeatInternal();
      }
      return;
  }
  ```

---

### 2.3. BUG-CMB-02: Victoria Omitida ante Muerte por Espinas en Turno Enemigo (Severidad: ALTA)
* **Archivo Afectado:** [`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts#L803-L918)
* **Mecánica Implicada:** Reflejo de daño Thorns / Contragolpe durante el ataque del enemigo.
* **Causa Raíz:** En `executeEnemyTurn()`, cuando un monstruo atacaba y recibía daño reflejado de espinas (`playerStats.thorns`) suficiente para reducir su HP a 0, `setActiveMonsters` programaba la actualización. Sin embargo, al finalizar el bucle `workingMonsters.forEach(...)`, la función solo comprobaba si el jugador había muerto (`if (currentHeroHp <= 0) handleDefeatInternal()`), omitiendo por completo verificar si todos los monstruos habían perecido. La batalla se quedaba colgada en `isFighting = true` hasta que el jugador realizara una acción posterior.
* **Solución Implementada:**
  Se añadió la comprobación de victoria al término de los ataques del enemigo:
  ```ts
  // Check victory if all enemies died from Thorns reflection or DoTs
  if (workingMonsters.every(m => m.currentHp <= 0)) {
      handleVictoryInternal(workingMonsters);
      return;
  }
  ```

---

### 2.4. BUG-CMB-04: Exploit de Temporizador de 2.5s y Desincronización de `turnCount` (Severidad: ALTA)
* **Archivo Afectado:** [`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts#L970-L1038)
* **Mecánica Implicada:** Temporizador de acción táctica de 2.5 segundos.
* **Causa Raíz:** El hook `useEffect` del bucle de combate tenía en sus dependencias:
  ```ts
  }, [isFighting, activeMonsters, turnQueue, playerHp]);
  ```
  Cada vez que el héroe utilizaba una poción (`usePotion`) o se activaba la regeneración de Vitalidad a mitad de turno, `playerHp` mutaba. Esto provocaba que React destruyera el `setInterval` activo, re-ejecutara el `useEffect`, ejecutara `setTurnCount(prev => prev + 1)` sin que hubiese terminado el turno, y reiniciara `startTime = Date.now()`, devolviendo el temporizador de 2.5s al 100%. Un jugador podía resetear indefinidamente el tiempo de combate o inflar artificialmente los contadores de turnos (activando procs periódicos de `turn_count_multiple`).
* **Solución Implementada:**
  1. Se crearon referencias mutables sincronizadas (`activeMonstersRef` y `playerHpRef`) que permiten consultar y escribir los valores vivos de combate sin forzar re-ejecuciones de efectos.
  2. Se limpiaron las dependencias del hook a:
     ```ts
     }, [isFighting, turnQueue]);
     ```
  Ahora el temporizador de 2.5s desciende de manera continua y constante. Beber una poción o recibir curación regenerativa no interrumpe ni resetea la cuenta regresiva.

---

### 2.5. BUG-UI-01: HP Negativo en Monstruos y Glitch en `HealthBar` (Severidad: MEDIA)
* **Archivos Afectados:** [`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts#L736) y [`components/CombatModal.tsx`](file:///home/antigravity/LoTD-main/components/CombatModal.tsx#L73)
* **Causa Raíz:** Al calcular daño letal o daño overkill (`monsterHp -= dmg`), el valor descendía a números negativos (ej. 15 HP - 95 DMG = -80 HP). Este valor se almacenaba directamente en el estado de `activeMonsters`. En la interfaz, `CombatModal.tsx` formateaba la vida con `{Math.ceil(current)} / {max}`, mostrando `-80 / 150` en la barra de salud.
* **Solución Implementada:**
  - En `useCombatEngine.ts`: Se aplicó acotamiento estricto `monsterHp = Math.max(0, monsterHp - dmg)` tanto para el objetivo directo como para el objetivo secundario de Cleave (`splashRemainingHp = Math.max(0, splashTarget.currentHp - splashDmg)`).
  - En `CombatModal.tsx`: Se blindó la barra de vida para que nunca muestre valores inferiores a cero: `{Math.max(0, Math.ceil(current))} / {max}`.

---

### 2.6. BUG-CMB-03: Mutación Directa de Arreglo en Mecánica Cleave (Severidad: MEDIA)
* **Archivo Afectado:** [`hooks/useCombatEngine.ts`](file:///home/antigravity/LoTD-main/hooks/useCombatEngine.ts#L740-L746)
* **Causa Raíz:** En la versión previa, el daño residual de Cleave asignaba directamente sobre el arreglo de estado `activeMonsters[nextTargetIdx] = { ...splashTarget, ... }`, violando las normas de inmutabilidad de React y generando desincronizaciones de renderizado en combates contra grupos de 2 o 3 monstruos.
* **Solución Implementada:** Se refactorizó para crear una copia inmutable antes de procesar el splash:
  ```ts
  const currentMonsters = [...activeMonstersRef.current];
  ...
  currentMonsters[nextTargetIdx] = { ...splashTarget, currentHp: splashRemainingHp };
  ```

---

### 2.7. BUG-SAV-01: Desincronización de Vida Residual en Carga de Partida (Severidad: MEDIA)
* **Archivo Afectado:** [`App.tsx`](file:///home/antigravity/LoTD-main/App.tsx#L154)
* **Causa Raíz:** `handleLoadGame` restauraba todos los atributos, habilidades y equipamiento guardados, pero omitía actualizar `playerCurrentHp`. Si el jugador cargaba una partida tras haber sido derrotado o dejado con 2 HP en otra sesión/slot, el héroe iniciaba con esa vida residual en lugar de su vida máxima calculada.
* **Solución Implementada:** Se incorporó el restablecimiento automático de salud máxima al cargar el slot:
  ```ts
  const loadedHp = 100 + (data.baseAttributes.vitality * 8) + (data.level * BALANCE.STATS.perLevel.hp);
  setPlayerCurrentHp(loadedHp);
  ```

---

## 3. Verificación de Invariantes y Robustez Matemática

Se sometieron a prueba los límites matemáticos del motor de juego:
1. **Mitigación de Armadura Negativa / Extrema:**
   - `calculateMitigationPercent(-999, 10)` retorna `0%` exacto (sin `NaN` ni amplificaciones erróneas de daño).
   - `calculateMitigationPercent(9999999, 1)` respeta estrictamente el tope asintótico del `80%`.
2. **Generación de Turnos con Agilidad Cero / Negativa:**
   - `generateTurnBatch(0, 0)` se recupera con salvaguarda a un lote válido de turnos mínimos alternos sin bucles infinitos.
3. **Consistencia de la Tríada Yan Ken Po:**
   - Verificada la matriz 3x3 completa:
     - Voluntad vence a Espíritu (WIN)
     - Espíritu vence a Temple (WIN)
     - Temple vence a Voluntad (WIN)
     - Inversas (LOSE) y posturas idénticas (TIE) con 100% de coherencia.

---

## 4. Estado de Integración y Despliegue

1. **Compilación TypeScript:** `npx tsc --noEmit` completado con código de salida **0** (0 errores de tipos en todo el proyecto).
2. **Bundle de Producción:** `npm run build` ejecutado exitosamente con Vite 6.4.5 (`dist/assets/index-BdQ-RL8p.js` de 630 kB).
3. **Artefacto Standalone Actualizado:** [`Lord_of_the_Dungeon.html`](file:///home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/Lord_of_the_Dungeon.html) regenerado con el paquete inlined completo.
4. **Harness Automatizado:** [`scripts/playtest_bugs_v2.ts`](file:///home/antigravity/LoTD-main/scripts/playtest_bugs_v2.ts) disponible en el repositorio para regresiones futuras.
