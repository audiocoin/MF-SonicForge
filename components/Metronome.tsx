
import React, { useState, useEffect, useRef } from 'react';
import { MetronomeEngine } from '../services/metronomeEngine';
import { Play, Square, Minus, Plus, Zap } from 'lucide-react';

export const Metronome: React.FC = () => {
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  
  const engine = useRef<MetronomeEngine | null>(null);

  useEffect(() => {
    engine.current = new MetronomeEngine((b) => setBeat(b));
    return () => engine.current?.stop();
  }, []);

  useEffect(() => {
    if (engine.current) engine.current.setTempo(bpm);
  }, [bpm]);

  const toggle = () => {
    if (playing) {
        engine.current?.stop();
        setBeat(-1);
    } else {
        engine.current?.start();
    }
    setPlaying(!playing);
  };

  const adjustBpm = (delta: number) => {
      setBpm(prev => Math.max(30, Math.min(300, prev + delta)));
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${expanded ? 'bg-gray-900 border border-gray-700 p-4 rounded-2xl shadow-2xl' : 'bg-transparent'}`}>
       {!expanded ? (
           <button 
             onClick={() => setExpanded(true)}
             className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 border-2 ${playing ? 'bg-gray-900 border-primary-500 animate-pulse' : 'bg-gray-800 border-gray-600'}`}
           >
              <Zap className={`w-6 h-6 ${playing ? 'text-primary-500 fill-current' : 'text-gray-400'}`} />
           </button>
       ) : (
           <div className="flex flex-col items-center gap-4 min-w-[160px]">
               <div className="flex justify-between w-full items-center border-b border-gray-800 pb-2">
                   <div className="flex items-center gap-2 text-primary-400 font-bold uppercase text-xs tracking-wider">
                       <Zap className="w-3 h-3" /> Metronome
                   </div>
                   <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-white text-xs">Close</button>
               </div>

               <div className="flex items-center justify-center gap-1 w-full">
                   {[0,1,2,3].map(i => (
                       <div key={i} className={`h-2 rounded-full flex-1 transition-colors duration-75 ${beat === i ? (i===0 ? 'bg-primary-500' : 'bg-primary-300') : 'bg-gray-800'}`} />
                   ))}
               </div>
               
               <div className="flex items-center justify-center gap-3">
                   <button onClick={() => adjustBpm(-5)} className="p-1 text-gray-400 hover:text-white"><Minus className="w-4 h-4" /></button>
                   <div className="text-3xl font-black font-mono text-white w-20 text-center">{bpm}</div>
                   <button onClick={() => adjustBpm(5)} className="p-1 text-gray-400 hover:text-white"><Plus className="w-4 h-4" /></button>
               </div>
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest -mt-2">BPM</div>

               <button 
                 onClick={toggle}
                 className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${playing ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary-600 hover:bg-primary-500 text-white'}`}
               >
                   {playing ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                   {playing ? 'STOP' : 'START'}
               </button>
           </div>
       )}
    </div>
  );
};
