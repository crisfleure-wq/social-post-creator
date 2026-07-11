#!/usr/bin/env node
/**
 * Renderer V3 — gera 1 imagem via provider chain (Pollinations → Together → Google AI → OpenAI).
 * Substitui render-single.mjs com fallback automático entre providers.
 *
 * Uso: node --env-file=.env scripts/render-image.mjs <output-dir> --client=<slug>
 *   ou: node scripts/render-image.mjs <output-dir> --client=<slug>  (sem .env, usa providers sem key)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { generateImage, DEFAULT_CHAIN } from './lib/image-providers.mjs';
import { loadClient } from './lib/client-loader.mjs';

const MAX_HASHTAGS = 5;
const ALLOWED_SIZES = ['1024x1024', '1024x1536', '1536x1024'];
const ALLOWED_QUALITY = ['low', 'medium', 'high', 'auto'];

const PromptSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  size: z.enum(ALLOWED_SIZES),
  quality: z.enum(ALLOWED_QUALITY),
  headline: z.string().min(1).max(80),
  prompt: z.string().min(80).max(4000),
  scene_summary_pt: z.string().min(1).max(280),
  source: z.object({
    title: z.string(),
    url: z.string().url(),
    publishedAt: z.string(),
  }),
});

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`• ${msg}`);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function parseFlags(args) {
  let clientSlug = null;
  let sizeOverride = null;
  for (const arg of args) {
    if (arg.startsWith('--client=')) clientSlug = arg.split('=')[1];
    if (arg.startsWith('--size=')) sizeOverride = arg.split('=')[1];
  }
  return { clientSlug, sizeOverride };
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) fail('Uso: node scripts/render-image.mjs <output-dir> --client=<slug>');

  const absDir = resolve(outputDir);
  if (!existsSync(absDir)) fail(`Diretório não existe: ${absDir}`);

  const { clientSlug, sizeOverride } = parseFlags(process.argv.slice(3));

  // Resolve provider chain from client config
  let providerChain = DEFAULT_CHAIN;
  let maxHashtags = MAX_HASHTAGS;

  if (clientSlug) {
    try {
      const { config } = loadClient(clientSlug, null);
      if (config.imageGeneration?.providerChain) {
        providerChain = config.imageGeneration.providerChain;
      }
      maxHashtags = config.caption?.maxHashtags ?? MAX_HASHTAGS;
    } catch (_) {
      // Client not found or no format check needed — use defaults
    }
  }

  const promptPath = join(absDir, 'image-prompt.json');
  const captionPath = join(absDir, 'caption.txt');
  const outputPng = join(absDir, 'post.png');
  const metaPath = join(absDir, 'meta.json');
  const promptReadyPath = join(absDir, 'prompt-ready.md');

  if (!existsSync(promptPath)) fail(`image-prompt.json não encontrado: ${promptPath}`);
  if (!existsSync(captionPath)) fail(`caption.txt não encontrado: ${captionPath}`);

  info('lendo image-prompt.json');
  const raw = JSON.parse(await readFile(promptPath, 'utf8'));
  const promptDoc = PromptSchema.parse(raw);

  // Apply size from client format config or override
  let size = promptDoc.size;
  if (sizeOverride === '9x16') size = '1080x1920';
  else if (sizeOverride === '1x1') size = '1080x1440';
  else if (clientSlug) {
    // Use client canvas dimensions
    try {
      const { formatConfig } = loadClient(clientSlug, null);
      // Try to infer from estatico or reels-cover config
    } catch(_) {}
    // Default: use prompt size but map to 3:4 for feed
    if (size === '1024x1024') size = '1080x1440';
    else if (size === '1024x1536') size = '1080x1920';
  }

  info(`validando caption.txt (≤${maxHashtags} hashtags)`);
  const caption = await readFile(captionPath, 'utf8');
  const hashtags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (hashtags.length > maxHashtags) {
    fail(`caption.txt tem ${hashtags.length} hashtags (máx ${maxHashtags})`);
  }

  info(`providers disponíveis: [${providerChain.join(', ')}]`);
  info(`gerando imagem (size=${size}, quality=${promptDoc.quality})`);
  const t0 = Date.now();

  const result = await generateImage(promptDoc.prompt, size, promptDoc.quality, providerChain);

  if (result.promptReady) {
    // All providers failed — write prompt-ready.md
    const instructions = `# Prompt pronto para geração manual

Todos os providers automáticos falharam. Cole o prompt abaixo no ChatGPT ou Gemini para gerar a imagem.

## Configurações
- **Tamanho:** ${size}
- **Qualidade:** ${promptDoc.quality}
- **Headline na imagem:** ${promptDoc.headline}

## Prompt (cole inteiro):

${promptDoc.prompt}

## Erros dos providers:
${(result.errors || []).map(e => `- **${e.provider}**: ${e.error}`).join('\n')}

## Depois de gerar:
1. Salve a imagem como \`post.png\` nesta pasta:
   \`${absDir}\`
2. O pipeline continuará a partir daí.
`;
    await writeFile(promptReadyPath, instructions);
    console.log('');
    console.log('⚠  Nenhum provider conseguiu gerar. Arquivo salvo:');
    console.log(`   ${promptReadyPath}`);
    console.log('');
    console.log('   Cole o prompt no ChatGPT ou Gemini e salve como post.png nesta pasta.');
    process.exit(2); // Exit code 2 = prompt-ready mode
  }

  // Success — write image
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  info(`imagem recebida em ${elapsed}s via ${result.provider} — gravando post.png`);
  await writeFile(outputPng, result.buffer);

  // Write meta
  const meta = {
    createdAt: new Date().toISOString(),
    provider: result.provider,
    size,
    quality: promptDoc.quality,
    headline: promptDoc.headline,
    sceneSummary: promptDoc.scene_summary_pt,
    source: promptDoc.source,
    hashtags: hashtags.length,
    elapsedSeconds: parseFloat(elapsed),
    providerChain,
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2));

  ok(`post.png gerado via ${result.provider} · ${size} · ${hashtags.length} hashtag(s)`);
  ok('meta.json escrito');
}

main().catch((err) => {
  if (err instanceof z.ZodError) {
    fail(`image-prompt.json inválido:\n${JSON.stringify(err.issues, null, 2)}`);
  }
  fail(err.stack || String(err));
});
