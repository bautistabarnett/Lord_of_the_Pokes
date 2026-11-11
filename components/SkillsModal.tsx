
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PassiveSkill, ActiveEffect, PassiveTheme, BuildLoadout, PlayerStats, Rarity } from '../types';
import { PASSIVE_THEME_COLORS, PASSIVE_SKILLS_POOL, COMPOSITE_SYNERGIES, PASSIVE_SET_BONUSES } from '../constants';
import { BaseModal } from './BaseModal';

interface SkillsModalProps {
  passiveSkills: PassiveSkill[];
  activeEffects: ActiveEffect[];
  equippedSkillIds: string[];
  buildLoadouts: BuildLoadout[];
  playerStats: PlayerStats;
  onEquip: (skillId: string) => void;
  onUnequip: (skillId: string) => void;
  onUnlockTreeSkill: (skillId: string) => void;
  onSaveBuild: (name: string) => void;
  onLoadBuild: (loadout: BuildLoadout) => void;
  onRespecAttributes: () => void;
  onClose: () => void;
}

// --- VISUAL CONSTANTS ---
const TIER_ROW_HEIGHT = 160;
const NODE_WIDTH = 64;
const TREE_CANVAS_WIDTH = 800;
const CANVAS_CENTER_OFFSET = 180; // Centers treeX 1..3 across the 800px canvas

// Branch Definitions
const BRANCHES = [
    { id: 'offense', label: 'Offense', themes: [PassiveTheme.PYROMANCY, PassiveTheme.WARFARE], icon: '⚔️' },
    { id: 'defense', label: 'Defense', themes: [PassiveTheme.SENTINEL, PassiveTheme.CRYOMANCY], icon: '🛡️' },
    { id: 'utility', label: 'Utility', themes: [PassiveTheme.FORTUNE, PassiveTheme.NATURE], icon: '🌿' },
    { id: 'control', label: 'Control', themes: [PassiveTheme.SHADOW, PassiveTheme.ARCANE], icon: '🔮' },
    { id: 'exploration', label: 'Exploration', themes: [PassiveTheme.SCOUTING], icon: '🗺️' }
];

// --- DETAILS PANEL COMPONENT ---
const SkillDetailsPanel = React.memo(({
    skill,
    learnedSkill,
    isEquipped,
    isLocked,
    prerequisiteName,
    playerPoints,
    onInvest,
    onToggleEquip,
    onClose
}: {
    skill: any;
    learnedSkill?: PassiveSkill;
    isEquipped: boolean;
    isLocked: boolean;
    prerequisiteName?: string;
    playerPoints: number;
    onInvest: () => void;
    onToggleEquip: () => void;
    onClose: () => void;
}) => {
    const themeStyle = PASSIVE_THEME_COLORS[skill.theme as PassiveTheme];
    const maxRank = skill.maxRank || 10;
    const currentLevel = learnedSkill ? learnedSkill.level : 0;
    const isMaxed = currentLevel >= maxRank;
    const cost = 1;
    const canAfford = playerPoints >= cost;

    // Calculate Values
    const currentValue = skill.baseValue + Math.max(0, currentLevel - 1) * skill.valuePerLevel;
    const nextValue = skill.baseValue + currentLevel * skill.valuePerLevel;

    // Determine relevant Synergy
    const synergy = useMemo(() => COMPOSITE_SYNERGIES.find(s => s.themes.includes(skill.theme)), [skill.theme]);

    return (
        <div className="absolute bottom-0 left-0 w-full bg-[#151413] border-t-2 border-amber-600 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-50 animate-in slide-in-from-bottom duration-300 pb-safe">
            <div className="flex flex-col sm:flex-row max-w-5xl mx-auto h-full max-h-[55dvh] lg:max-h-[65vh] overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className={`p-3 lg:p-6 bg-gradient-to-r ${themeStyle.bg} to-transparent sm:w-1/3 flex flex-col justify-center relative overflow-hidden shrink-0`}>
                    <div className="absolute top-0 right-0 p-2 lg:p-4 opacity-10 text-5xl lg:text-8xl pointer-events-none">{themeStyle.icon}</div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                             <h3 className={`font-bold diablo-font text-base lg:text-2xl ${skill.rarity === Rarity.UNIQUE ? 'text-amber-500' : 'text-stone-200'} leading-none mb-1.5 lg:mb-2`}>{skill.name}</h3>
                             <button onClick={onClose} className="sm:hidden text-stone-400 hover:text-white p-1 -mr-1 -mt-1">✕</button>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 lg:mb-2">
                            <span className={`text-[9px] lg:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 ${themeStyle.text}`}>{skill.theme}</span>
                            <span className="text-[9px] lg:text-[10px] text-stone-400 uppercase">Tier {skill.tier}</span>
                        </div>
                         
                        {isLocked && prerequisiteName && (
                            <div className="text-red-400 text-[10px] lg:text-xs flex items-center gap-1 font-bold bg-black/50 p-1 rounded w-fit">
                                🔒 Requires: {prerequisiteName}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-3 lg:p-6 flex-grow bg-stone-900/80 sm:w-2/3 flex flex-col gap-2 lg:gap-4 relative">
                    <button onClick={onClose} className="hidden sm:flex absolute top-2 right-2 w-7 h-7 items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors">✕</button>
                    
                    {/* Description & Stats */}
                    <div className="pr-6">
                        <div className="text-xs lg:text-sm text-stone-300 leading-relaxed italic mb-1.5 lg:mb-3">
                            {skill.description.replace('{value}', `[${currentValue}]`)}
                        </div>
                        
                        {/* Stat Scaling Preview */}
                        {!isMaxed && (
                            <div className="text-[10px] lg:text-xs font-mono text-stone-500 flex gap-3 lg:gap-4 bg-black/30 p-1.5 lg:p-2 rounded border border-white/5">
                                <div>Current Value: <span className="text-stone-300">{currentValue}</span></div>
                                <div className="text-stone-600">➜</div>
                                <div>Next Rank: <span className="text-green-400">{nextValue}</span></div>
                            </div>
                        )}
                    </div>
                    
                    {/* Proc / Effect Details */}
                    {skill.proc && (
                         <div className="bg-black/40 border border-stone-800 rounded p-1.5 lg:p-2 text-[10px] lg:text-xs grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 lg:gap-y-1 items-start">
                             <span className="text-amber-500 font-bold">Effect:</span> 
                             <span className="text-stone-300">{skill.proc.description}</span>
                             
                             <span className="text-stone-500">Trigger:</span>
                             <span className="text-stone-400 capitalize">{skill.proc.trigger.replace('on', '')}</span>
                             
                             {skill.proc.chance < 1 && (
                                <>
                                    <span className="text-stone-500">Chance:</span>
                                    <span className="text-stone-400">{Math.round(skill.proc.chance * 100)}%</span>
                                </>
                             )}
                             
                             {skill.proc.cooldown > 0 && (
                                <>
                                    <span className="text-stone-500">Cooldown:</span>
                                    <span className="text-stone-400">{skill.proc.cooldown} Turns</span>
                                </>
                             )}
                         </div>
                    )}
                    
                    {/* Synergy Hint */}
                    {synergy && (
                        <div className="text-[10px] text-stone-500">
                            <span className="text-purple-400 font-bold">Synergy:</span> Part of <span className="text-stone-300">{synergy.name}</span> combination.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 lg:gap-4 mt-auto border-t border-white/5 pt-2 lg:pt-4">
                         <div className="flex flex-col border-r border-stone-700 pr-3 lg:pr-4">
                             <span className="text-[9px] lg:text-[10px] text-stone-500 uppercase font-bold">Rank</span>
                             <span className={`font-mono text-sm lg:text-lg ${isMaxed ? 'text-amber-500' : 'text-white'}`}>{currentLevel}/{maxRank}</span>
                         </div>
                         
                         <div className="flex-grow flex gap-2 lg:gap-3 justify-end items-center">
                             
                             {/* Equip Toggle */}
                             {learnedSkill && (
                                 <button 
                                    onClick={onToggleEquip}
                                    className={`px-3 py-1.5 lg:px-4 lg:py-3 font-bold uppercase tracking-widest text-[10px] lg:text-xs rounded border transition-all flex-1 sm:flex-none ${isEquipped ? 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40' : 'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700'}`}
                                 >
                                     {isEquipped ? 'Unequip' : 'Equip'}
                                 </button>
                             )}

                             {/* Invest Point */}
                             {(!isMaxed) && (
                                 <button
                                     onClick={onInvest}
                                     disabled={!canAfford || isLocked}
                                     className={`flex-grow sm:flex-grow-0 px-4 py-1.5 lg:px-6 lg:py-3 font-bold uppercase tracking-widest text-[10px] lg:text-xs rounded border transition-all shadow-lg active:scale-95 flex flex-col items-center justify-center min-w-[120px] lg:min-w-[140px]
                                        ${(!canAfford || isLocked) 
                                            ? 'bg-stone-800 border-stone-700 text-stone-600 cursor-not-allowed' 
                                            : 'bg-amber-700 border-amber-600 text-white hover:bg-amber-600'}
                                     `}
                                 >
                                     <span>{learnedSkill ? 'Upgrade Skill' : 'Unlock Skill'}</span>
                                     <span className="text-[9px] font-normal opacity-70">{cost} Skill Point</span>
                                 </button>
                             )}
                             
                             {isMaxed && (
                                 <div className="text-amber-500 font-bold text-xs lg:text-sm uppercase px-3 py-1.5 lg:px-4 lg:py-2 border border-amber-900 bg-amber-950/30 rounded flex-1 sm:flex-none text-center">
                                     Max Rank
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- TREE NODE ---
interface TreeNodeProps {
    node: any;
    learnedSkill?: PassiveSkill;
    isActive: boolean;
    isLocked: boolean;
    canAfford: boolean;
    isSelected: boolean;
    onClick: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = React.memo(({ 
    node, 
    learnedSkill, 
    isActive, 
    isLocked,
    canAfford,
    isSelected,
    onClick,
}) => {
    const themeStyle = PASSIVE_THEME_COLORS[node.theme as PassiveTheme];
    const level = learnedSkill ? learnedSkill.level : 0;
    const maxRank = node.maxRank || 10;
    const isMaxed = level >= maxRank;

    let borderClass = 'border-stone-700';
    let bgClass = 'bg-stone-900';
    let iconClass = 'grayscale opacity-30 text-stone-500';
    let scaleClass = 'scale-100';

    if (!isLocked) {
        borderClass = isActive ? 'border-green-500' : themeStyle.border;
        bgClass = isActive ? 'bg-green-950/40' : 'bg-stone-800';
        iconClass = isActive ? 'text-green-400' : themeStyle.text;
        
        if (isMaxed) {
             borderClass = 'border-amber-500';
             iconClass = 'text-amber-400';
        }
    } else if (!isLocked && canAfford) {
        borderClass = 'border-stone-400';
        iconClass = 'text-stone-400';
    }

    if (isSelected) {
        scaleClass = 'scale-110';
        borderClass = 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]';
        bgClass = 'bg-stone-700';
    }

    // Coordinates logic: (treeX) * 120 + offset
    const leftPos = (node.treeX || 0) * 120 + CANVAS_CENTER_OFFSET;

    return (
        <div 
            className="absolute flex flex-col items-center justify-center"
            style={{ 
                left: `${leftPos}px`, 
                top: `${(node.tier - 1) * TIER_ROW_HEIGHT + 40}px`,
                width: NODE_WIDTH,
                height: NODE_WIDTH
            }}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                className={`
                    w-16 h-16 rounded-md border-2 flex items-center justify-center relative shadow-lg transition-all duration-200 z-10
                    ${borderClass} ${bgClass} ${scaleClass}
                    touch-manipulation
                `}
            >
                <span className={`text-2xl filter drop-shadow-md transition-all duration-300 ${iconClass}`}>{themeStyle.icon}</span>
                
                {/* Level Badge */}
                <div className="absolute -bottom-2 -right-2 bg-black text-[9px] font-mono border border-stone-700 px-1 rounded text-stone-300 z-20 shadow-sm">
                    {level}/{maxRank}
                </div>
                
                {/* Active Indicator */}
                {isActive && (
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_5px_lime] animate-pulse"></div>
                )}
            </button>
            
            {/* Locked Padlock */}
            {isLocked && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-500 text-2xl drop-shadow-md z-30 pointer-events-none">
                    🔒
                </div>
            )}
        </div>
    );
});


// --- MAIN MODAL ---
const SkillsModal: React.FC<SkillsModalProps> = ({ 
    passiveSkills, 
    activeEffects, 
    equippedSkillIds, 
    playerStats,
    onEquip, 
    onUnequip,
    onUnlockTreeSkill,
    onRespecAttributes,
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'effects'>('tree');
  const [selectedBranchId, setSelectedBranchId] = useState('offense');
  const [selectedTheme, setSelectedTheme] = useState<PassiveTheme>(PassiveTheme.PYROMANCY);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Pan & Zoom State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);

  // Filter skills for current branch and theme
  const currentBranch = useMemo(() => BRANCHES.find(b => b.id === selectedBranchId) || BRANCHES[0], [selectedBranchId]);

  // Keep selectedTheme in sync when branch changes
  useEffect(() => {
    if (currentBranch && !currentBranch.themes.includes(selectedTheme)) {
      setSelectedTheme(currentBranch.themes[0]);
      setSelectedNodeId(null);
    }
  }, [currentBranch, selectedTheme]);

  // Filter skills strictly for the active theme to avoid any visual collision!
  const treeNodes = useMemo(() => PASSIVE_SKILLS_POOL.filter(s => s.theme === selectedTheme), [selectedTheme]);

  // Determine Connections for SVG (only within active theme)
  const connections = useMemo(() => treeNodes.map(node => {
      if (!node.prerequisiteId) return null;
      const parent = treeNodes.find(p => p.id === node.prerequisiteId);
      if (!parent) return null;
      
      return {
          fromX: (parent.treeX || 0) * 120 + CANVAS_CENTER_OFFSET + 32, 
          fromY: (parent.tier - 1) * TIER_ROW_HEIGHT + 40 + 64, 
          toX: (node.treeX || 0) * 120 + CANVAS_CENTER_OFFSET + 32,
          toY: (node.tier - 1) * TIER_ROW_HEIGHT + 40,
          isUnlocked: passiveSkills.some(s => s.id === parent.id)
      };
  }).filter(Boolean), [treeNodes, passiveSkills]);

  // Current theme set bonus & equipped count
  const currentSetBonus = useMemo(() => {
      return PASSIVE_SET_BONUSES.find(b => b.theme === selectedTheme);
  }, [selectedTheme]);

  const currentThemeEquippedCount = useMemo(() => {
      return passiveSkills.filter(s => s.theme === selectedTheme && equippedSkillIds.includes(s.id)).length;
  }, [passiveSkills, selectedTheme, equippedSkillIds]);

  const isCurrentSetBonusActive = useMemo(() => {
      return playerStats.activeSetBonuses?.includes(selectedTheme) || false;
  }, [playerStats.activeSetBonuses, selectedTheme]);

  // --- INTERACTION HANDLERS ---
  const handlePointerDown = (e: React.PointerEvent) => {
      if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('canvas-layer')) return;
      isDragging.current = false; 
      startPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!e.buttons) return;
      
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      
      // Simple threshold to determine drag vs click
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging.current = true;
          setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          startPos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          // Pinch Zoom
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          
          if (lastDist.current !== null) {
              const delta = dist - lastDist.current;
              const zoomFactor = delta * 0.005;
              setTransform(prev => ({ ...prev, scale: Math.min(2, Math.max(0.5, prev.scale + zoomFactor)) }));
          }
          lastDist.current = dist;
      } else if (e.touches.length === 1) {
          // Pan
          const touch = e.touches[0];
          const dx = touch.clientX - startPos.current.x;
          const dy = touch.clientY - startPos.current.y;
          
           if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
               isDragging.current = true;
               setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
               startPos.current = { x: touch.clientX, y: touch.clientY };
           }
      }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          lastDist.current = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      } else {
          lastDist.current = null;
          startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          isDragging.current = false;
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      setTransform(prev => ({ ...prev, scale: Math.min(2, Math.max(0.5, prev.scale + delta)) }));
  };

  useEffect(() => {
      const isShort = window.innerHeight < 540;
      setTransform({ x: 0, y: isShort ? 80 : 0, scale: isShort ? 0.65 : 1 });
      setSelectedNodeId(null);
  }, [selectedBranchId]);

  const handleNodeClick = useCallback((nodeId: string) => {
      if (!isDragging.current) {
          setSelectedNodeId(nodeId);
      }
  }, []);

  const handleInvestPoint = useCallback(() => {
      if (!selectedNodeId) return;
      onUnlockTreeSkill(selectedNodeId);
  }, [selectedNodeId, onUnlockTreeSkill]);

  const handleToggleEquip = useCallback(() => {
      if (!selectedNodeId) return;
      if (equippedSkillIds.includes(selectedNodeId)) {
          onUnequip(selectedNodeId);
      } else {
          onEquip(selectedNodeId);
      }
  }, [selectedNodeId, equippedSkillIds, onUnequip, onEquip]);

  const isNodeLocked = useCallback((nodeId: string, prerequisiteId?: string) => {
      const learned = passiveSkills.some(s => s.id === nodeId);
      if (learned) return false;
      if (!prerequisiteId) return false;
      return !passiveSkills.some(s => s.id === prerequisiteId);
  }, [passiveSkills]);

  const selectedNode = useMemo(() => selectedNodeId ? treeNodes.find(n => n.id === selectedNodeId) : null, [selectedNodeId, treeNodes]);
  const learnedSelected = useMemo(() => selectedNode ? passiveSkills.find(s => s.id === selectedNode.id) : undefined, [selectedNode, passiveSkills]);
  
  // Resolve Prereq Name
  const prereqName = useMemo(() => {
      if (selectedNode?.prerequisiteId) {
          const p = PASSIVE_SKILLS_POOL.find(s => s.id === selectedNode.prerequisiteId);
          if(p) return p.name;
      }
      return undefined;
  }, [selectedNode]);

  return (
    <BaseModal.Container zIndex="z-[60]" maxWidth="max-w-7xl" className="h-[94dvh] lg:h-[90vh] shadow-2xl border-stone-800">
      <BaseModal.Header 
        title="Skill Tree" 
        subtitle={`Points Available: ${playerStats.skillPoints}`} 
        icon="📜" 
        onClose={onClose} 
      />

      {/* TABS & RESPEC ACTION */}
      <div className="flex items-center justify-between border-b border-stone-700 bg-stone-950 shrink-0 px-2 sm:px-4">
          <div className="flex flex-1">
              <button 
                  onClick={() => setActiveTab('tree')}
                  className={`flex-1 py-1.5 lg:py-3 text-xs lg:text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'tree' ? 'bg-[#1c1917] text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900'}`}
              >
                  Skill Trees
              </button>
              <button 
                  onClick={() => setActiveTab('effects')}
                  className={`flex-1 py-1.5 lg:py-3 text-xs lg:text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'effects' ? 'bg-[#1c1917] text-amber-400 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900'}`}
              >
                  Sets & Effects ({(playerStats.activeSetBonuses?.length || 0) + (playerStats.activeSynergies?.length || 0) + activeEffects.length})
              </button>
          </div>
          <button
              onClick={onRespecAttributes}
              className="ml-3 px-2.5 py-1 lg:px-3 lg:py-1.5 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-700 text-red-200 text-[10px] lg:text-xs font-bold rounded shadow transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Refund all spent attribute and talent points for gold"
          >
              <span>🔄</span>
              <span className="hidden sm:inline">Reset Build</span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] text-amber-400 font-mono">
                  {Math.max(50, playerStats.level * 50)}g
              </span>
          </button>
      </div>

      <BaseModal.Body className="bg-[#0c0a09] relative flex flex-col h-full overflow-hidden" noPadding>
            
            {activeTab === 'tree' && (
                <div className="flex flex-col sm:flex-row h-full relative">
                    
                    {/* SIDEBAR: Branch Selector */}
                    <div className="w-full sm:w-40 lg:w-64 bg-stone-950 border-b sm:border-b-0 sm:border-r border-stone-800 flex flex-row sm:flex-col overflow-x-auto sm:overflow-y-auto shrink-0 z-20 custom-scrollbar">
                        {BRANCHES.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => {
                                    setSelectedBranchId(branch.id);
                                    setSelectedTheme(branch.themes[0]);
                                    setSelectedNodeId(null);
                                }}
                                className={`
                                    flex items-center gap-2 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 border-r sm:border-r-0 sm:border-b border-stone-800 transition-colors whitespace-nowrap min-w-[110px] sm:min-w-0
                                    ${selectedBranchId === branch.id ? 'bg-stone-900 text-amber-500 sm:border-l-4 sm:border-l-amber-500 border-b-4 sm:border-b-stone-800 border-b-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900'}
                                `}
                            >
                                <span className="text-base lg:text-xl">{branch.icon}</span>
                                <span className="font-bold uppercase tracking-wider text-[11px] lg:text-sm">{branch.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* CANVAS AREA */}
                    <div className="flex-grow relative overflow-hidden bg-[#12100e] cursor-grab active:cursor-grabbing touch-none select-none">
                         
                         {/* Controls Overlay */}
                         <div className="absolute top-2 right-2 lg:top-4 lg:right-4 z-30 flex flex-col gap-1.5 lg:gap-2">
                             <button onClick={() => setTransform(p => ({...p, scale: Math.min(2, p.scale + 0.2)}))} className="w-8 h-8 lg:w-10 lg:h-10 bg-stone-800 border border-stone-600 rounded text-stone-300 hover:bg-stone-700 shadow-lg font-bold text-base lg:text-xl">+</button>
                             <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.4, p.scale - 0.2)}))} className="w-8 h-8 lg:w-10 lg:h-10 bg-stone-800 border border-stone-600 rounded text-stone-300 hover:bg-stone-700 shadow-lg font-bold text-base lg:text-xl">-</button>
                             <button onClick={() => { const isShort = window.innerHeight < 540; setTransform({x:0, y: isShort ? 80 : 0, scale: isShort ? 0.65 : 1}); }} className="w-8 h-8 lg:w-10 lg:h-10 bg-stone-800 border border-stone-600 rounded text-stone-300 hover:bg-stone-700 shadow-lg text-[10px] lg:text-xs font-bold">RST</button>
                         </div>
                         
                         {/* Points Display (Mobile Overlay) */}
                         <div className="absolute top-2 left-2 lg:top-4 lg:left-4 z-30 pointer-events-none">
                             <div className="bg-black/60 border border-amber-900/50 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded backdrop-blur-sm">
                                 <span className="text-[9px] lg:text-[10px] text-stone-400 uppercase font-bold mr-1.5">Points</span>
                                 <span className="text-amber-500 font-bold text-sm lg:text-lg">{playerStats.skillPoints}</span>
                             </div>
                         </div>

                         {/* Sub-Theme Selector & Set Bonus Status Bar */}
                         <div className="absolute top-2 left-20 right-20 sm:left-28 sm:right-28 lg:left-36 lg:right-32 z-30 flex flex-col items-center gap-1 pointer-events-none">
                             {/* Theme Selector Pills */}
                             {currentBranch.themes.length > 1 && (
                                 <div className="flex items-center gap-1 sm:gap-2 bg-black/80 border border-stone-800 p-1 rounded-full backdrop-blur-md shadow-xl pointer-events-auto overflow-x-auto max-w-full">
                                     {currentBranch.themes.map(theme => {
                                         const themeStyle = PASSIVE_THEME_COLORS[theme];
                                         const isSelected = selectedTheme === theme;
                                         const equippedCount = passiveSkills.filter(s => s.theme === theme && equippedSkillIds.includes(s.id)).length;
                                         return (
                                             <button
                                                 key={theme}
                                                 onClick={() => {
                                                     setSelectedTheme(theme);
                                                     setSelectedNodeId(null);
                                                 }}
                                                 className={`
                                                     px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer touch-manipulation
                                                     ${isSelected 
                                                         ? `${themeStyle.bg} ${themeStyle.border} ${themeStyle.text} border shadow-lg scale-105` 
                                                         : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                                                     }
                                                 `}
                                             >
                                                 <span>{themeStyle.icon}</span>
                                                 <span>{theme}</span>
                                                 <span className={`text-[9px] font-mono px-1 rounded ${equippedCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-stone-800 text-stone-500'}`}>
                                                     {equippedCount}
                                                 </span>
                                             </button>
                                         );
                                     })}
                                 </div>
                             )}

                             {/* Set Bonus Progress Strip */}
                             {currentSetBonus ? (
                                 <div className={`px-2.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-mono flex items-center gap-1.5 backdrop-blur-md shadow-md pointer-events-auto ${
                                     isCurrentSetBonusActive 
                                         ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                                         : 'bg-black/60 border-stone-800 text-stone-400'
                                 }`}>
                                     <span>{isCurrentSetBonusActive ? '👑' : '⚡'}</span>
                                     <span className="font-bold">{currentSetBonus.name}:</span>
                                     <span>{isCurrentSetBonusActive ? 'ACTIVO' : `${currentThemeEquippedCount}/${currentSetBonus.requiredCount} equipadas`}</span>
                                     <span className="hidden sm:inline text-stone-400 font-sans text-[9px]">({currentSetBonus.description})</span>
                                 </div>
                             ) : (
                                 <div className="px-2.5 py-0.5 rounded border border-stone-800/60 bg-black/40 text-[9px] font-mono text-stone-500 backdrop-blur-md pointer-events-auto">
                                     <span>🌿 Rama Especializada ({currentThemeEquippedCount} equipadas)</span>
                                 </div>
                             )}
                         </div>

                         {/* The Interactive Canvas */}
                         <div 
                            ref={containerRef}
                            className="w-full h-full relative origin-center canvas-layer"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={() => isDragging.current = false}
                            onPointerLeave={() => isDragging.current = false}
                            onWheel={handleWheel}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={() => isDragging.current = false}
                         >
                             {/* Transform Container */}
                             <div 
                                style={{ 
                                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                    transformOrigin: 'center',
                                    transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                             >
                                 {/* Actual Tree Content Wrapper */}
                                 <div className="relative" style={{ width: TREE_CANVAS_WIDTH, height: 800 }}>
                                    
                                     {/* Background Grid */}
                                     <div className="absolute -inset-[1000px] bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:40px_40px] opacity-10 pointer-events-none"></div>

                                     {/* Connections Layer */}
                                     <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                                          {connections.map((conn: any, i) => (
                                              <path 
                                                key={i} 
                                                d={`M${conn.fromX},${conn.fromY} C${conn.fromX},${conn.fromY + 40} ${conn.toX},${conn.toY - 40} ${conn.toX},${conn.toY}`} 
                                                stroke={conn.isUnlocked ? '#d97706' : '#44403c'} 
                                                strokeWidth={conn.isUnlocked ? 3 : 2}
                                                fill="none" 
                                                strokeDasharray={conn.isUnlocked ? "0" : "5 5"}
                                                className="transition-all duration-500"
                                              />
                                          ))}
                                     </svg>

                                     {/* Nodes Layer */}
                                     {treeNodes.map(node => {
                                          const learned = passiveSkills.find(s => s.id === node.id);
                                          const locked = isNodeLocked(node.id, node.prerequisiteId);
                                          const equipped = equippedSkillIds.includes(node.id);
                                          
                                          return (
                                              <TreeNode 
                                                  key={node.id}
                                                  node={node}
                                                  learnedSkill={learned}
                                                  isActive={equipped}
                                                  isLocked={locked}
                                                  isSelected={selectedNodeId === node.id}
                                                  canAfford={playerStats.skillPoints > 0}
                                                  onClick={() => handleNodeClick(node.id)}
                                              />
                                          );
                                     })}

                                     {/* Tier Labels */}
                                     {[1, 2, 3, 4].map(tier => (
                                          <div 
                                            key={tier} 
                                            className="absolute left-[-20%] right-[-20%] text-stone-700 font-bold uppercase text-[100px] opacity-5 pointer-events-none text-center select-none"
                                            style={{ top: (tier - 1) * TIER_ROW_HEIGHT + 20 }}
                                          >
                                              {tier}
                                          </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            )}

            {/* DETAILS PANEL OVERLAY */}
            {selectedNode && activeTab === 'tree' && (
                <SkillDetailsPanel 
                    skill={selectedNode}
                    learnedSkill={learnedSelected}
                    isEquipped={equippedSkillIds.includes(selectedNode.id)}
                    isLocked={isNodeLocked(selectedNode.id, selectedNode.prerequisiteId)}
                    prerequisiteName={prereqName}
                    playerPoints={playerStats.skillPoints}
                    onInvest={handleInvestPoint}
                    onToggleEquip={handleToggleEquip}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}

            {/* EFFECTS & SETS TAB */}
            {activeTab === 'effects' && (
                <div className="p-4 sm:p-6 overflow-y-auto h-full bg-stone-900 flex flex-col gap-6 custom-scrollbar">
                    
                    {/* SECTION 1: SET BONUSES */}
                    <div>
                        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">👑</span>
                                <h3 className="font-bold text-sm sm:text-base text-amber-400 uppercase tracking-wider">
                                    Bonificaciones de Conjunto (Set Bonuses)
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
                                {playerStats.activeSetBonuses?.length || 0} Activos • {equippedSkillIds.length}/6 Ranuras
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {PASSIVE_SET_BONUSES.map(bonus => {
                                const themeStyle = PASSIVE_THEME_COLORS[bonus.theme];
                                const equippedCount = passiveSkills.filter(s => s.theme === bonus.theme && equippedSkillIds.includes(s.id)).length;
                                const isActive = playerStats.activeSetBonuses?.includes(bonus.theme);
                                const progressPct = Math.min(100, Math.round((equippedCount / bonus.requiredCount) * 100));

                                return (
                                    <div 
                                        key={bonus.theme}
                                        className={`p-3 rounded-lg border transition-all relative overflow-hidden flex flex-col justify-between ${
                                            isActive 
                                                ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50' 
                                                : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-lg">{themeStyle?.icon || '📜'}</span>
                                                    <h4 className={`font-bold text-xs sm:text-sm ${isActive ? 'text-amber-300' : 'text-stone-300'}`}>
                                                        {bonus.name}
                                                    </h4>
                                                </div>
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                                    isActive 
                                                        ? 'bg-amber-500 text-black shadow-sm' 
                                                        : 'bg-stone-800 text-stone-400'
                                                }`}>
                                                    {isActive ? 'ACTIVO' : `${equippedCount}/${bonus.requiredCount}`}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                                                {bonus.description}
                                            </p>
                                        </div>

                                        <div>
                                            {/* Progress Bar */}
                                            <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-stone-800 mb-1.5">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${isActive ? 'bg-amber-400 shadow-[0_0_8px_gold]' : 'bg-stone-600'}`} 
                                                    style={{ width: `${progressPct}%` }}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center text-[9px] font-mono text-stone-500">
                                                <span>Tema: {bonus.theme}</span>
                                                <span>Req: {bonus.requiredCount} equipadas</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: COMPOSITE SYNERGIES */}
                    <div>
                        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">💥</span>
                                <h3 className="font-bold text-sm sm:text-base text-purple-400 uppercase tracking-wider">
                                    Sinergias Compuestas (Composite Synergies)
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
                                {playerStats.activeSynergies?.length || 0} Activas
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {COMPOSITE_SYNERGIES.map(synergy => {
                                const isActive = playerStats.activeSynergies?.includes(synergy.id);
                                const theme1Active = playerStats.activeSetBonuses?.includes(synergy.themes[0]);
                                const theme2Active = playerStats.activeSetBonuses?.includes(synergy.themes[1]);

                                return (
                                    <div 
                                        key={synergy.id}
                                        className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                                            isActive 
                                                ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/50' 
                                                : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h4 className={`font-bold text-xs sm:text-sm ${isActive ? 'text-purple-300' : 'text-stone-300'}`}>
                                                    {synergy.name}
                                                </h4>
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                                    isActive 
                                                        ? 'bg-purple-600 text-white shadow-sm' 
                                                        : 'bg-stone-800 text-stone-500'
                                                }`}>
                                                    {isActive ? 'ACTIVA' : 'INACTIVA'}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                                                {synergy.description}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono">
                                            <span className={theme1Active ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                                                {synergy.themes[0]} {theme1Active ? '✓' : '✗'}
                                            </span>
                                            <span className="text-stone-600">+</span>
                                            <span className={theme2Active ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                                                {synergy.themes[1]} {theme2Active ? '✓' : '✗'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 3: TEMPORARY MAGICAL EFFECTS */}
                    <div>
                        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">✨</span>
                                <h3 className="font-bold text-sm sm:text-base text-blue-400 uppercase tracking-wider">
                                    Efectos Mágicos y Estados ({activeEffects.length})
                                </h3>
                            </div>
                        </div>

                        {activeEffects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-stone-500 bg-black/30 border border-stone-800/50 rounded-lg">
                                <span className="text-3xl mb-1 opacity-50">✨</span>
                                <p className="font-serif italic text-xs">Sin efectos mágicos ni estados temporales activos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {activeEffects.map(effect => (
                                    <div key={effect.id} className={`p-3 rounded-lg border relative overflow-hidden ${effect.isDebuff ? 'bg-red-950/20 border-red-800' : 'bg-blue-950/20 border-blue-800'}`}>
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`text-3xl p-1.5 rounded-lg bg-black/40 border border-white/5 ${effect.isDebuff ? 'grayscale' : ''}`}>{effect.icon}</div>
                                            <div className="flex-grow">
                                                <h4 className={`font-bold text-xs sm:text-sm mb-0.5 ${effect.isDebuff ? 'text-red-400' : 'text-blue-300'}`}>{effect.name}</h4>
                                                <p className="text-stone-400 text-[11px] mb-1.5">{effect.description}</p>
                                                <div className="text-[9px] text-stone-500 text-right font-mono">{effect.duration} Turnos/Batallas</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
      </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(SkillsModal);
