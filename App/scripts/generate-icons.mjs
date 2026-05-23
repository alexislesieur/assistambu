import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

const svg = readFileSync('./public/logo.svg');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync('./public/icons', { recursive: true });

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}x${size}.png`);
  console.log(`✅ icon-${size}x${size}.png`);
}
