'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/login');
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setLoading(true);
    const newLog = { type: 'system', message: `Initializing task: ${prompt.substring(0, 30)}...` };
    setResults((prev) => [newLog, ...prev]);

    try {
      const response = await api.post('/jobs/execute', { prompt });
      setResults((prev) => [
        { type: 'agent', message: response.data.output },
        { type: 'cost', message: `Task completed. Cost: ${response.data.cost} credits.` },
        ...prev,
      ]);
      setPrompt('');
    } catch (err: any) {
      setResults((prev) => [
        { type: 'error', message: err.response?.data?.message || 'Failed to execute agent task.' },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Zamunda AI</h1>
          <p className="text-gray-400 mt-2">Manage your autonomous agents and credits.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 transition"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Credit Balance Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Credit Balance</h2>
          <div className="text-3xl font-bold text-green-400">Available Credits</div>
          <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">
            Top Up via Paystack
          </button>
        </div>

        {/* Prompt Interface Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 col-span-2">
          <h2 className="text-xl font-semibold mb-4">Quick Agent Task</h2>
          <form onSubmit={handleExecute} className="space-y-4">
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              placeholder="E.g., Find me top 5 news about AI today and summarize them."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Agent is thinking...' : 'Run Autonomous Agent'}
            </button>
          </form>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Execution Results</h2>
        <div className="bg-black p-6 rounded-xl font-mono text-sm h-96 overflow-y-auto border border-gray-800 flex flex-col-reverse">
          {results.length === 0 && (
            <div className="text-gray-600 text-center mt-20">No tasks executed yet. Start by sending a prompt above.</div>
          )}
          {results.map((res, idx) => (
            <div key={idx} className={`mb-4 p-3 rounded-lg ${
              res.type === 'agent' ? 'bg-gray-900 border-l-4 border-green-500' :
              res.type === 'error' ? 'bg-red-900/20 border-l-4 border-red-500' :
              res.type === 'cost' ? 'bg-blue-900/10 text-blue-400 italic' : 'text-gray-400'
            }`}>
              <span className="opacity-50 mr-2">[{res.type.toUpperCase()}]</span>
              {res.message}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
