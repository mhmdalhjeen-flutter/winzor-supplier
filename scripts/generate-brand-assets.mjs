/**
 * Regenerates public brand icons and social preview images from the store panel logo.
 * Run: npm run generate:brand
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceLogo = path.join(root, 'assets/logo/win-goldenstore-logo-store.png');
const brandDir = path.join(root, 'public/brand');
const publicDir = path.join(root, 'public');

const LOGO_SIZES = [64, 128, 192, 256, 384, 512];
const MASKABLE_SIZES = [192, 512];
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_BG = '#f1f5f9';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function resizeLogo(size, outPath, { maskable = false } = {}) {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskable ? '#2563eb' : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const inset = maskable ? Math.round(size * 0.12) : 0;
  const inner = size - inset * 2;

  const logo = await sharp(sourceLogo)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await canvas
    .composite([{ input: logo, gravity: 'centre' }])
    .webp({ quality: 90, effort: 6 })
    .toFile(outPath);
}

async function resizeLogoPng(size, outPath) {
  await sharp(sourceLogo)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

async function writeFavicon() {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(sourceLogo)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );

  await fs.writeFile(path.join(brandDir, 'favicon.ico'), pngBuffers[1]);
}

async function writeOgImages() {
  const logoSize = 420;
  const logo = await sharp(sourceLogo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ogBase = sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 3,
      background: OG_BG,
    },
  }).composite([{ input: logo, gravity: 'centre' }]);

  await ogBase.clone().webp({ quality: 88 }).toFile(path.join(publicDir, 'og-image.webp'));
  await ogBase.clone().png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'og-image.png'));

  const shareSize = 512;
  const shareLogo = await sharp(sourceLogo)
    .resize(Math.round(shareSize * 0.82), Math.round(shareSize * 0.82), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: shareSize,
      height: shareSize,
      channels: 3,
      background: OG_BG,
    },
  })
    .composite([{ input: shareLogo, gravity: 'centre' }])
    .webp({ quality: 90 })
    .toFile(path.join(brandDir, 'og-share.webp'));
}

async function main() {
  await ensureDir(brandDir);

  for (const size of LOGO_SIZES) {
    await resizeLogo(size, path.join(brandDir, `logo-${size}.webp`));
  }

  await resizeLogoPng(64, path.join(brandDir, 'logo-64.png'));

  for (const size of MASKABLE_SIZES) {
    await resizeLogo(size, path.join(brandDir, `logo-${size}-maskable.webp`), { maskable: true });
  }

  await writeFavicon();
  await writeOgImages();

  console.log('Store brand assets generated from:', sourceLogo);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
