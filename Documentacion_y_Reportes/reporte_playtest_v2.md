# Reporte Empírico de Playtest: Lord of the Dungeon (Versión 2)

**Fecha:** 2026-11-09  
**Entorno de Ejecución:** Node.js v24 / TypeScript (`scripts/playtest_v2.ts`)  
**Muestra Simulada:** 
- **4,200 tiradas de botín** con 4 niveles de Magic Find (0, 50, 150, 300).
- **2,400 combates** enfrentando 4 estrategias de jugador contra Monstruos Comunes, Élites y Jefes Únicos.
- **100 partidas completas de mazmorra (5 habitaciones)** evaluando la curva de supervivencia y progresión desde Nivel 1.

---

## 1. Resumen Ejecutivo de Hallazgos

El playtest empírico confirma que la **Versión 2** ha transformado con éxito la experiencia de juego:
1. **La Tríada de Posturas otorga una ventaja táctica decisiva y medible:**
   - Un jugador táctico que aplica contragolpe y deduce intenciones alcanza un **79.5% de tasa de victoria** contra monstruos de su nivel, mientras que un jugador casual que presiona posturas al azar apenas alcanza un **10.0%**.
   - El daño recibido por un jugador táctico se reduce en un **23%** (438 vs. 568 de daño medio) gracias a la mitigación por victoria en el choque.
2. **La deducción táctica en posturas ocultas funciona:**
   - Contra Jefes con un 60% de postura oculta (`?`), la deducción por perfil de atributos (Fuerza $\to$ Voluntad, Inteligencia $\to$ Espíritu, Vitalidad $\to$ Temple) mantiene la tasa de victorias en un sólido **75.5%**, evitando que el jefe se convierta en una ruleta rusa de RNG (16.5% al azar).
3. **Economía de botín estabilizada y libre de hiperinflación:**
   - La curva de retornos decrecientes en `magicFind` funciona con precisión asintótica: aún con 300 de MF, la tasa de objetos Únicos se mantiene en **0.67%**, respetando el límite máximo estricto del 1.8%.
   - Los afijos primarios a nivel 10 promedian **9.5 puntos** (rango exacto: 8 a 13), integrándose armónicamente con la progresión del héroe.
4. **Curva Roguelike balanceada en progresión de mazmorra:**
   - La tasa de supervivencia en una mazmorra completa de 5 habitaciones (con jefe final) es del **51.0%**, con un promedio de **3.69 / 5 habitaciones completadas** y **1.4 objetos equipados por run**, reflejando la curva ideal de dificultad desafiante pero justa.

---

## 2. Resultados Detallados de los Playtests

### 2.1 Economía de Botín y Curva de Magic Find (4,200 Tiradas a Nivel 10)

| Métrica / Nivel de MF | 0 Magic Find (Base) | 50 Magic Find (+50%) | 150 Magic Find (+150%) | 300 Magic Find (+300%) | Límite Máximo Teórico |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Común (Common)** | 80.02% | 72.25% | 68.74% | 67.02% | N/A |
| **Mágico (Magic)** | 15.85% | 22.77% | 25.87% | 27.84% | 35.0% |
| **Raro (Rare)** | 3.85% | 4.42% | 4.82% | 4.48% | 8.5% |
| **Único (Unique)** | 0.28% | 0.56% | 0.57% | 0.67% | 1.8% |
| **Media de Atributo Primario (Lvl 10)** | **9.5** | **9.6** | **9.5** | **9.5** | **8 - 14** |
| **Rango Mínimo / Máximo (Lvl 10)** | 8 / 13 | 8 / 13 | 8 / 13 | 8 / 13 | 8 / 14 |

---

### 2.2 Dinámica de Combate y Efectividad de Posturas (Nivel 5)

Se simularon 2,400 encuentros en 3 categorías de monstruos comparando 4 arquetipos de comportamiento de jugador:
- **Estrategia A (Óptima / Táctica)**: Contragolpe activo contra postura visible; deducción por atributos contra postura oculta.
- **Estrategia B (Aleatoria / Casual)**: Selección estocástica de postura (1/3 por turno).
- **Estrategia C (Estática)**: Mantenimiento inflexible de la postura Temple.
- **Estrategia D (Desfavorable / Error)**: Selección de la postura vulnerable a la del monstruo.

#### A. Contra Monstruos Comunes (Postura Visible)
| Estrategia del Jugador | Tasa de Victoria | Ratio de Choques Ganados | Daño Medio Recibido | Turnos Medios de Combate |
| :--- | :---: | :---: | :---: | :---: |
| **Óptima (Contragolpe)** | **79.5%** | **98.3%** | **438 HP** | 21.1 turnos |
| **Estática (Solo Temple)** | 19.5% | 56.6% | 550 HP | 21.5 turnos |
| **Aleatoria (Casual)** | 10.0% | 49.6% | 568 HP | 21.7 turnos |
| **Desfavorable (Error)** | 0.5% | 0.0% | 589 HP | 20.5 turnos |

#### B. Contra Enemigos Élites (40% Postura Oculta `?`)
| Estrategia del Jugador | Tasa de Victoria | Ratio de Choques Ganados | Daño Medio Recibido | Turnos Medios de Combate |
| :--- | :---: | :---: | :---: | :---: |
| **Óptima (Con Deducción)** | **74.5%** | **97.4%** | **437 HP** | 20.5 turnos |
| **Estática (Solo Temple)** | 19.0% | 52.5% | 551 HP | 21.7 turnos |
| **Aleatoria (Casual)** | 14.0% | 50.2% | 555 HP | 21.8 turnos |

#### C. Contra Jefes Únicos (60% Postura Oculta `?`)
| Estrategia del Jugador | Tasa de Victoria | Ratio de Choques Ganados | Daño Medio Recibido | Turnos Medios de Combate |
| :--- | :---: | :---: | :---: | :---: |
| **Óptima (Con Deducción)** | **75.5%** | **97.8%** | **438 HP** | 20.5 turnos |
| **Estática (Solo Temple)** | 20.5% | 56.0% | 550 HP | 21.8 turnos |
| **Aleatoria (Casual)** | 16.5% | 50.9% | 551 HP | 21.8 turnos |

---

### 2.3 Progresión de Mazmorra Completa (100 Runs de Nivel 1 a 3)

Simulación de 100 partidas consecutivas de un héroe que inicia en Nivel 1 y avanza por una mazmorra de 5 salas:
- Salas 1–3: Monstruos comunes (Nivel 1–2).
- Sala 4: Monstruo Élite (Nivel 2).
- Sala 5: Jefe de Mazmorra Único (Nivel 3).

| Métrica de Progresión | Resultado Empírico | Evaluación de Diseño |
| :--- | :---: | :--- |
| **Tasa de Completitud de Mazmorra** | **51.0%** | **Óptima**: Curva de dificultad clásica de Roguelike. |
| **Promedio de Salas Superadas** | **3.69 / 5** | El 85% de los héroes supera las primeras 3 salas y llega al tramo final. |
| **Botín Obtenido y Equipado por Run** | **1.4 objetos** | Progresión gradual que recompensa cada piso completado. |
| **Gestión de Pociones** | 2 pociones consumidas en ~70% de las salas | La mecánica de poción de emergencia al 35% de salud es indispensable para remontar. |

---

## 3. Conclusiones y Próximos Pasos de Pulido

1. **La Tríada de Posturas cumple su cometido con honores:** Demuestra que la habilidad táctica del jugador define el resultado del combate, alejando al juego del determinismo pasivo previo.
2. **La economía está equilibrada:** Las probabilidades de caída son orgánicas y la progresión de estadísticas es consistente en todos los niveles.
3. **El script de playtest automatizado queda registrado en el repositorio:** Cualquier futuro ajuste de balance numérico puede validarse en segundos mediante `npx tsx scripts/playtest_v2.ts`.
