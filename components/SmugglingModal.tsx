
import React, { useState } from 'react';
import { SmugglingBundle, Item, Rarity } from '../types';
import { SMUGGLING_BUNDLES, RARITY_COLORS } from '../constants';
import GameIcon from './GameIcon';
import InventorySlot from './InventorySlot';
import { BaseModal } from './BaseModal';

interface SmugglingModalProps {
  gold: number;
  onPurchase: (cost: number) => void;
  onGenerateLoot: (forcedRarity?: Rarity) => Item | null;
  onClose: () => void;
  addToInventory: (item: Item) => boolean;
}

const SmugglingModal: React.FC<SmugglingModalProps> = ({ 
  gold, 
  onPurchase, 
  onGenerateLoot, 
  onClose,
  addToInventory
}) => {
  const [selectedBundle, setSelectedBundle] = useState<SmugglingBundle | null>(null);
  const [purchasedItem, setPurchasedItem] = useState<Item | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleBuy = (bundle: SmugglingBundle) => {
    if (gold < bundle.cost) return;
    
    setSelectedBundle(bundle);
    onPurchase(bundle.cost);
    setIsOpening(true);
    setPurchasedItem(null);

    setTimeout(() => {
        const roll = Math.random();
        let targetRarity: Rarity = Rarity.COMMON;

        const uChance = bundle.dropChances[Rarity.UNIQUE] || 0;
        const rChance = bundle.dropChances[Rarity.RARE] || 0;
        const mChance = bundle.dropChances[Rarity.MAGIC] || 0;

        if (roll < uChance) {
          targetRarity = Rarity.UNIQUE;
        } else if (roll < uChance + rChance) {
          targetRarity = Rarity.RARE;
        } else if (roll < uChance + rChance + mChance) {
          targetRarity = Rarity.MAGIC;
        }

        // Apply guaranteed quality floor
        if (bundle.guaranteedRarity === Rarity.RARE && targetRarity !== Rarity.UNIQUE) {
          targetRarity = Rarity.RARE;
        } else if (bundle.guaranteedRarity === Rarity.MAGIC && targetRarity === Rarity.COMMON) {
          targetRarity = Rarity.MAGIC;
        }

        let item = onGenerateLoot(targetRarity);
        if (!item) {
          item = onGenerateLoot(bundle.guaranteedRarity || Rarity.COMMON) as Item;
        }

        setPurchasedItem(item);
        setIsOpening(false);
    }, 2000);
  };

  const handleKeep = () => {
      if (purchasedItem) {
          const success = addToInventory(purchasedItem);
          if (success) {
              handleDiscard();
          }
      }
  };

  const handleDiscard = () => {
      setPurchasedItem(null);
      setSelectedBundle(null);
  };

  return (
    <BaseModal.Container zIndex="z-[60]" maxWidth="max-w-5xl" className="h-[92dvh] lg:h-[80vh] border-stone-600">
        <BaseModal.Header 
            title="The Black Market" 
            subtitle='"No questions asked..."' 
            icon="🕵️‍♂️" 
            onClose={onClose} 
        />

        {/* Gold Display */}
        <div className="absolute top-2 lg:top-3 right-14 lg:right-24 z-20 bg-black/50 px-2.5 lg:px-4 py-1 lg:py-2 rounded border border-amber-900/50 flex items-center gap-1.5 lg:gap-2">
            <span className="text-amber-500 font-bold text-xs lg:text-base">{gold.toLocaleString()}</span>
            <span className="text-[9px] lg:text-[10px] text-stone-500 uppercase hidden sm:inline">Gold</span>
        </div>

        <BaseModal.Body className="bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] bg-stone-950 flex items-center justify-center">
            
            {/* Bundle Selection */}
            {!isOpening && !purchasedItem && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6 w-full max-w-4xl my-auto">
                    {SMUGGLING_BUNDLES.map(bundle => {
                        const canAfford = gold >= bundle.cost;
                        return (
                            <div 
                                key={bundle.id}
                                onClick={() => canAfford && handleBuy(bundle)}
                                className={`
                                    relative group border-2 rounded-lg p-3 lg:p-6 flex flex-col items-center text-center transition-all duration-300
                                    ${canAfford 
                                        ? 'border-stone-700 bg-stone-900/80 hover:border-amber-500 hover:bg-stone-800 hover:-translate-y-1 cursor-pointer shadow-lg' 
                                        : 'border-red-900/30 bg-stone-950/50 opacity-60 cursor-not-allowed grayscale'
                                    }
                                `}
                            >
                                <div className="mb-2 lg:mb-4 relative">
                                    <div className={`w-12 h-12 lg:w-24 lg:h-24 flex items-center justify-center rounded-full bg-black/40 border border-stone-800 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                                        <GameIcon name={bundle.icon} className="w-8 h-8 lg:w-16 lg:h-16 text-stone-400 group-hover:text-amber-100" />
                                    </div>
                                </div>

                                <h3 className="text-sm lg:text-xl font-bold text-stone-200 mb-1 lg:mb-2 diablo-font">{bundle.name}</h3>
                                <p className="text-stone-500 text-[11px] lg:text-sm mb-2 lg:mb-4 flex-grow italic px-1">{bundle.description}</p>

                                <div className="w-full border-t border-stone-800 pt-2 lg:pt-4 mt-auto">
                                    {bundle.guaranteedRarity && (
                                        <div className={`text-[10px] lg:text-xs uppercase tracking-widest mb-1 font-bold ${RARITY_COLORS[bundle.guaranteedRarity]}`}>
                                            Guaranteed {bundle.guaranteedRarity}
                                        </div>
                                    )}
                                    <div className={`text-sm lg:text-lg font-mono font-bold ${canAfford ? 'text-amber-500' : 'text-red-500'}`}>
                                        {bundle.cost.toLocaleString()} Gold
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Opening Animation */}
            {isOpening && selectedBundle && (
                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                    <div className="w-16 h-16 lg:w-32 lg:h-32 mb-4 lg:mb-8 animate-bounce relative">
                        <GameIcon name={selectedBundle.icon} className="w-full h-full text-stone-200" />
                        <div className="absolute inset-0 bg-amber-500/20 blur-xl animate-pulse rounded-full"></div>
                    </div>
                    <h3 className="text-lg lg:text-2xl diablo-font text-amber-500 animate-pulse">Smuggling...</h3>
                    <p className="text-stone-500 text-xs lg:text-base mt-1 lg:mt-2">The guards are looking the other way.</p>
                </div>
            )}

            {/* Result Reveal */}
            {purchasedItem && (
                <div className="flex flex-col items-center justify-center w-full max-w-md animate-in zoom-in duration-300 my-auto">
                    <div className="text-stone-400 uppercase tracking-widest text-xs lg:text-sm mb-2 lg:mb-6">Transaction Complete</div>
                    
                    <div className="scale-125 lg:scale-150 mb-4 lg:mb-8 p-3 lg:p-4 bg-black/50 rounded-lg border border-stone-700 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <InventorySlot 
                            item={purchasedItem} 
                            onClick={() => {}} 
                            onRightClick={() => {}} 
                            setHoverItem={() => {}} 
                        />
                    </div>

                    <div className={`text-base lg:text-2xl diablo-font mb-1 lg:mb-2 ${RARITY_COLORS[purchasedItem.rarity]}`}>
                        {purchasedItem.name}
                    </div>
                    <div className="text-stone-500 text-xs lg:text-sm mb-3 lg:mb-8">
                        {purchasedItem.rarity} {purchasedItem.type}
                    </div>

                    <div className="flex flex-row gap-3 lg:gap-4 w-full">
                        <button 
                            onClick={handleDiscard}
                            className="flex-1 py-2 lg:py-3 border border-stone-600 text-stone-400 hover:bg-stone-800 hover:text-white font-bold uppercase tracking-widest rounded transition-colors text-xs lg:text-sm"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleKeep}
                            className="flex-1 py-2 lg:py-3 bg-amber-900 border border-amber-700 text-amber-100 hover:bg-amber-800 font-bold uppercase tracking-widest rounded shadow-lg hover:shadow-amber-900/20 transition-all text-xs lg:text-sm"
                        >
                            Keep Item
                        </button>
                    </div>
                </div>
            )}
        </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(SmugglingModal);
