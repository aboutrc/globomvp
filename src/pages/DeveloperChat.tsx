import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { getGloriaResponse, getWolframVisualization, getAudioResponse, checkOpenAIKey, getAvailableModels } from '../services/api';
import type { Message, ChatState } from '../types';
import { Users, Wrench, CheckCircle2, List } from 'lucide-react';

const WELCOME_MESSAGE = 'Hello RC - Project Globo Developer Mode enabled. I am here to help you test and develop the application. You can ask questions in English, and I will respond with structured data for easier debugging.';

export function DeveloperChat() {
  const navigate = useNavigate();
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'error' | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<string>('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [messageKey, setMessageKey] = useState<string>('initial');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Cleanup audio when unmounting
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        URL.revokeObjectURL(currentAudio.src);
        setCurrentAudio(null);
        setIsAudioPlaying(false);
      }
    };
  }, [currentAudio]);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [{
      id: 'welcome',
      role: 'assistant', 
      content: WELCOME_MESSAGE, 
      send_to_voice: true, 
      timestamp: Date.now()
    }],
    isLoading: false,
    developerMode: true,
    error: null,
  });

  // Reset chat state when mounting
  useEffect(() => {
    setChatState({
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        send_to_voice: true,
        timestamp: Date.now(),
      }],
      isLoading: false,
      developerMode: true,
      error: null,
    });
    setMessageKey(Date.now().toString());
  }, []);
  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const gloriaResponse = await getGloriaResponse(content, true);
      let wolframImage;

      if (gloriaResponse?.wolfram_query) {
        const wolframResponse = await getWolframVisualization(gloriaResponse.wolfram_query);
        wolframImage = wolframResponse.image;
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: gloriaResponse.content || '',
        steps: gloriaResponse.steps,
        wolframImage,
        send_to_voice: gloriaResponse.send_to_voice,
        timestamp: Date.now(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error processing your request. Please try again.',
      }));
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        URL.revokeObjectURL(currentAudio.src);
        setCurrentAudio(null);
        setIsAudioPlaying(false);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!text || !text.trim()) {
        console.warn('Invalid text for audio playback');
        return;
      }

      const audioBlob = await getAudioResponse(text, true);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set volume and playback rate for English
      audio.volume = 0.85;
      audio.playbackRate = 1.0;
      
      audio.addEventListener('ended', () => {
        setCurrentAudio(null);
        setIsAudioPlaying(false);
        const event = new CustomEvent('audioEnded');
        window.dispatchEvent(event);
      });
      
      setCurrentAudio(audio);
      setIsAudioPlaying(true);
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setCurrentAudio(null);
      setIsAudioPlaying(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-4">Project Globo - Developer Mode</h1>
          <p className="text-gray-400 mb-6">Testing and Development Interface</p>
        </header>

        <div className="bg-gray-900 rounded-xl p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {chatState.messages.map(message => (
            <ChatMessage
              key={message.id}
              messageKey={messageKey}
              message={message}
              onPlayAudio={handlePlayAudio}
              developerMode={true}
              isAudioPlaying={isAudioPlaying}
              setIsAudioPlaying={setIsAudioPlaying}
            />
          ))}
          
          {chatState.isLoading && (
            <div className="text-center py-4">
              <div className="animate-pulse text-gray-400">
                Processing your request...
              </div>
            </div>
          )}
          
          {chatState.error && (
            <div className="text-red-500 text-center py-4">
              {chatState.error}
            </div>
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={chatState.isLoading}
          developerMode={true}
        >
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <Users size={14} />
              <span>Switch to User Mode</span>
            </button>
            <button
              onClick={() => {
                setApiKeyStatus('checking');
                setApiStatusMessage('Checking API key...');
                checkOpenAIKey()
                  .then(() => {
                    setApiKeyStatus('valid');
                    setChatState(prev => ({
                      ...prev,
                      messages: [...prev.messages, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: 'Hello RC. Your API Key is valid and working in Project Globo',
                        timestamp: Date.now(),
                      }],
                    }));
                  })
                  .catch(() => {
                    setApiKeyStatus('error');
                    setApiStatusMessage('API key verification failed');
                  });
              }}
              disabled={apiKeyStatus === 'checking'}
              className="p-2 text-gray-400 hover:text-gray-100 transition-colors disabled:opacity-50"
              title={apiKeyStatus === 'valid' ? 'API Key valid' : 'Verify API Key'}
            >
              {apiKeyStatus === 'valid' ? <CheckCircle2 size={16} className="text-green-500" /> : <Wrench size={16} />}
            </button>
            <button
              onClick={async () => {
                try {
                  if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    URL.revokeObjectURL(currentAudio.src);
                    setCurrentAudio(null);
                    setIsAudioPlaying(false);
                  }
                  const response = await getAvailableModels();
                  const modelsList = response.models.join('\n');
                  setChatState(prev => ({
                    ...prev,
                    messages: [...prev.messages, {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: `Hello RC. The following AI models are available to you in Project Globo:\n\n${modelsList}`,
                      timestamp: Date.now(),
                    }],
                  }));
                } catch (error) {
                  console.error('Error fetching models:', error);
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
              title="List Available Models"
            >
              <List size={16} />
            </button>
            {apiStatusMessage && (
              <span className="text-xs">{apiStatusMessage}</span>
            )}
          </div>
        </ChatInput>
      </div>
    </main>
  );
}