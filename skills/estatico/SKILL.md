---
description: Gera post estático Instagram (1080×1440) para um cliente específico via IA generativa. Use quando pedir /estatico, post estático, imagem única para feed.
---

# /estatico — Orquestrador de Post Estático

Você é o **orquestrador** do pipeline de imagem estática multi-cliente.

## Input

`$ARGUMENTS` contém: `<cliente> <tema>`

Exemplos:
- `/estatico blink-marketing marketing sem estratégia é gasto`
- `/estatico affetto coleção verão 2026`

## Processo

### 1. Parse dos argumentos

- Primeiro token = `clientSlug`
- Resto = `tema`
- Se algum vazio: mostre o uso e pare.

### 2. Carregar contexto do cliente

```bash
spc-load-client "<clientSlug>" estatico
```

Verifique `formatConfig.enabled`. Se desabilitado, informe e pare.

### 3. Resolver slug + versão

```bash
spc-resolve-output "<clientSlug>" "<tema>" estatico
```

Crie o `versionDir` com `mkdir -p`.

Comunique: *"Cliente: `<displayName>` · Formato: estático · v<N> · Provider: `<generativeProvider>`"*

### 4. Subagent 1: news-scout

```
TEMA: <tema>
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  niche: <config.identity.niche>
  preferredSources: <config.research.preferredSources>
  language: <config.research.language>
  recencyDays: <config.research.recencyDays>
```

### 5. Subagent 2: image-prompt-writer

```
OUTPUT_DIR: <versionDir>/
SIZE: 1x1
CLIENT_CONTEXT:
  handle: <config.handle>
  displayName: <config.displayName>
  tokensPath: <paths.tokensPath>
  designSystemPath: <paths.designSystemPath>
  briefingPath: <paths.briefingPath>
  learningsPath: <paths.learningsPath>
  logoPath: <paths.logoPath>
  generativeProvider: <formatConfig.generativeProvider>
  canvas: <formatConfig.canvas>
  quality: <formatConfig.quality>
  tone: <config.identity.tone>
  voice: <config.voice>
```

Aguarde `image-prompt.json`.

### 6. Subagent 3: caption-writer

```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  maxHashtags: <config.caption.maxHashtags>
  signatureHashtags: <config.caption.signatureHashtags>
  ctaStyle: <config.caption.ctaStyle>
  tone: <config.identity.tone>
  voice: <config.voice>
  briefingPath: <paths.briefingPath>
```

### 7. Renderer

Usa o provider chain com fallback automático:

```bash
spc render-image.mjs <versionDir> --client=<clientSlug>
```

O renderer tenta cada provider na ordem definida em `client.json` → `imageGeneration.providerChain`
(default: pollinations → together → google-ai-studio → openai).

Se todos falharem, gera `prompt-ready.md` com o prompt formatado para o usuário colar
no ChatGPT ou Gemini web. Nesse caso, reporte ao usuário e pare (exit code 2).

### 8. Output final

```
✓ /estatico pronto
  Cliente   : <displayName>
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Imagem    : images/<clientSlug>/estatico/<slug>/v<N>/post.png (1080×1440)
  Headline  : <headline>
  Provider  : <generativeProvider>
  Legenda   : images/<clientSlug>/estatico/<slug>/v<N>/caption.txt
  Fonte     : <chosen.url>
```

## Anti-padrões

- ❌ Pular subagents
- ❌ Chamar render antes de ter image-prompt.json e caption.txt
- ❌ Inventar visual description sem base em research.json
