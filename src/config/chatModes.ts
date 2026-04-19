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
  }
];

export function getChatModeOption(mode: ChatMode): ChatModeOption {
  return chatModeOptions.find((option) => option.mode === mode) ?? chatModeOptions[2];
}