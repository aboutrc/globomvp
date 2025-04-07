import { API_KEYS } from '../config/constants';

export async function getAvailableModels() {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    const functionUrl = `${baseUrl}/functions/v1/list-models`;
    
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      credentials: 'omit'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Model Check Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch available models');
  }
}
export async function checkOpenAIKey() {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Ensure we have a clean base URL without trailing slash
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    
    // Construct the function URL
    const functionUrl = `${baseUrl}/functions/v1/check-openai-key`;
    
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      credentials: 'omit'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Key Check Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to check OpenAI key');
  }
}

export async function getGloriaResponse(message: string, developerMode: boolean = false) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isImageMessage = message.startsWith('[PHOTO]');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new Error('Message cannot be empty');
    }

    // Validate message length for non-image messages
    if (!isImageMessage && trimmedMessage.length > 4000) {
      throw new Error('Message is too long. Please limit your message to 4000 characters.');
    }

    // Remove trailing slash from URL if present
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    
    // Get previous messages from localStorage
    const previousMessages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    
    const response = await fetch(`${baseUrl}/functions/v1/openai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify({ 
        message: trimmedMessage,
        isImage: isImageMessage,
        developer_mode: developerMode,
        maxTokens: isImageMessage ? 1000 : 500, // Increase tokens for image analysis
        previousMessages: previousMessages.slice(-5) // Send last 5 messages for context
      })
    });

    if (!response.ok) {
      let errorMessage = 'Failed to get response from OpenAI';
      try {
        const errorData = await response.json();
        if (errorData.error?.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (errorData.error?.includes('invalid_api_key')) {
          errorMessage = 'Invalid API key. Please check your OpenAI configuration.';
        } else {
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data) {
      throw new Error('Empty response received');
    }

    // Update chat history in localStorage
    previousMessages.push({
      role: 'user',
      content: trimmedMessage
    });
    previousMessages.push({
      role: 'assistant',
      content: data.content
    });
    localStorage.setItem('chatHistory', JSON.stringify(previousMessages));

    // Parse the response if it's JSON
    if (typeof data.content === 'string' && data.content.startsWith('{')) {
      try {
        const parsed = JSON.parse(data.content);
        return {
          content: parsed.steps.map(step => step.content).join('\n'),
          steps: parsed.steps,
          send_to_voice: parsed.send_to_voice,
          wolfram_query: parsed.wolfram_query
        };
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
      }
    }

    return data;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error instanceof Error ? error : new Error('Failed to process your question. Please try again.');
  }
}

export async function getWolframVisualization(query: string) {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&appid=${API_KEYS.wolfram}&output=json`
  );
  
  return response.json();
}

export async function getAudioResponse(text: string, isDeveloperMode: boolean = false) {
  if (!text.trim()) {
    throw new Error('Text cannot be empty');
  }

  // Use different voice IDs for English and Spanish
  const voiceId = isDeveloperMode ? 
    'EXAVITQu4vr4xnSDxMaL' : // Sarah (English)
    'iBGVhgcEZS6A5gTOjqSJ'; // New Spanish voice

  // Optimize voice settings based on mode
  const voiceSettings = isDeveloperMode ? {
    stability: 0.5,
    similarity_boost: 0.5,
  } : {
    stability: 0.35,  // Lower stability for more expressiveness
    similarity_boost: 0.75, // Higher similarity to maintain voice character
  };

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${API_KEYS.elevenlabs.voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEYS.elevenlabs.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_settings: voiceSettings,
      model_id: "eleven_multilingual_v2",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.detail || `ElevenLabs API error: ${response.status}`;
    console.error('ElevenLabs API error:', {
      status: response.status,
      details: errorData
    });
    throw new Error(errorMessage);
  }
  
  return response.blob();
}