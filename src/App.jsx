import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Languages, 
  Mic,
  MicOff,
  Send, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Trash2, 
  Loader2,
  Globe,
  MessageSquare,
  Sparkles,
  Search,
  History as HistoryIcon,
  X,
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ur', name: 'Urdu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'or', name: 'Odia' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'as', name: 'Assamese' },
  { code: 'mai', name: 'Maithili' },
  { code: 'sat', name: 'Santali' },
  { code: 'ks', name: 'Kashmiri' },
  { code: 'ne', name: 'Nepali' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'kok', name: 'Konkani' },
  { code: 'doi', name: 'Dogri' },
  { code: 'mni', name: 'Manipuri' },
  { code: 'brx', name: 'Bodo' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('mounika_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('mounika_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = sourceLang;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!showHistory) scrollToBottom();
  }, [messages, showHistory]);

  const handleTranslate = async (e, textOverride = null, langOverride = null) => {
    if (e) e.preventDefault();
    const textToTranslate = textOverride || inputText;
    if (!textToTranslate.trim() || isTranslating) return;

    setIsTranslating(true);
    const fromLang = langOverride?.from || sourceLang;
    const toLang = langOverride?.to || targetLang;
    
    const fromLangName = LANGUAGES.find(l => l.code === fromLang)?.name;
    const toLangName = LANGUAGES.find(l => l.code === toLang)?.name;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text from ${fromLangName} to ${toLangName}. 
        Only provide the translation itself, no explanations or additional text.
        Text: "${textToTranslate}"`,
      });

      const translatedText = response.text || "Translation failed.";
      
      const newMessage = {
        id: Math.random().toString(36).substring(7),
        originalText: textToTranslate,
        translatedText: translatedText,
        from: fromLang,
        to: toLang,
        timestamp: Date.now(),
      };

      setMessages(prev => [newMessage, ...prev]);
      if (!textOverride) setInputText('');
      setShowHistory(false);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all translation history?")) {
      setMessages([]);
      localStorage.removeItem('mounika_history');
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => 
      m.originalText.toLowerCase().includes(query) || 
      m.translatedText.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = {};
    filteredMessages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let groupName = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      
      if (date.toDateString() === today.toDateString()) {
        groupName = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupName = 'Yesterday';
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(msg);
    });
    return Object.entries(groups);
  }, [filteredMessages]);

  const reTranslate = (msg) => {
    setInputText(msg.originalText);
    setSourceLang(msg.from);
    setTargetLang(msg.to);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">Mounika the AI Translator</h1>
              <p className="text-[10px] text-neutral-400 font-medium tracking-widest uppercase">AI Translation Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-xl flex items-center gap-2",
                showHistory ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-100"
              )}
            >
              <HistoryIcon size={16} />
              {showHistory ? "Close History" : "History"}
            </button>
            <div className="w-px h-4 bg-neutral-200 mx-2" />
            <button 
              onClick={clearHistory}
              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl"
              title="Clear All History"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 pb-40">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Translation History</h2>
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search past translations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-12 py-3 text-sm focus:ring-4 focus:ring-black/5 focus:border-black transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-black transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {groupedMessages.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed border-neutral-200 rounded-[2rem]">
                  <p className="text-neutral-400 font-medium">No history found.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {groupedMessages.map(([groupName, groupMessages]) => (
                    <div key={groupName} className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 ml-4">{groupName}</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {groupMessages.map((msg) => (
                          <motion.div 
                            layout
                            key={msg.id}
                            className="bg-white border border-neutral-200 rounded-3xl p-6 hover:border-neutral-400 transition-all group shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                                  {LANGUAGES.find(l => l.code === msg.from)?.name}
                                </span>
                                <ArrowRightLeft size={12} className="text-neutral-300" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black bg-neutral-100 px-2 py-1 rounded">
                                  {LANGUAGES.find(l => l.code === msg.to)?.name}
                                </span>
                                <div className="w-1 h-1 bg-neutral-200 rounded-full mx-1" />
                                <span className="text-[10px] font-medium text-neutral-300">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => reTranslate(msg)}
                                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors"
                                  title="Reuse text"
                                >
                                  <RotateCcw size={16} />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(msg.translatedText, msg.id)}
                                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors"
                                  title="Copy translation"
                                >
                                  {copiedId === msg.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                                <button 
                                  onClick={() => {
                                    setMessages(prev => prev.filter(m => m.id !== msg.id));
                                  }}
                                  className="p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                                  title="Delete from history"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <p className="text-xs font-bold text-neutral-300 uppercase tracking-widest mb-2">Original</p>
                                <p className="text-neutral-600 text-sm line-clamp-3">{msg.originalText}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-neutral-300 uppercase tracking-widest mb-2">Translation</p>
                                <p className="text-neutral-900 text-sm font-medium line-clamp-3">{msg.translatedText}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Professional Language Selector */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 mb-12">
                <div className="relative group">
                  <div className="absolute -top-2.5 left-4 px-2 bg-[#FAFAFA] text-[10px] font-bold text-neutral-400 uppercase tracking-widest z-10">Source Language</div>
                  <select 
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={swapLanguages}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-neutral-200 text-neutral-400 hover:text-black hover:border-black rounded-full transition-all active:scale-90 shadow-sm"
                >
                  <ArrowRightLeft size={18} />
                </button>

                <div className="relative group">
                  <div className="absolute -top-2.5 left-4 px-2 bg-[#FAFAFA] text-[10px] font-bold text-neutral-400 uppercase tracking-widest z-10">Target Language</div>
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="space-y-8">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-24 text-center"
                    >
                      <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center text-neutral-300 mb-6">
                        <MessageSquare size={40} />
                      </div>
                      <h2 className="text-xl font-semibold text-neutral-900">Ready for translation</h2>
                      <p className="text-neutral-500 text-sm max-w-sm mt-3 leading-relaxed">
                        Experience professional-grade AI translation. Enter your text below to begin a real-time session.
                      </p>
                    </motion.div>
                  ) : (
                    messages.slice(0, 5).map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                      >
                        {/* Original Text */}
                        <div className="bg-white border border-neutral-200 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-neutral-300 rounded-full" />
                              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                                {LANGUAGES.find(l => l.code === msg.from)?.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-neutral-300">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-neutral-800 text-lg leading-relaxed font-medium">{msg.originalText}</p>
                        </div>

                        {/* Translated Text */}
                        <div className="bg-black text-white rounded-[2rem] p-8 shadow-xl shadow-black/10 relative group">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                                {LANGUAGES.find(l => l.code === msg.to)?.name}
                              </span>
                            </div>
                            <button 
                              onClick={() => copyToClipboard(msg.translatedText, msg.id)}
                              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
                              title="Copy translation"
                            >
                              {copiedId === msg.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <div className="text-xl font-semibold leading-relaxed">
                            <ReactMarkdown>{msg.translatedText}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                {messages.length > 5 && !showHistory && (
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors flex items-center gap-2"
                    >
                      View all {messages.length} translations <ArrowUpRight size={14} />
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Console */}
      <div className="fixed bottom-8 left-0 right-0 px-6 pointer-events-none">
        <div className="max-w-5xl mx-auto pointer-events-auto">
          <form 
            onSubmit={handleTranslate}
            className="relative bg-white border border-neutral-200 rounded-[2.5rem] p-3 shadow-2xl shadow-black/5 flex items-end gap-3"
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              placeholder="Enter text to translate..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-4 px-6 min-h-[60px] max-h-[200px] resize-none font-medium placeholder:text-neutral-300"
              rows={1}
            />
            <div className="flex items-center gap-2 mb-2 mr-2">
              <button 
                type="button"
                onClick={toggleListening}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                  isListening 
                    ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200" 
                    : "bg-neutral-100 text-neutral-400 hover:text-black hover:bg-neutral-200"
                )}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                type="submit"
                disabled={!inputText.trim() || isTranslating}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                  inputText.trim() && !isTranslating 
                    ? "bg-black text-white hover:scale-105 active:scale-95 shadow-lg shadow-black/20" 
                    : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                )}
              >
                {isTranslating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
          
          <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="bg-neutral-100 px-2 py-1 rounded-md text-neutral-500">Enter</span>
              <span>Translate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-neutral-100 px-2 py-1 rounded-md text-neutral-500">Shift + Enter</span>
              <span>New Line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
