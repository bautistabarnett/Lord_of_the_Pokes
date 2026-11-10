import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
if (!fs.existsSync(distHtmlPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(distHtmlPath, 'utf-8');
const scriptMatch = html.match(/<script type="module" crossorigin src="(\.\/assets\/[^"]+)"><\/script>/);

if (scriptMatch) {
  const assetRelPath = scriptMatch[1].replace('./', '');
  const assetFullPath = path.join(rootDir, 'dist', assetRelPath);
  const jsCode = fs.readFileSync(assetFullPath, 'utf-8');
  html = html.replace(scriptMatch[0], `<script type="module">\n${jsCode}\n</script>`);
  
  // Destination 1: Artifact directory if available
  const artifactDir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/d4147c43-61d1-4644-bebf-53693b076d1c';
  if (fs.existsSync(artifactDir)) {
    const artifactPath = path.join(artifactDir, 'Lord_of_the_Dungeon.html');
    fs.writeFileSync(artifactPath, html);
    console.log(`Updated standalone HTML artifact at ${artifactPath} (${html.length} bytes)`);
  }
  
  // Destination 2: Project root Lord_of_the_Dungeon_Standalone.html
  const localStandalone = path.join(rootDir, 'Lord_of_the_Dungeon_Standalone.html');
  fs.writeFileSync(localStandalone, html);
  console.log(`Generated local standalone file at ${localStandalone} (${html.length} bytes)`);
} else {
  console.error('No Vite bundle script tag found in dist/index.html');
}
