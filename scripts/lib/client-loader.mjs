import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const CLIENTS_DIR = join(PROJECT_ROOT, 'clients');

export function listClients() {
  if (!existsSync(CLIENTS_DIR)) return [];
  return readdirSync(CLIENTS_DIR)
    .filter((name) => name !== '_base' && existsSync(join(CLIENTS_DIR, name, 'client.json')));
}

export function loadClient(clientSlug, format) {
  const clientDir = join(CLIENTS_DIR, clientSlug);
  const configPath = join(clientDir, 'client.json');

  if (!existsSync(configPath)) {
    throw new Error(`Cliente não encontrado: "${clientSlug}". Verifique clients/${clientSlug}/client.json`);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  if (format) {
    const formatConfig = config.formats?.[format];
    if (!formatConfig) {
      throw new Error(`Formato "${format}" não definido para o cliente "${clientSlug}".`);
    }
    if (!formatConfig.enabled) {
      throw new Error(`Formato "${format}" está desabilitado para o cliente "${clientSlug}".`);
    }
  }

  const mascotPath = config.identity?.mascotPath
    ? join(clientDir, config.identity.mascotPath)
    : null;

  const logoPath = config.identity?.logoPath
    ? join(clientDir, config.identity.logoPath)
    : null;

  return {
    config,
    formatConfig: format ? config.formats[format] : null,
    paths: {
      clientDir,
      tokensPath: join(clientDir, 'design', 'tokens.css'),
      templatesDir: format
        ? join(clientDir, 'design', 'templates', format)
        : join(clientDir, 'design', 'templates'),
      designSystemPath: join(clientDir, 'design', 'DESIGN.md'),
      mascotPath,
      logoPath,
      briefingPath: join(clientDir, 'briefing.md'),
      personasPath: join(clientDir, 'personas.md'),
      calendarPath: join(clientDir, 'calendar.md'),
      examplesDir: join(clientDir, 'examples'),
      feedbackDir: join(clientDir, 'feedback'),
      learningsPath: join(clientDir, 'feedback', 'learnings.md'),
      metricsPath: join(clientDir, 'feedback', 'metrics.jsonl'),
      fontsDir: join(clientDir, 'design', 'fonts'),
    },
  };
}

export { PROJECT_ROOT, CLIENTS_DIR };
