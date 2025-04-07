import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserChat } from './pages/UserChat';
import { DeveloperChat } from './pages/DeveloperChat';
import { SplashScreen } from './components/SplashScreen';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { CheckCircle2, Wrench, List } from 'lucide-react';
import { Message } from './types';
import { getGloriaResponse, getWolframVisualization, getAudioResponse, checkOpenAIKey, getAvailableModels } from './services/api';
import { getWelcomeMessage } from './config/constants';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [chatState, setChatState] = useState({
    messages: [],
    isLoading: false,
    error: null,
    developerMode: false
  });
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [messageKey, setMessageKey] = useState(Date.now().toString());
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'error'>('checking');
  const [apiStatusMessage, setApiStatusMessage] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);

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
      const gloriaResponse = await getGloriaResponse(content, developerMode);
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
      // Always stop current audio and clean up
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        URL.revokeObjectURL(currentAudio.src);
        setCurrentAudio(null);
        setIsAudioPlaying(false);
        // Ensure complete cleanup before starting new audio
        await new Promise(resolve => setTimeout(resolve, 100));
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
      setIsAudioPlaying(true);
      audio.play();
    } catch (error) {
      console.error('Error al reproducir audio:', error);
      setCurrentAudio(null);
    }
  };

  const stopCurrentAudio = async () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      URL.revokeObjectURL(currentAudio.src);
      setCurrentAudio(null);
      setIsAudioPlaying(false);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="min-h-screen bg-[#151515] text-gray-100">
      {showSplash && <SplashScreen />}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Routes>
          <Route path="/" element={<UserChat />} />
          <Route path="/developer" element={<DeveloperChat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;