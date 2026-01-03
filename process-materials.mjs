#!/usr/bin/env node
/**
 * Batch process material images (no DB):
 * - trims black bars
 * - normalizes, light sharpen
 * - crops/resize to 3:5 portrait with cover
 * - outputs WebP/AVIF at multiple widths
 * - updates/creates public/data/materials.json entries
 *
 * Usage:
 *   node scripts/process-materials.mjs <srcDir> <outDir>
 *
 * Example:
 *   node scripts/process-materials.mjs assets/materials_src public/images/materials
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const [, , srcDirArg, outDirArg, ...restArgs] = process.argv;
const srcDir = srcDirArg || 'assets/materials_src';
const outDir = outDirArg || 'public/images/materials';
const dataJsonPath = 'public/data/materials.json';
const CLEAN = restArgs.includes('--clean');
const FAST = restArgs.includes('--fast');
const NO_AVIF = restArgs.includes('--no-avif') || FAST;

function parseWidthsArg(args) {
  const wArg = args.find(a => a.startsWith('--widths='));
  if (!wArg) return null;
  try {
    const list = wArg.split('=')[1]
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n) && n > 0);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

const defaultWidths = [400, 700, 1000];
const widths = parseWidthsArg(restArgs) || (FAST ? [600] : defaultWidths);

function parseTonesArg(args) {
  const tArg = args.find(a => a.startsWith('--tones='));
  if (!tArg) return null;
  const list = tArg.split('=')[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.length ? new Set(list) : null;
}
const SELECTED_TONES = parseTonesArg(restArgs);
// RUN_ID for cache-busting filenames
const RUN_ID = Date.now();
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Wood tone variants – generate realistic recolored outputs for wood while preserving texture
const WOOD_TONES = {
  oak:    { label: 'אלון טבעי', hex: '#C8A165', brightness: 1.02, saturation: 1.05 },
  walnut: { label: 'וולנט',     hex: '#7B5A39', brightness: 0.96, saturation: 1.05 },
  smoked: { label: 'מעושן',     hex: '#5A4A3A', brightness: 0.92, saturation: 1.05 },
  ash:    { label: 'אפר בהיר',  hex: '#D8C3A3', brightness: 1.06, saturation: 1.05 },
  wenge:  { label: 'וונגה',     hex: '#3E2A1D', brightness: 0.88, saturation: 1.08 },
  // לשחור/לבן מוסיפים התאמות gamma/linear לעומק נכון תוך שימור גרעין העץ
  white:  { label: 'לבן',       hex: '#FFFFFF', brightness: 1.18, saturation: 0.45, gamma: 1.08, linearMul: 1.0,  linearAdd: 10 },
  black:  { label: 'שחור',      hex: '#000000', brightness: 0.70, saturation: 0.95, gamma: 1.20, linearMul: 1.06, linearAdd: -20 },
  natural:{ label: 'טבעי בהיר', hex: '#D5C4A1', brightness: 1.04, saturation: 1.00 },
  graphite:{ label: 'גרפיט',    hex: '#3E3E3E', brightness: 0.86, saturation: 0.95 },
};

const COLOR_IDS = new Set(Object.keys(WOOD_TONES));

const defaultCategoryByFolder = (folder) => {
  const f = folder.toLowerCase();
  if (f.includes('wood') || f.includes('oak')) return 'wood';
  if (f.includes('metal') || f.includes('steel') || f.includes('iron')) return 'metal';
  if (f.includes('stone') || f.includes('marble') || f.includes('granite')) return 'stone';
  return 'metal';
};

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(p));
    else if (supported.has(path.extname(e.name).toLowerCase())) files.push(p);
  }
  return files;
}

const ensureDir = async (d) => fs.mkdir(d, { recursive: true });

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

async function loadJson() {
  try {
    const raw = await fs.readFile(dataJsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveJson(list) {
  const pretty = JSON.stringify(list, null, 2);
  await ensureDir(path.dirname(dataJsonPath));
  await fs.writeFile(dataJsonPath, pretty, 'utf8');
}

async function cleanOutDir() {
  try {
    await ensureDir(outDir);
    const files = await fs.readdir(outDir);
    const targets = files.filter((f) => f.endsWith('.webp') || f.endsWith('.avif'));
    for (const f of targets) {
      const full = path.join(outDir, f);
      try {
        await fs.rm(full, { force: true });
      } catch (e) {
        // Windows can lock files briefly; retry once
        await new Promise(r => setTimeout(r, 200));
        try {
          await fs.rm(full, { force: true });
        } catch (e2) {
          console.warn('Skip removing locked file:', full);
        }
      }
    }
    console.log(`Cleaned ${outDir}`);
  } catch (e) {
    console.warn('Failed to clean outDir', e);
  }
}

async function processImage(srcPath) {
  const rel = path.relative(srcDir, srcPath);
  const folder = path.dirname(rel);
  const base = path.basename(srcPath, path.extname(srcPath));
  const id = slugify(base);
  const category = defaultCategoryByFolder(folder);
  // זיהוי וריאנט ידני לפי שם: <model>-<color>
  let variantOf = null;
  let variantColor = null;
  if (category === 'wood') {
    const m = base.toLowerCase().match(/^(.*?)-([a-z0-9_]+)$/);
    if (m && COLOR_IDS.has(m[2])) {
      variantOf = slugify(m[1]);
      variantColor = m[2];
    }
  }

  await ensureDir(outDir);

  // כלל זהב: עבור וריאנטים עץ מוכנים – לא נוגעים בתאורה/צבעים בכלל.
  // רק rotate + resize ליצוא WebP/AVIF.
  const pipeline =
    category === 'wood' && variantOf
      ? sharp(srcPath).rotate()
      : sharp(srcPath).rotate().trim({ threshold: 10 }).normalize().sharpen(0.5);
  const meta = await pipeline.metadata();
  // מצב "ראשון" – ללא התאמות אדפטיביות
  // Convert to portrait 3:5 aspect using cover crop
  const targetRatio = 3 / 5;
  const inputRatio = (meta.width || 1) / (meta.height || 1);
  let w = meta.width || 1000;
  let h = meta.height || 1600;
  if (inputRatio > targetRatio) {
    // too wide -> crop sides
    h = h;
    w = Math.round(h * targetRatio);
  } else {
    // too tall -> crop top/bottom
    w = w;
    h = Math.round(w / targetRatio);
  }

  const outputs = [];
  for (const width of widths) {
    const outFileWebp = path.join(outDir, `${id}-v${RUN_ID}-${width}.webp`);
    await pipeline
      .clone()
      .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
      .webp({ quality: 78 })
      .toFile(outFileWebp);
    if (!NO_AVIF) {
      const outFileAvif = path.join(outDir, `${id}-v${RUN_ID}-${width}.avif`);
      await pipeline
        .clone()
        .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
        .avif({ quality: 55 })
        .toFile(outFileAvif);
    }
    outputs.push(`/images/materials/${id}-v${RUN_ID}-${width}.webp`);
  }

  // PBR maps לקטגוריות מתכת/אבן: מפות bump ו-roughness לקבלת טקסטורה עשירה
  let pbr = undefined;
  if (category !== 'wood') {
    const bump = [];
    const rough = [];
    for (const width of widths) {
      const outBump = path.join(outDir, `${id}-pbrbump-v${RUN_ID}-${width}.webp`);
      const outRough = path.join(outDir, `${id}-pbrrough-v${RUN_ID}-${width}.webp`);
      await pipeline
        .clone()
        .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
        .greyscale()
        .sharpen(1.2)
        .webp({ quality: 80 })
        .toFile(outBump);
      await pipeline
        .clone()
        .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
        .greyscale()
        .gamma(1.15)
        .webp({ quality: 80 })
        .toFile(outRough);
      bump.push(`/images/materials/${id}-pbrbump-v${RUN_ID}-${width}.webp`);
      rough.push(`/images/materials/${id}-pbrrough-v${RUN_ID}-${width}.webp`);
    }
    pbr = { bump, roughness: rough };
  }

  // For wood, also produce tone variants (5 options) with proper tinting that preserves texture
  let variants = undefined;
  let colors = ['gray'];
  if (category === 'wood' && !variantOf) {
    variants = {};
    const toneEntries = Object.entries(WOOD_TONES).filter(([k]) => !SELECTED_TONES || SELECTED_TONES.has(k));
    colors = toneEntries.map(([k]) => k);
    const pbrVariants = {};
    for (const [toneId, tone] of toneEntries) {
      // מצב "ראשון" – ללא התאמות אדפטיביות
      const adaptFactor = 1.0;
      const toneOutputs = [];
      const bumpOuts = [];
      const roughOuts = [];
      for (const width of widths) {
        const outFileWebp = path.join(outDir, `${id}-${toneId}-v${RUN_ID}-${width}.webp`);
        // Pipeline: desaturate (preserve luminance), tint to tone color, fine-tune brightness/saturation, then resize/export
        let p = pipeline.clone().modulate({ saturation: 0.0 });
        p = p.tint(tone.hex);
        const sat = (tone.saturation ?? 1.05) * (toneId === 'black' ? 0.95 : 1.0);
        const briBase = tone.brightness ?? 1.0;
        const bri = toneId === 'black' ? Math.max(0.45, Math.min(0.95, briBase * (2 - adaptFactor))) : briBase;
        p = p.modulate({ saturation: sat, brightness: bri });
        if (typeof tone.gamma === 'number') {
          const g = toneId === 'black' ? Math.max(1.05, Math.min(1.35, tone.gamma * adaptFactor)) : tone.gamma;
          p = p.gamma(g);
        }
        if (typeof tone.linearMul === 'number' || typeof tone.linearAdd === 'number') {
          const mul = (tone.linearMul ?? 1) * (toneId === 'black' ? adaptFactor : 1);
          const add = (tone.linearAdd ?? 0) * (toneId === 'black' ? adaptFactor : 1);
          p = p.linear(mul, add);
        }
        await p
          .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
          .webp({ quality: 78 })
          .toFile(outFileWebp);
        // PBR maps מהוריאנט הצבוע
        const outBump = path.join(outDir, `${id}-${toneId}-pbrbump-v${RUN_ID}-${width}.webp`);
        const outRough = path.join(outDir, `${id}-${toneId}-pbrrough-v${RUN_ID}-${width}.webp`);
        await p
          .clone()
          .greyscale()
          .sharpen(1.0)
          .webp({ quality: 80 })
          .toFile(outBump);
        await p
          .clone()
          .greyscale()
          .gamma(1.12)
          .webp({ quality: 80 })
          .toFile(outRough);
        bumpOuts.push(`/images/materials/${id}-${toneId}-pbrbump-v${RUN_ID}-${width}.webp`);
        roughOuts.push(`/images/materials/${id}-${toneId}-pbrrough-v${RUN_ID}-${width}.webp`);
        if (!NO_AVIF) {
          const outFileAvif = path.join(outDir, `${id}-${toneId}-v${RUN_ID}-${width}.avif`);
          let pa = pipeline.clone().modulate({ saturation: 0.0 }).tint(tone.hex).modulate({ saturation: sat, brightness: bri });
          if (typeof tone.gamma === 'number') {
            const g = toneId === 'black' ? Math.max(1.05, Math.min(1.35, tone.gamma * adaptFactor)) : tone.gamma;
            pa = pa.gamma(g);
          }
          if (typeof tone.linearMul === 'number' || typeof tone.linearAdd === 'number') {
            const mul = (tone.linearMul ?? 1) * (toneId === 'black' ? adaptFactor : 1);
            const add = (tone.linearAdd ?? 0) * (toneId === 'black' ? adaptFactor : 1);
            pa = pa.linear(mul, add);
          }
          await pa
            .resize({ width, height: Math.round((width / 3) * 5), fit: 'cover', position: 'centre' })
            .avif({ quality: 55 })
            .toFile(outFileAvif);
        }
        toneOutputs.push(`/images/materials/${id}-${toneId}-v${RUN_ID}-${width}.webp`);
      }
      variants[toneId] = toneOutputs;
      pbrVariants[toneId] = { bump: bumpOuts, roughness: roughOuts };
    }
    // צרף גם מפות PBR לפי צבע
    return {
      id,
      name: base,
      category,
      colors,
      price: 3000,
      images: outputs,
      variants,
      pbrVariants,
    };
  }

  return {
    id: variantOf ? variantOf : id,
    name: variantOf ? variantOf : base,
    category,
    colors: variantOf ? [variantColor] : colors,
    price: 3000,
    images: outputs,
    ...(variants ? { variants } : {}),
    ...(pbr ? { pbr } : {}),
    ...(variantOf ? { _variantOf: variantOf, _variantColor: variantColor } : {}),
  };
}

async function main() {
  await ensureDir(outDir);
  if (CLEAN) {
    await cleanOutDir();
  }
  const files = await walk(srcDir);
  if (files.length === 0) {
    console.log(`No images found in ${srcDir}. Put source images there (subfolders by category optional).`);
    return;
  }
  const processed = [];
  for (const f of files) {
    try {
      const rec = await processImage(f);
      processed.push(rec);
      console.log('Processed', f, '->', rec.images[0]);
    } catch (e) {
      console.error('Failed to process', f, e);
    }
  }

  // קיבוץ וריאנטים ידניים (עץ): מאחד לרשומת דגם אחת עם variants
  const manualGroups = new Map(); // id -> {category, name, colors:Set, variants:Map(color->images), defaultImage}
  const singles = [];
  for (const r of processed) {
    if (r._variantOf && r._variantColor) {
      const g = manualGroups.get(r.id) || {
        category: r.category,
        name: r.name,
        colors: new Set(),
        variants: new Map(),
        defaultImage: r.images?.[0],
      };
      g.colors.add(r._variantColor);
      g.variants.set(r._variantColor, r.images || []);
      if (!g.defaultImage || r._variantColor === 'oak') {
        g.defaultImage = r.images?.[0];
      }
      manualGroups.set(r.id, g);
    } else {
      singles.push(r);
    }
  }
  const manualRecords = Array.from(manualGroups.entries()).map(([id, g]) => ({
    id,
    name: id,
    category: g.category,
    colors: Array.from(g.colors),
    price: 3000,
    images: [g.defaultImage],
    variants: Object.fromEntries(g.variants),
  }));

  let finalList;
  if (CLEAN) {
    // replace JSON with only newly processed
    // מניעת כפילויות: אם יש וריאנטים ידניים לדגם עץ – אל תכלול את רשומת הבסיס
    const manualIds = new Set(manualRecords.map(r => r.id));
    const singlesFiltered = singles.filter(r => !(r.category === 'wood' && manualIds.has(r.id)));
    finalList = [...singlesFiltered, ...manualRecords];
  } else {
    const existing = await loadJson();
    // upsert by id
    const map = new Map(existing.map((r) => [r.id, r]));
    const manualIds = new Set(manualRecords.map(r => r.id));
    const singlesFiltered = singles.filter(r => !(r.category === 'wood' && manualIds.has(r.id)));
    for (const r of [...singlesFiltered, ...manualRecords]) {
      map.set(r.id, r);
    }
    finalList = Array.from(map.values());
  }
  await saveJson(finalList);
  console.log(
    `${CLEAN ? 'Rewrote' : 'Updated'} ${dataJsonPath} with ${finalList.length} entries${CLEAN ? ' (clean mode)' : ''}.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


