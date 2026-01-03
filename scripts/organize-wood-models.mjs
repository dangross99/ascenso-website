#!/usr/bin/env node
/**
 * Organize base wood images into per-model folders with clean slugs.
 * For each image directly under assets/materials_src/wood (not in subfolders),
 * create a folder assets/materials_src/wood/<slug>/ and move the image inside as <slug>.<ext>
 *
 * Slug format by default: wood-model-01, wood-model-02, ...
 *
 * Usage:
 *   node scripts/organize-wood-models.mjs assets/materials_src/wood
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const [, , woodDirArg] = process.argv;
const woodDir = woodDirArg || 'assets/materials_src/wood';
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function main() {
  const entries = await fs.readdir(woodDir, { withFileTypes: true });
  const baseFiles = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(n => allowed.has(path.extname(n).toLowerCase()));

  let counter = 1;
  for (const file of baseFiles) {
    const ext = path.extname(file).toLowerCase();
    const nameNoExt = path.basename(file, ext);
    const autoSlug = `wood-model-${String(counter).padStart(2, '0')}`;
    // אם לשם המקורי יש אותיות לטיניות – ננסה להשתמש בו, אחרת שם סדרתי
    const hasLatin = /[a-zA-Z]/.test(nameNoExt);
    const baseSlug = hasLatin ? slugify(nameNoExt) : autoSlug;
    const modelDir = path.join(woodDir, baseSlug);
    await fs.mkdir(modelDir, { recursive: true });

    const src = path.join(woodDir, file);
    const dest = path.join(modelDir, `${baseSlug}${ext}`);
    await fs.rename(src, dest);
    console.log('Organized:', file, '->', path.relative('.', dest));
    counter += 1;
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


