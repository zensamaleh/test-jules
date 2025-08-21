"use client";

import { useState, useEffect, FormEvent } from 'react';
import type { Document } from '@/services/db'; // Re-using the interface
import Link from 'next/link';

export default function NewGemPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableDocs, setAvailableDocs] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch available documents when the component mounts
    const fetchDocs = async () => {
      try {
        const response = await fetch('/api/documents');
        if (!response.ok) throw new Error('Failed to fetch documents');
        const docs = await response.json();
        setAvailableDocs(docs);
      } catch (error) {
        setMessage('Could not load documents.');
        console.error(error);
      }
    };
    fetchDocs();
  }, []);

  const handleDocSelection = (docId: string) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setMessage('Name and Description are required.');
      return;
    }
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          documentIds: Array.from(selectedDocIds),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Successfully created Gem: ${data.name}`);
        // Reset form
        setName('');
        setDescription('');
        setSelectedDocIds(new Set());
      } else {
        setMessage(`Error: ${data.error || 'Failed to create Gem.'}`);
      }
    } catch (error) {
      setMessage('An unexpected error occurred.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-4">
            <Link href="/" className="text-blue-600 hover:underline">
                &larr; Back to Home
            </Link>
        </nav>
        <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Create a New Gem</h1>
            <p className="text-gray-600 mt-1">Configure a specialized AI assistant.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="gem-name" className="block text-sm font-medium text-gray-700">Gem Name</label>
                <input
                type="text"
                id="gem-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Product Support Assistant"
                required
                />
            </div>

            <div>
                <label htmlFor="gem-description" className="block text-sm font-medium text-gray-700">Mission / Description</label>
                <textarea
                id="gem-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Answers customer questions based on product manuals."
                required
                />
            </div>

            <div className="pt-2">
                <h3 className="text-lg font-medium text-gray-800">Knowledge Base</h3>
                <p className="text-sm text-gray-600 mb-3">Select the documents this Gem can access.</p>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 space-y-3">
                {availableDocs.length > 0 ? (
                    availableDocs.map(doc => (
                    <div key={doc.id} className="flex items-center">
                        <input
                        type="checkbox"
                        id={`doc-${doc.id}`}
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => handleDocSelection(doc.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`doc-${doc.id}`} className="ml-3 block text-sm font-medium text-gray-700">{doc.name}</label>
                    </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500">No documents found. <Link href="/" className="text-blue-600 hover:underline">Upload documents first.</Link></p>
                )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                disabled={isLoading}
                >
                {isLoading ? 'Creating...' : 'Create Gem'}
                </button>
            </div>
            </form>

            {message && <p className="mt-4 text-sm text-center font-medium text-gray-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
