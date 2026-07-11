#!/usr/bin/env node
/**
 * CLI helper: resolve slug + versão.
 * Uso: node scripts/lib/_cli-resolve-output.mjs <clientSlug> <tema> [formato]
 */
import { resolveOutputDir } from './slug.mjs';

const clientSlug = process.argv[2];
const tema = process.argv[3];
const formato = process.argv[4] || 'carrossel';

if (!clientSlug || !tema) {
  console.error('Uso: _cli-resolve-output.mjs <clientSlug> <tema> [formato]');
  process.exit(1);
}

try {
  const r = resolveOutputDir(process.cwd(), tema, formato, clientSlug);
  console.log(JSON.stringify(r));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
