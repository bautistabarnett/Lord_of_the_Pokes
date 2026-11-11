export interface TutorialSection {
  id: string;
  title: string;
  category: 'triad' | 'reaction' | 'maledicts' | 'attributes' | 'exploration' | 'items';
  categoryLabel: string;
  categoryIcon: string;
  icon: string;
  badge?: string;
  addedInVersion?: string;
  summary: string;
  content: {
    subtitle?: string;
    paragraphs: string[];
    bullets?: { label: string; text: string; icon?: string }[];
    callout?: { type: 'tip' | 'warning' | 'info'; text: string };
  };
}

export const TUTORIAL_CATEGORIES = [
  { id: 'all', label: 'Todo el Manual', icon: '📜' },
  { id: 'triad', label: 'Tríada de Posturas', icon: '⚔️' },
  { id: 'reaction', label: 'Reacción Rápida', icon: '🤺' },
  { id: 'maledicts', label: 'Maledicts & Jefes', icon: '💀' },
  { id: 'attributes', label: 'Atributos & Héroe', icon: '💪' },
  { id: 'exploration', label: 'Exploración & Zonas', icon: '🗺️' },
  { id: 'items', label: 'Equipo & Economía', icon: '🎒' },
] as const;

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: 'triad_mechanics',
    title: 'La Tríada de Posturas Tácticas',
    category: 'triad',
    categoryLabel: 'Tríada de Posturas',
    categoryIcon: '⚔️',
    icon: '🔺',
    badge: 'Mecánica Central',
    addedInVersion: 'v2.0',
    summary: 'El núcleo de cada turno en Lord of the Dungeon: una dinámica táctica de tres posturas con bonificaciones de daño cruzadas.',
    content: {
      subtitle: 'El Triángulo de Dominio Marcial',
      paragraphs: [
        'En cada turno de batalla, tanto tú como tu enemigo debéis seleccionar una de las tres posturas de combate. Conocer el triángulo de afinidad marcial es la clave para sobrevivir en las mazmorras más profundas.',
        'La postura elegida interactúa según la regla milenaria de dominancia:',
      ],
      bullets: [
        {
          label: '🔴 Voluntad (Will)',
          text: 'Fuerza bruta e ímpetu ofensivo. Domina a Espíritu desgarrando su concentración arcana, pero cede ante la férrea defensa de Temple.',
          icon: '🔴'
        },
        {
          label: '🟣 Espíritu (Spirit)',
          text: 'Canalización arcana y magia mental. Domina a Temple perforando su guardia con energía mística, pero sucumbe ante la agresión directa de Voluntad.',
          icon: '🟣'
        },
        {
          label: '🟢 Temple (Resolve)',
          text: 'Guardia inquebrantable y resiliencia. Bloquea y desgasta a Voluntad neutralizando su empuje, pero es vulnerable a las artes arcanas de Espíritu.',
          icon: '🟢'
        }
      ],
      callout: {
        type: 'info',
        text: 'Multiplicadores de Choque: Ganar el choque otorga +30% de daño infligido y -30% de daño recibido. Perderlo reduce tu daño un 30% e incrementa el daño recibido un 30%. En choque parejo (empate), ambos combatientes infligen daño normal (100%).'
      }
    }
  },
  {
    id: 'turn_timer',
    title: 'Temporizador de Elección y Fatiga',
    category: 'triad',
    categoryLabel: 'Tríada de Posturas',
    categoryIcon: '⚔️',
    icon: '⏱️',
    badge: 'Tiempo Real',
    addedInVersion: 'v2.0',
    summary: 'Dispones de 5 segundos base para decidir tu postura en cada asalto. La indecisión tiene consecuencias.',
    content: {
      subtitle: 'Decisiones bajo Presión',
      paragraphs: [
        'El combate no espera. En cada turno se activa una barra de tiempo de 5 segundos para que selecciones tu postura.',
        'Si el tiempo se agota antes de que elijas:',
      ],
      bullets: [
        {
          label: 'Pérdida Automática del Choque',
          text: 'El enemigo asesta su golpe sin oposición táctica y tu héroe sufre la penalización total por postura perdida.',
          icon: '⚠️'
        },
        {
          label: 'Aceleración por Chronobreaker',
          text: 'Ciertos monstruos con la infamia "Chronobreaker" comprimen tu tiempo de reacción a solo 2.5 segundos, forzando reflejos extremos.',
          icon: '⚡'
        }
      ],
      callout: {
        type: 'tip',
        text: '¡Atento a las animaciones del enemigo! La postura del monstruo se insinúa brevemente antes del golpe, salvo cuando la infamia Trickster nubla tu visión.'
      }
    }
  },
  {
    id: 'quick_reaction',
    title: 'Reacción Rápida: Parada y Finta',
    category: 'reaction',
    categoryLabel: 'Reacción Rápida',
    categoryIcon: '🤺',
    icon: '⚡',
    badge: 'Mecánicas Pasivas',
    addedInVersion: 'v2.0',
    summary: 'Convierte tu velocidad de ataque y destreza en desvíos salvadores (Parry) y rescates tácticos de choque (Feint).',
    content: {
      subtitle: 'La Fisiología de la Velocidad',
      paragraphs: [
        'A diferencia de otros juegos donde la velocidad solo acelera animaciones, en Lord of the Dungeon tu atributo de Velocidad de Ataque (obtenido mediante Destreza y equipo) alimenta dos salvaguardas mecánicas pasivas automáticas:',
      ],
      bullets: [
        {
          label: '🛡️ Parada (Parry) — Escala 1:1 hasta 50%',
          text: 'Por cada 1% de Velocidad de Ataque ganas 1% de probabilidad de Parada (tope: 50%). Cuando se activa, tu héroe interpone su arma y desvía un 35% del daño recibido en cualquier turno.',
          icon: '🛡️'
        },
        {
          label: '🤺 Finta (Feint) — Escala al 60% hasta 35%',
          text: 'Por cada 1% de Velocidad ganas 0.6% de probabilidad de Finta (tope: 35%). Si pierdes el choque de posturas, la Finta se dispara para rescatar el turno: anula la penalización de daño del -30% y devuelves un golpe completo (100% de daño).',
          icon: '🤺'
        }
      ],
      callout: {
        type: 'tip',
        text: 'Una alta Destreza no solo te permite esquivar golpes enteros, sino que asegura que casi 1 de cada 2 golpes entrantes sea amortiguado mediante Parada.'
      }
    }
  },
  {
    id: 'maledicts_traits',
    title: 'Maledicts: Traits Permanentes',
    category: 'maledicts',
    categoryLabel: 'Maledicts & Jefes',
    categoryIcon: '💀',
    icon: '🩸',
    badge: 'Pasivas de Monstruos',
    addedInVersion: 'v2.0',
    summary: 'Poderes malditos perennes que acompañan a las criaturas de élite durante todo el encuentro.',
    content: {
      subtitle: 'Los 5 Rasgos Innatos de la Oscuridad',
      paragraphs: [
        'Los enemigos Raros, Épicos y Jefes pueden ser engendrados con Maledicts permanentes llamados Traits. Sus efectos nunca se apagan:',
      ],
      bullets: [
        {
          label: '🩸 Vampírico (Vampiric)',
          text: 'El monstruo sana el 25% de todo el daño que te inflija en cada asalto.',
          icon: '🩸'
        },
        {
          label: '🛡️ Dama de Hierro (Iron Maiden)',
          text: 'Piel blindada de púas: devuelve el 30% del daño directo recibido de vuelta a tu héroe.',
          icon: '🛡️'
        },
        {
          label: '🔥 Ígneo (Molten Body)',
          text: 'Calor sofocante: aplica una quemadura mágica acumulativa al héroe en cada turno.',
          icon: '🔥'
        },
        {
          label: '⚔️ Verdugo (Executioner)',
          text: 'Letalidad despiadada: si tu salud cae por debajo del 30%, los ataques del monstruo causan +50% de daño crítico.',
          icon: '⚔️'
        },
        {
          label: '🧪 Portador de Peste (Plaguebearer)',
          text: 'Miasma pestilente: corrompe tus pociones y regeneración pasiva, reduciendo su efectividad un 40%.',
          icon: '🧪'
        }
      ],
      callout: {
        type: 'warning',
        text: 'Contra un enemigo con Vampírico o Dama de Hierro, ganar la Tríada de Posturas es imperativo para minimizar el daño que te inflige y curar menos a la bestia.'
      }
    }
  },
  {
    id: 'maledicts_infamies',
    title: 'Maledicts: Infamias Activables',
    category: 'maledicts',
    categoryLabel: 'Maledicts & Jefes',
    categoryIcon: '💀',
    icon: '⏳',
    badge: 'Cooldown Temporal',
    addedInVersion: 'v2.0',
    summary: 'Habilidades especiales activadas por tiempo real con cooldown impredecible gracias a la fluctuación jitter.',
    content: {
      subtitle: 'Las 6 Infamias con Cooldown en Segundos',
      paragraphs: [
        'A diferencia de los Traits, las Infamias son habilidades tácticas que los monstruos activan periódicamente. Su enfriamiento está medido en segundos de tiempo real con una pequeña variación (jitter) para evitar que los turnos sean mecánicamente predecibles.',
        'Regla Sagrada: Solo 1 infamia puede activarse por turno.',
      ],
      bullets: [
        {
          label: '⏳ Chronobreaker (Cooldown: 8s ±1.5s)',
          text: 'Comprime el tiempo de postura del héroe de 5.0s a 2.5s durante 1 turno, obligando a decisiones instantáneas.',
          icon: '⏳'
        },
        {
          label: '🌀 Arcane Shield (Cooldown: 7.5s ±1s)',
          text: 'Crea una barrera mágica equivalente al 20% de la vida máxima del enemigo que dura 2 turnos.',
          icon: '🌀'
        },
        {
          label: '🐺 Predator Stance (Cooldown: 7s ±1.5s)',
          text: 'El monstruo entra en furia cazadora, incrementando su daño un 35% durante 2 turnos.',
          icon: '🐺'
        },
        {
          label: '🪨 Rune Bulwark (Cooldown: 7s ±1s)',
          text: 'Inscribe runas de piedra que reducen todo el daño recibido un 40% durante 2 turnos.',
          icon: '🪨'
        },
        {
          label: '🐢 Adamantine Shell (Cooldown: 10s ±2s)',
          text: 'Se encierra en un caparazón adamantino impenetrable que bloquea el 75% del daño durante 1 asalto.',
          icon: '🐢'
        },
        {
          label: '🌫️ Trickster (Cooldown: 8.5s ±1.5s)',
          text: 'Envuelve la postura del enemigo en una densa niebla ilusoria durante 2 turnos. ¡Debes adivinar o deducir su movimiento!',
          icon: '🌫️'
        }
      ],
      callout: {
        type: 'info',
        text: 'La barra de combate superior muestra las insignias activas de cada Infamia con sus turnos restantes y animaciones de brillo pulsante.'
      }
    }
  },
  {
    id: 'attributes_and_sheet',
    title: 'Atributos Principales y Hoja de Personaje',
    category: 'attributes',
    categoryLabel: 'Atributos & Héroe',
    categoryIcon: '💪',
    icon: '📊',
    badge: 'Desarrollo de Héroe',
    addedInVersion: 'v2.0',
    summary: 'Aprende a distribuir tus puntos al subir de nivel y cómo cada atributo potencia tus estadísticas.',
    content: {
      subtitle: 'Los 4 Pilares del Aventurero',
      paragraphs: [
        'Tu héroe obtiene puntos de atributo al subir de nivel que puedes asignar libremente desde la Hoja de Personaje ubicada de forma permanente en el panel central.',
      ],
      bullets: [
        {
          label: '💪 Fuerza (Strength)',
          text: 'Aumenta el Daño de Armas físicas (+1.5% por punto) y la Armadura base para mitigar impactos.',
          icon: '💪'
        },
        {
          label: '🏹 Destreza (Dexterity)',
          text: 'Aumenta la Velocidad de Ataque, alimentando la probabilidad de Parada y Finta, además de otorgar Evasión.',
          icon: '🏹'
        },
        {
          label: '🔮 Inteligencia (Intelligence)',
          text: 'Aumenta el Poder de Hechizos (+1.5% por punto), la Probabilidad de Crítico y la efectividad de afijos arcanos.',
          icon: '🔮'
        },
        {
          label: '❤️ Vitalidad (Vitality)',
          text: 'Otorga +8 puntos de Vida Máxima directa por punto y aumenta la Regeneración pasiva por turno.',
          icon: '❤️'
        }
      ],
      callout: {
        type: 'tip',
        text: '¿Quieres probar una nueva estrategia? Puedes realizar un Respec completo de atributos en cualquier momento. El coste en oro escala con tu nivel (Nivel × 50g).'
      }
    }
  },
  {
    id: 'exploration_and_bosses',
    title: 'Exploración, Mazmorras y Jefes Supremos',
    category: 'exploration',
    categoryLabel: 'Exploración & Zonas',
    categoryIcon: '🗺️',
    icon: '🏰',
    badge: 'Progresión de Campaña',
    addedInVersion: 'v2.0',
    summary: 'Avanza por las distintas regiones del mapa, sobrevive al ciclo día/noche y derrota a los Jefes Supremos para reclamar sus trofeos.',
    content: {
      subtitle: 'La Conquista de los Dominios',
      paragraphs: [
        'Cada región posee un bioma distintivo (Catacumbas, Bosque Prohibido, Ruinas Olvidadas, etc.) con monstruos que adaptan su nivel y dificultad al del aventurero.',
      ],
      bullets: [
        {
          label: '🗺️ Barra de Progreso del Área (0% a 100%)',
          text: 'Cada victoria en combate o evento de exploración incrementa la barra de progreso de la región actual.',
          icon: '🗺️'
        },
        {
          label: '👑 Overlord Boss al 100%',
          text: 'Al alcanzar el 100% de la zona, el próximo encuentro será el Jefe Supremo de la región. Posee doble vitalidad, rareza Única y múltiples Maledicts.',
          icon: '👑'
        },
        {
          label: '🌘 Ciclo de Día y Noche',
          text: 'El mundo alterna entre el día y la noche. De noche los enemigos son más temibles pero otorgan mayor botín y experiencia.',
          icon: '🌘'
        },
        {
          label: '🏆 Trofeos de Jefe y Títulos de Maestría',
          text: 'Vencer a los señores de mazmorra otorga Trofeos que desbloquean Avatares de Batalla y Títulos de Maestría con efectos proc únicos (habilidades que saltan en combate).',
          icon: '🏆'
        }
      ],
      callout: {
        type: 'info',
        text: 'Puedes viajar entre las zonas desbloqueadas en cualquier momento usando el botón "Mapa" en la parte inferior.'
      }
    }
  },
  {
    id: 'loot_and_inventory',
    title: 'Equipo, Botín e Identificación de Objetos',
    category: 'items',
    categoryLabel: 'Equipo & Economía',
    categoryIcon: '🎒',
    icon: '💍',
    badge: 'Economía & Loot',
    addedInVersion: 'v2.0',
    summary: 'Aprende a gestionar las 6 rarezas de objetos, tasar piezas misteriosas y equipar a tu héroe para la batalla.',
    content: {
      subtitle: 'El Botín de las Profundidades',
      paragraphs: [
        'Los monstruos caídos y cofres ocultos contienen equipamiento con distintos niveles de rareza mágica:',
      ],
      bullets: [
        {
          label: '⚪ Común ➔ 🟢 Poco Común ➔ 🔵 Raro',
          text: 'Objetos base que otorgan estadísticas directas de daño, armadura y vida.',
          icon: '🔵'
        },
        {
          label: '🟣 Épico ➔ 🟡 Mítico ➔ 🔴 Único',
          text: 'Piezas legendarias con múltiples afijos mágicos, bonus de velocidad y habilidades pasivas (procs) de combate.',
          icon: '🔴'
        },
        {
          label: '🔍 Identificación Obligatoria',
          text: 'Los objetos más poderosos caen sin tasar ("Unidentified"). Debes identificarlos con un pequeño desembolso de oro para desbloquear su poder y permitirte equiparlos.',
          icon: '🔍'
        },
        {
          label: '💰 Venta Rápida Adaptada a Móvil',
          text: 'En PC puedes vender con clic derecho; en pantallas táctiles móviles, toca cualquier ítem en tu inventario para abrir el menú de equipar/vender instantáneamente.',
          icon: '💰'
        }
      ],
      callout: {
        type: 'tip',
        text: 'Los objetos identificados valen el doble de oro al venderse en comparación con los objetos sin tasar. ¡Identificar antes de vender suele ser rentable!'
      }
    }
  }
];
