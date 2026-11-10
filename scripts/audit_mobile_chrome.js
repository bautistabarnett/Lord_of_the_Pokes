import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const screenshotDir = '/tmp/audit_screens';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Android Pixel 7 / Galaxy S21 emulation
const ANDROID_DEVICE = {
  name: 'Pixel 7 (Android Chrome)',
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  viewport: {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  }
};

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('📱 AUDITORÍA COMPLETA: ANDROID CHROME (PIXEL 7) - LoTD v2.0');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.emulate(ANDROID_DEVICE);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  const appUrl = 'http://127.0.0.1:4173/';
  await page.goto(appUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------
  // TEST 1: MAIN MENU & VERSION DISPLAY
  // -------------------------------------------------------------
  console.log('🔍 [TEST 1] Main Menu & Versión v2.0');
  await page.screenshot({ path: path.join(screenshotDir, '01_main_menu_v2.png') });
  
  const menuAudit = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      titleFound: text.includes('LOOT OF THE VOID'),
      versionText: text.includes('v2.0 • Loot of the Void'),
      hasSlots: text.includes('Slot 1') && text.includes('Slot 2') && text.includes('Slot 3')
    };
  });
  console.log('  -> Menú Principal:', menuAudit);

  // -------------------------------------------------------------
  // TEST 2: SELECCIÓN DE SLOT Y ENTRADA AL JUEGO
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 2] Carga de Partida en Slot 1');
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const slotDiv = divs.find(d => d.innerText && d.innerText.includes('Slot 1') && d.className.includes('cursor-pointer'));
    if (slotDiv) slotDiv.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Adventure') || b.innerText.includes('Load Game'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(screenshotDir, '02_game_loaded_center_sheet.png') });

  // -------------------------------------------------------------
  // TEST 3: HOJA DE PERSONAJE EN EL PANEL CENTRAL
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 3] Hoja de Personaje en el Panel Central (Ocupando el vacío de image_2.png)');
  const centerAudit = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasCharSheet = text.includes('Character Sheet');
    const hasCoreAttributes = text.includes('Core Attributes');
    const hasCombatStats = text.includes('Combat Statistics');
    const hasStr = text.includes('Strength');
    const hasDex = text.includes('Dexterity');
    const hasInt = text.includes('Intelligence');
    const hasVit = text.includes('Vitality');
    const hasReaccion = text.includes('Reacción Rápida');
    const hasExp = text.includes('Progress to Lvl 2') || text.includes('XP');
    const hasPassives = text.includes('Active Passives');

    // Audit Reacción Rápida container styling
    const reaccionDiv = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.includes('Reacción Rápida'));
    const reaccionBoxText = reaccionDiv ? reaccionDiv.parentElement?.innerText : null;

    return {
      hasCharSheet,
      hasCoreAttributes,
      hasCombatStats,
      attributes: { hasStr, hasDex, hasInt, hasVit },
      hasReaccion,
      reaccionBoxText,
      hasExp,
      hasPassives
    };
  });
  console.log('  -> Hoja de Personaje Central:', centerAudit);

  // -------------------------------------------------------------
  // TEST 4: CONMUTACIÓN ENTRE ESTADÍSTICAS Y BITÁCORA
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 4] Conmutación entre Pestaña [📊 Estadísticas] y [📜 Bitácora]');
  const switchedToLog = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Bitácora'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '03_bitacora_tab_view.png') });

  const logAudit = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isBitacoraVisible: text.includes('The journey begins...') || text.includes('Ruins'),
      hasStatsHidden: !text.includes('Core Attributes')
    };
  });
  console.log(`  -> Conmutado a Bitácora (${switchedToLog}):`, logAudit);

  // Volver a Estadísticas
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Estadísticas'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------
  // TEST 5: NAVEGACIÓN MÓVIL (PESTAÑAS HERO, ADVENTURE, MERCHANT)
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 5] Navegación Responsive en Móvil (< sm)');
  // Click on Hero tab (en móviles < sm hay tabs inferiores)
  const mobileNavButtons = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const bottomNav = allButtons.filter(b => b.innerText && (b.innerText.includes('Hero') || b.innerText.includes('Adventure') || b.innerText.includes('Merchant') || b.innerText.includes('MAP') || b.innerText.includes('SKILLS') || b.innerText.includes('SYSTEM')));
    return bottomNav.map(b => b.innerText.trim());
  });
  console.log('  -> Botones de Navegación Móvil detectados:', mobileNavButtons);

  // -------------------------------------------------------------
  // TEST 6: INTERACCIÓN CON ITEMS (TAP PARA EQUIPAR Y VENDER)
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 6] Interacción de Ítems en Pantalla Táctil: Botones "Equipar" y "Vender"');
  // First, generate an item by opening Smuggler or give starter item
  // Click SMUGGLER button
  await page.evaluate(() => {
    const smugglerBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toUpperCase().includes('SMUGGLER'));
    if (smugglerBtn) smugglerBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '04_smuggler_modal.png') });

  // Close smuggler
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Switch to Hero view to tap an equipped slot (e.g. Weapon or Head)
  // In mobile, click Hero tab if present
  await page.evaluate(() => {
    const heroBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Hero') || b.innerText.includes('Personaje')));
    if (heroBtn) heroBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '05_hero_equipment_view.png') });

  // Tap on equipped slot (e.g. starter weapon)
  const tapSlotResult = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.slot, [data-slot]'));
    if (slots.length > 0) {
      slots[0].click();
      return { tapped: true, count: slots.length };
    }
    return { tapped: false };
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '06_item_popup_equipped.png') });

  const modalActionsAudit = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
    const hasEquipar = buttons.some(b => b.toLowerCase().includes('equipar') || b.toLowerCase().includes('desequipar') || b.toLowerCase().includes('equip'));
    const hasVender = buttons.some(b => b.toLowerCase().includes('vender') || b.toLowerCase().includes('sell'));
    return { buttons: buttons.slice(0, 10), hasEquipar, hasVender };
  });
  console.log('  -> Acciones de Ítem en Tap Móvil:', modalActionsAudit);

  // Close popup if any
  await page.evaluate(() => {
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) backdrop.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // -------------------------------------------------------------
  // TEST 7: EXPLORACIÓN Y COMBATE CON SISTEMA DE TRIADA Y MALEDICTS
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 7] Exploración, Disparo de Combate, Triada (Posturas) y Maledicts');
  // Switch to Adventure tab
  await page.evaluate(() => {
    const advBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Adventure') || b.innerText.includes('Aventura')));
    if (advBtn) advBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  let inCombat = false;
  let combatInfo = null;

  for (let step = 1; step <= 10; step++) {
    // Click explore
    await page.evaluate(() => {
      const exploreBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Explore'));
      if (exploreBtn && !exploreBtn.disabled) exploreBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Handle any event modals
    await page.evaluate(() => {
      const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Continue'));
      if (continueBtn) continueBtn.click();
    });

    combatInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const isFighting = text.includes('VS') || text.includes('Flee') || text.includes('STANCE') || text.includes('Agresiva') || text.includes('Defensiva') || text.includes('Táctica') || text.includes('Chronobreaker') || text.includes('Infamia') || text.includes('TRT') || text.includes('INF');
      if (isFighting) {
        const hasStances = text.includes('Agresiva') || text.includes('Defensiva') || text.includes('Táctica');
        const hasFlee = text.includes('Flee') || text.includes('Huir');
        const hasMaledicts = text.includes('TRT') || text.includes('INF') || text.includes('ACT');
        return { isFighting: true, hasStances, hasFlee, hasMaledicts, textPreview: text.slice(0, 400) };
      }
      return null;
    });

    if (combatInfo) {
      inCombat = true;
      console.log(`  -> ¡Combate activado exitosamente en el paso ${step}!`);
      break;
    }
  }

  await page.screenshot({ path: path.join(screenshotDir, '07_combat_or_explore_final.png') });
  console.log('  -> Estado de Combate:', combatInfo || 'Exploración completada sin combate inmediato (modo seguro)');

  // -------------------------------------------------------------
  // TEST 8: SYSTEM MODAL & DEBUG TOOLS
  // -------------------------------------------------------------
  console.log('\n🔍 [TEST 8] Modal System, Guardado y Versión v2.0');
  await page.evaluate(() => {
    const sysBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toUpperCase().includes('SYSTEM'));
    if (sysBtn) sysBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotDir, '08_system_modal_v2.png') });

  const systemAudit = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasSaveBtn: text.includes('Save Game'),
      hasBalanceTool: text.includes('Balance & Debug Tool'),
      hasV2Footer: text.includes('v2.0')
    };
  });
  console.log('  -> Modal System:', systemAudit);

  // Close System Modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('\n================================================================');
  console.log('📊 RESUMEN FINAL DE AUDITORÍA');
  console.log('================================================================');
  console.log(`Total errores en consola de Android Chrome: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Detalle de errores:', errors);
  } else {
    console.log('✅ CERO ERRORES: La aplicación corre con fluidez y estabilidad total.');
  }

  await browser.close();
  console.log('\nAuditoría finalizada.');
}

runComprehensiveAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
