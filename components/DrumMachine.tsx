
import React, { useState, useEffect, useRef } from 'react';
import { DrumEngine } from '../services/drumEngine';
import { Play, Square, RotateCcw, Volume2, Settings2, Sliders } from 'lucide-react';
import { ControlSlider, Knob } from './SharedAudioUI';

const INSTRUMENTS = ['Kick', 'Snare', 'Hi-Hat', 'Tom'];
const PRESETS: Record<string, boolean[][]> = {
  'Rock': [
    [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Kick
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],       // HH
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false] // Tom
  ],
  'Funk': [
    [true, false, false, false, false, false, false, true, false, false, true, false, false, false, false, false], 
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true], 
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],       
    [false, false, false, false, false, false, false, false, false, false, false, true, false, false, true, false] 
  ]
};

const DrumMachine: React.FC = () => {
  const engineRef = useRef<DrumEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [tempo, setTempo] = useState(120);
  const [grid, setGrid] = useState<boolean[][]>(Array(4).fill(null).map(() => Array(16).fill(false)));
  
  // Mixer State
  const [volumes, setVolumes] = useState<number[]>([0.9, 0.85, 0.6, 0.8]);
  const [pans, setPans] = useState<number[]>([0, 0, 0.15, -0.2]);
  const [pitches, setPitches] = useState<number[]>([1, 1, 1, 1]);

  useEffect(() => {
    engineRef.current = new DrumEngine((step) => setCurrentStep(step));
    // Apply initial state to engine
    volumes.forEach((v, i) => engineRef.current?.setVolume(i, v));
    pans.forEach((v, i) => engineRef.current?.setPan(i, v));
    pitches.forEach((v, i) => engineRef.current?.setPitch(i, v));
    
    return () => engineRef.current?.stop();
  }, []);

  const toggleCell = (instIdx: number, stepIdx: number) => {
    if (!engineRef.current) return;
    engineRef.current.toggleStep(instIdx, stepIdx);
    const newGrid = [...engineRef.current.pattern.map(row => [...row])];
    newGrid[instIdx][stepIdx] = !newGrid[instIdx][stepIdx];
    setGrid(newGrid);
  };

  const togglePlay = () => {
    if (playing) {
      engineRef.current?.stop();
    } else {
      engineRef.current?.start();
    }
    setPlaying(!playing);
  };

  const handleTempoChange = (v: number) => {
    setTempo(v);
    engineRef.current?.setTempo(v);
  };
  
  // Mixer Handlers
  const handleVolumeChange = (idx: number, val: number) => {
    const newVols = [...volumes]; newVols[idx] = val; setVolumes(newVols);
    engineRef.current?.setVolume(idx, val);
  };
  
  const handlePanChange = (idx: number, val: number) => {
    const newPans = [...pans]; newPans[idx] = val; setPans(newPans);
    engineRef.current?.setPan(idx, val);
  };
  
  const handlePitchChange = (idx: number, val: number) => {
    const newPitches = [...pitches]; newPitches[idx] = val; setPitches(newPitches);
    engineRef.current?.setPitch(idx, val);
  };

  const loadPreset = (name: string) => {
    if (!engineRef.current) return;
    const preset = PRESETS[name];
    preset.forEach((row, i) => {
      row.forEach((cell, j) => {
        engineRef.current!.pattern[i][j] = cell;
      });
    });
    setGrid(preset);
  };

  const clear = () => {
    engineRef.current?.clear();
    setGrid(Array(4).fill(null).map(() => Array(16).fill(false)));
  };

  return (
    <div className="p-6 h-full flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl gap-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 shadow-inner">
               <button 
                 onClick={togglePlay}
                 className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${playing ? 'bg-red-500 text-white shadow-[0_0_15px_red]' : 'bg-green-500 text-white hover:scale-105'}`}
               >
                 {playing ? <Square className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
               </button>
            </div>
            
            <div className="flex flex-col">
               <h2 className="text-2xl font-black text-white tracking-tighter uppercase">ACID Groove</h2>
               <div className="flex items-center gap-2">
                 <Settings2 className="w-3 h-3 text-gray-500" />
                 <span className="text-xs text-gray-500 font-mono">LOOP STATION</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-950 px-4 py-2 rounded-lg border border-gray-800">
             <div className="text-right">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Tempo</div>
                <div className="text-xl font-mono text-primary-400 font-bold">{tempo} <span className="text-xs text-gray-600">BPM</span></div>
             </div>
             <input 
                type="range" min="60" max="200" 
                value={tempo} 
                onChange={(e) => handleTempoChange(Number(e.target.value))}
                className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
             />
          </div>

          <div className="flex gap-2">
            {Object.keys(PRESETS).map(name => (
              <button 
                key={name}
                onClick={() => loadPreset(name)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 hover:text-white transition-colors"
              >
                {name}
              </button>
            ))}
            <button onClick={clear} className="p-2.5 bg-gray-800 hover:bg-red-900/20 text-gray-400 hover:text-red-400 border border-gray-700 rounded-lg transition-colors" title="Clear Pattern">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sequencer Grid */}
            <div className="lg:col-span-3 bg-gray-850 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Step Indicators */}
                <div className="flex mb-2 ml-20 gap-1.5">
                   {[...Array(16)].map((_, i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i === currentStep ? 'bg-primary-500 shadow-[0_0_5px_#0ea5e9]' : i % 4 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`} />
                   ))}
                </div>

                {INSTRUMENTS.map((inst, instIdx) => (
                    <div key={inst} className="flex items-center gap-4 mb-3 group">
                    <span className="w-16 text-xs font-bold text-gray-500 text-right uppercase tracking-wider group-hover:text-white transition-colors">{inst}</span>
                    <div className="flex-1 flex gap-1.5 h-12">
                        {[...Array(16)].map((_, stepIdx) => {
                        const isActive = grid[instIdx]?.[stepIdx]; 
                        const isCurrent = currentStep === stepIdx;
                        const isBeat = stepIdx % 4 === 0;
                        
                        return (
                            <button
                            key={stepIdx}
                            onClick={() => toggleCell(instIdx, stepIdx)}
                            className={`flex-1 rounded transition-all duration-75 relative border border-transparent
                                ${isActive 
                                ? 'bg-primary-500 shadow-[0_0_10px_rgba(14,165,233,0.4)] hover:bg-primary-400' 
                                : isBeat ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'}
                                ${isCurrent ? 'ring-1 ring-white brightness-125 z-10' : ''}
                            `}
                            >
                                {isActive && <div className="absolute inset-0 bg-white/10" />}
                            </button>
                        );
                        })}
                    </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Mixer Panel */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 shadow-xl flex flex-col">
               <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800">
                  <Sliders className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Master Mixer</span>
               </div>
               
               <div className="flex-1 flex justify-between px-1">
                  {INSTRUMENTS.map((inst, idx) => (
                      <div key={inst} className="flex flex-col items-center gap-2 bg-gray-950/50 p-2 rounded-lg border border-gray-800">
                          {/* Pan Knob */}
                          <Knob 
                             value={pans[idx]} min={-1} max={1} 
                             onChange={(v) => handlePanChange(idx, v)} 
                             size={24} color="#38bdf8" 
                             title="Pan"
                          />
                          
                          {/* Pitch Knob */}
                          <Knob 
                             value={pitches[idx]} min={0.5} max={2.0} 
                             onChange={(v) => handlePitchChange(idx, v)} 
                             size={24} color="#f472b6" 
                             title="Tune"
                          />

                          <div className="h-2" />
                          
                          {/* Volume Fader */}
                          <ControlSlider 
                            label={inst.substring(0, 3)} 
                            value={volumes[idx]} 
                            min={0} max={1} step={0.05} 
                            size="sm"
                            style="interface"
                            onChange={(v) => handleVolumeChange(idx, v)} 
                          />
                      </div>
                  ))}
               </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DrumMachine;
