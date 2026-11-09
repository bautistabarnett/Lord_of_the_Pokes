# Goldfish Annotated Review Report
Status: resolved

**Target:** `/home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md` (Lines 1–158)
**Date:** 2026-11-09

## Prioritized Findings & AI Suggestions

### Issue 1 [Desincronización del Modelo de Turnos] [`egm-zoom-out` / `egm-design` / `egm-inventive-catalyst`] - Severity: Blocker
*   **Affected Scope:** [Lines 36–49, 139–141](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L36-L49) (Sección 2.2 y Sección 4.4)
*   **Discrepancy Description:** La especificación define el choque de posturas como una colisión simultánea donde ambas entidades se dañan y mitigan a la vez, contradiciendo el motor de combate que opera con una cola asincrónica secuencial por iniciativa (ATB).
*   **Rationale:** En un sistema de turnos secuenciales, si el jugador actúa, solo el jugador inflige daño. Aplicar simultáneamente daño entrante y saliente produce desincronizaciones de estado y ambigüedades de cálculo.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Alinear la especificación con la arquitectura real de `hooks/useCombatEngine.ts`: la ventaja de postura se evalúa por evento de ataque entre la postura del atacante activo y la postura del defensor objetivo.
*   ***Proposed Edit:***
    *   Location: Sección 2.2 y Sección 4
    *   Change: Redefinir `resolveTriadClash(attackerStance, defenderStance)` como evaluación contextual por evento de golpe, donde el atacante con ventaja multiplica su daño saliente por 1.35x y reduce la mitigación del defensor, y en el turno del monstruo se evalúa su ataque contra la postura activa del héroe.

---

### Issue 2 [Latencia Forzada y Contradicción del Temporizador] [`egm-zoom-out` / `egm-design` / `egm-implementation-readiness`] - Severity: Blocker
*   **Affected Scope:** [Lines 57–58, 136–138](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L57-L58) (Sección 3.1 y Sección 4.4)
*   **Discrepancy Description:** El documento afirmaba que presionar un botón de postura bloquea la elección pero obliga al jugador a esperar a que expire el temporizador de 2.5s para no interrumpir animaciones.
*   **Rationale:** Esta regla impone tiempos muertos de 2.5s a 7.5s cuando un héroe con alta agilidad encadena turnos consecutivos, destruyendo el dinamismo del combate y contradiciendo el código implementado donde pulsar la postura ejecuta de inmediato el turno.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Formalizar el modelo de compromiso activo implementado en `useCombatEngine.ts`: el click del jugador dispara inmediatamente la acción (`executeStanceAction`), y el temporizador de 2.5s opera únicamente como un límite máximo de inactividad que ejecuta la acción por defecto si el jugador no responde a tiempo.
*   ***Proposed Edit:***
    *   Location: Sección 3.1 y Sección 4
    *   Change: Sustituir la espera obligatoria por la regla de resolución inmediata al click con timeout de 2.5s para autodisparo.

---

### Issue 3 [Omisión del Plan de Botín en Implementación] [`egm-comprehension` / `egm-structural`] - Severity: Blocker
*   **Affected Scope:** [Lines 74–93 vs 96–158](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L74-L93) (Sección 4 vs Detailed Implementation Plan)
*   **Discrepancy Description:** La Sección 4 define probabilidades de drop, retornos decrecientes de `magicFind` y presupuestos de afijos, pero el Plan de Implementación Detallado omitió por completo las especificaciones técnicas de estos módulos.
*   **Rationale:** El plan de implementación debe ser exhaustivo y cubrir todos los subsistemas presentados en la especificación de producto.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Integrar una subsección técnica detallada para el generador de botín y balance en `services/gameLogic.ts`, `services/gameBalance.ts` y `components/SmugglingModal.tsx`.
*   ***Proposed Edit:***
    *   Location: Detailed Implementation Plan (nueva Sección 7)
    *   Change: Agregar arquitectura de generación de loot, curvas de MF y presupuestos de afijos.

---

### Issue 4 [Sección Obligatoria de Alternativas Rechazadas] [`egm-structural`] - Severity: Blocker
*   **Affected Scope:** [Lines 1–95](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L1-L95) (Feature Spec Root)
*   **Discrepancy Description:** Ausencia de la sección obligatoria "Evaluación de Alternativas Rechazadas" exigida por el estándar de diseño.
*   **Rationale:** Toda especificación formal debe registrar las alternativas exploradas y los motivos técnicos de su descarte.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Documentar las alternativas descartadas: 1) Menú estático por turnos sin temporizador; 2) Sistema de 5 elementos; 3) Modificadores pasivos numéricos estáticos.
*   ***Proposed Edit:***
    *   Location: Nueva Sección 5 en la especificación
    *   Change: Redactar la sección de "Alternativas Consideradas y Descartadas".

---

### Issue 5 [Intenciones Ocultas y Filtración de UI] [`egm-inventive-catalyst` / `egm-design` / `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 66–70, 146–148](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L66-L70) (Sección 3.2 y Sección 5)
*   **Discrepancy Description:** Ocultación total de postura en jefes (60% con `?`) combinada con rotación del 45% convierte el combate en azar puro. Además, si los botones de la UI muestran ventaja/desventaja contra un enemigo oculto, filtran la información.
*   **Rationale:** Debe existir contrajuego táctico (deducción por perfil arquetípico o señales visuales), y la UI debe suprimir estados de ventaja si la postura está oculta.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Documentar la supresión de pistas de ventaja en UI cuando `isStanceHidden === true`, y añadir telegrafiado de intenciones mediante auras y registro en el combate.
*   ***Proposed Edit:***
    *   Location: Sección 3.2 y Sección 5
    *   Change: Formalizar la regla de anonimización visual estricta en UI y pistas contextuales para jefes.

---

### Issue 6 [Code Drift en Constantes, Tipos y Funciones] [`egm-codebase-details` / `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 114–120, 133, 136–138](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L114-L120) (Detailed Implementation Plan)
*   **Discrepancy Description:** Discrepancias directas entre la especificación y el código TypeScript:
    1. Retornos `'win' | 'loss' | 'tie'` vs tipo canónico `TriadClashResult = 'WIN' | 'LOSE' | 'TIE'`.
    2. Constantes sueltas vs objeto `BALANCE.COMBAT.triadConfig`.
    3. Estado `playerStance` vs `combatStance`.
    4. Temporizador cuenta hacia abajo (100 -> 0) en ticks de 50 ms.
*   **Rationale:** El drift entre documentación y código genera confusión y errores en pruebas automatizadas.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Alinear todos los nombres, tipos y constantes con la implementación exacta del código.
*   ***Proposed Edit:***
    *   Location: Detailed Implementation Plan Secciones 1, 2, 4
    *   Change: Actualizar a `TriadClashResult`, `BALANCE.COMBAT.triadConfig`, `combatStance` y temporizador descendente de 50 ms.

---

### Issue 7 [Combates Multi-Enemigo (1 vs Muchos)] [`egm-design` / `egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 21–49, 141](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L21-L49) (Sección 2 y Sección 4)
*   **Discrepancy Description:** La mecánica estaba descrita asumiendo combates 1v1, sin especificar cómo interactúan las posturas contra múltiples enemigos (hasta 3 simultáneos).
*   **Rationale:** Debe definirse con precisión contra quién choca el ataque del jugador y cómo se aplica la rotación de postura.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Especificar que el ataque del jugador evalúa su postura contra `selectedTargetId`. Durante los ataques enemigos, cada atacante evalúa su propia postura contra la postura activa del jugador. La rotación de postura del 45% se ejecuta únicamente sobre el monstruo que completó su turno.
*   ***Proposed Edit:***
    *   Location: Sección 2.2 y Sección 4.4
    *   Change: Documentar reglas de combate multi-objetivo.

---

### Issue 8 [Fórmula de Magic Find y Techo Asintótico] [`egm-zoom-out` / `egm-design`] - Severity: Major
*   **Affected Scope:** [Lines 83–86](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L83-L86) (Sección 4.2)
*   **Discrepancy Description:** La fórmula de `effectiveMF` propuesta en el borrador no coincide con la función matemática implementada en `services/gameLogic.ts`.
*   **Rationale:** Mantener fórmulas inconsistentes rompe la trazabilidad del balance de botín.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Sustituir la fórmula por la implementada: `effectiveMultiplier = 1 + (safeMf / (safeMf + 100)) * 0.75`.
*   ***Proposed Edit:***
    *   Location: Sección 4.2
    *   Change: Documentar la fórmula matemática real y su integración en `calculateLootDrop`.

---

### Issue 9 [Secciones de Riesgos, Límites y No-Objetivos] [`egm-structural`] - Severity: Major
*   **Affected Scope:** [Lines 7–18](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L7-L18) (Sección 1)
*   **Discrepancy Description:** Falta de secciones explícitas de "Non-Goals" (objetivos fuera de alcance) y "Riesgos, Límites y Mitigaciones".
*   **Rationale:** Son secciones obligatorias del estándar de arquitectura para acotar el alcance y planificar contingencias.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Incorporar las subsecciones correspondientes en el documento.
*   ***Proposed Edit:***
    *   Location: Sección 1 y Sección 6
    *   Change: Añadir Non-Goals y tabla de Riesgos/Mitigaciones.

---

### Issue 10 [Nits: Formato de Tablas, Terminología y Nomenclatura] [`egm-structural` / `egm-design` / `egm-codebase-details`] - Severity: Nit
*   **Affected Scope:** [Lines 76–93, 122, 145–147](file:///home/antigravity/LoTD-main/Documentacion_y_Reportes/especificacion_arquitectura_v2.md#L76-L93)
*   **Discrepancy Description:** Listas con viñetas en datos multidimensionales, mención imprecisa de Temple como postura pasivamente defensiva, y discrepancias menores de textos de banner en UI.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Mejorar la legibilidad con tablas formales Markdown, nomenclatura de atributos `STRENGTH`, `DEXTERITY`, `INTELLIGENCE`, `VITALITY`, y textos literales de la UI (`⚔️ ¡TRIUNFO! +35% DMG`).
*   ***Proposed Edit:***
    *   Location: Secciones 2, 4 y 5
    *   Change: Convertir a tablas Markdown y corregir textos.
