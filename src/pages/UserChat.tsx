import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { getGloriaResponse, getWolframVisualization, getAudioResponse } from '../services/api';
import type { Message, ChatState } from '../types';
import { Beaker } from 'lucide-react';

const WELCOME_MESSAGE = '¡Hola! Bienvenido a Proyecto: Globo — tu asistente de confianza para ayudarte con las tareas de matemáticas de quinto grado.\n\nEstoy aquí para apoyarte, paso a paso, con explicaciones claras y ejemplos que realmente hacen sentido. Puedes escribirme el problema que tiene tu hijo, o si prefieres, también puedes subir una foto del ejercicio que te mandó la maestra.\n\n¿Quieres empezar? Solo dime o envíame la imagen del problema y lo resolvemos juntos.';

export function UserChat() {
  const navigate = useNavigate();
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
    developerMode: false,
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
      developerMode: false,
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
      const gloriaResponse = await getGloriaResponse(content, false);
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
        error: error instanceof Error ? error.message : 'Error al procesar tu pregunta. Por favor, intenta de nuevo.',
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
        console.warn('Texto inválido para reproducción de audio');
        return;
      }

      const audioBlob = await getAudioResponse(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set volume and playback rate for Spanish
      audio.volume = 0.9;
      audio.playbackRate = 0.95;
      
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
      console.error('Error al reproducir audio:', error);
      setCurrentAudio(null);
      setIsAudioPlaying(false);
    }
  };

  return (
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
              messageKey={messageKey}
              message={message}
              onPlayAudio={handlePlayAudio}
              developerMode={false}
              isAudioPlaying={isAudioPlaying}
              setIsAudioPlaying={setIsAudioPlaying}
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
          developerMode={false}
        >
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
            <button
              onClick={() => navigate('/developer')}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <Beaker size={14} />
              <span>Switch to Developer Mode</span>
            </button>
          </div>
        </ChatInput>
      </div>
    </main>
  );
}