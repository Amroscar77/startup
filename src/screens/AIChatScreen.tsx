import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronLeft, MapPin, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GeminiService, Message } from '../lib/GeminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const SUGGESTED_PROMPTS = [
  'Where can I find the cheapest milk in Cairo?',
  'What are the best supermarkets in Maadi?',
  'Is coffee getting more expensive recently?',
  'Compare prices between City Stars and Mall of Egypt',
];

export default function AIChatScreen() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm PricePal, your shopping assistant for Egypt. I can help you find the best deals, compare prices, and locate nearby stores. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setError(null);
    const userMessage: Message = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await GeminiService.chat(messages, prompt, location);
      setMessages(prev => [...prev, {
        role: 'model',
        text: response.text,
        grounding: response.groundingChunks,
      }]);
    } catch (err: any) {
      const msg = err?.message || 'Sorry, I\'m having trouble connecting. Please try again.';
      setError(msg);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-surface-container-high rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full signature-gradient flex items-center justify-center text-white shadow-lg">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="font-headline text-xl font-black text-on-surface">PricePal AI</h1>
              <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase tracking-widest">
                <Sparkles size={10} />
                <span>Powered by Gemini</span>
                {location && <span className="text-outline ml-1">· Location active</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-grow overflow-y-auto px-6 py-8 space-y-6 no-scrollbar">
        {/* Suggested prompts — only on empty state */}
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="text-left text-sm font-medium text-primary bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 hover:bg-primary/10 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn('flex gap-4 max-w-[85%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm',
                msg.role === 'model' ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface-variant'
              )}>
                {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="space-y-3">
                <div className={cn(
                  'p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                  msg.role === 'model' ? 'bg-surface-container-high text-on-surface rounded-tl-none' : 'bg-primary text-white rounded-tr-none'
                )}>
                  {msg.text}
                </div>
                {/* Grounding sources */}
                {msg.grounding && msg.grounding.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.grounding.map((chunk: any, idx: number) => (chunk.web || chunk.maps) && (
                      <a
                        key={idx}
                        href={(chunk.web || chunk.maps)?.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-surface-container-highest border border-outline-variant/20 px-3 py-2 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors"
                      >
                        <MapPin size={12} />
                        <span>{(chunk.web || chunk.maps)?.title || 'Source'}</span>
                        <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot size={16} />
            </div>
            <div className="bg-surface-container-high p-4 rounded-2xl rounded-tl-none flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-surface-container border-t border-outline-variant/10">
        <div className="relative flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about prices, stores, or deals..."
            className="flex-grow bg-surface-container-lowest border border-outline-variant/20 rounded-full px-6 py-4 text-sm focus:outline-none focus:border-primary transition-all pr-14 shadow-inner"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className={cn(
              'absolute right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all',
              input.trim() && !loading ? 'bg-primary text-white shadow-lg scale-100' : 'bg-surface-container-highest text-outline scale-90'
            )}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-center mt-3 text-outline font-medium uppercase tracking-widest">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
