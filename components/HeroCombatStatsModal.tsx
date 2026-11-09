import React from 'react';
import { BaseModal } from './BaseModal';
import { PlayerStats, CombatStatusEffect, ActiveEffect, CombatStance } from '../types';
import { BALANCE, STANCE_META } from '../services/gameBalance';
import { getTitleById, DEFAULT_HERO_AVATAR } from '../services/spriteCatalog';

interface HeroCombatStatsModalProps {
  playerStats: PlayerStats;
  playerHp: number;
  combatStance: CombatStance;
  combatStatusEffects: CombatStatusEffect[];
  activeEffects: ActiveEffect[];
  onClose: () => void;
}

export const HeroCombatStatsModal: React.FC<HeroCombatStatsModalProps> = ({
  playerStats,
  playerHp,
  combatStance,
  combatStatusEffects,
  activeEffects,
  onClose,
}) => {
  // Dynamic buffs on player
  const playerCombatEffects = combatStatusEffects.filter((e) => e.target === 'player');
  const scalingStr = playerCombatEffects.find((e) => e.type === 'scaling_strength');
  const critBoost = playerCombatEffects.find((e) => e.type === 'crit_boost');
  const dodgeBoost = playerCombatEffects.find((e) => e.type === 'dodge_boost');
  const activeShield = playerCombatEffects.find((e) => e.type === 'shield');

  const dynamicStrVal = scalingStr ? scalingStr.value : 0;
  const effectiveDamage = Math.floor(playerStats.damage + dynamicStrVal);

  const effectiveCrit = playerStats.critChance + (critBoost ? critBoost.value : 0);
  const effectiveDodge = playerStats.dodgeChance + (dodgeBoost ? dodgeBoost.value : 0);
  const luckyChance = Math.min(10, Math.floor((playerStats.magicFind || 0) / 20));

  const activeTitle = getTitleById(playerStats.activeTitleId);

  const EFFECT_ICONS: Record<string, string> = {
    burn: '🔥',
    freeze: '❄️',
    poison: '🤢',
    blind: '🙈',
    regen: '💖',
    crit_boost: '⚡',
    chill: '🥶',
    stun: '💫',
    explode: '💥',
    shield: '🛡️',
    scaling_strength: '💪',
    dodge_boost: '💨',
  };

  return (
    <BaseModal.Container zIndex="z-[120]" maxWidth="max-w-2xl">
      <BaseModal.Header
        title="Hero Tactical Sheet"
        subtitle={`Combat Assessment • Level ${playerStats.level}`}
        icon="📊"
        textColor="text-amber-500"
        onClose={onClose}
      />
      <BaseModal.Body className="bg-stone-950 p-2.5 sm:p-3 lg:p-4 max-h-[78dvh] overflow-y-auto custom-scrollbar">
        {/* Hero Header */}
        <div className="flex items-center gap-3 bg-stone-900/80 border border-stone-800 rounded-lg p-2.5 sm:p-3 mb-2.5 shadow-inner">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-amber-600/60 bg-black/80 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            <img
              src={playerStats.heroImageUrl || DEFAULT_HERO_AVATAR}
              alt="Hero Trainer"
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg diablo-font text-stone-100 font-bold truncate">
                {activeTitle ? activeTitle.className : 'Hero Trainer'}
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400">
                Lv {playerStats.level}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border flex items-center gap-1.5 ${STANCE_META[combatStance]?.color || 'bg-stone-800 border-stone-700 text-stone-300'}`}>
                <span>{STANCE_META[combatStance]?.icon || '🔴'}</span>
                <span>Postura: {STANCE_META[combatStance]?.name || combatStance}</span>
                <span className="text-[9px] text-stone-400 font-normal">
                  (Vence a: {STANCE_META[combatStance]?.beats})
                </span>
              </span>
              {activeShield && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                  🛡️ Shielded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Health & Vitality Overview */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5 mb-2.5">
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-stone-400 uppercase font-bold">Health Points</span>
            <span className="font-bold text-white">
              {Math.ceil(playerHp)} / {playerStats.maxHp} (
              {Math.round((playerHp / playerStats.maxHp) * 100)}%)
            </span>
          </div>
          <div className="w-full h-3 bg-black border border-stone-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-green-900 via-green-600 to-green-900 transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, (playerHp / playerStats.maxHp) * 100))}%`,
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
            <div className="bg-black/50 border border-stone-800 rounded p-1">
              <span className="text-[9px] text-red-400 block font-bold">STR</span>
              <span className="text-stone-200 font-bold">{playerStats.strength}</span>
            </div>
            <div className="bg-black/50 border border-stone-800 rounded p-1">
              <span className="text-[9px] text-green-400 block font-bold">DEX</span>
              <span className="text-stone-200 font-bold">{playerStats.dexterity}</span>
            </div>
            <div className="bg-black/50 border border-stone-800 rounded p-1">
              <span className="text-[9px] text-blue-400 block font-bold">INT</span>
              <span className="text-stone-200 font-bold">{playerStats.intelligence}</span>
            </div>
            <div className="bg-black/50 border border-stone-800 rounded p-1">
              <span className="text-[9px] text-purple-400 block font-bold">VIT</span>
              <span className="text-stone-200 font-bold">{playerStats.vitality}</span>
            </div>
          </div>
        </div>

        {/* Combat Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-xs mb-2.5">
          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Effective Damage</span>
            <span className="text-red-400 font-bold text-sm">
              {effectiveDamage}
              {dynamicStrVal > 0 && <span className="text-amber-400 text-[10px] ml-1">(+{dynamicStrVal})</span>}
            </span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Armor</span>
            <span className="text-stone-200 font-bold text-sm">{playerStats.armor}</span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Turn Regen</span>
            <span className="text-green-400 font-bold text-sm">+{playerStats.healthRegen || 1} / trn</span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Spell Power</span>
            <span className="text-blue-400 font-bold text-sm">+{playerStats.spellPower || 0}%</span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Crit Chance</span>
            <span className="text-yellow-400 font-bold text-sm">
              {effectiveCrit}%
              {critBoost && <span className="text-amber-400 text-[10px] ml-1">(+{critBoost.value}%)</span>}
            </span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Dodge Chance</span>
            <span className="text-emerald-400 font-bold text-sm">
              {effectiveDodge}%
              {dodgeBoost && <span className="text-cyan-400 text-[10px] ml-1">(+{dodgeBoost.value}%)</span>}
            </span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Life Steal</span>
            <span className="text-red-300 font-bold text-sm">{playerStats.lifeSteal}%</span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Thorns</span>
            <span className="text-amber-300 font-bold text-sm">
              {playerStats.thorns || 0}%
              <span className="text-[9px] text-stone-500 block font-normal">+50% on Dodge</span>
            </span>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded p-2">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Lucky Strike</span>
            <span className="text-emerald-300 font-bold text-sm">
              {luckyChance}%
              <span className="text-[9px] text-stone-500 block font-normal">MF: {playerStats.magicFind}%</span>
            </span>
          </div>
        </div>

        {/* Active Mastery Title */}
        {activeTitle && (
          <div className="bg-stone-900/60 border border-amber-800/40 rounded-lg p-2.5 mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                <span>👑</span> Active Mastery Title: {activeTitle.className}
              </span>
              <span className="text-[9px] font-mono text-stone-400 bg-amber-950/60 border border-amber-900 px-1.5 py-0.5 rounded">
                {activeTitle.archetype}
              </span>
            </div>
            <p className="text-xs text-stone-200 leading-snug font-sans">
              <span className="text-amber-400 font-mono text-[10px] uppercase mr-1">
                [{activeTitle.proc.trigger}]
              </span>
              {activeTitle.proc.description}
            </p>
          </div>
        )}

        {/* Active Combat Buffs & Global Auras */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block mb-1.5">
            Active Combat Buffs & Auras ({playerCombatEffects.length + activeEffects.length})
          </span>
          {playerCombatEffects.length > 0 || activeEffects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...playerCombatEffects, ...activeEffects].map((eff, i) => (
                <div
                  key={`${eff.id}-${i}`}
                  className="bg-black/60 border border-stone-700 rounded px-2 py-1 flex items-center gap-1.5 text-xs font-mono"
                >
                  <span>{EFFECT_ICONS[(eff as any).type] || '✨'}</span>
                  <span className="text-stone-200 font-bold capitalize">{eff.name}</span>
                  {(eff as any).stacks > 1 && (
                    <span className="text-[10px] bg-stone-800 px-1 rounded text-amber-400 font-bold">
                      x{(eff as any).stacks}
                    </span>
                  )}
                  {eff.duration && (
                    <span className="text-[10px] text-stone-400">({eff.duration}t)</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-1.5 text-stone-600 text-xs italic font-mono">
              No active buffs or temporary combat effects.
            </div>
          )}
        </div>
      </BaseModal.Body>
    </BaseModal.Container>
  );
};
