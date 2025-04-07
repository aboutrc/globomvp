export const API_KEYS: ApiKeys = {
  wolfram: '4RR9X5-9A6G3G9V3V',
  elevenlabs: {
    apiKey: 'sk_758c294f7b3fa8f27471644d719b60ed0adfff2176312800',
    voiceId: 'iBGVhgcEZS6A5gTOjqSJ'
  }
};

export const getWelcomeMessage = (developerMode: boolean) => {
  if (developerMode) {
    return '¡Bienvenido al Modo Desarrollador! Estoy listo para ayudarte con detalles técnicos y debugging.';
  }
  return '¡Hola! Soy Globo, tu asistente de matemáticas. ¿En qué puedo ayudarte hoy?';
};