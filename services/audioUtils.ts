
export const makeTubeCurve = (amount: number) => {
  const k = amount; 
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    let x = i * 2 / n_samples - 1;
    if (x < -0.08905) {
      curve[i] = -(3/4) * (1 - (Math.pow(1 - (Math.abs(x) - 0.032847), 12) + (1/3) * (Math.abs(x) - 0.032847))) + 0.01;
    } else if (x >= -0.08905 && x < 0.320018) {
      curve[i] = -6.153 * (x * x) + 3.9375 * x;
    } else {
      curve[i] = 0.630035;
    }
    curve[i] = (1 - k/100) * x + (k/100) * curve[i] * 1.5; 
  }
  return curve;
};

export const makeFuzzCurve = (amount: number) => {
  const k = amount * 10;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i; let sample; let offset = 0; let pos = 0;
  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);
  for(i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while(pos < buffer.length) {
    for(i = 0; i < numOfChan; i++) { 
      sample = Math.max(-1, Math.min(1, channels[i][pos])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
      view.setInt16(44 + offset, sample, true); offset += 2;
    }
    pos++;
  }
  function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }
  return new Blob([bufferArr], { type: 'audio/wav' });
}
