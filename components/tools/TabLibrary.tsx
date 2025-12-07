
import React, { useEffect, useState } from 'react';
import { TabResult } from '../../types';
import { Library, BookOpen, Trash2 } from 'lucide-react';

interface TabLibraryProps {
  onSelect: (tab: TabResult) => void;
}

export const TabLibrary: React.FC<TabLibraryProps> = ({ onSelect }) => {
  const [savedTabs, setSavedTabs] = useState<TabResult[]>([]);

  useEffect(() => {
    try {
        const stored = localStorage.getItem('sonicforge_saved_tabs');
        if (stored) setSavedTabs(JSON.parse(stored));
    } catch (e) { console.error("Failed to load tabs", e); }
  }, []);

  const deleteSavedTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = savedTabs.filter((_, i) => i !== index);
    setSavedTabs(newTabs);
    localStorage.setItem('sonicforge_saved_tabs', JSON.stringify(newTabs));
  };

  return (
    <div className="bg-gray-850 p-6 rounded-2xl border border-gray-700 shadow-xl min-h-[400px]">
       <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BookOpen className="text-yellow-500" /> Saved Tabs
       </h2>
       {savedTabs.length === 0 && (
         <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
            <Library className="w-16 h-16 mb-4" />
            <p>No saved tabs yet.</p>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedTabs.map((tab, idx) => (
            <div 
               key={idx} 
               onClick={() => onSelect(tab)}
               className="bg-gray-800 border border-gray-700 hover:border-primary-500 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-750 group relative"
            >
               <div className="flex items-start justify-between">
                 <div>
                   <h3 className="font-bold text-white text-lg line-clamp-1">{tab.song || "Untitled Tab"}</h3>
                   <p className="text-gray-400 text-sm">{tab.artist || "Unknown Artist"}</p>
                 </div>
                 <button onClick={(e) => deleteSavedTab(idx, e)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
               <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs bg-gray-900 text-gray-500 px-2 py-1 rounded font-mono border border-gray-800">{tab.bpm} BPM</span>
                  <span className="text-xs text-primary-400 font-bold group-hover:underline">Load & Play &rarr;</span>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};
