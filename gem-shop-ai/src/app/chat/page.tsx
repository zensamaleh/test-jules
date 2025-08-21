"use client";

import { useState, FormEvent, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Gem } from '@/services/db';

interface Source {
  name: string;
  chunk_index: number;
  text_excerpt: string;
  similarity: number;
  metadata?: { [key: string]: unknown };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New state for Gems
  const [gems, setGems] = useState<Gem[]>([]);
  const [selectedGemId, setSelectedGemId] = useState<string>('');

  const getSourceName = (source: Source): string => {
    if (source.metadata && typeof source.metadata.name === 'string') {
      return source.metadata.name;
    }
    return source.name || 'source';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch Gems on mount
  useEffect(() => {
    const fetchGems = async () => {
        try {
            const response = await fetch('/api/gems');
            if (!response.ok) throw new Error('Failed to fetch Gems');
            const data = await response.json();
            setGems(data);
            if (data.length > 0) {
                setSelectedGemId(data[0].id); // Select the first Gem by default
            }
        } catch (error) {
            console.error("Could not load Gems:", error);
        }
    };
    fetchGems();
  }, []);

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedGemId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Add selectedGemId to the request body
        body: JSON.stringify({ message: input, gemId: selectedGemId }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = { role: 'assistant', content: data.response, sources: data.sources };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = { role: 'assistant', content: `Error: ${data.error || 'An unknown error occurred.'}` };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = { role: 'assistant', content: 'An error occurred while fetching the response.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-sm p-4 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">
            Chat
        </h1>
        <div className="flex items-center space-x-4">
            <select
                value={selectedGemId}
                onChange={(e) => setSelectedGemId(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                disabled={gems.length === 0}
            >
                {gems.length > 0 ? (
                    gems.map(gem => (
                        <option key={gem.id} value={gem.id}>{gem.name}</option>
                    ))
                ) : (
                    <option>No Gems available</option>
                )}
            </select>
            <Link href="/gems/new" className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
                + New Gem
            </Link>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 pt-10">
                <p>Select a Gem and start the conversation.</p>
                <p>No Gems yet? <Link href="/gems/new" className="text-blue-600 hover:underline">Create one!</Link></p>
            </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl px-4 py-2.5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-bold mb-1.5 text-gray-500">Sources:</h4>
                  <ul className="space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i} title={`Excerpt: ${source.text_excerpt}`} className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded">
                        <strong>{getSourceName(source)}</strong> (similarité: {source.similarity.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg px-4 py-2 rounded-2xl shadow bg-white text-gray-800">
              <p className="animate-pulse">Réflexion en cours...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>
      <footer className="bg-white p-4 border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={gems.length > 0 ? "Ask a question to the selected Gem..." : "Please create a Gem first"}
              className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={isLoading || gems.length === 0}
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || !input.trim() || gems.length === 0}
            >
              Envoyer
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
