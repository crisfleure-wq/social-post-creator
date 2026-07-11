---
description: Gera capa de Reels Instagram (1080×1920) para um cliente específico via IA generativa. Use quando pedir /reels-cover, capa de reels, thumbnail de vídeo.
---

# /reels-cover — Orquestrador de Capa de Reels

Você é o **orquestrador** do pipeline de capa de reels multi-cliente.

## Input

`$ARGUMENTS` contém: `<cliente> <tema>`

Exemplos:
- `/reels-cover blink-marketing resultado real vs promessa de guru`
- `/reels-cover affetto look do dia verão`

## Processo

### 1. Parse dos argumentos

- Primeiro token = `clientSlug`
- Resto = `tema`

### 2. Carregar contexto do cliente

```bash
spc-load-client "<clientSlug>" reels-cover
```

### 3. Resolver slug + versão

```bash
spc-resolve-output "<clientSlug>" "<tema>" reels-cover
```

Crie o `versionDir` com `mkdir -p`. Comunique provider: *"Provider: `<generativeProvider>`"*

### 4. Subagent 1: news-scout

```
TEMA: <tema>
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  niche: <config.identity.niche>
  preferredSources: <config.research.preferredSources>
  language: <config.research.language>
```

### 5. Subagent 2: image-prompt-writer

```
OUTPUT_DIR: <versionDir>/
SIZE: 9x16
CLIENT_CONTEXT:
  handle: <config.handle>
  displayName: <config.displayName>
  tokensPath: <paths.tokensPath>
  designSystemPath: <paths.designSystemPath>
  briefingPath: <paths.briefingPath>
  logoPath: <paths.logoPath>
  generativeProvider: <formatConfig.generativeProvider>
  canvas: { width: 1080, height: 1920 }
  quality: <formatConfig.quality>
  tone: <config.identity.tone>
  voice: <config.voice>
```

### 6. Subagent 3: caption-writer

```
OUTPUT_DIR: <versionDir>/
CLIENT_CONTEXT:
  handle: <config.handle>
  maxHashtags: <config.caption.maxHashtags>
  signatureHashtags: <config.caption.signatureHashtags>
  ctaStyle: <config.caption.ctaStyle>
  tone: <config.identity.tone>
```

### 7. Renderer

Usa o provider chain com fallback automático (9:16 → 1024x1536):

```bash
spc render-image.mjs <versionDir> --client=<clientSlug> --size=9x16
```

O renderer tenta cada provider na ordem definida em `client.json` → `imageGeneration.providerChain`.
Se todos falharem, gera `prompt-ready.md` para geração manual.

### 8. Output final

```
✓ /reels-cover pronto
  Cliente   : <displayName>
  Tema      : <tema>
  Slug      : <slug>
  Versão    : v<N>
  Imagem    : images/<clientSlug>/reels-cover/<slug>/v<N>/post.png (1080×1920)
  Headline  : <headline>
  Provider  : <generativeProvider>
  Legenda   : images/<clientSlug>/reels-cover/<slug>/v<N>/caption.txt
  Fonte     : <chosen.url>
```
