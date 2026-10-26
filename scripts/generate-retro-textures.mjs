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
  // pixelDataRGBA is Buffer of length width * height * 4
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Non-interlaced

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw scanlines with filter byte 0x00 at start of each line
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

// Pseudo-random noise helper
function pseudoNoise(x, y, seed = 1337) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

// Tileable perlin-like noise
function smoothNoise(x, y, size, seed) {
  const sx = (x % size + size) % size;
  const sy = (y % size + size) % size;
  let val = 0;
  let scale = 1;
  let total = 0;
  for (let oct = 0; oct < 4; oct++) {
    const freq = Math.pow(2, oct);
    const nx = Math.floor(sx * freq / size) % freq;
    const ny = Math.floor(sy * freq / size) % freq;
    val += pseudoNoise(nx, ny, seed + oct * 53) * scale;
    total += scale;
    scale *= 0.5;
  }
  return val / total;
}

const SIZE = 256;

// 1. Stone Floor (Cracked dark flagstone tiles with moss & grime seams)
function generateStoneFloor() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const tileSize = 64; // 4x4 tiles
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const lx = x % tileSize;
      const ly = y % tileSize;

      // Base tile color variation
      const tileSeed = tileX * 17 + tileY * 31;
      const tileTone = 0.85 + 0.3 * pseudoNoise(tileX, tileY, tileSeed);

      // Noise grain
      const grain = 0.88 + 0.24 * smoothNoise(x, y, SIZE, 42);

      // Distance to border (mortar lines)
      const edgeDist = Math.min(lx, tileSize - 1 - lx, ly, tileSize - 1 - ly);
      let r = 70 * tileTone * grain;
      let g = 74 * tileTone * grain;
      let b = 80 * tileTone * grain;

      // Mortar grooves (3px wide)
      if (edgeDist < 3) {
        const mortarDepth = (3 - edgeDist) / 3;
        r *= 0.35 * (1 - mortarDepth * 0.5);
        g *= 0.38 * (1 - mortarDepth * 0.5);
        b *= 0.40 * (1 - mortarDepth * 0.5);
        // Hint of dark green/moss in groove
        g += 10 * mortarDepth;
      }

      // Occasional crack in flagstone
      const crack = pseudoNoise(Math.floor(x / 4), Math.floor(y / 4), 999);
      if (crack > 0.94 && edgeDist > 5) {
        r *= 0.5;
        g *= 0.5;
        b *= 0.5;
      }

      buf[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      buf[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      buf[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 2. Dungeon Wall (Ash-grey masonry blocks with weathered chiseling)
function generateDungeonWall() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const blockH = 32; // 8 rows
  const blockW = 64; // staggered columns
  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / blockH);
    const rowY = y % blockH;
    const shift = (row % 2) * (blockW / 2);
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const shiftedX = (x + shift) % SIZE;
      const col = Math.floor(shiftedX / blockW);
      const colX = shiftedX % blockW;

      const blockSeed = row * 43 + col * 19;
      const blockTone = 0.8 + 0.35 * pseudoNoise(row, col, blockSeed);
      const grain = 0.85 + 0.28 * smoothNoise(x, y, SIZE, 107);

      const edgeDistX = Math.min(colX, blockW - 1 - colX);
      const edgeDistY = Math.min(rowY, blockH - 1 - rowY);
      const edgeDist = Math.min(edgeDistX, edgeDistY);

      let r = 85 * blockTone * grain;
      let g = 88 * blockTone * grain;
      let b = 92 * blockTone * grain;

      // Dark mortar groove
      if (edgeDist < 2) {
        r = 30 + pseudoNoise(x, y, 7) * 15;
        g = 32 + pseudoNoise(x, y, 8) * 15;
        b = 35 + pseudoNoise(x, y, 9) * 15;
      } else if (edgeDist === 2) {
        // Chiseled bevel highlight / shadow
        if (rowY === 2 || colX === 2) {
          r *= 1.25;
          g *= 1.25;
          b *= 1.25;
        } else {
          r *= 0.75;
          g *= 0.75;
          b *= 0.75;
        }
      }

      buf[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      buf[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      buf[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 3. Rusted Iron (Corroded dark iron plates with rust pitting and rivets)
function generateRustedIron() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const panelSize = 128; // 2x2 metal plates
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const lx = x % panelSize;
      const ly = y % panelSize;
      const edgeDist = Math.min(lx, panelSize - 1 - lx, ly, panelSize - 1 - ly);

      const noise1 = smoothNoise(x, y, SIZE, 301);
      const noise2 = smoothNoise(x * 2, y * 2, SIZE, 512);

      // Base gunmetal
      let r = 55 + noise1 * 30;
      let g = 58 + noise1 * 30;
      let b = 62 + noise1 * 32;

      // Rust patches (orange-brown oxidation)
      const rustThreshold = 0.52;
      if (noise2 > rustThreshold) {
        const rustIntensity = (noise2 - rustThreshold) / (1 - rustThreshold);
        r = r * (1 - rustIntensity) + 140 * rustIntensity;
        g = g * (1 - rustIntensity) + 65 * rustIntensity;
        b = b * (1 - rustIntensity) + 25 * rustIntensity;
      }

      // Seam groove
      if (edgeDist < 2) {
        r *= 0.35;
        g *= 0.35;
        b *= 0.35;
      }

      // Iron Rivets placed in corners of panels
      const rivetPositions = [
        [16, 16], [panelSize - 16, 16],
        [16, panelSize - 16], [panelSize - 16, panelSize - 16]
      ];
      for (const [rx, ry] of rivetPositions) {
        const dx = lx - rx;
        const dy = ly - ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          if (dist < 3) {
            // Rivet cap highlight
            r = Math.min(255, r * 1.5 + 30);
            g = Math.min(255, g * 1.5 + 30);
            b = Math.min(255, b * 1.5 + 35);
          } else {
            // Rivet shadow ring
            r *= 0.4;
            g *= 0.4;
            b *= 0.4;
          }
        }
      }

      buf[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      buf[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      buf[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// 4. Crypt Stone (Granite / basalt monolith with coarse chiseled grain)
function generateCryptStone() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      const n1 = smoothNoise(x, y, SIZE, 777);
      const n2 = pseudoNoise(x, y, 991);
      const grain = 0.8 + 0.35 * n1 + 0.1 * n2;

      // Dark basalt granite tone
      let r = 62 * grain;
      let g = 64 * grain;
      let b = 68 * grain;

      // Subtle horizontal chisel striations
      if ((y % 16) === 0) {
        r *= 0.8;
        g *= 0.8;
        b *= 0.8;
      }

      buf[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      buf[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      buf[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

const outDir = path.resolve('public', 'assets', 'textures');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating retro textures into:', outDir);

fs.writeFileSync(path.join(outDir, 'stone_floor.png'), createPNG(SIZE, SIZE, generateStoneFloor()));
console.log('✓ stone_floor.png generated');

fs.writeFileSync(path.join(outDir, 'dungeon_wall.png'), createPNG(SIZE, SIZE, generateDungeonWall()));
console.log('✓ dungeon_wall.png generated');

fs.writeFileSync(path.join(outDir, 'rusted_iron.png'), createPNG(SIZE, SIZE, generateRustedIron()));
console.log('✓ rusted_iron.png generated');

fs.writeFileSync(path.join(outDir, 'crypt_stone.png'), createPNG(SIZE, SIZE, generateCryptStone()));
console.log('✓ crypt_stone.png generated');

console.log('All 4 retro textures successfully generated!');
