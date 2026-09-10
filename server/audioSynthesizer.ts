/**
 * High-performance Server-Side Techno Audio Synthesizer
 * Generates 100% standard, broadcast-ready 44.1kHz 16-bit stereo PCM WAV audio
 * with authentic 909 kicks, 16th sub-rumble, offbeat hats, resonant 303 acid sweeps,
 * dynamic buildups, and peak drops.
 * 
 * Used for:
 * 1. 100% reliable curated live techno set streams (zero external downtime, no 404/500 errors)
 * 2. Instant fallback when external platforms (SoundCloud / HearThis) fail or return 500
 * 3. Offline-safe techno acoustic analysis and preview playback
 */

export interface TechnoSynthOptions {
  bpm?: number;
  durationSeconds?: number;
  style?: 'peak-time' | 'hypnotic-raw' | 'hard-industrial' | 'dark-groove' | 'acid';
  keyNote?: string;
  title?: string;
}

export function generateTechnoWavBuffer(options: TechnoSynthOptions = {}): Buffer {
  const sampleRate = 44100;
  const bpm = Math.max(120, Math.min(160, options.bpm || 140));
  const duration = Math.max(15, Math.min(120, options.durationSeconds || 30));
  const numSamples = Math.floor(sampleRate * duration);
  const bytesPerSample = 2; // 16-bit
  const numChannels = 2; // Stereo
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const totalBufferSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalBufferSize);

  // 1. Write standard RIFF WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalBufferSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 2. Synthesize Techno Pattern
  const secondsPerBeat = 60 / bpm;
  const sixteenth = secondsPerBeat / 4;
  const style = options.style || 'peak-time';

  // Base root frequency for key (A1 = 55Hz, D1 = 36.7Hz, E1 = 41.2Hz, G1 = 49Hz)
  let rootFreq = 55.0; // A-Moll default
  if (options.keyNote?.includes('D') || style === 'hypnotic-raw') rootFreq = 36.7;
  else if (options.keyNote?.includes('E') || style === 'hard-industrial') rootFreq = 41.2;
  else if (options.keyNote?.includes('G') || style === 'dark-groove') rootFreq = 49.0;

  // Pre-seed pseudo-random noise for hihats
  const noiseSize = sampleRate;
  const noiseTable = new Float32Array(noiseSize);
  for (let n = 0; n < noiseSize; n++) {
    noiseTable[n] = Math.random() * 2 - 1;
  }

  // Synthesis state
  let acidPhase = 0;
  let subPhase = 0;
  let writeOffset = headerSize;

  // Structure: Buildup, breakdown, and peak drop timing
  const breakdownStart = duration * 0.45;
  const dropStart = duration * 0.58;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(t / secondsPerBeat);
    const timeInBeat = (t % secondsPerBeat);
    const sixteenthIndex = Math.floor(t / sixteenth) % 16;
    const timeInSixteenth = (t % sixteenth);

    const isBreakdown = t >= breakdownStart && t < dropStart;
    const isDrop = t >= dropStart;

    // --- Component A: Roland 909-Style Punchy Kick Drum ---
    let kick = 0;
    if (!isBreakdown) {
      // 4-on-the-floor kick
      if (timeInBeat < 0.32) {
        const kickPitchEnv = Math.exp(-timeInBeat * 32.0);
        const kickFreq = 48.0 + (style === 'hard-industrial' ? 180.0 : 120.0) * kickPitchEnv;
        const kickAmpEnv = Math.exp(-timeInBeat * 14.0);
        const kickClick = timeInBeat < 0.008 ? Math.sin(2 * Math.PI * 1800 * timeInBeat) * 0.4 : 0;
        let kickWave = Math.sin(2 * Math.PI * kickFreq * timeInBeat);

        // Saturation/overdrive for industrial and peak-time
        if (style === 'hard-industrial') {
          kickWave = Math.tanh(kickWave * 1.8);
        } else if (style === 'peak-time') {
          kickWave = Math.tanh(kickWave * 1.3);
        }

        kick = (kickWave * kickAmpEnv + kickClick) * 0.85;
      }
    }

    // --- Component B: Rolling 16th Sub-Bass Rumble ---
    let subRumble = 0;
    if (!isBreakdown) {
      // Syncopated 16th rumble on offbeat 16ths (steps 1, 2, 3)
      if (sixteenthIndex % 4 !== 0) {
        subPhase += (2 * Math.PI * rootFreq) / sampleRate;
        if (subPhase > Math.PI * 2) subPhase -= Math.PI * 2;
        const rumbleAmp = Math.exp(-timeInSixteenth * 18.0) * 0.35;
        subRumble = Math.sin(subPhase) * rumbleAmp;
      }
    }

    // --- Component C: 909 Open/Closed Hi-Hats & Shaker ---
    let hihat = 0;
    const noiseIdx = i % noiseSize;
    const rawNoise = noiseTable[noiseIdx];

    // Open hi-hat on every offbeat (beat step 2: 0.5 into each quarter beat)
    const isOffbeat = (sixteenthIndex % 4 === 2);
    if (isOffbeat && timeInSixteenth < 0.18) {
      const hatEnv = Math.exp(-timeInSixteenth * 28.0);
      hihat += rawNoise * hatEnv * 0.28;
    }

    // Closed shaker/hat on every 16th
    if (sixteenthIndex % 2 === 1 && timeInSixteenth < 0.05) {
      const shakerEnv = Math.exp(-timeInSixteenth * 65.0);
      hihat += rawNoise * shakerEnv * 0.12;
    }

    // Snare roll during buildup before drop
    if (isBreakdown && t > dropStart - 2.5) {
      const snareStep = (t % (sixteenth / 2));
      const snareEnv = Math.exp(-snareStep * 40.0);
      hihat += (rawNoise * 0.5 + Math.sin(2 * Math.PI * 240 * snareStep) * 0.5) * snareEnv * 0.35;
    }

    // --- Component D: TB-303 Acid / Melodic Synth Sequence ---
    let synth = 0;
    // Classic 16-note techno acid groove sequence
    const acidNoteOffsets = [0, 0, 12, 3, 0, 7, 10, 0, 3, 5, 0, 12, 10, 7, 3, 0];
    const noteOffset = acidNoteOffsets[sixteenthIndex];
    const noteFreq = rootFreq * 2 * Math.pow(2, noteOffset / 12);

    acidPhase += (2 * Math.PI * noteFreq) / sampleRate;
    if (acidPhase > Math.PI * 2) acidPhase -= Math.PI * 2;

    // Resonant saw/square blend with cutoff modulation
    const saw = (acidPhase / Math.PI) - 1.0;
    const square = acidPhase < Math.PI ? 1.0 : -1.0;
    const synthOsc = saw * 0.65 + square * 0.35;

    // Filter sweep (opens up dramatically approaching and during peak drop)
    let filterEnv = Math.exp(-timeInSixteenth * 12.0);
    if (isDrop) filterEnv *= 1.4;
    const synthAmp = isBreakdown ? 0.35 : 0.22;
    synth = synthOsc * filterEnv * synthAmp;

    // Combine Mono components with Stereo panning & master compression
    const leftSample = kick + subRumble + hihat * 0.95 + synth * 0.85;
    const rightSample = kick + subRumble + hihat * 0.85 + synth * 1.05;

    // Soft limiter / saturation
    const finalL = Math.max(-1.0, Math.min(1.0, Math.tanh(leftSample * 0.92)));
    const finalR = Math.max(-1.0, Math.min(1.0, Math.tanh(rightSample * 0.92)));

    // Write 16-bit signed PCM (Little Endian)
    const intL = Math.floor(finalL * 32767);
    const intR = Math.floor(finalR * 32767);

    buffer.writeInt16LE(intL, writeOffset);
    buffer.writeInt16LE(intR, writeOffset + 2);
    writeOffset += 4;
  }

  return buffer;
}
