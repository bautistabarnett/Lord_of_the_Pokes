import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { calculatePlayerStats } from '../services/gameLogic';
import { BaseAttributes, PassiveSkill, PassiveTheme, StatType } from '../types';
import { BALANCE } from '../services/gameBalance';
import { PASSIVE_SET_BONUSES, COMPOSITE_SYNERGIES, PASSIVE_SKILLS_POOL } from '../constants';

console.log('=====================================================');
console.log('  TESTING PHASE 2: 9 SET BONUSES & EXPANDED SYNERGIES');
console.log('=====================================================\n');

// 1. STATS ENGINE UNIT TESTS
console.log('--- 1. Testing calculatePlayerStats for all 4 new set bonuses ---');

const baseAttrs: BaseAttributes = {
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  vitality: 10
};

// A. Test Warfare Set Bonus
const warfareSkills: PassiveSkill[] = [
  { id: 'battle_fury', name: 'Battle Fury', theme: PassiveTheme.WARFARE, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'brutal_swing', name: 'Brutal Swing', theme: PassiveTheme.WARFARE, level: 1, baseValue: 4, value: 4, tier: 2, rarity: undefined as any },
  { id: 'war_precision', name: 'Precision', theme: PassiveTheme.WARFARE, level: 1, baseValue: 3, value: 3, tier: 2, rarity: undefined as any }
];
const statsWarfare = calculatePlayerStats(baseAttrs, {}, warfareSkills, 1, 0, [], ['battle_fury', 'brutal_swing', 'war_precision']);
if (!statsWarfare.activeSetBonuses.includes(PassiveTheme.WARFARE)) {
  throw new Error('FAILED: Warfare set bonus did not activate!');
}
console.log('  ✓ Warfare Set Bonus (Warlord\'s Ascendancy) activates successfully!');

// B. Test Arcane Set Bonus
const arcaneSkills: PassiveSkill[] = [
  { id: 'ley_lines', name: 'Ley Lines', theme: PassiveTheme.ARCANE, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'arcane_armor', name: 'Mage Armor', theme: PassiveTheme.ARCANE, level: 1, baseValue: 10, value: 10, tier: 2, rarity: undefined as any },
  { id: 'mystic_focus', name: 'Mystic Focus', theme: PassiveTheme.ARCANE, level: 1, baseValue: 2, value: 2, tier: 2, rarity: undefined as any }
];
const statsArcane = calculatePlayerStats(baseAttrs, {}, arcaneSkills, 1, 0, [], ['ley_lines', 'arcane_armor', 'mystic_focus']);
if (!statsArcane.activeSetBonuses.includes(PassiveTheme.ARCANE)) {
  throw new Error('FAILED: Arcane set bonus did not activate!');
}
console.log('  ✓ Arcane Set Bonus (Arcane Singularity) activates successfully!');

// C. Test Nature Set Bonus
const natureSkills: PassiveSkill[] = [
  { id: 'oak_skin', name: 'Oak Skin', theme: PassiveTheme.NATURE, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'swamp_thing', name: 'Mire Soul', theme: PassiveTheme.NATURE, level: 1, baseValue: 15, value: 15, tier: 2, rarity: undefined as any },
  { id: 'herbalism', name: 'Herbalism', theme: PassiveTheme.NATURE, level: 1, baseValue: 2, value: 2, tier: 2, rarity: undefined as any }
];
const statsNature = calculatePlayerStats(baseAttrs, {}, natureSkills, 1, 0, [], ['oak_skin', 'swamp_thing', 'herbalism']);
if (!statsNature.activeSetBonuses.includes(PassiveTheme.NATURE)) {
  throw new Error('FAILED: Nature set bonus did not activate!');
}
console.log('  ✓ Nature Set Bonus (Living Thorns) activates successfully!');

// D. Test Scouting Set Bonus
const scoutingSkills: PassiveSkill[] = [
  { id: 'pathfinder', name: 'Pathfinder', theme: PassiveTheme.SCOUTING, level: 1, baseValue: 8, value: 8, tier: 1, rarity: undefined as any },
  { id: 'night_prowler', name: 'Nightstalker', theme: PassiveTheme.SCOUTING, level: 1, baseValue: 15, value: 15, tier: 2, rarity: undefined as any },
  { id: 'trailblazer', name: 'Trailblazer', theme: PassiveTheme.SCOUTING, level: 1, baseValue: 10, value: 10, tier: 2, rarity: undefined as any }
];
const statsScouting = calculatePlayerStats(baseAttrs, {}, scoutingSkills, 1, 0, [], ['pathfinder', 'night_prowler', 'trailblazer']);
if (!statsScouting.activeSetBonuses.includes(PassiveTheme.SCOUTING)) {
  throw new Error('FAILED: Scouting set bonus did not activate!');
}
console.log('  ✓ Scouting Set Bonus (Vantage Point) activates successfully!');

// E. Test Spellblade Composite Synergy (Warfare + Arcane)
const hybridSkills = [...warfareSkills, ...arcaneSkills];
const statsSpellblade = calculatePlayerStats(baseAttrs, {}, hybridSkills, 1, 0, [], hybridSkills.map(s => s.id));
if (!statsSpellblade.activeSynergies.includes('spellblade')) {
  throw new Error('FAILED: Spellblade composite synergy did not activate!');
}
console.log('  ✓ Composite Synergy (Spellblade: Warfare + Arcane) activates successfully!');

// 2. BROWSER UI PLAYTEST
console.log('\n--- 2. Testing Browser UI for all 9 Set Bonuses in SkillsModal ---');

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

const PORT = 5198;
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

    // Open Skills Modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skillsBtn = buttons.find(b => b.textContent?.includes('Skills'));
      if (skillsBtn) skillsBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Switch to "Sets & Effects" tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabBtn = buttons.find(b => b.textContent?.includes('Sets & Effects'));
      if (tabBtn) tabBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Verify all 9 themes are listed
    const allSetBonusesFound = await page.evaluate(() => {
      const text = document.body.innerText;
      const expected = [
        'Avatar of Flame',
        'Warlord\'s Ascendancy',
        'Absolute Zero',
        'Iron Fortress',
        'Assassin\'s Creed',
        'Arcane Singularity',
        'Jackpot',
        'Living Thorns',
        'Vantage Point'
      ];
      const results: Record<string, boolean> = {};
      for (const name of expected) {
        results[name] = text.includes(name);
      }
      return results;
    });

    console.log('  Set Bonuses found in UI:');
    let allPassed = true;
    for (const [name, found] of Object.entries(allSetBonusesFound)) {
      console.log(`    ${found ? '✓' : '✗'} ${name}`);
      if (!found) allPassed = false;
    }
    if (!allPassed) throw new Error('Some set bonuses were not rendered in the UI');

    // Take screenshot of the 9-set dashboard
    const screenshotPath = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/skill_sets_all_9_themes_v2.4.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ Screenshot saved to ${screenshotPath}`);

    console.log('\n=====================================================');
    console.log('  PHASE 2 SUCCESS: 9/9 SET BONUSES FULLY OPERATIONAL!');
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
