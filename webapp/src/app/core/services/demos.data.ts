import { DemoExample } from '../models/demo.interface';
import { AttachmentTypeEnum } from '../enums/attachment-type.enum';
import { DEMO_PREVIEWS } from './demo-previews.data';

const DEMOS: DemoExample[] = [
  // SPEECH
  {
    id: 'tongue-twister',
    title: 'Tongue Twister Trial',
    description: 'Say "she sells seashells" as fast as you can — the on-device recognizer scores how much of it survived.',
    category: 'Speech',
    apis: ['Web Speech'],
    icon: 'bi-stopwatch',
    onDeviceReason: 'A pronunciation game with zero backend: every attempt is transcribed and scored locally, so you can embarrass yourself in complete privacy.',
    codeSnippet: `const twister = "She sells seashells by the seashore.";

const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = [...event.results].map(r => r[0].transcript).join("");

  // Score with word error rate against the target sentence
  const accuracy = 1 - wordErrorRate(twister, transcript);

  if (accuracy >= 0.95) rank = "🏆 Tongue Master";
  else if (accuracy >= 0.85) rank = "🥈 Silver Tongue";
  else if (accuracy >= 0.70) rank = "Getting There";
  else rank = "🙃 Tongue Tied";
};

recognition.start(); // now say it FAST`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'live-translated-captions',
    title: 'Live Translated Captions',
    description: 'Speak into the mic: on-device captions appear instantly, and a second track renders them live in another language.',
    category: 'Speech',
    apis: ['Web Speech', 'Language Detector', 'Translator'],
    icon: 'bi-badge-cc',
    onDeviceReason: 'Recognition, detection, and translation all run locally — captions work offline and the audio never leaves the microphone\'s device. A babel fish in a browser tab.',
    codeSnippet: `// On-device recognition (explainer: on-device-speech-recognition)
const options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
if (await SpeechRecognition.available(options) === "downloadable") {
  await SpeechRecognition.install(options);
}

const recognition = new SpeechRecognition();
recognition.options = options;
recognition.continuous = true;
recognition.interimResults = true;

const detector = await LanguageDetector.create();
const translators = new Map(); // cached per language pair

recognition.onresult = async (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    showCaption(result[0].transcript, result.isFinal);
    if (!result.isFinal) continue;

    // New final segment: detect its language, then translate it
    const [{ detectedLanguage }] = await detector.detect(result[0].transcript);
    const key = detectedLanguage + "->fr";
    if (!translators.has(key)) {
      translators.set(key, await Translator.create({
        sourceLanguage: detectedLanguage, targetLanguage: "fr"
      }));
    }
    showTranslatedCaption(await translators.get(key).translate(result[0].transcript));
  }
};

recognition.start();`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'speak-to-fill',
    title: 'Speak to Fill',
    description: 'Say "table for four next Friday at seven, outside" and watch the booking form fill itself — speech in, structured data out.',
    category: 'Speech',
    apis: ['Web Speech', 'Prompt API'],
    icon: 'bi-ui-checks',
    onDeviceReason: 'Voice hits the on-device recognizer, the transcript hits the on-device LLM with a JSON schema, and the form fills — no audio or personal details ever reach a server.',
    codeSnippet: `// 1. Capture one utterance on-device
const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.onresult = (e) => extract(e.results[0][0].transcript);
recognition.start();

// 2. Turn the transcript into structured form data
const schema = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    time: { type: ["string", "null"] },
    partySize: { type: ["number", "null"] },
    seating: { type: ["string", "null"], enum: ["inside", "outside", null] },
    specialRequests: { type: ["string", "null"] }
  },
  additionalProperties: false
};

async function extract(utterance) {
  const session = await LanguageModel.create({
    systemPrompt: "Extract restaurant booking details. " +
      "Return null for fields the user did not mention. Today is " + new Date().toDateString()
  });
  const result = await session.prompt(utterance, { responseConstraint: schema });
  fillForm(JSON.parse(result)); // only non-null fields overwrite the form
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'asr-quality-tiers',
    title: 'ASR Quality Tier Lab',
    description: 'Read the same passage against the command, dictation, and conversation models — then compare accuracy and latency.',
    category: 'Speech',
    apis: ['Web Speech'],
    icon: 'bi-speedometer2',
    onDeviceReason: 'The quality-levels explainer lets sites pick the right on-device model for the job — this lab makes the size/accuracy/latency trade-off measurable on your own hardware.',
    codeSnippet: `// Quality tiers (explainer: quality-levels): each maps to a different on-device model
for (const quality of ["command", "dictation", "conversation"]) {
  const options = { langs: ["en-US"], processLocally: true, quality };

  const availability = await SpeechRecognition.available(options);
  if (availability === "downloadable") await SpeechRecognition.install(options);

  const recognition = new SpeechRecognition();
  recognition.options = options;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const transcript = [...event.results].map(r => r[0].transcript).join("");
    // Score against the reference passage with word error rate
    console.log(quality, wordErrorRate(referenceText, transcript));
  };

  recognition.start(); // record one attempt per tier, then compare
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'contextual-biasing',
    title: 'Jargon Dictation',
    description: 'Dictate product names the recognizer has never heard — then boost them with contextual biasing and watch the diff.',
    category: 'Speech',
    apis: ['Web Speech'],
    icon: 'bi-sliders',
    onDeviceReason: 'Contextual biasing tunes the on-device recognizer to your app\'s vocabulary at runtime — no custom model training, and your domain terms stay on the device.',
    codeSnippet: `const options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
const recognition = new SpeechRecognition();
recognition.options = options;

// Contextual biasing (explainer: contextual-biasing):
// boost domain terms the base model would otherwise mangle
recognition.phrases.push(new SpeechRecognitionPhrase("TinyGemma", 3.0));
recognition.phrases.push(new SpeechRecognitionPhrase("WebNN", 3.0));
recognition.phrases.push(new SpeechRecognitionPhrase("Axon", 2.0));

recognition.onresult = (event) => {
  // "Add TinyGemma and WebNN benchmarks to the Axon suite"
  // Without biasing: "add tiny gemma and web and then benchmarks to the axon sweet"
  console.log(event.results[0][0].transcript);
};

recognition.start();`,
    promptRunOptions: {},
    initialPrompt: ''
  },

  {
    id: 'dictate-and-polish',
    title: 'Dictate & Polish',
    description: 'Speak your messy first draft, then let the Proofreader and Rewriter turn it into publishable text.',
    category: 'Speech',
    apis: ['Web Speech', 'Proofreader', 'Rewriter'],
    icon: 'bi-soundwave',
    onDeviceReason: 'Speak like a human, publish like an editor: dictation, proofreading, and rewriting chain together locally, so rough spoken thoughts never leave the device.',
    codeSnippet: `// 1. Dictate on-device
const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.continuous = true;
recognition.onresult = (e) => (rawTranscript = collect(e));
recognition.start();

// 2. Fix punctuation, casing, and grammar with the Proofreader
const proofreader = await Proofreader.create({ expectedInputLanguages: ["en"] });
const { correctedInput } = await proofreader.proofread(rawTranscript);

// 3. Reshape it with the Rewriter
const rewriter = await Rewriter.create({
  tone: "more-formal",   // or "more-casual"
  length: "shorter",     // or "longer"
  format: "plain-text"
});
const polished = await rewriter.rewrite(correctedInput);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'story-time',
    title: 'Story Time',
    description: 'The Writer invents a bedtime story from three ingredients, then the browser reads it aloud — highlighting each word as it speaks.',
    category: 'Speech',
    apis: ['Writer', 'Web Speech'],
    icon: 'bi-moon-stars',
    onDeviceReason: 'A complete storyteller with no servers: generation by the on-device Writer, narration by speechSynthesis, word-by-word karaoke highlighting from boundary events.',
    codeSnippet: `// 1. Write the story on-device
const writer = await Writer.create({
  tone: "casual",
  format: "plain-text",
  length: "medium",
  sharedContext: "You write warm bedtime stories for young children."
});
const stream = writer.writeStreaming(
  "Write a bedtime story featuring a dragon, a submarine, and pancakes."
);
for await (const chunk of stream) story += chunk;

// 2. Narrate it with word-by-word highlighting
const utterance = new SpeechSynthesisUtterance(story);
utterance.rate = 0.9;

utterance.onboundary = (event) => {
  // event.charIndex points at the word being spoken right now
  highlightWordAt(event.charIndex);
};

speechSynthesis.speak(utterance);`,
    promptRunOptions: {},
    initialPrompt: ''
  },

  // MULTI-API
  {
    id: 'omnibox',
    title: 'The Omnibox',
    description: 'One input, every API: whatever you paste is intent-routed to the right tool — translate, summarize, proofread, rewrite, or answer.',
    category: 'Mix-and-Match',
    apis: ['Semantic Embedder', 'Language Detector', 'Translator', 'Summarizer', 'Proofreader', 'Rewriter', 'Prompt API'],
    icon: 'bi-input-cursor-text',
    onDeviceReason: 'The router itself is AI: language detection and embedding similarity pick the destination in milliseconds, then the chosen API runs — a whole product surface with zero server calls.',
    codeSnippet: `// Route exemplars define each destination
const routes = {
  summarize: ["Condense this long text", "Give me the key points of this article"],
  proofread: ["Fix the typos and grammar in this", "Correct my writing mistakes"],
  rewrite:   ["Make this sound more professional", "Rephrase this politely"],
  answer:    ["What is the capital of France?", "How does photosynthesis work?"]
};
// Embed the exemplars once; a route's centroid is its mean vector

async function route(input) {
  // Rule 1: foreign language wins — translate it
  const [lang] = await detector.detect(input);
  if (lang.detectedLanguage !== "en" && lang.confidence > 0.6) {
    return { route: "translate", from: lang.detectedLanguage };
  }

  // Rule 2: otherwise, nearest intent centroid decides
  const { embeddings: [e] } = await embedder.embed(input);
  const best = Object.entries(centroids)
    .map(([name, c]) => ({ name, score: cosineSimilarity(e.values, c) }))
    .sort((a, b) => b.score - a.score)[0];

  return { route: best.name, score: best.score };
}

// Then dispatch: Translator, Summarizer, Proofreader, Rewriter, or the Prompt API`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'moderation-cascade',
    title: 'Moderation Cascade',
    description: 'The production pattern for cheap moderation: embeddings clear the obvious 90% in microseconds, the LLM judges only the borderline.',
    category: 'Embeddings',
    apis: ['Semantic Embedder', 'Prompt API'],
    icon: 'bi-funnel',
    onDeviceReason: 'Cascades are how real systems afford moderation — and on-device they cost literally nothing. Watch the counters: most comments never touch the language model.',
    codeSnippet: `// Stage 1: embedding classifier (microseconds, runs on everything)
const { embeddings: [e] } = await embedder.embed(comment);
const scores = {
  benign: cosineSimilarity(e.values, centroids.benign),
  toxic:  cosineSimilarity(e.values, centroids.toxic),
  spam:   cosineSimilarity(e.values, centroids.spam)
};
const [top, second] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
const margin = top[1] - second[1];

if (margin >= 0.05) {
  return top[0]; // confident — the LLM never runs
}

// Stage 2: LLM judge (only for the borderline few)
const verdict = await session.prompt(
  \`Is this comment benign, toxic, or spam? Comment: "\${comment}"\`,
  { responseConstraint: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["benign", "toxic", "spam"] },
        reason: { type: "string" }
      },
      required: ["verdict", "reason"]
  }}
);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'photo-search',
    title: 'Photo Semantic Search',
    description: 'Drop in your photos, and search them by meaning — "food on a table", "someone smiling" — without one pixel leaving your device.',
    category: 'Image Input',
    apis: ['Prompt API', 'Semantic Embedder'],
    icon: 'bi-images',
    onDeviceReason: 'Cloud photo search means uploading your life. Here the vision model captions each photo locally, the captions are embedded locally, and queries rank them locally.',
    codeSnippet: `// 1. Index: caption every photo with the vision model, embed the captions
const session = await LanguageModel.create({ expectedInputs: [{ type: "image" }] });
const embedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });

for (const photo of photos) {
  const bitmap = await createImageBitmap(photo.file);
  photo.caption = await session.prompt([{
    role: "user",
    content: [
      { type: "text", value: "Describe this photo in one factual sentence." },
      { type: "image", value: bitmap }
    ]
  }]);
  const { embeddings: [e] } = await embedder.embed(photo.caption);
  photo.vector = e.values;
}

// 2. Search: embed the query, rank photos by cosine similarity
const queryEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-query" });
const { embeddings: [q] } = await queryEmbedder.embed("food on a table");

photos.sort((a, b) =>
  cosineSimilarity(q.values, b.vector) - cosineSimilarity(q.values, a.vector)
);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'mystery-language',
    title: 'Mystery Language',
    description: 'Guess which language the snippet is written in — then see if you beat the Language Detector\'s confidence-ranked answer.',
    category: 'Text Input',
    apis: ['Language Detector', 'Translator'],
    icon: 'bi-question-diamond',
    onDeviceReason: 'A trivia game that doubles as an API showcase: ranked detections with confidences, revealed instantly and offline — plus a translation of what the snippet actually says.',
    codeSnippet: `const detector = await LanguageDetector.create();

// The player guesses first...
const playerGuess = "it"; // Italian?

// ...then the detector shows its ranked answer
const results = await detector.detect("Chi dorme non piglia pesci.");
// [{ detectedLanguage: "it", confidence: 0.98 }, ...]

const [top] = results;
if (playerGuess === top.detectedLanguage) score.player++;
if (top.confidence > 0.5) score.detector++;

// Reveal what it means with the Translator
const translator = await Translator.create({
  sourceLanguage: top.detectedLanguage,
  targetLanguage: "en"
});
console.log(await translator.translate("Chi dorme non piglia pesci."));
// "He who sleeps doesn't catch fish."`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'polyglot-chat',
    title: 'Polyglot Chat',
    description: 'Two people, two languages, one conversation — every message is detected and translated both ways as it is sent.',
    category: 'Mix-and-Match',
    apis: ['Translator', 'Language Detector'],
    icon: 'bi-chat-dots',
    onDeviceReason: 'Private conversations get translated without a translation server in the middle — detection and translation are instant, local, and free per message.',
    codeSnippet: `const detector = await LanguageDetector.create();
const translators = new Map();

async function send(message, recipientLanguage) {
  // 1. Detect what language the sender actually typed
  const [{ detectedLanguage, confidence }] = await detector.detect(message);

  if (detectedLanguage === recipientLanguage) {
    return { original: message }; // same language, nothing to do
  }

  // 2. Translate into the recipient's language (translators cached per pair)
  const key = \`\${detectedLanguage}->\${recipientLanguage}\`;
  if (!translators.has(key)) {
    translators.set(key, await Translator.create({
      sourceLanguage: detectedLanguage,
      targetLanguage: recipientLanguage
    }));
  }

  return {
    original: message,
    translated: await translators.get(key).translate(message),
    from: detectedLanguage
  };
}

await send("On se voit demain à midi ?", "en");
// → { translated: "See you tomorrow at noon?", from: "fr" }`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'proofreader-inline',
    title: 'Proofreader, Inline',
    description: 'The dedicated Proofreader API: every error underlined in place, with a label, an explanation, and one-click accept.',
    category: 'Text Input',
    apis: ['Proofreader'],
    icon: 'bi-patch-check',
    onDeviceReason: 'Structured corrections — indices, labels, explanations — enable real editor UX, not just corrected text. And drafts are proofread without leaving the device.',
    codeSnippet: `const proofreader = await Proofreader.create({
  expectedInputLanguages: ["en"],
  includeCorrectionTypes: true,        // not yet returned by Chrome's current build
  includeCorrectionExplanations: true  // not yet returned by Chrome's current build
});

const result = await proofreader.proofread(
  "I has went to the libary yesterday, but they was allready closed."
);

console.log(result.correctedInput);
// "I went to the library yesterday, but they were already closed."

for (const c of result.corrections) {
  // startIndex/endIndex point into the ORIGINAL string — perfect for underlines
  console.log(c.startIndex, c.endIndex, "→", c.correction, c.types, c.explanation);
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'tone-pad',
    title: 'Tone Pad',
    description: 'A 3×3 pad of the Rewriter\'s option space: pick a tone and a length, and the same text reshapes live.',
    category: 'Text Input',
    apis: ['Rewriter'],
    icon: 'bi-joystick',
    onDeviceReason: 'Trying nine variations of a message costs nothing when rewriting happens on-device — preview every tone before you hit send, without your draft leaving the machine.',
    codeSnippet: `// The Rewriter's option space is a grid:
// tone:   more-casual | as-is | more-formal
// length: shorter     | as-is | longer

const rewriter = await Rewriter.create({
  tone: "more-formal",
  length: "shorter",
  format: "plain-text"
});

const original =
  "hey! quick heads up - the demo kinda broke on my machine, might wanna check before the meeting";

const rewritten = await rewriter.rewrite(original);
// "Please note the demo malfunctioned on my machine; I recommend
//  verifying it before the meeting."

rewriter.destroy();`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'summarizer-matrix',
    title: 'Summarizer Options Matrix',
    description: 'One article, every Summarizer option: tldr, key-points, teaser, and headline at each length, side by side.',
    category: 'Text Input',
    apis: ['Summarizer'],
    icon: 'bi-grid-3x3-gap',
    onDeviceReason: 'The fastest way to learn which type and length fit your product is to generate them all — free and instant when the Summarizer runs on-device.',
    codeSnippet: `// Summarizer options:
// type:   "tldr" | "key-points" | "teaser" | "headline"
// length: "short" | "medium" | "long"

for (const type of ["tldr", "key-points", "teaser", "headline"]) {
  for (const length of ["short", "medium", "long"]) {
    const summarizer = await Summarizer.create({
      type,
      length,
      format: "plain-text"
    });

    const summary = await summarizer.summarize(articleText, {
      context: "This is a technology news article."
    });

    renderCell(type, length, summary);
    summarizer.destroy();
  }
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'reply-composer',
    title: 'Reply Composer',
    description: 'Pick an intent — accept, decline, stall — and the Writer drafts the reply to a real email, streaming, with tone and length knobs.',
    category: 'Text Input',
    apis: ['Writer'],
    icon: 'bi-reply',
    onDeviceReason: 'Replies are drafted next to your inbox with zero upload: the incoming email is the Writer\'s sharedContext and never leaves the device.',
    codeSnippet: `const writer = await Writer.create({
  tone: "formal",              // formal | neutral | casual
  length: "short",             // short | medium | long
  format: "plain-text",
  sharedContext: incomingEmail // the email being replied to
});

// The intent is the writing task
const stream = writer.writeStreaming(
  "Write a reply that politely declines the invitation but proposes an alternative."
);

for await (const chunk of stream) {
  draft += chunk;
}

writer.destroy();`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'camera-qa',
    title: 'Live Camera Q&A',
    description: 'Point your camera at anything, freeze a frame, and ask the on-device model about what it sees.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-camera-video',
    onDeviceReason: 'Your camera feed is the most private data you have — frames go straight from the sensor to the on-device model, and never anywhere else.',
    codeSnippet: `// 1. Show the camera
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
videoElement.srcObject = stream;

// 2. Freeze a frame when the user asks a question
const bitmap = await createImageBitmap(videoElement);

// 3. Ask the on-device model about it
const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});

const answer = session.promptStreaming([{
  role: "user",
  content: [
    { type: "text", value: "What am I holding in this picture?" },
    { type: "image", value: bitmap }
  ]
}]);

for await (const chunk of answer) {
  console.log(chunk);
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'draw-and-guess',
    title: 'Draw & Guess',
    description: 'You sketch, Gemini Nano guesses: the model interprets your doodle after every stroke.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-brush',
    onDeviceReason: 'Guessing on every stroke only works when vision inference is local — no upload per doodle, no latency, no cost per guess.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }],
  systemPrompt: "You are playing a drawing guessing game. " +
    "Reply with only your single best guess for what the line drawing shows, in 1-3 words."
});

canvas.addEventListener("pointerup", async () => {
  // After each stroke, let the model take a guess
  const bitmap = await createImageBitmap(canvas);

  const guess = await session.prompt([{
    role: "user",
    content: [
      { type: "text", value: "What is this simple line drawing?" },
      { type: "image", value: bitmap }
    ]
  }]);

  if (guess.toLowerCase().includes(secretWord)) {
    celebrate("The model guessed it!");
  }
});`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'localization-qa',
    title: 'Localization QA',
    description: 'Scan a locale file for strings left in the wrong language, then fix the stragglers with one click.',
    category: 'Mix-and-Match',
    apis: ['Language Detector', 'Translator'],
    icon: 'bi-file-earmark-diff',
    onDeviceReason: 'A practical build-time tool running in a tab: the Language Detector audits every string locally and the Translator patches the misses — no localization service required.',
    codeSnippet: `const detector = await LanguageDetector.create();
const expected = "fr"; // this is supposed to be fr.json

const issues = [];
for (const [key, value] of Object.entries(localeStrings)) {
  const [top] = await detector.detect(value);
  if (top.detectedLanguage !== expected && top.confidence > 0.5) {
    issues.push({ key, value, found: top.detectedLanguage, confidence: top.confidence });
  }
}

// Fix a straggler: translate it into the expected language
async function fix(issue) {
  const translator = await Translator.create({
    sourceLanguage: issue.found,
    targetLanguage: expected
  });
  localeStrings[issue.key] = await translator.translate(issue.value);
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'study-kit',
    title: 'Lecture Study Kit',
    description: 'Drop a lecture recording: transcript, key-point notes, a Q&A chat over the content, and auto-generated flashcards.',
    category: 'Audio Input',
    apis: ['Prompt API', 'Summarizer', 'Semantic Embedder'],
    icon: 'bi-mortarboard',
    onDeviceReason: 'A lecture is an hour of your professor\'s voice — big, personal, and slow to upload. The whole study pipeline runs where the recording already is: on your machine.',
    codeSnippet: `// 1. Transcribe the recording with the multimodal Prompt API
const session = await LanguageModel.create({ expectedInputs: [{ type: "audio" }] });
const transcript = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Transcribe this lecture exactly as spoken." },
    { type: "audio", value: audioFile }
  ]
}]);

// 2. Key-point notes with the Summarizer
const summarizer = await Summarizer.create({ type: "key-points", length: "long" });
const notes = await summarizer.summarize(transcript);

// 3. Index the transcript for Q&A (RAG over the lecture)
const chunks = splitIntoChunks(transcript);
const docEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });
const { embeddings } = await docEmbedder.embed(chunks);

// 4. Flashcards via structured output
const cards = await session.prompt(
  "Create 4 flashcards from this lecture:\\n" + transcript,
  { responseConstraint: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"]
      }
  }}
);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'universal-inbox',
    title: 'Universal Inbox',
    description: 'A five-API pipeline: detect each message\'s language, translate it, triage it into folders, digest the inbox, and draft replies in the sender\'s language.',
    category: 'Mix-and-Match',
    apis: ['Language Detector', 'Translator', 'Semantic Embedder', 'Summarizer', 'Writer'],
    icon: 'bi-inbox',
    onDeviceReason: 'Five Built-In AI APIs chained into one workflow, entirely on-device: a support inbox that reads every language, sorts itself, summarizes itself, and answers customers in their own words.',
    codeSnippet: `const detector = await LanguageDetector.create();
const embedder = await SemanticEmbedder.create({ taskType: "classification" });

for (const message of inbox) {
  // 1. Detect the sender's language
  const [{ detectedLanguage }] = await detector.detect(message.body);

  // 2. Translate to English for the pipeline
  const translator = await Translator.create({
    sourceLanguage: detectedLanguage, targetLanguage: "en"
  });
  message.english = await translator.translate(message.body);

  // 3. Triage into a folder by embedding similarity to category centroids
  const { embeddings: [e] } = await embedder.embed(message.english);
  message.folder = nearestCentroid(e.values, folderCentroids);
}

// 4. Digest the whole inbox
const summarizer = await Summarizer.create({ type: "key-points", length: "short" });
const digest = await summarizer.summarize(
  inbox.map(m => \`From \${m.sender}: \${m.english}\`).join("\\n")
);

// 5. Draft a reply — then translate it BACK to the sender's language
const writer = await Writer.create({ tone: "formal", length: "short" });
const reply = await writer.write(\`Reply to: "\${message.english}"\`);
const back = await Translator.create({ sourceLanguage: "en", targetLanguage: message.lang });
message.draft = await back.translate(reply);`,
    promptRunOptions: {},
    initialPrompt: ''
  },

  // EMBEDDINGS
  {
    id: 'document-chat',
    title: 'Chat With Your Document',
    description: 'Fully local RAG: retrieve the relevant passages with embeddings, then answer with the Prompt API — citations included.',
    category: 'Embeddings',
    apis: ['Semantic Embedder', 'Prompt API'],
    icon: 'bi-chat-left-quote',
    onDeviceReason: 'The entire RAG pipeline — chunking, embedding, retrieval, and generation — runs on-device. Your document is never uploaded and no vector database is required.',
    codeSnippet: `// 1. Index: chunk the document and embed every chunk in one batch
const docEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });
const chunks = documentText.split(/\\n\\s*\\n/);
const { embeddings } = await docEmbedder.embed(chunks);

// 2. Retrieve: embed the question with the query task type, rank chunks by cosine similarity
const queryEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-query" });
const query = await queryEmbedder.embed(question);
const top3 = embeddings
  .map((e, i) => ({ i, score: cosineSimilarity(query.embeddings[0].values, e.values) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

// 3. Generate: ground the Prompt API in the retrieved passages
const session = await LanguageModel.create({
  systemPrompt: "Answer using ONLY the provided context."
});
const context = top3.map(t => chunks[t.i]).join("\\n\\n");
const stream = session.promptStreaming(\`Context:\\n\${context}\\n\\nQuestion: \${question}\`);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'semantic-search',
    title: 'Semantic vs. Keyword Search',
    description: 'Search a help center by meaning, side by side with keyword search — and watch keywords miss what embeddings find.',
    category: 'Embeddings',
    apis: ['Semantic Embedder'],
    icon: 'bi-search-heart',
    onDeviceReason: 'On-device embeddings cost nothing per query, so you can afford to search on every keystroke — no network round trip, no per-call billing, and queries stay private.',
    codeSnippet: `// Index the help center once (a single batched call)
const docEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });
const { embeddings } = await docEmbedder.embed(helpCenterEntries);

// On every keystroke: embed the query with the query task type and rank by cosine similarity
const queryEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-query" });
const result = await queryEmbedder.embed(searchQuery);
const queryVector = result.embeddings[0].values;

const ranked = embeddings
  .map((e, i) => ({ entry: helpCenterEntries[i], score: cosineSimilarity(queryVector, e.values) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'smart-triage',
    title: 'Smart Triage',
    description: 'A zero-shot classifier: route incoming messages to categories defined only by a few example phrases.',
    category: 'Embeddings',
    apis: ['Semantic Embedder'],
    icon: 'bi-signpost-split',
    onDeviceReason: 'Classify support messages, feedback, or emails locally with no training step and no data leaving the device — and "retrain" instantly by editing the example phrases.',
    codeSnippet: `const embedder = await SemanticEmbedder.create({ taskType: "classification" });

// Each category is defined by a few example phrases
const categories = {
  "Billing": ["I was charged twice", "How do I update my card?"],
  "Bug Report": ["The app crashes on launch", "Uploads fail with an error"]
};

// A category's centroid is the mean of its example vectors
const centroids = {};
for (const [name, examples] of Object.entries(categories)) {
  const { embeddings } = await embedder.embed(examples);
  centroids[name] = meanVector(embeddings.map(e => e.values));
}

// Classify: nearest centroid by cosine similarity
const { embeddings: [msg] } = await embedder.embed(incomingMessage);
const best = Object.entries(centroids)
  .map(([name, c]) => ({ name, score: cosineSimilarity(msg.values, c) }))
  .sort((a, b) => b.score - a.score)[0];`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'duplicate-detector',
    title: 'Duplicate Detector',
    description: 'Catch near-duplicate bug reports before they are filed, even when they share no words with the original.',
    category: 'Embeddings',
    apis: ['Semantic Embedder'],
    icon: 'bi-files',
    onDeviceReason: 'Deduplication runs while the user is still typing, because every similarity check is a local vector comparison — no server calls per keystroke.',
    codeSnippet: `const embedder = await SemanticEmbedder.create({ taskType: "semantic-similarity" });

// Embed the existing issues once
const { embeddings } = await embedder.embed(existingIssueTitles);

// As the user types a new issue, look for semantic near-duplicates
const draft = await embedder.embed(newIssueTitle);
const draftVector = draft.embeddings[0].values;

const duplicates = embeddings
  .map((e, i) => ({ title: existingIssueTitles[i], score: cosineSimilarity(draftVector, e.values) }))
  .filter(d => d.score >= 0.60) // similarity threshold
  .sort((a, b) => b.score - a.score);

if (duplicates.length > 0) showWarning(duplicates);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'cluster-and-label',
    title: 'Cluster & Label',
    description: 'Group raw user feedback into themes with k-means over embeddings, then let the Prompt API name each cluster.',
    category: 'Embeddings',
    apis: ['Semantic Embedder', 'Prompt API'],
    icon: 'bi-bounding-box-circles',
    onDeviceReason: 'Topic discovery over private feedback, notes, or tickets happens entirely locally — the embeddings power the math, the Prompt API writes the labels.',
    codeSnippet: `const embedder = await SemanticEmbedder.create({ taskType: "clustering" });

// Embed all feedback items in one batch
const { embeddings } = await embedder.embed(feedbackItems);
const vectors = embeddings.map(e => e.values);

// Standard k-means over the vectors
const assignments = kMeans(vectors, 4);

// Let the on-device LLM name each cluster
const session = await LanguageModel.create();
for (let c = 0; c < 4; c++) {
  const members = feedbackItems.filter((_, i) => assignments[i] === c);
  const label = await session.prompt(
    "Reply with a 2-4 word theme label for this feedback:\\n- " + members.join("\\n- ")
  );
  console.log(\`Cluster \${c}: \${label}\`);
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'semantic-cache',
    title: 'Semantic Cache',
    description: 'Serve instant answers for paraphrased questions by caching LLM responses under their embeddings.',
    category: 'Embeddings',
    apis: ['Semantic Embedder'],
    icon: 'bi-lightning-charge',
    onDeviceReason: 'A production pattern made visible: skip re-running the language model when a semantically equivalent question was already answered — saving seconds and tokens.',
    codeSnippet: `const embedder = await SemanticEmbedder.create({ taskType: "semantic-similarity" });
const cache = []; // { vector, question, answer }

async function ask(question) {
  const { embeddings: [q] } = await embedder.embed(question);

  // Cache hit: a semantically equivalent question was already answered
  const best = cache
    .map(entry => ({ entry, score: cosineSimilarity(q.values, entry.vector) }))
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 0.85) return best.entry.answer; // instant

  // Cache miss: generate with the Prompt API, then store
  const session = await LanguageModel.create();
  const answer = await session.prompt(question);
  cache.push({ vector: q.values, question, answer });
  return answer;
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'command-palette',
    title: 'Semantic Command Palette',
    description: 'A ⌘K palette that understands intent: describe what you want in your own words and the right action lights up.',
    category: 'Embeddings',
    apis: ['Semantic Embedder', 'Web Speech'],
    icon: 'bi-command',
    onDeviceReason: 'Intent matching on every keystroke is only viable when embedding is free, instant, and private — exactly what an on-device embedder provides.',
    codeSnippet: `const actions = [
  { label: "Toggle dark mode", description: "Switch between light and dark appearance" },
  { label: "Export as PDF", description: "Download the current page as a PDF file" },
  { label: "Mute notifications", description: "Silence all alerts and badges" }
];

// Embed the action descriptions once
const docEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });
const { embeddings } = await docEmbedder.embed(
  actions.map(a => \`\${a.label} — \${a.description}\`)
);

// On every keystroke, rank actions against the typed intent
const queryEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-query" });
const query = await queryEmbedder.embed("make it easier on my eyes at night");
const ranked = actions
  .map((a, i) => ({ ...a, score: cosineSimilarity(query.embeddings[0].values, embeddings[i].values) }))
  .sort((a, b) => b.score - a.score);
// → "Toggle dark mode" wins with zero shared words`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'semantic-word-game',
    title: 'Hot or Cold',
    description: 'Guess the secret word: every guess is embedded on-device and scored by how semantically close it lands.',
    category: 'Embeddings',
    apis: ['Semantic Embedder'],
    icon: 'bi-thermometer-half',
    onDeviceReason: 'A whole word game with zero backend: scoring is a local cosine similarity, so it is instant, free to run, and works offline.',
    codeSnippet: `const embedder = await SemanticEmbedder.create({ taskType: "semantic-similarity" });

const secretWord = "volcano";
const { embeddings: [secret] } = await embedder.embed(secretWord);

async function guess(word) {
  const { embeddings: [g] } = await embedder.embed(word);
  const score = cosineSimilarity(secret.values, g.values);

  if (word.toLowerCase() === secretWord) return "🎉 You got it!";
  if (score >= 0.80) return "🔥 Scorching";
  if (score >= 0.70) return "Hot";
  if (score >= 0.60) return "Warm";
  if (score >= 0.50) return "Cool";
  return "🧊 Freezing";
}

await guess("mountain"); // Hot — semantically close to a volcano
await guess("banana");   // Freezing`,
    promptRunOptions: {},
    initialPrompt: ''
  },

  // TEXT INPUT
  {
    id: 'translation',
    title: 'Translation',
    description: 'Translate text from one language to another with native-like fluency.',
    category: 'Text Input',
    apis: ['Translator', 'Language Detector', 'Prompt API'],
    icon: 'bi-translate',
    onDeviceReason: 'Translations happen instantly without sending user content to external servers, preserving privacy and enabling offline use.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are an expert translator. Translate the following text into French."
});
const response = await session.prompt("Hello world! How are you doing today?");
console.log(response);`,
    promptRunOptions: {
      systemPrompt: 'You are an expert translator. Translate the following text into French.',
      temperature: 0.2,
      topK: 1
    },
    initialPrompt: 'Hello world! How are you doing today?'
  },
  {
    id: 'summarization',
    title: 'Summarization',
    description: 'Condense long articles or text into concise, digestible bullet points.',
    category: 'Text Input',
    apis: ['Summarizer', 'Prompt API'],
    icon: 'bi-card-text',
    onDeviceReason: 'Summarize sensitive documents or personal emails locally, ensuring your private data never leaves your device.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Summarize the text into 3 concise bullet points."
});
const result = await session.prompt(longArticleText);`,
    promptRunOptions: {
      systemPrompt: 'Summarize the text into 3 concise bullet points.',
      temperature: 0.3
    },
    initialPrompt: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.'
  },
  {
    id: 'proofreading',
    title: 'Proofreading & Grammar',
    description: 'Fix grammatical errors and improve sentence structure.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-spellcheck',
    onDeviceReason: 'Real-time text correction while typing without network latency, offering immediate feedback.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Proofread the text. Fix grammar, spelling, and punctuation errors. Only output the corrected text."
});
const result = await session.prompt("I has went to the store yesterday to buy some apples, but they was all out.");`,
    promptRunOptions: {
      systemPrompt: 'Proofread the text. Fix grammar, spelling, and punctuation errors. Only output the corrected text.',
      temperature: 0.1
    },
    initialPrompt: 'I has went to the store yesterday to buy some apples, but they was all out.'
  },
  {
    id: 'tone-changer',
    title: 'Tone Changer',
    description: 'Rewrite casual text into a formal, professional tone.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-person-lines-fill',
    onDeviceReason: 'Fast local processing allows you to preview different tones seamlessly within your email or messaging client.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Rewrite the following text to sound highly professional and polite."
});
const result = await session.prompt("Hey boss, I can\\'t come in today, I feel super sick. Talk tomorrow.");`,
    promptRunOptions: {
      systemPrompt: 'Rewrite the following text to sound highly professional and polite.',
      temperature: 0.6
    },
    initialPrompt: 'Hey boss, I can\'t come in today, I feel super sick. Talk tomorrow.'
  },
  {
    id: 'brainstorming',
    title: 'Brainstorming Ideas',
    description: 'Generate creative ideas for a given topic.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-lightbulb',
    onDeviceReason: 'Unbounded creativity anytime, anywhere, completely independent of your internet connection.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are a creative assistant. Generate 5 unique and innovative ideas for the user\\'s prompt."
});
const result = await session.prompt("I want to build a new mobile app that helps people learn gardening.");`,
    promptRunOptions: {
      systemPrompt: 'You are a creative assistant. Generate 5 unique and innovative ideas for the user\'s prompt.',
      temperature: 0.9
    },
    initialPrompt: 'I want to build a new mobile app that helps people learn gardening.'
  },
  {
    id: 'write-javascript',
    title: 'Write JavaScript',
    description: 'Generate functional JavaScript code from a description.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-filetype-js',
    onDeviceReason: 'Keep your proprietary codebase or ideas private by generating utility functions entirely locally.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are a senior software engineer. Write clean, modern, and efficient JavaScript code to solve the user\\'s request. Provide only the code block."
});
const code = await session.prompt("Write a function to debounce an input function, with a default delay of 300ms.");`,
    promptRunOptions: {
      systemPrompt: 'You are a senior software engineer. Write clean, modern, and efficient JavaScript code to solve the user\'s request. Provide only the code block.',
      temperature: 0.2
    },
    initialPrompt: 'Write a function to debounce an input function, with a default delay of 300ms.'
  },
  {
    id: 'write-html-css',
    title: 'Write HTML/CSS',
    description: 'Generate responsive UI components with HTML and Tailwind CSS.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-filetype-html',
    onDeviceReason: 'Rapid UI prototyping without hitting rate limits or paying cloud API costs.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Generate HTML structure styled with Tailwind CSS utility classes based on the user\\'s prompt."
});
const result = await session.prompt("Create a responsive pricing card component with a title, price, feature list, and a buy button.");`,
    promptRunOptions: {
      systemPrompt: 'Generate HTML structure styled with Tailwind CSS utility classes based on the user\'s prompt.',
      temperature: 0.4
    },
    initialPrompt: 'Create a responsive pricing card component with a title, price, feature list, and a buy button.'
  },
  {
    id: 'eli5',
    title: 'Explain Like I\'m 5',
    description: 'Simplify complex technical or scientific concepts.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-book-half',
    onDeviceReason: 'A quick, private tutor on your device that provides instant analogies and simplifications.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Explain the following complex concept as if the reader is a 5-year-old child. Use simple words and analogies."
});
const result = await session.prompt("Quantum entanglement");`,
    promptRunOptions: {
      systemPrompt: 'Explain the following complex concept as if the reader is a 5-year-old child. Use simple words and analogies.',
      temperature: 0.7
    },
    initialPrompt: 'Quantum entanglement'
  },
  {
    id: 'sql-generator',
    title: 'SQL Query Generator',
    description: 'Convert natural language questions into executable SQL queries.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-database-check',
    onDeviceReason: 'Generate queries for your database without sharing your internal database schema with the cloud.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are an expert database administrator. Generate a valid SQL query based on the user\\'s request. Table: users(id, name, age, city)."
});
const result = await session.prompt("Find the average age of users living in New York.");`,
    promptRunOptions: {
      systemPrompt: 'You are an expert database administrator. Generate a valid SQL query based on the user\'s request. Table: users(id, name, age, city). Only output the SQL.',
      temperature: 0.1
    },
    initialPrompt: 'Find the average age of users living in New York.'
  },
  {
    id: 'write-email',
    title: 'Draft an Email',
    description: 'Quickly draft a polite email from a short description.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-envelope-paper',
    onDeviceReason: 'Draft emails contextually within your mail app offline.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Draft a polite and professional email based on the user\\'s prompt."
});
const result = await session.prompt("Ask my client John if he is available for a meeting next Tuesday at 2pm.");`,
    promptRunOptions: {
      systemPrompt: 'Draft a polite and professional email based on the user\'s prompt.',
      temperature: 0.6
    },
    initialPrompt: 'Ask my client John if he is available for a meeting next Tuesday at 2pm.'
  },

  // IMAGE INPUT
  {
    id: 'ocr',
    title: 'Image OCR',
    description: 'Extract raw text from images, receipts, or documents.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-fonts',
    onDeviceReason: 'Processing images locally means your private photos (like receipts, IDs, or sensitive documents) never leave your device.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image", languages: ["en"] }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Extract all the text visible in this image accurately." },
    { type: "image", value: myImageFile }
  ]
}]);`,
    promptRunOptions: {
      expectedInputs: [{ type: "image", languages: ["en"] }]
    },
    initialPrompt: 'Extract all the text visible in this image accurately.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  },
  {
    id: 'image-description',
    title: 'Image Description',
    description: 'Generate detailed alt-text or descriptions for images.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-image',
    onDeviceReason: 'Quickly generate accessibility alt-tags for entire photo libraries locally without consuming immense bandwidth.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Describe this image in great detail, focusing on the main subjects, setting, and mood." },
    { type: "image", value: myImageFile }
  ]
}]);`,
    promptRunOptions: {
      expectedInputs: [{ type: "image", languages: ["en"] }]
    },
    initialPrompt: 'Describe this image in great detail, focusing on the main subjects, setting, and mood.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  },
  {
    id: 'explain-meme',
    title: 'Explain a Meme',
    description: 'Understand the context, joke, or cultural reference in a meme.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-emoji-laughing',
    onDeviceReason: 'On-device vision models can quickly analyze complex visual humor without sharing your browsing habits.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Explain the joke or cultural reference in this meme." },
    { type: "image", value: memeImageFile }
  ]
}]);`,
    promptRunOptions: {
      expectedInputs: [{ type: "image", languages: ["en"] }]
    },
    initialPrompt: 'Explain the joke or cultural reference in this meme.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  },
  {
    id: 'fridge-recipe',
    title: 'Recipe from Fridge',
    description: 'Take a photo of your fridge contents and get recipe ideas.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-egg-fried',
    onDeviceReason: 'Zero-latency visual processing makes everyday utility apps feel like magic extensions of the camera.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are a master chef. Look at the ingredients in the image and suggest a creative recipe.",
  expectedInputs: [{ type: "image" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "What can I cook with these ingredients?" },
    { type: "image", value: fridgeImageFile }
  ]
}]);`,
    promptRunOptions: {
      systemPrompt: 'You are a master chef. Look at the ingredients in the image and suggest a creative recipe.',
      expectedInputs: [{ type: "image", languages: ["en"] }]
    },
    initialPrompt: 'What can I cook with these ingredients?',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  },
  {
    id: 'image-categorization',
    title: 'Image Categorization',
    description: 'Categorize photos for auto-organization.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-tags',
    onDeviceReason: 'Sort your photo library purely locally without uploading your entire life to the cloud.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Categorize the provided image into one of: Nature, People, Urban, Pets, Document.",
  expectedInputs: [{ type: "image" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Which category does this image belong to?" },
    { type: "image", value: photo }
  ]
}]);`,
    promptRunOptions: {
      systemPrompt: 'Categorize the provided image into one of: Nature, People, Urban, Pets, Document.',
      expectedInputs: [{ type: "image", languages: ["en"] }]
    },
    initialPrompt: 'Which category does this image belong to?',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  },

  // AUDIO INPUT
  {
    id: 'audio-transcription',
    title: 'Audio Transcription',
    description: 'Transcribe spoken audio into accurate text.',
    category: 'Audio Input',
    apis: ['Prompt API'],
    icon: 'bi-mic',
    onDeviceReason: 'Audio files are large. Processing them locally saves massive amounts of data transfer and protects voice privacy.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "audio", languages: ["en"] }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Transcribe this audio clip exactly as spoken." },
    { type: "audio", value: audioFile }
  ]
}]);`,
    promptRunOptions: {
      expectedInputs: [{ type: "audio", languages: ["en"] }]
    },
    initialPrompt: 'Transcribe this audio clip exactly as spoken.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Audio]
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes Extractor',
    description: 'Listen to meeting audio and generate action items.',
    category: 'Audio Input',
    apis: ['Prompt API'],
    icon: 'bi-journal-check',
    onDeviceReason: 'Confidential corporate meetings can be securely transcribed and summarized directly on an employee\'s laptop.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You are an executive assistant. Listen to the meeting and extract the top 3 action items.",
  expectedInputs: [{ type: "audio" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Extract action items." },
    { type: "audio", value: meetingAudio }
  ]
}]);`,
    promptRunOptions: {
      systemPrompt: 'You are an executive assistant. Listen to the meeting and extract the top 3 action items.',
      expectedInputs: [{ type: "audio", languages: ["en"] }]
    },
    initialPrompt: 'Extract action items.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Audio]
  },
  {
    id: 'audio-summarization',
    title: 'Audio Summarization',
    description: 'Get a quick summary of a long voice note.',
    category: 'Audio Input',
    apis: ['Prompt API'],
    icon: 'bi-file-earmark-music',
    onDeviceReason: 'Save time by summarizing long personal voice notes locally without sending private thoughts to an API.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "Listen to the audio and provide a 2-sentence summary of the main points.",
  expectedInputs: [{ type: "audio" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Summarize this." },
    { type: "audio", value: longVoiceNote }
  ]
}]);`,
    promptRunOptions: {
      systemPrompt: 'Listen to the audio and provide a 2-sentence summary of the main points.',
      expectedInputs: [{ type: "audio", languages: ["en"] }]
    },
    initialPrompt: 'Summarize this.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Audio]
  },

  // TOOLS CALLING
  {
    id: 'tool-calling',
    title: 'Tool Calling: Smart Home',
    description: 'Real function calling: tell the model what you want and watch it invoke JavaScript tools that drive a live dashboard.',
    category: 'Tools Calling',
    apis: ['Prompt API'],
    icon: 'bi-house-gear',
    onDeviceReason: 'The agentic loop — reason, call a function, read the result, respond — runs entirely on-device. Your smart-home state and commands never leave the browser.',
    codeSnippet: `const session = await LanguageModel.create({
  systemPrompt: "You control a smart home. Use the tools to fulfil requests.",
  tools: [
    {
      name: "setLight",
      description: "Turn a room's light on or off.",
      inputSchema: {
        type: "object",
        properties: {
          room: { type: "string", enum: ["living room", "bedroom", "kitchen"] },
          on: { type: "boolean" }
        },
        required: ["room", "on"]
      },
      async execute({ room, on }) {
        home.lights[room] = on;        // really updates the dashboard
        return JSON.stringify({ ok: true, room, on });
      }
    },
    {
      name: "setThermostat",
      description: "Set the target temperature in Celsius.",
      inputSchema: {
        type: "object",
        properties: { temperature: { type: "number" } },
        required: ["temperature"]
      },
      async execute({ temperature }) {
        home.thermostat = temperature;
        return JSON.stringify({ ok: true, temperature });
      }
    }
  ]
});

// The model decides which tools to call, in what order
const reply = await session.prompt("Make the living room cozy and warm for movie night.");`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'csv-qa',
    title: 'CSV Q&A',
    description: 'Paste a CSV and ask questions in plain English — answers come back structured, with the reasoning shown.',
    category: 'Tools Calling',
    apis: ['Prompt API'],
    icon: 'bi-table',
    onDeviceReason: 'Business data is exactly what should not be pasted into a cloud chatbot. Here the spreadsheet is analyzed by the on-device model and never leaves the tab.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    reasoning: { type: "string" }
  },
  required: ["answer", "reasoning"],
  additionalProperties: false
};

const session = await LanguageModel.create({
  systemPrompt: "You answer questions about CSV data accurately. " +
    "Show your calculation in the reasoning field."
});

const result = await session.prompt(
  \`CSV data:\\n\${csvText}\\n\\nQuestion: Which region had the highest total revenue?\`,
  { responseConstraint: schema }
);

const { answer, reasoning } = JSON.parse(result);`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'screenshot-to-code',
    title: 'Screenshot → UI Code',
    description: 'Drop a UI screenshot and the multimodal model rebuilds it as HTML — rendered live next to the original.',
    category: 'Image Input',
    apis: ['Prompt API'],
    icon: 'bi-window-split',
    onDeviceReason: 'Design mockups and internal screenshots are sensitive by default. On-device vision turns them into code without uploading a single pixel.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }],
  systemPrompt: "You convert UI screenshots into clean, semantic HTML " +
    "with inline CSS styles. Output ONLY the HTML, no explanations."
});

const bitmap = await createImageBitmap(screenshotFile);

const stream = session.promptStreaming([{
  role: "user",
  content: [
    { type: "text", value: "Rebuild this UI as HTML with inline styles." },
    { type: "image", value: bitmap }
  ]
}]);

let html = "";
for await (const chunk of stream) html += chunk;

// Render the result safely in a sandboxed iframe
iframe.sandbox = "";
iframe.srcdoc = html;`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'regex-lab',
    title: 'Regex Lab',
    description: 'Describe a pattern in English, get a regex with an explanation — and test it live with match highlighting.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-asterisk',
    onDeviceReason: 'A regex assistant that lives in your dev workflow: instant, offline, and free to iterate against as many test strings as you like.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    pattern: { type: "string" },
    flags: { type: "string" },
    explanation: { type: "string" }
  },
  required: ["pattern", "flags", "explanation"],
  additionalProperties: false
};

const session = await LanguageModel.create({
  systemPrompt: "You write JavaScript regular expressions. " +
    "Return the pattern WITHOUT surrounding slashes."
});

const result = await session.prompt(
  "Write a regex that matches ISO dates like 2026-07-29.",
  { responseConstraint: schema }
);

const { pattern, flags, explanation } = JSON.parse(result);
const regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");

for (const match of testString.matchAll(regex)) {
  highlight(match.index, match[0]);
}`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'session-branching',
    title: 'Branching Conversations',
    description: 'Fork one conversation into two futures with session.clone() — both branches inherit the context, then diverge side by side.',
    category: 'Text Input',
    apis: ['Prompt API'],
    icon: 'bi-signpost-2',
    onDeviceReason: 'Cloning a session copies its context without re-processing a single token — exploring multiple continuations is instant and free when the model is local.',
    codeSnippet: `const session = await LanguageModel.create();

// Build up shared context once
const base = await session.prompt(
  "We're naming a new open-source library for on-device AI benchmarks. Suggest a direction."
);

// Fork the conversation — each clone inherits the full history
const optimist = await session.clone();
const skeptic = await session.clone();

// The branches diverge from the same starting point
const [praise, critique] = await Promise.all([
  optimist.prompt("Build on your suggestion enthusiastically. What makes it great?"),
  skeptic.prompt("Now be brutally honest. What's wrong with your suggestion?")
]);

// The original session is untouched by either branch
optimist.destroy();
skeptic.destroy();`,
    promptRunOptions: {},
    initialPrompt: ''
  },
  {
    id: 'structured-json',
    title: 'Structured JSON Output',
    description: 'Force the model to output a strictly formatted JSON object.',
    category: 'Tools Calling',
    apis: ['Prompt API'],
    icon: 'bi-braces',
    onDeviceReason: 'Perfect for local data parsing pipelines where data shouldn\'t leave the system, ensuring reliable programmatic ingestion.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" }
  },
  required: ["name", "age"]
};

const session = await LanguageModel.create();
const result = await session.prompt(
  "My name is John Doe and I just turned 30 years old.",
  { responseConstraint: schema }
);`,
    promptRunOptions: {
      structuredOutputEnabled: true,
      structuredOutputJsonSchema: JSON.stringify({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "age"],
        additionalProperties: false
      }, null, 2)
    },
    initialPrompt: 'Extract data: My name is John Doe and I just turned 30 years old yesterday.'
  },
  {
    id: 'extract-entities',
    title: 'Extract Entities (NER)',
    description: 'Extract people, locations, and organizations into JSON.',
    category: 'Tools Calling',
    apis: ['Prompt API'],
    icon: 'bi-box-seam',
    onDeviceReason: 'Safe, private local extraction of names and addresses from personal text.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    people: { type: "array", items: { type: "string" } },
    locations: { type: "array", items: { type: "string" } }
  }
};
const session = await LanguageModel.create();
const result = await session.prompt(
  "Yesterday, Alice and Bob traveled from Seattle to Tokyo.",
  { responseConstraint: schema }
);`,
    promptRunOptions: {
      structuredOutputEnabled: true,
      structuredOutputJsonSchema: JSON.stringify({
        type: "object",
        properties: {
          people: { type: "array", items: { type: "string" } },
          locations: { type: "array", items: { type: "string" } }
        },
        required: ["people", "locations"],
        additionalProperties: false
      }, null, 2)
    },
    initialPrompt: 'Yesterday, Alice and Bob traveled from Seattle to Tokyo.'
  },

  // MIX AND MATCH
  {
    id: 'image-audio-query',
    title: 'Image + Audio Query',
    description: 'Ask a question about an image using your voice.',
    category: 'Mix-and-Match',
    apis: ['Prompt API'],
    icon: 'bi-collection-play',
    onDeviceReason: 'Combining multiple heavy modalities (images and audio) locally avoids massive upload times and creates a seamless interactive experience.',
    codeSnippet: `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }, { type: "audio" }]
});
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "image", value: myImageFile },
    { type: "audio", value: myQuestionAudioFile }
  ]
}]);`,
    promptRunOptions: {
      expectedInputs: [{ type: "image", languages: ["en"] }, { type: "audio", languages: ["en"] }]
    },
    initialPrompt: '',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image, AttachmentTypeEnum.Audio]
  },
  {
    id: 'receipt-to-json',
    title: 'Receipt to JSON',
    description: 'Extract line items from a receipt image into structured JSON data.',
    category: 'Mix-and-Match',
    apis: ['Prompt API'],
    icon: 'bi-receipt',
    onDeviceReason: 'Combines Vision processing and Structured JSON Output entirely locally, creating a private and powerful expense tracker.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    total: { type: "number" },
    vendor: { type: "string" },
    items: { type: "array", items: { type: "string" } }
  }
};
const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});
const result = await session.prompt([
  { role: "user", content: [
    { type: "text", value: "Extract the receipt details." },
    { type: "image", value: receiptImage }
  ]}
], { responseConstraint: schema });`,
    promptRunOptions: {
      expectedInputs: [{ type: "image", languages: ["en"] }],
      structuredOutputEnabled: true,
      structuredOutputJsonSchema: JSON.stringify({
        type: "object",
        properties: {
          total: { type: "number" },
          vendor: { type: "string" },
          items: { type: "array", items: { type: "string" } }
        },
        required: ["total", "vendor", "items"],
        additionalProperties: false
      }, null, 2)
    },
    initialPrompt: 'Extract the receipt details into JSON.',
    requiredAttachmentTypes: [AttachmentTypeEnum.Image]
  }
];

// Card previews live in their own file to keep this one readable; they are attached by id.
export const DEMOS_DATA: DemoExample[] = DEMOS.map(demo => ({
  ...demo,
  preview: DEMO_PREVIEWS[demo.id],
}));
