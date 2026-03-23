import { DemoExample } from '../models/demo.interface';
import { AttachmentTypeEnum } from '../enums/attachment-type.enum';

export const DEMOS_DATA: DemoExample[] = [
  // TEXT INPUT
  {
    id: 'translation',
    title: 'Translation',
    description: 'Translate text from one language to another with native-like fluency.',
    category: 'Text Input',
    icon: 'bi-translate',
    onDeviceReason: 'Translations happen instantly without sending user content to external servers, preserving privacy and enabling offline use.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-card-text',
    onDeviceReason: 'Summarize sensitive documents or personal emails locally, ensuring your private data never leaves your device.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-spellcheck',
    onDeviceReason: 'Real-time text correction while typing without network latency, offering immediate feedback.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-person-lines-fill',
    onDeviceReason: 'Fast local processing allows you to preview different tones seamlessly within your email or messaging client.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-lightbulb',
    onDeviceReason: 'Unbounded creativity anytime, anywhere, completely independent of your internet connection.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-filetype-js',
    onDeviceReason: 'Keep your proprietary codebase or ideas private by generating utility functions entirely locally.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-filetype-html',
    onDeviceReason: 'Rapid UI prototyping without hitting rate limits or paying cloud API costs.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-book-half',
    onDeviceReason: 'A quick, private tutor on your device that provides instant analogies and simplifications.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-database-check',
    onDeviceReason: 'Generate queries for your database without sharing your internal database schema with the cloud.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-envelope-paper',
    onDeviceReason: 'Draft emails contextually within your mail app offline.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-fonts',
    onDeviceReason: 'Processing images locally means your private photos (like receipts, IDs, or sensitive documents) never leave your device.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-image',
    onDeviceReason: 'Quickly generate accessibility alt-tags for entire photo libraries locally without consuming immense bandwidth.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-emoji-laughing',
    onDeviceReason: 'On-device vision models can quickly analyze complex visual humor without sharing your browsing habits.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-egg-fried',
    onDeviceReason: 'Zero-latency visual processing makes everyday utility apps feel like magic extensions of the camera.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-tags',
    onDeviceReason: 'Sort your photo library purely locally without uploading your entire life to the cloud.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-mic',
    onDeviceReason: 'Audio files are large. Processing them locally saves massive amounts of data transfer and protects voice privacy.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-journal-check',
    onDeviceReason: 'Confidential corporate meetings can be securely transcribed and summarized directly on an employee\'s laptop.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    icon: 'bi-file-earmark-music',
    onDeviceReason: 'Save time by summarizing long personal voice notes locally without sending private thoughts to an API.',
    codeSnippet: `const session = await ai.languageModel.create({
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
    id: 'structured-json',
    title: 'Structured JSON Output',
    description: 'Force the model to output a strictly formatted JSON object.',
    category: 'Tools Calling',
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

const session = await ai.languageModel.create();
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
    icon: 'bi-box-seam',
    onDeviceReason: 'Safe, private local extraction of names and addresses from personal text.',
    codeSnippet: `const schema = {
  type: "object",
  properties: {
    people: { type: "array", items: { type: "string" } },
    locations: { type: "array", items: { type: "string" } }
  }
};
const session = await ai.languageModel.create();
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
    icon: 'bi-collection-play',
    onDeviceReason: 'Combining multiple heavy modalities (images and audio) locally avoids massive upload times and creates a seamless interactive experience.',
    codeSnippet: `const session = await ai.languageModel.create({
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
const session = await ai.languageModel.create({
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
