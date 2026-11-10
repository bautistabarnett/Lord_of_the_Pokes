import React, { useMemo } from 'react';
import { PlayerStats, BaseAttributes, PassiveSkill } from '../types';
import { PASSIVE_THEME_COLORS } from '../constants';
import { getTitleById } from '../services/spriteCatalog';

interface CenterStatsDashboardProps {
  stats: PlayerStats;
  baseAttributes: BaseAttributes;
  statPoints: number;
  passiveSkills: PassiveSkill[];
  onAllocate: (attr: keyof BaseAttributes) => void;
  latestLogMessage?: string;
  onViewFullLog?: () => void;
}

export const CenterStatsDashboard: React.FC<CenterStatsDashboardProps> = ({
  stats,
  baseAttributes,
  statPoints,
  passiveSkills,
  onAllocate,
  latestLogMessage,
  onViewFullLog,
}) => {
  const attributes = useMemo(
    () => [
      {
        label: 'Fuerza',
        key: 'strength' as keyof BaseAttributes,
        val: stats.strength,
        base: baseAttributes.strength,
        color: 'text-red-400',
        borderColor: 'border-red-950/60',
        icon: '💪',
        desc: '+1.5% Daño Físico & Armadura',
      },
      {
        label: 'Destreza',
        key: 'dexterity' as keyof BaseAttributes,
        val: stats.dexterity,
        base: baseAttributes.dexterity,
        color: 'text-emerald-400',
        borderColor: 'border-emerald-950/60',
        icon: '🏹',
        desc: '+Reacción Rápida (Parada/Finta) & Esquiva',
      },
      {
        label: 'Inteligencia',
        key: 'intelligence' as keyof BaseAttributes,
        val: stats.intelligence,
        base: baseAttributes.intelligence,
        color: 'text-sky-400',
        borderColor: 'border-sky-950/60',
        icon: '🔮',
        desc: '+1.5% Poder Hechizo & Golpe Crítico',
      },
      {
        label: 'Vitalidad',
        key: 'vitality' as keyof BaseAttributes,
        val: stats.vitality,
        base: baseAttributes.vitality,
        color: 'text-purple-400',
        borderColor: 'border-purple-950/60',
        icon: '❤️',
        desc: '+8 Vida Máxima & Regen por Turno',
      },
    ],
    [stats, baseAttributes]
  );

  const parryPct = Math.min(50, Math.round((stats.attackSpeed || 0) * 1.0));
  const feintPct = Math.min(35, Math.round((stats.attackSpeed || 0) * 0.6));

  const combatStats = useMemo(
    () => [
      { label: 'Daño Arma', val: stats.damage, icon: '⚔️', color: 'text-stone-200' },
      { label: 'Armadura', val: stats.armor, icon: '🛡️', color: 'text-stone-200' },
      { label: 'Vida Máxima', val: stats.maxHp, icon: '❤️', color: 'text-green-400' },
      { label: 'Regen/Turno', val: `+${stats.healthRegen || 1}`, icon: '🌿', color: 'text-emerald-400' },
      { label: 'Reacción Rápida', val: `${stats.attackSpeed || 0}%`, icon: '🤺', color: 'text-amber-400', extra: `P:${parryPct}% / F:${feintPct}%` },
      { label: 'Poder Hechizo', val: `+${stats.spellPower || 0}%`, icon: '🔮', color: 'text-sky-400' },
      { label: 'Golpe Crítico', val: `${stats.critChance}%`, icon: '⚡', color: 'text-yellow-400' },
      { label: 'Esquiva', val: `${stats.dodgeChance}%`, icon: '💨', color: 'text-teal-400' },
      { label: 'Robo de Vida', val: `${stats.lifeSteal}%`, icon: '🩸', color: 'text-red-400' },
      { label: 'Espinas', val: `${stats.thorns || 0}%`, icon: '🌵', color: 'text-amber-500' },
      { label: 'Hallazgo Mágico', val: `${stats.magicFind}%`, icon: '🍀', color: 'text-emerald-300' },
    ],
    [stats, parryPct, feintPct]
  );

  const activeTitle = getTitleById(stats.activeTitleId);
  const xpPercent = Math.min(100, Math.floor((stats.xp / Math.max(1, stats.xpToNextLevel)) * 100));

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar p-2 lg:p-3.5 gap-2 lg:gap-3 bg-gradient-to-b from-stone-950/80 via-black/70 to-stone-950/90 rounded-lg border border-stone-800 shadow-inner">
      
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3.5 items-start">
        
        {/* LEFT COLUMN: Core Attributes & Point Allocation */}
        <div className="flex flex-col gap-2">
          <div className="bg-stone-950/90 border border-stone-800/90 rounded-lg p-2.5 lg:p-3 relative shadow-md">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm lg:text-base">⚜️</span>
                <h3 className="text-xs lg:text-sm diablo-font text-amber-500 font-bold uppercase tracking-wider">
                  Atributos Primarios
                </h3>
              </div>
              {statPoints > 0 ? (
                <div className="bg-amber-500/20 border border-amber-500/60 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 font-bold animate-pulse flex items-center gap-1">
                  <span>Puntos:</span>
                  <span className="bg-amber-500 text-black px-1 rounded-sm leading-none">{statPoints}</span>
                </div>
              ) : (
                <span className="text-[10px] font-mono text-stone-600">0 pts</span>
              )}
            </div>

            <div className="space-y-1.5">
              {attributes.map((attr) => {
                const bonus = attr.val - attr.base;
                return (
                  <div
                    key={attr.key}
                    className={`flex items-center justify-between bg-black/50 border ${attr.borderColor} p-2 rounded transition-all hover:border-stone-700`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{attr.icon}</span>
                        <span className={`font-bold text-xs lg:text-sm ${attr.color}`}>
                          {attr.label}
                        </span>
                      </div>
                      <div className="text-[9px] text-stone-500 font-sans truncate">
                        {attr.desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm lg:text-base font-mono font-bold text-stone-200 leading-none">
                          {attr.val}
                        </div>
                        {bonus > 0 ? (
                          <div className="text-[9px] font-mono text-emerald-400 leading-none mt-0.5">
                            ({attr.base}+{bonus})
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
                          className="w-6 h-6 lg:w-7 lg:h-7 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-300 hover:text-white rounded flex items-center justify-center font-bold text-xs shadow-md transition-all active:scale-90 touch-manipulation cursor-pointer"
                          title={`Asignar +1 punto a ${attr.label}`}
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

          {/* Experience Progress Bar */}
          <div className="bg-stone-950/90 border border-stone-800/90 rounded-lg p-2 lg:p-2.5 shadow-md">
            <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mb-1">
              <span className="font-bold uppercase tracking-wider text-amber-500/90">
                Progreso Nivel {stats.level + 1}
              </span>
              <span className="text-stone-300 font-bold">{xpPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-black/80 border border-stone-700/80 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-800 via-amber-600 to-yellow-500 transition-all duration-500 rounded-full"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-stone-500 mt-1">
              <span>{stats.xp.toLocaleString()} XP</span>
              <span>{stats.xpToNextLevel.toLocaleString()} XP necesarios</span>
            </div>
          </div>

          {/* Active Mastery Title Perk */}
          {activeTitle && (
            <div className="bg-stone-950/90 border border-amber-900/40 rounded-lg p-2 lg:p-2.5 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                  <span>👑</span> {activeTitle.className}
                </span>
                <span className="text-[8px] font-mono bg-amber-950/70 border border-amber-800/50 text-amber-300 px-1 rounded uppercase">
                  {activeTitle.archetype}
                </span>
              </div>
              <div className="text-[10px] text-stone-300 leading-tight">
                <span className="text-amber-500 font-mono text-[9px] uppercase mr-1">
                  [{activeTitle.proc.trigger}]
                </span>
                {activeTitle.proc.description}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Combat Statistics Grid & Passives */}
        <div className="flex flex-col gap-2">
          <div className="bg-stone-950/90 border border-stone-800/90 rounded-lg p-2.5 lg:p-3 shadow-md">
            <div className="flex items-center gap-1.5 border-b border-stone-800/80 pb-1.5 mb-2">
              <span className="text-sm lg:text-base">⚔️</span>
              <h3 className="text-xs lg:text-sm diablo-font text-stone-300 font-bold uppercase tracking-wider">
                Estadísticas de Combate
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {combatStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-black/50 border border-stone-900/90 hover:border-stone-800 p-1.5 rounded flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 truncate">
                    <span>{stat.icon}</span>
                    <span className="truncate">{stat.label}</span>
                  </div>
                  <div className="text-right shrink-0 ml-1">
                    <span className={`text-[11px] font-mono font-bold ${stat.color}`}>
                      {stat.val}
                    </span>
                    {stat.extra && (
                      <div className="text-[8px] font-mono text-stone-500 leading-none">
                        {stat.extra}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Passive Skills */}
          <div className="bg-stone-950/90 border border-stone-800/90 rounded-lg p-2.5 lg:p-3 shadow-md flex-1">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm lg:text-base">📜</span>
                <h3 className="text-xs lg:text-sm diablo-font text-stone-300 font-bold uppercase tracking-wider">
                  Pasivas Aprendidas ({passiveSkills.length})
                </h3>
              </div>
            </div>

            {passiveSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {passiveSkills.map((s, i) => {
                  const themeStyle = PASSIVE_THEME_COLORS[s.theme];
                  return (
                    <div
                      key={i}
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 ${themeStyle?.bg || 'bg-stone-900'} ${themeStyle?.border || 'border-stone-700'} ${themeStyle?.text || 'text-stone-300'}`}
                    >
                      <span>{themeStyle?.icon || '✨'}</span>
                      <span>{s.name}</span>
                      <span className="text-white/60 font-mono text-[8px]">Nv.{s.level}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-stone-600 text-xs italic text-center py-2">
                Sin habilidades pasivas aprendidas aún.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Live Action Ticker Strip */}
      {latestLogMessage && (
        <div className="mt-auto pt-1.5 border-t border-stone-800/80 flex items-center justify-between gap-2 bg-black/40 px-2.5 py-1.5 rounded border border-stone-900">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="text-xs shrink-0">📜</span>
            <span className="text-[10px] font-mono text-stone-400 truncate">
              {latestLogMessage}
            </span>
          </div>
          {onViewFullLog && (
            <button
              onClick={onViewFullLog}
              className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-[9px] font-bold uppercase rounded shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer"
            >
              Ver Bitácora ➔
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CenterStatsDashboard;
