
import React, { useState } from 'react';
import Tuner from './components/Tuner';
import EffectsStudio from './components/EffectsStudio';
import AiTools from './components/AiTools';
import DrumMachine from './components/DrumMachine';
import ChordLibrary from './components/ChordLibrary';
import VoiceStudio from './components/VoiceStudio';
import Academy from './components/Academy';
import { Metronome } from './components/Metronome';
import { AppMode } from './types';
import { Mic2, Sliders, Bot, Menu, X, Waves, Drum, Grid, Mic, GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TUNER);
  const [menuOpen, setMenuOpen] = useState(false);
  const [academyStartQuery, setAcademyStartQuery] = useState('');

  const handleNavClick = (m: AppMode) => {
    setMode(m);
    setMenuOpen(false);
    if (m !== AppMode.ACADEMY) {
      setAcademyStartQuery('');
    }
  };

  const handleNavigateToAcademy = (query: string) => {
    setAcademyStartQuery(query);
    setMode(AppMode.ACADEMY);
  };

  const NavItem = ({ m, icon: Icon, label }: { m: AppMode; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => handleNavClick(m)}
      className={`w-full flex items-center gap-4 px-6 py-3 transition-colors border-l-4 text-sm font-medium
        ${mode === m 
          ? 'bg-gray-800 border-primary-500 text-white' 
          : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
    >
      <Icon className={`w-4 h-4 ${mode === m ? 'text-primary-400' : ''}`} />
      <span className="tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-gray-950 overflow-hidden font-sans selection:bg-primary-500/30">
      
      {/* Global Metronome Overlay */}
      <Metronome />

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <Waves className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">MF SonicForge</h1>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          <div className="px-6 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest">Core</div>
          <NavItem m={AppMode.TUNER} icon={Mic2} label="Tuner" />
          <NavItem m={AppMode.EFFECTS} icon={Sliders} label="FX Studio" />
          
          <div className="px-6 py-2 mt-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Smart Tools</div>
          <NavItem m={AppMode.AI_TOOLS} icon={Bot} label="AI Tools" />
          <NavItem m={AppMode.ACADEMY} icon={GraduationCap} label="Academy" />
          
          <div className="px-6 py-2 mt-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Utilities</div>
          <NavItem m={AppMode.DRUM_MACHINE} icon={Drum} label="Drum Machine" />
          <NavItem m={AppMode.CHORD_LIBRARY} icon={Grid} label="Chord Library" />
          <NavItem m={AppMode.VOICE_STUDIO} icon={Mic} label="Voice FX" />
        </nav>
        
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-800 bg-gray-900">
           <div className="text-xs text-gray-500">
             <p>Powered by Gemini 2.5 Flash</p>
             <p className="mt-1">v1.2.1</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <button onClick={() => setMenuOpen(true)} className="text-white p-2">
            <Menu />
          </button>
          <span className="font-bold text-white text-sm truncate max-w-[200px]">
            {mode === AppMode.TUNER && 'Chromatic Tuner'}
            {mode === AppMode.EFFECTS && 'FX Studio'}
            {mode === AppMode.AI_TOOLS && 'AI Music Tools'}
            {mode === AppMode.ACADEMY && 'MF SonicForge Academy'}
            {mode === AppMode.DRUM_MACHINE && 'Drum Machine'}
            {mode === AppMode.CHORD_LIBRARY && 'Chord Library'}
            {mode === AppMode.VOICE_STUDIO && 'Voice Studio'}
          </span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Dynamic View */}
        <div className="flex-1 overflow-y-auto bg-grid-pattern relative">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 to-gray-900 -z-10" />
          
          {mode === AppMode.TUNER && <Tuner />}
          {mode === AppMode.EFFECTS && <EffectsStudio />}
          {mode === AppMode.AI_TOOLS && <AiTools onNavigateToAcademy={handleNavigateToAcademy} />}
          {mode === AppMode.ACADEMY && <Academy initialQuery={academyStartQuery} />}
          {mode === AppMode.DRUM_MACHINE && <DrumMachine />}
          {mode === AppMode.CHORD_LIBRARY && <ChordLibrary />}
          {mode === AppMode.VOICE_STUDIO && <VoiceStudio />}
        </div>
      </main>
    </div>
  );
};

export default App;
