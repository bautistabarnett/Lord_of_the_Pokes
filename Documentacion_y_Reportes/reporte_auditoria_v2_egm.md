# Reporte Consolidado de Auditoría EGM: Versión 2 (Lord of the Dungeon)

**Documento Auditado:** `Documentacion_y_Reportes/especificacion_arquitectura_v2.md`  
**Fecha:** 2026-11-09  
**Revisores Involucrados:**
- **Skeptical Architect (Zoom-Out)**: Arquitectura de alto nivel, simplicidad, anti-weeds y reuso.
- **Inventive Catalyst (TRIZ)**: Eliminación de contradicciones y falsos compromisos técnicos.
- **Comprehension Goldfish**: Claridad, autosuficiencia, consistencia conceptual y flujo.
- **Design Critic**: Solidez de diseño lúdico, balance, riesgos no mitigados y consistencia matemática.
- **Structural Auditor**: Cumplimiento del estándar de especificación, jerarquía y formato.
- **Implementation Readiness**: Accionabilidad técnica, contratos de tipos y dependencias de ejecución.
- **Codebase Details**: Drift entre especificación y código real implementado.

---

## 1. Resumen Ejecutivo de la Auditoría

La auditoría valida que la Versión 2 introduce una evolución mecánica positiva al reemplazar posturas pasivas por un sistema interactivo tipo *Yan Ken Po* y reestructurar la economía de botín. Sin embargo, la auditoría identificó **4 Bloqueadores arquitectónicos**, **6 Deficiencias Mayores** y **4 Observaciones Menores** que deben resolverse para garantizar la coherencia entre el diseño teórico y el motor en producción.

Los tres hallazgos críticos son:
1. **Desincronización del Modelo de Turnos**: La especificación describía un choque simultáneo bidireccional, mientras que el motor opera con una cola de turnos asincrónica por iniciativa (ATB).
2. **Latencia Forzada vs. Fluidez de Combate**: El documento indicaba erróneamente que tras seleccionar una postura el jugador debía esperar obligatoriamente el fin del temporizador de 2.5s, lo cual genera tiempos muertos inaceptables en turnos consecutivos por agilidad.
3. **Omisión de Botín en el Plan Detallado**: El rebalance de drops y afijos de la Sección 4 no estaba reflejado en el plan de implementación detallado.

---

## 2. Matriz de Trazabilidad de Hallazgos

| ID | Severidad | Dimensión / Subsistema | Origen (Revisores) | Estado / Recomendación |
| :--- | :---: | :--- | :--- | :--- |
| **B1** | 🔴 Blocker | Modelo de Turnos vs Choque Simultáneo | Zoom-Out #1, Design Critic #1, Inventive #3 | Reestructurar la especificación para evaluar la ventaja de postura por evento de ataque (atacante vs defensor). |
| **B2** | 🔴 Blocker | Ritmo de Combate y Temporizador | Zoom-Out #4, Design Critic #2, Inventive #2, Readiness #1 | Formalizar que el click ejecuta la acción inmediatamente; el temporizador de 2.5s es solo un timeout de inactividad. |
| **B3** | 🔴 Blocker | Omisión del Plan de Botín en Implementación | Comprehension #1, Structural #1 | Agregar arquitectura de `services/gameLogic.ts` y afijos al plan detallado. |
| **B4** | 🔴 Blocker | Estándar de Especificación (Alternativas) | Structural #1 | Incorporar la sección obligatoria "Evaluación de Alternativas Rechazadas". |
| **M1** | 🟡 Major | Intenciones Ocultas y Espiral de Azar (RNG) | Inventive #1, Design Critic #3, Readiness #6 | Añadir señales visuales (auras/mensajes) para bosses y suprimir el resaltado de botones si la postura está oculta. |
| **M2** | 🟡 Major | Code Drift en Tipos, Retornos y Estados | Codebase Details #1-4, Readiness #2 | Corregir `'WIN' \| 'LOSE' \| 'TIE'`, `combatStance`, `triadConfig` y dirección del temporizador (100 -> 0 ms). |
| **M3** | 🟡 Major | Combates Multi-Enemigo (1 vs Muchos) | Design Critic #4, Readiness #4 | Formalizar que el ataque del héroe evalúa solo a `selectedTargetId`, y la rotación del 45% se restringe al atacante. |
| **M4** | 🟡 Major | Estrategia Estacionaria por Markov Asimétrico | Design Critic #5 | Evitar que los monstruos mantengan 55% de postura estática fija; incorporar patrones tácticos por arquetipo. |
| **M5** | 🟡 Major | Fórmula de Magic Find y Techo Asintótico | Zoom-Out #3, Design Critic #6 | Sincronizar la fórmula documentada con la función real de retornos decrecientes en `gameLogic.ts`. |
| **M6** | 🟡 Major | Ausencia de Riesgos y No-Objetivos | Structural #2, Structural #3 | Añadir explícitamente secciones de "Riesgos y Mitigaciones" y "Non-Goals". |
| **N1** | 🟢 Nit | Ambigüedad sobre Temple como postura "defensiva" | Design Critic #8 | Aclarar que la tríada es simétrica; ninguna postura otorga defensa pasiva global por sí misma. |
| **N2** | 🟢 Nit | Nomenclatura Formal de Atributos | Design Critic #9 | Utilizar `STRENGTH`, `DEXTERITY`, `INTELLIGENCE`, `VITALITY`. |
| **N3** | 🟢 Nit | Formato de Tablas de Botín y Afijos | Structural #5 | Convertir listas con viñetas en tablas Markdown estructuradas. |
| **N4** | 🟢 Nit | Textos Reales de Banner en UI | Codebase Details #6 | Sincronizar cadenas literales (`⚔️ ¡TRIUNFO!`, `⚠️ DESVENTAJA`, `⚖️ CHOQUE PAREJO`). |

---

## 3. Plan de Acción y Remediación Inmediata

Para subsanar las deficiencias detectadas y alinear el documento con el código real desplegado, se ejecutarán las siguientes modificaciones sobre `Documentacion_y_Reportes/especificacion_arquitectura_v2.md`:

### Acción 1: Reescritura del Modelo de Combate y Temporizador
- Definir con precisión que el combate opera por turnos individuales (`isPlayerTurn`).
- Especificar que al seleccionar una postura se ejecuta inmediatamente `executeStanceAction`, y que si el temporizador de 2.5s expira, se resuelve automáticamente con la postura activa.
- Eliminar la afirmación de que el jugador debe esperar a que el temporizador termine.

### Acción 2: Formalización de Choques y Parámetros del Motor
- Sincronizar las fórmulas exactas:
  - Multiplicador de daño del atacante: `WIN = 1.35x`, `TIE = 1.00x`, `LOSE = 0.60x`.
  - Modificador de mitigación en defensor: `winDefenseMitigationBonus = 0.20`, `loseDefensePenaltyBonus = 0.15`.
- Corregir el tipo exportado `TriadClashResult = 'WIN' | 'LOSE' | 'TIE'`.
- Especificar la interacción multi-objetivo contra `selectedTargetId`.

### Acción 3: Mitigación de Intenciones Ocultas y Filtraciones de UI
- Especificar que si `isStanceHidden === true`, los botones de postura del jugador en `CombatModal` suprimen el resaltado contextual de ventaja/desventaja para evitar fugas de información.
- Documentar el sistema de pistas visuales o deducción por arquetipo.

### Acción 4: Completitud del Plan de Implementación de Botín
- Añadir la sección técnica en el Plan Detallado cubriendo `services/gameLogic.ts`, `services/gameBalance.ts` y `components/SmugglingModal.tsx`.
- Sincronizar la fórmula de `effectiveMF` con la implementada en producción.

### Acción 5: Conformidad Estructural y Secciones Faltantes
- Añadir sección de **Alternativas Rechazadas**.
- Añadir sección de **Objetivos Fuera de Alcance (Non-Goals)**.
- Añadir sección de **Riesgos, Límites y Mitigaciones**.
- Convertir tablas de probabilidades de drop y afijos a formato Markdown.
