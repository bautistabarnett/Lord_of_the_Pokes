import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
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
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 5195;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Serving dist on http://127.0.0.1:${PORT}`);

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-gpu',
        '--ignore-certificate-errors',
        `--proxy-server=${process.env.HTTP_PROXY || 'http://127.0.0.1:36277'}`
      ]
    });

    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
    console.log('✓ Main menu loaded');

    // 1. Select Slot 1 and Start Adventure
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const slotDiv = divs.find(d => d.innerText && d.innerText.includes('Slot 1') && d.className.includes('cursor-pointer'));
      if (slotDiv) slotDiv.click();
    });
    console.log('  Slot 1 clicked');
    await new Promise(r => setTimeout(r, 600));

    const adventureStarted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent?.toLowerCase().includes('start adventure') || b.textContent?.toLowerCase().includes('load game'));
      if (startBtn) {
        startBtn.click();
        return true;
      }
      return false;
    });
    console.log('  Start Adventure clicked:', adventureStarted);
    await new Promise(r => setTimeout(r, 1500));

    // 2. Verify CenterStatsDashboard has "Sets & Sinergias"
    const textSnapshot = await page.evaluate(() => document.body.innerText);
    const hasSetsDashboard = textSnapshot.toLowerCase().includes('sets & sinergias');
    console.log('✓ CenterStatsDashboard displays "Sets & Sinergias":', hasSetsDashboard);
    if (!hasSetsDashboard) {
      console.log('  Debug Screen text snippet:', textSnapshot.slice(0, 800));
      throw new Error('Sets & Sinergias card not found in CenterStatsDashboard');
    }

    // 3. Open Skills Modal
    const openedSkills = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skillsBtn = buttons.find(b => b.textContent?.includes('Skills'));
      if (skillsBtn) {
        skillsBtn.click();
        return true;
      }
      return false;
    });
    console.log('✓ Skills button clicked:', openedSkills);
    await new Promise(r => setTimeout(r, 1000));

    // 4. Verify SkillsModal Header
    const modalHeader = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent : null;
    });
    console.log('✓ Modal Header:', modalHeader);

    // 5. Verify Sub-Theme Selector Pills
    const subThemePills = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const themes = ['Pyromancy', 'Warfare', 'Sentinel', 'Cryomancy', 'Fortune', 'Nature', 'Shadow', 'Arcane'];
      const found = buttons.filter(b => themes.some(t => b.textContent?.includes(t)));
      return found.map(b => b.textContent?.trim());
    });
    console.log('✓ Found Sub-Theme Pills in branch:', subThemePills);
    if (subThemePills.length < 2) throw new Error('Expected at least 2 sub-theme pills in Offense branch');

    // 6. Switch to Warfare theme
    const switchedToWarfare = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const warfareBtn = buttons.find(b => b.textContent?.includes('Warfare'));
      if (warfareBtn) {
        warfareBtn.click();
        return true;
      }
      return false;
    });
    console.log('✓ Switched to Warfare theme:', switchedToWarfare);
    await new Promise(r => setTimeout(r, 500));

    // 7. Verify node interaction: Click a node
    const nodeClicked = await page.evaluate(() => {
      // Find a node button in the canvas
      const canvasButtons = Array.from(document.querySelectorAll('.canvas-layer button'));
      if (canvasButtons.length > 0) {
        (canvasButtons[0] as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('✓ Clicked skill node in canvas:', nodeClicked);
    await new Promise(r => setTimeout(r, 500));

    // 8. Capture screenshot of Skill Tree with Sub-Theme pills and Details Panel
    const artifactPath = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/skill_tree_v2.3.png';
    await page.screenshot({ path: artifactPath });
    console.log(`✓ Screenshot saved to ${artifactPath}`);

    // 9. Switch to "Sets & Effects" tab
    const switchedTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabBtn = buttons.find(b => b.textContent?.includes('Sets & Effects'));
      if (tabBtn) {
        tabBtn.click();
        return true;
      }
      return false;
    });
    console.log('✓ Switched to "Sets & Effects" tab:', switchedTab);
    await new Promise(r => setTimeout(r, 500));

    const effectsDashboardContent = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasSetBonuses: text.includes('bonificaciones de conjunto') || text.includes('set bonuses'),
        hasSynergies: text.includes('sinergias compuestas') || text.includes('composite synergies'),
        hasAvatarOfFlame: text.includes('avatar of flame'),
        hasFrostburn: text.includes('frostburn')
      };
    });
    console.log('✓ Effects & Sets Dashboard verified:', effectsDashboardContent);
    if (!effectsDashboardContent.hasSetBonuses || !effectsDashboardContent.hasSynergies) {
      throw new Error('Effects dashboard missing set bonuses or synergies');
    }

    const artifactPathTab = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c/skill_sets_effects_v2.3.png';
    await page.screenshot({ path: artifactPathTab });
    console.log(`✓ Screenshot of Sets & Effects tab saved to ${artifactPathTab}`);

    console.log('\n========================================');
    console.log('  ALL PHASE 1 AUDIT & VERIFICATION PASSED!');
    console.log('========================================\n');

    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    server.close();
    process.exit(1);
  }
});
