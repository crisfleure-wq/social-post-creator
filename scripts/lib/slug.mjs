import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Converte string arbitrária em kebab-case ASCII.
 * Remove acentos, baixa caixa, troca não-alfanumérico por hífen.
 */
export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Dado images/carrossel/<slug>/, retorna a próxima versão livre (v1, v2, ...).
 */
export function nextVersion(baseDir) {
  if (!existsSync(baseDir)) return 1;
  const versions = readdirSync(baseDir)
    .filter((n) => /^v\d+$/.test(n))
    .map((n) => parseInt(n.slice(1), 10))
    .filter((n) => Number.isFinite(n));
  if (versions.length === 0) return 1;
  return Math.max(...versions) + 1;
}

/**
 * Resolve o diretório completo: images/carrossel/<slug>/v<N>/.
 */
export function resolveOutputDir(rootDir, theme, format = 'carrossel') {
  const slug = slugify(theme);
  const baseDir = join(rootDir, 'images', format, slug);
  const version = nextVersion(baseDir);
  return {
    slug,
    version,
    baseDir,
    versionDir: join(baseDir, `v${version}`),
  };
}
