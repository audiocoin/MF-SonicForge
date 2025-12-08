
import React, { useState, useEffect, useRef } from 'react';
import { EffectsEngine } from '../services/audioEngine';
import { EffectParams, AudioTake } from '../types';
import { Mic, Radio, Download, Trash2, Play, Activity, Sliders, AudioLines, Loader2, StopCircle, Headphones, Repeat, Save, RotateCcw, Power } from 'lucide-react';
import { ControlSlider, Stompbox, AudioInterfaceUnit } from './SharedAudioUI';

const DEFAULT_PARAMS: EffectParams = {
  cabinetModel: 'bypass',
  gain: 1.0,
  distortion: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  
  // 9-Band EQ
  eq63: 0, eq125: 0, eq250: 0, eq500: 0, eq1k: 0, eq2k: 0, eq4k: 0, eq8k: 0, eq16k: 0,

  // Enables
  enableCompressor: true,
  enableSupernova: false,
  enableOverdrive: false,
  enableChorus: false,
  enableTremolo: false,
  enableDelay: false,
  enableReverb: true,

  compressorThreshold: -24,
  compressorRatio: 12,
  
  // Supernova Overdrive (defaults)
  supernovaDrive: 20,
  supernovaTone: 50,
  supernovaLevel: 0.8,

  // Green Drive
  overdriveDrive: 30,
  overdriveTone: 50,
  overdriveLevel: 1.0,

  // Tremolo
  tremoloRate: 4,
  tremoloDepth: 50,

  // Modulation & Time
  chorusRate: 1.5,
  chorusDepth: 30,
  reverbMix: 0.2,
  reverbDecay: 1.5,
  delayTime: 0.3,
  delayFeedback: 0.3
};

const STUDIO_PRESETS: Record<string, Partial<EffectParams>> = {
  'Studio Clean': { 
    gain: 1, distortion: 0, eqLow: -2, eqMid: 2, eqHigh: 4, 
    enableCompressor: true, enableReverb: true, enableChorus: false, enableDelay: false, enableSupernova: false,
    reverbMix: 0.1, reverbDecay: 1.5 
  },
  'Warm Broadcast': { 
    gain: 1.2, distortion: 10, eqLow: 4, eqMid: 0, eqHigh: 2, 
    enableCompressor: true, enableReverb: false, enableChorus: false, enableDelay: false, enableSupernova: false,
    compressorThreshold: -30, compressorRatio: 16 
  },
  'Arena Pop': { 
    gain: 1, distortion: 0, eqLow: -5, eqHigh: 5, 
    enableCompressor: true, enableReverb: true, enableChorus: true, enableDelay: true, enableSupernova: false,
    reverbMix: 0.4, reverbDecay: 3.0, chorusDepth: 40, chorusRate: 1.2, delayTime: 0.4, delayFeedback: 0.3 
  },
  'Telephone': { 
    gain: 2, distortion: 40, eqLow: -20, eqMid: 10, eqHigh: -20, 
    enableCompressor: true, enableReverb: false, enableChorus: false, enableDelay: false, enableSupernova: false 
  },
  'Ethereal': { 
    gain: 1, distortion: 0, eqHigh: 8, 
    enableCompressor: true, enableReverb: true, enableChorus: true, enableDelay: true, enableSupernova: false,
    reverbMix: 0.8, reverbDecay: 6.0, chorusDepth: 70, chorusRate: 0.5, delayTime: 0.5, delayFeedback: 0.6 
  }
};

const VoiceStudio: React.FC = () => {
  const [params, setParams] = useState<EffectParams>(DEFAULT_PARAMS);
  const [isMonitorOn, setIsMonitorOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [takes, setTakes] = useState<AudioTake[]>([]);
  const [activePreset, setActivePreset] = useState('Studio Clean');
  
  // Interface State
  const [isInstMode, setIsInstMode] = useState(false);
  const [isAirMode, setIsAirMode] = useState(false);
  const [isSignalPresent, setIsSignalPresent] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const engine = useRef<EffectsEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    engine.current = new EffectsEngine({});
    loadPreset('Studio Clean');
    // We initially just get the list without prompting permissions
    EffectsEngine.getAudioInputs().then(setDevices);

    return () => {
      cancelAnimationFrame(animationRef.current!);
      engine.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (engine.current) engine.current.updateParams(params);
  }, [params]);
  
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isMonitorOn || isRecording) {
        await engine.current?.startMic(deviceId);
    }
  };

  const refreshDevices = async () => {
      const devs = await EffectsEngine.getAudioInputs();
      setDevices(devs);
  };

  const loadPreset = (name: string) => {
    setActivePreset(name);
    const preset = STUDIO_PRESETS[name];
    setParams({ ...DEFAULT_PARAMS, ...preset });
  };

  const update = (key: keyof EffectParams, val: any) => {
    setParams(prev => ({ ...prev, [key]: val }));
    setActivePreset('Custom');
  };

  // Toggle Monitors - STRICT MIC CONTROL
  const toggleMonitor = async () => {
    const newState = !isMonitorOn;
    setIsMonitorOn(newState);
    
    if (newState) {
        // Turn ON Mic
        await engine.current?.startMic(selectedDeviceId);
        engine.current?.setMonitor(true);
        drawVisualizer();
        refreshDevices();
    } else {
        // Turn OFF Monitor
        engine.current?.setMonitor(false);
        // Stop mic only if not recording
        if (!isRecording) {
            engine.current?.stopMicStream();
            setIsSignalPresent(false);
            setIsClipping(false);
            cancelAnimationFrame(animationRef.current!);
        }
    }
  };
  
  // Toggle Inst Mode (Gain Boost)
  const toggleInstMode = () => {
    const newState = !isInstMode;
    setIsInstMode(newState);
    // Simulate instrument impedance/gain boost
    const newGain = newState ? Math.min(params.gain * 1.5, 3) : params.gain / 1.5;
    update('gain', newGain);
  };
  
  // Toggle Air Mode (High Shelf Boost)
  const toggleAirMode = () => {
    const newState = !isAirMode;
    setIsAirMode(newState);
    // Simulate "Air" presence boost
    const newHigh = newState ? params.eqHigh + 4 : params.eqHigh - 4;
    update('eqHigh', newHigh);
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !engine.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = engine.current.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      engine.current!.getVisualizerData(dataArray);

      // Signal Analysis for Interface Halo
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += Math.abs(dataArray[i] - 128);
      const avg = sum / bufferLength;
      
      // Only update signal indicators when mic is active (Rec or Mon)
      if (isRecording || isMonitorOn) {
          setIsSignalPresent(avg > 2); // Threshold for signal
          setIsClipping(avg > 100);    // Threshold for clip
      } else {
          setIsSignalPresent(false);
          setIsClipping(false);
      }

      // CRT Screen Effect
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
      for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); }
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = isRecording ? '#ef4444' : '#38bdf8'; 
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;
      
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    draw();
  };

  // Toggle Record - STRICT MIC CONTROL
  const toggleRecord = async () => {
    if (isRecording) {
      // STOP RECORDING
      const blob = await engine.current?.stopRecording();
      if (blob) {
        setTakes(prev => [{
          id: Date.now().toString(),
          blob, 
          name: `Vocal Take ${takes.length + 1}`,
          date: new Date(),
          duration: 0 
        }, ...prev]);
      }
      
      setIsRecording(false);
      
      // Only stop mic if Monitor is OFF
      if (!isMonitorOn) {
        engine.current?.stopMicStream();
        setIsSignalPresent(false);
        setIsClipping(false);
        cancelAnimationFrame(animationRef.current!);
      }
      
    } else {
      // START RECORDING (Turn on Mic)
      await engine.current?.startMic(selectedDeviceId);
      engine.current?.updateParams(params); // Re-apply effects to new graph
      engine.current?.startRecording();
      
      setIsRecording(true);
      drawVisualizer();
      refreshDevices();
    }
  };

  const togglePreviewTake = (take: AudioTake, loop: boolean = false) => {
    if (playingTakeId === take.id) {
      if (isLooping === loop) {
        // STOP PLAYBACK
        engine.current?.stopPreview();
        setPlayingTakeId(null);
        setIsLooping(false);
        cancelAnimationFrame(animationRef.current!);
      } else {
        // RESTART WITH LOOP CHANGE
        engine.current?.playRaw(take.blob, () => {
          setPlayingTakeId(null);
          setIsLooping(false);
          cancelAnimationFrame(animationRef.current!);
        }, loop);
        setPlayingTakeId(take.id);
        setIsLooping(loop);
        drawVisualizer(); // Re-trigger visualizer
      }
    } else {
      // START PLAYBACK
      engine.current?.playRaw(take.blob, () => {
        setPlayingTakeId(null);
        setIsLooping(false);
        cancelAnimationFrame(animationRef.current!);
      }, loop);
      setPlayingTakeId(take.id);
      setIsLooping(loop);
      drawVisualizer();
    }
  };

  const downloadProcessed = async (take: AudioTake) => {
    if (!engine.current) return;
    setProcessingId(take.id);
    const processedBlob = await engine.current.exportProcessed(take.blob, params);
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${take.name}_Processed.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    setProcessingId(null);
  };

  const downloadRaw = (take: AudioTake) => {
    const url = URL.createObjectURL(take.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${take.name}_Raw_PCM.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteTake = (id: string) => {
    if (playingTakeId === id) engine.current?.stopPreview();
    setTakes(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto w-full max-w-7xl mx-auto">
       
       <div className="w-full flex flex-col gap-6">
          
          {/* Top Section: Header & Monitor */}
          <div className="flex flex-col lg:flex-row gap-6">
             {/* Left: Input & Monitor */}
             <div className="lg:w-1/3 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                      <Mic className="text-white w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-white tracking-tight">Vocal Studio Pro</h2>
                     <p className="text-gray-400 text-xs font-mono">LOSSLESS PCM RECORDING</p>
                   </div>
                </div>

                {/* AUDIO INTERFACE UNIT */}
                <AudioInterfaceUnit 
                   devices={devices}
                   selectedDeviceId={selectedDeviceId}
                   onDeviceChange={handleDeviceChange}
                   gain={params.gain}
                   onGainChange={(v) => update('gain', v)}
                   isMonitorOn={isMonitorOn}
                   onToggleMonitor={toggleMonitor}
                   isInstMode={isInstMode}
                   onToggleInst={toggleInstMode}
                   isAirMode={isAirMode}
                   onToggleAir={toggleAirMode}
                   isSignalPresent={isSignalPresent}
                   isClipping={isClipping}
                />
                
                {/* Visualizer */}
                <div className="flex-1 bg-gray-950 rounded-xl border border-gray-800 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] min-h-[140px]">
                   <canvas ref={canvasRef} width={400} height={160} className="w-full h-full absolute inset-0" />
                   <div className="absolute top-2 left-2 text-[9px] text-primary-500/50 font-mono tracking-widest border border-primary-900/50 px-1 rounded">OSCILLOSCOPE</div>
                   {isRecording && (
                     <div className="absolute top-2 right-2 flex items-center gap-1.5">
                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
                       <span className="text-[9px] text-red-500 font-bold tracking-widest">REC</span>
                     </div>
                   )}
                   {playingTakeId && (
                     <div className="absolute top-2 right-2 flex items-center gap-1.5">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_green]"></div>
                       <span className="text-[9px] text-green-500 font-bold tracking-widest">PLAY</span>
                     </div>
                   )}
                   {!isRecording && !playingTakeId && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-700 text-xs font-mono uppercase tracking-widest">Standby</span>
                     </div>
                   )}
                </div>
             </div>

             {/* Right: Processor Rack UI */}
             <div className="lg:w-2/3 flex flex-col gap-4">
                
                {/* 1. Main Amp Head Unit */}
                <div className="bg-gray-900 rounded-t-xl border border-gray-700 shadow-2xl overflow-hidden">
                   {/* Faceplate Header */}
                   <div className="bg-gradient-to-r from-gray-800 to-gray-700 h-10 border-b border-gray-600 flex items-center justify-between px-6">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_white]"></div>
                         <span className="text-xs font-black text-gray-200 tracking-[0.2em]">MF SONICFORGE</span>
                         <span className="text-xs font-light text-yellow-500">TUBE PRE-AMP</span>
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">MODEL: SF-V100</div>
                   </div>
                   
                   {/* Knobs Area - Updated to Faders */}
                   <div className="p-6 bg-[#1a1a1a] relative">
                      {/* Texture overlay */}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
                      
                      <div className="flex flex-wrap justify-between items-end relative z-10 px-4 md:px-10">
                         {/* Removed Input/Gain knobs from here as they are on the interface now. Only Tone shaping here. */}
                         <div className="flex flex-col items-center justify-end pb-2">
                            <span className="text-gray-600 text-[10px] font-mono mb-2 uppercase tracking-widest">Tone Stack</span>
                            <div className="w-full h-px bg-gray-700"></div>
                         </div>
                         
                         <ControlSlider label="Drive" value={params.distortion} min={0} max={100} style="amp" onChange={v => update('distortion', v)} />
                         
                         <div className="w-px h-16 bg-gray-700 mx-2"></div>
                         
                         <ControlSlider label="Bass" value={params.eqLow} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqLow', v)} />
                         <ControlSlider label="Middle" value={params.eqMid} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqMid', v)} />
                         <ControlSlider label="Treble" value={params.eqHigh} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqHigh', v)} />
                      </div>
                   </div>
                </div>

                {/* 2. Stompbox / Rack Modules */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-black/40 rounded-b-xl border border-gray-800">
                   
                   {/* Module: Dynamics (Compressor) */}
                   <Stompbox 
                      label="Dynamics" 
                      color="blue" 
                      enabled={params.enableCompressor} 
                      onToggle={() => update('enableCompressor', !params.enableCompressor)}
                   >
                       <ControlSlider label="Thresh" value={params.compressorThreshold} min={-60} max={0} unit="dB" onChange={v => update('compressorThreshold', v)} />
                       <ControlSlider label="Ratio" value={params.compressorRatio} min={1} max={20} onChange={v => update('compressorRatio', v)} />
                   </Stompbox>

                   {/* Module: Modulation (Chorus) */}
                   <Stompbox 
                      label="Chorus" 
                      color="purple" 
                      enabled={params.enableChorus} 
                      onToggle={() => update('enableChorus', !params.enableChorus)}
                   >
                       <ControlSlider label="Rate" value={params.chorusRate} min={0.1} max={5} step={0.1} unit="Hz" onChange={v => update('chorusRate', v)} />
                       <ControlSlider label="Depth" value={params.chorusDepth} min={0} max={100} onChange={v => update('chorusDepth', v)} />
                   </Stompbox>

                   {/* Module: Delay */}
                   <Stompbox 
                      label="Delay" 
                      color="green" 
                      enabled={params.enableDelay} 
                      onToggle={() => update('enableDelay', !params.enableDelay)}
                   >
                       <ControlSlider label="Time" value={params.delayTime} min={0} max={1} step={0.05} unit="s" onChange={v => update('delayTime', v)} />
                       <ControlSlider label="Fdbk" value={params.delayFeedback} min={0} max={0.9} step={0.05} onChange={v => update('delayFeedback', v)} />
                   </Stompbox>

                   {/* Module: Reverb */}
                   <Stompbox 
                      label="Reverb" 
                      color="orange" 
                      enabled={params.enableReverb} 
                      onToggle={() => update('enableReverb', !params.enableReverb)}
                   >
                       <ControlSlider label="Decay" value={params.reverbDecay} min={0.1} max={10} step={0.1} unit="s" onChange={v => update('reverbDecay', v)} />
                       <ControlSlider label="Mix" value={params.reverbMix} min={0} max={1} step={0.05} onChange={v => update('reverbMix', v)} />
                   </Stompbox>
                </div>

                {/* 3. Preset Display & Selection */}
                <div className="bg-black rounded-lg border border-gray-800 p-3 flex items-center justify-between">
                   <div className="bg-green-900/20 border border-green-800 rounded px-4 py-2 flex-1 mr-4 flex items-center justify-between">
                      <span className="text-green-500 font-mono text-sm tracking-widest uppercase truncate">{activePreset}</span>
                      <span className="text-[10px] text-green-700 font-mono">PRESET</span>
                   </div>
                   
                   <div className="flex gap-2">
                      {Object.keys(STUDIO_PRESETS).map(name => (
                        <button
                          key={name}
                          onClick={() => loadPreset(name)}
                          className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-bold transition-all
                            ${activePreset === name 
                              ? 'bg-yellow-600 border-yellow-500 text-white shadow-[0_0_8px_orange]' 
                              : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white'}`}
                        >
                          {name.substring(0,1)}
                        </button>
                      ))}
                      <button 
                        onClick={() => setParams(DEFAULT_PARAMS)}
                        className="w-8 h-8 rounded border border-gray-700 bg-gray-800 text-gray-500 hover:text-white flex items-center justify-center" 
                        title="Reset"
                      >
                         <RotateCcw className="w-4 h-4" />
                      </button>
                   </div>
                </div>

             </div>
          </div>

          {/* Bottom Section: Recording & Takes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {/* REC Panel */}
             <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                
                <button
                  onClick={toggleRecord}
                  disabled={playingTakeId !== null}
                  className={`relative w-20 h-20 rounded-full border-4 shadow-xl transition-all flex items-center justify-center z-10
                    ${isRecording 
                      ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse scale-105' 
                      : 'bg-[#2a2a2a] border-[#3a3a3a] hover:border-red-500 hover:scale-105'}
                    ${playingTakeId !== null ? 'opacity-20 cursor-not-allowed' : ''}  
                  `}
                >
                  <div className={`w-6 h-6 rounded sm:rounded-full transition-all ${isRecording ? 'bg-white' : 'bg-red-600'}`} />
                </button>
                
                <div className="mt-4 text-center z-10">
                   <div className={`text-xs font-black tracking-[0.2em] mb-1 ${isRecording ? 'text-red-500' : 'text-gray-500'}`}>
                      {isRecording ? 'RECORDING' : 'START REC'}
                   </div>
                   {isRecording && <div className="text-[10px] text-gray-400 font-mono">48kHz • 32-bit Float</div>}
                </div>
             </div>

             {/* Takes List */}
             <div className="md:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-lg min-h-[200px]">
                <div className="bg-gray-950 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 tracking-wider">
                     <AudioLines className="w-4 h-4 text-primary-500" /> Session Library
                   </span>
                   <span className="text-[10px] text-gray-600 font-mono bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{takes.length} FILES</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                   {takes.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-40">
                        <AudioLines className="w-12 h-12 mb-3" />
                        <p className="text-sm">No audio takes recorded</p>
                     </div>
                   )}
                   {takes.map(take => (
                     <div key={take.id} className={`bg-gray-800/50 hover:bg-gray-800 p-2 rounded border border-transparent hover:border-gray-700 flex items-center justify-between group transition-all ${playingTakeId === take.id ? 'border-l-4 border-l-primary-500 bg-gray-800' : ''}`}>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1">
                             <button 
                                onClick={() => togglePreviewTake(take, false)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 
                                  ${playingTakeId === take.id && !isLooping
                                    ? 'bg-primary-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.4)]' 
                                    : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                             >
                                {playingTakeId === take.id && !isLooping ? <StopCircle className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                             </button>
                             <button 
                                onClick={() => togglePreviewTake(take, true)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110
                                  ${playingTakeId === take.id && isLooping
                                    ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                                    : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                             >
                                {playingTakeId === take.id && isLooping ? <StopCircle className="w-4 h-4 fill-current" /> : <Repeat className="w-4 h-4" />}
                             </button>
                           </div>

                           <div className="flex flex-col">
                              <span className="text-gray-200 font-bold text-xs">{take.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{take.date.toLocaleTimeString()} • RAW WAV</span>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                           <button 
                              onClick={() => downloadRaw(take)}
                              className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded" 
                              title="Download Raw PCM"
                           >
                              PCM
                           </button>
                           <button 
                              onClick={() => downloadProcessed(take)}
                              disabled={processingId === take.id} 
                              className="flex items-center gap-1.5 px-3 py-1 bg-primary-900/40 hover:bg-primary-600 rounded text-primary-300 hover:text-white transition-colors text-[10px] font-bold border border-primary-800 hover:border-primary-500" 
                              title="Render FX"
                           >
                              {processingId === take.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              RENDER
                           </button>
                           <button onClick={() => deleteTake(take.id)} className="p-1.5 hover:bg-red-900/50 hover:text-red-400 text-gray-600 rounded transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default VoiceStudio;
