export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  wolframImage?: string;
  send_to_voice?: boolean;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
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