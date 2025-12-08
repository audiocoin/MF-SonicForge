
import React, { useState, useRef, useEffect } from 'react';
import { TabEngine, TabInstrumentMode } from '../services/tabEngine';
import { TabResult, EffectParams } from '../types';
import { FretboardVisualizer } from './tools/FretboardVisualizer';
import { TabSearch } from './tools/TabSearch';
import { AudioToTab } from './tools/AudioToTab';
import { SongIdentifier } from './tools/SongIdentifier';
import { TabLibrary } from './tools/TabLibrary';
import { ToneForge } from './tools/ToneForge';
import { ApiKeyWarning } from './SharedAudioUI';
import { FileText, Music, FileAudio, Library, Play, Square, Save, Info, GraduationCap, Zap } from 'lucide-react';

interface AiToolsProps {
  onNavigateToAcademy: (query: string) => void;
}

const AiTools: React.FC<AiToolsProps> = ({ onNavigateToAcademy }) => {
  const [activeTab, setActiveTab] = useState<'tabs' | 'detect' | 'library' | 'transcribe' | 'toneforge'>('tabs');
  const [tabResult, setTabResult] = useState<TabResult | null>(null);
  
  // Playback State
  const [isPlayingTab, setIsPlayingTab] = useState(false);
  const [visualizerTime, setVisualizerTime] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1.0);
  const [instMode, setInstMode] = useState<TabInstrumentMode>('clean');
  const [capo, setCapo] = useState(0);
  const [tuningName, setTuningName] = useState('Standard');
  
  const hasApiKey = !!process.env.API_KEY;

  const tabPlayerRef = useRef<TabEngine | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    return () => stopTabPlayback();
  }, [activeTab]);

  const handleTabLoaded = (result: TabResult) => {
    setTabResult(result);
    if (result.tuningName) setTuningName(result.tuningName);
    setActiveTab('tabs');
  };
  
  const handleToneApply = (params: EffectParams, name: string) => {
      // Logic handled in ToneForge component (saves to localStorage). 
      // We could add a toast or notification here.
      alert(`Tone "${name}" saved to FX Studio presets!`);
  };

  const getTuningOffsets = (name: string): number[] => {
      switch(name) {
          case 'Drop D': return [-2, 0, 0, 0, 0, 0];
          case 'Eb Standard': return [-1, -1, -1, -1, -1, -1];
          case 'D Standard': return [-2, -2, -2, -2, -2, -2];
          case 'Open G': return [-2, -2, 0, 0, 0, -2];
          default: return [0, 0, 0, 0, 0, 0];
      }
  };

  const playTab = () => {
    if (!tabResult) return;
    if (tabPlayerRef.current) tabPlayerRef.current.stop();

    const bpm = (tabResult.bpm || 100) * playSpeed;
    tabPlayerRef.current = new TabEngine(bpm, tabResult.playableData);
    
    tabPlayerRef.current.setInstrumentMode(instMode);
    tabPlayerRef.current.setCapo(capo);
    tabPlayerRef.current.setTuning(getTuningOffsets(tuningName));
    
    const startTime = Date.now(); 
    
    tabPlayerRef.current.play().then(() => {
        setIsPlayingTab(true);
        const loop = () => {
            if (!tabPlayerRef.current) return;
            const audioTime = tabPlayerRef.current.getCurrentTime() - (tabPlayerRef.current.startTime || 0);
            setVisualizerTime(Math.max(0, audioTime));

            if (scrollContainerRef.current) {
                const duration = tabResult.playableData.reduce((max, note) => Math.max(max, note.beat + note.duration), 0);
                const totalSeconds = (duration * 60) / bpm;
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / totalSeconds, 1);
                scrollContainerRef.current.scrollTop = progress * scrollContainerRef.current.scrollHeight;
                if (progress >= 1) {
                    setIsPlayingTab(false);
                    return; 
                }
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
    });
  };

  const stopTabPlayback = () => {
    if (tabPlayerRef.current) {
        tabPlayerRef.current.stop();
        tabPlayerRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsPlayingTab(false);
    setVisualizerTime(0);
  };

  const saveCurrentTab = () => {
    if (!tabResult) return;
    const stored = localStorage.getItem('sonicforge_saved_tabs');
    const tabs = stored ? JSON.parse(stored) : [];
    if (!tabs.some((t: TabResult) => t.song === tabResult.song && t.artist === tabResult.artist)) {
        tabs.push(tabResult);
        localStorage.setItem('sonicforge_saved_tabs', JSON.stringify(tabs));
    }
  };

  if (!hasApiKey && (activeTab as string) !== 'library') {
      return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex overflow-x-auto pb-4 mb-6 gap-3 snap-x no-scrollbar md:justify-center md:flex-wrap -mx-4 px-4 md:mx-0 md:px-0">
                <button onClick={() => setActiveTab('tabs')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'tabs' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'}`}><FileText className="w-5 h-5" /> Tab Finder</button>
                <button onClick={() => setActiveTab('library')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'library' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}><Library className="w-5 h-5" /> Library</button>
            </div>
            <div className="flex-1">
                <ApiKeyWarning />
            </div>
        </div>
      );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto h-full animate-in fade-in duration-500 overflow-y-auto w-full">
      {/* Scrollable Navigation on Mobile */}
      <div className="flex overflow-x-auto pb-2 mb-6 gap-3 snap-x no-scrollbar md:justify-center md:flex-wrap -mx-4 px-4 md:mx-0 md:px-0">
        <button onClick={() => setActiveTab('tabs')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'tabs' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <FileText className="w-5 h-5" /> Tab Finder
        </button>
        <button onClick={() => setActiveTab('transcribe')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'transcribe' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <FileAudio className="w-5 h-5" /> Audio-to-Tab
        </button>
        <button onClick={() => setActiveTab('toneforge')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'toneforge' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Zap className="w-5 h-5" /> Tone Forge
        </button>
        <button onClick={() => setActiveTab('detect')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'detect' ? 'bg-accent-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Music className="w-5 h-5" /> Identify Song
        </button>
        <button onClick={() => setActiveTab('library')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'library' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Library className="w-5 h-5" /> Library
        </button>
      </div>

      {/* Render Sub-Components based on Mode */}
      {activeTab === 'tabs' && (
          <div className="space-y-6">
              <TabSearch onResult={handleTabLoaded} />
              
              {/* Player Area if result exists */}
              {tabResult && (
                 <div className="animate-in fade-in slide-in-from-bottom-4">
                    {/* Metadata Card */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="text-primary-400 w-4 h-4" />
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">AI Analysis</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                    <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                        <span className="text-[10px] text-gray-500 block uppercase">Key</span>
                                        <span className="text-white font-bold text-sm">{tabResult.key || 'Unknown'}</span>
                                    </div>
                                    <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                        <span className="text-[10px] text-gray-500 block uppercase">Scale</span>
                                        <span className="text-white font-bold text-sm truncate">{tabResult.scale || 'Unknown'}</span>
                                    </div>
                                    <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                        <span className="text-[10px] text-gray-500 block uppercase">Difficulty</span>
                                        <span className={`font-bold text-sm ${tabResult.difficulty === 'Advanced' ? 'text-red-400' : 'text-green-400'}`}>{tabResult.difficulty || 'Intermediate'}</span>
                                    </div>
                                    <div className="bg-gray-950 p-2 rounded border border-gray-800">
                                        <span className="text-[10px] text-gray-500 block uppercase">Tuning</span>
                                        <span className="text-white font-bold text-sm truncate">{tabResult.tuningName || 'Standard'}</span>
                                    </div>
                                </div>
                        </div>
                        {tabResult.performanceNotes && (
                            <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6">
                                <div className="flex items-center gap-2 mb-2">
                                        <GraduationCap className="text-yellow-400 w-4 h-4" />
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Performance Coach</h4>
                                </div>
                                <p className="text-sm text-gray-300 italic">"{tabResult.performanceNotes}"</p>
                            </div>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                        <div className="w-full md:w-auto">
                            <h3 className="text-xl font-bold text-white truncate">{tabResult.song}</h3>
                            <p className="text-gray-400 text-sm truncate">{tabResult.artist}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 shadow-lg w-full md:w-auto">
                            <button onClick={isPlayingTab ? stopTabPlayback : playTab} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shrink-0 ${isPlayingTab ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                {isPlayingTab ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                            </button>
                            <div className="h-8 w-px bg-gray-600 mx-1 hidden sm:block" />
                            <div className="flex flex-col items-center flex-1 sm:flex-none">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Speed</span>
                                <select value={playSpeed} onChange={(e) => setPlaySpeed(Number(e.target.value))} className="bg-transparent text-xs text-white border rounded border-gray-600 px-1 py-0.5 w-full">
                                <option value="0.5">0.5x</option><option value="1.0">1.0x</option><option value="1.25">1.25x</option>
                                </select>
                            </div>
                            <div className="flex flex-col items-center flex-1 sm:flex-none">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Capo</span>
                                <input type="number" min="0" max="12" value={capo} onChange={(e) => setCapo(Number(e.target.value))} className="w-10 bg-transparent text-center text-xs text-white border rounded border-gray-600 px-1 py-0.5" />
                            </div>
                            <div className="flex flex-col items-center flex-1 sm:flex-none">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Sound</span>
                                <select value={instMode} onChange={(e) => setInstMode(e.target.value as TabInstrumentMode)} className="bg-transparent text-xs text-white border rounded border-gray-600 px-1 py-0.5 w-full">
                                <option value="clean">Clean</option><option value="distorted">Distorted</option><option value="acoustic">Acoustic</option>
                                </select>
                            </div>
                            <button onClick={saveCurrentTab} className="p-2 text-gray-400 hover:text-white rounded" title="Save"><Save className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <FretboardVisualizer notes={tabResult.playableData} currentTime={visualizerTime} bpm={(tabResult.bpm || 100) * playSpeed} />
                    
                    <div className="relative">
                        <div className="absolute top-0 right-0 bg-gray-800 text-[10px] text-gray-400 px-2 py-1 rounded-bl-lg border-b border-l border-gray-700 font-mono z-10">Original Tab</div>
                        <div ref={scrollContainerRef} className="bg-gray-950 p-4 rounded-lg overflow-y-auto border border-gray-800 max-h-[400px] relative scroll-smooth shadow-inner">
                            <pre className="font-mono text-xs md:text-sm text-green-400 whitespace-pre leading-relaxed opacity-90">{tabResult.tabs}</pre>
                            {isPlayingTab && <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />}
                        </div>
                    </div>
                 </div>
              )}
          </div>
      )}

      {activeTab === 'toneforge' && <ToneForge onApplyPreset={handleToneApply} />}
      {activeTab === 'transcribe' && <AudioToTab onResult={handleTabLoaded} />}
      {activeTab === 'detect' && <SongIdentifier onNavigateToAcademy={onNavigateToAcademy} />}
      {activeTab === 'library' && <TabLibrary onSelect={handleTabLoaded} />}
    </div>
  );
};

export default AiTools;
