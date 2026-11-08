
import React from 'react';

export type IconName = 
  | 'helm' | 'hood' | 'crown'
  | 'armor' | 'robe' | 'tunic'
  | 'gloves' | 'gauntlets'
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'staff'
  | 'shield' | 'orb' | 'tome'
  | 'legs' | 'skirt'
  | 'boots' | 'treads'
  | 'ring' | 'band'
  | 'amulet' | 'necklace'
  | 'hero'
  | 'skeleton' | 'zombie' | 'demon' | 'spider' | 'boss' | 'beast' | 'cultist' | 'ghost'
  | 'goblin' | 'orc' | 'slime' | 'golem' | 'wraith' | 'lich' | 'harpy' | 'minotaur' | 'vampire' | 'dragon'
  | 'empty_head' | 'empty_chest' | 'empty_gloves' | 'empty_main' | 'empty_off' | 'empty_legs' | 'empty_boots' | 'empty_amulet' | 'empty_ring'
  | 'coin' | 'sack' | 'crate' | 'chest'
  | 'location_town' | 'location_crypt' | 'location_forest' | 'location_ruins' | 'location_void';

interface GameIconProps {
  name: string;
  className?: string;
  imageUrl?: string;
}

// Emoji mapping for colorful high-fidelity avatars
const EMOJI_MAP: Partial<Record<IconName, string>> = {
    hero: '🛡️',
    skeleton: '💀',
    zombie: '🧟',
    demon: '👹',
    boss: '👿',
    beast: '🐺',
    cultist: '🧙',
    ghost: '👻',
    spider: '🕷️',
    goblin: '👺',
    orc: '👹',
    slime: '🦠',
    golem: '🗿',
    wraith: '👻',
    lich: '💀',
    harpy: '🦅',
    minotaur: '🐂',
    vampire: '🧛',
    dragon: '🐉',
    coin: '🪙',
    sack: '💰',
    crate: '📦',
    chest: '⚱️',
};

const LOCATION_TILE_MAP: Partial<Record<string, string>> = {
  location_town: 'assets/tiles/tile_0048.png',
  location_crypt: 'assets/tiles/tile_0100.png',
  location_forest: 'assets/tiles/tile_0016.png',
  location_ruins: 'assets/tiles/tile_0060.png',
  location_void: 'assets/tiles/tile_0110.png',
};

const GameIcon: React.FC<GameIconProps> = ({ name, className = "w-6 h-6", imageUrl }) => {
  const resolvedUrl = imageUrl || LOCATION_TILE_MAP[name];

  if (resolvedUrl) {
    return (
      <img 
        src={resolvedUrl} 
        alt={name} 
        className={`${className} object-contain [image-rendering:pixelated] drop-shadow-md`} 
      />
    );
  }

  const emoji = EMOJI_MAP[name as IconName];
  if (emoji) {
      return (
          <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <text x="50" y="55" fontSize="75" textAnchor="middle" dy=".3em" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.5))">{emoji}</text>
          </svg>
      );
  }

  // Fallback to Vector Paths
  let path = "";
  switch (name) {
    case 'sword': path = "M20 80 L80 20 L85 25 L25 85 Z M15 85 L10 90 M25 75 L30 80"; break;
    case 'axe': path = "M30 80 L70 20 M60 10 L90 30 L80 40 L50 10 Z"; break;
    case 'mace': path = "M40 90 L60 40 M50 20 Circle(50,20,15)"; break;
    case 'dagger': path = "M30 80 L70 40 L75 45 L35 85 Z"; break;
    case 'staff': path = "M20 80 L80 20 M75 15 Circle(80,20,5)"; break;
    case 'shield': path = "M50 10 L90 30 L80 80 L50 95 L20 80 L10 30 Z"; break;
    case 'orb': path = "M50 50 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0"; break;
    case 'tome': path = "M20 20 L80 20 L80 80 L20 80 L20 20 M30 20 L30 80"; break;
    case 'helm':
    case 'hood':
    case 'crown': path = "M20 50 Q50 10 80 50 L80 80 L20 80 Z"; break;
    case 'chest':
    case 'armor':
    case 'robe':
    case 'tunic': path = "M20 20 L80 20 L70 90 L30 90 Z"; break;
    case 'gloves':
    case 'gauntlets': path = "M30 30 L70 30 L70 80 L30 80 Z M30 50 L10 50"; break;
    case 'legs':
    case 'skirt': path = "M30 20 L70 20 L60 90 L40 90 Z"; break;
    case 'boots':
    case 'treads': path = "M30 50 L50 50 L50 90 L20 90 Z M70 50 L50 50 L50 90 L80 90 Z"; break;
    case 'ring':
    case 'band': path = "M50 50 m-15,0 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0 M50 35 L50 25"; break;
    case 'amulet':
    case 'necklace': path = "M30 20 Q50 80 70 20 M50 80 L50 90"; break;
    case 'location_town': path = "M20 80 L20 40 L50 10 L80 40 L80 80 Z M40 80 L40 60 L60 60 L60 80"; break;
    case 'location_crypt': path = "M10 90 L90 90 L80 40 L20 40 Z M50 60 L50 80 M40 70 L60 70"; break;
    case 'location_forest': path = "M50 10 L10 90 L90 90 Z M50 30 L30 80 L70 80 Z"; break;
    case 'location_ruins': path = "M20 90 L20 50 L40 50 L40 90 M60 90 L60 30 L80 30 L80 90 M20 30 L50 10 L80 30"; break;
    case 'location_void': path = "M50 50 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0 M20 20 L80 80 M80 20 L20 80"; break;
    case 'empty_head': path = "M30 40 Q50 20 70 40 L70 70 L30 70 Z"; break;
    case 'empty_chest': path = "M30 20 L70 20 L65 80 L35 80 Z"; break;
    case 'empty_gloves': path = "M30 30 L50 30 L50 70 L30 70 Z M55 30 L75 30 L75 70 L55 70 Z"; break;
    case 'empty_main': path = "M30 80 L80 30"; break;
    case 'empty_off': path = "M30 30 L70 30 L50 80 Z"; break;
    case 'empty_legs': path = "M35 20 L45 80 M65 20 L55 80"; break;
    case 'empty_boots': path = "M30 60 L50 60 L50 80 L30 80 Z M55 60 L75 60 L75 80 L55 80 Z"; break;
    case 'empty_ring': path = "M50 50 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0"; break;
    case 'empty_amulet': path = "M35 20 Q50 60 65 20"; break;
    default: path = "M20 20 L80 80 M80 20 L20 80"; // X
  }

  return (
    <svg viewBox="0 0 100 100" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d={path} stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default GameIcon;
