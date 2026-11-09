
import React, { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Item, ItemStat, StatType } from '../types';
import { RARITY_COLORS } from '../constants';
import GameIcon from './GameIcon';
import { getIdentifyCost } from '../services/gameBalance';

interface TooltipProps {
  item: Item;
  comparedItem?: Item;
  position: { x: number; y: number };
  onClose?: () => void;
}

// Consistent sorting order for easy visual comparison
const STAT_ORDER: StatType[] = [
    StatType.DAMAGE,
    StatType.ARMOR,
    StatType.STRENGTH,
    StatType.DEXTERITY,
    StatType.INTELLIGENCE,
    StatType.VITALITY,
    StatType.CRIT_CHANCE,
    StatType.ATTACK_SPEED,
    StatType.LIFE_STEAL,
    StatType.DODGE_CHANCE,
    StatType.MAGIC_FIND,
    StatType.THORNS
];

const getStatDiff = (stat: ItemStat, comparedItem?: Item) => {
    if (!comparedItem) return <span className="text-green-500 text-[10px] ml-1 font-mono">(New)</span>;
    
    // Find matching stat on the equipped item
    const match = comparedItem.stats.find(s => s.type === stat.type);
    
    // If equipped doesn't have it, it's a pure gain
    if (!match) return <span className="text-green-500 text-[10px] ml-1 font-mono">(+{stat.value})</span>;
    
    const diff = stat.value - match.value;
    if (diff > 0) return <span className="text-green-500 text-[10px] ml-1 font-mono">(+{diff})</span>;
    if (diff < 0) return <span className="text-red-500 text-[10px] ml-1 font-mono">({diff})</span>;
    
    return <span className="text-stone-600 text-[10px] ml-1 font-mono">(=)</span>;
};

const ItemCard = ({ 
    item, 
    label, 
    isEquipped, 
    comparedItem 
}: { 
    item: Item; 
    label?: string; 
    isEquipped?: boolean; 
    comparedItem?: Item; // Only passed to the inspecting item to calculate diffs
}) => {
  const textColor = RARITY_COLORS[item.rarity];
  
  let borderColor = 'border-stone-600';
  let bgGradient = 'from-[#1c1917] to-black'; // Default Dark
  let labelColor = 'bg-stone-800 text-stone-400 border-stone-600';
  let shadowColor = 'shadow-[0_0_30px_rgba(0,0,0,0.8)]';

  if (isEquipped) {
      borderColor = 'border-stone-500'; 
      bgGradient = 'from-[#292524] to-black'; // Slightly lighter/warm for equipped
      labelColor = 'bg-stone-700 text-stone-300 border-stone-500';
      shadowColor = 'shadow-[0_0_20px_rgba(0,0,0,0.6)]'; // Softer shadow for background card
  } else {
      // Rarity Styling for Inspection Card
      if (item.rarity === 'Magic') { 
          borderColor = 'border-blue-800'; 
          bgGradient = 'from-blue-950/20 to-black'; 
          shadowColor = 'shadow-[0_0_30px_rgba(30,64,175,0.3)]';
      }
      if (item.rarity === 'Rare') { 
          borderColor = 'border-yellow-700'; 
          bgGradient = 'from-yellow-950/20 to-black'; 
          shadowColor = 'shadow-[0_0_30px_rgba(234,179,8,0.3)]';
      }
      if (item.rarity === 'Unique') { 
          borderColor = 'border-amber-600'; 
          bgGradient = 'from-amber-950/20 to-black'; 
          shadowColor = 'shadow-[0_0_40px_rgba(217,119,6,0.4)]';
      }
      
      if (label === 'Inspecting' || label === 'New') {
          labelColor = 'bg-green-900 text-green-300 border-green-700';
      }
  }

  // Memoized Sort to ensure stable render order
  const sortedStats = useMemo(() => {
      return [...item.stats].sort((a, b) => {
          let idxA = STAT_ORDER.indexOf(a.type);
          let idxB = STAT_ORDER.indexOf(b.type);
          // Put unknown stats at the end
          if (idxA === -1) idxA = 99;
          if (idxB === -1) idxB = 99;
          return idxA - idxB;
      });
  }, [item.stats]);

  return (
    <div className={`
        w-60 sm:w-64 lg:w-80 
        bg-[#0a0a0a]/95 
        border-2 ${borderColor} 
        ${shadowColor}
        rounded-sm 
        text-xs lg:text-sm 
        relative 
        shrink-0 
        flex flex-col 
        tooltip-card
        transition-all
        ${isEquipped ? 'z-0 opacity-95' : 'z-10'}
    `}>
      {/* Background Texture */}
      <div className="absolute inset-0 bg-texture-noise opacity-10 pointer-events-none"></div>
      
      {/* Header */}
      <div className={`p-2 lg:p-3 bg-gradient-to-b ${bgGradient} border-b ${borderColor} relative shrink-0 flex items-center gap-2 lg:gap-3`}>
          {label && (
            <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 border text-[9px] lg:text-[10px] uppercase tracking-widest font-bold shadow-md rounded-sm z-20 whitespace-nowrap ${labelColor}`}>
              {label}
            </div>
          )}
          <div className="w-9 h-9 lg:w-12 lg:h-12 rounded border border-stone-700/80 bg-black/60 flex items-center justify-center shrink-0 shadow-inner">
            <GameIcon name={item.icon} imageUrl={item.imageUrl} className="w-7 h-7 lg:w-9 lg:h-9" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-bold text-sm lg:text-lg diablo-font ${textColor} tracking-wider truncate`}>
              {item.name}
            </h3>
            <p className={`text-[10px] lg:text-xs uppercase tracking-widest font-bold opacity-70 ${textColor}`}>
              {item.rarity} {item.type}
            </p>
          </div>
      </div>

      {/* Content */}
      <div className="p-2.5 lg:p-4 space-y-2 lg:space-y-3 relative">
        {!item.isIdentified ? (
          <div className="py-2.5 px-2 text-center space-y-2 bg-black/40 rounded border border-red-950/40">
            <div className="text-amber-400 diablo-font text-xs lg:text-sm tracking-wider flex items-center justify-center gap-1.5">
              <span className="text-amber-500 animate-pulse">✦</span>
              <span>Veiled in Shadow</span>
              <span className="text-amber-500 animate-pulse">✦</span>
            </div>
            <p className="text-[11px] lg:text-xs text-stone-400 italic font-serif leading-snug">
              Ancient runes shroud this artifact's enchantments and true powers.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/50 border border-amber-600/50 rounded text-[11px] lg:text-xs text-amber-300 font-sans font-bold shadow-inner">
              <span>Identification Cost:</span>
              <span className="text-amber-400 font-mono text-xs lg:text-sm">{getIdentifyCost(item)}g</span>
            </div>
            <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Click, Tap or Right-Click to identify
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 lg:space-y-1">
            {sortedStats.map((stat, idx) => (
              <div key={idx} className="flex justify-between items-center text-stone-300 font-serif text-xs lg:text-[15px]">
                <span className="text-stone-400">{stat.type === StatType.ATTACK_SPEED ? 'Reacción Rápida' : stat.type}</span>
                <div className="flex items-center">
                    {/* Show diff calculation only on the inspecting card */}
                    {!isEquipped && comparedItem && getStatDiff(stat, comparedItem)}
                    
                    <span className={`font-bold ml-2 ${
                        stat.type === 'Damage' ? 'text-red-400' : 
                        stat.type === 'Armor' ? 'text-stone-200' :
                        stat.type === 'Magic Find' ? 'text-yellow-400' :
                        'text-blue-200'
                    }`}>+{stat.value}{stat.type.includes('Chance') || stat.type.includes('Steal') || stat.type === 'Attack Speed' || stat.type === 'Thorns' ? '%' : ''}</span>
                </div>
              </div>
            ))}
            
            {sortedStats.length === 0 && (
                <div className="text-center text-stone-600 italic text-xs py-1">No stats</div>
            )}
          </div>
        )}

        {item.isIdentified && item.proc && (
          <div className="bg-amber-950/30 border border-amber-700/50 rounded px-2 py-1.5 text-[11px] lg:text-xs text-amber-300">
            <div className="font-bold uppercase tracking-wider text-[9px] lg:text-[10px] text-amber-400 mb-0.5">⚡ Special Effect</div>
            <div>{item.proc.description}</div>
          </div>
        )}

        {item.isIdentified && item.flavorText && (
          <div className="text-stone-500 text-[11px] lg:text-xs border-t border-stone-800 pt-2 mt-1.5">
            <p className="serif-font italic text-stone-400 text-center leading-snug lg:leading-relaxed">"{item.flavorText}"</p>
          </div>
        )}

        <div className="pt-1.5 flex justify-between items-center mt-auto border-t border-white/5">
             <div className="flex gap-2">
                 {isEquipped ? (
                     <span className="text-[9px] lg:text-[10px] text-stone-500 uppercase font-bold">Currently Equipped</span>
                 ) : (
                     <span className="text-[9px] lg:text-[10px] text-green-500 uppercase font-bold">In Inventory</span>
                 )}
             </div>
            <span className="text-stone-700 text-[9px] font-mono">iLvl {item.level}</span>
        </div>
      </div>
    </div>
  );
};

const Tooltip: React.FC<TooltipProps> = ({ item, comparedItem, position, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  
  // Logic: Don't compare item with itself
  const comparison = comparedItem && comparedItem.id !== item.id ? comparedItem : undefined;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const { innerWidth: vw, innerHeight: vh } = window;
    const isPortraitMobile = vw < 640;

    if (isPortraitMobile) {
        // --- MOBILE PORTRAIT LAYOUT: Centered Modal Overlay ---
        setStyle({
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 1,
            maxHeight: '88dvh',
            maxWidth: '95vw',
            overflowY: 'auto',
            zIndex: 100,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '10px',
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '8px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
        });
    } else {
        // --- LANDSCAPE & DESKTOP LAYOUT: Follow Cursor/Tap with Viewport Clamping ---
        const padding = 8;
        const offset = 14;
        
        let x = position.x + offset;
        let y = position.y + offset;
        
        if (x + rect.width > vw - padding) {
            x = position.x - rect.width - offset;
        }
        
        if (y + rect.height > vh - padding) {
            y = position.y - rect.height - offset;
        }

        if (x < padding) x = padding;
        if (x + rect.width > vw - padding) x = Math.max(padding, vw - rect.width - padding);
        
        if (y < padding) y = padding;
        if (y + rect.height > vh - padding) y = Math.max(padding, vh - rect.height - padding);

        setStyle({
            position: 'fixed',
            top: y,
            left: x,
            opacity: 1,
            zIndex: 100,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: '8px',
            maxWidth: 'calc(100dvw - 16px)',
            maxHeight: 'calc(100dvh - 16px)',
            overflowY: 'auto'
        });
    }

  }, [position, item, comparison]);

  return (
    <div
      ref={containerRef}
      className="tooltip-container transition-opacity duration-150 ease-out"
      style={style}
    >
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="sm:hidden self-end px-3 py-1 bg-stone-900/90 border border-stone-600 hover:border-stone-400 text-stone-300 text-xs rounded-full font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 touch-manipulation shadow-lg mb-0.5 cursor-pointer z-30"
        >
          ✕ Cerrar
        </button>
      )}

      {/* Inspecting Item (Left/Top) */}
      {/* Pass comparison item so we can calculate diffs */}
      <ItemCard 
        item={item} 
        label={comparison ? "Inspecting" : undefined} 
        comparedItem={comparison} 
      />
      
      {/* Equipped Item (Right/Bottom) */}
      {comparison && (
          <ItemCard 
            item={comparison} 
            label="Equipped" 
            isEquipped 
          />
      )}
    </div>
  );
};

export default Tooltip;
