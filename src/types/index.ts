export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: Array<{
    step_number: number;
    content: string;
  }>;
  wolframImage?: string;
  send_to_voice?: boolean;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  developerMode: boolean;
  error: string | null;
}

export interface ApiKeys {
  openai: string;
  wolfram: string;
  elevenlabs: {
    apiKey: string;
    voiceId: string;
  };
}