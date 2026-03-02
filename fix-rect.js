const fs = require('fs');
const path = 'src/app/live/stairs/models/rect.tsx';
let s = fs.readFileSync(path, 'utf8');

// Remove the broken wood block (const axisTop ... bumpMap) and the duplicate "const metalness" line
const old = [
  '\t\t\t\t\t\t\tconst axisTop = axisFromYaw(t.rotation[1] as number);',
  '\n\t\t\t\t\t\t\t// Top: טקסטורה יציבה לפי ציר בלבד (ללא flip), כדי לא "תהפך" בין גרמים',
  '\n\t\t\t\t\t\t\tconst ft = buildFaceTextures(t.run, treadWidth, axisTop === \'z\');',
  '\n\t\t\t\t\t\t\treturn (',
  '\n\t\t\t\t\t\t\t\t<meshStandardMaterial',
  '\n\t\t\t\t\t\t\t\t\tcolor={\'#ffffff\'}',
  '\n\t\t\t\t\t\t\t\t\tmap={ft.color}',
  '\n\t\t\t\t\t\t\t\t\troughnessMap={ft.rough as any}',
  '\n\t\t\t\t\t\t\t\t\tbumpMap={ft.bump as any}',
  '\n\t\t\t\t\t\t\tconst metalness = materialKind === \'metal\' ? 1 : 0;',
].join('');

const newStr = '\t\t\t\t\t\t\tconst metalness = materialKind === \'metal\' ? 1 : 0;';

if (s.includes(old)) {
  s = s.replace(old, newStr);
  fs.writeFileSync(path, s);
  console.log('Fixed');
} else {
  console.log('Pattern not found, trying alternative');
  // Try without the comment line
  const old2 = 'const axisTop = axisFromYaw(t.rotation[1] as number);\n\t\t\t\t\t\t\t// Top:';
  if (s.includes(old2)) {
    const idx = s.indexOf('const metalness = materialKind');
    const prev = s.lastIndexOf('const axisTop', idx);
    if (prev !== -1) {
      s = s.slice(0, prev) + '\t\t\t\t\t\t\tconst metalness = materialKind === \'metal\' ? 1 : 0;\n\t\t\t\t\t\t\tconst roughness' + s.slice(s.indexOf('const roughness', idx));
      // Now remove from the duplicate "const roughness" back to the removed axisTop... we need to remove the whole wood block
      // This is getting complex. Let me try simpler: remove from "const axisTop" through "bumpMap={ft.bump as any}\n\t\t\t\t\t\t\t"
      const start = s.indexOf('\t\t\t\t\t\t\tconst axisTop');
      const end = s.indexOf('const metalness = materialKind', start);
      if (start !== -1 && end !== -1) {
        const fragment = s.slice(start, end);
        if (fragment.includes('bumpMap={ft.bump as any}')) {
          s = s.slice(0, start) + '\t\t\t\t\t\t\tconst metalness = materialKind === \'metal\' ? 1 : 0;\n\t\t\t\t\t\t\tconst roughness' + s.slice(end + 'const metalness = materialKind === \'metal\' ? 1 : 0;\n\t\t\t\t\t\t\tconst roughness'.length);
          fs.writeFileSync(path, s);
          console.log('Fixed alt');
        }
      }
    }
  }
}
