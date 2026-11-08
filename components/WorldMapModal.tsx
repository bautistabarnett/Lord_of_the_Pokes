
import React, { useMemo } from 'react';
import { MapNode } from '../types';
import GameIcon from './GameIcon';
import { BaseModal } from './BaseModal';

interface WorldMapModalProps {
  nodes: MapNode[];
  currentNodeId: string;
  areaProgress: number; // 0-100
  onTravel: (nodeId: string) => void;
  onClose: () => void;
}

const WorldMapModal: React.FC<WorldMapModalProps> = ({ 
  nodes, 
  currentNodeId, 
  areaProgress, 
  onTravel, 
  onClose 
}) => {
  
  const getNode = (id: string) => nodes.find(n => n.id === id);

  const connectionLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const processedConnections = new Set<string>();

    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (!target) return;

        const key = [node.id, targetId].sort().join('-');
        if (processedConnections.has(key)) return;
        processedConnections.add(key);

        const isPathUnlocked = node.isUnlocked && target.isUnlocked;
        
        lines.push(
          <line 
            key={key}
            x1={`${node.coordinates.x}%`} 
            y1={`${node.coordinates.y}%`} 
            x2={`${target.coordinates.x}%`} 
            y2={`${target.coordinates.y}%`} 
            stroke={isPathUnlocked ? "#d97706" : "#44403c"} 
            strokeWidth="2"
            strokeDasharray={isPathUnlocked ? "0" : "5 5"}
            className="transition-all duration-500"
          />
        );
      });
    });
    return lines;
  }, [nodes]);

  const currentNode = getNode(currentNodeId);

  return (
    <BaseModal.Container zIndex="z-[70]" maxWidth="max-w-5xl" className="h-[94dvh] lg:h-[80vh]">
        <BaseModal.Header 
            title="World Map" 
            onClose={onClose} 
            textColor="text-amber-500"
        />

        {/* Map Container - Scrollable on Mobile */}
        <BaseModal.Body noPadding className="bg-stone-950">
           {/* Inner Container - Fixed min-size to ensure map logic works and is scrollable if screen small */}
           <div className="relative w-full h-full min-w-[520px] min-h-[220px] bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
              {/* Background SVG for Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {connectionLines}
              </svg>

              {/* Nodes */}
              {nodes.map(node => {
                const isCurrent = node.id === currentNodeId;
                const isLocked = !node.isUnlocked;
                
                return (
                  <div 
                    key={node.id}
                    className={`
                      absolute w-10 h-10 lg:w-16 lg:h-16 -ml-5 -mt-5 lg:-ml-8 lg:-mt-8 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300
                      ${isCurrent 
                        ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] bg-amber-950' 
                        : isLocked 
                          ? 'border-stone-700 bg-stone-900/80 grayscale opacity-60 cursor-not-allowed' 
                          : node.isCleared
                            ? 'border-green-600 bg-green-950/50 hover:scale-110 cursor-pointer'
                            : 'border-stone-500 bg-stone-800 hover:border-amber-300 hover:scale-110 cursor-pointer'
                      }
                    `}
                    style={{ left: `${node.coordinates.x}%`, top: `${node.coordinates.y}%` }}
                    onClick={() => !isLocked && onTravel(node.id)}
                  >
                    <GameIcon 
                      name={node.icon} 
                      className={`
                        w-6 h-6 lg:w-10 lg:h-10 
                        ${isCurrent ? 'text-amber-500' : isLocked ? 'text-stone-600' : node.isCleared ? 'text-green-500' : 'text-stone-400'}
                      `} 
                    />
                    
                    {/* Label */}
                    <div className={`
                      absolute top-full mt-0.5 lg:mt-2 whitespace-nowrap text-[9px] lg:text-xs font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded bg-black/80 border border-stone-700 z-20
                      ${isCurrent ? 'text-amber-500' : 'text-stone-400'}
                    `}>
                      {node.name}
                    </div>
                    
                    {/* Terrain Badge */}
                    {!isLocked && (
                         <div className="absolute -bottom-1.5 right-0 bg-stone-800 text-[7px] lg:text-[8px] uppercase px-1 rounded border border-stone-600 text-stone-300 z-10">
                             {node.terrain.substring(0,3)}
                         </div>
                    )}

                    {/* Cleared Checkmark */}
                    {node.isCleared && (
                      <div className="absolute -top-1 -right-1 bg-green-900 text-green-400 rounded-full w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center text-[9px] lg:text-[10px] border border-green-700">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </BaseModal.Body>

        <BaseModal.Footer className="bg-stone-900 border-t border-stone-700 flex flex-row justify-between items-center gap-3 py-2 lg:py-4">
          {currentNode ? (
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm lg:text-xl text-stone-200 font-bold diablo-font flex items-center gap-2 truncate">
                        {currentNode.name}
                        {currentNode.isCleared && <span className="text-[9px] lg:text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded border border-green-700 shrink-0">CLEARED</span>}
                    </h3>
                    <p className="text-stone-500 italic text-[11px] lg:text-sm mb-1 lg:mb-2 truncate">{currentNode.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                      <div className="text-[10px] lg:text-xs text-amber-500 font-bold uppercase tracking-wider">{currentNode.terrain}</div>
                  </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full max-w-md bg-stone-950 h-2.5 lg:h-4 rounded border border-stone-700 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-900 to-amber-600 transition-all duration-500"
                  style={{ width: `${areaProgress}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-[8px] lg:text-[10px] text-white font-bold tracking-widest shadow-black drop-shadow-md">
                  MASTERY: {Math.floor(areaProgress)}%
                </div>
              </div>
              {areaProgress >= 100 && !currentNode.isCleared && (
                 <p className="text-red-500 text-[9px] lg:text-[10px] mt-0.5 font-bold animate-pulse">⚠️ BOSS REVEALED! DEFEAT TO UNLOCK.</p>
              )}
            </div>
          ) : (
            <div>Select an area...</div>
          )}

          <div className="text-right text-[9px] lg:text-[10px] text-stone-500 space-y-0.5 shrink-0 hidden sm:block">
             <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 bg-amber-950 border border-amber-500 rounded-full"></div> Current</div>
             <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 bg-green-950 border border-green-600 rounded-full"></div> Cleared</div>
             <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 bg-stone-800 border border-stone-500 rounded-full"></div> Unlocked</div>
             <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 bg-stone-900 border border-stone-700 rounded-full opacity-50"></div> Locked</div>
          </div>
        </BaseModal.Footer>
    </BaseModal.Container>
  );
};

export default React.memo(WorldMapModal);
