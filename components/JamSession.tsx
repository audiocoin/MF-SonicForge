
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { JamComposer } from '../services/ai/JamComposer';
import { JamEngine, JamGroove } from '../services/audioEngine';
import { JamBlueprint } from '../types';
import { ApiKeyWarning } from './SharedAudioUI';
import { Sparkles, Music2, PlayCircle, Loader2, StopCircle, Sliders, Volume2, VolumeX, Music4, Drum, Guitar, Mic2, AudioWaveform, Download, AlignLeft } from 'lucide-react';

const JamSession: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializingAudio, setInitializingAudio] = useState(false);
  const [blueprint, setBlueprint] = useState<JamBlueprint | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);
  const [tempo, setTempo] = useState(120);
  const [groove, setGroove] = useState<JamGroove>('Basic');
  
  const hasApiKey = !!process.env.API_KEY;

  const [loadingAiAudio, setLoadingAiAudio] = useState(false);
  const [hasAiAudio, setHasAiAudio] = useState(false);
  const [drumDownloadUrl, setDrumDownloadUrl] = useState<string | null>(null);
  const [bassDownloadUrl, setBassDownloadUrl] = useState<string | null>(null);
  const [mix, setMix] = useState<{ drums: number; bass: number; chord: number; melody: number }>({ 
    drums: 1, bass: 1, chord: 1, melody: 1 
  });

  const engineRef = useRef<JamEngine | null>(null);
  const composerRef = useRef(new JamComposer());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    engineRef.current = new JamEngine((idx) => setCurrentChordIndex(idx));
    return () => {
        engineRef.current?.stop();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
            e.preventDefault();
            togglePlay(); 
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, blueprint, tempo, groove]); // Dependencies

  useEffect(() => {
      if (isPlaying && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const analyserSize = 128; 
          const dataArray = new Uint8Array(analyserSize);

          const draw = () => {
             if (!engineRef.current || !ctx) return;
             animationRef.current = requestAnimationFrame(draw);
             engineRef.current.getVisualizerData(dataArray);
             ctx.fillStyle = '#111827';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             const barWidth = (canvas.width / analyserSize) * 2.5;
             let x = 0;
             for (let i = 0; i < analyserSize; i++) {
                 const barHeight = (dataArray[i] / 255) * canvas.height;
                 const hue = (i / analyserSize) * 300 + 200; 
                 ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                 ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                 x += barWidth + 1;
             }
          };
          draw();
      } else {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (drumDownloadUrl) window.URL.revokeObjectURL(drumDownloadUrl);
      if (bassDownloadUrl) window.URL.revokeObjectURL(bassDownloadUrl);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setHasAiAudio(false);
    setDrumDownloadUrl(null);
    setBassDownloadUrl(null);
    if (isPlaying) togglePlay();
    
    const result = await composerRef.current.generateBlueprint(prompt);
    if (result) {
        setBlueprint(result);
        setTempo(result.tempo);
        engineRef.current?.loadBlueprint(result);
    }
    setLoading(false);
  };

  const handleGenerateRealAudio = async () => {
    if (!blueprint) return;
    setLoadingAiAudio(true);
    
    try {
        const [drumBase64, bassBase64] = await Promise.all([
            composerRef.current.generateInstrumentLoop(blueprint.styleDescription, blueprint.tempo, 'drums'),
            composerRef.current.generateInstrumentLoop(blueprint.styleDescription, blueprint.tempo, 'bass')
        ]);

        if (drumBase64) {
            await engineRef.current?.loadAiTrack('drums', drumBase64);
            const byteCharacters = atob(drumBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/pcm' }); 
            setDrumDownloadUrl(window.URL.createObjectURL(blob));
        }
        
        if (bassBase64) {
            await engineRef.current?.loadAiTrack('bass', bassBase64);
            const byteCharacters = atob(bassBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/pcm' });
            setBassDownloadUrl(window.URL.createObjectURL(blob));
        }
        setHasAiAudio(true);
    } catch (e) {
        console.error("AI Audio Failed", e);
    } finally {
        setLoadingAiAudio(false);
    }
  };

  const togglePlay = useCallback(async () => {
    if (!blueprint || !engineRef.current) return;
    if (engineRef.current.isPlaying) { // Check ref state directly to avoid closure staleness issues if possible
      engineRef.current.stop();
      setIsPlaying(false);
      setCurrentChordIndex(-1);
    } else {
      setInitializingAudio(true);
      engineRef.current.setTempo(tempo);
      engineRef.current.setGroove(groove);
      await engineRef.current.start();
      setInitializingAudio(false);
      setIsPlaying(true);
      (Object.keys(mix) as Array<keyof typeof mix>).forEach((track) => {
          engineRef.current?.setTrackVolume(track, mix[track]);
      });
    }
  }, [blueprint, tempo, groove, mix]); 

  const handleTempoChange = (val: number) => {
    setTempo(val);
    if (isPlaying) engineRef.current?.setTempo(val);
  };
  
  const handleGrooveChange = (g: JamGroove) => {
      setGroove(g);
      if (isPlaying) engineRef.current?.setGroove(g);
  };

  const toggleMute = (track: keyof typeof mix) => {
    const newVal = mix[track] > 0 ? 0 : 1;
    setMix(prev => ({ ...prev, [track]: newVal }));
    engineRef.current?.setTrackVolume(track, newVal);
  };

  const getTrackIcon = (track: string) => {
    switch(track) {
        case 'drums': return <Drum className="w-5 h-5" />;
        case 'bass': return <Music4 className="w-5 h-5" />;
        case 'chord': return <Guitar className="w-5 h-5" />;
        case 'melody': return <Mic2 className="w-5 h-5" />;
        default: return <Music2 className="w-5 h-5" />;
    }
  };

  if (!hasApiKey) return <ApiKeyWarning />;

  return (
    <div className="p-6 h-full flex flex-col max-w-5xl mx-auto animate-in fade-in duration-500 overflow-y-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-purple-400" /> AI Jam Session
        </h2>
        <p className="text-gray-400">Generate a full band backing track with real instrument samples or AI Audio.</p>
      </div>

      <div className="bg-gray-850 p-6 rounded-2xl border border-gray-700 shadow-xl mb-8">
        <div className="flex gap-4 flex-col md:flex-row">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A funky groove in E minor..."
            className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Music2 />}
            {loading ? 'Composing...' : 'Generate'}
          </button>
        </div>
      </div>

      {blueprint && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-500">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border-l-4 border-purple-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Music2 className="w-32 h-32" /></div>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 relative z-10 gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">{blueprint.key} Jam</h3>
                        <p className="text-purple-300 italic text-sm">{blueprint.styleDescription}</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                            <span className="text-xs text-gray-500 font-bold">BPM</span>
                            <input 
                                type="number" 
                                value={tempo} 
                                onChange={(e) => handleTempoChange(Number(e.target.value))}
                                className="bg-transparent w-12 text-center text-white font-mono focus:outline-none font-bold"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                            <AlignLeft className="w-3 h-3 text-gray-500" />
                            <select 
                                value={groove} 
                                onChange={(e) => handleGrooveChange(e.target.value as JamGroove)}
                                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                            >
                                <option value="Basic">Basic</option>
                                <option value="Rock">Rock</option>
                                <option value="Funk">Funk</option>
                                <option value="Jazz">Jazz</option>
                            </select>
                        </div>
                    </div>
                </div>

                {!hasAiAudio && (
                    <button 
                        onClick={handleGenerateRealAudio}
                        disabled={loadingAiAudio}
                        className="mb-6 w-full py-3 bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-700 rounded-lg flex items-center justify-center gap-2 text-purple-200 hover:text-white hover:border-purple-500 transition-all relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {loadingAiAudio ? <Loader2 className="animate-spin w-5 h-5" /> : <AudioWaveform className="w-5 h-5" />}
                        <span className="font-bold">{loadingAiAudio ? 'Generating 60s Loops (Background Mode)...' : 'Generate 60s AI Audio Tracks'}</span>
                    </button>
                )}
                
                {hasAiAudio && (
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        {drumDownloadUrl && (
                            <a href={drumDownloadUrl} download="drums_ai_loop.pcm" className="py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center gap-2 text-sm font-bold text-white transition-colors border border-gray-600">
                                <Download className="w-4 h-4" /> Drums (PCM)
                            </a>
                        )}
                        {bassDownloadUrl && (
                            <a href={bassDownloadUrl} download="bass_ai_loop.pcm" className="py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center gap-2 text-sm font-bold text-white transition-colors border border-gray-600">
                                <Download className="w-4 h-4" /> Bass (PCM)
                            </a>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 relative z-10">
                    {blueprint.chordProgression.map((chord, i) => (
                    <div 
                        key={i} 
                        className={`aspect-square md:aspect-auto h-24 rounded-lg flex items-center justify-center font-mono text-2xl font-bold border transition-all duration-200
                        ${i === currentChordIndex 
                            ? 'bg-purple-600 text-white border-purple-400 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)] transform -translate-y-1' 
                            : 'bg-gray-900 text-gray-500 border-gray-700'}`}
                    >
                        {chord}
                    </div>
                    ))}
                </div>
            </div>

            {/* Mixer Console */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Sliders className="w-4 h-4" /> Live Mix Console {hasAiAudio && <span className="text-purple-400 text-[10px] ml-2 border border-purple-800 px-1 rounded">AI AUDIO ACTIVE</span>}
               </h4>
               <div className="grid grid-cols-4 gap-4">
                  {(Object.keys(mix) as Array<keyof typeof mix>).map((track) => (
                    <div key={track} className="flex flex-col items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                       <div className="text-gray-400">{getTrackIcon(track as string)}</div>
                       <div className="flex-1 w-2 bg-gray-700 rounded-full relative overflow-hidden h-24">
                          <div 
                            className={`absolute bottom-0 w-full rounded-full transition-all duration-300 ${mix[track] > 0 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-600'}`}
                            style={{ height: mix[track] > 0 ? '70%' : '0%' }}
                          />
                       </div>
                       <button 
                         onClick={() => toggleMute(track)}
                         className={`p-2 rounded-full transition-colors ${mix[track] > 0 ? 'bg-gray-700 text-green-400' : 'bg-red-900/50 text-red-500'}`}
                       >
                         {mix[track] > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                       </button>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{track}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
             
             <canvas ref={canvasRef} width={300} height={300} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />

             {isPlaying && (
                 <>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-[shimmer_2s_infinite]"></div>
                    <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none"></div>
                 </>
             )}
             
             <button 
               onClick={togglePlay}
               disabled={initializingAudio}
               className={`w-32 h-32 rounded-full border-8 transition-all flex items-center justify-center mb-8 shadow-2xl group z-10 relative
                 ${isPlaying 
                   ? 'bg-gray-900 border-red-500 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' 
                   : 'bg-gray-900 border-green-500 text-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] hover:scale-105'}
                 ${(initializingAudio) ? 'border-gray-600 cursor-wait opacity-80' : ''}`}
             >
               {initializingAudio ? <Loader2 className="w-16 h-16 animate-spin text-white" /> : 
                  (isPlaying 
                 ? <StopCircle className="w-16 h-16 fill-current" /> 
                 : <PlayCircle className="w-16 h-16 fill-current" />)
               }
             </button>
             
             <div className="space-y-2 z-10">
                <div className={`text-4xl font-black tracking-tighter ${isPlaying ? 'text-white' : 'text-gray-600'}`}>
                    {initializingAudio ? 'LOADING...' : (isPlaying ? 'ON AIR' : 'READY')}
                </div>
                {hasAiAudio ? (
                    <div className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-1 rounded inline-block font-bold">AI AUDIO ENGINE</div>
                ) : (
                    <div className="text-xs text-gray-500 font-mono">GENERATIVE ENGINE</div>
                )}
                <div className="text-[10px] text-gray-600 pt-2 font-mono">PRESS SPACEBAR TO PLAY/STOP</div>
                {loadingAiAudio && <div className="text-[10px] text-purple-400 animate-pulse font-bold mt-2">AI AUDIO GENERATING IN BACKGROUND...</div>}
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default JamSession;
