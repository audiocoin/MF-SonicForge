
import React, { useState, useRef } from 'react';
import { ChordGenerator } from '../services/ai/ChordGenerator';
import { ChordDiagram } from '../types';
import { Search, Loader2 } from 'lucide-react';

const INSTRUMENTS = ['Guitar', 'Ukulele', 'Banjo', 'Mandolin'];
const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES = ['Major', 'Minor', '7', 'Maj7', 'm7', 'sus4', 'dim', 'aug'];

const ChordLibrary: React.FC = () => {
  const [inst, setInst] = useState('Guitar');
  const [root, setRoot] = useState('C');
  const [quality, setQuality] = useState('Major');
  const [diagram, setDiagram] = useState<ChordDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const generator = useRef(new ChordGenerator());

  const fetchChord = async () => {
    setLoading(true);
    const result = await generator.current.getDiagram(inst, root, quality);
    setDiagram(result);
    setLoading(false);
  };

  return (
    <div className="p-6 h-full flex flex-col items-center animate-in fade-in duration-500 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-8">Chord Library</h2>
      <div className="flex flex-wrap gap-4 bg-gray-850 p-4 rounded-xl border border-gray-700 shadow-xl mb-10 justify-center">
        <select value={inst} onChange={(e) => setInst(e.target.value)} className="bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-primary-500">
          {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={root} onChange={(e) => setRoot(e.target.value)} className="bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-primary-500">
          {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={quality} onChange={(e) => setQuality(e.target.value)} className="bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-primary-500">
          {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <button onClick={fetchChord} disabled={loading} className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
          Find
        </button>
      </div>

      <div className="w-full max-w-sm aspect-square bg-white rounded-xl shadow-2xl flex items-center justify-center relative overflow-hidden">
        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><Loader2 className="text-white w-10 h-10 animate-spin" /></div>}
        {!diagram && !loading && <div className="text-gray-400 italic">Select a chord to view</div>}
        {diagram && (
          <div className="w-full h-full p-8 flex flex-col items-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{diagram.chordName}</h3>
            <svg viewBox="0 0 200 240" className="w-full h-full">
              {diagram.baseFret <= 1 && <rect x="20" y="20" width="160" height="4" fill="black" />}
              {diagram.baseFret > 1 && <text x="10" y="35" fontSize="14" fontWeight="bold">{diagram.baseFret}fr</text>}
              {diagram.frets.map((_, i) => {
                 const x = 20 + i * (160 / (diagram.frets.length - 1));
                 return <line key={i} x1={x} y1="20" x2={x} y2="220" stroke="#333" strokeWidth={i < 3 ? 1 : 2} />;
              })}
              {[1, 2, 3, 4, 5].map(i => {
                const y = 20 + i * 40;
                return <line key={i} x1="20" y1={y} x2="180" y2={y} stroke="#999" strokeWidth="2" />;
              })}
              {diagram.frets.map((fret, stringIdx) => {
                const numStrings = diagram.frets.length;
                const x = 20 + stringIdx * (160 / (numStrings - 1));
                if (fret === -1) return <text key={stringIdx} x={x} y="15" textAnchor="middle" fontSize="16" fill="red">X</text>;
                if (fret === 0) return <circle key={stringIdx} cx={x} cy="10" r="4" stroke="black" fill="none" strokeWidth="2" />;
                const y = 20 + (fret - (diagram.baseFret > 1 ? diagram.baseFret - 1 : 0)) * 40 - 20;
                return (
                  <g key={stringIdx}>
                    <circle cx={x} cy={y} r="12" fill="#0ea5e9" />
                    {diagram.fingers[stringIdx] > 0 && (
                      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{diagram.fingers[stringIdx]}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChordLibrary;
