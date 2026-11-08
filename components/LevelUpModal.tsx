
import React, { useMemo } from 'react';
import { PassiveSkill, BaseAttributes } from '../types';
import { PASSIVE_THEME_COLORS } from '../constants';
import { BaseModal } from './BaseModal';

interface LevelUpModalProps {
  newPassive: PassiveSkill | null;
  isUpgrade: boolean;
  pointsAvailable: number;
  baseAttributes: BaseAttributes;
  flavorText?: string;
  onAllocate: (stat: keyof BaseAttributes) => void;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ 
  newPassive, 
  isUpgrade, 
  pointsAvailable, 
  baseAttributes, 
  flavorText,
  onAllocate, 
  onClose 
}) => {
  
  const stats: { key: keyof BaseAttributes; label: string; color: string }[] = useMemo(() => [
    { key: 'strength', label: 'Strength', color: 'text-red-500' },
    { key: 'dexterity', label: 'Dexterity', color: 'text-green-500' },
    { key: 'intelligence', label: 'Intelligence', color: 'text-blue-500' },
    { key: 'vitality', label: 'Vitality', color: 'text-purple-500' }
  ], []);

  const themeStyles = newPassive ? PASSIVE_THEME_COLORS[newPassive.theme] : null;

  return (
    <BaseModal.Container zIndex="z-[60]" maxWidth="max-w-4xl" className="border-amber-600 shadow-[0_0_60px_rgba(245,158,11,0.2)]">
      {/* Animated background effect */}
      <div className="absolute top-0 left-0 w-full h-1.5 lg:h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse"></div>

      <BaseModal.Body className="flex flex-col sm:flex-row gap-3 lg:gap-8">
        {/* Left Column: New Skill */}
        <div className="flex-1 flex flex-col shrink-0">
            <h2 className="text-lg lg:text-3xl diablo-font text-amber-500 text-center mb-0.5 lg:mb-2 tracking-widest drop-shadow-md">LEVEL UP!</h2>
            <div className="text-center text-stone-400 mb-2 lg:mb-6 text-[11px] lg:text-sm">You have grown stronger.</div>

            {newPassive && themeStyles ? (
            <div className={`flex-grow flex flex-col justify-center bg-black/40 border-2 ${themeStyles.border} p-2.5 lg:p-6 rounded-lg shadow-inner relative overflow-hidden group`}>
                <div className={`absolute inset-0 ${themeStyles.bg} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                
                <div className="relative z-10">
                    <div className="text-center text-[10px] lg:text-xs uppercase tracking-widest text-stone-500 mb-1 lg:mb-2">
                         {isUpgrade ? 'Skill Upgraded' : 'New Passive Acquired'}
                    </div>
                    
                    <div className="flex flex-col items-center gap-1.5 lg:gap-4 mb-2 lg:mb-4">
                        <div className={`text-3xl lg:text-6xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] animate-bounce`}>
                            {themeStyles.icon}
                        </div>
                        <div>
                            <h3 className={`text-base lg:text-2xl ${themeStyles.text} font-bold diablo-font text-center`}>{newPassive.name}</h3>
                            <div className={`text-center text-[10px] lg:text-xs uppercase tracking-wider ${themeStyles.text} opacity-70 border-b border-stone-700 inline-block px-2 mx-auto`}>
                                {newPassive.theme}
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-stone-200 font-mono text-[11px] lg:text-sm mb-2 lg:mb-4 bg-black/50 p-1.5 lg:p-2 rounded border border-stone-800">
                        <span className="text-amber-500">Rank {newPassive.level}</span>
                        <div className="h-px bg-stone-800 w-1/2 mx-auto my-1 lg:my-2"></div>
                        {newPassive.description.replace('{value}', newPassive.value.toString())}
                    </div>
                    
                    {/* Flavor Text */}
                    <div className="pt-1 lg:pt-4 mt-auto">
                        <p className="text-center text-stone-500 text-[10px] lg:text-xs font-serif italic leading-relaxed">
                        {flavorText ? `"${flavorText}"` : "..."}
                        </p>
                    </div>
                </div>
            </div>
            ) : (
            <div className="flex-grow flex flex-col items-center justify-center bg-black/40 border-2 border-amber-800/50 p-3 lg:p-6 rounded-lg shadow-inner text-center relative overflow-hidden">
                <div className="text-3xl lg:text-6xl mb-1.5 lg:mb-3 animate-bounce">📜</div>
                <h3 className="text-base lg:text-xl diablo-font text-amber-400 font-bold mb-1 lg:mb-2">+1 Skill Talent Point</h3>
                <p className="text-stone-300 text-[11px] lg:text-sm mb-2 lg:mb-4 max-w-xs leading-relaxed">
                    You gained 1 Skill Point to spend in the branching Skill Tree. Choose and specialize your build path freely!
                </p>
                <div className="bg-amber-950/60 border border-amber-600/70 text-amber-300 text-[10px] lg:text-xs font-bold px-3 py-1 lg:px-4 lg:py-2 rounded-full uppercase tracking-widest shadow-md">
                    Open Skill Tree in Town
                </div>
                {flavorText && (
                    <p className="mt-2 lg:mt-4 text-center text-stone-500 text-[10px] lg:text-xs font-serif italic">
                        "{flavorText}"
                    </p>
                )}
            </div>
            )}
        </div>

        {/* Right Column: Stat Allocation */}
        <div className="flex-1 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-stone-800 pt-2.5 sm:pt-0 sm:pl-4 lg:pl-8">
          <div className="mb-2.5 lg:mb-6">
            <h3 className="text-sm lg:text-xl diablo-font text-stone-300 mb-2 lg:mb-4 border-b border-stone-700 pb-1 lg:pb-2">Attribute Allocation</h3>
            
            <div className="flex justify-between items-center mb-2 lg:mb-4 bg-stone-900/50 p-1.5 lg:p-3 rounded border border-stone-700">
                <span className="text-stone-400 text-xs lg:text-sm uppercase tracking-wider">Points Available</span>
                <span className="text-amber-500 font-bold text-lg lg:text-2xl animate-pulse">{pointsAvailable}</span>
            </div>
            
            <div className="space-y-1.5 lg:space-y-3">
                {stats.map((stat) => (
                <div key={stat.key} className="flex items-center justify-between bg-black/30 p-1.5 lg:p-3 rounded border border-stone-800 hover:border-stone-600 transition-colors">
                    <div className="flex flex-col">
                        <span className={`font-bold text-xs lg:text-base ${stat.color}`}>{stat.label}</span>
                    </div>
                    <div className="flex items-center gap-3 lg:gap-4">
                        <span className="text-stone-200 font-mono text-sm lg:text-xl">{baseAttributes[stat.key]}</span>
                        <button
                            onClick={() => onAllocate(stat.key)}
                            disabled={pointsAvailable <= 0}
                            className={`
                                w-7 h-7 lg:w-10 lg:h-10 flex items-center justify-center rounded border-2 font-bold text-base lg:text-xl transition-all
                                ${pointsAvailable > 0 
                                ? 'bg-stone-800 border-stone-600 text-amber-400 hover:bg-stone-700 hover:border-amber-500 hover:scale-110 hover:text-white shadow-lg' 
                                : 'bg-stone-950 border-stone-800 text-stone-700 cursor-not-allowed'}
                            `}
                        >
                        +
                        </button>
                    </div>
                </div>
                ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2 lg:py-4 mt-auto bg-gradient-to-b from-amber-900 to-amber-950 hover:from-amber-800 hover:to-amber-900 border border-amber-700 text-amber-100 text-xs lg:text-base font-bold tracking-[0.2em] uppercase transition-all shadow-lg hover:shadow-amber-900/40"
          >
            {pointsAvailable > 0 ? 'Finish Later' : 'Accept Power'}
          </button>
        </div>
      </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(LevelUpModal);
