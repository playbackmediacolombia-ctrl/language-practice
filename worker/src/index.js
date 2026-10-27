// Learnguage's AI conversation partner, on Cloudflare's free Workers plan.
//
// POST /chat with { lang, level, scenario?, history, voice } and it returns the partner's next
// line from Google Gemini (free tier): the reply in the language, its English, pinyin for
// Mandarin, a gentle correction of what you just said, and new words. With `voice`, the reply
// is also spoken by Workers AI (MeloTTS, in the free daily allowance) and sent back as MP3.
//
// - The Gemini key is a Worker secret (GEMINI_API_KEY), never in this code or the repo.
// - Only the app's own addresses may call it (ALLOWED_ORIGINS).
// - A daily cap (DAILY_LIMIT, counted in the USAGE KV namespace) keeps the free quotas safe.
//
// POST /vision with { lang, image } (a small JPEG, base64) names the main thing in the photo
// in that language, with its English, an example sentence and the word spoken. It has its own
// daily cap (VISION_LIMIT).

const LANGS = {
  es: { name: 'Spanish', variety: 'Colombian Spanish (as spoken in Bogotá and Medellín)', tts: 'es' },
  fr: { name: 'French', variety: 'standard French (as spoken in France)', tts: 'fr' },
  zh: { name: 'Mandarin Chinese', variety: 'Mandarin in simplified characters (as spoken in mainland China)', tts: 'zh' },
};

const LEVEL_STYLE = {
  Beginner: 'The learner is a complete beginner (A1). Use very short sentences (3 to 7 words), the present tense and the most common everyday words. Speak slowly and simply. Ask one easy question at a time.',
  Elementary: 'The learner is elementary (A2). Use short, simple sentences about everyday life, mostly present tense with some simple past. Common words only.',
  Intermediate: 'The learner is intermediate (B1). Use natural sentences with past and future tenses, everyday vocabulary and an occasional common idiom.',
  'Upper-intermediate': 'The learner is upper-intermediate (B2). Speak naturally, with varied tenses and some idioms. Keep replies to two or three sentences.',
  Advanced: 'The learner is advanced (C1). Speak naturally at normal speed with rich vocabulary, idioms and nuance.',
  Fluent: 'The learner is fluent (C2). Talk like a native friend: natural speed, slang, idioms and cultural references.',
};

const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Your next line, in the target language only.' },
    pinyin: { type: 'string', description: 'Mandarin only: pinyin with tone marks for the reply. Empty for other languages.' },
    translation: { type: 'string', description: 'The reply in natural English.' },
    correction: {
      type: 'object',
      description: "Only if the learner's last message had a real mistake (grammar, wrong word, unnatural phrasing). Otherwise leave every field empty.",
      properties: {
        corrected: { type: 'string', description: "The learner's last message, corrected, in the target language." },
        explanation: { type: 'string', description: 'One short, kind sentence in English saying what changed and why.' },
      },
      required: ['corrected', 'explanation'],
    },
    newWords: {
      type: 'array',
      description: 'Up to 3 words or short expressions from your reply that may be new at this level.',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          pinyin: { type: 'string', description: 'Mandarin only, with tone marks.' },
          meaning: { type: 'string', description: 'English meaning.' },
        },
        required: ['word', 'meaning'],
      },
    },
    done: { type: 'boolean', description: 'True only when a role-play scenario has naturally come to its end.' },
    suggestion: {
      type: 'object',
      description: "A short, natural answer the learner could give next, at their level (used for hints if they get stuck).",
      properties: {
        text: { type: 'string', description: 'The answer, in the target language.' },
        pinyin: { type: 'string', description: 'Mandarin only, with tone marks. Empty otherwise.' },
        en: { type: 'string', description: 'The answer in English.' },
      },
      required: ['text', 'en'],
    },
  },
  required: ['reply', 'translation', 'newWords', 'done', 'suggestion'],
};

function instructions({ lang, level, scenario }) {
  const L = LANGS[lang];
  const role = scenario
    ? `This is a role-play. Setting: ${scenario.setting} You play: ${scenario.them}. The learner plays themselves. Stay in character, keep the scene realistic and help it move toward a natural end (${scenario.en}). When it has ended, say goodbye in character and set done to true.`
    : 'This is free conversation, like chatting with a friendly local. Ask about their day, interests and plans, share a little about yourself, and keep it going with one question at a time.';
  return [
    `You are a warm, encouraging conversation partner helping someone practice ${L.variety}.`,
    role,
    LEVEL_STYLE[level] ?? LEVEL_STYLE.Intermediate,
    `Always reply in ${L.name} only (never English in "reply"), in one to three short sentences that sound natural when spoken aloud. No emoji, lists or markdown in "reply".`,
    "If the learner's last message had a mistake, fill in correction with the fixed sentence and a kind one-line explanation in English, but don't mention the mistake in your reply: just keep the conversation going (you may naturally echo the correct form). If it was fine or close enough, leave correction empty.",
    'If the learner writes in English or seems stuck, help them gently in the target language with a simpler question.',
    'Keep everything friendly and appropriate. If the learner tries to steer toward something sexual, hateful or harmful, change the subject kindly.',
  ].join('\n\n');
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

const cors = (origin) => (origin ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' } : {});

/** Counts today's requests; false once the daily cap is reached. (KV is eventually consistent, so the cap is approximate.) */
async function underDailyLimit(env, kind = 'count', limit = env.DAILY_LIMIT ?? 300) {
  if (!env.USAGE) return true;
  const key = `${kind}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await env.USAGE.get(key)) ?? 0);
  if (used >= Number(limit)) return false;
  await env.USAGE.put(key, String(used + 1), { expirationTtl: 3 * 86400 });
  return true;
}

async function askGemini(env, body) {
  const contents = body.history.slice(-20).map((m) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 600) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(The learner has just opened the conversation. Greet them and start.)' }] });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions(body) }] },
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 600, responseMimeType: 'application/json', responseSchema: REPLY_SCHEMA },
    }),
  });
  if (res.status === 429) throw Object.assign(new Error('quota'), { code: 'quota' });
  if (!res.ok) throw Object.assign(new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`), { code: 'ai' });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const out = JSON.parse(text);
  if (!out.reply) throw Object.assign(new Error('empty reply'), { code: 'ai' });
  return out;
}

const VISION_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean', description: 'False if there is no clear object to name (too dark, blurry, or just a person or a screen).' },
    word: { type: 'string', description: 'The everyday name of the main object, in the target language, singular. Spanish and French: include the definite article (la mesa, le livre). Mandarin: simplified characters.' },
    pinyin: { type: 'string', description: 'Mandarin only: pinyin with tone marks for word. Empty otherwise.' },
    meaning: { type: 'string', description: 'The English name.' },
    example: { type: 'string', description: 'A short, natural example sentence using the word, in the target language, simple enough for a learner.' },
    examplePinyin: { type: 'string', description: 'Mandarin only: pinyin for the example. Empty otherwise.' },
    exampleTranslation: { type: 'string', description: 'The example in English.' },
  },
  required: ['found', 'word', 'meaning', 'example', 'exampleTranslation'],
};

async function nameObject(env, body) {
  const L = LANGS[body.lang];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `You help someone learning ${L.variety}. Name the single main object in the photo the way a native speaker would in everyday life. Never describe or identify people, faces or personal details; if the photo is mainly a person, set found to false.` }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: body.image } }, { text: `What is the main object? Answer in ${L.name}.` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300, responseMimeType: 'application/json', responseSchema: VISION_SCHEMA },
    }),
  });
  if (res.status === 429) throw Object.assign(new Error('quota'), { code: 'quota' });
  if (!res.ok) throw Object.assign(new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`), { code: 'ai' });
  const data = await res.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '{}');
}

/** The reply spoken by Workers AI (MeloTTS), as base64 MP3; null if the voice isn't available. */
async function speak(env, text, lang) {
  try {
    const out = await env.AI.run('@cf/myshell-ai/melotts', { prompt: text, lang: LANGS[lang].tts });
    if (out?.audio) return out.audio;
    if (out instanceof ReadableStream || out instanceof ArrayBuffer) {
      const bytes = new Uint8Array(out instanceof ArrayBuffer ? out : await new Response(out).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    return null;
  } catch (e) {
    console.log('voice failed', lang, String(e).slice(0, 200));
    return null;
  }
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin');
    const ok = origin && allowed.includes(origin) ? origin : null;
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors(ok) });
    if (!['/chat', '/vision'].includes(url.pathname) || request.method !== 'POST') return json({ error: 'not_found' }, 404, ok);
    if (!ok) return json({ error: 'forbidden' }, 403, null);
    if (!env.GEMINI_API_KEY) return json({ error: 'not_configured' }, 503, ok);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400, ok);
    }
    if (url.pathname === '/vision') {
      // A photo is at most ~300 KB of base64 (the app sends ~512 px JPEGs).
      if (!LANGS[body?.lang] || typeof body.image !== 'string' || body.image.length > 400_000) return json({ error: 'bad_request' }, 400, ok);
      if (!(await underDailyLimit(env, 'vision', env.VISION_LIMIT ?? 100))) return json({ error: 'quota' }, 429, ok);
      let named;
      try {
        named = await nameObject(env, body);
      } catch (e) {
        console.log('vision failed', String(e).slice(0, 300));
        return json({ error: e.code === 'quota' ? 'quota' : 'ai' }, e.code === 'quota' ? 429 : 502, ok);
      }
      const audio = named.found && named.word ? await speak(env, named.word, body.lang) : null;
      return json({ ...named, audio }, 200, ok);
    }
    if (!LANGS[body?.lang] || !Array.isArray(body.history) || body.history.length > 60) return json({ error: 'bad_request' }, 400, ok);

    if (!(await underDailyLimit(env))) return json({ error: 'quota' }, 429, ok);
    let reply;
    try {
      reply = await askGemini(env, body);
    } catch (e) {
      console.log('ai failed', String(e).slice(0, 300));
      return json({ error: e.code === 'quota' ? 'quota' : 'ai' }, e.code === 'quota' ? 429 : 502, ok);
    }
    const audio = body.voice ? await speak(env, reply.reply, body.lang) : null;
    return json({ ...reply, audio, voice: audio ? 'ok' : body.voice ? 'unavailable' : 'off' }, 200, ok);
  },
};
