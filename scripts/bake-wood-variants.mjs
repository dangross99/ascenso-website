#!/usr/bin/env node
/**
 * Bake 6 color variants (black, graphite, white, natural, walnut, oak)
 * for every wood model folder that has a single base image <slug>.<ext>.
 * Outputs PNG files next to the base image:
 *   <slug>-black.png, <slug>-graphite.png, ...
 *
 * Usage:
 *   node scripts/bake-wood-variants.mjs assets/materials_src/wood
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , woodDirArg] = process.argv;
const woodDir = woodDirArg || 'assets/materials_src/wood';
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const WOOD_TONES = {
  black:   { hex: '#000000', brightness: 0.70, saturation: 0.95, gamma: 1.20, linearMul: 1.06, linearAdd: -20 },
  graphite:{ hex: '#3E3E3E', brightness: 0.86, saturation: 0.95 },
  white:   { hex: '#FFFFFF', brightness: 1.18, saturation: 0.45, gamma: 1.08, linearMul: 1.0,  linearAdd: 10 },
  natural: { hex: '#D5C4A1', brightness: 1.04, saturation: 1.00 },
  walnut:  { hex: '#7B5A39', brightness: 0.96, saturation: 1.05 },
  oak:     { hex: '#C8A165', brightness: 1.02, saturation: 1.05 },
};
const ORDER = ['black','graphite','white','natural','walnut','oak'];

async function listDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter(d => d.isDirectory()).map(d => path.join(dir, d.name));
}

async function findBaseImage(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  // slug is the directory name
  const slug = path.basename(dir);
  const candidates = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return allowed.has(ext) && path.basename(f, ext).toLowerCase() === slug.toLowerCase();
  });
  if (candidates.length === 0) return null;
  return path.join(dir, candidates[0]);
}

async function bakeVariant(baseFile, slug, colorId) {
  const tone = WOOD_TONES[colorId];
  const dir = path.dirname(baseFile);
  const out = path.join(dir, `${slug}-${colorId}.png`);
  try {
    await fs.access(out);
    // already exists
    return { out, skipped: true };
  } catch {}

  const p = sharp(baseFile).rotate().normalize();
  let s = p.clone().modulate({ saturation: 0.0 }).tint(tone.hex).modulate({
    saturation: tone.saturation ?? 1.0,
    brightness: tone.brightness ?? 1.0,
  });
  if (typeof tone.gamma === 'number') {
    s = s.gamma(tone.gamma);
  }
  if (typeof tone.linearMul === 'number' || typeof tone.linearAdd === 'number') {
    s = s.linear(tone.linearMul ?? 1, tone.linearAdd ?? 0);
  }
  await s.png({ quality: 90 }).toFile(out);
  return { out, skipped: false };
}

async function main() {
  const modelDirs = await listDirs(woodDir);
  for (const dir of modelDirs) {
    const slug = path.basename(dir);
    const base = await findBaseImage(dir);
    if (!base) {
      // might already be a fully baked model like wave-carved; skip
      continue;
    }
    console.log('Baking variants for', slug, 'from', path.basename(base));
    for (const colorId of ORDER) {
      const res = await bakeVariant(base, slug, colorId);
      console.log(res.skipped ? 'Exists:' : 'Created:', path.relative('.', res.out));
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


