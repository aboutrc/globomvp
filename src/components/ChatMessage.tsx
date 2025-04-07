import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Image as ImageIcon, CheckCircle } from 'lucide-react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onPlayAudio: (text: string) => void;
  messageKey: string;
  developerMode?: boolean;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (playing: boolean) => void;
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

export function ChatMessage({ 
  message, 
  onPlayAudio, 
  messageKey, 
  developerMode,
  isAudioPlaying,
  setIsAudioPlaying 
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const hasPlayedRef = useRef(false);
  const isImageMessage = message.content.startsWith('[PHOTO]');
  const [showProcessing, setShowProcessing] = useState(true);
  const messageIdRef = useRef(message.id);
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousMessageKeyRef = useRef<string | null>(null);

  // Reset playing state when audio ends
  useEffect(() => {
    const handleAudioEnded = () => {
      setIsAudioPlaying(false);
      hasPlayedRef.current = false;
    };

    window.addEventListener('audioEnded', handleAudioEnded);
    return () => window.removeEventListener('audioEnded', handleAudioEnded);
  }, []);

  useEffect(() => {
    if (isImageMessage) {
      const timer = setTimeout(() => setShowProcessing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isImageMessage]);

  // Reset state when messageKey changes
  useEffect(() => {
    if (previousMessageKeyRef.current !== messageKey) {
      previousMessageKeyRef.current = messageKey;
      hasPlayedRef.current = false;
      setIsAudioPlaying(false);
      
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    }

    return () => {
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    };
  }, [messageKey, isAssistant, message.content, message.send_to_voice, onPlayAudio]);

  // Handle initial welcome message
  useEffect(() => {
    const shouldPlayWelcome = isAssistant && 
      message.id === 'welcome' &&
      message.send_to_voice &&
      !hasPlayedRef.current &&
      previousMessageKeyRef.current !== messageKey;

    if (shouldPlayWelcome) {
      previousMessageKeyRef.current = messageKey;
      
      // Clear any existing timeout
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
      
      audioTimeoutRef.current = setTimeout(() => {
        hasPlayedRef.current = true;
        setIsAudioPlaying(true);
        onPlayAudio(message.content, developerMode);
      }, 1500);
    }
    
    return () => {
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    };
  }, [isAssistant, message.content, message.id, message.send_to_voice, onPlayAudio, setIsAudioPlaying]);

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] ${isAssistant ? 'bg-gray-800' : 'bg-blue-600'} rounded-xl p-4`}>
        {isImageMessage ? (
          <div className="mb-4">
            {showProcessing ? <ImageProcessingAnimation /> : <ImageAnalyzedSuccess />}
          </div>
        ) : (
          <div className="space-y-4">
            {message.steps ? (
              message.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-sm">
                    {step.step_number}
                  </span>
                  <p className="text-gray-100 flex-1">{step.content}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-100">{message.content}</p>
            )}
          </div>
        )}
        
        {isAssistant && (
          <button
            onClick={() => {
              hasPlayedRef.current = false;
              setIsAudioPlaying(!isAudioPlaying);
              onPlayAudio(message.content, developerMode);
            }}
            className="mt-2 flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors text-sm group"
          >
            {isAudioPlaying ? (
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