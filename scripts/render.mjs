#!/usr/bin/env node
/**
 * Renderer Puppeteer para carrosseis/stories Instagram.
 *
 * Uso: node scripts/render.mjs <output-dir> [--client=<slug>] [--canvas=WxH]
 *
 * Espera <output-dir>/slides.json (formato carousel.json).
 * Gera <output-dir>/html/slide_NN.html e <output-dir>/slides/slide_NN.png.
 * Atualiza <output-dir>/meta.json e valida <output-dir>/caption.txt.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import puppeteer from 'puppeteer';
import { loadClient } from './lib/client-loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Parse --client and --canvas flags
function parseFlags(args) {
  let clientSlug = null;
  let canvasOverride = null;
  for (const arg of args) {
    if (arg.startsWith('--client=')) clientSlug = arg.split('=')[1];
    if (arg.startsWith('--canvas=')) canvasOverride = arg.split('=')[1];
  }
  return { clientSlug, canvasOverride };
}

const { clientSlug, canvasOverride } = parseFlags(process.argv.slice(3));

// Resolve paths: client-aware or legacy fallback
let TEMPLATES_DIR, TOKENS_PATH, MASCOT_PATH, CLIENT_HANDLE, MAX_HASHTAGS;
let CANVAS_W = 1080;
let CANVAS_H = 1440;

if (clientSlug) {
  const format = canvasOverride === '1080x1920' ? 'stories' : 'carrossel';
  const { config, formatConfig, paths } = loadClient(clientSlug, format);
  TEMPLATES_DIR = paths.templatesDir;
  TOKENS_PATH = paths.tokensPath;
  MASCOT_PATH = paths.logoPath || paths.mascotPath;
  CLIENT_HANDLE = config.handle;
  MAX_HASHTAGS = config.caption?.maxHashtags ?? 5;
  CANVAS_W = formatConfig.canvas.width;
  CANVAS_H = formatConfig.canvas.height;
} else {
  // Legacy fallback (brunobracaioli / hacker-carousel)
  const SKILL_DIR = join(PROJECT_ROOT, 'skills', 'hacker-carousel');
  TEMPLATES_DIR = join(SKILL_DIR, 'templates');
  TOKENS_PATH = join(SKILL_DIR, 'tokens.css');
  MASCOT_PATH = join(PROJECT_ROOT, 'public', 'claude-code-icon.png');
  CLIENT_HANDLE = '@brunobracaioli';
  MAX_HASHTAGS = 5;
}

if (canvasOverride) {
  const [w, h] = canvasOverride.split('x').map(Number);
  if (w && h) { CANVAS_W = w; CANVAS_H = h; }
}

const BadgeSchema = z.object({
  text: z.string().min(1).max(40),
  color: z.enum(['primary', 'secondary', 'tertiary']).default('primary'),
});

const TerminalLineSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['comment', 'command', 'arrow']).default('command'),
});

const ItemSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
});

const SlideBase = {
  label: z.string().max(80).optional(),
  title: z.string().min(1).max(160),
  titleAccent: z.string().max(60).optional(),
  titleSize: z.number().int().min(48).max(200).optional(),
  bodySize: z.number().int().min(20).max(60).optional(),
  badgeScale: z.number().min(0.5).max(1.2).optional(),
  badges: z.array(BadgeSchema).max(4).optional(),
};

const CoverSchema = z.object({
  type: z.literal('cover'),
  ...SlideBase,
  terminalPreview: z.string().max(120).optional(),
});

const ContentSchema = z.object({
  type: z.literal('content'),
  ...SlideBase,
  body: z.string().max(280).optional(),
  terminal: z.array(TerminalLineSchema).max(8).optional(),
  steps: z.array(z.string().max(120)).max(5).optional(),
});

const StackSchema = z.object({
  type: z.literal('stack'),
  ...SlideBase,
  items: z.array(ItemSchema).max(4).optional(),
  terminal: z.array(TerminalLineSchema).max(3).optional(),
});

const SlideSchema = z.discriminatedUnion('type', [
  CoverSchema,
  ContentSchema,
  StackSchema,
]);

const CarouselSchema = z.object({
  theme: z.string().optional(),
  title: z.string().optional(),
  slides: z.array(SlideSchema).min(5).max(10),
});

function readAssetDataUri(assetPath) {
  if (!assetPath || !existsSync(assetPath)) return '';
  const buf = readFileSync(assetPath);
  const ext = assetPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

function buildHtml({ slide, tokensCss, logoDataUri, pageLabel, handle }) {
  const templatePath = join(TEMPLATES_DIR, `${slide.type}.html`);
  if (!existsSync(templatePath)) {
    throw new Error(`Template não encontrado para tipo "${slide.type}": ${templatePath}`);
  }
  const tpl = readFileSync(templatePath, 'utf8');
  return tpl
    .replace('{{TOKENS_CSS}}', tokensCss)
    .replace('{{SLIDE_JSON}}', JSON.stringify(slide))
    .replaceAll('{{MASCOT_DATA_URI}}', logoDataUri)
    .replaceAll('{{LOGO_DATA_URI}}', logoDataUri)
    .replaceAll('{{HANDLE}}', handle || '')
    .replaceAll('{{PAGE_LABEL}}', pageLabel);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function validateCaption(captionPath) {
  if (!existsSync(captionPath)) {
    return { warnings: [`caption.txt não encontrado em ${captionPath}`] };
  }
  const text = readFileSync(captionPath, 'utf8');
  const hashtags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  const warnings = [];
  if (hashtags.length > MAX_HASHTAGS) {
    throw new Error(
      `caption.txt tem ${hashtags.length} hashtags (máx ${MAX_HASHTAGS}): ${hashtags.join(' ')}`,
    );
  }
  if (hashtags.length === 0) {
    warnings.push('caption.txt sem hashtags — verifique se é intencional');
  }
  return { warnings, hashtagCount: hashtags.length };
}

async function render(outputDir) {
  const slidesJsonPath = join(outputDir, 'slides.json');
  if (!existsSync(slidesJsonPath)) {
    throw new Error(`slides.json não encontrado em ${slidesJsonPath}`);
  }

  const raw = JSON.parse(readFileSync(slidesJsonPath, 'utf8'));
  const carousel = CarouselSchema.parse(raw);
  console.log(`✓ slides.json válido (${carousel.slides.length} slides)`);

  // Valida titleAccent é substring do title
  for (const [i, s] of carousel.slides.entries()) {
    if (s.titleAccent && !s.title.includes(s.titleAccent)) {
      throw new Error(
        `slide ${i + 1}: titleAccent "${s.titleAccent}" não é substring de title`,
      );
    }
  }

  const tokensCss = readFileSync(TOKENS_PATH, 'utf8');
  const logoDataUri = readAssetDataUri(MASCOT_PATH);

  const htmlDir = join(outputDir, 'html');
  const slidesDir = join(outputDir, 'slides');
  // limpa outputs antigos para idempotência dentro da mesma versão
  if (existsSync(htmlDir)) rmSync(htmlDir, { recursive: true, force: true });
  if (existsSync(slidesDir)) rmSync(slidesDir, { recursive: true, force: true });
  mkdirSync(htmlDir, { recursive: true });
  mkdirSync(slidesDir, { recursive: true });

  const total = carousel.slides.length;
  for (const [i, slide] of carousel.slides.entries()) {
    const num = pad2(i + 1);
    const pageLabel = `${num} / ${pad2(total)}`;
    const html = buildHtml({ slide, tokensCss, logoDataUri, pageLabel, handle: CLIENT_HANDLE });
    const htmlPath = join(htmlDir, `slide_${num}.html`);
    writeFileSync(htmlPath, html);
  }
  console.log(`✓ ${total} HTML(s) gerados em ${htmlDir}`);

  console.log('→ launching puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: CANVAS_W,
      height: CANVAS_H,
      deviceScaleFactor: 1,
    });

    for (let i = 0; i < total; i++) {
      const num = pad2(i + 1);
      const htmlPath = join(htmlDir, `slide_${num}.html`);
      const url = pathToFileURL(htmlPath).href;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      // garante que web fonts terminaram de carregar
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      });
      const pngPath = join(slidesDir, `slide_${num}.png`);
      await page.screenshot({
        path: pngPath,
        type: 'png',
        clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
      });
      console.log(`  ✓ slide_${num}.png`);
    }
  } finally {
    await browser.close();
  }

  // valida legenda (se já existir)
  const captionPath = join(outputDir, 'caption.txt');
  let captionInfo = { warnings: ['caption.txt ausente'] };
  if (existsSync(captionPath)) {
    captionInfo = validateCaption(captionPath);
    console.log(`✓ caption.txt: ${captionInfo.hashtagCount} hashtag(s)`);
  }

  // meta.json
  const metaPath = join(outputDir, 'meta.json');
  const meta = {
    createdAt: new Date().toISOString(),
    canvas: { width: CANVAS_W, height: CANVAS_H },
    slides: total,
    theme: carousel.theme || null,
    title: carousel.title || null,
    captionHashtagCount: captionInfo.hashtagCount ?? null,
    warnings: captionInfo.warnings || [],
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`✓ meta.json escrito`);
  return meta;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('uso: node scripts/render.mjs <output-dir>');
    process.exit(1);
  }
  const outputDir = resolve(arg);
  if (!existsSync(outputDir)) {
    console.error(`diretório não existe: ${outputDir}`);
    process.exit(1);
  }
  try {
    await render(outputDir);
    console.log('done.');
  } catch (err) {
    console.error('render falhou:', err.message || err);
    process.exit(1);
  }
}

main();
