/**
 * Image generation provider chain with automatic fallback.
 * Each provider implements: { name, isAvailable(), generate(prompt, size, quality) }
 * generate() returns a Buffer (PNG) or throws an error.
 */

const TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// --- Pollinations (totally free, no key) ---
const pollinations = {
  name: 'pollinations',
  isAvailable() { return true; },
  async generate(prompt, size, _quality) {
    const [width, height] = size.split('x').map(Number);
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
    console.log(`  [pollinations] gerando ${width}x${height}...`);
    const res = await fetchWithTimeout(url, { method: 'GET' }, TIMEOUT_MS);
    if (!res.ok) throw new Error(`Pollinations ${res.status}: ${await res.text().catch(() => '')}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
};

// --- Together.ai (FLUX.1-schnell, free tier with key) ---
const together = {
  name: 'together',
  isAvailable() { return !!process.env.TOGETHER_API_KEY; },
  async generate(prompt, size, _quality) {
    const [width, height] = size.split('x').map(Number);
    const apiKey = process.env.TOGETHER_API_KEY;
    console.log(`  [together] gerando via FLUX.1-schnell ${width}x${height}...`);
    const res = await fetchWithTimeout('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        width,
        height,
        n: 1,
        response_format: 'b64_json',
      }),
    });
    if (!res.ok) throw new Error(`Together ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) throw new Error('Together: resposta sem b64_json');
    return Buffer.from(b64, 'base64');
  }
};

// --- Google AI Studio (Gemini image generation, free tier with key) ---
const googleAI = {
  name: 'google-ai-studio',
  isAvailable() { return !!process.env.GOOGLE_AI_KEY; },
  async generate(prompt, size, _quality) {
    const apiKey = process.env.GOOGLE_AI_KEY;
    const [width, height] = size.split('x').map(Number);
    const aspectRatio = width === height ? '1:1' : width < height ? '9:16' : '16:9';
    const model = 'gemini-2.5-flash-image';
    console.log(`  [google-ai-studio] gerando via ${model} (${aspectRatio})...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          responseMimeType: 'text/plain',
        },
      }),
    }, 90000);
    if (!res.ok) throw new Error(`Google AI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 500)}`);
    const body = await res.json();
    // Extract image from candidates
    const candidates = body?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part?.inlineData?.mimeType?.startsWith('image/') && part?.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }
    throw new Error('Google AI: resposta sem imagem. Keys: ' + JSON.stringify(Object.keys(body)));
  }
};

// --- OpenAI (gpt-image-1, paid) ---
const openai = {
  name: 'openai',
  isAvailable() { return !!process.env.OPENAI_API_KEY; },
  async generate(prompt, size, quality = 'high') {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`  [openai] gerando via gpt-image-1 (${size}, ${quality})...`);
    const res = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size,
        quality,
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI: resposta sem b64_json');
    return Buffer.from(b64, 'base64');
  }
};

// --- OpenRouter (multiple image models, pay-per-use with credits) ---
const openrouter = {
  name: 'openrouter',
  isAvailable() { return !!process.env.OPENROUTER_API_KEY; },
  async generate(prompt, size, _quality) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const [width, height] = size.split('x').map(Number);
    const aspectRatio = width === height ? '1:1' : width < height ? '3:4' : '4:3';
    const model = 'google/gemini-2.5-flash-image';
    console.log(`  [openrouter] gerando via ${model} (${aspectRatio}, ${width}x${height})...`);
    // Append aspect ratio instruction to prompt
    const fullPrompt = `${prompt}\n\nIMPORTANT: Generate this image in ${aspectRatio} vertical portrait aspect ratio (${width}x${height} pixels). The image MUST be taller than wide.`;
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://blink-social-post-creator.local',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    }, 90000);
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text().catch(() => '')).slice(0, 500)}`);
    const body = await res.json();
    const message = body?.choices?.[0]?.message;
    if (!message) throw new Error('OpenRouter: resposta sem message');
    // Images come in message.images array
    const images = message?.images || [];
    if (images.length > 0 && images[0]?.image_url?.url) {
      const dataUri = images[0].image_url.url;
      if (dataUri.startsWith('data:image')) {
        const b64 = dataUri.split(',')[1];
        return Buffer.from(b64, 'base64');
      }
    }
    // Fallback: check content for inline data
    const content = message?.content;
    if (typeof content === 'string' && content.startsWith('data:image')) {
      const b64 = content.split(',')[1];
      return Buffer.from(b64, 'base64');
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === 'image_url' && part?.image_url?.url?.startsWith('data:image')) {
          const b64 = part.image_url.url.split(',')[1];
          return Buffer.from(b64, 'base64');
        }
      }
    }
    throw new Error('OpenRouter: não conseguiu extrair imagem da resposta');
  }
};

// --- Provider Registry ---
const PROVIDERS = {
  pollinations,
  together,
  'google-ai-studio': googleAI,
  openrouter,
  openai,
};

/**
 * Tenta gerar imagem percorrendo a chain de providers.
 * Retorna { buffer, provider } ou { promptReady: true } se todos falharem.
 */
export async function generateImage(prompt, size, quality, providerChain) {
  const errors = [];

  for (const providerName of providerChain) {
    const provider = PROVIDERS[providerName];
    if (!provider) {
      console.log(`  [${providerName}] provider não encontrado, pulando`);
      continue;
    }
    if (!provider.isAvailable()) {
      console.log(`  [${providerName}] não disponível (key ausente), pulando`);
      continue;
    }
    try {
      const buffer = await provider.generate(prompt, size, quality);
      console.log(`  ✓ imagem gerada via ${providerName}`);
      return { buffer, provider: providerName };
    } catch (err) {
      console.log(`  ✗ ${providerName} falhou: ${err.message}`);
      errors.push({ provider: providerName, error: err.message });
    }
  }

  return { promptReady: true, errors };
}

export function getAvailableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([_, p]) => p.isAvailable())
    .map(([name]) => name);
}

export const DEFAULT_CHAIN = ['google-ai-studio', 'openrouter', 'together', 'openai', 'pollinations'];
