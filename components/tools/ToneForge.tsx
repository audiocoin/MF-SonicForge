
import React, { useState, useRef } from 'react';
import { ToneModeler } from '../../services/ai/ToneModeler';
import { EffectParams } from '../../types';
import { Sparkles, Loader2, ArrowRight, Save, Zap, Mic2 } from 'lucide-react';

interface ToneForgeProps {
  onApplyPreset: (params: EffectParams, name: string) => void;
}

export const ToneForge: React.FC<ToneForgeProps> = ({ onApplyPreset }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ params: EffectParams, name: string, description: string } | null>(null);
  
  const modeler = useRef(new ToneModeler());

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await modeler.current.generateRig(prompt);
      if (data) {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyTone = () => {
    if (result) {
        // Save to local storage automatically so it's available in FX Studio
        const saved = localStorage.getItem('sonicforge_user_presets');
        const presets = saved ? JSON.parse(saved) : {};
        presets[result.name] = result.params;
        localStorage.setItem('sonicforge_user_presets', JSON.stringify(presets));
        
        // Callback to notify parent (if needed for navigation)
        onApplyPreset(result.params, result.name);
    }
  };

  return (
    <div className="bg-gray-850 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-xl h-full flex flex-col items-center overflow-y-auto">
       <div className="text-center max-w-2xl mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
             <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Tone Forge AI</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Describe any amp, pedal, song, or artist tone. The AI will mathematically model the signal chain for you.
          </p>
       </div>

       <div className="w-full max-w-2xl bg-gray-900 p-2 rounded-xl border border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-8">
          <input 
             type="text" 
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             placeholder="e.g. '1965 Fender Twin Reverb', 'Metallica Master of Puppets'..."
             className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-600 outline-none w-full"
             onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full"
          >
             {loading ? <Loader2 className="animate-spin" /> : <Zap className="fill-current" />}
             {loading ? 'Modeling...' : 'Forge Tone'}
          </button>
       </div>

       {result && (
          <div className="w-full max-w-2xl bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4">
             <div className="bg-indigo-900/30 p-4 border-b border-indigo-500/30 flex justify-between items-center">
                 <div className="overflow-hidden">
                    <h3 className="text-xl font-bold text-white truncate">{result.name}</h3>
                    <p className="text-indigo-300 text-sm truncate">{result.description}</p>
                 </div>
                 <button 
                    onClick={applyTone}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all shrink-0 ml-2"
                 >
                    <Save className="w-4 h-4" /> Save
                 </button>
             </div>
             
             <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                 {/* Visual Summary of the generated rig */}
                 <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Amp Model</span>
                    <div className="w-full h-1 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-2"></div>
                    <span className="text-white font-mono font-bold capitalize text-sm">{result.params.ampModel}</span>
                 </div>

                 <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Gain / Drive</span>
                    <div className="flex items-end gap-1 h-8">
                       <div className="w-2 bg-red-500 rounded-t" style={{ height: `${result.params.distortion}%` }}></div>
                       <div className="w-2 bg-yellow-500 rounded-t" style={{ height: `${result.params.overdriveDrive || 0}%` }}></div>
                    </div>
                 </div>

                 <div className="col-span-2 bg-gray-900 p-3 rounded border border-gray-700">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Active Signal Chain</span>
                    <div className="flex flex-wrap gap-2">
                       {result.params.enableCompressor && <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded border border-blue-800">Comp</span>}
                       {result.params.enableSupernova && <span className="px-2 py-1 bg-purple-900/50 text-purple-400 text-xs rounded border border-purple-800">Fuzz</span>}
                       {result.params.enableOverdrive && <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded border border-green-800">Drive</span>}
                       <span className="px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600">AMP</span>
                       {result.params.enableChorus && <span className="px-2 py-1 bg-indigo-900/50 text-indigo-400 text-xs rounded border border-indigo-800">Chorus</span>}
                       {result.params.enableDelay && <span className="px-2 py-1 bg-teal-900/50 text-teal-400 text-xs rounded border border-teal-800">Delay</span>}
                       {result.params.enableReverb && <span className="px-2 py-1 bg-orange-900/50 text-orange-400 text-xs rounded border border-orange-800">Reverb</span>}
                    </div>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
};
