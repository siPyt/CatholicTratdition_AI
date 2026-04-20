import { ChatMode } from './openAiPrompt';

export interface ChatModeOption {
  mode: ChatMode;
  label: string;
  summary: string;
  starterGuidance: string;
}

export const chatModeOptions: ChatModeOption[] = [
  {
    mode: 'fathers',
    label: 'Ask a Father',
    summary: 'Prioritize patristic witness and the voice of the early Church.',
    starterGuidance: 'Use the Fathers when helpful and explain their witness in a way a modern reader can follow.'
  },
  {
    mode: 'proofs',
    label: 'Logical Proofs',
    summary: 'Use a more academic and scholastic register for users who want argument and structure.',
    starterGuidance: 'Use a more academic register and show the logic clearly.'
  },
  {
    mode: 'apologetics',
    label: 'Apologetic Answers',
    summary: 'Answer in a clear public-facing style for non-Catholics, skeptics, and first-time inquirers.',
    starterGuidance: 'Explain the answer clearly for someone outside the Catholic tradition.'
  },
  {
    mode: 'dogmaticSources',
    label: 'Handbook of Dogmatic Sources',
    summary: 'Ask doctrinal questions, identify the theological note, and receive a concise handbook answer within the approved dogmatic source set.',
    starterGuidance: 'This mode stays within the approved handbook source set, names the theological note when it can do so responsibly, and answers in a compact doctrinal handbook style.'
  },
  {
    mode: 'papalPreVaticanII',
    label: 'Papal Documents: Pre-Vatican II',
    summary: 'Constrain the answer to pre-Vatican II papal documents represented in the Vatican English archive.',
    starterGuidance: 'This mode stays with pre-Vatican II popes and answers from papal teaching rather than general commentary.'
  },
  {
    mode: 'papalAll',
    label: 'Papal Documents: All Popes',
    summary: 'Constrain the answer to papal documents across the Vatican English archive.',
    starterGuidance: 'This mode answers from papal documents across the archive, including both pre- and post-Vatican II teaching.'
  }
];

export function getChatModeOption(mode: ChatMode): ChatModeOption {
  return chatModeOptions.find((option) => option.mode === mode) ?? chatModeOptions[2];
}