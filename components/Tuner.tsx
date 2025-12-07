
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TunerEngine, NOTE_STRINGS } from '../services/tunerEngine';
import { Mic, CheckCircle2, AlertCircle, Settings2, Sliders } from 'lucide-react';

const INSTRUMENTS = [
  { name: 'Guitar (Standard)', tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { name: 'Guitar (Drop D)', tuning: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { name: 'Guitar (Open G)', tuning: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { name: 'Guitar (DADGAD)', tuning: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { name: 'Bass (4-String)', tuning: ['E1', 'A1', 'D2', 'G2'] },
  { name: 'Bass (5-String)', tuning: ['B0', 'E1', 'A1', 'D2', 'G2'] },
  { name: 'Ukulele', tuning: ['G4', 'C4', 'E4', 'A4'] },
  { name: 'Violin', tuning: ['G3', 'D4', 'A4', 'E5'] },
  { name: 'Cello', tuning: ['C2', 'G2', 'D3', 'A3'] }
];

const Tuner: React.FC = () => {
  const [active, setActive] = useState(false);
  const [note, setNote] = useState('--');
  const [cents, setCents] = useState(0);
  const [freq, setFreq] = useState(0);
  const [selectedInst, setSelectedInst] = useState(0);
  const [refPitch, setRefPitch] = useState(440);
  const [strobeMode, setStrobeMode] = useState(false);
  
  const [targetNote, setTargetNote] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<'none' | 'locked' | 'near'>('none');

  const engineRef = useRef<TunerEngine | null>(null);
  const requestRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strobePhaseRef = useRef(0);

  const startTuner = async () => {
    try {
      if (!engineRef.current) engineRef.current = new TunerEngine({});
      await engineRef.current.init();
      engineRef.current.setReferencePitch(refPitch);
      setActive(true);
      loop();
    } catch (e) {
      console.error("Mic access denied", e);
    }
  };

  const stopTuner = () => {
    setActive(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    engineRef.current?.close();
    engineRef.current = null;
    setNote('--');
    setCents(0);
    setFreq(0);
  };

  // Convert Note Name (e.g., "A4") to Frequency
  const getFreq = (noteName: string) => {
    const note = noteName.slice(0, -1);
    const octave = parseInt(noteName.slice(-1));
    const noteIdx = NOTE_STRINGS.indexOf(note);
    const semitones = (octave - 4) * 12 + (noteIdx - 9); // Relative to A4
    return refPitch * Math.pow(2, semitones / 12);
  };

  const findClosestTarget = (detectedFreq: number) => {
    const tuning = INSTRUMENTS[selectedInst].tuning;
    let closest = tuning[0];
    let minDiff = Infinity;
    
    tuning.forEach(t => {
       const targetFreq = getFreq(t);
       const diff = Math.abs(targetFreq - detectedFreq);
       if (diff < minDiff) {
           minDiff = diff;
           closest = t;
       }
    });
    
    // Check if we are within range to "Lock" onto this string
    const targetF = getFreq(closest);
    const centsOff = 1200 * Math.log2(detectedFreq / targetF);
    
    return { target: closest, diff: centsOff };
  };

  const loop = useCallback(() => {
    if (!engineRef.current) return;
    const pitch = engineRef.current.getPitch();
    
    if (pitch) {
      setNote(pitch.note);
      setFreq(pitch.frequency);
      
      // Target Locking Logic
      const { target, diff } = findClosestTarget(pitch.frequency);
      setTargetNote(target);
      setCents(Math.round(diff)); // Use strict target deviation
      
      if (Math.abs(diff) < 5) setLockStatus('locked');
      else if (Math.abs(diff) < 50) setLockStatus('near');
      else setLockStatus('none');

      // Strobe Visualization
      if (strobeMode && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              const w = canvasRef.current.width;
              const h = canvasRef.current.height;
              
              // Speed is proportional to freq difference
              // If diff is 0, speed is 0. 
              const speed = diff * 0.5; 
              strobePhaseRef.current -= speed;
              
              ctx.fillStyle = '#111';
              ctx.fillRect(0,0,w,h);
              
              const bars = 8;
              const barW = w / bars;
              
              ctx.fillStyle = Math.abs(diff) < 5 ? '#4ade80' : '#ef4444';
              
              for(let i=-1; i<=bars; i++) {
                 let x = (i * barW) + (strobePhaseRef.current % barW);
                 ctx.fillRect(x, 0, barW * 0.5, h);
              }
          }
      }

    } else {
        setLockStatus('none');
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [selectedInst, refPitch, strobeMode]);

  useEffect(() => {
    return () => stopTuner();
  }, []);
  
  useEffect(() => {
      engineRef.current?.setReferencePitch(refPitch);
  }, [refPitch]);

  const rotation = Math.max(-45, Math.min(45, cents));
  const needleColor = lockStatus === 'locked' ? '#4ade80' : lockStatus === 'near' ? '#facc15' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full mb-8">
         <h2 className="text-3xl font-bold text-white tracking-wider flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary-500" /> Pro Tuner
         </h2>
         <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ref Pitch</span>
                <div className="flex items-center gap-2">
                   <input 
                     type="range" min="430" max="450" 
                     value={refPitch} onChange={(e) => setRefPitch(Number(e.target.value))} 
                     className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-xs font-mono text-primary-400">{refPitch}Hz</span>
                </div>
             </div>
             <button 
               onClick={() => setStrobeMode(!strobeMode)}
               className={`px-3 py-1 rounded border text-xs font-bold transition-all ${strobeMode ? 'bg-primary-900 border-primary-500 text-primary-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
             >
                STROBE
             </button>
         </div>
      </div>

      {/* Main Display Area */}
      <div className="relative w-full max-w-md aspect-square bg-gray-900 rounded-full border-8 border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center mb-8 overflow-hidden">
        
        {/* Strobe Canvas Overlay */}
        {strobeMode && (
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <canvas ref={canvasRef} width={400} height={400} className="w-full h-full rounded-full" />
             </div>
        )}

        {/* Note Display */}
        <div className="z-10 text-center">
            <div className={`text-9xl font-black transition-colors duration-200 drop-shadow-2xl ${
                lockStatus === 'locked' ? 'text-green-500' : 
                lockStatus === 'near' ? 'text-yellow-500' : 'text-gray-700'
            }`}>
              {targetNote ? targetNote.replace(/[0-9]/, '') : note}
            </div>
            <div className="text-2xl font-mono text-gray-500 mt-2 font-bold">
               {targetNote || '--'}
            </div>
            <div className={`text-sm font-bold mt-2 px-3 py-1 rounded-full inline-block ${
                 lockStatus === 'locked' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'
            }`}>
                 {active ? (cents > 0 ? `+${cents}` : cents) + ' cents' : 'Standby'}
            </div>
        </div>
        
        {/* Needle Arc */}
        {!strobeMode && (
            <>
                <div className="absolute bottom-16 w-64 h-32 border-t-2 border-l-2 border-r-2 border-gray-700 rounded-t-full opacity-50"></div>
                <div 
                    className="absolute bottom-16 left-1/2 w-1.5 h-28 rounded-full origin-bottom transition-transform duration-100 ease-linear shadow-lg z-20"
                    style={{ 
                        backgroundColor: needleColor,
                        transform: `translateX(-50%) rotate(${rotation}deg)`,
                        boxShadow: `0 0 15px ${needleColor}`
                    }}
                />
                <div className="absolute bottom-14 w-4 h-4 bg-gray-300 rounded-full z-30 border-2 border-gray-800" />
            </>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-md bg-gray-850 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tuning Preset</label>
          <select 
            value={selectedInst} 
            onChange={(e) => setSelectedInst(Number(e.target.value))}
            className="bg-gray-950 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-primary-500 w-48 font-medium"
          >
            {INSTRUMENTS.map((inst, idx) => (
              <option key={idx} value={idx}>{inst.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {INSTRUMENTS[selectedInst].tuning.map((n, i) => (
            <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border-b-4 transition-all duration-300
              ${targetNote === n 
                  ? (Math.abs(cents) < 10 ? 'bg-green-600 border-green-800 text-white scale-110 shadow-[0_0_15px_#22c55e]' : 'bg-yellow-600 border-yellow-800 text-white scale-105')
                  : 'bg-gray-800 border-gray-900 text-gray-500'}`}>
              {n.replace(/[0-9]/, '')}
            </div>
          ))}
        </div>

        <button
          onClick={active ? stopTuner : startTuner}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3
            ${active 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
              : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-500/20'}`}
        >
          {active ? <><AlertCircle className="w-5 h-5" /> Stop Listening</> : <><Mic className="w-5 h-5" /> Start Tuner</>}
        </button>
      </div>
    </div>
  );
};

export default Tuner;
