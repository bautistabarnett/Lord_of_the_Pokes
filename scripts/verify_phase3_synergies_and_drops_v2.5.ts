import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { calculatePlayerStats, generatePassiveSkill } from '../services/gameLogic';
import { BaseAttributes, PassiveSkill, PassiveTheme, Rarity } from '../types';
import { COMPOSITE_SYNERGIES, PASSIVE_SKILLS_POOL } from '../constants';

console.log('=====================================================');
console.log('  TESTING PHASE 3: FLEXIBLE SYNERGIES & DROP SHIELD');
console.log('=====================================================\n');

// ---------------------------------------------------------------------------
// 1. DROP PROGRESSION & PREREQUISITE SHIELD TESTS
// ---------------------------------------------------------------------------
console.log('--- 1. Testing generatePassiveSkill Prerequisite Hardening ---');

// Test A: Empty passives -> drops must never require prerequisites
for (let i = 0; i < 100; i++) {
  const result = generatePassiveSkill([]);
  if (result.skill.prerequisiteId) {
    throw new Error(`FAILED: generatePassiveSkill dropped skill '${result.skill.name}' (${result.skill.id}) with unlearned prerequisite '${result.skill.prerequisiteId}'!`);
  }
}
console.log('  ✓ 100/100 drops with empty inventory strictly respect root prerequisites!');

// Test B: Learning a tier 1 prerequisite unlocks tier 2, but not tier 3
const rootSkill = PASSIVE_SKILLS_POOL.find(s => s.id === 'battle_fury')!;
const tier2Skill = PASSIVE_SKILLS_POOL.find(s => s.prerequisiteId === 'battle_fury')!;
const tier3Skill = PASSIVE_SKILLS_POOL.find(s => s.prerequisiteId === tier2Skill.id)!;

if (tier3Skill) {
  for (let i = 0; i < 50; i++) {
    const result = generatePassiveSkill([{ ...rootSkill, level: 1, value: rootSkill.baseValue }], { theme: PassiveTheme.WARFARE });
    if (result.skill.id === tier3Skill.id) {
      throw new Error(`FAILED: Dropped tier 3 skill '${tier3Skill.name}' when player only had tier 1 root!`);
    }
  }
  console.log(`  ✓ Tier 3 capstone '${tier3Skill.name}' is strictly blocked when tier 2 is missing.`);
}

// ---------------------------------------------------------------------------
// 2. MAX RANK HARDENING TESTS
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing generatePassiveSkill MaxRank Protection ---');

const maxRankSkill: PassiveSkill = {
  ...rootSkill,
  level: rootSkill.maxRank || 10,
  maxRank: rootSkill.maxRank || 10,
  value: rootSkill.baseValue + ((rootSkill.maxRank || 10) - 1) * rootSkill.valuePerLevel
};

// Given all warfare skills maxed except one
const allWarfareSkills = PASSIVE_SKILLS_POOL.filter(s => s.theme === PassiveTheme.WARFARE);
const maxedWarfareList: PassiveSkill[] = allWarfareSkills.map(s => ({
  ...s,
  level: s.maxRank || 10,
  value: s.baseValue + ((s.maxRank || 10) - 1) * s.valuePerLevel
}));

const resultMaxed = generatePassiveSkill(maxedWarfareList, { theme: PassiveTheme.WARFARE });
if (resultMaxed.skill.level > (resultMaxed.skill.maxRank || 10)) {
  throw new Error(`FAILED: Skill level overflowed maxRank! Level: ${resultMaxed.skill.level}, maxRank: ${resultMaxed.skill.maxRank}`);
}
console.log(`  ✓ Level clamped cleanly at maxRank (${resultMaxed.skill.level}/${resultMaxed.skill.maxRank || 10}), preventing overflow!`);

// ---------------------------------------------------------------------------
// 3. FLEXIBLE COMPOSITE SYNERGY (2+2) UNIT TESTS
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing Flexible Composite Synergies (2+2 = 4 skills) ---');

const baseAttrs: BaseAttributes = { strength: 10, dexterity: 10, intelligence: 10, vitality: 10 };

// Helper to pick 2 skills of a theme
const getTwoSkills = (theme: PassiveTheme): PassiveSkill[] => {
  const pool = PASSIVE_SKILLS_POOL.filter(s => s.theme === theme);
  return pool.slice(0, 2).map(s => ({ ...s, level: 1, value: s.baseValue }));
};

for (const synergy of COMPOSITE_SYNERGIES) {
  const [themeA, themeB] = synergy.themes;
  const skillsA = getTwoSkills(themeA);
  const skillsB = getTwoSkills(themeB);
  const hybridSkills = [...skillsA, ...skillsB]; // Exactly 4 skills!

  const stats = calculatePlayerStats(
    baseAttrs,
    {},
    hybridSkills,
    1,
    0,
    [],
    hybridSkills.map(s => s.id)
  );

  // Assert Synergy is active
  if (!stats.activeSynergies.includes(synergy.id)) {
    throw new Error(`FAILED: Synergy '${synergy.name}' (${synergy.id}) did not activate with 2+2 skills!`);
  }

  // Assert Set Bonuses are NOT active (requires 3 skills)
  if (stats.activeSetBonuses.includes(themeA) || stats.activeSetBonuses.includes(themeB)) {
    throw new Error(`FAILED: Theme set bonus unexpectedly activated with only 2 skills!`);
  }

  console.log(`  ✓ Synergy '${synergy.name}' (${themeA} + ${themeB}) activated with 4 skills (2 free slots remaining)!`);
}

// ---------------------------------------------------------------------------
// 4. BROWSER UI VERIFICATION (Puppeteer)
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Browser UI for (X/2) Counters in SkillsModal ---');

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

const PORT = 5202;
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

    // Verify UI shows flexible synergy counters (0/2)
    const synergyCountersFound = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFrostburn: text.includes('Frostburn'),
        hasSpellblade: text.includes('Spellblade'),
        hasBiohazard: text.includes('Biohazard'),
        hasVerdantBulwark: text.includes('Verdant Bulwark'),
        hasZeroOfTwoCounter: text.includes('(0/2)')
      };
    });

    console.log('  Browser UI Verification:');
    console.log(`    Frostburn displayed: ${synergyCountersFound.hasFrostburn ? '✓' : '✗'}`);
    console.log(`    Spellblade displayed: ${synergyCountersFound.hasSpellblade ? '✓' : '✗'}`);
    console.log(`    Biohazard displayed: ${synergyCountersFound.hasBiohazard ? '✓' : '✗'}`);
    console.log(`    Verdant Bulwark displayed: ${synergyCountersFound.hasVerdantBulwark ? '✓' : '✗'}`);
    console.log(`    Flexible Counter '(0/2)' displayed: ${synergyCountersFound.hasZeroOfTwoCounter ? '✓' : '✗'}`);

    if (!synergyCountersFound.hasFrostburn || !synergyCountersFound.hasZeroOfTwoCounter) {
      throw new Error('UI failed to render flexible composite synergy requirements!');
    }

    // Scroll to composite synergies section
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const synHeading = headings.find(h => h.textContent?.includes('Sinergias Compuestas'));
      if (synHeading) {
        synHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Take screenshot of the Sets & Effects tab showing flexible synergies
    const screenshotPath = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/skill_synergies_flexible_v2.5.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ Screenshot saved to ${screenshotPath}`);

    console.log('\n=====================================================');
    console.log('  PHASE 3 SUCCESS: FLEXIBLE SYNERGIES & DROPS SECURED!');
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
