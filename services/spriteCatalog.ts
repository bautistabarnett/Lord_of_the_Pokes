import { TerrainType, MonsterRarity, Monster, SkillProcDefinition } from '../types';

export interface HeroAvatar {
  id: string;
  name: string;
  className: string;
  imageUrl: string;
  /** Mastery Title: Boss Trophies needed to unlock (0 = starter title) */
  trophyCost: number;
  /** Archetype tag shown in the Mastery Titles UI */
  archetype: string;
  /** Combat trigger granted while this title is active (one proc per title) */
  proc: SkillProcDefinition;
}

export const HERO_AVATARS: HeroAvatar[] = [
  { id: 'red', name: 'Red', className: 'Apex Champion', imageUrl: 'assets/heroes/trainer_1.gif', trophyCost: 0, archetype: 'Warrior',
    proc: { trigger: 'onStartTurn', chance: 1, cooldown: 0, conditions: [{ type: 'turn_count_multiple', value: 3 }], effect: { type: 'buff', subType: 'scaling_strength', value: 8, duration: 2 }, description: 'Every 3rd turn: +8 flat damage for 2 turns' } },
  { id: 'cynthia', name: 'Cynthia', className: 'Abyssal Empress', imageUrl: 'assets/heroes/trainer_143.gif', trophyCost: 2, archetype: 'Executioner',
    proc: { trigger: 'onHit', chance: 0.45, cooldown: 2, conditions: [{ type: 'enemy_hp_below', value: 0.4 }], effect: { type: 'damage_magic', value: 1.6 }, description: '45% on hit vs enemies under 40% HP: abyssal blast (160% dmg, scales with Spell Power)' } },
  { id: 'steven', name: 'Steven', className: 'Steel Aegis Noble', imageUrl: 'assets/heroes/trainer_137.gif', trophyCost: 1, archetype: 'Guardian',
    proc: { trigger: 'onBattleStart', chance: 1, cooldown: 0, effect: { type: 'shield', value: 40, duration: 2 }, description: 'Battle start: steel ward absorbs the first enemy blows (2 turns)' } },
  { id: 'lance', name: 'Lance', className: 'Dragon Warlord', imageUrl: 'assets/heroes/trainer_134.gif', trophyCost: 2, archetype: 'Striker',
    proc: { trigger: 'onAttack', chance: 0.35, cooldown: 2, conditions: [{ type: 'hp_above', value: 0.5 }], effect: { type: 'damage_phys', value: 0.85 }, description: '35% on attack while above 50% HP: dragon rush (85% bonus dmg)' } },
  { id: 'blue', name: 'Blue', className: 'Master Tactician', imageUrl: 'assets/heroes/trainer_2205.gif', trophyCost: 1, archetype: 'Controller',
    proc: { trigger: 'onCrit', chance: 0.4, cooldown: 2, effect: { type: 'debuff', subType: 'stun', value: 1, duration: 1 }, description: '40% on crit: stun the target for 1 turn' } },
  { id: 'hilda', name: 'Hilda', className: 'Vanguard Heroine', imageUrl: 'assets/heroes/trainer_108.gif', trophyCost: 1, archetype: 'Survivor',
    proc: { trigger: 'onKill', chance: 1, cooldown: 0, effect: { type: 'heal', value: 0.12 }, description: 'On kill: heal 12% max HP' } },
  { id: 'hilbert', name: 'Hilbert', className: 'Truth Explorer', imageUrl: 'assets/heroes/trainer_107.gif', trophyCost: 1, archetype: 'Combo',
    proc: { trigger: 'onHit', chance: 0.35, cooldown: 1, conditions: [{ type: 'enemy_has_debuff', value: 'burn' }], effect: { type: 'damage_magic', value: 1.2 }, description: '35% on hit vs burning enemies: truth flare (120% dmg, scales with Spell Power)' } },
  { id: 'ethan', name: 'Ethan', className: 'Solar Knight', imageUrl: 'assets/heroes/trainer_2306.gif', trophyCost: 1, archetype: 'Burner',
    proc: { trigger: 'onHit', chance: 0.35, cooldown: 1, effect: { type: 'debuff', subType: 'burn', value: 0.04, duration: 3 }, description: '35% on hit: solar burn for 3 turns' } },
  { id: 'silver', name: 'Silver', className: 'Shadow Rogue', imageUrl: 'assets/heroes/trainer_2305.gif', trophyCost: 1, archetype: 'Evasion',
    proc: { trigger: 'onCrit', chance: 0.5, cooldown: 2, effect: { type: 'buff', subType: 'dodge_boost', value: 30, duration: 2 }, description: '50% on crit: +30% dodge for 2 enemy attacks' } },
  { id: 'dawn', name: 'Dawn', className: 'Celestial Mage', imageUrl: 'assets/heroes/trainer_2303.gif', trophyCost: 1, archetype: 'Controller',
    proc: { trigger: 'onHit', chance: 0.3, cooldown: 2, effect: { type: 'debuff', subType: 'freeze', value: 1, duration: 1 }, description: '30% on hit: freeze the target for 1 turn (next hit shatters)' } },
  { id: 'lucas', name: 'Lucas', className: 'Diamond Paladin', imageUrl: 'assets/heroes/trainer_2302.gif', trophyCost: 1, archetype: 'Survivor',
    proc: { trigger: 'onTakeDamage', chance: 0.6, cooldown: 3, conditions: [{ type: 'hp_below', value: 0.4 }], effect: { type: 'heal', value: 0.18 }, description: '60% when hit below 40% HP: diamond prayer heals 18% max HP' } },
  { id: 'lyra', name: 'Lyra', className: 'Verdant Ranger', imageUrl: 'assets/heroes/trainer_2301.gif', trophyCost: 1, archetype: 'Poisoner',
    proc: { trigger: 'onAttack', chance: 0.4, cooldown: 1, effect: { type: 'debuff', subType: 'poison', value: 0.04, duration: 3 }, description: '40% on attack: venom arrow poisons for 3 turns' } },
  { id: 'barry', name: 'Barry', className: 'Furious Berserker', imageUrl: 'assets/heroes/trainer_2304.gif', trophyCost: 1, archetype: 'Striker',
    proc: { trigger: 'onHit', chance: 0.3, cooldown: 1, effect: { type: 'multi_hit', value: 0.6 }, description: '30% on hit: frenzied echo strike for 60% of the damage dealt' } },
  { id: 'kris', name: 'Kris', className: 'Crystal Priestess', imageUrl: 'assets/heroes/trainer_2307.gif', trophyCost: 1, archetype: 'Sustain',
    proc: { trigger: 'onStartTurn', chance: 1, cooldown: 3, effect: { type: 'buff', subType: 'regen', value: 0.06, duration: 2 }, description: 'Every 4 turns: crystal regen 6% max HP for 2 turns' } },
  { id: 'grimsley', name: 'Grimsley', className: 'Nightshade Warlock', imageUrl: 'assets/heroes/trainer_3002.gif', trophyCost: 1, archetype: 'Blood Mage',
    proc: { trigger: 'onAttack', chance: 0.5, cooldown: 1, cost: { type: 'hp_percent', value: 0.05 }, effect: { type: 'damage_magic', value: 1.8 }, description: '50% on attack: sacrifice 5% HP for a nightshade bolt (180% dmg, scales with Spell Power)' } },
  { id: 'alder', name: 'Alder', className: 'Primeval Druid', imageUrl: 'assets/heroes/trainer_3008.gif', trophyCost: 1, archetype: 'Last Stand',
    proc: { trigger: 'onStartTurn', chance: 1, cooldown: 1, conditions: [{ type: 'hp_below', value: 0.5 }], effect: { type: 'buff', subType: 'scaling_strength', value: 12, duration: 1 }, description: 'Below 50% HP: primal fury grants +12 flat damage' } },
  { id: 'ash', name: 'Ash', className: 'Aura Master', imageUrl: 'assets/heroes/trainer_4008.gif', trophyCost: 2, archetype: 'Critical',
    proc: { trigger: 'onCrit', chance: 0.4, cooldown: 2, effect: { type: 'buff', subType: 'crit_boost', value: 30, duration: 2 }, description: '40% on crit: aura surge, +30% crit damage for 2 turns' } },
];

export const DEFAULT_HERO_AVATAR = HERO_AVATARS[0].imageUrl;
export const DEFAULT_TITLE_ID = 'red';
export const getTitleById = (id?: string): HeroAvatar | undefined => HERO_AVATARS.find(a => a.id === id);


export const TERRAIN_BATTLEBACKS: Record<TerrainType, string> = {
  [TerrainType.RUINS]: 'assets/battlebacks/ruins.gif',
  [TerrainType.FOREST]: 'assets/battlebacks/forest.gif',
  [TerrainType.CRYPT]: 'assets/battlebacks/crypt.gif',
  [TerrainType.SWAMP]: 'assets/battlebacks/swamp.gif',
  [TerrainType.PLAINS]: 'assets/battlebacks/plains.gif',
  [TerrainType.VOID]: 'assets/battlebacks/void.gif',
};

export interface MonsterSpriteEntry {
  spriteId: number;
  name: string;
  terrains: TerrainType[];
  minLevel: number;
  isBoss?: boolean;
}

export const MONSTER_CATALOG_50: MonsterSpriteEntry[] = [
  // --- CRYPT / UNDEAD (10) ---
  { spriteId: 92, name: 'Gastly Spirit', terrains: [TerrainType.CRYPT, TerrainType.VOID], minLevel: 1 },
  { spriteId: 93, name: 'Haunter Spectre', terrains: [TerrainType.CRYPT, TerrainType.VOID], minLevel: 5 },
  { spriteId: 94, name: 'Shadow Lord Gengar', terrains: [TerrainType.CRYPT, TerrainType.VOID], minLevel: 12, isBoss: true },
  { spriteId: 105, name: 'Bone Warden Marowak', terrains: [TerrainType.CRYPT, TerrainType.RUINS], minLevel: 6 },
  { spriteId: 200, name: 'Banshee Misdreavus', terrains: [TerrainType.CRYPT], minLevel: 3 },
  { spriteId: 354, name: 'Cursed Marionette Banette', terrains: [TerrainType.CRYPT], minLevel: 7 },
  { spriteId: 355, name: 'Soul Reaper Duskull', terrains: [TerrainType.CRYPT], minLevel: 2 },
  { spriteId: 356, name: 'Abyssal Cyclops Dusclops', terrains: [TerrainType.CRYPT], minLevel: 8 },
  { spriteId: 477, name: 'Underworld Guardian Dusknoir', terrains: [TerrainType.CRYPT, TerrainType.VOID], minLevel: 15, isBoss: true },
  { spriteId: 609, name: 'Phantasm Chandelure', terrains: [TerrainType.CRYPT], minLevel: 10 },

  // --- FOREST / INSECTS / NATURE (9) ---
  { spriteId: 15, name: 'Venom Beedrill', terrains: [TerrainType.FOREST], minLevel: 2 },
  { spriteId: 123, name: 'Razor Scyther', terrains: [TerrainType.FOREST, TerrainType.PLAINS], minLevel: 5 },
  { spriteId: 127, name: 'Titan Beetle Pinsir', terrains: [TerrainType.FOREST], minLevel: 6 },
  { spriteId: 167, name: 'Web Weaver Spinarak', terrains: [TerrainType.FOREST, TerrainType.SWAMP], minLevel: 1 },
  { spriteId: 168, name: 'Toxic Arachnid Ariados', terrains: [TerrainType.FOREST, TerrainType.SWAMP], minLevel: 4 },
  { spriteId: 212, name: 'Crimson Blade Scizor', terrains: [TerrainType.FOREST, TerrainType.RUINS], minLevel: 12, isBoss: true },
  { spriteId: 275, name: 'Forest Demon Shiftry', terrains: [TerrainType.FOREST], minLevel: 8 },
  { spriteId: 469, name: 'Ancient Dragonfly Yanmega', terrains: [TerrainType.FOREST, TerrainType.SWAMP], minLevel: 9 },
  { spriteId: 709, name: 'Cursed Treant Trevenant', terrains: [TerrainType.FOREST, TerrainType.CRYPT], minLevel: 11, isBoss: true },

  // --- SWAMP / POISON / MIRE (8) ---
  { spriteId: 88, name: 'Toxic Sludge Grimer', terrains: [TerrainType.SWAMP], minLevel: 1 },
  { spriteId: 89, name: 'Corrosive Muk', terrains: [TerrainType.SWAMP], minLevel: 6 },
  { spriteId: 109, name: 'Plague Cloud Koffing', terrains: [TerrainType.SWAMP, TerrainType.RUINS], minLevel: 2 },
  { spriteId: 110, name: 'Noxious Weezing', terrains: [TerrainType.SWAMP], minLevel: 7 },
  { spriteId: 317, name: 'Voracious Gulper Swalot', terrains: [TerrainType.SWAMP], minLevel: 5 },
  { spriteId: 452, name: 'Stygian Scorpion Drapion', terrains: [TerrainType.SWAMP, TerrainType.RUINS], minLevel: 10, isBoss: true },
  { spriteId: 454, name: 'Venomous Stalker Toxicroak', terrains: [TerrainType.SWAMP], minLevel: 8 },
  { spriteId: 537, name: 'Mire Behemoth Seismitoad', terrains: [TerrainType.SWAMP], minLevel: 9 },

  // --- RUINS / STONE / ANCIENT GOLEMS (8) ---
  { spriteId: 74, name: 'Living Rubble Geodude', terrains: [TerrainType.RUINS, TerrainType.PLAINS], minLevel: 1 },
  { spriteId: 75, name: 'Stone Boulder Graveler', terrains: [TerrainType.RUINS], minLevel: 5 },
  { spriteId: 76, name: 'Earth Colossus Golem', terrains: [TerrainType.RUINS], minLevel: 10 },
  { spriteId: 95, name: 'Rock Serpent Onix', terrains: [TerrainType.RUINS, TerrainType.CRYPT], minLevel: 4 },
  { spriteId: 208, name: 'Iron Wyrm Steelix', terrains: [TerrainType.RUINS], minLevel: 13, isBoss: true },
  { spriteId: 343, name: 'Ancient Relic Baltoy', terrains: [TerrainType.RUINS], minLevel: 3 },
  { spriteId: 344, name: 'Arcane Sentinel Claydol', terrains: [TerrainType.RUINS, TerrainType.VOID], minLevel: 8 },
  { spriteId: 623, name: 'Ruin Titan Golurk', terrains: [TerrainType.RUINS, TerrainType.VOID], minLevel: 14, isBoss: true },

  // --- PLAINS / SAVAGE BEASTS (8) ---
  { spriteId: 19, name: 'Feral Rat Rattata', terrains: [TerrainType.PLAINS], minLevel: 1 },
  { spriteId: 20, name: 'Voracious Gnawer Raticate', terrains: [TerrainType.PLAINS], minLevel: 3 },
  { spriteId: 24, name: 'Dusk Viper Arbok', terrains: [TerrainType.PLAINS, TerrainType.FOREST], minLevel: 5 },
  { spriteId: 56, name: 'Furious Brawler Mankey', terrains: [TerrainType.PLAINS], minLevel: 2 },
  { spriteId: 57, name: 'Rage Berserker Primeape', terrains: [TerrainType.PLAINS], minLevel: 6 },
  { spriteId: 128, name: 'Wild Minotaur Tauros', terrains: [TerrainType.PLAINS], minLevel: 8 },
  { spriteId: 228, name: 'Hellhound Houndour', terrains: [TerrainType.PLAINS, TerrainType.RUINS], minLevel: 4 },
  { spriteId: 229, name: 'Infernal Cerberus Houndoom', terrains: [TerrainType.PLAINS, TerrainType.RUINS], minLevel: 11, isBoss: true },

  // --- VOID / MYTHIC / OVERLORDS (7) ---
  { spriteId: 248, name: 'Realm Devourer Tyranitar', terrains: [TerrainType.VOID, TerrainType.RUINS], minLevel: 15, isBoss: true },
  { spriteId: 386, name: 'Dimensional Aberration Deoxys', terrains: [TerrainType.VOID], minLevel: 18, isBoss: true },
  { spriteId: 442, name: 'Soul Vortex Spiritomb', terrains: [TerrainType.VOID, TerrainType.CRYPT], minLevel: 12, isBoss: true },
  { spriteId: 487, name: 'Distortion Lord Giratina', terrains: [TerrainType.VOID], minLevel: 20, isBoss: true },
  { spriteId: 491, name: 'Living Nightmare Darkrai', terrains: [TerrainType.VOID], minLevel: 16, isBoss: true },
  { spriteId: 635, name: 'Void Hydra Hydreigon', terrains: [TerrainType.VOID], minLevel: 17, isBoss: true },
  { spriteId: 717, name: 'Destruction Harbinger Yveltal', terrains: [TerrainType.VOID], minLevel: 20, isBoss: true },
];

/**
 * Returns a fitting monster sprite (normal or shiny based on rarity)
 */
export const getMonsterSpritePath = (spriteId: number, isShiny: boolean = false): string => {
  return isShiny 
    ? `assets/monsters/${spriteId}_shiny.gif` 
    : `assets/monsters/${spriteId}.gif`;
};

/**
 * Selects an appropriate monster entry from the 50-monster catalog
 * matching the given terrain and level, with boss prioritization for Unique rarities.
 */
export const selectMonsterEntry = (
  terrain: TerrainType = TerrainType.PLAINS,
  level: number = 1,
  rarity: MonsterRarity = MonsterRarity.COMMON
): MonsterSpriteEntry => {
  const isHighRarity = rarity === MonsterRarity.UNIQUE || rarity === MonsterRarity.MYTHIC;

  // Filter candidates matching terrain
  let pool = MONSTER_CATALOG_50.filter(m => m.terrains.includes(terrain));
  if (pool.length === 0) {
    pool = MONSTER_CATALOG_50;
  }

  // Filter by boss status if high rarity
  if (isHighRarity) {
    const bossPool = pool.filter(m => m.isBoss);
    if (bossPool.length > 0) pool = bossPool;
  }

  // Filter by level closeness
  const levelMatched = pool.filter(m => Math.abs(m.minLevel - level) <= 6);
  const candidates = levelMatched.length > 0 ? levelMatched : pool;

  return candidates[Math.floor(Math.random() * candidates.length)];
};
