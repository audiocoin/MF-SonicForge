
import React, { useState, useRef } from 'react';
import { TranscriptionAgent } from '../../services/ai/TranscriptionAgent';
import { TabResult } from '../../types';
import { Search, Loader2, AlertCircle } from 'lucide-react';

interface TabSearchProps {
  onResult: (result: TabResult) => void;
}

export const TabSearch: React.FC<TabSearchProps> = ({ onResult }) => {
  const [query, setQuery] = useState('');
  const [instrument, setInstrument] = useState('Guitar');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const agent = useRef(new TranscriptionAgent());

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await agent.current.generateTabFromQuery(query, { instrument, difficulty });
      if (res) {
        onResult(res);
      } else {
        setError("Unable to generate tabs. Please try a more specific query.");
      }
    } catch (e) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-850 p-6 rounded-2xl border border-gray-700 shadow-xl">
       <div className="flex flex-col md:flex-row gap-4 mb-6">
         <div className="flex-1 flex gap-4">
            <input 
                type="text" 
                placeholder="Enter song name..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
         </div>
         <div className="flex gap-2">
             <select value={instrument} onChange={(e) => setInstrument(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                 <option value="Guitar">Guitar</option>
                 <option value="Bass">Bass</option>
                 <option value="Ukulele">Ukulele</option>
             </select>
             <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                 <option value="Beginner">Beginner</option>
                 <option value="Intermediate">Intermediate</option>
                 <option value="Advanced">Advanced</option>
             </select>
             <button onClick={handleSearch} disabled={loading} className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-bold min-w-[100px] flex justify-center">
               {loading ? <Loader2 className="animate-spin" /> : <Search />}
             </button>
         </div>
       </div>
       {error && (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg text-red-400 flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
          </div>
       )}
    </div>
  );
};
