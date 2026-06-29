import { useState } from 'react';
import { CopilotContextBuilder } from '../lib/CopilotContextBuilder';

export function CopilotWidget() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'copilot', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsLoading(true);

    try {
      // In a real scenario, these would be fetched from state/stores
      const mockReports: any[] = []; 
      const mockClusters: any[] = [];
      const mockRecommendations: any[] = [];

      const contextString = CopilotContextBuilder.buildContext(mockReports, mockClusters, mockRecommendations);

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, context: contextString })
      });

      const data = await response.json();

      if (response.ok) {
        setChatHistory(prev => [...prev, { role: 'copilot', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'copilot', text: `Error: ${data.error}` }]);
      }
    } catch (_err) {
      setChatHistory(prev => [...prev, { role: 'copilot', text: 'Failed to reach Copilot service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
      <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg font-semibold flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span> Operations Copilot
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="text-sm text-gray-500 text-center mt-4">
            Ask me about platform analytics, active clusters, or worker reallocations.
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`text-sm max-w-[85%] rounded-lg p-2 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="text-sm bg-gray-100 text-gray-800 rounded-lg p-2 animate-pulse">
              Analyzing...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Operations Copilot..."
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
