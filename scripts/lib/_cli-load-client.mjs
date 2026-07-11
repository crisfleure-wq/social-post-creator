#!/usr/bin/env node
/**
 * CLI helper: carrega contexto do cliente.
 * Uso: node scripts/lib/_cli-load-client.mjs <clientSlug> [format]
 */
import { loadClient } from './client-loader.mjs';

const clientSlug = process.argv[2];
const format = process.argv[3] || null;

if (!clientSlug) {
  console.error('Uso: _cli-load-client.mjs <clientSlug> [format]');
  process.exit(1);
}

try {
  const c = loadClient(clientSlug, format);
  console.log(JSON.stringify(c));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
