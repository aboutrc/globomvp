import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Image as ImageIcon, CheckCircle } from 'lucide-react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onPlayAudio: (text: string) => void;
}

const ImageProcessingAnimation = () => (
  <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg border border-gray-700">
    <div className="w-16 h-16 mb-4 relative">
      <ImageIcon className="w-full h-full text-blue-500 animate-pulse" />
      <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-gray-400 text-sm">Analizando la imagen...</p>
  </div>
);

const ImageAnalyzedSuccess = () => (
  <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg border border-gray-700">
    <div className="w-16 h-16 mb-4 flex items-center justify-center">
      <CheckCircle className="w-full h-full text-green-500" />
    </div>
    <p className="text-gray-400 text-sm">Imagen analizada con éxito</p>
  </div>
);

export function ChatMessage({ message, onPlayAudio }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const hasPlayedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isImageMessage = message.content.startsWith('[PHOTO]');
  const [showProcessing, setShowProcessing] = useState(true);

  useEffect(() => {
    if (isImageMessage) {
      const timer = setTimeout(() => setShowProcessing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isImageMessage]);

  useEffect(() => {
    if (isAssistant && message.content && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      setIsPlaying(true);
      onPlayAudio(message.content);
    }
  }, [isAssistant, message.content, onPlayAudio]);

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] ${isAssistant ? 'bg-gray-800' : 'bg-blue-600'} rounded-xl p-4`}>
        {isImageMessage ? (
          <div className="mb-4">
            {showProcessing ? <ImageProcessingAnimation /> : <ImageAnalyzedSuccess />}
          </div>
        ) : (
          <p className="text-gray-100">{message.content}</p>
        )}
        
        {isAssistant && (
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              onPlayAudio(message.content);
            }}
            className="mt-2 flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors text-sm group"
          >
            {isPlaying ? (
              <>
                <VolumeX size={16} className="group-hover:hidden" />
                <Volume2 size={16} className="hidden group-hover:block" />
                <span>Detener audio</span>
              </>
            ) : (
              <>
                <Volume2 size={16} />
                <span>{hasPlayedRef.current ? 'Reproducir de nuevo' : 'Reproducir audio'}</span>
              </>
            )}
          </button>
        )}
        
        {message.wolframImage && (
          <img 
            src={message.wolframImage} 
            alt="Visualización matemática"
            className="mt-4 rounded-lg w-full"
          />
        )}
      </div>
    </div>
  );
}