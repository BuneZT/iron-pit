import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, pixelDataRGBA) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Non-interlaced

  const ihdrChunk = createChunk('IHDR', ihdrData);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let scanlineOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanlineOffset++] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      scanlines[scanlineOffset++] = pixelDataRGBA[idx];
      scanlines[scanlineOffset++] = pixelDataRGBA[idx + 1];
      scanlines[scanlineOffset++] = pixelDataRGBA[idx + 2];
      scanlines[scanlineOffset++] = pixelDataRGBA[idx + 3];
    }
  }

  const compressedIDAT = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedIDAT);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// 4x4 Bayer Matrix for authentic 90s retro dithering
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function applyBayerDither(val, x, y, strength = 18) {
  const threshold = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * strength;
  return Math.min(255, Math.max(0, val + threshold));
}

// Quantize to steps (e.g. 16 or 32 values per channel like PS1/Quake 8-bit palette)
function quantize(val, step = 12) {
  return Math.round(val / step) * step;
}

function pseudoNoise(x, y, seed = 1337) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y, size, seed) {
  const sx = ((x % size) + size) % size;
  const sy = ((y % size) + size) % size;
  let val = 0;
  let scale = 1;
  let total = 0;
  for (let oct = 0; oct < 4; oct++) {
    const freq = Math.pow(2, oct);
    const nx = Math.floor((sx * freq) / size) % freq;
    const ny = Math.floor((sy * freq) / size) % freq;
    val += pseudoNoise(nx, ny, seed + oct * 53) * scale;
    total += scale;
    scale *= 0.5;
  }
  return val / total;
}

// Authentic 128x128 native texture size
const SIZE = 128;

// 1. Gritty Quake 1 Dungeon Flagstone Floor
// Heavy grime, chipped cracked stones, pitch-black deep crevices, damp moss splotches, heavy pixel dither
function generateStoneFloor() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const tileSize = 32; // 4x4 flagstone tiles per 128px

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const lx = x % tileSize;
      const ly = y % tileSize;

      // Distance to mortar edge
      const edgeDist = Math.min(lx, tileSize - 1 - lx, ly, tileSize - 1 - ly);

      // Per-tile tone variance (some stones dark ash, some muddy brownish-grey)
      const tileHash = pseudoNoise(tileX * 7, tileY * 13, 891);
      const baseTone = 0.65 + tileHash * 0.45;

      // Heavy noise grit
      const nGrit = pseudoNoise(x, y, 101);
      const nCloud = smoothNoise(x, y, SIZE, 444);
      const nSludge = smoothNoise(x * 2, y * 2, SIZE, 777);

      let r = (48 + nCloud * 32) * baseTone;
      let g = (45 + nCloud * 30) * baseTone;
      let b = (42 + nCloud * 26) * baseTone;

      // Stone chiseling & high contrast bevels
      if (edgeDist === 1 || edgeDist === 2) {
        if (lx === 1 || ly === 1) {
          // Sharp top/left highlight edge
          r += 28;
          g += 28;
          b += 26;
        } else {
          // Sharp bottom/right shadow gouge
          r *= 0.4;
          g *= 0.4;
          b *= 0.4;
        }
      }

      // Deep pitch-black mortar joint
      if (edgeDist === 0) {
        r = 14 + nGrit * 10;
        g = 13 + nGrit * 10;
        b = 12 + nGrit * 10;
      }

      // Damp moss / sludge in corners of flagstones
      if (nSludge > 0.58 && edgeDist < 6) {
        const mossAmt = (nSludge - 0.58) / 0.42;
        r = r * (1 - mossAmt * 0.6) + 25 * mossAmt;
        g = g * (1 - mossAmt * 0.3) + 55 * mossAmt;
        b = b * (1 - mossAmt * 0.8) + 20 * mossAmt;
      }

      // Random dark cracks across stones
      const crackSeed = pseudoNoise(Math.floor(x / 3), Math.floor(y / 3), 555);
      if (crackSeed > 0.93 && edgeDist > 2) {
        r *= 0.25;
        g *= 0.25;
        b *= 0.25;
      }

      // Soot / dirt burn marks
      if (nCloud < 0.22) {
        r *= 0.55;
        g *= 0.55;
        b *= 0.55;
      }

      // Apply authentic 90s Bayer dithering + quantization
      r = quantize(applyBayerDither(r, x, y, 16), 8);
      g = quantize(applyBayerDither(g, x, y, 16), 8);
      b = quantize(applyBayerDither(b, x, y, 16), 8);

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 2. Gritty Weathered Dungeon Wall / Masonry
// Staggered stone blocks with dripping moisture streaks, soot grime, cracked mortar, and heavy stone grain
function generateDungeonWall() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const blockH = 16; // 8 rows
  const blockW = 32; // 4 columns, staggered

  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / blockH);
    const rowY = y % blockH;
    const shift = (row % 2) * (blockW / 2);

    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const shiftedX = (x + shift) % SIZE;
      const col = Math.floor(shiftedX / blockW);
      const colX = shiftedX % blockW;

      const edgeDistX = Math.min(colX, blockW - 1 - colX);
      const edgeDistY = Math.min(rowY, blockH - 1 - rowY);
      const edgeDist = Math.min(edgeDistX, edgeDistY);

      const blockTone = 0.75 + 0.4 * pseudoNoise(row, col, 771);
      const nGrain = pseudoNoise(x, y, 313);
      const nGrime = smoothNoise(x, y, SIZE, 999);
      const nDrip = smoothNoise(x * 4, y, SIZE, 123);

      let r = (55 + nGrime * 35) * blockTone;
      let g = (53 + nGrime * 33) * blockTone;
      let b = (50 + nGrime * 30) * blockTone;

      // Heavy chipped edge highlights and shadows
      if (edgeDist === 1) {
        if (rowY === 1 || colX === 1) {
          r += 32;
          g += 32;
          b += 30;
        } else {
          r *= 0.35;
          g *= 0.35;
          b *= 0.35;
        }
      }

      // Pitch-black deep mortar recess
      if (edgeDist === 0) {
        r = 12 + nGrain * 12;
        g = 12 + nGrain * 12;
        b = 11 + nGrain * 12;
      }

      // Dark vertical grime / water runoff drips
      if (nDrip > 0.65) {
        const dripStr = (nDrip - 0.65) / 0.35;
        r *= 1 - dripStr * 0.45;
        g *= 1 - dripStr * 0.45;
        b *= 1 - dripStr * 0.45;
      }

      // Bayer Dither + Quantization
      r = quantize(applyBayerDither(r, x, y, 16), 8);
      g = quantize(applyBayerDither(g, x, y, 16), 8);
      b = quantize(applyBayerDither(b, x, y, 16), 8);

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 3. Corroded Rusted Iron Plate (Quake 2 / Dark Forces Industrial Grimness)
// Heavy oxidized rust patches, heavy bolted iron rivets with 3D shadows, scratched seams, charred metal
function generateRustedIron() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const panelSize = 64; // 2x2 heavy steel plates

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const lx = x % panelSize;
      const ly = y % panelSize;
      const edgeDist = Math.min(lx, panelSize - 1 - lx, ly, panelSize - 1 - ly);

      const nNoise = smoothNoise(x * 2, y * 2, SIZE, 404);
      const nRust = smoothNoise(x * 3, y * 3, SIZE, 818);
      const nScratch = pseudoNoise(x, y, 929);

      // Dark industrial cold steel base
      let r = 44 + nNoise * 26;
      let g = 46 + nNoise * 26;
      let b = 48 + nNoise * 28;

      // Severe pitted rust oxidation eating through steel (Quake style dark orange/brown)
      if (nRust > 0.48) {
        const rustAmt = (nRust - 0.48) / 0.52;
        r = r * (1 - rustAmt) + (145 + nScratch * 25) * rustAmt;
        g = g * (1 - rustAmt) + (60 + nScratch * 20) * rustAmt;
        b = b * (1 - rustAmt) + (22 + nScratch * 15) * rustAmt;
      }

      // Plate seam bevel and deep trench
      if (edgeDist === 0) {
        r = 10;
        g = 10;
        b = 10;
      } else if (edgeDist === 1) {
        if (lx === 1 || ly === 1) {
          r += 35;
          g += 35;
          b += 38;
        } else {
          r *= 0.3;
          g *= 0.3;
          b *= 0.3;
        }
      }

      // Heavy Iron Rivets in plate corners with cast shadows
      const rivets = [
        [8, 8],
        [panelSize - 8, 8],
        [8, panelSize - 8],
        [panelSize - 8, panelSize - 8],
      ];
      for (const [rx, ry] of rivets) {
        const dx = lx - rx;
        const dy = ly - ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 4.5) {
          if (d < 2.5) {
            // Shiny metallic rivet head with highlight
            if (dx <= 0 && dy <= 0) {
              r = 130;
              g = 135;
              b = 145;
            } else {
              r = 75;
              g = 75;
              b = 80;
            }
          } else {
            // Dark shadow ring around rivet
            r = 12;
            g = 12;
            b = 12;
          }
        }
      }

      // Bayer Dither + Quantization
      r = quantize(applyBayerDither(r, x, y, 18), 8);
      g = quantize(applyBayerDither(g, x, y, 18), 8);
      b = quantize(applyBayerDither(b, x, y, 18), 8);

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 4. Heavy Carved Crypt Basalt Monolith Stone
// High contrast chiseled stone relief, deep dark fissures, soot burn gradients, rough porous texture
function generateCryptStone() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const n1 = smoothNoise(x, y, SIZE, 666);
      const n2 = smoothNoise(x * 4, y * 4, SIZE, 111);
      const nGrit = pseudoNoise(x, y, 888);

      // Dark basalt monolith base
      let r = 40 + n1 * 30 + nGrit * 12;
      let g = 40 + n1 * 28 + nGrit * 12;
      let b = 43 + n1 * 32 + nGrit * 14;

      // Heavy horizontal chiseled block bands every 32px
      const bandY = y % 32;
      if (bandY === 0) {
        // Deep shadow groove
        r = 12;
        g = 12;
        b = 14;
      } else if (bandY === 1) {
        // Sharp stone ledge highlight
        r += 35;
        g += 35;
        b += 38;
      }

      // Deep dark fissures & gouges
      if (n2 > 0.68) {
        const fissure = (n2 - 0.68) / 0.32;
        r *= 1 - fissure * 0.75;
        g *= 1 - fissure * 0.75;
        b *= 1 - fissure * 0.75;
      }

      // Soot burn stains in lower portions
      if (n1 < 0.25) {
        r *= 0.5;
        g *= 0.5;
        b *= 0.5;
      }

      // Bayer Dither + Quantization
      r = quantize(applyBayerDither(r, x, y, 16), 8);
      g = quantize(applyBayerDither(g, x, y, 16), 8);
      b = quantize(applyBayerDither(b, x, y, 16), 8);

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

const outDir = path.resolve('public', 'assets', 'textures');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating grimy Quake/PS1 retro textures into:', outDir);

fs.writeFileSync(path.join(outDir, 'stone_floor.png'), createPNG(SIZE, SIZE, generateStoneFloor()));
console.log('✓ stone_floor.png generated (128x128 Bayer-dithered Quake flagstones)');

fs.writeFileSync(path.join(outDir, 'dungeon_wall.png'), createPNG(SIZE, SIZE, generateDungeonWall()));
console.log('✓ dungeon_wall.png generated (128x128 Bayer-dithered dungeon masonry)');

fs.writeFileSync(path.join(outDir, 'rusted_iron.png'), createPNG(SIZE, SIZE, generateRustedIron()));
console.log('✓ rusted_iron.png generated (128x128 Bayer-dithered corroded iron & rivets)');

fs.writeFileSync(path.join(outDir, 'crypt_stone.png'), createPNG(SIZE, SIZE, generateCryptStone()));
console.log('✓ crypt_stone.png generated (128x128 Bayer-dithered basalt crypt stone)');

console.log('All 4 gritty retro textures successfully regenerated!');
