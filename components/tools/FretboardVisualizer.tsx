
import React from 'react';
import { PlayableTabNote } from '../../types';

interface FretboardVisualizerProps {
  notes: PlayableTabNote[];
  currentTime: number;
  bpm: number;
}

export const FretboardVisualizer: React.FC<FretboardVisualizerProps> = ({ notes, currentTime, bpm }) => {
  const LOOKAHEAD = 2.5; 
  const secondsPerBeat = 60.0 / bpm;

  const STRING_COLORS: Record<number, string> = {
    6: 'bg-red-500 shadow-[0_0_15px_#ef4444] border-red-300',
    5: 'bg-yellow-500 shadow-[0_0_15px_#eab308] border-yellow-300',
    4: 'bg-blue-500 shadow-[0_0_15px_#3b82f6] border-blue-300',
    3: 'bg-orange-500 shadow-[0_0_15px_#f97316] border-orange-300',
    2: 'bg-green-500 shadow-[0_0_15px_#22c55e] border-green-300',
    1: 'bg-purple-500 shadow-[0_0_15px_#a855f7] border-purple-300'
  };

  const getLaneColor = (stringIdx: number) => {
     switch(stringIdx) {
         case 6: return 'border-red-900/50';
         case 5: return 'border-yellow-900/50';
         case 4: return 'border-blue-900/50';
         case 3: return 'border-orange-900/50';
         case 2: return 'border-green-900/50';
         case 1: return 'border-purple-900/50';
         default: return 'border-gray-700';
     }
  };

  const visibleNotes = notes.filter(n => {
    const noteTime = n.beat * secondsPerBeat;
    return noteTime >= currentTime - 0.2 && noteTime <= currentTime + LOOKAHEAD;
  });

  return (
    <div className="w-full h-80 bg-gray-950 relative rounded-xl border-4 border-gray-900 shadow-2xl overflow-hidden mb-4 select-none perspective-container">
       <style>{`
         .perspective-container {
            perspective: 600px;
            perspective-origin: center;
         }
       `}</style>
       <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-[#1a100c] pointer-events-none"></div>
       <div 
         className="absolute left-1/2 bottom-0 w-full md:w-[80%] h-[120%] bg-gray-900/80 border-x-8 border-gray-800"
         style={{
            transform: 'translateX(-50%) rotateX(60deg)',
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 100%'
         }}
       >
          <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_bottom,#444_1px,transparent_1px)] bg-[size:100%_20%]"></div>
          <div className="absolute inset-0 flex">
             {[6,5,4,3,2,1].map((stringNum) => (
               <div key={stringNum} className={`flex-1 border-r ${getLaneColor(stringNum)} relative first:border-l flex justify-center`}>
                  <div className={`w-1 h-full bg-white/10 ${currentTime > 0 ? 'shadow-[0_0_10px_rgba(255,255,255,0.1)]' : ''}`}></div>
                  <div className="absolute bottom-[10%] w-full h-2 bg-white/20"></div>
               </div>
             ))}
          </div>

          {visibleNotes.map((note, idx) => {
             const noteTime = note.beat * secondsPerBeat;
             const timeDiff = noteTime - currentTime;
             const progress = 1 - (timeDiff / LOOKAHEAD);
             const topPos = progress * 90; 
             const laneIndex = 6 - note.string; 
             const laneWidthPercent = 100 / 6;
             const leftPos = (laneIndex * laneWidthPercent) + (laneWidthPercent / 2);

             if (progress < -0.1 || progress > 1.1) return null;
             const isHit = timeDiff <= 0.05 && timeDiff >= -0.1;

             return (
               <div 
                 key={`${note.beat}-${note.string}-${idx}`}
                 className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-6 md:w-12 md:h-8 rounded-lg border-2 z-20 flex items-center justify-center
                    ${STRING_COLORS[note.string]} 
                    ${isHit ? 'scale-125 brightness-150' : 'opacity-90'}
                 `}
                 style={{ 
                   left: `${leftPos}%`, 
                   top: `${topPos}%`,
                   transform: `translate(-50%, -50%) scale(${0.5 + (0.5 * progress)})`
                 }}
               >
                 <span className="text-white font-black text-xs md:text-sm drop-shadow-md">{note.fret}</span>
                 {note.duration > 0.5 && (
                    <div 
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 w-1 md:w-2 bg-white/50 -z-10`}
                      style={{ 
                          height: `${(note.duration / LOOKAHEAD) * 300}%`,
                          transformOrigin: 'bottom'
                      }} 
                    />
                 )}
               </div>
             );
          })}
       </div>
       <div className="absolute bottom-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-[0_0_20px_white]"></div>
    </div>
  );
};
