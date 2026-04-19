import { ChatMode } from './openAiPrompt';

export interface ChatModeOption {
  mode: ChatMode;
  label: string;
  promptHint: string;
  summary: string;
  starterGuidance: string;
  featuredPrompt: string;
}

export const chatModeOptions: ChatModeOption[] = [
  {
    mode: 'fathers',
    label: 'Ask a Father',
    promptHint: 'What did the early Fathers say about the Eucharist?',
    summary: 'Prioritize patristic witness and the voice of the early Church.',
    starterGuidance: 'Use the Fathers when helpful and explain their witness in a way a modern reader can follow.',
    featuredPrompt: 'How did the early Church Fathers speak about the Eucharist as the real presence of Christ?'
  },
  {
    mode: 'proofs',
    label: 'Logical Proofs',
    promptHint: 'Give me a Thomistic argument for God as first cause.',
    summary: 'Use a more academic and scholastic register for users who want argument and structure.',
    starterGuidance: 'Use a more academic register and show the logic clearly.',
    featuredPrompt: 'Give me a Thomistic argument for the existence of God and explain each step.'
  },
  {
    mode: 'apologetics',
    label: 'Apologetic Answers',
    promptHint: 'How would you explain Marian devotion to a Protestant friend?',
    summary: 'Answer in a clear public-facing style for non-Catholics, skeptics, and first-time inquirers.',
    starterGuidance: 'Explain the answer clearly for someone outside the Catholic tradition.',
    featuredPrompt: 'How would you explain Marian devotion to a Protestant friend without using insider jargon?'
  },
  {
    mode: 'dogmaticSources',
    label: 'Handbook of Dogmatic Sources',
    promptHint: 'Ask for the doctrine and its theological note in handbook form.',
    summary: 'Ask doctrinal questions, identify the theological note, and receive a concise handbook answer within the approved dogmatic source set.',
    starterGuidance: 'This mode stays within the approved handbook source set, names the theological note when it can do so responsibly, and answers in a compact doctrinal handbook style.',
    featuredPrompt: 'What is the theological note on sanctifying grace, actual grace, and justification?'
  },
  {
    mode: 'papalPreVaticanII',
    label: 'Papal Documents: Pre-Vatican II',
    promptHint: 'What did pre-Vatican II popes teach about the social kingship of Christ?',
    summary: 'Constrain the answer to pre-Vatican II papal documents represented in the Vatican English archive.',
    starterGuidance: 'This mode stays with pre-Vatican II popes and answers from papal teaching rather than general commentary.',
    featuredPrompt: 'What did pre-Vatican II popes teach about grace, society, and the kingship of Christ?'
  },
  {
    mode: 'papalAll',
    label: 'Papal Documents: All Popes',
    promptHint: 'How have papal documents explained faith and reason across the centuries?',
    summary: 'Constrain the answer to papal documents across the Vatican English archive.',
    starterGuidance: 'This mode answers from papal documents across the archive, including both pre- and post-Vatican II teaching.',
    featuredPrompt: 'How have papal documents explained grace, the Church, and salvation across the centuries?'
  }
];

export function getChatModeOption(mode: ChatMode): ChatModeOption {
  return chatModeOptions.find((option) => option.mode === mode) ?? chatModeOptions[2];
}