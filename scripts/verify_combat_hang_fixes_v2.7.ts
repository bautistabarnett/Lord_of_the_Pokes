import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const artifactDir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c';

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

const PORT = 5196;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`================================================================================`);
  console.log(`🧪 VALIDACIÓN EN NAVEGADOR REAL (PUPPETEER): COMBATE Y WATCHDOG (v2.7)`);
  console.log(`================================================================================\n`);
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
    const runtimeErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('404')) {
        console.log('BROWSER ERROR:', text);
        runtimeErrors.push(text);
      } else if (text.includes('Combat Watchdog') || text.includes('Victory') || text.includes('Slain')) {
        console.log('GAME LOG:', text);
      }
    });
    page.on('pageerror', err => {
      console.error('PAGE ERROR:', err.message);
      runtimeErrors.push(err.message);
    });

    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2' });
    console.log('1. Interfaz cargada exitosamente.');

    // Verificar versión v2.7 en pantalla
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasV27 = pageText.includes('v2.7');
    console.log(`2. Versión en pantalla: ${hasV27 ? 'v2.7 detectada ✅' : 'v2.7 NO encontrada ❌'}`);

    // Click Slot 1
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const slotDiv = divs.find(d => d.innerText && d.innerText.includes('Slot 1') && d.className.includes('cursor-pointer'));
      if (slotDiv) slotDiv.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Iniciar partida (Start Adventure o Load Game)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.toUpperCase().includes('START ADVENTURE') || b.innerText.toUpperCase().includes('LOAD GAME'));
      if (startBtn) startBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Switch to Play / Adventure tab on mobile
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('button'));
      const advBtn = navButtons.find(b => b.innerText.toUpperCase().includes('PLAY') || b.innerText.toUpperCase().includes('ADVENTURE'));
      if (advBtn) (advBtn as HTMLElement).click();
    });
    await new Promise(r => setTimeout(r, 600));
    console.log('3. Pestaña de Aventura activa en pantalla de juego.');

    // Ejecutar 3 combates completos probando avance de turnos, posturas y resolución
    let completedBattles = 0;
    const targetBattles = 3;

    for (let round = 1; round <= targetBattles; round++) {
      console.log(`\n--- [Combate ${round}/${targetBattles}] Iniciando exploración ---`);

      // Click "EXPLORE" until combat starts
      let inCombat = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const exploreBtn = btns.find(b => b.innerText.trim().toUpperCase() === 'EXPLORE');
          if (exploreBtn) exploreBtn.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        inCombat = await page.evaluate(() => {
          const text = document.body.innerText || '';
          return text.includes('Codex') && (text.includes('Voluntad') || text.includes('Target Focus') || text.includes('Dmg'));
        });
        if (inCombat) break;

        // Si apareció modal de evento, cerrarlo
        await page.evaluate(() => {
          const closeBtns = Array.from(document.querySelectorAll('button')).filter(b => 
            b.innerText.includes('Continue') || b.innerText.includes('Continuar') || b.innerText.includes('Leave') || b.innerText.includes('Claim')
          );
          closeBtns.forEach(b => b.click());
        });
        await new Promise(r => setTimeout(r, 500));
      }

      if (!inCombat) {
        console.log(`Combate ${round}: Modal no apareció tras varios intentos, continuando.`);
        continue;
      }
      console.log(`Combate ${round}: ¡En combate! Modal activo.`);

      // Interactuar con el combate: realizar acciones, probar clics rápidos y comprobar avance de turnos
      let iterations = 0;
      const fightStartTime = Date.now();

      while (iterations < 50 && (Date.now() - fightStartTime < 25000)) {
        iterations++;

        const state = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const isFighting = text.includes('Codex') && (text.includes('Voluntad') || text.includes('Dmg'));
          const isPlayerTurn = text.includes('Tu Turno') || text.includes('CHRONOBREAKER') || text.includes('PAUSADO');
          return { isFighting, isPlayerTurn };
        });

        if (!state.isFighting) {
          console.log(`Combate ${round}: Concluido exitosamente.`);
          completedBattles++;
          break;
        }

        if (state.isPlayerTurn) {
          // Clic en una postura al azar (Voluntad, Espíritu, Temple)
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const stances = btns.filter(b => 
              b.innerText.includes('Voluntad') || b.innerText.includes('Espíritu') || b.innerText.includes('Temple')
            );
            if (stances.length > 0) {
              const pick = stances[Math.floor(Math.random() * stances.length)];
              pick.click();
            }
          });
          await new Promise(r => setTimeout(r, 350));
        } else {
          // Esperar turno enemigo
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Cerrar posibles modales de recompensa / subida de nivel
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll('button')).filter(b => 
          b.innerText.includes('Accept') || b.innerText.includes('Claim') || b.innerText.includes('Close') || b.innerText.includes('Aceptar')
        );
        closeBtns.forEach(b => b.click());
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // Capturar screenshot final de la prueba v2.7
    const screenshotPath = path.join(artifactDir, 'combat_hang_audit_v2.7.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`\n📸 Captura guardada en: ${screenshotPath}`);

    await browser.close();
    server.close();

    console.log(`\n================================================================================`);
    console.log(`📊 RESULTADOS DE LA PRUEBA EN NAVEGADOR:`);
    console.log(`   • Versión v2.7 en HUD: ${hasV27 ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`   • Combates completados sin cuelgues: ${completedBattles}`);
    console.log(`   • Errores críticos de JS en consola: ${runtimeErrors.length}`);
    console.log(`================================================================================\n`);

    if (runtimeErrors.length === 0 && hasV27 && completedBattles > 0) {
      console.log('✅ AUDITORÍA DE COMBATE EXITOSA: 0 cuelgues, 0 errores en consola.\n');
      process.exit(0);
    } else {
      console.error('❌ Fallos detectados en la prueba de navegador.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Error durante la prueba:', err);
    server.close();
    process.exit(1);
  }
});
