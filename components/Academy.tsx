
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LessonCurator } from '../services/ai/LessonCurator';
import { VideoLesson } from '../types';
import { Search, Youtube, Play, X, Loader2, GraduationCap, AlertCircle, Trash2 } from 'lucide-react';

const INSTRUMENTS = ["Guitar", "Bass", "Drums", "Piano", "Ukulele", "Violin"];

interface AcademyProps {
  initialQuery?: string;
}

const Academy: React.FC<AcademyProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState('');
  const [instrument, setInstrument] = useState('Guitar');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const curator = useRef(new LessonCurator());

  const performSearch = useCallback(async (searchQuery: string, searchInstrument: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);
    setVideos([]); 
    
    try {
      const results = await curator.current.findLessons(searchQuery, searchInstrument);
      setVideos(results);
    } catch (err: any) {
      setError("Failed to fetch videos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery, instrument);
    }
  }, [initialQuery, performSearch, instrument]);

  const handleSearchClick = () => {
    performSearch(query, instrument);
  };

  const handleClearSearch = () => {
    setQuery('');
    setVideos([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div className="p-6 h-full flex flex-col items-center animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <GraduationCap className="text-yellow-400" /> MF SonicForge Academy
        </h2>
        <p className="text-gray-400">Master your favorite songs with AI-curated video lessons.</p>
      </div>

      <div className="w-full max-w-3xl bg-gray-850 p-4 rounded-xl border border-gray-700 shadow-xl mb-8 flex flex-col sm:flex-row gap-4">
        <div className="sm:w-1/4 min-w-[120px]">
           <select 
             value={instrument}
             onChange={(e) => setInstrument(e.target.value)}
             className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
           >
             {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
           </select>
        </div>
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Enter song name...`}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
          />
          {query && (
             <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
               <X className="w-4 h-4" />
             </button>
          )}
        </div>
        <button onClick={handleSearchClick} disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />} Search
        </button>
        {hasSearched && (
           <button onClick={handleClearSearch} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center" title="Clear Results">
             <Trash2 className="w-5 h-5" />
           </button>
        )}
      </div>

      {error && (
        <div className="w-full max-w-2xl bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-400 mb-8 animate-in fade-in">
           <AlertCircle className="w-5 h-5 shrink-0" />
           <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
          <p className="text-gray-400">Searching YouTube for {instrument} lessons...</p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in slide-in-from-bottom-8 pb-12">
          {videos.map((video) => (
            <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-yellow-500 transition-all cursor-pointer group shadow-lg flex flex-col h-full block text-left">
              <div className="relative aspect-video bg-gray-900 overflow-hidden">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play className="w-12 h-12 text-white fill-current drop-shadow-lg scale-90 group-hover:scale-100 transition-transform" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-red-500" /> YouTube
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-white font-bold line-clamp-2 leading-snug group-hover:text-yellow-400 transition-colors mb-2">{video.title}</h3>
                {video.channel && <p className="text-gray-500 text-sm mt-auto">{video.channel}</p>}
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && hasSearched && videos.length === 0 && !error && (
         <div className="flex flex-col items-center justify-center py-12 text-gray-400">
           <AlertCircle className="w-12 h-12 mb-4 text-gray-600" />
           <p className="text-lg">No lessons found for "{query}".</p>
         </div>
      )}

      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center text-gray-600 mt-12 opacity-50">
           <Youtube className="w-24 h-24 mb-4" />
           <p className="text-lg">Select an instrument and enter a song to find tutorials.</p>
        </div>
      )}
    </div>
  );
};

export default Academy;
