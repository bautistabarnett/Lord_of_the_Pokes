import { Item, ItemSlot, Rarity, StatType, ItemStat, Monster, BaseAttributes, PassiveSkill, PlayerStats, EquipmentMap, ActiveEffect, PassiveTheme, MonsterRarity, MaledictAffix, SynergyDefinition, TerrainType, CombatStance } from '../types';
import { PASSIVE_SKILLS_POOL, PASSIVE_SET_BONUSES, COMPOSITE_SYNERGIES, MALEDICT_AFFIXES } from '../constants';
import { BALANCE } from './gameBalance';
import { IconName } from '../components/GameIcon';
import { selectMonsterEntry, getMonsterSpritePath, HERO_AVATARS } from './spriteCatalog';
import { selectCatalogItem } from './itemCatalog';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const ITEM_TYPES = Object.values(ItemSlot);

const BASE_NAMES: Record<ItemSlot, string[]> = {
  [ItemSlot.HEAD]: ['Cap', 'Helm', 'Casque', 'Basinet', 'Crown'],
  [ItemSlot.CHEST]: ['Tunic', 'Armor', 'Plate', 'Cuirass', 'Mail'],
  [ItemSlot.GLOVES]: ['Gloves', 'Gauntlets', 'Mitts', 'Grips'],
  [ItemSlot.MAIN_HAND]: ['Sword', 'Axe', 'Mace', 'Dagger', 'Wand'],
  [ItemSlot.OFF_HAND]: ['Shield', 'Buckler', 'Orb', 'Tome'],
  [ItemSlot.LEGS]: ['Pants', 'Greaves', 'Leggings', 'Skirt'],
  [ItemSlot.BOOTS]: ['Boots', 'Greaves', 'Sandals', 'Treads'],
  [ItemSlot.AMULET]: ['Amulet', 'Necklace', 'Talisman', 'Choker'],
  [ItemSlot.RING]: ['Ring', 'Band', 'Loop', 'Signet'],
};

const SLOT_ICONS_MAP: Record<ItemSlot, IconName[]> = {
  [ItemSlot.HEAD]: ['helm', 'hood', 'crown'],
  [ItemSlot.CHEST]: ['armor', 'robe'],
  [ItemSlot.GLOVES]: ['gloves'],
  [ItemSlot.MAIN_HAND]: ['sword', 'axe', 'mace', 'dagger', 'staff'],
  [ItemSlot.OFF_HAND]: ['shield', 'orb', 'tome'],
  [ItemSlot.LEGS]: ['legs', 'skirt'],
  [ItemSlot.BOOTS]: ['boots'],
  [ItemSlot.AMULET]: ['amulet'],
  [ItemSlot.RING]: ['ring'],
};

const MONSTER_NAMES = ['Fallen', 'Zombie', 'Skeleton', 'Scavenger', 'Goatman', 'Spider', 'Gargoyle', 'Demon', 'Cultist', 'Ghost'];
const ELITE_PREFIXES = ['Vile', 'Cursed', 'Stone', 'Night', 'Blood', 'Flame', 'Void', 'Ancient', 'Shadow'];

export const calculateItemValue = (item: Item): number => {
    const { baseMultiplier, rarityMultipliers, statBonusMultiplier, identifyPenalty } = BALANCE.ITEM_VALUE;
    const base = item.level * baseMultiplier;
    const rarityMult = rarityMultipliers[item.rarity] || 1;
    
    const statBonus = item.stats.reduce((acc, stat) => acc + stat.value, 0) * statBonusMultiplier;
    const identifiedMult = item.isIdentified ? 1 : identifyPenalty;
    
    return Math.floor((base * rarityMult + statBonus) * identifiedMult);
};

export const generateLoot = (
  level: number, 
  difficulty: number = 1, 
  magicFind: number = 0,
  forcedRarity?: Rarity
): Item | null => {
  const { baseDropChance, difficultyScaling, rarityChances, caps } = BALANCE.LOOT;
  
  // If forcedRarity is not specified, run normal drop chance check
  if (!forcedRarity) {
    const currentDropChance = Math.min(0.70, baseDropChance + ((difficulty - 1) * difficultyScaling));
    if (Math.random() > currentDropChance) return null;
  }

  const slot = getRandomElement(ITEM_TYPES);

  let rarity = forcedRarity || Rarity.COMMON;

  if (!forcedRarity) {
    // Diminishing returns on Magic Find: 100 MF yields +50% quality boost, capped asymptotically at +75%
    const safeMf = Math.max(0, magicFind);
    const mfEffect = 1 + (safeMf / (safeMf + 100)) * 0.75;
    
    // Controlled difficulty scaling: each difficulty step adds +20% relative chance
    const diffFactor = 1 + Math.max(0, difficulty - 1) * 0.20;

    const uniqueChance = Math.min(caps[Rarity.UNIQUE], rarityChances[Rarity.UNIQUE] * diffFactor * mfEffect);
    const rareChance = Math.min(caps[Rarity.RARE], rarityChances[Rarity.RARE] * diffFactor * mfEffect);
    const magicChance = Math.min(caps[Rarity.MAGIC], rarityChances[Rarity.MAGIC] * diffFactor * mfEffect);

    const roll = Math.random();
    if (roll < uniqueChance) rarity = Rarity.UNIQUE;
    else if (roll < uniqueChance + rareChance) rarity = Rarity.RARE;
    else if (roll < uniqueChance + rareChance + magicChance) rarity = Rarity.MAGIC;
    else rarity = Rarity.COMMON;
  }

  // Select authentic item graphic, lore, and stat archetype from Idle Guild Master catalog
  const catalogEntry = selectCatalogItem(slot, rarity, level);

  const stats: ItemStat[] = [];
  let numStats = 1;
  let statMultiplier = 1.0;

  switch (rarity) {
    case Rarity.COMMON: numStats = 1; statMultiplier = 1.0; break;
    case Rarity.MAGIC: numStats = 2; statMultiplier = 1.10; break;
    case Rarity.RARE: numStats = 3; statMultiplier = 1.22; break;
    case Rarity.UNIQUE: numStats = 4; statMultiplier = 1.35; break;
  }

  const fallbackStats = [StatType.STRENGTH, StatType.DEXTERITY, StatType.INTELLIGENCE, StatType.VITALITY, StatType.ARMOR];
  if (slot === ItemSlot.MAIN_HAND) fallbackStats.push(StatType.DAMAGE, StatType.ATTACK_SPEED);
  if ([ItemSlot.OFF_HAND, ItemSlot.HEAD, ItemSlot.CHEST, ItemSlot.GLOVES, ItemSlot.BOOTS].includes(slot)) fallbackStats.push(StatType.ARMOR);
  if ([ItemSlot.RING, ItemSlot.AMULET, ItemSlot.GLOVES].includes(slot)) fallbackStats.push(StatType.CRIT_CHANCE);
  if ([ItemSlot.BOOTS, ItemSlot.LEGS, ItemSlot.RING, ItemSlot.AMULET].includes(slot)) fallbackStats.push(StatType.DODGE_CHANCE);
  if ([ItemSlot.RING, ItemSlot.AMULET, ItemSlot.HEAD, ItemSlot.GLOVES, ItemSlot.BOOTS].includes(slot)) fallbackStats.push(StatType.MAGIC_FIND);

  // Prioritize the item's authentic archetype statProfile first, then fill any remaining slots from fallbackStats
  const candidatePool = [...catalogEntry.statProfile];
  for (const fb of fallbackStats) {
    if (!candidatePool.includes(fb)) candidatePool.push(fb);
  }

  for (let i = 0; i < numStats && i < candidatePool.length; i++) {
    // First slots come directly from the item's signature statProfile; extra slots add slight variety
    const statType = i < catalogEntry.statProfile.length
      ? catalogEntry.statProfile[i]
      : getRandomElement(fallbackStats);

    let baseVal = 0;
    if ([StatType.STRENGTH, StatType.DEXTERITY, StatType.INTELLIGENCE, StatType.VITALITY].includes(statType)) {
      baseVal = 1 + Math.floor(level * 0.75) + getRandomInt(0, 2);
    } else if (statType === StatType.DAMAGE) {
      baseVal = Math.max(2, Math.floor(level * 1.2)) + getRandomInt(1, 3);
    } else if (statType === StatType.ARMOR) {
      baseVal = Math.max(3, Math.floor(level * 2.0)) + getRandomInt(1, 4);
    } else if (statType === StatType.CRIT_CHANCE || statType === StatType.DODGE_CHANCE) {
      baseVal = getRandomInt(1, 3);
    } else if (statType === StatType.ATTACK_SPEED) {
      baseVal = getRandomInt(2, 5);
    } else if (statType === StatType.LIFE_STEAL) {
      baseVal = getRandomInt(1, 2);
    } else if (statType === StatType.THORNS) {
      baseVal = Math.max(2, Math.floor(level * 1.0)) + getRandomInt(1, 3);
    } else if (statType === StatType.MAGIC_FIND) {
      baseVal = getRandomInt(2, 6);
    }

    let val = Math.floor(baseVal * statMultiplier) || 1;
    if (rarity === Rarity.UNIQUE) {
      if (statType === StatType.LIFE_STEAL) val = Math.min(3, val);
      if (statType === StatType.CRIT_CHANCE || statType === StatType.DODGE_CHANCE) val = Math.min(4, val);
      if (statType === StatType.MAGIC_FIND) val = Math.min(8, val);
    }

    if (!stats.find(s => s.type === statType)) stats.push({ type: statType, value: val });
  }

  let fullName = catalogEntry.name;
  let identified = true;
  if (rarity === Rarity.UNIQUE || (rarity === Rarity.RARE && Math.random() < 0.6)) {
    fullName = `Unidentified ${catalogEntry.name}`;
    identified = false;
  }

  return {
    id: generateId(),
    name: fullName,
    trueName: catalogEntry.name,
    type: slot,
    rarity: rarity,
    stats: stats,
    level: level,
    isIdentified: identified,
    flavorText: catalogEntry.flavorText,
    icon: catalogEntry.icon,
    imageUrl: catalogEntry.imageUrl,
    proc: (rarity === Rarity.UNIQUE || rarity === Rarity.RARE) ? catalogEntry.proc : undefined,
  };
};

export const generateMonster = (level: number, difficultyModifier: number = 1.0, terrain: TerrainType = TerrainType.PLAINS): Monster => {
  const rand = Math.random();
  let rarity = MonsterRarity.COMMON;
  const boost = (difficultyModifier - 1) * 0.1;
  
  // Early-game rarity gating (Bloque 1: prevent unfair one-shot spawns at level 1-3)
  if (level <= 3) {
    if (rand > 0.88 - boost) rarity = MonsterRarity.RARE;
    else if (rand > 0.65 - boost) rarity = MonsterRarity.UNCOMMON;
    else rarity = MonsterRarity.COMMON;
  } else if (level <= 6) {
    if (rand > 0.92 - boost) rarity = MonsterRarity.EPIC;
    else if (rand > 0.80 - boost) rarity = MonsterRarity.RARE;
    else if (rand > 0.60 - boost) rarity = MonsterRarity.UNCOMMON;
    else rarity = MonsterRarity.COMMON;
  } else {
    if (rand > 0.98 - boost) rarity = MonsterRarity.UNIQUE;
    else if (rand > 0.95 - boost) rarity = MonsterRarity.MYTHIC;
    else if (rand > 0.90 - boost) rarity = MonsterRarity.EPIC;
    else if (rand > 0.80 - boost) rarity = MonsterRarity.RARE;
    else if (rand > 0.60 - boost) rarity = MonsterRarity.UNCOMMON;
    else rarity = MonsterRarity.COMMON;
  }
  
  // Select matching monster from our 50-monster animated sprite catalog
  const catalogEntry = selectMonsterEntry(terrain, level, rarity);
  const baseName = catalogEntry.name;
  const isShiny = rarity === MonsterRarity.UNIQUE || rarity === MonsterRarity.MYTHIC;
  const spriteUrl = getMonsterSpritePath(catalogEntry.spriteId, isShiny);
  
  const config = BALANCE.MONSTER.rarityConfig[rarity];

  const baseAttrVal = Math.floor(10 + (level * 2));
  const str = Math.floor(baseAttrVal * config.statMult * difficultyModifier);
  const dex = Math.floor(baseAttrVal * config.statMult * difficultyModifier);
  const int = Math.floor(baseAttrVal * config.statMult * difficultyModifier);
  const vit = Math.floor(baseAttrVal * config.statMult * difficultyModifier);

  const maledicts: MaledictAffix[] = [];
  if (config.maledictCount > 0) {
      const shuffled = [...MALEDICT_AFFIXES].sort(() => 0.5 - Math.random());
      maledicts.push(...shuffled.slice(0, config.maledictCount));
  }

  let bonusDmg = 0, bonusArmor = 0, bonusCrit = 0, bonusLifeSteal = 0, bonusThorns = 0;
  let bonusStr = 0, bonusDex = 0, bonusInt = 0, bonusVit = 0;

  maledicts.forEach(m => {
      if (m.statModifiers[StatType.STRENGTH]) bonusStr += m.statModifiers[StatType.STRENGTH] || 0;
      if (m.statModifiers[StatType.DEXTERITY]) bonusDex += m.statModifiers[StatType.DEXTERITY] || 0;
      if (m.statModifiers[StatType.INTELLIGENCE]) bonusInt += m.statModifiers[StatType.INTELLIGENCE] || 0;
      if (m.statModifiers[StatType.VITALITY]) bonusVit += m.statModifiers[StatType.VITALITY] || 0;
      if (m.statModifiers[StatType.DAMAGE]) bonusDmg += m.statModifiers[StatType.DAMAGE] || 0;
      if (m.statModifiers[StatType.ARMOR]) bonusArmor += m.statModifiers[StatType.ARMOR] || 0;
      if (m.statModifiers[StatType.CRIT_CHANCE]) bonusCrit += m.statModifiers[StatType.CRIT_CHANCE] || 0;
      if (m.statModifiers[StatType.LIFE_STEAL]) bonusLifeSteal += m.statModifiers[StatType.LIFE_STEAL] || 0;
      if (m.statModifiers[StatType.THORNS]) bonusThorns += m.statModifiers[StatType.THORNS] || 0;
  });

  const finalStr = str * (1 + (bonusStr / 100));
  const finalDex = dex * (1 + (bonusDex / 100));
  const finalInt = int * (1 + (bonusInt / 100));
  const finalVit = vit * (1 + (bonusVit / 100));

  const maxHp = Math.floor((finalVit * 8) + (level * 20));
  let damage = Math.floor((finalStr * 0.6) + (level * 3)) * (1 + (bonusDmg / 100));
  let armor = Math.floor((finalDex * 0.5) + (level * 2)) * (1 + (bonusArmor / 100));
  const critChance = Math.min(50, (finalInt * 0.1) + bonusCrit + BALANCE.COMBAT.baseCritChance); 
  const dodgeChance = Math.min(50, (finalDex * 0.1) + (bonusDex > 0 ? 10 : 0) + BALANCE.COMBAT.baseDodgeChance); 

  let name = baseName;
  let icon = baseName.toLowerCase();
  if (['scavenger', 'goatman', 'gargoyle'].includes(icon)) icon = 'beast';
  if (icon === 'fallen') icon = 'zombie';

  if (rarity !== MonsterRarity.COMMON) {
      const prefix = getRandomElement(ELITE_PREFIXES);
      name = `${prefix} ${baseName}`;
  }
  
  if (rarity === MonsterRarity.UNIQUE) {
      name = `${baseName} the ${getRandomElement(['Destroyer', 'Undying', 'Conqueror', 'Vile', 'Ender'])}`;
      icon = 'boss';
  }

  // Triad Stance Assignment based on monster stat profile
  let initialStance = CombatStance.RESOLVE;
  if (finalStr >= finalInt && finalStr >= finalDex) {
    initialStance = CombatStance.WILL;
  } else if (finalInt >= finalStr && finalInt >= finalDex) {
    initialStance = CombatStance.SPIRIT;
  } else {
    initialStance = CombatStance.RESOLVE;
  }

  // Stance visibility: Common & Uncommon telegraphed (visible).
  // Rare, Epic, Mythic and Unique (Bosses) have a chance to hide their stance (deduction needed)
  let isStanceHidden = false;
  if (rarity === MonsterRarity.UNIQUE || rarity === MonsterRarity.MYTHIC) {
    isStanceHidden = Math.random() < 0.60;
  } else if (rarity === MonsterRarity.EPIC || rarity === MonsterRarity.RARE) {
    isStanceHidden = Math.random() < 0.40;
  }

  return {
    id: generateId(),
    name, level, rarity,
    strength: Math.floor(finalStr), dexterity: Math.floor(finalDex), intelligence: Math.floor(finalInt), vitality: Math.floor(finalVit),
    maxHp, currentHp: maxHp, damage: Math.floor(damage), armor: Math.floor(armor),
    critChance, dodgeChance, lifeSteal: bonusLifeSteal, thorns: bonusThorns,
    icon, imageUrl: spriteUrl, maledicts,
    currentStance: initialStance,
    isStanceHidden
  };
};

export const generateEncounter = (level: number, difficulty: number, terrain: TerrainType = TerrainType.PLAINS): Monster[] => {
    // Determine group size based on level
    let count = 1;
    const rand = Math.random();

    if (level >= 10) {
        if (rand < 0.20) count = 3;
        else if (rand < 0.50) count = 2;
    } else if (level >= 4) {
        if (rand < 0.30) count = 2;
    }

    // Force unique/bosses to be solo often, handled by external logic mostly, 
    // but here we ensure consistency if a group is generated they are usually common/rare.

    const monsters: Monster[] = [];
    
    // Group Balance Modifier
    // 2 Enemies: 75% HP, 50% DMG each (combined 100% burst per enemy turn)
    // 3 Enemies: 60% HP, 35% DMG each (combined 105% burst per enemy turn)
    const hpMod = count === 1 ? 1.0 : count === 2 ? 0.75 : 0.60;
    const dmgMod = count === 1 ? 1.0 : count === 2 ? 0.50 : 0.35;

    for (let i = 0; i < count; i++) {
        const m = generateMonster(level, difficulty, terrain);
        
        // Adjust for group play
        if (count > 1) {
            m.maxHp = Math.floor(m.maxHp * hpMod);
            m.currentHp = m.maxHp;
            m.damage = Math.max(1, Math.floor(m.damage * dmgMod));
            
            // Differentiate names slightly if same type
            if (i > 0 && m.name === monsters[0].name) {
                m.name = `${m.name} ${i + 1}`;
                if (i === 1 && count === 2) monsters[0].name = `${monsters[0].name} 1`;
            }
        }
        monsters.push(m);
    }

    return monsters;
};

// Updated generator to allow targetted rarity filtering
export const generatePassiveSkill = (
    currentPassives: PassiveSkill[], 
    filters?: { 
        minRarity?: Rarity, 
        exactRarity?: Rarity,
        excludeRarities?: Rarity[] 
    }
): { skill: PassiveSkill, isNew: boolean } => {
  
  let pool = PASSIVE_SKILLS_POOL;

  // Filter Pool based on constraints
  if (filters) {
      if (filters.exactRarity) {
          pool = pool.filter(s => s.rarity === filters.exactRarity);
      } else {
          if (filters.minRarity) {
              const rMap = { [Rarity.COMMON]: 0, [Rarity.MAGIC]: 1, [Rarity.RARE]: 2, [Rarity.UNIQUE]: 3 };
              pool = pool.filter(s => rMap[s.rarity || Rarity.COMMON] >= rMap[filters.minRarity!]);
          }
          if (filters.excludeRarities) {
              pool = pool.filter(s => !filters.excludeRarities!.includes(s.rarity || Rarity.COMMON));
          }
      }
  }

  // Fallback if pool empty (shouldn't happen unless bad filters)
  if (pool.length === 0) pool = PASSIVE_SKILLS_POOL.filter(s => s.rarity === Rarity.COMMON);

  const poolItem = getRandomElement(pool);
  const existing = currentPassives.find(p => p.id === poolItem.id);

  if (existing) {
    const nextLevel = existing.level + 1;
    return {
      skill: { ...existing, level: nextLevel, value: existing.baseValue + (nextLevel - 1) * existing.valuePerLevel },
      isNew: false
    };
  } else {
    return {
      skill: { ...poolItem, level: 1, value: poolItem.baseValue },
      isNew: true
    };
  }
};

export const calculatePlayerStats = (
  baseAttributes: BaseAttributes,
  equipment: EquipmentMap,
  passives: PassiveSkill[],
  level: number,
  availableStatPoints: number,
  activeEffects: ActiveEffect[] = [],
  equippedSkillIds: string[] = [], // Optional: if provided, filters passive application
  activeTitleId?: string // Optional: Mastery Title granting a combat trigger
): PlayerStats => {
  const { derived, perLevel } = BALANCE.STATS;
  
  let currentStats: PlayerStats = {
    strength: baseAttributes.strength,
    dexterity: baseAttributes.dexterity,
    intelligence: baseAttributes.intelligence,
    vitality: baseAttributes.vitality,
    damage: derived.damage,
    armor: derived.armor,
    magicFind: derived.magicFind,
    lifeSteal: 0,
    critChance: BALANCE.COMBAT.baseCritChance, 
    dodgeChance: BALANCE.COMBAT.baseDodgeChance,
    attackSpeed: 0,
    thorns: 0,
    spellPower: 0,
    healthRegen: 1,
    level: level,
    xp: 0, xpToNextLevel: 0, gold: 0, maxHp: 100,
    statPoints: availableStatPoints,
    skillPoints: 0,
    activeSetBonuses: [],
    activeSynergies: [],
    equippedSkillIds: equippedSkillIds,
    equippedItemProcs: []
  };

  // Filter skills based on what is equipped, or use all if no equipped list provided (legacy support)
  const activeSkills = equippedSkillIds.length > 0 
      ? passives.filter(p => equippedSkillIds.includes(p.id))
      : passives;

  activeSkills.forEach(passive => {
    if (!passive.statType) return;
    switch (passive.statType) {
      case StatType.STRENGTH: currentStats.strength += passive.value; break;
      case StatType.DEXTERITY: currentStats.dexterity += passive.value; break;
      case StatType.INTELLIGENCE: currentStats.intelligence += passive.value; break;
      case StatType.VITALITY: currentStats.vitality += passive.value; break;
      case StatType.ARMOR: currentStats.armor += passive.value; break;
      case StatType.MAGIC_FIND: currentStats.magicFind += passive.value; break;
      case StatType.LIFE_STEAL: currentStats.lifeSteal += passive.value; break;
      case StatType.CRIT_CHANCE: currentStats.critChance += passive.value; break;
      case StatType.DODGE_CHANCE: currentStats.dodgeChance += passive.value; break;
    }
  });

  // Check Set Bonuses & Synergies based on ACTIVE skills
  const skillsByTheme = activeSkills.reduce((acc, skill) => {
      if (!acc[skill.theme]) acc[skill.theme] = new Set();
      acc[skill.theme].add(skill.id);
      return acc;
  }, {} as Record<PassiveTheme, Set<string>>);

  PASSIVE_SET_BONUSES.forEach(bonus => {
      const userCount = skillsByTheme[bonus.theme]?.size || 0;
      if (userCount >= bonus.requiredCount) {
          currentStats.activeSetBonuses.push(bonus.theme);
          bonus.staticStats.forEach(stat => {
             switch(stat.type) {
                case StatType.STRENGTH: currentStats.strength += stat.value; break;
                case StatType.DEXTERITY: currentStats.dexterity += stat.value; break;
                case StatType.INTELLIGENCE: currentStats.intelligence += stat.value; break;
                case StatType.VITALITY: currentStats.vitality += stat.value; break;
                case StatType.DAMAGE: currentStats.damage += stat.value; break;
                case StatType.ARMOR: currentStats.armor += stat.value; break;
                case StatType.MAGIC_FIND: currentStats.magicFind += stat.value; break;
                case StatType.LIFE_STEAL: currentStats.lifeSteal += stat.value; break;
                case StatType.CRIT_CHANCE: currentStats.critChance += stat.value; break;
                case StatType.DODGE_CHANCE: currentStats.dodgeChance += stat.value; break;
             }
          });
      }
  });

  // Calculate Composite Synergies
  COMPOSITE_SYNERGIES.forEach(synergy => {
      if (currentStats.activeSetBonuses.includes(synergy.themes[0]) && 
          currentStats.activeSetBonuses.includes(synergy.themes[1])) {
          currentStats.activeSynergies.push(synergy.id);
      }
  });

  Object.values(equipment).forEach(item => {
    if (!item) return;
    item.stats.forEach(stat => {
      switch (stat.type) {
        case StatType.STRENGTH: currentStats.strength += stat.value; break;
        case StatType.DEXTERITY: currentStats.dexterity += stat.value; break;
        case StatType.INTELLIGENCE: currentStats.intelligence += stat.value; break;
        case StatType.VITALITY: currentStats.vitality += stat.value; break;
        case StatType.DAMAGE: currentStats.damage += stat.value; break;
        case StatType.ARMOR: currentStats.armor += stat.value; break;
        case StatType.MAGIC_FIND: currentStats.magicFind += stat.value; break;
        case StatType.LIFE_STEAL: currentStats.lifeSteal += stat.value; break;
        case StatType.CRIT_CHANCE: currentStats.critChance += stat.value; break;
        case StatType.DODGE_CHANCE: currentStats.dodgeChance += stat.value; break;
        case StatType.ATTACK_SPEED: currentStats.attackSpeed = (currentStats.attackSpeed || 0) + stat.value; break;
        case StatType.THORNS: currentStats.thorns = (currentStats.thorns || 0) + stat.value; break;
      }
    });
    if (item.isIdentified && item.proc) {
      currentStats.equippedItemProcs = currentStats.equippedItemProcs || [];
      currentStats.equippedItemProcs.push({ id: item.id, name: item.name, proc: item.proc });
    }
  });
  
  activeEffects.forEach(effect => {
    if (!effect.statType) return;
    const val = effect.value;
    switch (effect.statType) {
      case StatType.STRENGTH: currentStats.strength += val; break;
      case StatType.DEXTERITY: currentStats.dexterity += val; break;
      case StatType.INTELLIGENCE: currentStats.intelligence += val; break;
      case StatType.VITALITY: currentStats.vitality += val; break;
      case StatType.DAMAGE: currentStats.damage += val; break;
      case StatType.ARMOR: currentStats.armor += val; break;
      case StatType.MAGIC_FIND: currentStats.magicFind += val; break;
      case StatType.LIFE_STEAL: currentStats.lifeSteal += val; break;
      case StatType.CRIT_CHANCE: currentStats.critChance += val; break;
      case StatType.DODGE_CHANCE: currentStats.dodgeChance += val; break;
    }
  });

  // Phase 1: Harmonized Attribute Scaling
  // STR: Multiplies base equipment damage (+1.5% per point) + flat baseline
  const strMultiplier = 1 + (currentStats.strength * 0.015);
  const baseEquipDamage = currentStats.damage;
  currentStats.damage = Math.floor(baseEquipDamage * strMultiplier) + Math.floor(currentStats.strength * 0.25);

  // Armor: Shared between Strength (heavy physique) and Dexterity (light deflection)
  currentStats.armor += Math.floor(currentStats.strength * 0.3) + Math.floor(currentStats.dexterity * 0.2);

  // DEX: Evasion & Initiative driver (max 65% dodge cap)
  currentStats.dodgeChance += (currentStats.dexterity * 0.15); 

  // INT: Critical focus + Spell & Proc Power (+1.5% per point)
  currentStats.critChance += (currentStats.intelligence * 0.1);
  currentStats.spellPower = Math.round(currentStats.intelligence * 1.5);

  // VIT: Max Health (+8 per point) + Turn-based Health Regeneration
  currentStats.maxHp = 100 + (currentStats.vitality * 8) + (level * perLevel.hp);
  currentStats.healthRegen = Math.max(1, Math.floor(currentStats.vitality * 0.15));
  
  currentStats.critChance = Math.min(100, parseFloat(currentStats.critChance.toFixed(1)));
  currentStats.dodgeChance = Math.min(65, parseFloat(currentStats.dodgeChance.toFixed(1)));

  return currentStats;
};

// Recommendation Engine
export const getRecommendedSkills = (stats: PlayerStats, allSkills: PassiveSkill[]): PassiveSkill[] => {
    const recommendations: PassiveSkill[] = [];
    
    // 1. Stat Synergy: Top attribute check
    const attrs = [
        { name: 'Strength', val: stats.strength, theme: PassiveTheme.PYROMANCY },
        { name: 'Dexterity', val: stats.dexterity, theme: PassiveTheme.SHADOW },
        { name: 'Intelligence', val: stats.intelligence, theme: PassiveTheme.CRYOMANCY },
        { name: 'Vitality', val: stats.vitality, theme: PassiveTheme.SENTINEL },
    ].sort((a,b) => b.val - a.val);

    const topTheme = attrs[0].theme;
    
    // Recommend a skill from top theme not yet active? Or just from pool
    const themeMatch = allSkills.find(s => s.theme === topTheme);
    if (themeMatch) recommendations.push(themeMatch);

    // 2. Set Bonus Chase
    // If player has 2 skills of a theme, recommend a 3rd
    const counts: Record<string, number> = {};
    allSkills.forEach(s => counts[s.theme] = (counts[s.theme] || 0) + 1);
    
    // Find theme with 2 skills (assuming limit is 3 for bonus, though typically reqCount is 3)
    const nearBonusTheme = Object.keys(counts).find(t => counts[t] === 2) as PassiveTheme | undefined;
    if (nearBonusTheme) {
        const missing = allSkills.find(s => s.theme === nearBonusTheme); 
        if(missing) recommendations.push(missing);
    }

    return [...new Set(recommendations)].slice(0, 3);
}