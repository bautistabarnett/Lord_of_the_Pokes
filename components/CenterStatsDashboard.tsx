import React, { useMemo } from 'react';
import { PlayerStats, BaseAttributes, PassiveSkill } from '../types';
import { PASSIVE_THEME_COLORS, PASSIVE_SET_BONUSES, COMPOSITE_SYNERGIES } from '../constants';
import { getTitleById } from '../services/spriteCatalog';

interface CenterStatsDashboardProps {
  stats: PlayerStats;
  baseAttributes: BaseAttributes;
  statPoints: number;
  passiveSkills: PassiveSkill[];
  onAllocate: (attr: keyof BaseAttributes) => void;
  latestLogMessage?: string;
  onOpenTutorial?: () => void;
}

export const CenterStatsDashboard: React.FC<CenterStatsDashboardProps> = ({
  stats,
  baseAttributes,
  statPoints,
  passiveSkills,
  onAllocate,
  latestLogMessage,
  onOpenTutorial,
}) => {
  const attributes = useMemo(
    () => [
      {
        label: 'Strength',
        key: 'strength' as keyof BaseAttributes,
        val: stats.strength,
        base: baseAttributes.strength,
        color: 'text-red-500',
        borderColor: 'border-red-950/60',
        icon: '💪',
        desc: 'Increases Weapon Damage (+1.5%/pt) & Armor',
      },
      {
        label: 'Dexterity',
        key: 'dexterity' as keyof BaseAttributes,
        val: stats.dexterity,
        base: baseAttributes.dexterity,
        color: 'text-green-500',
        borderColor: 'border-emerald-950/60',
        icon: '🏹',
        desc: 'Increases Quick Reaction (Parry/Feint) & Dodge',
      },
      {
        label: 'Intelligence',
        key: 'intelligence' as keyof BaseAttributes,
        val: stats.intelligence,
        base: baseAttributes.intelligence,
        color: 'text-blue-500',
        borderColor: 'border-sky-950/60',
        icon: '🔮',
        desc: 'Increases Spell Power (+1.5%/pt) & Crit',
      },
      {
        label: 'Vitality',
        key: 'vitality' as keyof BaseAttributes,
        val: stats.vitality,
        base: baseAttributes.vitality,
        color: 'text-purple-500',
        borderColor: 'border-purple-950/60',
        icon: '❤️',
        desc: 'Increases Health (+8 HP) & Turn Regen',
      },
    ],
    [stats, baseAttributes]
  );

  const parryPct = Math.min(50, Math.round((stats.attackSpeed || 0) * 1.0));
  const feintPct = Math.min(35, Math.round((stats.attackSpeed || 0) * 0.6));

  const combatStats = useMemo(
    () => [
      { label: 'Damage', val: stats.damage, icon: '⚔️', color: 'text-stone-200' },
      { label: 'Armor', val: stats.armor, icon: '🛡️', color: 'text-stone-200' },
      { label: 'Max HP', val: stats.maxHp, icon: '❤️', color: 'text-stone-200' },
      { label: 'Turn Regen', val: `+${stats.healthRegen || 1}/trn`, icon: '🌿', color: 'text-stone-200' },
      { 
        label: 'Reacción Rápida', 
        val: `${stats.attackSpeed || 0}%`, 
        icon: '🤺', 
        color: 'text-amber-400', 
        extra: `(P:${parryPct}% / F:${feintPct}%)` 
      },
      { label: 'Spell Power', val: `+${stats.spellPower || 0}%`, icon: '🔮', color: 'text-stone-200' },
      { label: 'Crit Chance', val: `${stats.critChance}%`, icon: '⚡', color: 'text-stone-200' },
      { label: 'Dodge Chance', val: `${stats.dodgeChance}%`, icon: '💨', color: 'text-stone-200' },
      { label: 'Life Steal', val: `${stats.lifeSteal}%`, icon: '🩸', color: 'text-stone-200' },
      { label: 'Thorns', val: `${stats.thorns || 0}%`, icon: '🌵', color: 'text-stone-200' },
      { label: 'Magic Find', val: `${stats.magicFind}%`, icon: '🍀', color: 'text-stone-200' },
    ],
    [stats, parryPct, feintPct]
  );

  const activeTitle = getTitleById(stats.activeTitleId);
  const xpPercent = Math.min(100, Math.floor((stats.xp / Math.max(1, stats.xpToNextLevel)) * 100));

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar p-2.5 lg:p-4 gap-2.5 lg:gap-3.5 bg-gradient-to-b from-stone-950/90 via-black/80 to-stone-950/95 rounded-lg border border-stone-800 shadow-2xl">
      
      {/* Header Banner - Diablo RPG Style */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-0.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 lg:w-8 lg:h-8 bg-stone-900 rounded-full border border-stone-700 flex items-center justify-center shadow-inner text-sm">
            🛡️
          </div>
          <div>
            <h2 className="text-sm lg:text-base diablo-font text-stone-200 tracking-wider leading-none">
              Character Sheet
            </h2>
            <span className="text-[10px] lg:text-[11px] font-mono uppercase text-amber-500/80">
              Level {stats.level} Hero
            </span>
          </div>
        </div>
        {statPoints > 0 && (
          <div className="bg-amber-500/20 border border-amber-500/60 px-2.5 py-1 rounded text-[10px] lg:text-xs font-mono text-amber-300 font-bold animate-pulse flex items-center gap-1.5 shadow">
            <span>Points Available:</span>
            <span className="bg-amber-500 text-black px-1.5 py-0.2 rounded font-extrabold leading-none">{statPoints}</span>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 lg:gap-4 items-start">
        
        {/* LEFT COLUMN: Core Attributes & Point Allocation */}
        <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 lg:p-4 relative shadow-md">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 mb-2.5">
            <h3 className="text-xs lg:text-sm diablo-font text-amber-600 uppercase tracking-wider">
              Core Attributes
            </h3>
            {statPoints > 0 && (
              <span className="text-[10px] font-mono text-amber-500 font-bold animate-pulse">
                +{statPoints} unallocated
              </span>
            )}
          </div>

          <div className="space-y-1.5 lg:space-y-2">
            {attributes.map((attr) => {
              const bonus = attr.val - attr.base;
              return (
                <div
                  key={attr.key}
                  className="flex items-center justify-between bg-black/50 border border-stone-900 hover:border-stone-700 p-2 lg:p-2.5 rounded transition-all"
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{attr.icon}</span>
                      <span className={`font-bold text-xs lg:text-sm ${attr.color}`}>
                        {attr.label}
                      </span>
                    </div>
                    <div className="text-[9px] lg:text-[10px] text-stone-500 uppercase tracking-tight truncate">
                      {attr.desc}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-sm lg:text-base font-mono font-bold text-stone-200 leading-none">
                        {attr.val}
                      </div>
                      {bonus > 0 ? (
                        <div className="text-[9px] font-mono text-emerald-400 leading-none mt-0.5">
                          ({attr.base} + {bonus})
                        </div>
                      ) : (
                        <div className="text-[9px] font-mono text-stone-600 leading-none mt-0.5">
                          (base)
                        </div>
                      )}
                    </div>

                    {statPoints > 0 && (
                      <button
                        onClick={() => onAllocate(attr.key)}
                        className="w-6 h-6 lg:w-7 lg:h-7 bg-stone-800 hover:bg-stone-700 text-amber-500 hover:text-amber-300 border border-stone-600 hover:border-amber-500 rounded flex items-center justify-center font-bold text-sm shadow hover:scale-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
                        title={`Allocate +1 point to ${attr.label}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Combat Stats, Experience & Passives */}
        <div className="flex flex-col gap-2.5 lg:gap-3.5">
          
          {/* Combat Statistics Grid */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 lg:p-4 shadow-md">
            <h3 className="text-xs lg:text-sm diablo-font text-stone-400 border-b border-stone-800 pb-1.5 mb-2 uppercase tracking-wider">
              Combat Statistics
            </h3>

            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              {combatStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-black/50 border border-stone-900 hover:border-stone-800 p-1.5 px-2 lg:p-2 lg:px-2.5 rounded flex items-center justify-between transition-colors min-h-[38px]"
                >
                  <div className="flex items-center gap-1.5 text-[10px] lg:text-xs text-stone-400 truncate min-w-0 pr-1">
                    <span className="shrink-0">{stat.icon}</span>
                    <span className="truncate">{stat.label}</span>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className={`text-xs lg:text-sm font-mono font-bold leading-tight ${stat.color}`}>
                      {stat.val}
                    </span>
                    {stat.extra && (
                      <span className="text-[8px] lg:text-[9px] font-mono text-stone-500 leading-none">
                        {stat.extra}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experience Progress */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 lg:p-3 shadow-md">
            <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mb-1 font-bold uppercase tracking-wider">
              <span>Progress to Lvl {stats.level + 1}</span>
              <span className="text-stone-300">{xpPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-black border border-stone-700 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-900 via-amber-700 to-amber-500 transition-all duration-500 rounded-full"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="text-center text-[9px] font-mono text-stone-500 mt-1">
              {stats.xp.toLocaleString()} / {stats.xpToNextLevel.toLocaleString()} XP
            </div>
          </div>

          {/* Active Mastery Title Perk */}
          {activeTitle && (
            <div className="bg-stone-950/70 border border-amber-900/50 rounded-lg p-2 lg:p-2.5 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-amber-500 font-bold flex items-center gap-1">
                  <span>👑</span> Mastery Title: {activeTitle.className}
                </span>
                <span className="text-[8px] font-mono bg-amber-950/70 border border-amber-800/50 text-amber-300 px-1 rounded uppercase">
                  {activeTitle.archetype}
                </span>
              </div>
              <div className="text-[10px] text-stone-300 leading-tight">
                <span className="text-amber-400 font-mono text-[9px] uppercase mr-1">
                  [{activeTitle.proc.trigger}]
                </span>
                {activeTitle.proc.description}
              </div>
            </div>
          )}

          {/* Active Set Bonuses & Synergies Section */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 lg:p-3 shadow-md">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1 mb-2">
              <h3 className="text-xs lg:text-sm diablo-font text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>✨</span>
                <span>Sets & Sinergias</span>
              </h3>
              <span className="text-[9px] font-mono text-stone-500">
                {(stats.activeSetBonuses?.length || 0) + (stats.activeSynergies?.length || 0)} Activas
              </span>
            </div>

            {((stats.activeSetBonuses && stats.activeSetBonuses.length > 0) || (stats.activeSynergies && stats.activeSynergies.length > 0)) ? (
              <div className="flex flex-col gap-1.5">
                {/* Active Set Bonuses */}
                {stats.activeSetBonuses?.map(theme => {
                  const bonus = PASSIVE_SET_BONUSES.find(b => b.theme === theme);
                  const themeStyle = PASSIVE_THEME_COLORS[theme];
                  return (
                    <div 
                      key={theme} 
                      className={`p-1.5 rounded border text-[10px] flex items-center justify-between ${themeStyle?.border || 'border-amber-700/60'} ${themeStyle?.bg || 'bg-amber-950/30'}`}
                      title={bonus?.description}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{themeStyle?.icon || '👑'}</span>
                        <span className="font-bold text-amber-300">{bonus?.name || theme}</span>
                        <span className="text-[8px] font-mono bg-black/60 px-1 py-0.2 rounded text-stone-400 uppercase">Set</span>
                      </div>
                      <span className="text-[9px] text-stone-400 font-mono truncate max-w-[130px] text-right">
                        {bonus?.description || 'Activo'}
                      </span>
                    </div>
                  );
                })}

                {/* Active Synergies */}
                {stats.activeSynergies?.map(synId => {
                  const synergy = COMPOSITE_SYNERGIES.find(s => s.id === synId);
                  return (
                    <div 
                      key={synId} 
                      className="p-1.5 rounded border border-purple-600/70 bg-purple-950/40 text-[10px] flex items-center justify-between shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                      title={synergy?.description}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">💥</span>
                        <span className="font-bold text-purple-300">{synergy?.name || synId}</span>
                        <span className="text-[8px] font-mono bg-purple-900/60 px-1 py-0.2 rounded text-purple-200 uppercase">Sinergia</span>
                      </div>
                      <span className="text-[9px] text-purple-300/80 font-mono truncate max-w-[130px] text-right">
                        {synergy?.description || 'Activo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-stone-600 text-[10px] italic text-center py-1">
                Sin sets activos. Equipa 3 habilidades del mismo tema.
              </div>
            )}
          </div>

          {/* Active Passive Skills */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 lg:p-3 shadow-md flex-1">
            <h3 className="text-xs lg:text-sm diablo-font text-stone-400 border-b border-stone-800 pb-1 mb-2 uppercase tracking-wider">
              Active Passives ({passiveSkills.length})
            </h3>

            {passiveSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {passiveSkills.map((s, i) => {
                  const themeStyle = PASSIVE_THEME_COLORS[s.theme];
                  return (
                    <div
                      key={i}
                      className={`px-2 py-0.5 rounded border text-[9px] lg:text-[10px] font-bold flex items-center gap-1 ${themeStyle?.bg || 'bg-stone-900'} ${themeStyle?.border || 'border-stone-700'} ${themeStyle?.text || 'text-stone-300'}`}
                    >
                      <span>{s.name}</span>
                      <span className="text-white/60 font-mono text-[8px]">Lvl {s.level}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-stone-600 text-xs italic text-center py-1">
                No passive skills learned.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Live Action Ticker Strip */}
      {latestLogMessage && (
        <div className="mt-auto pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2 bg-black/40 px-2.5 py-1.5 rounded border border-stone-900 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="text-xs shrink-0">📜</span>
            <span className="text-[10px] font-mono text-stone-400 truncate">
              {latestLogMessage}
            </span>
          </div>
          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 text-[9px] font-bold uppercase rounded shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer flex items-center gap-1 shadow-sm"
              title="Abrir Manual del Aventurero y Tutorial de Mecánicas"
            >
              <span>📖</span>
              <span>Tutorial ➔</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CenterStatsDashboard;
