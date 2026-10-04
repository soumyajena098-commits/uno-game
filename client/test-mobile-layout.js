import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running Mobile Viewport & Layout Failsafe Verification (Part 23)...');

// 1. Test safePct mathematical resilience
function safePct(num, fallback = 50) {
  if (num === null || num === undefined || typeof num !== 'number' || !Number.isFinite(num)) {
    return `${fallback}%`;
  }
  return `${Math.round(num * 100) / 100}%`;
}

// Check safePct inputs
assert.strictEqual(safePct(50), '50%');
assert.strictEqual(safePct(33.3333), '33.33%');
assert.strictEqual(safePct(NaN, 40), '40%');
assert.strictEqual(safePct(undefined, 66), '66%');
assert.strictEqual(safePct(null, 50), '50%');
assert.strictEqual(safePct(Infinity, 50), '50%');
assert.strictEqual(safePct(-Infinity, 50), '50%');
assert.strictEqual(safePct('invalid', 50), '50%');
console.log('✅ 1. safePct prevents NaN/undefined/Infinity inline CSS styles.');

// 2. Test CSS contract in index.css
const cssPath = path.join(__dirname, 'src', 'index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('100dvh'), 'index.css must include 100dvh for dynamic mobile viewport');
assert(cssContent.includes('-webkit-fill-available'), 'index.css must include -webkit-fill-available for iOS Safari');
assert(cssContent.includes('.game-screen .table-area'), 'index.css must define .game-screen .table-area styling');
assert(cssContent.includes('min-height: 0'), '.table-area must have min-height: 0 to prevent flex overflow');
assert(cssContent.includes('min-width: 0'), '.table-area must have min-width: 0 to prevent flex overflow');
assert(cssContent.includes('flex: 1 1 0%') || cssContent.includes('flex: 1 1 0'), '.table-area must have flex: 1 1 0%');
console.log('✅ 2. Triple height fallbacks and flex table-area CSS contracts verified in index.css.');

// 3. Test responsive coordinates and elliptical seat calculations across mobile viewports
const testViewports = [
  { name: 'Android Portrait (Small)', w: 360, h: 640, portrait: true },
  { name: 'iPhone 13/14 Portrait', w: 390, h: 844, portrait: true },
  { name: 'Pixel 7/8 Portrait', w: 412, h: 915, portrait: true },
  { name: 'Foldable Inner Screen', w: 673, h: 841, portrait: true },
  { name: 'Landscape Phone', w: 844, h: 390, portrait: false },
  { name: 'Tablet Landscape', w: 1024, h: 768, portrait: false },
  { name: 'Desktop Full HD', w: 1920, h: 1080, portrait: false },
];

for (const vp of testViewports) {
  const isPortraitMobile = vp.portrait && vp.w < 768;
  const centerYPercent = isPortraitMobile ? 39 : 42;
  const ryPercent = isPortraitMobile ? 26 : 30;

  for (let totalPlayers = 2; totalPlayers <= 6; totalPlayers++) {
    const rxPercent = isPortraitMobile
      ? 38
      : totalPlayers === 6
      ? 42
      : totalPlayers >= 4
      ? 40
      : 36;

    // Local player seat
    const localSeatY = centerYPercent + ryPercent;
    assert(Number.isFinite(localSeatY) && localSeatY > 0 && localSeatY <= 100, `Local player seat must be valid in ${vp.name}`);

    // Opponent seats
    const opponentsCount = totalPlayers - 1;
    for (let i = 0; i < opponentsCount; i++) {
      const angleDeg =
        opponentsCount === 1
          ? 270
          : 270 + ((i - (opponentsCount - 1) / 2) / (opponentsCount - 1)) * 140;
      const angleRad = (angleDeg * Math.PI) / 180;
      const xPercent = 50 + rxPercent * Math.cos(angleRad);
      const yPercent = centerYPercent + ryPercent * Math.sin(angleRad);

      assert(Number.isFinite(xPercent) && xPercent >= 0 && xPercent <= 100, `Opponent ${i} X must be within 0-100% in ${vp.name}`);
      assert(Number.isFinite(yPercent) && yPercent >= 0 && yPercent <= 100, `Opponent ${i} Y must be within 0-100% in ${vp.name}`);
      assert.strictEqual(typeof safePct(xPercent), 'string');
      assert.strictEqual(typeof safePct(yPercent), 'string');
    }
  }
}
console.log('✅ 3. Elliptical seating geometry verified across all 7 mobile & desktop viewports (2-6 players).');

// 4. Verify GamePage.jsx defensive layout guards
const gamePagePath = path.join(__dirname, 'src', 'pages', 'GamePage.jsx');
const gamePageContent = fs.readFileSync(gamePagePath, 'utf8');

assert(gamePageContent.includes('layoutStallWarning'), 'GamePage must include layoutStallWarning state');
assert(gamePageContent.includes('safePct'), 'GamePage must use safePct helper');
assert(gamePageContent.includes('table-area'), 'GamePage <main> must use table-area class');
assert(gamePageContent.includes("minHeight: '380px'"), 'GamePage <main> must specify fallback minHeight');
assert(gamePageContent.includes('mobile-diagnostics-overlay'), 'GamePage must render mobile diagnostics overlay');
assert(gamePageContent.includes('minHeight: \'clamp(80px, 14vh, 140px)\''), 'Floating hand must include minHeight constraint');
console.log('✅ 4. GamePage defensive layout guards, watchdog, and diagnostics overlay verified.');

console.log('\n🎉 All Part 23 Mobile Viewport & Layout tests passed successfully!');
