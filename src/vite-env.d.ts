/// <reference types="vite/client" />

interface SpeechRecognitionAlternative {
	transcript: string;
}

interface SpeechRecognitionResult {
	0: SpeechRecognitionAlternative;
	isFinal: boolean;
	length: number;
}

interface SpeechRecognitionResultList {
	[index: number]: SpeechRecognitionResult;
	length: number;
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	maxAlternatives: number;
	onend: (() => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	start(): void;
	stop(): void;
}

interface Window {
	SpeechRecognition?: new () => SpeechRecognition;
	webkitSpeechRecognition?: new () => SpeechRecognition;
}
