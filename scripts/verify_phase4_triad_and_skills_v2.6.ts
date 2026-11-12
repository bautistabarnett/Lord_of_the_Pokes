import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { calculatePlayerStats } from '../services/gameLogic';
import { BaseAttributes, PassiveSkill, PassiveTheme } from '../types';
import { COMPOSITE_SYNERGIES, PASSIVE_SKILLS_POOL } from '../constants';

console.log('=====================================================');
console.log('  TESTING PHASE 4: MARTIAL TRIAD & SKILLS INTEGRATION');
console.log('=====================================================\n');

const baseAttrs: BaseAttributes = { strength: 10, dexterity: 10, intelligence: 10, vitality: 10 };

// ---------------------------------------------------------------------------
// 1. STATS ENGINE UNIT TESTS FOR MARTIAL TRIAD AFFINITIES
// ---------------------------------------------------------------------------
console.log('--- 1. Testing calculatePlayerStats for Martial Triad Modifiers ---');

// A. Test Warfare: 3 skills -> 3*4 + 15 = 27% Clash Win DMG Bonus
const warfareSkills: PassiveSkill[] = [
  { id: 'battle_fury', name: 'Battle Fury', theme: PassiveTheme.WARFARE, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'brutal_swing', name: 'Brutal Swing', theme: PassiveTheme.WARFARE, level: 1, baseValue: 4, value: 4, tier: 2, rarity: undefined as any },
  { id: 'war_precision', name: 'Precision', theme: PassiveTheme.WARFARE, level: 1, baseValue: 3, value: 3, tier: 2, rarity: undefined as any }
];
const statsWarfare = calculatePlayerStats(baseAttrs, {}, warfareSkills, 1, 0, [], warfareSkills.map(s => s.id));
console.log(`  Warfare Clash Win DMG Bonus: +${statsWarfare.clashWinDamageBonus}%`);
if (statsWarfare.clashWinDamageBonus !== 27) {
  throw new Error(`FAILED: Expected 27% Clash Win DMG Bonus, got ${statsWarfare.clashWinDamageBonus}%`);
}
console.log('  ✓ Warfare (Voluntad) correctly grants +27% Clash Win DMG with 3 skills + Set Bonus!');

// B. Test Sentinel: 3 skills -> 3*3 + 10 = 19% Defend Mitig Bonus & 19% Parry Bonus
const sentinelSkills: PassiveSkill[] = [
  { id: 'unyielding', name: 'Unyielding', theme: PassiveTheme.SENTINEL, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'iron_skin', name: 'Iron Skin', theme: PassiveTheme.SENTINEL, level: 1, baseValue: 20, value: 20, tier: 2, rarity: undefined as any },
  { id: 'deflection', name: 'Deflection', theme: PassiveTheme.SENTINEL, level: 1, baseValue: 3, value: 3, tier: 2, rarity: undefined as any }
];
const statsSentinel = calculatePlayerStats(baseAttrs, {}, sentinelSkills, 1, 0, [], sentinelSkills.map(s => s.id));
console.log(`  Sentinel Defend Mitigation Bonus: +${statsSentinel.clashDefendMitigationBonus}% | Parry Bonus: +${statsSentinel.parryChanceBonus}%`);
if (statsSentinel.clashDefendMitigationBonus !== 19 || statsSentinel.parryChanceBonus !== 19) {
  throw new Error(`FAILED: Expected 19% Defend Mitig & 19% Parry, got ${statsSentinel.clashDefendMitigationBonus}% / ${statsSentinel.parryChanceBonus}%`);
}
console.log('  ✓ Sentinel (Temple) correctly grants +19% Defend Mitigation & +19% Parry Bonus!');

// C. Test Shadow: 3 skills -> 3*4 + 12 = 24% Feint Chance Bonus
const shadowSkills: PassiveSkill[] = [
  { id: 'shadow_step', name: 'Shadow Step', theme: PassiveTheme.SHADOW, level: 1, baseValue: 5, value: 5, tier: 1, rarity: undefined as any },
  { id: 'venom_coating', name: 'Venom Coating', theme: PassiveTheme.SHADOW, level: 1, baseValue: 3, value: 3, tier: 2, rarity: undefined as any },
  { id: 'assassins_eye', name: 'Assassin\'s Eye', theme: PassiveTheme.SHADOW, level: 1, baseValue: 3, value: 3, tier: 2, rarity: undefined as any }
];
const statsShadow = calculatePlayerStats(baseAttrs, {}, shadowSkills, 1, 0, [], shadowSkills.map(s => s.id));
console.log(`  Shadow Feint Chance Bonus: +${statsShadow.feintChanceBonus}%`);
if (statsShadow.feintChanceBonus !== 24) {
  throw new Error(`FAILED: Expected 24% Feint Chance Bonus, got ${statsShadow.feintChanceBonus}%`);
}
console.log('  ✓ Shadow (Finta) correctly grants +24% Feint Chance with 3 skills + Set Bonus!');

// D. Test Arcane: 3 skills -> 3*150 + 250 = 700ms Action Timer Bonus
const arcaneSkills: PassiveSkill[] = [
  { id: 'ley_lines', name: 'Ley Lines', theme: PassiveTheme.ARCANE, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'arcane_armor', name: 'Mage Armor', theme: PassiveTheme.ARCANE, level: 1, baseValue: 10, value: 10, tier: 2, rarity: undefined as any },
  { id: 'mystic_focus', name: 'Mystic Focus', theme: PassiveTheme.ARCANE, level: 1, baseValue: 2, value: 2, tier: 2, rarity: undefined as any }
];
const statsArcane = calculatePlayerStats(baseAttrs, {}, arcaneSkills, 1, 0, [], arcaneSkills.map(s => s.id));
console.log(`  Arcane Action Timer Bonus: +${statsArcane.actionTimerBonusMs}ms`);
if (statsArcane.actionTimerBonusMs !== 700) {
  throw new Error(`FAILED: Expected 700ms Action Timer Bonus, got ${statsArcane.actionTimerBonusMs}ms`);
}
console.log('  ✓ Arcane (Percepción Táctica) correctly grants +700ms Action Timer with 3 skills + Set Bonus!');

// E. Test Spellblade Composite Synergy (2 Warfare + 2 Arcane)
const spellbladeSkills = [warfareSkills[0], warfareSkills[1], arcaneSkills[0], arcaneSkills[1]];
const statsSpellblade = calculatePlayerStats(baseAttrs, {}, spellbladeSkills, 1, 0, [], spellbladeSkills.map(s => s.id));
console.log(`  Spellblade Clash Win Bonus: +${statsSpellblade.clashWinDamageBonus}% | Action Timer: +${statsSpellblade.actionTimerBonusMs}ms`);
// 2*4 + 10 = 18% Clash Win, 2*150 + 250 = 550ms
if (statsSpellblade.clashWinDamageBonus !== 18 || statsSpellblade.actionTimerBonusMs !== 550) {
  throw new Error(`FAILED: Expected 18% Clash Win & 550ms Timer, got ${statsSpellblade.clashWinDamageBonus}% / ${statsSpellblade.actionTimerBonusMs}ms`);
}
console.log('  ✓ Composite Synergy (Spellblade) correctly scales Triad Clash DMG & Action Timer!');

// ---------------------------------------------------------------------------
// 2. BROWSER UI VERIFICATION (Puppeteer)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing Browser UI for Triad Stats in Character Sheet & Modals ---');

const __filename_curr = fileURLToPath(import.meta.url);
const __dirname_curr = path.dirname(__filename_curr);
const rootDir = path.resolve(__dirname_curr, '..');
const distDir = path.join(rootDir, 'dist');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url?.split('?')[0] || '/';
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404); res.end('Not Found');
  }
});

const PORT = 5205;
server.listen(PORT, '127.0.0.1', async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', `--proxy-server=http://127.0.0.1:36277`]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, isMobile: true });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });

    // Select Slot 1
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const slotDiv = divs.find(d => d.innerText && d.innerText.includes('Slot 1') && d.className.includes('cursor-pointer'));
      if (slotDiv) slotDiv.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Start Adventure
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Adventure') || b.innerText.includes('Load Game'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Check CenterStatsDashboard for Choque Tríada and Reacción Rápida
    const triadDashboardCheck = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasChoqueTriada: text.includes('choque tríada') || text.includes('choque triada'),
        hasReaccionRapida: text.includes('reacción rápida') || text.includes('reaccion rapida'),
        hasVersion26: text.includes('v2.6')
      };
    });

    console.log('  Dashboard Verification:');
    console.log(`    Choque Tríada card displayed: ${triadDashboardCheck.hasChoqueTriada ? '✓' : '✗'}`);
    console.log(`    Reacción Rápida card displayed: ${triadDashboardCheck.hasReaccionRapida ? '✓' : '✗'}`);
    console.log(`    Game Version v2.6 displayed: ${triadDashboardCheck.hasVersion26 ? '✓' : '✗'}`);

    if (!triadDashboardCheck.hasChoqueTriada || !triadDashboardCheck.hasReaccionRapida) {
      throw new Error('FAILED: Triad cards were not found in the CenterStatsDashboard!');
    }

    // Scroll Combat Statistics in CenterStatsDashboard into view
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const combatH = headings.find(h => h.textContent?.includes('Combat Statistics'));
      if (combatH) {
        combatH.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Take screenshot of the character sheet showing Triad combat cards
    const screenshotPath = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/triad_skills_integration_v2.6.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ Screenshot saved to ${screenshotPath}`);

    console.log('\n=====================================================');
    console.log('  PHASE 4 SUCCESS: MARTIAL TRIAD FULLY INTEGRATED!');
    console.log('=====================================================\n');

    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err);
    server.close();
    process.exit(1);
  }
});
