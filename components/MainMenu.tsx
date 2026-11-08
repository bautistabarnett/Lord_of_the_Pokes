
import React, { useState, useEffect } from 'react';
import { SaveSlotMetadata } from '../types';
import { storageService } from '../services/storageService';
import GameIcon from './GameIcon';

interface MainMenuProps {
    onStartGame: (slotId: number, isNew: boolean) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
    const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [showConfirmOverride, setShowConfirmOverride] = useState(false);

    const refreshSlots = () => {
        setSlots(storageService.getSlots());
    };

    useEffect(() => {
        refreshSlots();
    }, []);

    const handleSlotClick = (slotId: number) => {
        setSelectedSlot(slotId);
        setShowConfirmOverride(false);
    };

    const handlePlay = () => {
        if (selectedSlot === null) return;
        const slot = slots.find(s => s.id === selectedSlot);
        if (!slot) return;

        if (slot.isEmpty) {
            onStartGame(selectedSlot, true);
        } else {
            onStartGame(selectedSlot, false);
        }
    };

    const handleNewGameOverride = () => {
        if (selectedSlot === null) return;
        onStartGame(selectedSlot, true); // Force new game
    };

    const handleDelete = () => {
        if (selectedSlot === null) return;
        if (window.confirm("Are you sure you want to delete this save? This cannot be undone.")) {
            storageService.deleteGame(selectedSlot);
            refreshSlots();
            setSelectedSlot(null);
        }
    };

    const selectedSlotData = slots.find(s => s.id === selectedSlot);

    return (
        <div className="w-full h-full relative overflow-y-auto bg-[#050505] custom-scrollbar touch-pan-y">
             <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 animate-pulse pointer-events-none z-0"></div>
             
             {/* Inner Container: min-h-full ensures vertical centering if content is small, but flows if large */}
             <div className="relative z-10 w-full min-h-full flex flex-col items-center justify-center p-3 lg:p-8 safe-area-bottom">
                 
                 <div className="flex flex-col items-center shrink-0 mt-2 lg:mt-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl diablo-font text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-700 mb-1 lg:mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] text-center">
                        LOOT OF THE VOID
                    </h1>
                    <p className="text-stone-500 font-serif italic text-xs lg:text-base mb-3 lg:mb-10 text-center">Choose your destiny...</p>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6 w-full max-w-5xl mb-3 lg:mb-10 shrink-0">
                     {slots.map(slot => (
                         <div 
                            key={slot.id}
                            onClick={() => handleSlotClick(slot.id)}
                            className={`
                                relative border-2 p-3 lg:p-6 h-24 sm:h-28 lg:h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group rounded overflow-hidden
                                ${selectedSlot === slot.id 
                                    ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] scale-[1.02] z-20 ring-1 ring-amber-500/50' 
                                    : 'border-stone-800 bg-stone-950/50 hover:border-stone-600'
                                }
                            `}
                         >
                             {/* Content */}
                             <div className="flex flex-row lg:flex-col items-center gap-3 lg:gap-2 w-full justify-center">
                                 <div className="text-2xl lg:text-3xl mb-0 lg:mb-2 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                     {slot.isEmpty ? '🕸️' : '🦸'}
                                 </div>
                                 <div className="flex flex-col items-start lg:items-center overflow-hidden">
                                     <div className="diablo-font text-base lg:text-xl text-stone-300 mb-0.5 lg:mb-1 whitespace-nowrap">Slot {slot.id}</div>
                                     
                                     {slot.isEmpty ? (
                                         <div className="text-stone-600 text-xs lg:text-sm">Empty</div>
                                     ) : (
                                         <>
                                             <div className="text-amber-500 font-bold text-xs lg:text-base truncate max-w-full">{slot.label}</div>
                                             <div className="text-stone-500 text-[10px] lg:text-xs mt-0.5 lg:mt-2">
                                                 {new Date(slot.timestamp).toLocaleDateString()}
                                             </div>
                                         </>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Action Bar - Wrapper ensures space is reserved */}
                 <div className="w-full max-w-4xl flex justify-center min-h-[52px] lg:min-h-[88px] mb-2 lg:mb-6 shrink-0 z-30">
                     {selectedSlotData && (
                         <div className="flex flex-col sm:flex-row gap-2.5 lg:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full sm:w-auto p-1 items-center">
                             {!selectedSlotData.isEmpty ? (
                                 <>
                                     <button 
                                        onClick={handlePlay}
                                        className="w-full sm:w-auto px-6 py-2.5 lg:px-8 lg:py-4 bg-amber-900 hover:bg-amber-800 border border-amber-600 text-amber-100 text-xs lg:text-base font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(180,83,9,0.4)] transition-all order-1 active:scale-95 rounded"
                                     >
                                         Load Game
                                     </button>
                                     
                                     {!showConfirmOverride ? (
                                         <button 
                                            onClick={() => setShowConfirmOverride(true)}
                                            className="w-full sm:w-auto px-6 py-2.5 lg:px-8 lg:py-4 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-xs lg:text-base font-bold uppercase tracking-widest transition-all order-2 active:scale-95 rounded"
                                         >
                                             New Game
                                         </button>
                                     ) : (
                                         <div className="flex flex-col sm:flex-row gap-2 order-2 w-full sm:w-auto">
                                             <button 
                                                onClick={handleNewGameOverride}
                                                className="w-full sm:w-auto px-4 py-2.5 lg:py-4 bg-red-900 hover:bg-red-800 border border-red-600 text-red-100 text-xs lg:text-base font-bold uppercase tracking-widest transition-all active:scale-95 rounded"
                                             >
                                                 Confirm Overwrite
                                             </button>
                                             <button 
                                                onClick={() => setShowConfirmOverride(false)}
                                                className="w-full sm:w-auto px-4 py-2.5 lg:py-4 bg-black border border-stone-700 text-stone-400 text-xs lg:text-base font-bold uppercase tracking-widest active:scale-95 rounded"
                                             >
                                                 Cancel
                                             </button>
                                         </div>
                                     )}
                                     
                                     <button 
                                        onClick={handleDelete}
                                        className="w-full sm:w-auto px-4 py-2.5 lg:py-4 border border-red-900/50 text-red-900 hover:text-red-500 hover:border-red-500 text-xs lg:text-base font-bold uppercase tracking-widest transition-all order-3 active:scale-95 rounded"
                                     >
                                         Delete
                                     </button>
                                 </>
                             ) : (
                                 <button 
                                    onClick={handlePlay}
                                    className="w-full sm:w-auto px-8 py-2.5 lg:px-12 lg:py-4 bg-amber-900 hover:bg-amber-800 border border-amber-600 text-amber-100 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(180,83,9,0.4)] transition-all text-sm lg:text-xl active:scale-95 rounded"
                                 >
                                     Start Adventure
                                 </button>
                             )}
                         </div>
                     )}
                 </div>
                 
                 {/* Footer - Static margin top to ensure it pushes below buttons even on small screens */}
                 <div className="text-stone-700 text-[10px] lg:text-xs mt-auto pt-1 lg:pt-4 shrink-0 pb-safe">
                     v1.1.0 • Loot of the Void
                 </div>
             </div>
        </div>
    );
};
