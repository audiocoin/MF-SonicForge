
import React, { useState, useRef } from 'react';
import { SongDetector } from '../../services/ai/SongDetector';
import { DetectedSong } from '../../types';
import { Mic, Loader2, GraduationCap } from 'lucide-react';

interface SongIdentifierProps {
  onNavigateToAcademy: (query: string) => void;
}

export const SongIdentifier: React.FC<SongIdentifierProps> = ({ onNavigateToAcademy }) => {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedSong, setDetectedSong] = useState<DetectedSong | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const detector = useRef(new SongDetector());

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAnalyzing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
           const base64 = (reader.result as string).split(',')[1];
           const res = await detector.current.detect(base64);
           setDetectedSong(res);
           setAnalyzing(false);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setRecording(true);
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
           stopRecording();
        }
      }, 5000); 
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-850 rounded-2xl border border-gray-700 p-6">
      {!analyzing && !detectedSong && (
        <>
          <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 transition-all ${recording ? 'border-red-500 bg-red-500/10 shadow-[0_0_30px_red]' : 'border-gray-600 bg-gray-800'}`}>
            <Mic className={`w-12 h-12 ${recording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <button 
            onClick={recording ? stopRecording : startRecording}
            className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            {recording ? 'Stop' : 'Identify Song (5s)'}
          </button>
        </>
      )}
      {analyzing && (
         <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-accent-500" />
            <p className="text-xl font-bold text-white">Analyzing Audio Fingerprint...</p>
         </div>
      )}
      {detectedSong && (
        <div className="text-center w-full max-w-md animate-in zoom-in duration-300">
           <h2 className="text-3xl font-black text-white mb-2">{detectedSong.title}</h2>
           <p className="text-xl text-accent-400 mb-6">{detectedSong.artist}</p>
           <div className="bg-gray-900 p-4 rounded-xl text-left border border-gray-700 mb-6">
              <p className="text-gray-400 text-sm mb-2">Confidence: <span className="text-white">{detectedSong.confidence}</span></p>
              <div className="flex flex-wrap gap-2">
                {detectedSong.chords.map((c, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-800 rounded border border-gray-600 text-primary-300 text-sm font-mono">{c}</span>
                ))}
              </div>
           </div>
           <div className="flex justify-center gap-4">
             <button onClick={() => setDetectedSong(null)} className="text-gray-400 hover:text-white underline">Scan Again</button>
             <button onClick={() => onNavigateToAcademy(`${detectedSong.title} ${detectedSong.artist}`)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
               <GraduationCap className="w-4 h-4" /> Learn in Academy
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
