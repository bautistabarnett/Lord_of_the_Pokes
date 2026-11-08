import React from 'react';
import { Item } from '../types';
import { RARITY_BG_COLORS } from '../constants';
import GameIcon from './GameIcon';

interface InventorySlotProps {
  item?: Item | null;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
  setHoverItem: (item: Item | null, pos: {x: number, y: number}) => void;
  
  // Drag and Drop Props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;

  isVisualizeMode?: boolean;
  isActive?: boolean; // For equipment slots or selected items
}

const InventorySlot: React.FC<InventorySlotProps> = ({ 
  item, 
  onClick, 
  onRightClick, 
  setHoverItem,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isVisualizeMode,
  isActive
}) => {
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (item) {
      setHoverItem(item, { x: e.clientX, y: e.clientY });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (item) {
          const touch = e.touches[0];
          // Update hover item on touch start to ensure tooltip renders
          setHoverItem(item, { x: touch.clientX, y: touch.clientY });
      }
  };

  const handleMouseLeave = () => {
    setHoverItem(null, { x: 0, y: 0 });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if(item) {
        setHoverItem(item, { x: e.clientX, y: e.clientY });
    }
  }

  const getRarityTextColor = (rarity: string) => {
     if (rarity === 'Magic') return 'text-blue-400';
     if (rarity === 'Rare') return 'text-yellow-300';
     if (rarity === 'Unique') return 'text-amber-500';
     return 'text-stone-400';
  };
  
  // High contrast borders and shadows for better visibility
  const getSlotStyles = (rarity: string) => {
    if (rarity === 'Magic') return 'border-blue-800 shadow-[0_0_10px_rgba(30,64,175,0.3)]';
    if (rarity === 'Rare') return 'border-yellow-700 shadow-[0_0_10px_rgba(234,179,8,0.3)]';
    if (rarity === 'Unique') return 'border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.5)]';
    return 'border-stone-700';
  };

  return (
    <div 
      className={`
        slot
        w-9 h-9 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 relative transition-all duration-200 group flex items-center justify-center select-none
        ${item 
            ? `bg-stone-900 border ${getSlotStyles(item.rarity)} hover:scale-105 hover:z-10` 
            : `bg-[#050505] border border-stone-800 inner-shadow hover:border-stone-600 ${isActive ? 'border-stone-500 bg-stone-800' : ''}`
        }
        rounded-[4px]
        ${isVisualizeMode && item ? 'cursor-help ring-2 ring-purple-500 animate-pulse' : item ? 'cursor-pointer' : ''}
        ${isActive ? 'ring-1 ring-white/20' : ''}
      `}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); onRightClick(e); }}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      
      style={{ touchAction: 'manipulation' }} // Optimize for touch
    >
      {/* Texture overlay for empty slots */}
      {!item && <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] rounded-[3px]"></div>}

      {item && (
        <div className={`w-full h-full p-1 flex items-center justify-center ${RARITY_BG_COLORS[item.rarity]} bg-opacity-20 relative pointer-events-none overflow-hidden rounded-[3px]`}>
           
           {/* Icon */}
           <GameIcon name={item.icon} imageUrl={item.imageUrl} className={`w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 ${getRarityTextColor(item.rarity)} drop-shadow-lg z-10`} />
           
           {/* Rarity Shine FX */}
           {(item.rarity === 'Unique') && (
             <div className="absolute inset-0">
               <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-amber-500/10 to-transparent animate-[spin_4s_linear_infinite]"></div>
             </div>
           )}

           {/* Unidentified Badge */}
           {!item.isIdentified && (
             <div className="absolute top-0.5 right-0.5 w-3 h-3 flex items-center justify-center bg-red-950 border border-red-700 rounded-full z-20 shadow-sm">
               <span className="text-red-500 text-[9px] font-bold leading-none animate-pulse">?</span>
             </div>
           )}
           
           {/* Visualize Mode Overlay */}
           {isVisualizeMode && (
               <div className="absolute inset-0 bg-purple-500/30 z-30 flex items-center justify-center backdrop-blur-[1px] rounded-[3px]">
                   <span className="text-xs animate-bounce">🔮</span>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default InventorySlot;