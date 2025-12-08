
import React, { useRef } from 'react';
import { X, AlertTriangle, ExternalLink, Settings, Upload } from 'lucide-react';

export const ApiKeyWarning: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center h-full max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border-4 border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
      <AlertTriangle className="w-10 h-10 text-yellow-500" />
    </div>
    <h2 className="text-3xl font-bold text-white mb-4">AI Features Locked</h2>
    <p className="text-gray-400 mb-8 text-lg">
      To use the AI Jam Session, Tab Generator, and Chord Library, you need to configure your Google Gemini API Key.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" /> Local Development
        </h3>
        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
          <li>Create a file named <code className="bg-gray-950 px-1 py-0.5 rounded text-yellow-500">.env</code> in the project root.</li>
          <li>Add this line: <code className="block bg-gray-950 p-2 rounded mt-1 text-gray-300 select-all">GEMINI_API_KEY=your_key_here</code></li>
          <li>Restart the dev server.</li>
        </ol>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-purple-400" /> Vercel Deployment
        </h3>
        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
          <li>Go to your Vercel Project Dashboard.</li>
          <li>Navigate to <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
          <li>Add Key: <code className="text-yellow-500">GEMINI_API_KEY</code></li>
          <li>Paste your key as the Value and Save.</li>
          <li>Redeploy your project.</li>
        </ol>
      </div>
    </div>

    <a 
      href="https://aistudio.google.com/app/apikey" 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
    >
      Get Free Gemini API Key <ExternalLink className="w-4 h-4" />
    </a>
  </div>
);

// --- CONTROL SLIDER (Vertical Fader) ---
export const ControlSlider: React.FC<{ 
  label?: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number; 
  unit?: string;
  style?: 'amp' | 'pedal' | 'interface';
  size?: 'sm' | 'md' | 'lg';
  onChange: (v: number) => void 
}> = ({ label, value, min, max, step = 1, unit = '', style = 'pedal', size = 'md', onChange }) => {
  
  const percent = ((value - min) / (max - min)) * 100;
  
  // Sizing based on style and size prop
  let heightClass = 'h-24';
  if (style === 'amp') heightClass = 'h-40'; // Taller to match EQ feel
  if (size === 'sm') heightClass = 'h-20';

  const widthClass = 'w-10';
  
  // Amp style now mimics the EqSlider (Pro Fader)
  const trackColor = style === 'amp' 
    ? 'bg-black shadow-[inset_0_1px_4px_rgba(0,0,0,1)]' 
    : (style === 'interface' ? 'bg-black/40' : 'bg-black/40');
    
  const thumbColor = style === 'amp' 
    ? 'bg-gray-300 border border-gray-500 shadow-sm' 
    : (style === 'interface' ? 'bg-red-500' : 'bg-gray-300');

  // Hide fill level for amp style to act like a physical fader (like EqSlider)
  const showFill = style !== 'amp';

  return (
    <div className="flex flex-col items-center gap-2 select-none group">
      <div className={`relative ${heightClass} ${widthClass} flex justify-center`}>
        {/* Track Background */}
        <div className={`absolute top-0 bottom-0 w-1.5 ${trackColor} rounded-full`}>
           {/* Center mark for Amp/EQ style feels */}
           {style === 'amp' && <div className="absolute top-1/2 left-0 w-full h-px bg-gray-700"></div>}
           
           {/* Tick marks (Generic) */}
           {style !== 'amp' && (
             <>
               <div className="absolute top-[10%] left-2 w-1 h-px bg-gray-600/50"></div>
               <div className="absolute top-[50%] left-2 w-2 h-px bg-gray-600/50"></div>
               <div className="absolute bottom-[10%] left-2 w-1 h-px bg-gray-600/50"></div>
             </>
           )}
        </div>

        {/* Fill Level (Hidden for Amp) */}
        {showFill && (
          <div 
              className="absolute bottom-0 w-1.5 rounded-b-full bg-current opacity-30 pointer-events-none"
              style={{ height: `${percent}%`, color: style === 'interface' ? '#ef4444' : '#fff' }}
          />
        )}

        {/* Input: Rotated -90deg to make vertical slider */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-[150%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 opacity-0 cursor-ns-resize z-20 touch-none h-10"
          title={`${label}: ${value}${unit}`}
        />

        {/* Thumb Visual */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-6 h-3 rounded shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10 pointer-events-none
            ${thumbColor} flex items-center justify-center`}
          style={{ bottom: `calc(${percent}% - 6px)` }}
        >
          <div className="w-full h-px bg-black/20"></div>
        </div>
      </div>

      {label && (
        <div className="text-center">
          <div className={`font-bold uppercase tracking-wider 
            ${style === 'amp' ? 'text-[10px] text-gray-400' : 
              style === 'interface' ? 'text-[9px] text-gray-400' : 'text-[9px] text-gray-400'}`}>
            {label}
          </div>
          {style === 'amp' && <div className="text-[9px] font-mono text-gray-500">{Math.round(value * 10) / 10}{unit}</div>}
        </div>
      )}
    </div>
  );
};

// --- KNOB COMPONENT ---
export const Knob: React.FC<{
  value: number;
  min: number;
  max: number;
  size?: number;
  color?: string;
  onChange: (v: number) => void;
  title?: string;
}> = ({ value, min, max, size = 40, color = '#3b82f6', onChange, title }) => {
  const rotation = ((value - min) / (max - min)) * 270 - 135; // -135 to +135 deg

  const handleDrag = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startVal = value;
    const range = max - min;
    
    const move = (ev: MouseEvent) => {
       const delta = startY - ev.clientY;
       const change = (delta / 100) * range; // 100px for full range
       let newVal = Math.min(max, Math.max(min, startVal + change));
       onChange(newVal);
    };
    const up = () => {
       window.removeEventListener('mousemove', move);
       window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className="rounded-full bg-gray-800 border border-gray-600 relative cursor-ns-resize shadow-md"
        style={{ width: size, height: size }}
        onMouseDown={handleDrag}
        title={title}
      >
         <div 
           className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none"
           style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
         >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]" style={{ backgroundColor: color }}></div>
         </div>
      </div>
      {title && <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">{title}</span>}
    </div>
  );
};

// --- EQ SLIDER (Specialized for Graphic EQs) ---
export const EqSlider: React.FC<{ freq: string; value: number; onChange: (v: number) => void }> = ({ freq, value, onChange }) => (
    <div className="flex flex-col items-center h-44 gap-2 w-10 flex-shrink-0">
        <div className="relative flex-1 w-full flex justify-center">
            {/* Track Visual */}
            <div className="absolute inset-y-0 w-1.5 bg-black rounded-full shadow-[inset_0_1px_4px_rgba(0,0,0,1)] pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gray-700"></div>
                {/* Thumb Visual */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 w-6 h-3 bg-gray-300 rounded border border-gray-500 shadow z-10"
                    style={{ bottom: `${((value + 12) / 24) * 100}%`, marginBottom: '-6px' }}
                >
                    <div className="w-full h-px bg-black mt-1.5 opacity-50"></div>
                </div>
            </div>
            
            {/* Input - Rotated -90deg so Drag Up = Increase Value */}
            <input 
                type="range" min={-12} max={12} step={0.5} 
                value={value} onChange={e => onChange(Number(e.target.value))}
                className="absolute w-[160px] h-10 opacity-0 cursor-pointer touch-none z-20 top-1/2 left-1/2"
                style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
            />
        </div>
        <span className="text-[9px] font-mono text-gray-400">{freq}</span>
    </div>
);

// --- STOMPBOX (Pedal) ---
export const Stompbox: React.FC<{ 
    label: string; 
    color: string; 
    enabled: boolean; 
    onToggle: () => void; 
    onRemove?: () => void;
    children: React.ReactNode 
}> = ({ label, color, enabled, onToggle, onRemove, children }) => {
  const getLedColor = () => {
    if (!enabled) return 'bg-red-900/50';
    const map: any = { 
        blue: 'bg-blue-500 shadow-blue-500', 
        purple: 'bg-purple-500 shadow-purple-500', 
        green: 'bg-emerald-500 shadow-emerald-500', 
        orange: 'bg-orange-500 shadow-orange-500', 
        yellow: 'bg-yellow-500 shadow-yellow-500', 
        'dark-purple': 'bg-purple-600 shadow-purple-600', 
        lime: 'bg-lime-500 shadow-lime-500' 
    };
    return `${map[color] || 'bg-gray-500'} shadow-[0_0_10px]`;
  };
  
  const getStyles = () => {
      const map: any = { 
          'dark-purple': 'bg-purple-900 border-purple-800', 
          blue: 'bg-blue-900/40 border-blue-900',
          green: 'bg-emerald-900/40 border-emerald-900',
          orange: 'bg-orange-900/40 border-orange-900',
          lime: 'bg-lime-900/40 border-lime-800',
          yellow: 'bg-yellow-900/40 border-yellow-800',
          purple: 'bg-purple-900/40 border-purple-800'
      };
      return map[color] || 'bg-gray-800 border-gray-900';
  };

  return (
    <div className={`${getStyles()} rounded-lg border-b-4 shadow-xl flex flex-col relative overflow-hidden transition-transform active:scale-[0.99] ${enabled ? 'border-gray-700' : ''}`}>
      <div className="bg-black/20 p-2 text-center border-b border-white/5 flex justify-between items-center group">
         <div className="w-4"></div>
         <span className={`text-xs font-black uppercase tracking-widest ${enabled ? 'text-gray-200' : 'text-gray-500'}`}>{label}</span>
         {onRemove ? (
             <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-gray-500 hover:text-red-500 transition-colors w-4"><X className="w-3 h-3" /></button>
         ) : <div className="w-4" />}
      </div>
      <div className={`p-4 flex justify-center gap-3 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 grayscale'}`}>{children}</div>
      <div className="mt-auto p-4 bg-black/30 flex flex-col items-center justify-center gap-3 border-t border-white/5">
        <div className={`w-3 h-3 rounded-full transition-all duration-100 ${getLedColor()}`} />
        <button onClick={onToggle} className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 border-b-4 border-gray-600 shadow-lg active:border-b-0 active:translate-y-1 outline-none touch-none ring-offset-2 ring-offset-gray-900 focus:ring-2 ring-white/20"><div className="w-full h-full rounded-full border border-white/30" /></button>
      </div>
    </div>
  );
};

// --- AUDIO INTERFACE MODEL ---
export const AudioInterfaceUnit: React.FC<{
  devices: MediaDeviceInfo[]; selectedDeviceId: string; onDeviceChange: (id: string) => void;
  gain: number; onGainChange: (val: number) => void;
  isMonitorOn: boolean; onToggleMonitor: () => void;
  isInstMode: boolean; onToggleInst: () => void;
  isAirMode: boolean; onToggleAir: () => void;
  isSignalPresent: boolean; isClipping: boolean;
}> = ({ devices, selectedDeviceId, onDeviceChange, gain, onGainChange, isMonitorOn, onToggleMonitor, isInstMode, onToggleInst, isAirMode, onToggleAir, isSignalPresent, isClipping }) => {
  return (
    <div className="w-full bg-[#991b1b] rounded-lg shadow-2xl overflow-hidden border border-[#7f1d1d] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10" />
      <div className="flex flex-col sm:flex-row h-full">
        {/* Main Controls Panel */}
        <div className="bg-[#0a0a0a] flex-1 flex flex-col sm:flex-row items-center sm:justify-between gap-4 px-4 py-4 md:py-6 border-r border-[#333]">
          
          {/* Input Gain Section */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <div className="relative w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center shadow-inner shrink-0">
               <div className="w-8 h-8 rounded-full border border-[#444] flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full" /></div>
               <div className="absolute -bottom-4 text-[9px] text-gray-500 font-bold whitespace-nowrap">INPUT 1</div>
            </div>
            
            <div className="relative shrink-0">
               <div className={`absolute -right-3 top-0 bottom-0 w-1 rounded-full transition-colors duration-100 ${isClipping ? 'bg-red-500 shadow-[0_0_8px_red]' : isSignalPresent ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-gray-800'}`} />
               <ControlSlider value={gain} min={0} max={3} step={0.1} onChange={onGainChange} style="interface" label="GAIN" />
            </div>

            <div className="flex flex-col gap-2 shrink-0">
               <button onClick={onToggleInst} className={`px-2 py-1 text-[9px] font-bold border rounded transition-all flex items-center gap-1 ${isInstMode ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-[#1a1a1a] border-[#333] text-gray-500'}`}>INST <div className={`w-1 h-1 rounded-full ${isInstMode ? 'bg-red-500' : 'bg-gray-800'}`} /></button>
               <button onClick={onToggleAir} className={`px-2 py-1 text-[9px] font-bold border rounded transition-all flex items-center gap-1 ${isAirMode ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-[#1a1a1a] border-[#333] text-gray-500'}`}>AIR <div className={`w-1 h-1 rounded-full ${isAirMode ? 'bg-yellow-500' : 'bg-gray-800'}`} /></button>
            </div>
          </div>

          {/* Monitor Section */}
          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-[#222] pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-center">
             <div className="flex flex-col items-center gap-2">
                <button onClick={onToggleMonitor} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-lg active:translate-y-px ${isMonitorOn ? 'bg-gray-800 border-white/80' : 'bg-[#1a1a1a] border-[#333]'}`}><div className={`w-1.5 h-1.5 bg-white rounded-full ${isMonitorOn ? 'opacity-100' : 'opacity-0'}`} /></button>
                <span className="text-[9px] text-gray-400 font-bold tracking-tight">DIRECT</span>
             </div>
             <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#111] border border-[#333] shadow-xl flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#222] to-black border border-[#444]" /></div>
             </div>
          </div>
        </div>
        
        {/* Output/Branding Section */}
        <div className="bg-[#991b1b] p-4 flex flex-col justify-center gap-2 w-full sm:w-auto sm:min-w-[140px] border-t sm:border-t-0 sm:border-l border-[#7f1d1d]">
           <div className="flex items-center gap-1 text-white/80"><span className="text-[10px] font-bold tracking-widest uppercase">Scarlett</span></div>
           <select value={selectedDeviceId} onChange={(e) => onDeviceChange(e.target.value)} className="bg-black/30 text-white text-[10px] rounded border border-white/10 px-2 py-1 outline-none w-full">
             {devices.length === 0 && <option value="">Default Input</option>}
             {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Input...`}</option>)}
           </select>
        </div>
      </div>
    </div>
  );
};

// --- IR LOADER ---
export const IrLoader: React.FC<{
    currentModel: string;
    onLoad: (file: File) => void;
    onSelectModel: (model: string) => void;
}> = ({ currentModel, onLoad, onSelectModel }) => {
    const fileInput = useRef<HTMLInputElement>(null);
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 flex flex-col gap-2">
           <div className="flex justify-between items-center px-1">
               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cabinet Pro</span>
               <div className="flex gap-1">
                   <button onClick={() => onSelectModel('bypass')} className={`px-2 py-0.5 text-[9px] rounded border ${currentModel === 'bypass' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-800 border-gray-800 text-gray-600'}`}>OFF</button>
                   <button onClick={() => onSelectModel('modern-4x12')} className={`px-2 py-0.5 text-[9px] rounded border ${currentModel === 'modern-4x12' ? 'bg-primary-900/50 border-primary-500 text-primary-400' : 'bg-gray-800 border-gray-800 text-gray-600'}`}>4x12</button>
                   <button onClick={() => onSelectModel('vintage-1x12')} className={`px-2 py-0.5 text-[9px] rounded border ${currentModel === 'vintage-1x12' ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-gray-800 border-gray-800 text-gray-600'}`}>1x12</button>
               </div>
           </div>
           
           <div 
             onClick={() => fileInput.current?.click()}
             className={`border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors
             ${currentModel === 'custom' ? 'border-green-500 bg-green-500/5' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800'}`}
           >
              <input 
                 type="file" 
                 accept=".wav" 
                 ref={fileInput} 
                 className="hidden" 
                 onChange={(e) => {
                     if (e.target.files?.[0]) {
                         onLoad(e.target.files[0]);
                         onSelectModel('custom');
                     }
                 }} 
              />
              <Upload className={`w-4 h-4 mb-1 ${currentModel === 'custom' ? 'text-green-500' : 'text-gray-400'}`} />
              <span className={`text-[9px] font-bold ${currentModel === 'custom' ? 'text-green-500' : 'text-gray-500'}`}>
                  {currentModel === 'custom' ? 'CUSTOM IR ACTIVE' : 'LOAD IR (.wav)'}
              </span>
           </div>
        </div>
    );
};
