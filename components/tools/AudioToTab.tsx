
import React, { useState, useRef } from 'react';
import { TranscriptionAgent } from '../../services/ai/TranscriptionAgent';
import { TabResult } from '../../types';
import { Mic, Loader2 } from 'lucide-react';

interface AudioToTabProps {
  onResult: (result: TabResult) => void;
}

export const AudioToTab: React.FC<AudioToTabProps> = ({ onResult }) => {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const agent = useRef(new TranscriptionAgent());

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
           const res = await agent.current.generateTabFromAudio(base64);
           if (res) onResult(res);
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
      }, 10000); // 10s Limit

    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-850 rounded-2xl border border-gray-700 p-6">
      {!analyzing && (
        <>
          <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 transition-all ${recording ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_purple]' : 'border-gray-600 bg-gray-800'}`}>
            <Mic className={`w-12 h-12 ${recording ? 'text-purple-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <button 
            onClick={recording ? stopRecording : startRecording}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            {recording ? 'Stop Recording' : 'Record Riff to Tab (10s)'}
          </button>
          <p className="mt-4 text-gray-500 text-sm">Records 10s of audio and generates playable tablature.</p>
        </>
      )}
      {analyzing && (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-purple-500" />
          <p className="text-xl font-bold text-white">AI is transcribing harmony & rhythm...</p>
        </div>
      )}
    </div>
  );
};
