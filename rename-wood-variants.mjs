#!/usr/bin/env node
/**
 * Rename 6 wood variant images inside a model folder to a canonical naming:
 *   <slug>-black.<ext>, <slug>-graphite.<ext>, <slug>-white.<ext>, <slug>-natural.<ext>, <slug>-walnut.<ext>, <slug>-oak.<ext>
 *
 * Usage:
 *   node scripts/rename-wood-variants.mjs <modelDir> <slug>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , modelDirArg, slugArg] = process.argv;
if (!modelDirArg || !slugArg) {
  console.error('Usage: node scripts/rename-wood-variants.mjs <modelDir> <slug>');
  process.exit(2);
}
const modelDir = modelDirArg;
const slug = slugArg;
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

async function main() {
  const entries = await fs.readdir(modelDir);
  const files = entries
    .filter(f => allowed.has(path.extname(f).toLowerCase()))
    .map(f => path.join(modelDir, f));
  if (files.length < 6) {
    console.error(`Expected 6 images in ${modelDir}, found ${files.length}`);
  }
  const data = [];
  for (const f of files) {
    const st = await sharp(f).stats();
    const [r, g, b] = [st.channels[0].mean, st.channels[1].mean, st.channels[2].mean];
    const { h, s, l } = rgbToHsl(r, g, b);
    data.push({ file: f, r, g, b, h, s, l });
  }

  const labels = ['black', 'graphite', 'white', 'natural', 'walnut', 'oak'];
  const scores = data.map(d => {
    const sc = {
      black:    (100 - d.l) * 2 + (30 - Math.min(d.s, 30)),
      graphite: (70 - Math.abs(d.l - 30)) * 1.5 + (35 - Math.min(d.s, 35)),
      white:    (d.l) * 2 + (30 - Math.min(d.s, 30)),
      natural:  (100 - Math.abs(d.h - 38)) + (d.l) + (50 - Math.abs(d.s - 25)),
      walnut:   (100 - Math.abs(d.h - 25)) + (100 - Math.abs(d.l - 45)) + d.s,
      oak:      (100 - Math.abs(d.h - 40)) + (100 - Math.abs(d.l - 65)) + d.s,
    };
    return { d, sc };
  });

  const assignments = new Map(); // file -> label
  const usedLabels = new Set();
  const usedFiles = new Set();

  while (usedLabels.size < labels.length && usedFiles.size < scores.length) {
    let best = null;
    for (const row of scores) {
      if (usedFiles.has(row.d.file)) continue;
      for (const lab of labels) {
        if (usedLabels.has(lab)) continue;
        const s = row.sc[lab];
        if (!best || s > best.score) {
          best = { file: row.d.file, label: lab, score: s };
        }
      }
    }
    if (!best) break;
    assignments.set(best.file, best.label);
    usedLabels.add(best.label);
    usedFiles.add(best.file);
  }
  // Assign any leftover files arbitrarily to remaining labels
  for (const row of scores) {
    if (!assignments.has(row.d.file)) {
      const remaining = labels.find(l => !Array.from(assignments.values()).includes(l));
      if (remaining) assignments.set(row.d.file, remaining);
    }
  }

  for (const [file, label] of assignments.entries()) {
    const ext = path.extname(file).toLowerCase();
    const target = path.join(modelDir, `${slug}-${label}${ext}`);
    if (path.basename(file).toLowerCase() === path.basename(target).toLowerCase()) {
      console.log('Skip (already named):', path.basename(file));
      continue;
    }
    try {
      await fs.rename(file, target);
      console.log('Renamed:', path.basename(file), '->', path.basename(target));
    } catch (e) {
      console.warn('Failed to rename', file, e);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


