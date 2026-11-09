import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Monster, PlayerStats, CombatStatusEffect, ActiveEffect, CombatStance, MaledictAffix, TerrainType } from '../types';
import { BALANCE } from '../services/gameBalance';
import { TERRAIN_BATTLEBACKS, DEFAULT_HERO_AVATAR } from '../services/spriteCatalog';
import GameIcon from './GameIcon';
import { EnemyInspectModal } from './EnemyInspectModal';
import { HeroCombatStatsModal } from './HeroCombatStatsModal';

interface CombatModalProps {
  playerStats: PlayerStats;
  playerHp: number;
  monster: Monster; // Kept for legacy compat if needed, but we rely on activeMonsters mostly if passed via context
  activeMonsters?: Monster[]; // New Prop
  onFlee: () => void;
  combatLog: string[];
  isPlayerTurn: boolean;
  combatStatusEffects: CombatStatusEffect[];
  activeEffects: ActiveEffect[];
  combatStance: CombatStance;
  onSetStance: (stance: CombatStance) => void;
  turnQueue: ('player' | 'enemy')[];
  terrain?: TerrainType;
  selectedTargetId?: string | null;
  onSelectTarget?: (id: string) => void;
  potionsRemaining?: number;
  onUsePotion?: () => void;
}

// Fallback if activeMonsters not passed
const getMonsters = (single: Monster, list?: Monster[]) => list && list.length > 0 ? list : [single];

interface FloatingNumber { id: number; value: string; type: 'damage' | 'heal' | 'crit' | 'miss'; x: number; targetId?: string }

const FloatingText: React.FC<{ num: FloatingNumber }> = React.memo(({ num }) => {
  const color = num.type === 'heal' ? 'text-green-400' : num.type === 'crit' ? 'text-yellow-400 scale-150' : num.type === 'miss' ? 'text-blue-300' : 'text-red-500';
  return (
    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold diablo-font text-2xl md:text-4xl lg:text-5xl pointer-events-none z-50 drop-shadow-md animate-float-up ${color}`} style={{ marginLeft: `${num.x}px`, textShadow: '0 2px 4px rgba(0,0,0,1)' }}>{num.value}</div>
  );
});

const StatPlate: React.FC<{ label: string; value: string | number; icon: string; color?: string }> = React.memo(({ label, value, icon, color = 'text-stone-200' }) => (
    <div className="bg-black/60 border border-stone-700 rounded px-2 py-0.5 lg:py-1 flex items-center gap-1.5 lg:gap-2 min-w-[56px] lg:min-w-[90px] justify-center shadow-sm">
        <span className="text-[10px] lg:text-sm opacity-70 grayscale">{icon}</span>
        <div className="flex flex-col leading-none">
            <span className="text-[8px] lg:text-[10px] text-stone-500 uppercase font-bold">{label}</span>
            <span className={`text-[10px] lg:text-sm font-mono font-bold ${color}`}>{value}</span>
        </div>
    </div>
));

const HealthBar: React.FC<{ current: number; max: number; isEnemy?: boolean; label?: string, small?: boolean }> = React.memo(({ current, max, isEnemy, label, small }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = isEnemy ? 'bg-gradient-to-r from-red-900 via-red-600 to-red-900' : 'bg-gradient-to-r from-green-900 via-green-600 to-green-900';
  const heightClass = small ? 'h-2 lg:h-3' : 'h-3.5 lg:h-6 xl:h-7';
  
  return (
    <div className="w-full relative group shadow-[0_0_15px_rgba(0,0,0,0.5)]">
       <div className={`${heightClass} bg-black border border-stone-600 rounded relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          <div className={`h-full transition-all duration-300 ease-out ${barColor} relative`} style={{ width: `${percentage}%` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-[9px] lg:text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] z-10 font-mono tracking-widest">
             {Math.ceil(current)} / {max}
          </div>
       </div>
       {label && <div className={`absolute -top-3 lg:-top-4 ${isEnemy ? 'right-0' : 'left-0'} text-[8px] lg:text-[10px] font-bold text-stone-500 uppercase tracking-widest bg-black/40 px-1 rounded`}>{label}</div>}
    </div>
  );
});

const EFFECT_ICONS: Record<string, string> = { 
    burn: '🔥', freeze: '❄️', poison: '🤢', blind: '🙈', regen: '💖', 
    crit_boost: '⚡', chill: '🥶', stun: '💫', explode: '💥', shield: '🛡️',
    scaling_strength: '💪', dodge_boost: '💨' 
};

type AnyEffect = CombatStatusEffect | ActiveEffect | MaledictAffix;

const AuraTooltip: React.FC<{ effect: AnyEffect; rect: DOMRect | null }> = React.memo(({ effect, rect }) => {
  if (!rect) return null;

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const tooltipWidth = 240;
  
  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;
  const showBelow = spaceAbove < 160 && spaceBelow > spaceAbove;
  
  const top = showBelow ? rect.bottom + 12 : rect.top - 12;
  const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  
  const clampedLeft = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
  const transform = showBelow ? 'translateX(0)' : 'translateY(-100%)';

  let durationText = "";
  if ('duration' in effect) {
     const dur = (effect as any).duration;
     if ('type' in effect) durationText = `${dur} Turn${dur !== 1 ? 's' : ''}`;
     else durationText = `${dur} Battle${dur !== 1 ? 's' : ''}`;
  } else {
     durationText = "Permanent Aura";
  }

  const isMaledict = (e: any): e is MaledictAffix => 'statModifiers' in e;
  
  const typeLabel = isMaledict(effect) ? "Maledict Aura" : 
                    ('isDebuff' in effect && effect.isDebuff) || ('type' in effect && ['burn','poison','freeze','blind','chill','stun'].includes((effect as any).type)) 
                    ? "Debuff" : "Buff";

  return createPortal(
    <div 
        className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150 tooltip-card"
        style={{ top, left: clampedLeft, width: tooltipWidth, transform }}
    >
        <div className="bg-[#151413] border-2 border-stone-500 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-sm p-3 relative text-xs overflow-hidden">
             <div className="absolute inset-0 bg-stone-900 opacity-90"></div>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30"></div>
             <div className={`absolute w-3 h-3 bg-[#151413] border-r border-b border-stone-500 transform rotate-45 left-1/2 -translate-x-1/2 z-0 ${showBelow ? '-top-1.5 border-b-0 border-r-0 border-t border-l' : '-bottom-1.5'}`}></div>
             
             <div className="relative z-10">
                <div className="flex justify-between items-center border-b border-stone-700 pb-2 mb-2">
                    <span className="font-bold text-stone-100 text-sm uppercase tracking-wider font-serif">{effect.name}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-white/10 ${typeLabel === 'Debuff' ? 'bg-red-900/50 text-red-300' : typeLabel === 'Maledict Aura' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {typeLabel}
                    </span>
                </div>
                
                <p className="text-stone-300 leading-relaxed italic mb-3">
                    {effect.description || "Description unavailable."}
                </p>

                <div className="flex justify-between items-center text-[10px] bg-black/40 p-1.5 rounded font-mono border border-stone-800">
                    <span className="text-stone-500 font-bold">DURATION</span>
                    <span className={`font-bold ${durationText === "Permanent Aura" ? "text-purple-400" : "text-stone-200"}`}>{durationText}</span>
                </div>
                {('value' in effect && (effect as any).value !== 0) && (
                    <div className="text-[10px] text-stone-500 mt-1 font-mono text-right">
                         Strength: {(effect as any).value}
                    </div>
                )}
             </div>
        </div>
    </div>,
    document.body
  );
});

const AuraBadge: React.FC<{ 
    effect: AnyEffect; 
    onHover: (e: React.MouseEvent<HTMLDivElement>, effect: AnyEffect) => void; 
    onLeave: () => void; 
    small?: boolean;
}> = React.memo(({ effect, onHover, onLeave, small }) => {
    
    const isCombat = (e: any): e is CombatStatusEffect => 'type' in e && 'stacks' in e;
    const isMaledict = (e: any): e is MaledictAffix => 'statModifiers' in e;
    
    let icon = '';
    let badgeText: string | null = null;
    let stackCount = 0;
    let borderColor = 'border-stone-600';
    let bgColor = 'bg-stone-900/50';

    if (isCombat(effect)) {
        icon = EFFECT_ICONS[effect.type] || '✨';
        badgeText = `${effect.duration}`;
        stackCount = effect.stacks;
        const isDebuff = ['burn', 'poison', 'freeze', 'blind', 'chill', 'stun'].includes(effect.type);
        borderColor = isDebuff ? 'border-red-600' : 'border-blue-500';
        bgColor = isDebuff ? 'bg-red-950/60' : 'bg-blue-950/60';
    } else {
        icon = 'icon' in effect ? (effect as any).icon : '❓';
        if (isMaledict(effect)) {
            borderColor = 'border-purple-500';
            bgColor = 'bg-purple-950/60';
            badgeText = null; 
        } else {
            badgeText = `${(effect as ActiveEffect).duration}`;
            const isDebuff = (effect as ActiveEffect).isDebuff;
            borderColor = isDebuff ? 'border-red-600' : 'border-green-600';
            bgColor = isDebuff ? 'bg-red-950/60' : 'bg-green-950/60';
        }
    }

    const sizeClass = small ? 'w-5 h-5 lg:w-7 lg:h-7' : 'w-6 h-6 lg:w-10 lg:h-10';
    const textSize = small ? 'text-[10px] lg:text-xs' : 'text-xs lg:text-lg';

    return (
        <div 
            className={`relative ${sizeClass} shrink-0 border ${borderColor} ${bgColor} rounded flex items-center justify-center cursor-help transition-all duration-200 hover:scale-110 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:z-20 group aura-badge`}
            onMouseEnter={(e) => onHover(e, effect)}
            onClick={(e) => onHover(e, effect)}
            onMouseLeave={onLeave}
        >
            <span className={`${textSize} filter drop-shadow opacity-90 group-hover:opacity-100`}>{icon}</span>
            {badgeText && (
                 <span className="absolute -bottom-1 -right-1 bg-black text-[7px] lg:text-[9px] text-stone-300 px-0.5 lg:px-1 rounded leading-none border border-stone-800 shadow z-10 font-mono font-bold">
                    {badgeText}
                 </span>
            )}
            {stackCount > 1 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white text-[7px] lg:text-[8px] rounded-full min-w-[12px] h-3 px-0.5 flex items-center justify-center border border-black z-20 font-bold shadow-sm">
                    {stackCount}
                </span>
            )}
        </div>
    );
});

const CombatModal: React.FC<CombatModalProps> = ({ 
  playerStats, 
  playerHp, 
  monster, 
  activeMonsters, 
  onFlee, 
  combatLog, 
  isPlayerTurn, 
  combatStatusEffects, 
  activeEffects, 
  combatStance, 
  onSetStance, 
  turnQueue, 
  terrain,
  selectedTargetId,
  onSelectTarget,
  potionsRemaining = 0,
  onUsePotion
}) => {
  const monsters = getMonsters(monster, activeMonsters);
  const targetMonster = (selectedTargetId ? monsters.find(m => m.id === selectedTargetId && m.currentHp > 0) : null) 
    || monsters.find(m => m.currentHp > 0) 
    || monsters[0];
  
  const latestLog = combatLog[combatLog.length - 1] || "Battle Joined";
  
  const [heroFloats, setHeroFloats] = useState<FloatingNumber[]>([]);
  const [enemyFloats, setEnemyFloats] = useState<FloatingNumber[]>([]);
  const [hitMonsterIds, setHitMonsterIds] = useState<string[]>([]);
  const [isPlayerHit, setIsPlayerHit] = useState<boolean>(false);
  const [screenShake, setScreenShake] = useState<'none' | 'light' | 'heavy'>('none');
  const prevPlayerHp = useRef(playerHp);
  const prevMonsterHps = useRef<Record<string, number>>({});
  const [hoveredEffect, setHoveredEffect] = useState<{ effect: AnyEffect; rect: DOMRect } | null>(null);
  const [showEnemyInspect, setShowEnemyInspect] = useState<boolean>(false);
  const [showHeroStats, setShowHeroStats] = useState<boolean>(false);

  const handleEffectHover = (e: React.MouseEvent<HTMLDivElement>, effect: AnyEffect) => {
      if (hoveredEffect?.effect === effect) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredEffect({ effect, rect });
  };
  
  const handleEffectLeave = () => {
    setHoveredEffect(null);
  };

  // Trigger screen shake on Critical log
  useEffect(() => {
    if (combatLog.length === 0) return;
    const last = combatLog[combatLog.length - 1];
    if (last && (last.toUpperCase().includes('CRIT') || last.toUpperCase().includes('CRITICAL'))) {
        setScreenShake('heavy');
        const timer = setTimeout(() => setScreenShake('none'), 350);
        return () => clearTimeout(timer);
    }
  }, [combatLog.length]);

  useEffect(() => {
    const diff = playerHp - prevPlayerHp.current;
    if (diff !== 0) {
        setHeroFloats(prev => [...prev, { id: Date.now(), value: Math.abs(diff).toString(), type: diff > 0 ? 'heal' : 'damage', x: (Math.random() * 40) - 20 }]);
        setTimeout(() => setHeroFloats(prev => prev.slice(1)), 1000);
        if (diff < 0) {
            setIsPlayerHit(true);
            setTimeout(() => setIsPlayerHit(false), 450);

            // Screen shake when player takes damage
            const isHeavy = Math.abs(diff) >= 25 || latestLog.toUpperCase().includes('CRIT');
            setScreenShake(isHeavy ? 'heavy' : 'light');
            setTimeout(() => setScreenShake('none'), isHeavy ? 350 : 200);
        }
    }
    prevPlayerHp.current = playerHp;
  }, [playerHp, latestLog]);

  useEffect(() => {
    monsters.forEach(m => {
        const prev = prevMonsterHps.current[m.id] ?? m.currentHp;
        const diff = m.currentHp - prev;
        if (diff !== 0) {
            setEnemyFloats(prev => [...prev, { id: Date.now() + Math.random(), value: Math.abs(diff).toString(), type: 'damage', x: (Math.random() * 40) - 20, targetId: m.id }]);
            setTimeout(() => setEnemyFloats(prev => prev.slice(1)), 1000);
            if (diff < 0) {
                setHitMonsterIds(prev => [...prev, m.id]);
                setTimeout(() => setHitMonsterIds(prev => prev.filter(id => id !== m.id)), 450);

                // Screen shake on monster hit, crit or lethal execution
                const isCrit = latestLog.toUpperCase().includes('CRIT') || latestLog.toUpperCase().includes('CRITICAL');
                const isLethal = m.currentHp <= 0 && prev > 0;
                const isHeavy = isCrit || isLethal || Math.abs(diff) >= 30;
                setScreenShake(isHeavy ? 'heavy' : 'light');
                setTimeout(() => setScreenShake('none'), isHeavy ? 350 : 200);
            }
        }
        prevMonsterHps.current[m.id] = m.currentHp;
    });
  }, [monsters, latestLog]);

  useEffect(() => {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
          if (hoveredEffect && !(e.target as HTMLElement).closest('.aura-badge')) {
              setHoveredEffect(null);
          }
      };
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
      return () => {
          window.removeEventListener('click', handleClickOutside);
          window.removeEventListener('touchstart', handleClickOutside);
      };
  }, [hoveredEffect]);

  const isMulti = monsters.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm h-[100dvh] w-[100dvw] overflow-hidden">
       {hoveredEffect && <AuraTooltip effect={hoveredEffect.effect} rect={hoveredEffect.rect} />}

       <div className={`w-full h-full flex flex-col relative pointer-events-auto transition-transform ${screenShake === 'heavy' ? 'animate-screen-shake-heavy' : screenShake === 'light' ? 'animate-screen-shake-light' : ''}`}>
           {/* Critical Hit / Heavy Impact Vignette */}
           {screenShake === 'heavy' && (
               <div className="absolute inset-0 bg-red-600/15 pointer-events-none z-30 animate-pulse mix-blend-overlay"></div>
           )}

           {/* 1. TOP BAR: Timeline & Flee */}
           <div className="h-10 lg:h-14 shrink-0 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between px-3 lg:px-6 relative z-20 shadow-md">
                <div className="flex items-center gap-1.5 lg:gap-2 overflow-hidden flex-1 mr-2">
                    <span className="text-[10px] lg:text-xs text-stone-500 font-bold uppercase hidden sm:inline tracking-wider">Turn Order</span>
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient-right py-0.5">
                        {turnQueue.slice(0, 10).map((actor, idx) => (
                            <div key={idx} className={`shrink-0 w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border shadow-sm transition-all ${actor === 'player' ? 'bg-stone-800 border-green-600' : 'bg-stone-900 border-red-600'} ${idx === 0 ? 'ring-2 ring-amber-500 z-10' : 'opacity-70 scale-90'}`}>
                                <span className="text-[10px] lg:text-xs">{actor === 'player' ? '👤' : '👹'}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={onFlee} className="shrink-0 px-3 py-1 lg:px-4 lg:py-2 bg-stone-800 hover:bg-stone-700 active:bg-red-900 border border-stone-600 text-stone-300 text-[10px] lg:text-xs uppercase font-bold rounded transition-colors shadow-sm touch-manipulation">
                    Run Away
                </button>
           </div>

           {/* 2. BATTLE ARENA */}
           <div className="flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-between px-3 py-1.5 lg:p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900/20 via-black/80 to-black">
                {/* Dynamic Biome Battleback */}
                {terrain && TERRAIN_BATTLEBACKS[terrain] && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 z-0 pointer-events-none filter brightness-90 contrast-110"
                        style={{ backgroundImage: `url(${TERRAIN_BATTLEBACKS[terrain]})` }}
                    />
                )}

                {/* HERO SECTION */}
                <div className="order-3 sm:order-1 flex flex-row sm:flex-col items-center justify-center gap-2 lg:gap-4 w-full sm:w-56 md:w-64 lg:w-80 z-10 transition-all h-auto px-1">
                    <div className={`shrink-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-44 lg:h-44 xl:w-52 xl:h-52 rounded-full border-2 lg:border-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative transition-all duration-300 flex items-center justify-center overflow-hidden bg-black/60 ${isPlayerTurn ? 'border-green-600 shadow-[0_0_25px_rgba(22,163,74,0.3)] scale-[1.03]' : 'border-stone-700 opacity-90'} ${isPlayerHit ? 'animate-hit-shake' : ''}`}>
                        <div className="absolute inset-0 bg-black/30 rounded-full"></div>
                        <img 
                            src={playerStats.heroImageUrl || DEFAULT_HERO_AVATAR} 
                            alt="Hero Trainer" 
                            className="w-4/5 h-4/5 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] relative z-10 animate-hero-breathe" 
                        />
                        <div className="absolute bottom-1.5 w-16 lg:w-28 h-2.5 lg:h-4 bg-black/60 rounded-full blur-[2px] animate-shadow-pulse pointer-events-none"></div>
                        {heroFloats.map(f => <FloatingText key={f.id} num={f} />)}
                    </div>
                    
                    <div className="flex-grow w-full space-y-1 lg:space-y-2 min-w-0 pt-2 sm:pt-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] lg:text-[10px] font-bold text-stone-400 font-mono uppercase tracking-wider">HERO</span>
                            <button
                                onClick={() => setShowHeroStats(true)}
                                className="px-2 py-0.5 bg-stone-900/90 hover:bg-stone-800 border border-amber-600/70 hover:border-amber-400 text-amber-400 text-[9px] lg:text-[10px] font-mono font-bold rounded shadow flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                                title="Inspect Hero Live Combat Stats"
                            >
                                <span>📊</span>
                                <span>Stats</span>
                            </button>
                        </div>
                        <HealthBar current={playerHp} max={playerStats.maxHp} />
                        <div className="flex gap-2 justify-between">
                            <StatPlate label="Dmg" value={playerStats.damage} icon="⚔️" />
                            <StatPlate label="Arm" value={playerStats.armor} icon="🛡️" />
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar gap-1 min-h-[24px] lg:min-h-[36px] items-center mask-gradient-right">
                            {[...combatStatusEffects.filter(e => e.target === 'player'), ...activeEffects].map((e, idx) => (
                                <AuraBadge key={`${e.id}-${idx}`} effect={e} onHover={handleEffectHover} onLeave={handleEffectLeave} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* CONTROLS SECTION */}
                <div className="order-2 flex flex-col items-center justify-center z-10 my-1 sm:my-0 w-full sm:w-auto shrink-0 flex-1 gap-1.5 lg:gap-3">
                     <div className="hidden sm:block text-2xl lg:text-6xl xl:text-7xl diablo-font text-red-800 font-bold drop-shadow-lg opacity-50 leading-none">VS</div>
                     
                     {/* Stance Selector */}
                     <div className="flex gap-2 bg-stone-900/80 p-1.5 lg:p-2 rounded border border-stone-700 backdrop-blur-md shadow-xl">
                        {[CombatStance.AGGRESSIVE, CombatStance.BALANCED, CombatStance.DEFENSIVE].map(s => (
                            <button key={s} onClick={() => onSetStance(s)} className={`w-9 h-9 lg:w-12 lg:h-12 flex items-center justify-center rounded transition-all active:scale-95 touch-manipulation cursor-pointer ${combatStance === s ? 'bg-stone-700 text-amber-400 border border-stone-500 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'text-stone-600 hover:text-stone-300 hover:bg-stone-800'}`}>
                                <span className="text-base lg:text-lg">{s === CombatStance.AGGRESSIVE ? '⚔️' : s === CombatStance.DEFENSIVE ? '🛡️' : '⚖️'}</span>
                            </button>
                        ))}
                    </div>
                    <div className="text-[9px] lg:text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none">Combat Stance</div>

                    {/* Emergency Potion Button */}
                    {onUsePotion && (
                        <button
                            onClick={onUsePotion}
                            disabled={potionsRemaining <= 0}
                            className="px-3 py-1 lg:px-4 lg:py-1.5 bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:to-red-800 disabled:opacity-40 disabled:cursor-not-allowed border border-red-700 text-red-200 text-[11px] lg:text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 lg:gap-2 transition-all active:scale-95 cursor-pointer"
                            title="Restore 35% HP"
                        >
                            <span className="text-sm lg:text-base">🧪</span>
                            <span>Drink Potion</span>
                            <span className="bg-black/50 px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] font-mono text-amber-400">
                                {potionsRemaining} left
                            </span>
                        </button>
                    )}
                </div>

                {/* ENEMY SECTION */}
                <div className="order-1 sm:order-3 flex flex-row-reverse sm:flex-col items-center justify-center gap-2 lg:gap-4 w-full sm:w-56 md:w-64 lg:w-80 z-10 transition-all h-auto max-h-full px-1">
                    
                    {/* Multi-Enemy Layout */}
                    {isMulti ? (
                        <div className="flex flex-col gap-1 lg:gap-1.5 w-full max-h-full overflow-y-auto no-scrollbar py-0.5">
                            <div className="flex items-center justify-between px-1 pb-1 border-b border-stone-800/80 mb-0.5 shrink-0">
                                <span className="text-[9px] lg:text-[10px] text-stone-500 font-bold uppercase tracking-wider">Target Focus</span>
                                <button
                                    onClick={() => setShowEnemyInspect(true)}
                                    className="px-2 py-0.5 bg-stone-900/90 hover:bg-stone-800 border border-red-600/70 hover:border-red-400 text-red-300 text-[9px] lg:text-[10px] font-mono font-bold rounded shadow flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                                    title="Inspect Enemy Intel & Codex"
                                >
                                    <span>🔍</span>
                                    <span>Codex</span>
                                </button>
                            </div>
                            {monsters.map((m, idx) => {
                                const isDead = m.currentHp <= 0;
                                const isTarget = m === targetMonster;
                                const config = BALANCE.MONSTER.rarityConfig[m.rarity];
                                const breatheAnimClass = idx % 3 === 0 
                                    ? 'animate-monster-breathe' 
                                    : idx % 3 === 1 
                                    ? 'animate-monster-breathe-1' 
                                    : 'animate-monster-breathe-2';
                                
                                return (
                                    <div 
                                        key={m.id} 
                                        onClick={() => !isDead && onSelectTarget && onSelectTarget(m.id)}
                                        className={`flex gap-2 lg:gap-3 bg-black/50 border ${isTarget ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] ring-1 ring-red-500 scale-[1.01]' : 'border-stone-800 hover:border-stone-600'} rounded p-1.5 lg:p-2 relative transition-all cursor-pointer ${isDead ? 'opacity-35 grayscale cursor-not-allowed' : 'opacity-100'}`}
                                        title={isDead ? 'Dead' : 'Click to Focus Attack'}
                                    >
                                        <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-lg border-2 shrink-0 relative flex items-center justify-center overflow-hidden bg-black/60 ${!isPlayerTurn && isTarget ? `${config.glow} -translate-x-1` : ''} ${config.color.replace('text', 'border')} ${hitMonsterIds.includes(m.id) ? 'animate-hit-shake' : ''}`}>
                                             <div className={`w-8 h-8 lg:w-11 lg:h-11 relative z-10 flex items-center justify-center ${!isDead ? breatheAnimClass : ''}`}>
                                                 <GameIcon name={m.icon} imageUrl={m.imageUrl} className={`w-full h-full drop-shadow-md ${config.color}`} />
                                             </div>
                                             <div className="absolute bottom-1 w-6 lg:w-8 h-1.5 lg:h-2 bg-black/60 rounded-full blur-[1px] animate-shadow-pulse pointer-events-none z-0"></div>
                                             {isTarget && !isDead && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-red-600 rounded-full animate-ping border border-black z-20"></div>
                                             )}
                                             {isTarget && !isDead && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] lg:text-[8px] text-white font-bold border border-black z-20">
                                                    🎯
                                                </div>
                                             )}
                                             {enemyFloats.filter(f => f.targetId === m.id).map(f => <FloatingText key={f.id} num={f} />)}
                                        </div>
                                        <div className="flex-grow flex flex-col justify-center min-w-0">
                                            <div className="flex justify-between items-center mb-0.5 lg:mb-1">
                                                <span className={`text-[11px] lg:text-xs font-bold truncate ${isDead ? 'line-through text-stone-600' : 'text-stone-300'}`}>{m.name}</span>
                                                <div className="flex gap-1">
                                                    {[...m.maledicts, ...combatStatusEffects.filter(e => e.target === 'enemy' && (e as any).targetId === m.id)].slice(0, 3).map((e, i) => (
                                                        <AuraBadge key={i} effect={e} onHover={handleEffectHover} onLeave={handleEffectLeave} small />
                                                    ))}
                                                </div>
                                            </div>
                                            <HealthBar current={m.currentHp} max={m.maxHp} isEnemy small />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Single Enemy Layout (Legacy/Big Boss)
                        <div className="flex flex-row-reverse sm:flex-col items-center gap-2 lg:gap-4 w-full">
                            <div className={`shrink-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-44 lg:h-44 xl:w-52 xl:h-52 rounded-full border-2 lg:border-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative transition-all duration-300 flex items-center justify-center overflow-hidden bg-black/60 ${!isPlayerTurn ? `border-red-600 ${BALANCE.MONSTER.rarityConfig[targetMonster.rarity].glow} scale-[1.03] -translate-x-1` : 'border-stone-700 opacity-95'} ${hitMonsterIds.includes(targetMonster.id) ? 'animate-hit-shake' : ''}`}>
                                <div className="absolute inset-0 bg-black/30 rounded-full"></div>
                                <div className="w-4/5 h-4/5 flex items-center justify-center relative z-10 animate-monster-breathe">
                                    <GameIcon name={targetMonster.icon} imageUrl={targetMonster.imageUrl} className={`w-full h-full drop-shadow-2xl ${BALANCE.MONSTER.rarityConfig[targetMonster.rarity].color}`} />
                                </div>
                                <div className="absolute bottom-1.5 w-16 lg:w-28 h-2.5 lg:h-4 bg-black/60 rounded-full blur-[2px] animate-shadow-pulse pointer-events-none z-0"></div>
                                {enemyFloats.map(f => <FloatingText key={f.id} num={f} />)}
                            </div>
                            
                            <div className="flex-grow w-full space-y-1 lg:space-y-2 min-w-0 text-right sm:text-left pt-2 sm:pt-1">
                                <div className="flex items-center justify-between gap-2 mb-0.5 flex-row-reverse sm:flex-row">
                                    <button
                                        onClick={() => setShowEnemyInspect(true)}
                                        className="px-2 py-0.5 bg-stone-900/90 hover:bg-stone-800 border border-red-600/70 hover:border-red-400 text-red-300 text-[9px] lg:text-[10px] font-mono font-bold rounded shadow flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                                        title="Inspect Enemy Intel & Codex"
                                    >
                                        <span>🔍</span>
                                        <span>Codex</span>
                                    </button>
                                    <span className="text-[9px] lg:text-[10px] font-bold text-stone-400 font-mono uppercase tracking-wider">
                                        {targetMonster.rarity} {targetMonster.isBoss ? '• BOSS' : ''}
                                    </span>
                                </div>
                                <HealthBar current={targetMonster.currentHp} max={targetMonster.maxHp} isEnemy />
                                <div className="flex gap-2 justify-between flex-row-reverse sm:flex-row">
                                    <StatPlate label="Dmg" value={targetMonster.damage} icon="⚔️" color="text-red-400" />
                                    <StatPlate label="Arm" value={targetMonster.armor} icon="🛡️" />
                                </div>
                                <div className="flex overflow-x-auto no-scrollbar gap-1 min-h-[24px] lg:min-h-[36px] items-center justify-end sm:justify-start mask-gradient-left sm:mask-gradient-right">
                                    {[...targetMonster.maledicts, ...combatStatusEffects.filter(e => e.target === 'enemy' && (e as any).targetId === targetMonster.id)].map((e, idx) => (
                                        <AuraBadge key={`${e.id}-${idx}`} effect={e} onHover={handleEffectHover} onLeave={handleEffectLeave} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
           </div>

           {/* 3. FOOTER: Logs */}
           <div className="h-9 lg:h-20 bg-black/95 border-t border-stone-800 flex items-center justify-center shrink-0 z-20 px-4 pb-safe">
                <div className={`text-xs sm:text-sm lg:text-2xl diablo-font tracking-wide text-center line-clamp-1 ${latestLog.includes('CRIT') ? 'text-yellow-500 animate-pulse font-bold' : 'text-stone-300'}`}>
                    {latestLog}
                </div>
           </div>
       </div>

       {/* Enemy Codex / Intel Modal */}
       {showEnemyInspect && (
         <EnemyInspectModal
           monsters={monsters}
           initialTargetId={targetMonster?.id}
           playerLevel={playerStats.level}
           combatStatusEffects={combatStatusEffects}
           terrain={terrain}
           onSelectTarget={onSelectTarget}
           onClose={() => setShowEnemyInspect(false)}
         />
       )}

       {/* Hero Tactical Combat Stats Modal */}
       {showHeroStats && (
         <HeroCombatStatsModal
           playerStats={playerStats}
           playerHp={playerHp}
           combatStance={combatStance}
           combatStatusEffects={combatStatusEffects}
           activeEffects={activeEffects}
           onClose={() => setShowHeroStats(false)}
         />
       )}
    </div>
  );
};

export default React.memo(CombatModal);