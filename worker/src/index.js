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
// The same /chat also plays phone calls (mode 'call'), texts like a friend on WhatsApp (mode
// 'text') and debates a fun topic (mode 'debate', with topic and side). POST /judge decides
// whether the bird understood your explanation of a word (kind 'teach') or which story choice
// you meant (kind 'choose'). Both count toward DAILY_LIMIT.
//
// POST /vision with { lang, image } (a small JPEG, base64) names the main thing in the photo
// in that language, with its English, an example sentence and the word spoken. It has its own
// daily cap (VISION_LIMIT).

const LANGS = {
  es: { name: 'Spanish', variety: 'Colombian Spanish (as spoken in Bogotá and Medellín)', tts: 'es' },
  fr: { name: 'French', variety: 'standard French (as spoken in France)', tts: 'fr' },
  zh: { name: 'Mandarin Chinese', variety: 'Mandarin in simplified characters (as spoken in mainland China)', tts: 'zh' },
  // MeloTTS has no Portuguese or Italian voice: the app reads these replies with the phone's voice.
  pt: { name: 'Portuguese', variety: 'Brazilian Portuguese (as spoken in São Paulo and Rio de Janeiro)', tts: null },
  it: { name: 'Italian', variety: 'standard Italian (as spoken in Rome and Milan)', tts: null },
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

const clip = (v, n = 200) => String(v ?? '').slice(0, n);

/** What the partner is doing: free talk, a role-play, a phone call, texting, or a debate. */
function roleFor({ mode, scenario, topic, side, name }, L) {
  if (mode === 'call' && scenario)
    return `This is a phone call, so there is nothing to see: only voices. Setting: ${clip(scenario.setting)} You are: ${clip(scenario.them, 60)}. The learner plays themselves. Speak like on the phone (greet as the business or person would, confirm details, spell out times and numbers clearly) and keep each turn short. Help the call move toward its goal (${clip(scenario.en)}). When it's done, say goodbye as people do on the phone and set done to true.`;
  if (mode === 'text')
    return `You are ${clip(name, 30) || 'a friend'}, the learner's friend, texting on WhatsApp. Write exactly like a young native speaker of ${L.variety} texts a friend: short messages, casual, everyday slang and the usual texting abbreviations, and one to three emojis. In this mode emojis are welcome in "reply" and spelling may be as casual as real texts, but keep the grammar right.`;
  if (mode === 'debate')
    return `This is a friendly debate for practice. The motion: "${clip(topic, 120)}". You argue ${side === 'against' ? 'AGAINST' : 'FOR'} it, the learner argues the other side. Each turn: briefly react to their point, give one clear counter-argument or example, and challenge them with a question. Be playful and fair, never rude. After about six exchanges, wrap up: say who made the stronger case and why in one or two sentences, and set done to true.`;
  if (scenario)
    return `This is a role-play. Setting: ${clip(scenario.setting)} You play: ${clip(scenario.them, 60)}. The learner plays themselves. Stay in character, keep the scene realistic and help it move toward a natural end (${clip(scenario.en)}). When it has ended, say goodbye in character and set done to true.`;
  return 'This is free conversation, like chatting with a friendly local. Ask about their day, interests and plans, share a little about yourself, and keep it going with one question at a time.';
}

function instructions(body) {
  const L = LANGS[body.lang];
  const texting = body.mode === 'text';
  return [
    `You are a warm, encouraging conversation partner helping someone practice ${L.variety}.`,
    roleFor(body, L),
    LEVEL_STYLE[body.level] ?? LEVEL_STYLE.Intermediate,
    texting
      ? `Always reply in ${L.name} only (never English in "reply"), in one or two short text messages' worth.`
      : `Always reply in ${L.name} only (never English in "reply"), in one to three short sentences that sound natural when spoken aloud. No emoji, lists or markdown in "reply". Write it correctly, like a textbook: every accent and mark (á, é, ñ, ç, à, ã, ¿, ¡), and characters with proper Chinese punctuation for Mandarin.`,
    "If the learner's last message had a mistake, fill in correction with the fixed sentence and a kind one-line explanation in English, but don't mention the mistake in your reply: just keep the conversation going (you may naturally echo the correct form). If it was fine or close enough, leave correction empty." +
      (texting ? ' In texting, abbreviations, slang, missing accents, missing capitals and missing punctuation are never mistakes: only correct real grammar or wrong words.' : ''),
    'If the learner writes in English or seems stuck, help them gently in the target language with a simpler question.',
    'Keep everything friendly and appropriate. If the learner tries to steer toward something sexual, hateful or harmful, change the subject kindly.',
  ].join('\n\n');
}

const TEACH_SCHEMA = {
  type: 'object',
  properties: {
    understood: { type: 'boolean', description: 'True if a native listener would understand which word or idea the learner is describing, even with small mistakes.' },
    reply: { type: 'string', description: "The bird's reaction, in the target language, one or two short sentences: delighted if understood (say the word back), otherwise ask for one more clue." },
    pinyin: { type: 'string', description: 'Mandarin only: pinyin for reply. Empty otherwise.' },
    translation: { type: 'string', description: 'The reply in English.' },
    correction: { type: 'string', description: "The learner's explanation with any mistakes fixed, in the target language. Empty if it was fine." },
    why: { type: 'string', description: 'If corrected: one short, kind sentence in English about what changed. Empty otherwise.' },
  },
  required: ['understood', 'reply', 'translation', 'correction', 'why'],
};
const CHOOSE_SCHEMA = {
  type: 'object',
  properties: { choice: { type: 'integer', description: 'The number of the option the learner meant, or -1 if it matches none.' } },
  required: ['choice'],
};

/** /judge: did the bird understand your explanation (teach), or which story choice did you mean (choose)? */
async function judge(env, body) {
  const L = LANGS[body.lang];
  if (body.kind === 'teach') {
    const text = await gemini(env, {
      systemInstruction: {
        parts: [
          {
            text: `You are a friendly, forgetful cartoon macaw who has forgotten a word in ${L.variety}. The learner is explaining it to you in ${L.name} (level: ${clip(body.level, 30)}). The word is "${clip(body.word, 60)}" (English: ${clip(body.en, 60)}). Decide whether their explanation would let a native speaker work out the word. Be generous with learners: small grammar mistakes are fine. Never accept just the word itself, a translation into English, or something unrelated. Keep everything friendly and appropriate. Write the reply in short, simple, everyday ${L.name}, spelled correctly${body.lang === 'zh' ? ' with only common simplified characters' : ''}.`,
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: clip(body.said, 400) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400, responseMimeType: 'application/json', responseSchema: TEACH_SCHEMA },
    });
    return JSON.parse(text);
  }
  const options = (Array.isArray(body.options) ? body.options : []).slice(0, 4).map((o, i) => `${i}: ${clip(o, 160)}`).join('\n');
  const text = await gemini(env, {
    systemInstruction: { parts: [{ text: `A learner of ${L.name} is playing a choose-your-own-adventure story and said what they want to do. Pick the option whose meaning best matches what they said (in any words, even with mistakes). If it matches none of them, answer -1.\n\nOptions:\n${options}` }] },
    contents: [{ role: 'user', parts: [{ text: clip(body.said, 300) }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 50, responseMimeType: 'application/json', responseSchema: CHOOSE_SCHEMA },
  });
  return JSON.parse(text);
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

/**
 * Calls Gemini with the configured model, falling back to Google's current Flash aliases if that
 * model has been retired (404), is too busy (5xx or too slow, tried twice first) or is rate-limited
 * (429). A rejected key is reported as code 'key', and all models busy as 'busy', so the app can say so.
 */
async function gemini(env, payload) {
  const models = [env.GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash-lite'].filter((m, i, all) => m && all.indexOf(m) === i);
  const tries = models.flatMap((model, i) => [{ model }, { model, again: true, last: i === models.length - 1 }]);
  let busyLast = false;
  for (let t = 0; t < tries.length; t++) {
    const { model, again, last } = tries[t];
    const started = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(18000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': String(env.GEMINI_API_KEY).trim() },
      // 2.5 Flash "thinks" by default, and thinking counts against maxOutputTokens: turn it off
      // so replies (short JSON) are never cut off; other models get extra room instead.
      body: JSON.stringify({
        ...payload,
        generationConfig: model.startsWith('gemini-2.5')
          ? { ...payload.generationConfig, thinkingConfig: { thinkingBudget: 0 } }
          : { ...payload.generationConfig, maxOutputTokens: Math.max(payload.generationConfig.maxOutputTokens ?? 0, 2048) },
      }),
    }).catch(() => null); // too slow: treated like a busy model
    console.log(`gemini ${model} ${res?.status ?? 'timeout'} ${Date.now() - started}ms`);
    if (res?.status === 404 && !(last && again)) {
      if (!again) t++; // model retired: skip straight to the next
      continue;
    }
    // Busy (5xx): once more, then the next model. Too slow, or rate-limited (429, each model has
    // its own free per-minute allowance): straight to the next.
    const busy = !res || res.status >= 500 || res.status === 429;
    busyLast = busy;
    if (busy && !(last && again)) {
      if (!res || res.status === 429) t += again ? 0 : 1;
      else if (!again) await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    if (busy) throw Object.assign(new Error(`gemini ${model} busy (${res?.status ?? 'timeout'})`), { code: 'busy' });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      const key = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|API_KEY_SERVICE_BLOCKED/.test(text);
      throw Object.assign(new Error(`gemini ${model} ${res.status}: ${text}`), { code: key ? 'key' : 'ai' });
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  }
  throw Object.assign(new Error(busyLast ? 'gemini busy' : 'no model'), { code: busyLast ? 'busy' : 'ai' });
}

async function askGemini(env, body) {
  const contents = body.history.slice(-20).map((m) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 600) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(The learner has just opened the conversation. Greet them and start.)' }] });
  const text = await gemini(env, {
    systemInstruction: { parts: [{ text: instructions(body) }] },
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 600, responseMimeType: 'application/json', responseSchema: REPLY_SCHEMA },
  });
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    throw Object.assign(new Error(`bad JSON: ${text.slice(0, 120)}`), { code: 'ai' });
  }
  if (!out.reply) throw Object.assign(new Error('empty reply'), { code: 'ai' });
  return out;
}

const VISION_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean', description: 'False if there is no clear object to name (too dark, blurry, or just a person or a screen).' },
    word: { type: 'string', description: 'The everyday name of the main object, in the target language, singular. Spanish, French, Portuguese and Italian: include the definite article (la mesa, le livre, a mesa, il tavolo). Mandarin: simplified characters.' },
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
  const text = await gemini(env, {
    systemInstruction: { parts: [{ text: `You help someone learning ${L.variety}. Name the single main object in the photo the way a native speaker would in everyday life. Never describe or identify people, faces or personal details; if the photo is mainly a person, set found to false.` }] },
    contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: body.image } }, { text: `What is the main object? Answer in ${L.name}.` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 300, responseMimeType: 'application/json', responseSchema: VISION_SCHEMA },
  });
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw Object.assign(new Error(`bad JSON: ${text.slice(0, 120)}`), { code: 'ai' });
  }
}

/** The reply spoken by Workers AI (MeloTTS), as base64 MP3; null if the voice isn't available. */
async function speak(env, text, lang) {
  if (!LANGS[lang].tts) return null;
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
    if (!['/chat', '/vision', '/judge'].includes(url.pathname) || request.method !== 'POST') return json({ error: 'not_found' }, 404, ok);
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
        return json({ error: ['busy', 'key'].includes(e.code) ? e.code : 'ai' }, e.code === 'busy' ? 503 : 502, ok);
      }
      const audio = named.found && named.word ? await speak(env, named.word, body.lang) : null;
      return json({ ...named, audio }, 200, ok);
    }
    if (url.pathname === '/judge') {
      if (!LANGS[body?.lang] || !['teach', 'choose'].includes(body.kind) || typeof body.said !== 'string') return json({ error: 'bad_request' }, 400, ok);
      if (!(await underDailyLimit(env))) return json({ error: 'quota' }, 429, ok);
      try {
        return json(await judge(env, body), 200, ok);
      } catch (e) {
        console.log('judge failed', String(e).slice(0, 300));
        return json({ error: ['busy', 'key'].includes(e.code) ? e.code : 'ai' }, e.code === 'busy' ? 503 : 502, ok);
      }
    }
    if (!LANGS[body?.lang] || !Array.isArray(body.history) || body.history.length > 60) return json({ error: 'bad_request' }, 400, ok);

    if (!(await underDailyLimit(env))) return json({ error: 'quota' }, 429, ok);
    let reply;
    try {
      reply = await askGemini(env, body);
    } catch (e) {
      console.log('ai failed', String(e).slice(0, 300));
      return json({ error: ['busy', 'key'].includes(e.code) ? e.code : 'ai' }, e.code === 'busy' ? 503 : 502, ok);
    }
    const audio = body.voice ? await speak(env, reply.reply, body.lang) : null;
    // 'device': this language has no AI voice, so the phone reads it (no need to say it's resting).
    return json({ ...reply, audio, voice: audio ? 'ok' : !LANGS[body.lang].tts ? 'device' : body.voice ? 'unavailable' : 'off' }, 200, ok);
  },
};
