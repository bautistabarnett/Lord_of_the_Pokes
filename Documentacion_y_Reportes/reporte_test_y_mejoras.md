# Reporte de Diagnóstico y Test Integral de la Aplicación

Se ejecutó una batería de pruebas automatizadas y simulaciones headless de 10,000 tiradas y simulaciones de combate Monte Carlo en **Loot of the Dungeon (LoTD)**. Este informe detalla los hallazgos técnicos, el análisis de balance y las oportunidades de mejora identificadas.

---

## 1. Resultados de las Pruebas Automatizadas

| Batería de Pruebas | Muestra / Alcance | Resultado | Estado |
| :--- | :--- | :--- | :--- |
| **Integridad del Árbol de Habilidades** | 57 pasivas, 5 sets, 3 sinergias, 7 maledicts | 0 dependencias rotas, 0 referencias circulares | **Óptimo (100%)** |
| **Generación de Monstruos & Sprites** | 780 monstruos (6 biomas $\times$ niveles 1 a 25) | 0 valores NaN, 100% sprites GIF vinculados | **Óptimo (100%)** |
| **Curva Asintótica de Armadura** | 9 casos (0 a 999,999 de armadura) | Reducción suave del 0% al 80% (tope seguro) | **Óptimo (100%)** |
| **Economía y Drop Rate** | 10,000 tiradas de loot simuladas | 42.4% drop rate (47% Común, 40% Mag, 11% Raro, 1.9% Único) | **Balanceado** |
| **Simulaciones de Combate (Monte Carlo)** | 100 combates por arquetipo (Lvl 1, 5, 10, 15) | Disparidad crítica entre tanques y atacantes sin equipo | **Hallazgo Crítico** |

---

## 2. Hallazgos Críticos Identificados

### Hallazgo 1: Desbalance Extremo de HP Inicial del Héroe vs. Monstruos Nivel 1
- **El problema**: La fórmula de HP del jugador es:
  $$\text{MaxHP}_{\text{jugador}} = (\text{Vitalidad} \times 5) + (\text{Nivel} \times 10)$$
  Con 10 de Vitalidad base a Nivel 1, el héroe comienza con **solo 60 puntos de vida**.
  Sin embargo, un monstruo Común de Nivel 1 se genera con:
  $$\text{MaxHP}_{\text{monstruo}} = (12 \times 8) + (1 \times 20) = \mathbf{116\text{ HP}}$$
- **Consecuencia**: El monstruo base tiene casi el **doble de vida** que el héroe.
  Si el jugador se enfrenta a un enemigo de rareza *Uncommon* (150 HP, 13 DMG) o *Rare* (208 HP, 18 DMG) —los cuales aparecen con un 40% de probabilidad desde el nivel 1—, el héroe muere en solo 3 o 4 turnos sin margen de respuesta si no eligió habilidades puramente defensivas (Sentinel).

### Hallazgo 2: Spawn Prematuro de Afijos y Rarezas Extremas (*Unfair Spikes*)
- En la zona de inicio (`Tristram Ruins`, área de nivel 1), el algoritmo de exploración utiliza la misma tabla de rarezas que en zonas avanzadas. Es posible encontrar monstruos *Épicos* o *Míticos* en la primera batalla, frustrando el primer contacto del jugador.
- **Solución recomendada**: Restringir la rareza máxima de los monstruos según el nivel del área (`area.level`), reservando los monstruos *Mythic/Unique* exclusivamente para el Boss o zonas de nivel 10+.

### Hallazgo 3: Clic Derecho Desactivado en el Inventario (QoL)
- En `components/InventorySlot.tsx`, el slot cuenta con el evento `onContextMenu` para capturar el clic derecho, pero en `App.tsx` la función asignada es un callback vacío `() => {}`.
- **Impacto UX**: Los jugadores de juegos de rol por turnos y ARPG esperan instintivamente hacer clic derecho para equipar/desequipar un objeto al instante, o para venderlo inmediatamente si la ventana del comerciante está abierta. Actualmente se requiere arrastrar obligatoriamente (*Drag & Drop*) o hacer clic izquierdo que a veces se confunde con el modo inspección.

### Hallazgo 4: Ausencia Total de Feedback Sonoro (Audio Inmersivo)
- La aplicación carece por completo de efectos de sonido.
- **Oportunidad**: Usar el sintetizador procedural nativo **Web Audio API** (sin librerías pesadas ni descargas externas de audio). Se pueden generar sonidos retro/arcade de alta fidelidad:
  - Sonido de tajo de espada al atacar.
  - Impacto contundente al recibir golpe.
  - Campaneo metálico al caer o recoger oro/objetos.
  - Fanfarria al subir de nivel o triunfar en combate.

### Hallazgo 5: Tedio al Vender Ítems en el Mercader (*Sell Friction*)
- Tras explorar varias veces, el inventario se llena de 20-30 objetos comunes y mágicos que el jugador no necesita.
- Para venderlos, el usuario debe arrastrar o hacer clic en cada uno individualmente hacia la zona de *staging*.
- **Oportunidad**: Un botón de **"Vender Todos los Comunes"** (*Quick Sell Junk*) en la pestaña del comerciante que traslade en un solo clic todo el loot blanco al canje.

### Hallazgo 6: Reseteo de Puntos de Árbol de Habilidades Incompleto
- En `App.tsx`, el botón de reseteo (`handleRespecAttributes`) devuelve los puntos de atributos base (Fuerza, Destreza, Inteligencia, Vitalidad), pero **no devuelve los puntos de habilidades pasivas gastados en el árbol**. Si el jugador desbloqueó ramas de piromancia y luego quiere probar criomancia o sigilo, queda bloqueado sin poder redistribuir sus puntos.

---

## 3. Matriz de Priorización de Mejoras

```mermaid
quadrantChart
    title Priorización de Mejoras en LoTD
    x-axis Baja Complejidad --> Alta Complejidad
    y-axis Bajo Impacto --> Alto Impacto
    quadrant-1 Tareas Estratégicas
    quadrant-2 Victorias Rápidas (Quick Wins)
    quadrant-3 Mejoras Secundarias
    quadrant-4 Reevaluar
    "Clic Derecho para Equipar/Vender": [0.2, 0.9]
    "Corrección de HP Base del Héroe": [0.15, 0.95]
    "Botón Vender Chatarra (Quick Sell)": [0.25, 0.85]
    "Escalado de Rareza de Mobs por Área": [0.3, 0.88]
    "Respec de Puntos del Árbol de Habilidades": [0.35, 0.8]
    "Audio Procedural Web Audio API": [0.45, 0.82]
    "Animación de Impacto y Sacudida (Screen Shake)": [0.4, 0.75]
    "Sistema de Replays o Estadísticas Históricas": [0.8, 0.4]
```

---

## 4. Detalle de Mejoras Recomendadas

### 🎯 Bloque 1: Jugabilidad y Balance Inmediato (Quick Wins) - ✅ COMPLETADO
1. **Rebalanceo de Vida Base del Héroe**:
   - Cambiado a $\text{MaxHP} = 100 + (\text{Vitalidad} \times 8) + (\text{Nivel} \times 15)$ (Héroe inicia con 195 HP).
2. **Filtro de Rareza Temprana en Monstruos**:
   - Monstruos en niveles 1-3 restringidos a Common, Uncommon y Rare.
   - Sprites animados multiframe integrados para los 50 monstruos y 50 variantes shiny.

### ⚡ Bloque 2: Calidad de Vida (QoL) en Inventario y Tienda - ⏳ PENDIENTE
3. **Clic Derecho Funcional**:
   - En modo normal: clic derecho equipa o desequipa al instante.
   - En modo mercader (pestaña venta): clic derecho envía el ítem directamente a la cesta de venta.
4. **Botón "Vender Comunes" (Quick Sell Junk)**:
   - Añadir un botón rápido en el mercader para vaciar automáticamente todos los ítems de rareza `Common` en la venta.
5. **Reembolso Completo de Árbol de Habilidades**:
   - Permitir reembolsar también los `skillPoints` invertidos en el árbol para fomentar la experimentación de builds (piromante, tanque, asesino, criomante).

### 🔊 Bloque 3: Inmersión y Feedback Sensorial
6. **Módulo de Audio Procedural (`soundService.ts`)**: *(Pausado a solicitud del usuario)*
7. **Efecto de Sacudida de Pantalla (Screen Shake)**: - ✅ COMPLETADO
   - Sistema de sacudida en 2 intensidades:
     - **Screen Shake Pesado (`animate-screen-shake-heavy`)**: Se activa ante golpes críticos (`CRIT`), ejecuciones letales o daño masivo ($\ge 25$–$30$ HP), acompañado de un sutil destello carmesí (*vignette flash*).
     - **Screen Shake Ligero (`animate-screen-shake-light`)**: Se activa con impactos regulares para otorgar peso físico sin distorsionar la interfaz ni generar mareo.
