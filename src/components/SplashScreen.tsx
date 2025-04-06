import React from 'react';
import { Brain } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#151515] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block p-6 bg-blue-600 rounded-full mb-6 animate-pulse">
          <Brain size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Globo MVP</h1>
        <p className="text-gray-400">Tu asistente de matemáticas personal</p>
      </div>
    </div>
  );
}