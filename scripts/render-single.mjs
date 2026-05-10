#!/usr/bin/env node
// Renderer V2 — gera 1 imagem via OpenAI gpt-image-1 a partir de image-prompt.json.
// Uso: node --env-file=.env scripts/render-single.mjs <output-dir>
//   ou: OPENAI_API_KEY=sk-... node scripts/render-single.mjs <output-dir>

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const MAX_HASHTAGS = 5;
const ALLOWED_SIZES = ['1024x1024', '1024x1536', '1536x1024'];
const ALLOWED_QUALITY = ['low', 'medium', 'high', 'auto'];

const PromptSchema = z.object({
  model: z.literal('gpt-image-1'),
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

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) fail('Uso: node scripts/render-single.mjs <output-dir>');

  const absDir = resolve(outputDir);
  if (!existsSync(absDir)) fail(`Diretório não existe: ${absDir}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    fail(
      'OPENAI_API_KEY ausente. Defina no .env e rode com: node --env-file=.env scripts/render-single.mjs <dir>'
    );
  }

  const promptPath = join(absDir, 'image-prompt.json');
  const captionPath = join(absDir, 'caption.txt');
  const outputPng = join(absDir, 'post.png');
  const metaPath = join(absDir, 'meta.json');

  if (!existsSync(promptPath)) fail(`image-prompt.json não encontrado: ${promptPath}`);
  if (!existsSync(captionPath)) fail(`caption.txt não encontrado: ${captionPath}`);

  info(`lendo image-prompt.json`);
  const raw = JSON.parse(await readFile(promptPath, 'utf8'));
  const promptDoc = PromptSchema.parse(raw);

  info(`validando caption.txt (≤${MAX_HASHTAGS} hashtags)`);
  const caption = await readFile(captionPath, 'utf8');
  const hashtags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (hashtags.length > MAX_HASHTAGS) {
    fail(`caption.txt tem ${hashtags.length} hashtags (máx ${MAX_HASHTAGS})`);
  }

  info(`gerando imagem (size=${promptDoc.size}, quality=${promptDoc.quality})`);
  const t0 = Date.now();
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: promptDoc.model,
      prompt: promptDoc.prompt,
      size: promptDoc.size,
      quality: promptDoc.quality,
      n: 1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '<no body>');
    fail(`OpenAI API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const body = await res.json();
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) fail(`Resposta sem b64_json: ${JSON.stringify(body).slice(0, 500)}`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  info(`imagem recebida em ${elapsed}s — gravando ${outputPng}`);

  await writeFile(outputPng, Buffer.from(b64, 'base64'));

  const meta = {
    createdAt: new Date().toISOString(),
    model: promptDoc.model,
    size: promptDoc.size,
    quality: promptDoc.quality,
    headline: promptDoc.headline,
    sceneSummary: promptDoc.scene_summary_pt,
    source: promptDoc.source,
    hashtags: hashtags.length,
    elapsedSeconds: parseFloat(elapsed),
    usage: body?.usage ?? null,
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2));

  ok(`post.png gerado · ${promptDoc.size} · ${hashtags.length} hashtag(s)`);
  ok(`meta.json escrito`);
}

main().catch((err) => {
  if (err instanceof z.ZodError) {
    fail(`image-prompt.json inválido:\n${JSON.stringify(err.issues, null, 2)}`);
  }
  fail(err.stack || String(err));
});
