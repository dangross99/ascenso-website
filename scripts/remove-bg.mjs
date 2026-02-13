#!/usr/bin/env node
/**
 * Background remover via remove.bg API
 * Usage:
 *   REMOVE_BG_API_KEY=xxxxx node scripts/remove-bg.mjs --input=public/images/IMG.png --output=public/images/IMG.png
 *
 * Notes:
 * - Requires Node 18+ (built-in fetch/FormData from undici).
 * - If --output not provided, writes alongside input with suffix ".transparent.png".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.REMOVE_BG_API_KEY;
if (!apiKey) {
  console.error("ERROR: Please set REMOVE_BG_API_KEY environment variable.");
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv);
const inputPath = args.input || args.i;
if (!inputPath) {
  console.error("Usage: node scripts/remove-bg.mjs --input=public/images/file.png [--output=public/images/out.png]");
  process.exit(1);
}

const resolvedInput = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(resolvedInput)) {
  console.error(`ERROR: Input not found: ${resolvedInput}`);
  process.exit(1);
}

const ext = path.extname(resolvedInput);
const base = resolvedInput.slice(0, -ext.length);
const outputPath = path.resolve(process.cwd(), args.output || `${base}.transparent.png`);

async function run() {
  const form = new FormData();
  // Node 18 FormData supports ReadStream
  form.append("image_file", fs.createReadStream(resolvedInput), path.basename(resolvedInput));
  form.append("size", "auto");
  form.append("format", "png");
  // If you prefer flattening to brand background instead of transparency:
  // form.append("bg_color", "transparent"); // default when format=png

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("remove.bg failed:", res.status, res.statusText, text);
    process.exit(1);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
  console.log(`Saved: ${path.relative(process.cwd(), outputPath)}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


