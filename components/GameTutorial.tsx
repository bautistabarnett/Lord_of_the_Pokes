import React, { useState, useMemo } from 'react';
import { TUTORIAL_CATEGORIES, TUTORIAL_SECTIONS, TutorialSection } from '../services/tutorialCatalog';
import { CombatStance } from '../types';
import { STANCE_META } from '../services/gameBalance';
import { MALEDICT_TRAITS, MALEDICT_INFAMIES, GAME_VERSION } from '../constants';

interface GameTutorialProps {
  onBackToStats?: () => void;
}

export const GameTutorial: React.FC<GameTutorialProps> = ({ onBackToStats }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSectionId, setExpandedSectionId] = useState<string>('triad_mechanics');

  // Interactive Widget States
  const [interactiveStance, setInteractiveStance] = useState<CombatStance>(CombatStance.WILL);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(25);
  const [activeMaledictTab, setActiveMaledictTab] = useState<'traits' | 'infamies'>('infamies');

  // Filter sections by category and search text
  const filteredSections = useMemo(() => {
    return TUTORIAL_SECTIONS.filter((sec) => {
      const matchesCategory = selectedCategory === 'all' || sec.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchTitle = sec.title.toLowerCase().includes(query);
      const matchSummary = sec.summary.toLowerCase().includes(query);
      const matchContent = sec.content.paragraphs.some((p) => p.toLowerCase().includes(query)) ||
        sec.content.bullets?.some((b) => b.label.toLowerCase().includes(query) || b.text.toLowerCase().includes(query));
      return matchTitle || matchSummary || matchContent;
    });
  }, [selectedCategory, searchQuery]);

  // Derived Quick Reaction values for interactive tool
  const parryChance = Math.min(50, Math.round(simulatedSpeed * 1.0));
  const feintChance = Math.min(35, Math.round(simulatedSpeed * 0.6));

  const stanceData = STANCE_META[interactiveStance];
  const beatenMeta = STANCE_META[stanceData.beatsStance];
  const weakMeta = STANCE_META[stanceData.weakToStance];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar p-2.5 lg:p-4 gap-3 bg-gradient-to-b from-stone-950/95 via-black/90 to-stone-950/95 rounded-lg border border-stone-800 shadow-2xl">
      
      {/* Header Banner - Diablo Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-2.5 gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 lg:w-9 lg:h-9 bg-stone-900 rounded-full border border-stone-700 flex items-center justify-center shadow-inner text-base">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm lg:text-base diablo-font text-stone-200 tracking-wider leading-none">
                Manual del Aventurero
              </h2>
              <span className="text-[9px] font-mono uppercase bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.2 rounded font-bold">
                {GAME_VERSION}
              </span>
            </div>
            <p className="text-[10px] lg:text-[11px] font-mono text-stone-400 mt-0.5">
              Guía táctica completa, mecánicas centrales y catálogo de combate
            </p>
          </div>
        </div>

        {onBackToStats && (
          <button
            onClick={onBackToStats}
            className="self-start sm:self-auto px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/50 text-stone-300 text-[10px] font-bold uppercase rounded flex items-center gap-1 transition-all active:scale-95 touch-manipulation cursor-pointer shadow-sm"
          >
            <span>📊</span>
            <span>Ver Estadísticas</span>
          </button>
        )}
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col gap-2 shrink-0">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar mecánica (ej: parry, finta, maledict, postura, armadura)..."
            className="w-full bg-black/60 border border-stone-800 focus:border-amber-600/80 rounded px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 outline-none font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {TUTORIAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded text-[10px] lg:text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 touch-manipulation ${
                  isSelected
                    ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300 shadow-sm'
                    : 'bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* INTERACTIVE WIDGETS STRIP (Contextual based on active category) */}
      {(selectedCategory === 'all' || selectedCategory === 'triad') && !searchQuery && (
        <div className="bg-stone-950/70 border border-red-950/50 rounded-lg p-2.5 lg:p-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] diablo-font text-amber-500 uppercase tracking-wider flex items-center gap-1">
              <span>🔺</span> Simulador Interactivo de la Tríada
            </span>
            <span className="text-[9px] font-mono text-stone-500">Toca para probar afinidades</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {[CombatStance.WILL, CombatStance.SPIRIT, CombatStance.RESOLVE].map((st) => {
              const meta = STANCE_META[st];
              const isSelected = interactiveStance === st;
              return (
                <button
                  key={st}
                  onClick={() => setInteractiveStance(st)}
                  className={`p-2 rounded border flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation cursor-pointer ${
                    isSelected
                      ? `${meta.color} border-amber-500 shadow-lg scale-102`
                      : 'bg-black/40 border-stone-800 hover:border-stone-700 text-stone-400'
                  }`}
                >
                  <span className="text-xl leading-none">{meta.icon}</span>
                  <span className="text-[10px] font-bold">{meta.name}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Triad Result Banner */}
          <div className="bg-black/60 border border-stone-800 rounded p-2 text-[10px] font-mono flex flex-col sm:flex-row items-center justify-around gap-2 text-center">
            <div className="text-emerald-400 flex items-center gap-1">
              <span>👑 VENCE A:</span>
              <span className="font-bold">{beatenMeta.icon} {beatenMeta.name}</span>
              <span className="text-[9px] text-emerald-500">(+30% DMG, -30% RECIBIDO)</span>
            </div>
            <div className="text-stone-700 hidden sm:block">•</div>
            <div className="text-red-400 flex items-center gap-1">
              <span>⚠️ CEDE ANTE:</span>
              <span className="font-bold">{weakMeta.icon} {weakMeta.name}</span>
              <span className="text-[9px] text-red-500">(-30% DMG, +30% RECIBIDO)</span>
            </div>
          </div>
        </div>
      )}

      {(selectedCategory === 'all' || selectedCategory === 'reaction') && !searchQuery && (
        <div className="bg-stone-950/70 border border-emerald-950/50 rounded-lg p-2.5 lg:p-3 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] diablo-font text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span>🤺</span> Calculadora de Reacción Rápida
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">
              Vel. Ataque: {simulatedSpeed}%
            </span>
          </div>

          <div className="mb-2">
            <input
              type="range"
              min="0"
              max="60"
              value={simulatedSpeed}
              onChange={(e) => setSimulatedSpeed(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-black/50 border border-stone-800 p-2 rounded flex flex-col items-center justify-center">
              <span className="text-stone-400">🛡️ Parada (Parry)</span>
              <span className="text-base font-bold text-amber-400 leading-tight">{parryChance}%</span>
              <span className="text-[8px] text-stone-500">Desvía el 35% del daño recibido</span>
            </div>
            <div className="bg-black/50 border border-stone-800 p-2 rounded flex flex-col items-center justify-center">
              <span className="text-stone-400">🤺 Finta (Feint)</span>
              <span className="text-base font-bold text-emerald-400 leading-tight">{feintChance}%</span>
              <span className="text-[8px] text-stone-500">Rescata choque perdido a 100% daño</span>
            </div>
          </div>
        </div>
      )}

      {(selectedCategory === 'all' || selectedCategory === 'maledicts') && !searchQuery && (
        <div className="bg-stone-950/70 border border-purple-950/50 rounded-lg p-2.5 lg:p-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] diablo-font text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <span>💀</span> Catálogo Oficial de Maledicts
            </span>
            <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-stone-800">
              <button
                onClick={() => setActiveMaledictTab('infamies')}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded transition-all ${
                  activeMaledictTab === 'infamies'
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-600/50 font-bold'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                Infamias ({MALEDICT_INFAMIES.length})
              </button>
              <button
                onClick={() => setActiveMaledictTab('traits')}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded transition-all ${
                  activeMaledictTab === 'traits'
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-600/50 font-bold'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                Traits ({MALEDICT_TRAITS.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {activeMaledictTab === 'infamies'
              ? MALEDICT_INFAMIES.map((infamy) => (
                  <div
                    key={infamy.id}
                    className="bg-black/50 border border-stone-900 hover:border-purple-900/60 p-2 rounded flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-stone-200 flex items-center gap-1">
                        <span>{infamy.icon}</span>
                        <span>{infamy.name}</span>
                      </span>
                      <span className="text-[8px] font-mono bg-purple-950/70 border border-purple-800/40 text-purple-300 px-1 rounded">
                        {infamy.cooldownSeconds}s ±{infamy.jitterSeconds}s
                      </span>
                    </div>
                    <p className="text-[9px] text-stone-400 leading-tight">
                      {infamy.description}
                    </p>
                    <div className="mt-1 text-[8px] font-mono text-stone-500">
                      Duración: {infamy.durationTurns} turno(s) • Cooldown en segundos
                    </div>
                  </div>
                ))
              : MALEDICT_TRAITS.map((trait) => (
                  <div
                    key={trait.id}
                    className="bg-black/50 border border-stone-900 hover:border-red-900/60 p-2 rounded flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-stone-200 flex items-center gap-1">
                        <span>{trait.icon}</span>
                        <span>{trait.name}</span>
                      </span>
                      <span className="text-[8px] font-mono bg-red-950/70 border border-red-800/40 text-red-300 px-1 rounded">
                        PERMANENTE
                      </span>
                    </div>
                    <p className="text-[9px] text-stone-400 leading-tight">
                      {trait.description}
                    </p>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* TUTORIAL TOPIC SECTIONS (Accordion List) */}
      <div className="flex flex-col gap-2">
        {filteredSections.map((sec) => {
          const isExpanded = expandedSectionId === sec.id;
          return (
            <div
              key={sec.id}
              className={`rounded-lg border transition-all ${
                isExpanded
                  ? 'bg-stone-950/80 border-amber-900/60 shadow-lg'
                  : 'bg-black/40 border-stone-800/70 hover:border-stone-700'
              }`}
            >
              {/* Header / Click to toggle */}
              <button
                onClick={() => setExpandedSectionId(isExpanded ? '' : sec.id)}
                className="w-full p-2.5 lg:p-3 text-left flex items-center justify-between gap-2 touch-manipulation cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg lg:text-xl shrink-0">{sec.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs lg:text-sm diablo-font text-stone-200 truncate">
                        {sec.title}
                      </h3>
                      {sec.badge && (
                        <span className="text-[8px] lg:text-[9px] font-mono uppercase bg-stone-900 text-amber-400 border border-amber-800/40 px-1.5 py-0.2 rounded font-bold">
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-stone-500 truncate mt-0.5">
                      {sec.summary}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-stone-500 text-xs font-mono">
                  {isExpanded ? '▲' : '▼'}
                </div>
              </button>

              {/* Expanded Details Body */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-stone-800/60 text-stone-300 text-xs space-y-2.5 animate-fadeIn">
                  {sec.content.subtitle && (
                    <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider font-mono">
                      {sec.content.subtitle}
                    </h4>
                  )}

                  {sec.content.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-[11px] lg:text-xs leading-relaxed text-stone-300">
                      {p}
                    </p>
                  ))}

                  {sec.content.bullets && sec.content.bullets.length > 0 && (
                    <div className="space-y-1.5 bg-black/40 p-2.5 rounded border border-stone-900">
                      {sec.content.bullets.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[10px] lg:text-[11px]">
                          {b.icon && <span className="text-sm shrink-0 leading-none mt-0.5">{b.icon}</span>}
                          <div>
                            <span className="font-bold text-stone-200 mr-1.5">{b.label}:</span>
                            <span className="text-stone-400">{b.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.content.callout && (
                    <div
                      className={`p-2.5 rounded border text-[10px] lg:text-[11px] font-mono flex items-center gap-2 ${
                        sec.content.callout.type === 'tip'
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                          : sec.content.callout.type === 'warning'
                          ? 'bg-red-950/30 border-red-800/40 text-red-300'
                          : 'bg-sky-950/30 border-sky-800/40 text-sky-300'
                      }`}
                    >
                      <span className="text-base shrink-0">
                        {sec.content.callout.type === 'tip'
                          ? '💡'
                          : sec.content.callout.type === 'warning'
                          ? '⚠️'
                          : 'ℹ️'}
                      </span>
                      <span>{sec.content.callout.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="text-center py-8 text-stone-500 font-mono text-xs italic">
            No se encontraron mecánicas con el término "{searchQuery}". Prueba con "tríada", "parada", "maledict" o "atributos".
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="mt-auto pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between text-[9px] font-mono text-stone-500 gap-1 shrink-0">
        <span>Lord of the Dungeon • Sistema Dinámico de Manual de Juego</span>
        <span className="text-amber-500/80">
          Total de Mecánicas Documentadas: {TUTORIAL_SECTIONS.length}
        </span>
      </div>

    </div>
  );
};

export default GameTutorial;
