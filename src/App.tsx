import React, { useState, useEffect } from 'react';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { SplashScreen } from './components/SplashScreen';
import { getGloriaResponse, getWolframVisualization, getAudioResponse, checkOpenAIKey, getAvailableModels } from './services/api';
import type { Message, ChatState } from './types';
import { Wrench, CheckCircle2, List } from 'lucide-react';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'error' | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<string>('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [{
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Bienvenido a Proyecto: Globo — tu asistente de confianza para ayudarte con las tareas de matemáticas de quinto grado.\n\nEstoy aquí para apoyarte, paso a paso, con explicaciones claras y ejemplos que realmente hacen sentido. Puedes escribirme el problema que tiene tu hijo, o si prefieres, también puedes subir una foto del ejercicio que te mandó la maestra.\n\n¿Quieres empezar? Solo dime o envíame la imagen del problema y lo resolvemos juntos.',
      timestamp: Date.now(),
    }],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
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
      const gloriaResponse = await getGloriaResponse(content);
      let wolframImage;

      if (gloriaResponse?.wolfram_query) {
        const wolframResponse = await getWolframVisualization(gloriaResponse.wolfram_query);
        wolframImage = wolframResponse.image;
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: gloriaResponse.content,
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
        error: error instanceof Error ? error.message : 'Error al procesar tu pregunta. Por favor, intenta de nuevo.',
      }));
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        return;
      }

      // Add validation to check if text exists and is not empty
      if (!text || !text.trim()) {
        console.warn('Texto inválido para reproducción de audio');
        return;
      }

      const audioBlob = await getAudioResponse(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('ended', () => {
        setCurrentAudio(null);
        // Notify all ChatMessage components that audio has ended
        const event = new CustomEvent('audioEnded');
        window.dispatchEvent(event);
      });
      
      setCurrentAudio(audio);
      audio.play();
    } catch (error) {
      console.error('Error al reproducir audio:', error);
      setCurrentAudio(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#151515] text-gray-100">
      {showSplash && <SplashScreen />}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold mb-4">Proyecto: Globo</h1>
            <p className="text-gray-400 mb-6">Tu asistente inteligente de matemáticas en español</p>
          </header>

          <div className="bg-gray-900 rounded-xl p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
            {chatState.messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                onPlayAudio={handlePlayAudio}
              />
            ))}
            
            {chatState.isLoading && (
              <div className="text-center py-4">
                <div className="animate-pulse text-gray-400">
                  Un momento, estoy analizando tu pregunta...
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
          >
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
              <span>Developer Mode:</span>
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
                title={apiKeyStatus === 'valid' ? 'API Key válida' : 'Verificar API Key'}
              >
                {apiKeyStatus === 'valid' ? <CheckCircle2 size={16} className="text-green-500" /> : <Wrench size={16} />}
              </button>
              <button
                onClick={async () => {
                  try {
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
                    setApiStatusMessage('Failed to fetch models');
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
    </div>
  );
}

export default App;