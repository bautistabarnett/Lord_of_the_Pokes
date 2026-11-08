
import React from 'react';
import { PassiveSkill, Rarity } from '../types';
import { PASSIVE_THEME_COLORS, RARITY_COLORS } from '../constants';
import { BaseModal } from './BaseModal';

interface SkillRewardModalProps {
  skill: PassiveSkill;
  isUpgrade: boolean;
  onClose: () => void;
}

const SkillRewardModal: React.FC<SkillRewardModalProps> = ({ skill, isUpgrade, onClose }) => {
  const themeStyles = PASSIVE_THEME_COLORS[skill.theme];
  
  let borderColor = 'border-stone-500';
  let glowColor = 'shadow-[0_0_50px_rgba(255,255,255,0.2)]';
  let title = "New Skill Discovered";
  
  if (skill.rarity === Rarity.UNIQUE) {
      borderColor = 'border-amber-500';
      glowColor = 'shadow-[0_0_80px_rgba(245,158,11,0.5)]';
      title = "LEGENDARY DISCOVERY";
  } else if (skill.rarity === Rarity.RARE) {
      borderColor = 'border-yellow-400';
      glowColor = 'shadow-[0_0_60px_rgba(250,204,21,0.3)]';
      title = "Rare Skill Found";
  }

  return (
    <BaseModal.Container zIndex="z-[100]" maxWidth="max-w-xl" className={`${borderColor} ${glowColor}`}>
        <div className="absolute inset-0 bg-black/90 z-0"></div>
        {skill.rarity === Rarity.UNIQUE && (
            <div className="absolute inset-0 bg-gradient-to-t from-amber-900/40 via-transparent to-transparent animate-pulse z-0"></div>
        )}

        <BaseModal.Body className="relative z-10 flex flex-col items-center pt-3 pb-3 lg:pt-8 lg:pb-4">
            <h2 className={`text-lg lg:text-3xl diablo-font text-center mb-1 lg:mb-2 tracking-widest uppercase ${RARITY_COLORS[skill.rarity]}`}>
                {title}
            </h2>
            <div className="text-stone-500 text-[10px] lg:text-xs uppercase tracking-widest mb-2.5 lg:mb-8">
                {isUpgrade ? 'Existing Skill Upgraded' : 'Added to your Grimoire'}
            </div>

            <div className={`w-16 h-16 lg:w-40 lg:h-40 flex items-center justify-center rounded-full bg-black border-2 lg:border-4 ${borderColor} mb-2.5 lg:mb-6 relative group`}>
                <span className="text-3xl lg:text-7xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-bounce">
                    {themeStyles.icon}
                </span>
                {skill.rarity === Rarity.UNIQUE && (
                    <div className="absolute inset-0 rounded-full border-t-2 border-amber-300 animate-spin opacity-50"></div>
                )}
            </div>

            <div className={`text-lg lg:text-3xl font-bold mb-1 lg:mb-2 ${themeStyles.text}`}>{skill.name}</div>
            <div className={`px-2.5 py-0.5 lg:px-3 lg:py-1 rounded border ${themeStyles.border} ${themeStyles.bg} text-[9px] lg:text-[10px] uppercase font-bold text-stone-300 mb-2.5 lg:mb-6`}>
                {skill.theme} • {skill.rarity}
            </div>

            <div className="w-full bg-stone-900/80 border border-stone-700 p-2.5 lg:p-4 rounded text-center text-stone-300 text-xs lg:text-base italic mb-2 lg:mb-4">
                {skill.description.replace('{value}', skill.value.toString())}
            </div>
            
            {skill.proc && (
                <div className="text-[11px] lg:text-xs text-amber-500 font-mono mb-2 lg:mb-4">
                    Special Effect: {skill.proc.description}
                </div>
            )}

            <button 
                onClick={onClose}
                className={`w-full py-2 lg:py-3 mt-1 lg:mt-4 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-white text-xs lg:text-base font-bold tracking-widest uppercase transition-all shadow-lg hover:scale-[1.02]`}
            >
                Claim Power
            </button>

        </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(SkillRewardModal);
