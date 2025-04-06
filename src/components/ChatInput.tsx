import React, { useState } from 'react';
import { Send, Mic, Camera } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  children?: React.ReactNode;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ChatInput({ onSendMessage, isLoading, children }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen.');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedFile) && !isLoading) {
      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          onSendMessage(`[PHOTO]${base64String}`);
          setSelectedFile(null);
        };
        reader.readAsDataURL(selectedFile);
        return;
      }
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto p-4 relative">
      {selectedFile && (
        <div className="absolute bottom-full mb-2 left-4 bg-gray-800 rounded-lg p-2 flex items-center gap-2">
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Preview"
            className="w-10 h-10 object-cover rounded"
          />
          <span className="text-sm text-gray-300">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Haz tu pregunta de matemáticas aquí..."
          className="w-full px-4 py-3 pr-24 rounded-xl bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <div className="absolute right-2 flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="p-2 text-gray-400 hover:text-gray-100 transition-colors cursor-pointer"
            title="Subir foto"
          >
            <Camera size={20} />
          </label>
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
            title="Entrada de voz (próximamente)"
          >
            <Mic size={20} />
          </button>
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedFile)}
            className="p-2 text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      {children}
    </form>
  );
}