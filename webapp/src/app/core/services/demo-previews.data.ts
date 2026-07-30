import { DemoPreview } from '../models/demo-preview.interface';

/**
 * Illustrative card previews, keyed by demo id.
 *
 * Every value here is hand-authored sample data — it is never produced by a model. The
 * goal is that someone scanning /demos can tell what a demo outputs before opening it,
 * so keep each preview short (3-4 lines) and representative of the real demo.
 */
export const DEMO_PREVIEWS: Record<string, DemoPreview> = {
  // ---------------------------------------------------------------- Speech
  'live-translated-captions': {
    kind: 'captions',
    source: { icon: 'bi-mic-fill', label: 'live microphone' },
    rows: [
      { role: 'in', text: '"Let\'s meet at the café at seven."' },
      { role: 'out', text: '« Retrouvons-nous au café à sept heures. »' },
      { role: 'in', text: '"I\'ll bring the tickets."' },
      { role: 'out', text: '« J\'apporterai les billets. »' },
    ],
  },

  'speak-to-fill': {
    kind: 'json',
    source: { icon: 'bi-mic-fill', label: '"table for four next Friday at seven, outside"' },
    code: `{
  "partySize": 4,
  "date": "2026-08-07",
  "time": "19:00",
  "seating": "outside"
}`,
  },

  'asr-quality-tiers': {
    kind: 'list',
    source: { icon: 'bi-mic-fill', label: 'same passage, three models' },
    rows: [
      { text: 'command', score: 0.71, meta: '180 ms' },
      { text: 'dictation', score: 0.94, meta: '420 ms' },
      { text: 'conversation', score: 0.97, meta: '910 ms' },
    ],
  },

  'contextual-biasing': {
    kind: 'diff',
    source: { icon: 'bi-mic-fill', label: 'without → with biasing' },
    before: [
      { text: 'add ' },
      { text: 'tiny gemma', changed: true },
      { text: ' and ' },
      { text: 'web and then', changed: true },
      { text: ' benchmarks to the ' },
      { text: 'axon sweet', changed: true },
    ],
    after: [
      { text: 'Add ' },
      { text: 'TinyGemma', changed: true },
      { text: ' and ' },
      { text: 'WebNN', changed: true },
      { text: ' benchmarks to the ' },
      { text: 'Axon suite', changed: true },
    ],
  },

  'dictate-and-polish': {
    kind: 'diff',
    source: { icon: 'bi-mic-fill', label: 'spoken draft' },
    before: [
      { text: 'so basically i think we ' },
      { text: 'should of', changed: true },
      { text: ' shipped it last week and ' },
      { text: 'its', changed: true },
      { text: ' fine' },
    ],
    after: [
      { text: 'We ' },
      { text: 'should have', changed: true },
      { text: ' shipped it last week, and ' },
      { text: 'it is', changed: true },
      { text: ' fine.' },
    ],
  },

  'story-time': {
    kind: 'io',
    source: { icon: 'bi-volume-up-fill', label: 'read aloud, word by word' },
    rows: [
      { role: 'in', text: 'a shy dragon · a lost umbrella · the moon' },
      { role: 'out', text: 'Once upon a time, a very shy dragon found a red umbrella on the road to the moon…' },
    ],
  },

  'tongue-twister': {
    kind: 'list',
    source: { icon: 'bi-mic-fill', label: '"she sells seashells by the seashore"' },
    rows: [
      { text: 'attempt 1', score: 0.62, meta: '4.8 s' },
      { text: 'attempt 2', score: 0.81, meta: '3.4 s' },
      { text: 'attempt 3', score: 0.94, meta: '3.1 s' },
    ],
  },

  // --------------------------------------------------------- Text / writing
  'polyglot-chat': {
    kind: 'chat',
    rows: [
      { role: 'in', text: 'Peux-tu m\'envoyer le devis ?' },
      { role: 'out', text: 'Can you send me the quote?' },
      { role: 'in', text: 'Sure — sending it over now.' },
      { role: 'out', text: 'Bien sûr — je l\'envoie tout de suite.' },
    ],
  },

  'proofreader-inline': {
    kind: 'diff',
    before: [
      { text: 'I ' },
      { text: 'has went', changed: true },
      { text: ' to the store yesterday, but they ' },
      { text: 'was', changed: true },
      { text: ' all out.' },
    ],
    after: [
      { text: 'I ' },
      { text: 'went', changed: true },
      { text: ' to the store yesterday, but they ' },
      { text: 'were', changed: true },
      { text: ' all out.' },
    ],
  },

  'tone-pad': {
    kind: 'io',
    rows: [
      { role: 'in', text: '"Can you send the report?" · more-formal · longer' },
      { role: 'out', text: 'Would you mind forwarding the report when you have a moment? I would be grateful.' },
    ],
  },

  'summarizer-matrix': {
    kind: 'chips',
    caption: 'One 900-word article, every option combination:',
    rows: [
      { group: 'type', label: 'tldr' },
      { label: 'key-points' },
      { label: 'teaser' },
      { label: 'headline' },
      { group: 'length', label: 'short' },
      { label: 'medium' },
      { label: 'long' },
    ],
  },

  'reply-composer': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Re: Contract renewal — can we meet Thursday? · intent: decline' },
      { role: 'out', text: 'Thanks for reaching out. Thursday does not work on my end, but I am free Friday morning…' },
    ],
  },

  'translation': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Hello world! How are you doing today?' },
      { role: 'out', text: 'Bonjour le monde ! Comment allez-vous aujourd\'hui ?' },
    ],
  },

  'summarization': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to…' },
      { role: 'out', text: 'AI is machine-demonstrated intelligence; the field studies agents that act to maximise their goals.' },
    ],
  },

  'proofreading': {
    kind: 'diff',
    before: [
      { text: 'I ' },
      { text: 'has went', changed: true },
      { text: ' to the store yesterday to buy some apples, but they ' },
      { text: 'was', changed: true },
      { text: ' all out.' },
    ],
    after: [
      { text: 'I ' },
      { text: 'went', changed: true },
      { text: ' to the store yesterday to buy some apples, but they ' },
      { text: 'were', changed: true },
      { text: ' all out.' },
    ],
  },

  'tone-changer': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Hey boss, I can\'t come in today, I feel super sick. Talk tomorrow.' },
      { role: 'out', text: 'Good morning — I am unwell today and will not be able to come in. I will follow up tomorrow.' },
    ],
  },

  'brainstorming': {
    kind: 'chips',
    caption: 'A mobile app that helps people learn gardening',
    rows: [
      { label: 'Plant-a-day streaks' },
      { label: 'Photo plant doctor' },
      { label: 'Balcony sun mapper' },
      { label: 'Seed swap map' },
      { label: 'Watering reminders' },
    ],
  },

  'eli5': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Quantum entanglement' },
      { role: 'out', text: 'Imagine two magic coins. Flip one and it lands heads — the other instantly lands tails, however far away it is.' },
    ],
  },

  'write-email': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Ask my client John if he is available next Tuesday at 2pm.' },
      { role: 'out', text: 'Hi John, would Tuesday at 2:00 pm work for a quick call? Happy to shift if another time suits you.' },
    ],
  },

  'write-javascript': {
    kind: 'code',
    caption: 'Write a debounce function, default delay 300ms.',
    code: `function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
  },

  'write-html-css': {
    kind: 'code',
    caption: 'A responsive pricing card',
    code: `<div class="rounded-2xl border p-6 shadow-sm">
  <h3 class="text-lg font-bold">Pro</h3>
  <p class="text-4xl font-extrabold">$29<span>/mo</span></p>
  <ul class="mt-4 space-y-1 text-sm">…</ul>
  <button class="mt-6 w-full rounded-xl">Buy</button>
</div>`,
  },

  'sql-generator': {
    kind: 'code',
    caption: 'Find the average age of users living in New York.',
    code: `SELECT AVG(age) AS average_age
FROM users
WHERE city = 'New York';`,
  },

  'regex-lab': {
    kind: 'code',
    caption: 'Match a semver tag like v1.2.3',
    code: `/^v(\\d+)\\.(\\d+)\\.(\\d+)$/
✓ v1.2.3    ✓ v10.0.1
✗ 1.2.3     ✗ v1.2`,
  },

  'session-branching': {
    kind: 'io',
    rows: [
      { role: 'in', text: 'Plan a 3-day trip to Kyoto' },
      { role: 'out', text: 'Branch A — temples & gardens: Fushimi Inari at dawn, then Arashiyama…' },
      { role: 'out', text: 'Branch B — food & nightlife: Nishiki market, then Pontocho alley…' },
    ],
  },

  'mystery-language': {
    kind: 'list',
    query: '"Ik heb honger, maar de winkel is gesloten."',
    rows: [
      { text: 'Dutch', score: 0.94, meta: 'your guess ✓' },
      { text: 'Afrikaans', score: 0.05 },
      { text: 'German', score: 0.01 },
    ],
  },

  // ------------------------------------------------------------ Mix & match
  'localization-qa': {
    kind: 'list',
    source: { icon: 'bi-translate', label: 'fr.json · 3 stragglers' },
    rows: [
      { text: '"checkout.button": "Buy now"', score: 0.98, meta: 'en' },
      { text: '"cart.empty": "Your cart is empty"', score: 0.96, meta: 'en' },
      { text: '"nav.home": "Accueil"', score: 0.99, meta: 'fr ✓' },
    ],
  },

  'universal-inbox': {
    kind: 'chips',
    caption: 'Fwd: Facture en retard — pouvez-vous vérifier ?',
    rows: [
      { group: 'detected', label: 'fr' },
      { group: 'translated', label: 'en' },
      { group: 'folder', label: 'Billing' },
      { group: 'reply', label: 'drafted in fr' },
    ],
  },

  'image-audio-query': {
    kind: 'chat',
    source: { icon: 'bi-image', label: 'chart.png + spoken question' },
    rows: [
      { role: 'in', text: '"Which bar is the tallest here?"' },
      { role: 'out', text: 'March, at roughly 4.2k — about double February.' },
    ],
  },

  'receipt-to-json': {
    kind: 'json',
    source: { icon: 'bi-receipt', label: 'receipt.jpg' },
    code: `{
  "merchant": "Blue Bottle Coffee",
  "total": 18.72,
  "items": [
    { "name": "Latte", "price": 5.50 }
  ]
}`,
  },

  'omnibox': {
    kind: 'list',
    query: '"pourriez-vous m\'aider avec ma commande ?"',
    rows: [
      { text: '→ Translator', score: 0.93, meta: 'fr detected' },
      { text: '→ Prompt API', score: 0.31 },
      { text: '→ Proofreader', score: 0.11 },
    ],
  },

  // ------------------------------------------------------------- Embeddings
  'document-chat': {
    kind: 'chat',
    source: { icon: 'bi-file-earmark-text', label: 'employee-handbook.pdf' },
    rows: [
      { role: 'in', text: 'How many vacation days do I get?' },
      { role: 'out', text: '20 days per year, accruing monthly. [p. 14]' },
    ],
  },

  'semantic-search': {
    kind: 'list',
    query: 'my card was declined',
    rows: [
      { text: 'Why did my payment fail?', score: 0.91, meta: 'semantic' },
      { text: 'Update your billing details', score: 0.78, meta: 'semantic' },
      { text: 'Card security FAQ', score: 0.34, meta: 'keyword' },
    ],
  },

  'smart-triage': {
    kind: 'list',
    query: 'The app crashes when I upload a PDF',
    rows: [
      { text: 'Bug report', score: 0.93 },
      { text: 'Feature request', score: 0.21 },
      { text: 'Billing question', score: 0.06 },
    ],
  },

  'duplicate-detector': {
    kind: 'list',
    query: 'App freezes on file upload',
    rows: [
      { text: '#412 Crash when attaching PDFs', score: 0.88, meta: 'duplicate' },
      { text: '#309 Upload spinner never ends', score: 0.74, meta: 'related' },
      { text: '#118 Dark mode contrast', score: 0.11 },
    ],
  },

  'cluster-and-label': {
    kind: 'chips',
    caption: '128 feedback notes → 4 named themes',
    rows: [
      { label: 'Onboarding friction' },
      { label: 'Pricing confusion' },
      { label: 'Mobile bugs' },
      { label: 'Export requests' },
    ],
  },

  'semantic-cache': {
    kind: 'list',
    query: 'how do I reset my password?',
    rows: [
      { text: 'cached: "steps to reset a password"', score: 0.94, meta: 'hit · 0 ms' },
      { text: 'cached: "change my email address"', score: 0.41, meta: 'miss' },
    ],
  },

  'command-palette': {
    kind: 'list',
    query: 'make the page easier on my eyes',
    rows: [
      { text: 'Toggle dark theme', score: 0.95 },
      { text: 'Increase font size', score: 0.62 },
      { text: 'Print this page', score: 0.12 },
    ],
  },

  'semantic-word-game': {
    kind: 'list',
    query: 'secret word · guess #7',
    rows: [
      { text: 'stream', score: 0.86, meta: 'hot' },
      { text: 'ocean', score: 0.72, meta: 'warm' },
      { text: 'bicycle', score: 0.08, meta: 'cold' },
    ],
  },

  'moderation-cascade': {
    kind: 'list',
    query: '2,044 comments through the cascade',
    rows: [
      { text: 'cleared instantly', score: 0.9 },
      { text: 'escalated to the LLM', score: 0.06 },
      { text: 'blocked instantly', score: 0.04 },
    ],
  },

  // ------------------------------------------------------------ Image input
  'camera-qa': {
    kind: 'chat',
    source: { icon: 'bi-camera-fill', label: 'frozen webcam frame' },
    rows: [
      { role: 'in', text: 'What model is this router?' },
      { role: 'out', text: 'A TP-Link Archer — the label on the side reads AX55.' },
    ],
  },

  'draw-and-guess': {
    kind: 'io',
    source: { icon: 'bi-pencil-fill', label: 'your sketch · 12 strokes' },
    rows: [
      { role: 'out', text: 'Looks like a fox — the pointed ears and bushy tail give it away.' },
    ],
  },

  'ocr': {
    kind: 'io',
    source: { icon: 'bi-image', label: 'receipt.jpg' },
    rows: [
      { role: 'out', text: 'WHOLE FOODS MARKET · 4th St · Oat milk 5.49 · Bananas 2.10 · TOTAL 18.72' },
    ],
  },

  'image-description': {
    kind: 'io',
    source: { icon: 'bi-image', label: 'beach-dog.jpg' },
    rows: [
      { role: 'out', text: 'A golden retriever mid-leap over wet sand at sunset, the spray backlit by low orange light.' },
    ],
  },

  'explain-meme': {
    kind: 'io',
    source: { icon: 'bi-image', label: 'meme.png' },
    rows: [
      { role: 'out', text: 'It is the "distracted boyfriend" format — the joke is abandoning a stable stack for whatever is new.' },
    ],
  },

  'fridge-recipe': {
    kind: 'chips',
    source: { icon: 'bi-camera-fill', label: 'fridge.jpg' },
    caption: 'Spotted: eggs, spinach, feta, tortillas',
    rows: [
      { label: 'Spinach & feta frittata' },
      { label: 'Breakfast quesadilla' },
      { label: 'Greek scramble wrap' },
    ],
  },

  'image-categorization': {
    kind: 'list',
    source: { icon: 'bi-image', label: 'IMG_2043.jpg' },
    rows: [
      { text: 'Travel', score: 0.92 },
      { text: 'Landscape', score: 0.81 },
      { text: 'Food', score: 0.04 },
    ],
  },

  'screenshot-to-code': {
    kind: 'code',
    source: { icon: 'bi-image', label: 'dashboard.png' },
    code: `<header class="flex items-center justify-between">
  <h1 class="text-xl font-semibold">Dashboard</h1>
  <button class="rounded-lg bg-indigo-600 px-3 py-1.5">New</button>
</header>`,
  },

  'photo-search': {
    kind: 'list',
    source: { icon: 'bi-images', label: '128 local photos' },
    query: 'food on a table',
    rows: [
      { text: 'brunch spread', score: 0.89 },
      { text: 'birthday cake', score: 0.71 },
      { text: 'dog on the beach', score: 0.09 },
    ],
  },

  // ------------------------------------------------------------ Audio input
  'audio-transcription': {
    kind: 'io',
    source: { icon: 'bi-soundwave', label: 'voice-note.m4a · 0:38' },
    rows: [
      { role: 'out', text: '"Reminder: send the deck to Priya before Thursday and book the meeting room."' },
    ],
  },

  'meeting-notes': {
    kind: 'io',
    source: { icon: 'bi-soundwave', label: 'standup.wav · 11:42' },
    rows: [
      { role: 'out', text: '☐ Priya — ship the migration script by Friday' },
      { role: 'out', text: '☐ Sam — reply to the security questionnaire' },
    ],
  },

  'audio-summarization': {
    kind: 'io',
    source: { icon: 'bi-soundwave', label: 'client-call.m4a · 4:12' },
    rows: [
      { role: 'out', text: 'Client wants launch pushed a week, budget is approved, and new mockups are due Monday.' },
    ],
  },

  'study-kit': {
    kind: 'chips',
    source: { icon: 'bi-mortarboard-fill', label: 'lecture-week-4.m4a · 52:10' },
    caption: 'Built from the recording:',
    rows: [
      { label: 'Transcript · 8,410 words' },
      { label: '12 key points' },
      { label: 'Q&A chat' },
      { label: '34 flashcards' },
    ],
  },

  // ----------------------------------------------------------- Tool calling
  'tool-calling': {
    kind: 'code',
    caption: 'Dim the living room to 40% and set an evening scene.',
    code: `setBrightness({ room: "living", level: 40 })
  → { ok: true, level: 40 }
setScene({ room: "living", scene: "evening" })
  → { ok: true }`,
  },

  'csv-qa': {
    kind: 'chat',
    source: { icon: 'bi-filetype-csv', label: 'sales-q2.csv · 1,204 rows' },
    rows: [
      { role: 'in', text: 'Which region grew the most last quarter?' },
      { role: 'out', text: 'EMEA — up 34% ($412k → $552k).' },
    ],
  },

  'structured-json': {
    kind: 'json',
    caption: 'My name is John Doe and I just turned 30 years old yesterday.',
    code: `{
  "name": "John Doe",
  "age": 30
}`,
  },

  'extract-entities': {
    kind: 'json',
    caption: 'Yesterday, Alice and Bob traveled from Seattle to Tokyo.',
    code: `{
  "people": ["Alice", "Bob"],
  "locations": ["Seattle", "Tokyo"],
  "organizations": []
}`,
  },
};
