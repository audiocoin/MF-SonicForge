
import React, { useState, useEffect, useRef } from 'react';
import { EffectsEngine } from '../services/audioEngine';
import { EffectParams, AudioTake } from '../types';
import { Sliders, Mic, Play, Square, Save, RotateCcw, Power, Headphones, StopCircle, Trash2, AudioLines, Download, Repeat, Loader2, Plus, X } from 'lucide-react';
import { ControlSlider, Stompbox, AudioInterfaceUnit, EqSlider } from './SharedAudioUI';

const DEFAULT_PARAMS: EffectParams = {
  ampModel: 'clean',
  gain: 1.0,
  distortion: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  
  // 9-Band EQ
  eq63: 0, eq125: 0, eq250: 0, eq500: 0, eq1k: 0, eq2k: 0, eq4k: 0, eq8k: 0, eq16k: 0,

  enableCompressor: false,
  enableChorus: false,
  enableDelay: false,
  enableReverb: true,
  enableSupernova: false, 
  enableOverdrive: false,
  enableTremolo: false,

  compressorThreshold: -24,
  compressorRatio: 4,
  chorusRate: 1.5,
  chorusDepth: 0,
  reverbMix: 0.1,
  reverbDecay: 1.5,
  delayTime: 0.3,
  delayFeedback: 0.3,
  
  supernovaDrive: 20,
  supernovaTone: 50,
  supernovaLevel: 0.8,
  
  overdriveDrive: 30,
  overdriveTone: 50,
  overdriveLevel: 1.0,

  tremoloRate: 4,
  tremoloDepth: 50
};

const AMP_MODELS = [
  { id: 'clean', name: 'SF-Twin', description: 'American Clean', gradient: 'from-gray-800 to-gray-700', accent: 'text-blue-400', led: 'bg-blue-500' },
  { id: 'crunch', name: 'Brit 800', description: 'British Crunch', gradient: 'from-amber-900 to-amber-950', accent: 'text-amber-500', led: 'bg-amber-500' },
  { id: 'modern', name: 'Rectifier', description: 'Modern High-Gain', gradient: 'from-red-950 to-gray-900', accent: 'text-red-500', led: 'bg-red-600' },
  { id: 'bass', name: 'SVT-Pro', description: 'Bass Tube', gradient: 'from-slate-800 to-slate-900', accent: 'text-emerald-400', led: 'bg-emerald-500' }
];

const GUITAR_PRESETS: Record<string, Partial<EffectParams>> = {
  'Clean Funk': { 
    ampModel: 'clean',
    gain: 0.8, distortion: 0, eqLow: -2, eqMid: 2, eqHigh: 4, 
    enableCompressor: true, enableReverb: true,
    compressorThreshold: -20, compressorRatio: 8, reverbMix: 0.15,
    eq2k: 2, eq4k: 3 
  },
  'Texas Blues': { 
    ampModel: 'crunch',
    gain: 1.0, distortion: 5, eqLow: 2, eqMid: 4, eqHigh: 2, 
    enableOverdrive: true, enableReverb: true,
    overdriveDrive: 40, overdriveTone: 60, reverbMix: 0.2, reverbDecay: 1.2,
    eq500: 3, eq1k: 2 
  },
  'Metal Lead': { 
    ampModel: 'modern',
    gain: 2.0, distortion: 80, eqLow: 6, eqMid: -4, eqHigh: 8, 
    enableSupernova: true, enableDelay: true,
    supernovaDrive: 70, supernovaTone: 80, delayTime: 0.35, delayFeedback: 0.4,
    eq125: 4, eq1k: -6, eq4k: 4
  },
  'Ambient Swell': { 
    ampModel: 'clean',
    gain: 1.0, distortion: 0, 
    enableCompressor: true, enableReverb: true, enableChorus: true, enableDelay: true, enableTremolo: true,
    reverbMix: 0.7, reverbDecay: 6.0, delayTime: 0.5, delayFeedback: 0.6, chorusDepth: 60,
    tremoloRate: 2, tremoloDepth: 30
  }
};

const AVAILABLE_PEDALS = [
  { id: 'compressor', name: 'Compressor', param: 'enableCompressor' },
  { id: 'supernova', name: 'Supernova Fuzz', param: 'enableSupernova' },
  { id: 'overdrive', name: 'Green Drive', param: 'enableOverdrive' },
  { id: 'tremolo', name: 'Pulse Tremolo', param: 'enableTremolo' },
  { id: 'chorus', name: 'Chorus', param: 'enableChorus' },
  { id: 'delay', name: 'Delay', param: 'enableDelay' },
  { id: 'reverb', name: 'Reverb', param: 'enableReverb' },
];

const EffectsStudio: React.FC = () => {
  const [params, setParams] = useState<EffectParams>(DEFAULT_PARAMS);
  const [activePreset, setActivePreset] = useState('Clean Funk');
  const [boardLayout, setBoardLayout] = useState<string[]>(['compressor', 'supernova', 'overdrive', 'chorus', 'delay', 'reverb']);
  
  // Interface State
  const [isMonitorOn, setIsMonitorOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInstMode, setIsInstMode] = useState(false);
  const [isAirMode, setIsAirMode] = useState(false);
  const [isSignalPresent, setIsSignalPresent] = useState(false);
  const [isClipping, setIsClipping] = useState(false);

  const [takes, setTakes] = useState<AudioTake[]>([]);
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
    loadPreset('Clean Funk');
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
        // Restart mic with new device if active
        await engine.current?.startMic(deviceId);
    }
  };

  const refreshDevices = async () => {
      // Refresh list with full labels now that we have permission
      const devs = await EffectsEngine.getAudioInputs();
      setDevices(devs);
  };

  const loadPreset = (name: string) => {
    setActivePreset(name);
    setParams({ ...DEFAULT_PARAMS, ...GUITAR_PRESETS[name] });
    // Auto-populate board based on enabled effects in preset
    const newBoard = [...boardLayout];
    if (GUITAR_PRESETS[name].enableTremolo && !newBoard.includes('tremolo')) newBoard.push('tremolo');
    if (GUITAR_PRESETS[name].enableOverdrive && !newBoard.includes('overdrive')) newBoard.push('overdrive');
    setBoardLayout(newBoard);
  };

  const update = (key: keyof EffectParams, val: any) => {
    setParams(prev => ({ ...prev, [key]: val }));
    setActivePreset('Custom');
  };

  const addPedal = (id: string) => {
      if (!boardLayout.includes(id)) setBoardLayout([...boardLayout, id]);
  };

  const removePedal = (id: string) => {
      setBoardLayout(prev => prev.filter(p => p !== id));
      // Also disable the effect
      const pedal = AVAILABLE_PEDALS.find(p => p.id === id);
      if (pedal) update(pedal.param as keyof EffectParams, false);
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
        // Only stop mic if not recording
        if (!isRecording) {
            engine.current?.stopMicStream();
            setIsSignalPresent(false);
            setIsClipping(false);
            cancelAnimationFrame(animationRef.current!);
        }
    }
  };
  
  const toggleInstMode = () => {
    const newState = !isInstMode;
    setIsInstMode(newState);
    update('gain', newState ? Math.min(params.gain * 1.5, 3) : params.gain / 1.5);
  };
  
  const toggleAirMode = () => {
    const newState = !isAirMode;
    setIsAirMode(newState);
    update('eqHigh', newState ? params.eqHigh + 4 : params.eqHigh - 4);
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

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += Math.abs(dataArray[i] - 128);
      const avg = sum / bufferLength;
      
      // Only show signal if mic is actually active
      if (isRecording || isMonitorOn) {
         setIsSignalPresent(avg > 2);
         setIsClipping(avg > 100);
      } else {
         setIsSignalPresent(false);
         setIsClipping(false);
      }

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isRecording ? '#ef4444' : '#eab308';
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  // Toggle Record - STRICT MIC CONTROL
  const toggleRecord = async () => {
    if (isRecording) {
      // STOP RECORDING
      const blob = await engine.current?.stopRecording();
      if (blob) {
        setTakes(prev => [{ id: Date.now().toString(), blob, name: `Guitar Take ${takes.length + 1}`, date: new Date(), duration: 0 }, ...prev]);
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
      // START RECORDING
      await engine.current?.startMic(selectedDeviceId);
      engine.current?.updateParams(params);
      engine.current?.startRecording();
      setIsRecording(true);
      drawVisualizer();
      refreshDevices();
    }
  };

  const togglePreviewTake = (take: AudioTake, loop: boolean) => {
    if (playingTakeId === take.id) {
       if (isLooping === loop) {
         engine.current?.stopPreview(); setPlayingTakeId(null); setIsLooping(false);
         cancelAnimationFrame(animationRef.current!);
       } else {
         engine.current?.playRaw(take.blob, () => { setPlayingTakeId(null); setIsLooping(false); cancelAnimationFrame(animationRef.current!); }, loop);
         setPlayingTakeId(take.id); setIsLooping(loop);
         drawVisualizer();
       }
    } else {
      engine.current?.playRaw(take.blob, () => { setPlayingTakeId(null); setIsLooping(false); cancelAnimationFrame(animationRef.current!); }, loop);
      setPlayingTakeId(take.id); setIsLooping(loop);
      drawVisualizer();
    }
  };

  const deleteTake = (id: string) => {
    if (playingTakeId === id) engine.current?.stopPreview();
    setTakes(prev => prev.filter(t => t.id !== id));
  };
  
  const downloadProcessed = async (take: AudioTake) => {
    if (!engine.current) return;
    setProcessingId(take.id);
    const processedBlob = await engine.current.exportProcessed(take.blob, params);
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a'); a.href = url; a.download = `${take.name}_FX.wav`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
    setProcessingId(null);
  };
  
  const downloadRaw = (take: AudioTake) => {
    const url = URL.createObjectURL(take.blob);
    const a = document.createElement('a'); a.href = url; a.download = `${take.name}_Raw.wav`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
  };

  const activeAmp = AMP_MODELS.find(a => a.id === (params.ampModel || 'clean')) || AMP_MODELS[0];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto w-full max-w-7xl mx-auto">
      <div className="w-full flex flex-col gap-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Input Section */}
          <div className="lg:w-1/3 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center shadow-lg"><Sliders className="text-white w-5 h-5" /></div>
              <div><h2 className="text-xl font-bold text-white tracking-tight">Instrument FX</h2><p className="text-gray-400 text-xs font-mono">DIGITAL PEDALBOARD</p></div>
            </div>
            
            <AudioInterfaceUnit 
               devices={devices} selectedDeviceId={selectedDeviceId} onDeviceChange={handleDeviceChange}
               gain={params.gain} onGainChange={(v) => update('gain', v)}
               isMonitorOn={isMonitorOn} onToggleMonitor={toggleMonitor}
               isInstMode={isInstMode} onToggleInst={toggleInstMode}
               isAirMode={isAirMode} onToggleAir={toggleAirMode}
               isSignalPresent={isSignalPresent} isClipping={isClipping}
            />

            <div className="flex-1 bg-gray-950 rounded-xl border border-gray-800 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] min-h-[140px]">
               <canvas ref={canvasRef} width={400} height={160} className="w-full h-full absolute inset-0" />
               <div className="absolute top-2 left-2 text-[9px] text-yellow-500/50 font-mono tracking-widest border border-yellow-900/50 px-1 rounded">SCOPE</div>
               {isRecording && <div className="absolute top-2 right-2 flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div><span className="text-[9px] text-red-500 font-bold tracking-widest">REC</span></div>}
            </div>
          </div>

          {/* Amp & Pedals */}
          <div className="lg:w-2/3 flex flex-col gap-4">
             
             {/* Amp Selector */}
             <div className="grid grid-cols-4 gap-2">
                {AMP_MODELS.map(amp => (
                  <div 
                    key={amp.id}
                    onClick={() => update('ampModel', amp.id)}
                    className={`cursor-pointer rounded-lg border p-2 flex flex-col items-center transition-all select-none
                      ${params.ampModel === amp.id 
                        ? `bg-gray-800 border-white/40 ring-1 ring-white/20 shadow-lg` 
                        : 'bg-gray-900 border-gray-700 opacity-60 hover:opacity-100'}
                    `}
                  >
                     <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${amp.gradient} mb-1.5 shadow-sm`} />
                     <span className={`text-[9px] font-bold uppercase tracking-wider ${params.ampModel === amp.id ? 'text-white' : 'text-gray-500'}`}>{amp.name}</span>
                  </div>
                ))}
             </div>

             {/* Amp Head */}
             <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden mb-2">
                <div className={`bg-gradient-to-r ${activeAmp.gradient} h-10 border-b border-gray-600 flex items-center justify-between px-6 transition-colors duration-500`}>
                   <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px] animate-pulse ${activeAmp.led} shadow-${activeAmp.led.split('-')[1]}-500`}></div>
                     <span className="text-xs font-black text-gray-200 tracking-[0.2em]">MF SONICFORGE</span>
                     <span className={`text-xs font-bold ${activeAmp.accent} tracking-wide transition-colors duration-300`}>{activeAmp.name.toUpperCase()}</span>
                   </div>
                   <span className="text-[9px] text-gray-400 font-mono tracking-widest uppercase hidden sm:block">{activeAmp.description}</span>
                </div>
                <div className="p-6 bg-[#1a1a1a] relative flex flex-wrap justify-between items-end px-4 md:px-10">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
                   
                   <div className="flex flex-col items-center justify-end pb-2">
                        <span className="text-gray-600 text-[10px] font-mono mb-2 uppercase tracking-widest">Pre-Amp</span>
                        <div className="w-full h-px bg-gray-700"></div>
                   </div>

                   <ControlSlider label="Drive" value={params.distortion} min={0} max={100} style="amp" onChange={v => update('distortion', v)} />
                   <div className="w-px h-16 bg-gray-700 mx-2"></div>
                   <ControlSlider label="Bass" value={params.eqLow} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqLow', v)} />
                   <ControlSlider label="Mid" value={params.eqMid} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqMid', v)} />
                   <ControlSlider label="Treble" value={params.eqHigh} min={-20} max={20} unit="dB" style="amp" onChange={v => update('eqHigh', v)} />
                </div>
             </div>

             {/* 9-Band EQ Rack */}
             <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden mb-2">
                 <div className="bg-[#222] px-4 py-1 border-b border-gray-700 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SF-EQ9 Graphic Equalizer</span>
                    <div className="flex gap-1"><div className="w-1 h-1 bg-green-500 rounded-full"></div></div>
                 </div>
                 <div className="p-4 bg-gray-900 grid grid-cols-9 gap-2">
                    <EqSlider freq="63" value={params.eq63} onChange={v => update('eq63', v)} />
                    <EqSlider freq="125" value={params.eq125} onChange={v => update('eq125', v)} />
                    <EqSlider freq="250" value={params.eq250} onChange={v => update('eq250', v)} />
                    <EqSlider freq="500" value={params.eq500} onChange={v => update('eq500', v)} />
                    <EqSlider freq="1k" value={params.eq1k} onChange={v => update('eq1k', v)} />
                    <EqSlider freq="2k" value={params.eq2k} onChange={v => update('eq2k', v)} />
                    <EqSlider freq="4k" value={params.eq4k} onChange={v => update('eq4k', v)} />
                    <EqSlider freq="8k" value={params.eq8k} onChange={v => update('eq8k', v)} />
                    <EqSlider freq="16k" value={params.eq16k} onChange={v => update('eq16k', v)} />
                 </div>
             </div>

             {/* Pedalboard Config */}
             <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Pedalboard Chain</span>
                <div className="relative group">
                    <button className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-600">
                        <Plus className="w-3 h-3" /> Add Pedal
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-xl hidden group-hover:block z-20">
                        {AVAILABLE_PEDALS.filter(p => !boardLayout.includes(p.id)).map(p => (
                            <button key={p.id} onClick={() => addPedal(p.id)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white block">
                                {p.name}
                            </button>
                        ))}
                        {AVAILABLE_PEDALS.filter(p => !boardLayout.includes(p.id)).length === 0 && <div className="px-4 py-2 text-xs text-gray-500 italic">All pedals added</div>}
                    </div>
                </div>
             </div>

             {/* Pedals Grid */}
             <div className="flex flex-wrap gap-4 p-4 bg-black/40 rounded-xl border border-gray-800 min-h-[200px] items-start">
                
                {boardLayout.map(pedalId => {
                    switch(pedalId) {
                        case 'compressor': return (
                            <Stompbox key="comp" label="Comp" color="blue" enabled={params.enableCompressor} onToggle={() => update('enableCompressor', !params.enableCompressor)} onRemove={() => removePedal('compressor')}>
                                <ControlSlider label="Sens" value={Math.abs(params.compressorThreshold)} min={0} max={60} size="sm" onChange={v => update('compressorThreshold', -v)} />
                            </Stompbox>
                        );
                        case 'supernova': return (
                            <Stompbox key="supernova" label="Supernova" color="dark-purple" enabled={params.enableSupernova} onToggle={() => update('enableSupernova', !params.enableSupernova)} onRemove={() => removePedal('supernova')}>
                                <ControlSlider label="Drive" value={params.supernovaDrive} min={0} max={100} size="sm" onChange={v => update('supernovaDrive', v)} />
                                <ControlSlider label="Tone" value={params.supernovaTone} min={0} max={100} size="sm" onChange={v => update('supernovaTone', v)} />
                                <ControlSlider label="Level" value={params.supernovaLevel} min={0} max={1} step={0.1} size="sm" onChange={v => update('supernovaLevel', v)} />
                            </Stompbox>
                        );
                        case 'overdrive': return (
                            <Stompbox key="od" label="Green Drive" color="lime" enabled={params.enableOverdrive} onToggle={() => update('enableOverdrive', !params.enableOverdrive)} onRemove={() => removePedal('overdrive')}>
                                <ControlSlider label="Drive" value={params.overdriveDrive} min={0} max={100} size="sm" onChange={v => update('overdriveDrive', v)} />
                                <ControlSlider label="Tone" value={params.overdriveTone} min={0} max={100} size="sm" onChange={v => update('overdriveTone', v)} />
                                <ControlSlider label="Level" value={params.overdriveLevel} min={0} max={1} step={0.1} size="sm" onChange={v => update('overdriveLevel', v)} />
                            </Stompbox>
                        );
                        case 'tremolo': return (
                            <Stompbox key="trem" label="Tremolo" color="yellow" enabled={params.enableTremolo} onToggle={() => update('enableTremolo', !params.enableTremolo)} onRemove={() => removePedal('tremolo')}>
                                <ControlSlider label="Rate" value={params.tremoloRate} min={0.5} max={10} step={0.1} unit="Hz" size="sm" onChange={v => update('tremoloRate', v)} />
                                <ControlSlider label="Depth" value={params.tremoloDepth} min={0} max={100} size="sm" onChange={v => update('tremoloDepth', v)} />
                            </Stompbox>
                        );
                        case 'chorus': return (
                            <Stompbox key="chorus" label="Chorus" color="purple" enabled={params.enableChorus} onToggle={() => update('enableChorus', !params.enableChorus)} onRemove={() => removePedal('chorus')}>
                                <ControlSlider label="Rate" value={params.chorusRate} min={0.1} max={5} step={0.1} size="sm" onChange={v => update('chorusRate', v)} />
                                <ControlSlider label="Depth" value={params.chorusDepth} min={0} max={100} size="sm" onChange={v => update('chorusDepth', v)} />
                            </Stompbox>
                        );
                        case 'delay': return (
                            <Stompbox key="delay" label="Delay" color="green" enabled={params.enableDelay} onToggle={() => update('enableDelay', !params.enableDelay)} onRemove={() => removePedal('delay')}>
                                <ControlSlider label="Time" value={params.delayTime} min={0} max={1} step={0.05} size="sm" onChange={v => update('delayTime', v)} />
                            </Stompbox>
                        );
                        case 'reverb': return (
                            <Stompbox key="verb" label="Reverb" color="orange" enabled={params.enableReverb} onToggle={() => update('enableReverb', !params.enableReverb)} onRemove={() => removePedal('reverb')}>
                                <ControlSlider label="Mix" value={params.reverbMix} min={0} max={1} step={0.05} size="sm" onChange={v => update('reverbMix', v)} />
                            </Stompbox>
                        );
                        default: return null;
                    }
                })}

                {boardLayout.length === 0 && (
                    <div className="w-full h-32 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-700 rounded-lg">
                        <span className="text-sm font-mono">Pedalboard Empty</span>
                        <span className="text-xs">Add pedals using the menu above</span>
                    </div>
                )}
             </div>

             {/* Presets */}
             <div className="bg-black rounded-lg border border-gray-800 p-3 flex items-center justify-between overflow-x-auto">
               <div className="flex gap-2">
                 {Object.keys(GUITAR_PRESETS).map(name => (
                   <button key={name} onClick={() => loadPreset(name)} className={`px-3 py-1 text-xs font-bold rounded border whitespace-nowrap ${activePreset === name ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{name}</button>
                 ))}
               </div>
               <button onClick={() => setParams(DEFAULT_PARAMS)} title="Reset"><RotateCcw className="w-4 h-4 text-gray-500" /></button>
             </div>
          </div>
        </div>

        {/* Recording & Session Library */}
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

           {/* Session Library List */}
           <div className="md:col-span-3 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-lg min-h-[200px]">
              <div className="bg-gray-950 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 tracking-wider">
                   <AudioLines className="w-4 h-4 text-yellow-500" /> Session Library
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
                   <div key={take.id} className={`bg-gray-800/50 hover:bg-gray-800 p-2 rounded border border-transparent hover:border-gray-700 flex items-center justify-between group transition-all ${playingTakeId === take.id ? 'border-l-4 border-l-yellow-500 bg-gray-800' : ''}`}>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1">
                           <button 
                              onClick={() => togglePreviewTake(take, false)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 
                                ${playingTakeId === take.id && !isLooping
                                  ? 'bg-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.4)]' 
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
                            className="flex items-center gap-1.5 px-3 py-1 bg-yellow-900/40 hover:bg-yellow-600 rounded text-yellow-300 hover:text-white transition-colors text-[10px] font-bold border border-yellow-800 hover:border-yellow-500" 
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

export default EffectsStudio;
