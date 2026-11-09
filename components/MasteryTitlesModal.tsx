import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { HERO_AVATARS, HeroAvatar, getTitleById, DEFAULT_TITLE_ID } from '../services/spriteCatalog';

interface MasteryTitlesModalProps {
  bossTrophies: number;
  unlockedTitleIds: string[];
  activeTitleId: string;
  heroImageUrl?: string;
  onUnlockTitle: (titleId: string) => void;
  onEquipTitle: (titleId: string) => void;
  onEquipSkin: (imageUrl: string) => void;
  onEquipBoth: (titleId: string, imageUrl: string) => void;
  onClose: () => void;
}

export const MasteryTitlesModal: React.FC<MasteryTitlesModalProps> = ({
  bossTrophies,
  unlockedTitleIds,
  activeTitleId,
  heroImageUrl,
  onUnlockTitle,
  onEquipTitle,
  onEquipSkin,
  onEquipBoth,
  onClose,
}) => {
  // Pre-select the currently active title (or fallback to red)
  const [selectedId, setSelectedId] = useState<string>(activeTitleId || DEFAULT_TITLE_ID);

  const selectedAvatar: HeroAvatar = getTitleById(selectedId) || HERO_AVATARS[0];
  const isUnlocked = unlockedTitleIds.includes(selectedAvatar.id) || selectedAvatar.trophyCost === 0;
  const isActiveTitle = activeTitleId === selectedAvatar.id;
  const isActiveSkin = heroImageUrl === selectedAvatar.imageUrl;
  const canAfford = bossTrophies >= selectedAvatar.trophyCost;

  return (
    <BaseModal.Container zIndex="z-[110]" maxWidth="max-w-4xl">
      <BaseModal.Header
        title="Mastery Titles & Archetypes"
        subtitle="Combat Triggers & Battle Sprites"
        icon="👑"
        textColor="text-amber-500"
        onClose={onClose}
      />
      <BaseModal.Body className="bg-stone-950 p-2 sm:p-3 lg:p-4">
        {/* Top Trophy Banner */}
        <div className="flex items-center justify-between bg-stone-900/80 border border-amber-600/30 rounded-lg px-3 py-1.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base lg:text-lg">🏆</span>
            <span className="text-xs lg:text-sm font-bold text-amber-400">
              {bossTrophies} <span className="text-stone-400 font-normal">Boss {bossTrophies === 1 ? 'Trophy' : 'Trophies'}</span>
            </span>
          </div>
          <span className="text-[10px] lg:text-xs text-stone-400 font-mono">
            Defeat Area Bosses & Unique Overlords to earn trophies
          </span>
        </div>

        {/* Master - Detail Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 max-h-[66dvh] sm:max-h-[70dvh] overflow-hidden">
          {/* Left: Master Grid of 17 Titles */}
          <div className="md:col-span-7 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 content-start">
            {HERO_AVATARS.map((avatar) => {
              const unlocked = unlockedTitleIds.includes(avatar.id) || avatar.trophyCost === 0;
              const isSelected = selectedId === avatar.id;
              const isCurrentTitle = activeTitleId === avatar.id;
              const isCurrentSkin = heroImageUrl === avatar.imageUrl;

              return (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedId(avatar.id)}
                  className={`relative flex flex-col items-center p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : unlocked
                      ? 'border-stone-800 bg-stone-900/60 hover:border-stone-600 hover:bg-stone-800/80'
                      : 'border-stone-900 bg-black/60 opacity-60 hover:opacity-90 hover:border-stone-700'
                  }`}
                >
                  {/* Status badges */}
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    {isCurrentTitle && (
                      <span className="text-[9px] bg-amber-500/90 text-black px-1 rounded-full font-bold shadow" title="Active Combat Title">👑</span>
                    )}
                    {isCurrentSkin && (
                      <span className="text-[9px] bg-blue-500/90 text-white px-1 rounded-full font-bold shadow" title="Active Skin">🧢</span>
                    )}
                  </div>

                  {/* Avatar Icon */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 border border-stone-700 flex items-center justify-center mb-1 overflow-hidden relative shadow-inner">
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.name}
                      className={`w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow ${!unlocked ? 'grayscale contrast-125' : ''}`}
                    />
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-xs">🔒</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-200 truncate w-full text-center">
                    {avatar.name}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-amber-500/80 font-mono truncate w-full text-center">
                    {avatar.archetype}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Detail Inspector */}
          <div className="md:col-span-5 bg-stone-900/70 border border-stone-800 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div>
              {/* Header Info */}
              <div className="flex items-center gap-3 border-b border-stone-800 pb-2.5 mb-2.5">
                <div className="w-14 h-14 rounded-full bg-black/80 border border-amber-500/50 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <img
                    src={selectedAvatar.imageUrl}
                    alt={selectedAvatar.name}
                    className="w-11 h-11 object-contain drop-shadow"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm lg:text-base diablo-font text-stone-100 font-bold truncate">
                      {selectedAvatar.className}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-stone-400 font-semibold">{selectedAvatar.name}</span>
                    <span className="text-[10px] font-mono uppercase bg-amber-950/70 text-amber-400 border border-amber-800/60 px-1.5 py-0.2 rounded">
                      {selectedAvatar.archetype}
                    </span>
                  </div>
                </div>
              </div>

              {/* Combat Trigger Card */}
              <div className="bg-black/60 border border-amber-900/40 rounded-lg p-2.5 mb-2.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono uppercase mb-1">
                  <span>⚡ Combat Trigger</span>
                  <span className="text-stone-400">{selectedAvatar.proc.trigger}</span>
                </div>
                <p className="text-xs text-stone-200 leading-snug font-sans">
                  {selectedAvatar.proc.description}
                </p>
                <div className="mt-2 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[9px] text-stone-400 font-mono">
                  <span>Chance: {Math.round(selectedAvatar.proc.chance * 100)}%</span>
                  <span>Cooldown: {selectedAvatar.proc.cooldown > 0 ? `${selectedAvatar.proc.cooldown} turns` : 'None'}</span>
                </div>
              </div>

              {/* Unlock Status / Cost */}
              <div className="mb-2.5 text-xs">
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span>✓</span>
                    <span>Title Unlocked</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-stone-950/80 border border-stone-800 rounded p-2">
                    <span className="text-stone-300">Unlock Cost:</span>
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      🏆 {selectedAvatar.trophyCost} Boss {selectedAvatar.trophyCost === 1 ? 'Trophy' : 'Trophies'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-stone-800 flex flex-col gap-1.5">
              {!isUnlocked ? (
                <button
                  onClick={() => onUnlockTitle(selectedAvatar.id)}
                  disabled={!canAfford}
                  className={`w-full py-2 px-3 rounded font-bold uppercase tracking-wider text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    canAfford
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 cursor-pointer'
                      : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>🏆</span>
                  <span>Unlock Title ({selectedAvatar.trophyCost} Trophies)</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onEquipTitle(selectedAvatar.id)}
                    disabled={isActiveTitle}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] uppercase tracking-wide transition-all border ${
                      isActiveTitle
                        ? 'bg-amber-950/60 border-amber-600 text-amber-300 cursor-default'
                        : 'bg-stone-800 border-stone-700 hover:border-amber-500 text-stone-200 hover:bg-stone-700 cursor-pointer'
                    }`}
                  >
                    {isActiveTitle ? '👑 Active Title' : 'Equip Title 👑'}
                  </button>
                  <button
                    onClick={() => onEquipSkin(selectedAvatar.imageUrl)}
                    disabled={isActiveSkin}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] uppercase tracking-wide transition-all border ${
                      isActiveSkin
                        ? 'bg-blue-950/60 border-blue-600 text-blue-300 cursor-default'
                        : 'bg-stone-800 border-stone-700 hover:border-blue-500 text-stone-200 hover:bg-stone-700 cursor-pointer'
                    }`}
                  >
                    {isActiveSkin ? '🧢 Active Skin' : 'Equip Skin 🧢'}
                  </button>
                  <button
                    onClick={() => onEquipBoth(selectedAvatar.id, selectedAvatar.imageUrl)}
                    disabled={isActiveTitle && isActiveSkin}
                    className="col-span-2 py-1.5 px-2 rounded font-bold text-[11px] uppercase tracking-wide transition-all bg-gradient-to-r from-stone-800 to-stone-700 hover:from-amber-900 hover:to-amber-800 text-stone-200 hover:text-white border border-stone-600 hover:border-amber-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Equip Both (Title + Skin)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </BaseModal.Body>
    </BaseModal.Container>
  );
};
