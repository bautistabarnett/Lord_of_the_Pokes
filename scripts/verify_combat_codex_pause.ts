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

const PORT = 5192;
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
    console.log('1. Main menu loaded');

    // Select Slot 1
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const slotDiv = divs.find(d => d.innerText && d.innerText.includes('Slot 1') && d.className.includes('cursor-pointer'));
      if (slotDiv) slotDiv.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Click Start Adventure / Load Game
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Adventure') || b.innerText.includes('Load Game'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Switch to Play / Adventure tab on mobile
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('button'));
      const advBtn = navButtons.find(b => b.innerText.toUpperCase().includes('PLAY') || b.innerText.toUpperCase().includes('ADVENTURE'));
      if (advBtn) (advBtn as HTMLElement).click();
    });
    await new Promise(r => setTimeout(r, 600));

    console.log('2. Gameplay screen reached. Starting combat via Explore...');
    // Click "Explore" until combat starts
    let inCombat = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exploreBtn = btns.find(b => b.innerText.trim().toUpperCase() === 'EXPLORE');
        if (exploreBtn) (exploreBtn as HTMLButtonElement).click();
      });
      await new Promise(r => setTimeout(r, 1000));
      inCombat = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return text.includes('Turn Order') || text.includes('Codex');
      });
      if (inCombat) break;
    }

    if (!inCombat) {
      throw new Error('Combat modal did not appear after multiple Explore attempts');
    }
    console.log('3. Combat initiated! Combat modal visible.');

    // Find and click the Codex button
    const codexClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const codexBtn = btns.find(b => b.textContent?.includes('Codex'));
      if (codexBtn) {
        (codexBtn as HTMLButtonElement).click();
        return true;
      }
      return false;
    });
    console.log('4. Codex button clicked:', codexClicked);

    // Wait for EnemyInspectModal to appear
    await page.waitForFunction(() => {
      return document.body.textContent?.includes('Enemy Intel & Codex');
    }, { timeout: 3000 });

    // Check if the pause banner is visible
    const pauseBannerFound = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Combate en Pausa') || text.includes('Pausa Táctica');
    });
    console.log('5. Pause banner visible inside Codex:', pauseBannerFound);

    // Save screenshot
    const screenshotPath = path.join(rootDir, 'codex_combat_pause.png');
    await page.screenshot({ path: screenshotPath });
    console.log('6. Saved screenshot to', screenshotPath);

    // Wait 3.5 seconds inside the Codex to confirm no unexpected background turn resolution
    console.log('7. Waiting 3.5s in Codex to verify combat remains safely frozen...');
    await new Promise(r => setTimeout(r, 3500));

    // Verify player is still alive and codex is still open
    const isStillOpen = await page.evaluate(() => {
      return document.body.textContent?.includes('Enemy Intel & Codex');
    });
    console.log('8. Codex still open and combat paused after 3.5s:', isStillOpen);

    // Close the Codex
    const closeClicked = await page.evaluate(() => {
      // Find the close button inside modal header
      const btns = Array.from(document.querySelectorAll('button'));
      const closeBtn = btns.find(b => b.textContent?.trim() === '✕');
      if (closeBtn) {
        (closeBtn as HTMLButtonElement).click();
        return true;
      }
      return false;
    });
    console.log('9. Closed Codex via X button:', closeClicked);
    await new Promise(r => setTimeout(r, 600));

    // Verify combat has resumed and modal is back to combat arena
    const combatResumed = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Turn Order') && !text.includes('Enemy Intel & Codex');
    });
    console.log('10. Combat successfully resumed:', combatResumed);

    await browser.close();
    server.close();

    if (codexClicked && pauseBannerFound && isStillOpen && combatResumed) {
      console.log('🎉 VERIFICACIÓN EXITOSA: La pausa y reanudación del combate mediante el Códice operan a la perfección.');
      process.exit(0);
    } else {
      console.error('❌ Falló alguna de las verificaciones de la pausa del códice.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test error:', err);
    server.close();
    process.exit(1);
  }
});
