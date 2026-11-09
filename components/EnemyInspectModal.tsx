import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Monster, CombatStatusEffect, PlayerStats, TerrainType, CombatStance } from '../types';
import { BALANCE, STANCE_META } from '../services/gameBalance';
import GameIcon from './GameIcon';

interface EnemyInspectModalProps {
  monsters: Monster[];
  initialTargetId?: string | null;
  playerLevel: number;
  combatStatusEffects: CombatStatusEffect[];
  terrain?: TerrainType;
  onSelectTarget?: (id: string) => void;
  onClose: () => void;
}

export const EnemyInspectModal: React.FC<EnemyInspectModalProps> = ({
  monsters,
  initialTargetId,
  playerLevel,
  combatStatusEffects,
  terrain,
  onSelectTarget,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialTargetId || (monsters.length > 0 ? monsters[0].id : '')
  );

  const currentMonster = monsters.find((m) => m.id === selectedId) || monsters[0];

  if (!currentMonster) return null;

  const config = BALANCE.MONSTER.rarityConfig[currentMonster.rarity] || BALANCE.MONSTER.rarityConfig.Common;
  const isDead = currentMonster.currentHp <= 0;
  const mitigationPercent = Math.round(
    BALANCE.COMBAT.calculateMitigationPercent(currentMonster.armor, playerLevel) * 100
  );

  // Active status effects on this specific monster
  const activeEffects = combatStatusEffects.filter(
    (e) => e.target === 'enemy' && (e as any).targetId === currentMonster.id
  );

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
        title="Enemy Intel & Codex"
        subtitle={`Tactical analysis for ${currentMonster.name}`}
        icon="🔍"
        textColor="text-red-500"
        onClose={onClose}
      />
      <BaseModal.Body className="bg-stone-950 p-2.5 sm:p-3 lg:p-4 max-h-[78dvh] overflow-y-auto custom-scrollbar">
        {/* Multi-Monster Selector Pills */}
        {monsters.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2 border-b border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-500 shrink-0">Enemies:</span>
            {monsters.map((m) => {
              const dead = m.currentHp <= 0;
              const isSelected = m.id === currentMonster.id;
              const rConf = BALANCE.MONSTER.rarityConfig[m.rarity];
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id);
                    if (!dead && onSelectTarget) onSelectTarget(m.id);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-red-500 bg-red-950/70 text-red-200 shadow-md ring-1 ring-red-500'
                      : dead
                      ? 'border-stone-900 bg-black/40 text-stone-600 line-through'
                      : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <span className={rConf.color}>{m.name}</span>
                  <span className="text-[9px] text-stone-500">Lv{m.level}</span>
                  {dead && <span className="text-[8px] text-red-500 ml-0.5">☠</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Monster Card Header */}
        <div className="flex items-center gap-3 bg-stone-900/80 border border-stone-800 rounded-lg p-2.5 sm:p-3 mb-2.5 shadow-inner">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center relative overflow-hidden bg-black/80 shrink-0 ${config.color.replace('text', 'border')} ${config.glow}`}
          >
            <GameIcon
              name={currentMonster.icon}
              imageUrl={currentMonster.imageUrl}
              className={`w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow ${config.color}`}
            />
            {currentMonster.isBoss && (
              <span className="absolute top-0.5 right-0.5 text-[9px] bg-red-600 text-white px-1 rounded-sm font-bold shadow">
                BOSS
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className={`text-base sm:text-lg diablo-font font-bold truncate ${config.color}`}>
                {currentMonster.name}
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                Level {currentMonster.level}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono">
              <span className={`px-1.5 py-0.5 rounded border border-stone-700 bg-black/50 ${config.color} font-bold uppercase`}>
                {currentMonster.rarity}
              </span>
              {terrain && (
                <span className="px-1.5 py-0.5 rounded border border-stone-800 bg-stone-900 text-stone-400 uppercase">
                  Bioma: {terrain}
                </span>
              )}
              {currentMonster.isStanceHidden ? (
                <span className="px-1.5 py-0.5 rounded border border-purple-800/80 bg-purple-950/60 text-purple-300 font-bold flex items-center gap-1" title="Este enemigo enmascara su postura de combate.">
                  <span>❓</span>
                  <span>Postura: Oculta</span>
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold ${STANCE_META[currentMonster.currentStance || CombatStance.RESOLVE]?.color}`}>
                  <span>{STANCE_META[currentMonster.currentStance || CombatStance.RESOLVE]?.icon}</span>
                  <span>Postura: {STANCE_META[currentMonster.currentStance || CombatStance.RESOLVE]?.name}</span>
                </span>
              )}
              {isDead ? (
                <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 font-bold border border-red-800">
                  DEFEATED
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800">
                  ALIVE
                </span>
              )}
            </div>
            {!currentMonster.isStanceHidden && currentMonster.currentStance && (
              <div className="mt-1 text-[9px] font-mono text-stone-400 flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">Consejo Táctico:</span>
                <span>Usa <strong className="text-emerald-400">{STANCE_META[currentMonster.currentStance]?.weakTo}</strong> para triunfar (+35% daño). Evita {STANCE_META[currentMonster.currentStance]?.beats}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid: Attributes & Combat Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
          {/* Health & Core Attributes */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-stone-400 uppercase font-bold">Health Points</span>
                <span className="font-bold text-white">
                  {Math.ceil(currentMonster.currentHp)} / {currentMonster.maxHp} (
                  {Math.round((currentMonster.currentHp / currentMonster.maxHp) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-black border border-stone-700 rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-900 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, (currentMonster.currentHp / currentMonster.maxHp) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block mb-1">
                Core Attributes
              </span>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
                <div className="bg-black/50 border border-stone-800 rounded p-1">
                  <span className="text-[9px] text-red-400 block font-bold">STR</span>
                  <span className="text-stone-200 font-bold">{currentMonster.strength}</span>
                </div>
                <div className="bg-black/50 border border-stone-800 rounded p-1">
                  <span className="text-[9px] text-green-400 block font-bold">DEX</span>
                  <span className="text-stone-200 font-bold">{currentMonster.dexterity}</span>
                </div>
                <div className="bg-black/50 border border-stone-800 rounded p-1">
                  <span className="text-[9px] text-blue-400 block font-bold">INT</span>
                  <span className="text-stone-200 font-bold">{currentMonster.intelligence}</span>
                </div>
                <div className="bg-black/50 border border-stone-800 rounded p-1">
                  <span className="text-[9px] text-purple-400 block font-bold">VIT</span>
                  <span className="text-stone-200 font-bold">{currentMonster.vitality}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combat Ratings & Mitigation */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5 font-mono text-xs">
            <span className="text-[10px] uppercase text-stone-500 font-bold block mb-1.5">
              Combat Ratings
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span>⚔️</span> Base Damage
                </span>
                <span className="text-red-400 font-bold">{currentMonster.damage}</span>
              </div>
              <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span>🛡️</span> Armor (Mitigation)
                </span>
                <span className="text-stone-200 font-bold">
                  {currentMonster.armor}{' '}
                  <span className="text-amber-400 text-[10px]">(-{mitigationPercent}%)</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80 text-[11px]">
                  <span className="text-stone-400">⚡ Crit:</span>
                  <span className="text-yellow-400 font-bold">{currentMonster.critChance}%</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80 text-[11px]">
                  <span className="text-stone-400">💨 Dodge:</span>
                  <span className="text-emerald-400 font-bold">{currentMonster.dodgeChance}%</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80 text-[11px]">
                  <span className="text-stone-400">🩸 Life Steal:</span>
                  <span className="text-red-300 font-bold">{currentMonster.lifeSteal}%</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-stone-800/80 text-[11px]">
                  <span className="text-stone-400">🌵 Thorns:</span>
                  <span className="text-amber-300 font-bold">{currentMonster.thorns}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Maledict Affixes & Boss Traits */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5 mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold flex items-center gap-1">
              <span>☠️</span> Demonic Maledicts & Boss Traits
            </span>
            <span className="text-[9px] font-mono text-stone-500">
              {currentMonster.maledicts && currentMonster.maledicts.length > 0
                ? `${currentMonster.maledicts.length} Active`
                : 'None'}
            </span>
          </div>

          {currentMonster.maledicts && currentMonster.maledicts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {currentMonster.maledicts.map((mal, idx) => (
                <div
                  key={`${mal.id}-${idx}`}
                  className="bg-black/60 border border-purple-900/40 rounded p-2 flex items-start gap-2"
                >
                  <span className="text-base shrink-0 opacity-90">{mal.icon || '💀'}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-purple-300 diablo-font block truncate">
                      {mal.name}
                    </span>
                    <p className="text-[10px] text-stone-300 leading-tight mt-0.5">
                      {mal.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-stone-600 text-xs italic font-mono bg-black/30 rounded border border-stone-800/50">
              Standard creature without demonic affixes.
            </div>
          )}
        </div>

        {/* Active Combat Status Effects / Debuffs */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block mb-1.5">
            Current Status Effects on Target
          </span>
          {activeEffects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {activeEffects.map((eff, i) => (
                <div
                  key={`${eff.id}-${i}`}
                  className="bg-black/60 border border-stone-700 rounded px-2 py-1 flex items-center gap-1.5 text-xs font-mono"
                >
                  <span>{EFFECT_ICONS[eff.type] || '✨'}</span>
                  <span className="text-stone-200 font-bold capitalize">{eff.name || eff.type}</span>
                  {eff.stacks > 1 && (
                    <span className="text-[10px] bg-stone-800 px-1 rounded text-amber-400 font-bold">
                      x{eff.stacks}
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
              No active debuffs or status ailments on this target.
            </div>
          )}
        </div>
      </BaseModal.Body>
    </BaseModal.Container>
  );
};
