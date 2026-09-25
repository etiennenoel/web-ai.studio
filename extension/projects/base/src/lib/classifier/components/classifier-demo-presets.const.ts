import { ClassifierDemoPreset } from './classifier-demo-preset.interface';

/** Presets for the interactive demo. The first one is the explainer's Example 1. */
export const CLASSIFIER_DEMO_PRESETS: ClassifierDemoPreset[] = [
  {
    id: 'ticket-triage',
    title: 'Support ticket triage',
    description: 'Urgency, department, and severity in one call (the explainer example).',
    schema: {
      context: 'Enterprise customer support ticket router.',
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      questions: [
        { id: 'is_urgent', type: 'binary', prompt: 'Does this ticket require immediate incident response?' },
        {
          id: 'category',
          type: 'categorical',
          prompt: 'Select the primary support department.',
          options: [
            { label: 'bug', description: 'Production crash or software defect' },
            { label: 'billing', description: 'Invoice or double-charge issue' },
            { label: 'feature_request', description: 'Enhancement request' },
          ],
        },
        {
          id: 'severity',
          type: 'ordinal',
          prompt: 'Rate the business impact from 1 (minimal) to 5 (critical).',
          options: [
            { label: '1', description: 'Minimal impact' },
            { label: '2', description: 'Low impact' },
            { label: '3', description: 'Moderate impact' },
            { label: '4', description: 'High impact' },
            { label: '5', description: 'Critical production outage' },
          ],
        },
      ],
    },
    samples: [
      'Urgent: our production database pipeline crashes with a fatal segfault and customers cannot sign in!',
      'We were charged twice on invoice #4821 this month, can you refund the duplicate?',
      'It would be nice if the dashboard had a dark mode toggle.',
    ],
  },
  {
    id: 'command-palette',
    title: 'Command palette matching',
    description: 'Map a natural-language goal to an editor command.',
    schema: {
      context: 'Document editor command palette',
      questions: [
        {
          id: 'command',
          type: 'categorical',
          prompt: "Which command best fulfills the user's goal?",
          options: [
            { label: 'export_pdf', description: 'Download or save the document as a PDF' },
            { label: 'share_link', description: 'Invite collaborators or copy a sharing link' },
            { label: 'archive_doc', description: 'Move the document to trash or archive' },
          ],
        },
      ],
    },
    samples: ['let my coworkers view this file', 'I need a copy I can print', 'get rid of this old draft'],
  },
  {
    id: 'draft-guardrails',
    title: 'Draft guardrails',
    description: 'Check a message before it is sent, on-device.',
    schema: {
      context: 'Pre-send review of a chat message in a team workspace.',
      questions: [
        { id: 'contains_secret', type: 'binary', prompt: 'Does the message contain a password, API key, or other secret?' },
        { id: 'tone_constructive', type: 'binary', prompt: 'Is the tone constructive and respectful?' },
        {
          id: 'frustration',
          type: 'ordinal',
          prompt: 'How frustrated does the author sound, from 1 (calm) to 5 (furious)?',
          options: [
            { label: '1', description: 'Calm' },
            { label: '2', description: 'Slightly annoyed' },
            { label: '3', description: 'Frustrated' },
            { label: '4', description: 'Angry' },
            { label: '5', description: 'Furious' },
          ],
        },
      ],
    },
    samples: [
      'Here is the staging key: sk_live_51H8f2K... please do not share it.',
      'Thanks for the review! I will fix the null check and re-request.',
      'This is the third time the build broke because of your change. Fix it now.',
    ],
  },
  {
    id: 'multilingual',
    title: 'Multilingual routing',
    description: 'English questions, Japanese or French input. Needs a multilingual model.',
    schema: {
      context: 'Customer support inbox.',
      questions: [
        {
          id: 'department',
          type: 'categorical',
          prompt: 'Which department should handle this request?',
          options: [
            { label: 'billing', description: 'invoices, payments, refunds' },
            { label: 'technical', description: 'bugs, outages, system errors' },
            { label: 'sales', description: 'pricing, new contracts' },
            { label: 'other', description: 'everything else' },
          ],
        },
        { id: 'refund_requested', type: 'binary', prompt: 'Does the user explicitly request a refund?' },
      ],
    },
    samples: [
      '同じ注文の代金が二回引き落とされています。差額の返金をお願いします。',
      "Le site ne charge plus depuis ce matin, j'ai une erreur 502 à chaque fois.",
      'Quanto costa il piano Enterprise per 200 utenti?',
    ],
  },
];
