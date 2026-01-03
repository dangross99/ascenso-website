#!/usr/bin/env node
/**
 * Bake 6 color variants for all wood models using reference colors from wave-carved.
 * Reference folder (required):
 *   assets/materials_src/wood/wave-carved/wave-carved-<color>.png
 * Colors: black, graphite, white, natural, walnut, oak
 *
 * For every model folder under assets/materials_src/wood/<slug>/ that contains <slug>.<ext> (base),
 * generate <slug>-<color>.png by:
 *  - grayscale base (preserve luminance texture)
 *  - tint to reference mean RGB color
 *  - adjust brightness (linear/gamma) to roughly match reference luminance mean
 *
 * Usage:
 *   node scripts/bake-wood-variants-from-ref.mjs assets/materials_src/wood
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , woodRootArg] = process.argv;
const woodRoot = woodRootArg || 'assets/materials_src/wood';
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const COLORS = ['black','graphite','white','natural','walnut','oak'];
const REF_SLUG = 'wave-carved';

async function readRefColorStats(rootDir) {
  const refDir = path.join(rootDir, REF_SLUG);
  const statsByColor = {};
  for (const c of COLORS) {
    const refFile = path.join(refDir, `${REF_SLUG}-${c}.png`);
    const st = await sharp(refFile).stats();
    const r = st.channels[0].mean;
    const g = st.channels[1].mean;
    const b = st.channels[2].mean;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // approx hex from means
    const hex = `#${[r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('')}`;
    statsByColor[c] = { r, g, b, hex, luma };
  }
  return statsByColor;
}

async function listModelDirs(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries.filter(d => d.isDirectory()).map(d => path.join(rootDir, d.name)).filter(p => path.basename(p) !== REF_SLUG);
}

async function findBase(rootDir, dir) {
  const slug = path.basename(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!allowed.has(ext)) continue;
    if (path.basename(e.name, ext).toLowerCase() === slug.toLowerCase()) {
      return path.join(dir, e.name);
    }
  }
  return null;
}

async function bakeVariant(baseFile, slug, colorId, ref) {
  const dir = path.dirname(baseFile);
  const out = path.join(dir, `${slug}-${colorId}.png`);
  try {
    await fs.access(out);
    // overwrite to ensure latest mapping
  } catch {}

  // compute base luma mean
  const baseStats = await sharp(baseFile).stats();
  const br = baseStats.channels[0].mean;
  const bg = baseStats.channels[1].mean;
  const bb = baseStats.channels[2].mean;
  const baseLuma = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;

  // target adjustments
  const targetLuma = ref.luma;
  // Linear add computed to match luma roughly (keep within [-50, 50])
  let linearAdd = Math.max(-50, Math.min(50, targetLuma - baseLuma));
  // Small gamma tweak: brighten whites slightly, darken blacks slightly
  let gamma = colorId === 'white' ? 1.06 : colorId === 'black' ? 1.18 : 1.0;

  let s = sharp(baseFile).rotate().normalize().modulate({ saturation: 0.0 }).tint(ref.hex);
  if (gamma !== 1.0) s = s.gamma(gamma);
  if (Math.abs(linearAdd) > 1) s = s.linear(1, linearAdd);
  await s.png({ quality: 92 }).toFile(out);
  return out;
}

async function main() {
  const refs = await readRefColorStats(woodRoot);
  const modelDirs = await listModelDirs(woodRoot);
  for (const dir of modelDirs) {
    const slug = path.basename(dir);
    const base = await findBase(woodRoot, dir);
    if (!base) {
      // Already pre-baked model or non-standard; skip
      continue;
    }
    console.log('Baking from reference for', slug);
    for (const c of COLORS) {
      const out = await bakeVariant(base, slug, c, refs[c]);
      console.log('Created:', path.relative('.', out));
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


