import { Monster, PlayerStats, CombatStatusEffect, PassiveSkill, CombatStance, CombatTrigger } from '../types';
import { PASSIVE_SET_BONUSES, PASSIVE_SKILLS_POOL, COMPOSITE_SYNERGIES } from '../constants';
import { BALANCE } from './gameBalance';

interface SimulationResult {
    win: boolean;
    turns: number;
    finalPlayerHp: number;
    finalEnemyHp: number;
    damageDealt: number;
    damageTaken: number;
    log: string[];
}

export const SIMULATION_PRESETS = [
    {
        name: "Pyromancer (Glass Cannon)",
        theme: "Pyromancy",
        skills: ["magma_veins", "burning_rage", "inferno_touch", "forest_fire"]
    },
    {
        name: "Sentinel (Tank)",
        theme: "Sentinel",
        skills: ["iron_skin", "unyielding", "thorns_aura", "titans_gaze"]
    },
    {
        name: "Shadow Assassin (Crit/DoT)",
        theme: "Shadow",
        skills: ["venom_coating", "shadow_step", "void_hunger", "blood_rite"]
    },
    {
        name: "Cryomancer (Control)",
        theme: "Cryomancy",
        skills: ["glacial_ward", "crystalline_mind", "shatter_point", "static_discharge"]
    }
];

// Helper to clone stats to avoid mutating the actual game state during sim
const cloneStats = (stats: PlayerStats): PlayerStats => JSON.parse(JSON.stringify(stats));
const cloneMonster = (monster: Monster): Monster => JSON.parse(JSON.stringify(monster));

export const runSimulation = (
    baseStats: PlayerStats, 
    baseMonsters: Monster | Monster[], 
    iterations: number = 100
): { summary: any, results: SimulationResult[] } => {
    
    const results: SimulationResult[] = [];
    // Normalize to array
    const monstersInput = Array.isArray(baseMonsters) ? baseMonsters : [baseMonsters];

    for (let i = 0; i < iterations; i++) {
        results.push(simulateSingleBattle(cloneStats(baseStats), monstersInput.map(m => cloneMonster(m))));
    }

    // Aggregate Data
    const wins = results.filter(r => r.win).length;
    const avgTurns = results.reduce((acc, r) => acc + r.turns, 0) / iterations;
    const avgDmgDealt = results.reduce((acc, r) => acc + r.damageDealt, 0) / iterations;
    const avgHpRemaining = results.reduce((acc, r) => acc + (r.win ? r.finalPlayerHp : 0), 0) / Math.max(1, wins);

    return {
        summary: {
            winRate: (wins / iterations) * 100,
            avgTurns: avgTurns.toFixed(1),
            avgDmgDealt: Math.floor(avgDmgDealt),
            avgHpRemaining: Math.floor(avgHpRemaining),
            rating: calculateBalanceRating((wins / iterations) * 100, avgTurns)
        },
        results
    };
};

const calculateBalanceRating = (winRate: number, avgTurns: number): string => {
    if (winRate < 10) return "Impossible (Buff Required)";
    if (winRate < 40) return "Hard / Unfair";
    if (winRate > 95 && avgTurns < 3) return "Broken OP (Nerf Required)";
    if (winRate > 90) return "Very Easy";
    return "Balanced";
};

// The Core Logic - simplified simulation of useCombatEngine
const simulateSingleBattle = (player: PlayerStats, monsters: Monster[]): SimulationResult => {
    let playerHp = player.maxHp;
    
    // Total enemy HP for tracking progress
    let initialTotalHp = monsters.reduce((sum, m) => sum + m.maxHp, 0);
    
    let turn = 0;
    let damageDealt = 0;
    let damageTaken = 0;
    let effects: CombatStatusEffect[] = [];
    let skillCooldowns: Record<string, number> = {};
    const log: string[] = [];

    // Avg Enemy Dex
    const avgDex = monsters.reduce((sum, m) => sum + m.dexterity, 0) / monsters.length;

    // Helper for Turn Queue
    const { playerAttacks, enemyAttacks } = BALANCE.COMBAT.calculateTurns(player.dexterity, avgDex);
    const queueSequence = [];
    for(let i=0; i<playerAttacks; i++) queueSequence.push('player');
    for(let i=0; i<enemyAttacks; i++) queueSequence.push('enemy');
    
    let queueIndex = 0;

    // --- HELPER FUNCTIONS ---
    
    const addEffect = (newEff: CombatStatusEffect) => {
        // Simplified effect stacking logic for simulation
        const existing = effects.find(e => e.type === newEff.type && e.target === newEff.target && e.name === newEff.name);
        if (existing) {
            existing.duration = newEff.duration;
            if (['stun', 'freeze', 'shield'].includes(newEff.type)) existing.stacks = 1;
            else if (newEff.type === 'scaling_strength') existing.value += newEff.value;
            else existing.stacks++;
        } else {
            effects.push(newEff);
        }
    };

    const processTriggers = (trigger: CombatTrigger, actor: 'player' | 'enemy', dmgVal: number = 0, targetIndex: number = 0): number => {
        let triggerDmg = 0;
        const targetMonster = monsters[targetIndex];

        if (actor === 'player') {
            // Skill Procs
            const skills = PASSIVE_SKILLS_POOL.filter(s => player.equippedSkillIds.includes(s.id));
            skills.forEach(skill => {
                if (skill.proc && skill.proc.trigger === trigger) {
                    if ((skillCooldowns[skill.id] || 0) > 0) return;
                    if (Math.random() > skill.proc.chance) return;
                    
                    // Conditions (Simplified)
                    if (skill.proc.conditions) {
                        const fail = skill.proc.conditions.some(c => {
                             if (c.type === 'hp_below') return (playerHp/player.maxHp) >= Number(c.value);
                             if (c.type === 'turn_count_multiple') return (turn % Number(c.value)) !== 0;
                             return false; 
                        });
                        if (fail) return;
                    }

                    // Cost
                    if (skill.proc.cost) {
                        const cost = skill.proc.cost.type === 'hp_percent' ? player.maxHp * skill.proc.cost.value : skill.proc.cost.value;
                        if (playerHp > cost) playerHp -= cost;
                        else return;
                    }

                    // Effect
                    const eff = skill.proc.effect;
                    if (eff.type === 'damage_phys' || eff.type === 'damage_magic') {
                        const d = Math.floor(player.damage * eff.value);
                        if(targetMonster) targetMonster.currentHp -= d;
                        triggerDmg += d;
                    } else if (eff.type === 'multi_hit') {
                        const d = Math.floor(dmgVal * eff.value);
                        if(targetMonster) targetMonster.currentHp -= d;
                        triggerDmg += d;
                    } else if (eff.type === 'heal') {
                        playerHp = Math.min(player.maxHp, playerHp + (player.maxHp * eff.value));
                    } else if (eff.type === 'cleanse') {
                        effects = effects.filter(e => e.target !== 'player' || !['burn','poison','freeze','blind','chill','stun'].includes(e.type));
                    } else if (eff.type === 'shield') {
                        addEffect({ id: 'sim', type: 'shield', name: skill.name, duration: eff.duration||1, value: eff.value, stacks: 1, source: 'skill', target: 'player' });
                    } else if (eff.type === 'buff' || eff.type === 'debuff') {
                         addEffect({ 
                             id: 'sim', 
                             type: (eff.subType || 'buff') as any, 
                             name: skill.name, 
                             duration: eff.duration||3, 
                             value: eff.value, 
                             stacks: 1, 
                             source: 'skill', 
                             target: eff.type === 'debuff' ? 'enemy' : 'player' 
                         });
                    }

                    if (skill.proc.cooldown) skillCooldowns[skill.id] = skill.proc.cooldown;
                }
            });
        } 
        
        return triggerDmg;
    };

    // --- MAIN LOOP ---

    while (playerHp > 0 && monsters.some(m => m.currentHp > 0) && turn < 100) {
        const actor = queueSequence[queueIndex];
        
        // Cooldowns tick
        if (actor === 'player') {
            turn++;
            Object.keys(skillCooldowns).forEach(k => { if(skillCooldowns[k] > 0) skillCooldowns[k]--; });
        }

        // CC Check
        const isStunned = effects.some(e => e.target === actor && (e.type === 'stun' || e.type === 'freeze'));
        
        if (!isStunned) {
            
            // DoTs
            if (actor === 'player') {
                 // Player takes DoT
            }

            if (playerHp <= 0 || !monsters.some(m => m.currentHp > 0)) break;

            if (actor === 'player') {
                // PLAYER ACTION
                const targetIdx = monsters.findIndex(m => m.currentHp > 0);
                const target = monsters[targetIdx];

                if (!target) break;

                let rawDmg = player.damage;
                
                // Buffs
                const scaling = effects.find(e => e.target === 'player' && e.type === 'scaling_strength');
                if (scaling) rawDmg += scaling.value;

                // Crits
                let critChance = player.critChance;
                const critBoost = effects.find(e => e.target === 'player' && e.type === 'crit_boost');
                if (critBoost) critChance += critBoost.value;

                const isCrit = Math.random() * 100 < critChance;
                if (isCrit) rawDmg *= BALANCE.COMBAT.critMultiplier;

                // Asymptotic monster armor mitigation
                const monsterMitigation = BALANCE.COMBAT.calculateMitigationPercent(target.armor, target.level);
                const finalDmg = Math.max(1, Math.floor(rawDmg * (1 - monsterMitigation)));
                target.currentHp -= finalDmg;
                damageDealt += finalDmg;

                // On Hit Triggers
                if (finalDmg > 0) {
                    const extra = processTriggers('onHit', 'player', finalDmg, targetIdx);
                    // extra damage applied in trigger function to target
                    if (isCrit) processTriggers('onCrit', 'player', finalDmg, targetIdx);
                    
                    // Lifesteal
                    if (player.lifeSteal > 0) {
                        playerHp = Math.min(player.maxHp, playerHp + (finalDmg * (player.lifeSteal/100)));
                    }
                }

            } else {
                // ENEMY ACTION - All living enemies attack
                monsters.forEach(m => {
                    if (m.currentHp <= 0) return;
                    
                    let dmg = m.damage;
                    if (Math.random() * 100 < m.critChance) dmg *= BALANCE.COMBAT.critMultiplier;
                    
                    let dodgeChance = player.dodgeChance;
                    const dodgeBoost = effects.find(e => e.target === 'player' && e.type === 'dodge_boost');
                    if (dodgeBoost) dodgeChance += dodgeBoost.value;

                    if (Math.random() * 100 < dodgeChance) {
                        // Dodged
                    } else {
                        // Asymptotic player armor mitigation
                        const playerMitigation = BALANCE.COMBAT.calculateMitigationPercent(player.armor, player.level);
                        const finalDmg = Math.max(1, Math.floor(dmg * (1 - playerMitigation)));
                        playerHp -= finalDmg;
                        damageTaken += finalDmg;

                        if (finalDmg > 0) {
                            processTriggers('onTakeDamage', 'player', finalDmg);
                        }
                    }
                });
            }
        }

        queueIndex = (queueIndex + 1) % queueSequence.length;
    }
    
    // Calculate final enemy HP sum
    const currentTotalHp = monsters.reduce((sum, m) => sum + Math.max(0, m.currentHp), 0);

    return {
        win: playerHp > 0,
        turns: turn,
        finalPlayerHp: Math.max(0, playerHp),
        finalEnemyHp: currentTotalHp,
        damageDealt,
        damageTaken,
        log
    };
};