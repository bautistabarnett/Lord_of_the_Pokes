import React, { useState, useMemo } from 'react';
import { PlayerStats, Monster, MonsterRarity, PassiveSkill } from '../types';
import { BaseModal } from './BaseModal';
import { generateMonster, calculatePlayerStats } from '../services/gameLogic';
import { runSimulation, SIMULATION_PRESETS } from '../services/combatSimulation';
import { PASSIVE_SKILLS_POOL } from '../constants';
import { BALANCE } from '../services/gameBalance';

interface BalanceDashboardProps {
  playerStats: PlayerStats;
  currentLevel: number;
  onClose: () => void;
}

const BalanceDashboard: React.FC<BalanceDashboardProps> = ({ playerStats, currentLevel, onClose }) => {
  const [simLevel, setSimLevel] = useState(currentLevel);
  const [enemyRarity, setEnemyRarity] = useState<MonsterRarity>(MonsterRarity.COMMON);
  const [enemyLevel, setEnemyLevel] = useState(currentLevel);
  const [iterations, setIterations] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Generate a mock player based on level and preset
  const mockPlayer = useMemo(() => {
    // Basic stats for level
    const baseAttrs = {
        strength: 10 + (simLevel * 2),
        dexterity: 10 + (simLevel * 2),
        intelligence: 10 + (simLevel * 2),
        vitality: 10 + (simLevel * 2)
    };
    
    // Apply Preset Skills if selected
    let skills: PassiveSkill[] = [];
    let skillIds: string[] = [];

    if (selectedPreset !== null) {
        const preset = SIMULATION_PRESETS[selectedPreset];
        skillIds = preset.skills;
        skills = preset.skills.map(id => {
            const proto = PASSIVE_SKILLS_POOL.find(s => s.id === id);
            if (!proto) return null;
            return {
                ...proto,
                level: Math.floor(simLevel / 2) + 1,
                value: proto.baseValue + (Math.floor(simLevel/2) * proto.valuePerLevel)
            };
        }).filter(Boolean) as PassiveSkill[];
    } else {
        // Use current player stats if no preset
        return playerStats;
    }

    return calculatePlayerStats(baseAttrs, {}, skills, simLevel, 0, [], skillIds);
  }, [simLevel, selectedPreset, playerStats]);

  const mockMonster = useMemo(() => {
      const m = generateMonster(enemyLevel, 1.0);
      m.rarity = enemyRarity;
      // Re-generate to apply rarity stats properly
      return generateMonster(enemyLevel, 1.0); // Hacky re-gen for now, ideally pass rarity to generator or manually bump
  }, [enemyLevel, enemyRarity]);
  
  // Actually apply rarity modifier manually since generateMonster is random
  const tunedMonster = useMemo(() => {
      const m = { ...mockMonster };
      const config = BALANCE.MONSTER.rarityConfig[enemyRarity];
      m.name = `Test ${enemyRarity} Mob`;
      m.maxHp = Math.floor(m.maxHp * config.statMult);
      m.currentHp = m.maxHp;
      m.damage = Math.floor(m.damage * config.statMult);
      return m;
  }, [mockMonster, enemyRarity]);

  const handleRunSim = () => {
      setIsRunning(true);
      setTimeout(() => {
          // Pass single monster array for now
          const res = runSimulation(mockPlayer, [tunedMonster], iterations);
          setSimResult(res);
          setIsRunning(false);
      }, 100);
  };

  return (
    <BaseModal.Container zIndex="z-[110]" maxWidth="max-w-6xl" className="border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        <BaseModal.Header 
            title="Balance Matrix" 
            subtitle="Combat Simulation & Analytics" 
            icon="📊" 
            textColor="text-cyan-400"
            onClose={onClose} 
        />
        <BaseModal.Body className="bg-stone-950 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Configuration Column */}
            <div className="flex flex-col gap-6 border-r border-stone-800 pr-6">
                <div>
                    <h3 className="text-stone-300 font-bold mb-3 border-b border-stone-800 pb-1">Simulation Parameters</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-stone-500 text-xs uppercase font-bold">Iterations</label>
                            <div className="flex gap-2 mt-1">
                                {[10, 100, 1000].map(n => (
                                    <button 
                                        key={n}
                                        onClick={() => setIterations(n)}
                                        className={`px-3 py-1 text-xs font-mono border rounded ${iterations === n ? 'bg-cyan-900 border-cyan-500 text-cyan-200' : 'bg-stone-900 border-stone-700 text-stone-500'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-stone-500 text-xs uppercase font-bold">Player Level: {simLevel}</label>
                            <input 
                                type="range" min="1" max="50" 
                                value={simLevel} 
                                onChange={(e) => setSimLevel(parseInt(e.target.value))}
                                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>

                        <div>
                            <label className="text-stone-500 text-xs uppercase font-bold block mb-2">Build Preset</label>
                            <select 
                                className="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-2 rounded"
                                onChange={(e) => setSelectedPreset(e.target.value === "" ? null : parseInt(e.target.value))}
                            >
                                <option value="">Current Hero State</option>
                                {SIMULATION_PRESETS.map((p, i) => (
                                    <option key={i} value={i}>{p.name}</option>
                                ))}
                            </select>
                            {selectedPreset !== null && (
                                <div className="mt-2 text-[10px] text-stone-500">
                                    Skills: {SIMULATION_PRESETS[selectedPreset].skills.join(", ")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-stone-300 font-bold mb-3 border-b border-stone-800 pb-1">Enemy Config</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-stone-500 text-xs uppercase font-bold">Rarity</label>
                            <select 
                                className="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-2 rounded mt-1"
                                value={enemyRarity}
                                onChange={(e) => setEnemyRarity(e.target.value as MonsterRarity)}
                            >
                                {Object.values(MonsterRarity).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-stone-500 text-xs uppercase font-bold">Enemy Level: {enemyLevel}</label>
                            <input 
                                type="range" min="1" max="60" 
                                value={enemyLevel} 
                                onChange={(e) => setEnemyLevel(parseInt(e.target.value))}
                                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleRunSim}
                    disabled={isRunning}
                    className="mt-auto py-4 bg-cyan-900 hover:bg-cyan-800 border border-cyan-600 text-cyan-100 font-bold uppercase tracking-widest shadow-lg transition-all"
                >
                    {isRunning ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>

            {/* Stats Comparison */}
            <div className="flex flex-col gap-4">
                <h3 className="text-stone-300 font-bold border-b border-stone-800 pb-1">Matchup Preview</h3>
                
                <div className="bg-black/30 p-4 rounded border border-stone-800">
                    <h4 className="text-stone-500 uppercase text-xs font-bold mb-2">Player Stats</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono text-stone-300">
                        <div>HP: <span className="text-green-400">{mockPlayer.maxHp}</span></div>
                        <div>DMG: <span className="text-red-400">{mockPlayer.damage}</span></div>
                        <div>ARM: <span className="text-stone-400">{mockPlayer.armor}</span></div>
                        <div>CRIT: <span className="text-yellow-400">{mockPlayer.critChance}%</span></div>
                    </div>
                </div>

                <div className="flex justify-center text-stone-600 font-bold text-xl">VS</div>

                <div className="bg-black/30 p-4 rounded border border-red-900/30">
                    <h4 className="text-red-500 uppercase text-xs font-bold mb-2">{tunedMonster.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono text-stone-300">
                        <div>HP: <span className="text-green-400">{tunedMonster.maxHp}</span></div>
                        <div>DMG: <span className="text-red-400">{tunedMonster.damage}</span></div>
                        <div>ARM: <span className="text-stone-400">{tunedMonster.armor}</span></div>
                        <div>CRIT: <span className="text-yellow-400">{tunedMonster.critChance}%</span></div>
                    </div>
                </div>
            </div>

            {/* Results Column */}
            <div className="bg-[#0c0a09] border border-stone-800 rounded p-4 relative overflow-hidden">
                {!simResult ? (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-600 italic">
                        No simulation data.
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-500">
                        <div className="text-center mb-6">
                            <div className="text-xs text-stone-500 uppercase tracking-widest mb-1">Win Rate</div>
                            <div className={`text-5xl font-bold ${simResult.summary.winRate > 80 ? 'text-green-500' : simResult.summary.winRate < 40 ? 'text-red-500' : 'text-yellow-500'}`}>
                                {simResult.summary.winRate.toFixed(1)}%
                            </div>
                            <div className="mt-2 inline-block px-3 py-1 rounded bg-stone-800 border border-stone-600 text-xs font-bold uppercase">
                                Verdict: {simResult.summary.rating}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-stone-900/50 p-3 rounded">
                                <div className="text-[10px] text-stone-500 uppercase">Avg Turns</div>
                                <div className="text-xl text-stone-200 font-mono">{simResult.summary.avgTurns}</div>
                            </div>
                            <div className="bg-stone-900/50 p-3 rounded">
                                <div className="text-[10px] text-stone-500 uppercase">Avg HP Rem.</div>
                                <div className="text-xl text-stone-200 font-mono">{simResult.summary.avgHpRemaining}</div>
                            </div>
                            <div className="bg-stone-900/50 p-3 rounded">
                                <div className="text-[10px] text-stone-500 uppercase">Avg Dmg Dealt</div>
                                <div className="text-xl text-amber-500 font-mono">{simResult.summary.avgDmgDealt}</div>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <div className="text-xs text-stone-500 mb-1 font-bold">Tuning Suggestions:</div>
                            <div className="text-xs text-stone-400 italic">
                                {simResult.summary.winRate > 95 
                                    ? "Build is too dominant. Consider reducing scaling values or increasing cooldowns." 
                                    : simResult.summary.winRate < 20 
                                        ? "Build is unviable. Buff base damage or survivability." 
                                        : "Performance is within expected parameters."}
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(BalanceDashboard);