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

server.listen(5188, '127.0.0.1', async () => {
  console.log('Serving dist on http://127.0.0.1:5188');

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
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

    await page.goto('http://127.0.0.1:5188/', { waitUntil: 'networkidle2' });
    console.log('Main menu loaded');

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

    // Ensure mobile active tab is 'adventure'
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('button'));
      const advBtn = navButtons.find(b => b.innerText.toUpperCase().includes('ADVENTURE') || b.innerText.includes('Estadísticas'));
      if (advBtn) (advBtn as HTMLElement).click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Click Tutorial Tab
    const clickedTutorial = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('TUTORIAL'));
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('Clicked Tutorial sub-tab:', clickedTutorial);

    await new Promise(r => setTimeout(r, 1200));

    const shotPath = path.join(rootDir, 'tutorial_screen.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot to ${shotPath}`);

    // Verify DOM contains Tutorial topics
    const tutorialContent = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasTitle: body.includes('Manual del Aventurero'),
        hasVersion: body.includes('v2.1'),
        hasTriad: body.includes('Tríada de Posturas'),
        hasParry: body.includes('Parada (Parry)'),
        hasMaledicts: body.includes('Maledicts'),
        hasChronobreaker: body.includes('Chronobreaker') || body.includes('Infamias'),
        hasAttributes: body.includes('Atributos')
      };
    });
    console.log('Tutorial Content Verification:', tutorialContent);

    await browser.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    server.close();
  }
});
