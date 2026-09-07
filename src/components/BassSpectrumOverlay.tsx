import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Sliders,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  Radio,
  X,
  Maximize2,
  Minimize2,
  Zap,
  Info,
  Disc3,
  ArrowRight
} from 'lucide-react';
import { TechnoSetAnalysis, TransitionItem, HardwareMixerType } from '../types';
import { generateTransitionEqAdvice, getKeyAcoustics } from '../utils/eqFrequencyAdvisor';
import { TechnoPreviewAudioEngine } from '../utils/audioAnalyzer';
import { formatTimeSeconds } from '../utils/pdfExport';

interface BassSpectrumOverlayProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  isPlaying: boolean;
  audioEngine?: TechnoPreviewAudioEngine | null;
  targetTransition?: TransitionItem | null;
  allTransitions?: TransitionItem[];
  onSelectTransition?: (t: TransitionItem) => void;
  onSeek?: (time: number) => void;
  onClose?: () => void;
  onSelectTab?: (tab: any) => void;
}

// Key musical notes in the bass & low-mid spectrum for DJ tuning
const BASS_NOTE_FREQS = [
  { note: 'C1', freq: 32.7 },
  { note: 'D1', freq: 36.7 },
  { note: 'E1', freq: 41.2 },
  { note: 'F1', freq: 43.7 },
  { note: 'F#1', freq: 46.2 },
  { note: 'G1', freq: 49.0 },
  { note: 'G#1', freq: 51.9 },
  { note: 'A1', freq: 55.0 },
  { note: 'A#1', freq: 58.3 },
  { note: 'B1', freq: 61.7 },
  { note: 'C2', freq: 65.4 },
  { note: 'D2', freq: 73.4 },
  { note: 'E2', freq: 82.4 },
  { note: 'F2', freq: 87.3 },
  { note: 'F#2', freq: 92.5 },
  { note: 'G2', freq: 98.0 },
  { note: 'A2', freq: 110.0 },
  { note: 'B2', freq: 123.5 },
  { note: 'C3', freq: 130.8 },
  { note: 'D3', freq: 146.8 },
  { note: 'E3', freq: 164.8 },
  { note: 'F3', freq: 174.6 },
  { note: 'F#3', freq: 185.0 },
  { note: 'G3', freq: 196.0 },
  { note: 'A3', freq: 220.0 },
  { note: 'B3', freq: 246.9 },
  { note: 'C4', freq: 261.6 },
  { note: 'D4', freq: 293.7 },
  { note: 'E4', freq: 329.6 }
];

function getClosestMusicalNote(freqHz: number): { note: string; diffHz: number } {
  let closest = BASS_NOTE_FREQS[0];
  let minDiff = Math.abs(freqHz - closest.freq);

  for (let i = 1; i < BASS_NOTE_FREQS.length; i++) {
    const diff = Math.abs(freqHz - BASS_NOTE_FREQS[i].freq);
    if (diff < minDiff) {
      minDiff = diff;
      closest = BASS_NOTE_FREQS[i];
    }
  }
  return { note: closest.note, diffHz: Math.round(minDiff * 10) / 10 };
}

export const BassSpectrumOverlay: React.FC<BassSpectrumOverlayProps> = ({
  currentSet,
  currentTime,
  isPlaying,
  audioEngine,
  targetTransition,
  allTransitions = currentSet.transitions || [],
  onSelectTransition,
  onSeek,
  onClose,
  onSelectTab
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Frequency Zoom Span: 'bass' = 20Hz - 500Hz, 'full' = 20Hz - 2500Hz
  const [freqSpanMode, setFreqSpanMode] = useState<'bass' | 'full'>('bass');

  // Hardware Mixer Guidance Guide overlay: 'none' | 'xone' | 'djm'
  const [mixerGuide, setMixerGuide] = useState<'xone' | 'djm' | 'none'>('xone');

  // Interactive Audition Mode: 'normal' | 'muddy' | 'carved'
  const [eqCarveMode, setEqCarveMode] = useState<'normal' | 'muddy' | 'carved'>('normal');

  // Show Recommended Cut Curve
  const [showCutFilterCurve, setShowCutFilterCurve] = useState<boolean>(true);

  // Mouse hover state for inspection
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    freqHz: number;
    db: number;
    note: string;
    isMudZone: boolean;
  } | null>(null);

  // Live power telemetry
  const [telemetry, setTelemetry] = useState({
    subBassDb: -12.4,
    kickPunchDb: -9.8,
    mudZoneDb: -16.2,
    mudClashDetected: false
  });

  // Active transition for EQ Mud calculations
  const activeTrans = targetTransition || allTransitions[0] || null;

  // Generate EQ Mud Advisor data for the currently selected transition
  const eqAdvice = useMemo(() => {
    if (!activeTrans) return null;
    return generateTransitionEqAdvice(activeTrans);
  }, [activeTrans]);

  // Camelot Acoustics for Deck A and Deck B fundamentals
  const fromAcoustics = useMemo(() => {
    if (!activeTrans) return null;
    return getKeyAcoustics(activeTrans.fromKey);
  }, [activeTrans]);

  const toAcoustics = useMemo(() => {
    if (!activeTrans) return null;
    return getKeyAcoustics(activeTrans.toKey);
  }, [activeTrans]);

  // Primary recommended cut from EQ Mud Advisor
  const primaryCut = useMemo(() => {
    if (!eqAdvice || !eqAdvice.recommendedCuts || eqAdvice.recommendedCuts.length === 0) {
      return null;
    }
    return (
      eqAdvice.recommendedCuts.find((c) => c.priority === 'essential') ||
      eqAdvice.recommendedCuts[0]
    );
  }, [eqAdvice]);

  // Handle Mode Change on Audio Engine
  const handleSetCarveMode = (mode: 'normal' | 'muddy' | 'carved') => {
    setEqCarveMode(mode);
    if (audioEngine) {
      audioEngine.setEqCarveMode(mode);
    }
  };

  // Synchronize with external audio engine mode
  useEffect(() => {
    if (audioEngine) {
      const currentMode = audioEngine.getEqCarveMode();
      if (currentMode !== eqCarveMode) {
        setEqCarveMode(currentMode);
      }
    }
  }, [audioEngine]);

  // Setup Canvas and Real-Time RTA Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fast FFT storage array (256 bins for 512 fftSize)
    const fftBinsCount = 256;
    const rawFreqData = new Uint8Array(fftBinsCount);

    // Peak-hold array to track transient peaks
    const peakHoldData = new Float32Array(fftBinsCount).fill(-90);
    const peakDecayRate = 0.45; // dB per frame

    // Min and Max Frequency based on current mode
    const minFreq = 20;
    const maxFreq = freqSpanMode === 'bass' ? 500 : 2500;

    let lastFrameTime = performance.now();

    // Map Frequency (Hz) to X pixel coordinate using logarithmic scaling
    const freqToX = (f: number, width: number): number => {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const logF = Math.log10(Math.max(minFreq, Math.min(maxFreq, f)));
      return ((logF - logMin) / (logMax - logMin)) * width;
    };

    // Map X pixel coordinate to Frequency (Hz)
    const xToFreq = (x: number, width: number): number => {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const logF = logMin + (x / width) * (logMax - logMin);
      return Math.pow(10, logF);
    };

    // Map Decibels (-60dB to 0dB) to Y pixel coordinate
    const dbToY = (db: number, height: number): number => {
      const clamped = Math.max(-60, Math.min(0, db));
      return ((0 - clamped) / 60) * height;
    };

    const render = (now: number) => {
      const width = canvas.width;
      const height = canvas.height;
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // 1. Fetch Real or Simulated Frequency Data
      let hasRealAudio = false;
      if (audioEngine) {
        hasRealAudio = audioEngine.getByteFrequencyData(rawFreqData);
      }

      // If no live audio or paused, construct physical techno acoustic spectral curve
      // based on currentSet's energyPoints, beat pulses, and EQ Mud Advisor data
      const sampleRate = 44100;
      const binWidth = sampleRate / 512; // ~86.13 Hz per bin

      // Current Energy & SubBass from set analysis
      const currentEnergyPt =
        currentSet.energyPoints.find((p) => Math.abs(p.time - currentTime) < 1.5) ||
        currentSet.energyPoints[0] || { energy: 75, subBass: 80 };

      // Beat pulsation (sine modulation based on set BPM)
      const bpm = currentSet.bpmAverage || 140;
      const beatFreq = bpm / 60;
      const beatPhase = (currentTime * beatFreq * 2 * Math.PI) % (2 * Math.PI);
      const kickImpulse = isPlaying ? Math.pow(Math.max(0, Math.sin(beatPhase)), 6) : 0.35;

      // Fundamental and clash frequencies from EQ advisor
      const f0From = fromAcoustics?.rootHz || 55.0;
      const f0To = toAcoustics?.rootHz || 46.2;
      const clashHz = eqAdvice ? parseInt(eqAdvice.primaryMudZoneHz.split(' ')[0], 10) || 185 : 185;

      // Fill or blend raw frequency curve
      for (let i = 0; i < fftBinsCount; i++) {
        const binFreq = i * binWidth;
        let db = -65;

        if (hasRealAudio && isPlaying) {
          // Convert 0-255 uint8 to dB (-60dB to 0dB)
          const norm = rawFreqData[i] / 255;
          db = norm > 0 ? -60 + norm * 60 : -65;
        } else {
          // Accurate techno physical bass acoustic model:
          // 1. Kick fundamental peak (40 - 55 Hz)
          const kickDist = Math.abs(binFreq - f0From);
          const kickGain = Math.max(0, 1 - kickDist / 25) * (38 + (currentEnergyPt.subBass / 100) * 16);

          // 2. Incoming Track B Sub/Bass
          const toDist = Math.abs(binFreq - f0To);
          const toGain = Math.max(0, 1 - toDist / 22) * 28;

          // 3. Mud zone accumulation (120 - 250 Hz)
          const mudCenter = clashHz;
          const mudDist = Math.abs(binFreq - mudCenter);
          let mudGain = Math.max(0, 1 - mudDist / 55) * 26;

          // Modify mud gain based on current EQ Carve Mode
          if (eqCarveMode === 'carved') {
            mudGain *= 0.35; // 65% reduction when carved!
          } else if (eqCarveMode === 'muddy') {
            mudGain *= 1.65; // Severe clash simulation!
          }

          // 4. Natural high-frequency roll-off (-6dB / octave)
          const rollOff = Math.max(0, 30 - Math.log10(Math.max(30, binFreq) / 30) * 22);

          const totalAmp = (kickGain + toGain) * (0.6 + kickImpulse * 0.4) + mudGain + rollOff;
          db = -60 + Math.min(58, totalAmp);
        }

        // Apply Peak-Hold logic
        if (db > peakHoldData[i]) {
          peakHoldData[i] = db;
        } else {
          peakHoldData[i] = Math.max(-65, peakHoldData[i] - peakDecayRate);
        }
      }

      // 2. Measure Telemetry Bands
      // Sub-Bass: 20 - 60 Hz
      let subSum = 0;
      let subCount = 0;
      // Kick: 60 - 120 Hz
      let kickSum = 0;
      let kickCount = 0;
      // Mud Zone: 120 - 250 Hz
      let mudSum = 0;
      let mudCount = 0;

      for (let i = 0; i < fftBinsCount; i++) {
        const f = i * binWidth;
        const val = peakHoldData[i];
        if (f >= 20 && f <= 60) {
          subSum += val;
          subCount++;
        } else if (f > 60 && f <= 120) {
          kickSum += val;
          kickCount++;
        } else if (f >= 120 && f <= 250) {
          mudSum += val;
          mudCount++;
        }
      }

      const avgSub = subCount > 0 ? subSum / subCount : -30;
      const avgKick = kickCount > 0 ? kickSum / kickCount : -35;
      const avgMud = mudCount > 0 ? mudSum / mudCount : -40;
      const mudClashActive = eqCarveMode === 'muddy' || (avgMud > -20 && avgKick > -18);

      setTelemetry({
        subBassDb: Math.round(avgSub * 10) / 10,
        kickPunchDb: Math.round(avgKick * 10) / 10,
        mudZoneDb: Math.round(avgMud * 10) / 10,
        mudClashDetected: mudClashActive
      });

      // 3. Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Dark background with subtle vertical gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0b0e');
      bgGrad.addColorStop(1, '#050608');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Draw EQ-MUD ACCUMULATION DANGER ZONE (120 Hz - 250 Hz)
      const mudX1 = freqToX(120, width);
      const mudX2 = freqToX(250, width);
      const mudWidth = Math.max(1, mudX2 - mudX1);

      // Background Tint for Mud Zone
      const mudZoneGrad = ctx.createLinearGradient(mudX1, 0, mudX2, 0);
      if (mudClashActive) {
        mudZoneGrad.addColorStop(0, 'rgba(244, 63, 94, 0.08)');
        mudZoneGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.18)');
        mudZoneGrad.addColorStop(1, 'rgba(244, 63, 94, 0.08)');
      } else {
        mudZoneGrad.addColorStop(0, 'rgba(245, 158, 11, 0.05)');
        mudZoneGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');
        mudZoneGrad.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
      }
      ctx.fillStyle = mudZoneGrad;
      ctx.fillRect(mudX1, 0, mudWidth, height);

      // Subtle diagonal warning raster stripes in Mud Zone
      ctx.save();
      ctx.beginPath();
      ctx.rect(mudX1, 0, mudWidth, height);
      ctx.clip();
      ctx.strokeStyle = mudClashActive ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.07)';
      ctx.lineWidth = 1;
      const stripeSpacing = 16;
      for (let sx = mudX1 - height; sx < mudX2 + height; sx += stripeSpacing) {
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + height, height);
        ctx.stroke();
      }
      ctx.restore();

      // Mud Zone Border lines
      ctx.strokeStyle = mudClashActive ? 'rgba(244, 63, 94, 0.5)' : 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mudX1, 0);
      ctx.lineTo(mudX1, height);
      ctx.moveTo(mudX2, 0);
      ctx.lineTo(mudX2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mud Zone Header Banner in Canvas
      ctx.fillStyle = mudClashActive ? 'rgba(244, 63, 94, 0.85)' : 'rgba(245, 158, 11, 0.85)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        mudClashActive ? '⚠ EQ-MUD MATSCH-RESONANZ (120 - 250 Hz)' : 'EQ-MUD ADVISOR ZONE (120 - 250 Hz)',
        mudX1 + mudWidth / 2,
        14
      );

      // 5. Grid: Decibel Horizontal Lines
      const dbLevels = [0, -6, -12, -18, -24, -36, -48];
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';

      dbLevels.forEach((dbVal) => {
        const y = dbToY(dbVal, height);
        ctx.strokeStyle = dbVal === 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.fillText(`${dbVal} dB`, 4, y - 2);
      });

      // 6. Grid: Frequency Vertical Lines (Logarithmic)
      const freqTicks =
        freqSpanMode === 'bass'
          ? [30, 45, 60, 80, 100, 120, 150, 185, 220, 250, 300, 400, 500]
          : [30, 60, 100, 150, 250, 500, 1000, 1500, 2000, 2500];

      ctx.textAlign = 'center';
      freqTicks.forEach((f) => {
        const x = freqToX(f, width);
        const isMudBorder = f === 120 || f === 250;
        ctx.strokeStyle = isMudBorder ? 'transparent' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle =
          f >= 120 && f <= 250 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(148, 163, 184, 0.5)';
        ctx.font = f === 60 || f === 120 || f === 250 || f === 500 ? 'bold 9px monospace' : '8px monospace';
        ctx.fillText(`${f}Hz`, x, height - 4);
      });

      // 7. Draw Mixer Hardware Crossover Guides (Xone:96 or DJM)
      if (mixerGuide === 'xone') {
        // Xone:96: Low/Lo-Mid crossover ~120 Hz, Lo-Mid/Hi-Mid crossover ~2.7kHz
        const xoneLowCut = freqToX(120, width);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(xoneLowCut, 18);
        ctx.lineTo(xoneLowCut, height - 16);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('XONE:96 LOW/LO-MID (120Hz)', xoneLowCut + 3, 26);
      } else if (mixerGuide === 'djm') {
        // DJM: 3-band Isolator crossover around 180 Hz
        const djmX = freqToX(180, width);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(djmX, 18);
        ctx.lineTo(djmX, height - 16);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DJM 3-BAND X-OVER (180Hz)', djmX + 3, 26);
      }

      // 8. Draw Deck A & Deck B Musical Fundamental Pins (f0)
      if (fromAcoustics && fromAcoustics.rootHz >= minFreq && fromAcoustics.rootHz <= maxFreq) {
        const xA = freqToX(fromAcoustics.rootHz, width);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)'; // Emerald for Deck A
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xA, 30);
        ctx.lineTo(xA, height - 18);
        ctx.stroke();

        // Pin Head
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(xA, 30, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`A: ${fromAcoustics.rootHz}Hz (${activeTrans?.fromKey})`, xA, 42);
      }

      if (toAcoustics && toAcoustics.rootHz >= minFreq && toAcoustics.rootHz <= maxFreq) {
        const xB = freqToX(toAcoustics.rootHz, width);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)'; // Blue for Deck B
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xB, 46);
        ctx.lineTo(xB, height - 18);
        ctx.stroke();

        // Pin Head
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(xB, 46, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`B: ${toAcoustics.rootHz}Hz (${activeTrans?.toKey})`, xB, 58);
      }

      // 9. Draw Recommended Parametric EQ Cut Bell Filter Curve
      if (showCutFilterCurve && primaryCut && primaryCut.centerFrequencyHz) {
        const cutF = primaryCut.centerFrequencyHz;
        const cutGain = primaryCut.cutGainDb || -3.5;
        const cutQ = primaryCut.bandwidthQ || 1.8;

        if (cutF >= minFreq && cutF <= maxFreq) {
          const cutX = freqToX(cutF, width);
          const cutY = dbToY(cutGain, height);

          // Draw Parametric Bell Curve
          ctx.beginPath();
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);

          const steps = 60;
          for (let s = 0; s <= steps; s++) {
            const curF = minFreq + (s / steps) * (maxFreq - minFreq);
            const x = freqToX(curF, width);

            // Standard 2nd-order Peaking EQ frequency response approximation
            const octDiff = Math.log2(curF / cutF);
            const bandwidth = 1 / cutQ;
            const filterAtten = cutGain * Math.exp(-Math.pow(octDiff / (bandwidth * 0.5), 2));
            const y = dbToY(filterAtten, height);

            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Filter Cut Marker Pin
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(cutX, cutY, 4, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`ADVISOR CUT: ${cutGain}dB @ ${cutF}Hz`, cutX, cutY - 7);
        }
      }

      // 10. Draw RTA Frequency Curve & Gradient Fill
      // Sample discrete spectrum points across the visible canvas width
      const numCurveSteps = 120;
      const curvePoints: { x: number; y: number }[] = [];

      for (let s = 0; s <= numCurveSteps; s++) {
        const f = minFreq + (s / numCurveSteps) * (maxFreq - minFreq);
        const x = freqToX(f, width);

        // Find nearest FFT bin
        const binIndex = Math.min(fftBinsCount - 1, Math.max(0, Math.round(f / binWidth)));
        let db = peakHoldData[binIndex];

        // If in carved mode and near cut frequency, reflect filter cut in the visual curve!
        if (eqCarveMode === 'carved' && primaryCut) {
          const octDiff = Math.log2(f / primaryCut.centerFrequencyHz);
          const filterAtten = (primaryCut.cutGainDb || -4.0) * Math.exp(-Math.pow(octDiff / 0.6, 2));
          db += filterAtten;
        }

        const y = dbToY(db, height);
        curvePoints.push({ x, y });
      }

      // Fill beneath RTA Curve
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, height);
      curvePoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(curvePoints[curvePoints.length - 1].x, height);
      ctx.closePath();

      const spectrumFillGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (mudClashActive) {
        spectrumFillGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
        spectrumFillGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
        spectrumFillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
      } else {
        spectrumFillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        spectrumFillGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.2)');
        spectrumFillGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      }
      ctx.fillStyle = spectrumFillGrad;
      ctx.fill();

      // Draw Main RTA Curve Stroke
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      curvePoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.strokeStyle = mudClashActive ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = mudClashActive ? 'rgba(244, 63, 94, 0.8)' : 'rgba(16, 185, 129, 0.8)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // 11. Discrete Peak Hold Needles (32 log-spaced frequency bars)
      const numNeedleBars = 32;
      for (let b = 0; b < numNeedleBars; b++) {
        const f = minFreq * Math.pow(maxFreq / minFreq, b / (numNeedleBars - 1));
        const x = freqToX(f, width);
        const binIndex = Math.min(fftBinsCount - 1, Math.max(0, Math.round(f / binWidth)));
        let db = peakHoldData[binIndex];

        if (eqCarveMode === 'carved' && primaryCut) {
          const octDiff = Math.log2(f / primaryCut.centerFrequencyHz);
          const filterAtten = (primaryCut.cutGainDb || -4.0) * Math.exp(-Math.pow(octDiff / 0.6, 2));
          db += filterAtten;
        }

        const y = dbToY(db, height);

        // Draw Peak Needle Dot
        const isMud = f >= 120 && f <= 250;
        ctx.fillStyle = isMud ? '#f59e0b' : '#38bdf8';
        ctx.fillRect(x - 1.5, y - 1, 3, 2);
      }

      // 12. Draw Interactive Inspection Crosshair if Hovered
      if (hoverData) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Vertical guide
        ctx.beginPath();
        ctx.moveTo(hoverData.x, 0);
        ctx.lineTo(hoverData.x, height);
        ctx.stroke();

        // Horizontal guide
        ctx.beginPath();
        ctx.moveTo(0, hoverData.y);
        ctx.lineTo(width, hoverData.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Intersection circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hoverData.x, hoverData.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    audioEngine,
    isPlaying,
    currentTime,
    currentSet,
    freqSpanMode,
    mixerGuide,
    eqCarveMode,
    showCutFilterCurve,
    hoverData,
    fromAcoustics,
    toAcoustics,
    primaryCut,
    eqAdvice
  ]);

  // Handle Resize of canvas to match retina display resolution
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle Canvas Mouse Movement for precise inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const minFreq = 20;
    const maxFreq = freqSpanMode === 'bass' ? 500 : 2500;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logF = logMin + (x / rect.width) * (logMax - logMin);
    const freqHz = Math.round(Math.pow(10, logF) * 10) / 10;

    const db = Math.round((0 - (y / rect.height) * 60) * 10) / 10;
    const noteInfo = getClosestMusicalNote(freqHz);
    const isMudZone = freqHz >= 120 && freqHz <= 250;

    setHoverData({
      x,
      y,
      freqHz,
      db,
      note: noteInfo.note,
      isMudZone
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div
      id="bass-frequency-spectrum-overlay"
      className="bg-[#0b0c10] border border-white/10 rounded-lg overflow-hidden flex flex-col gap-2 p-3 shadow-2xl relative animate-fadeIn"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
            <span>RTA SPEKTRUM</span>
          </div>
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Bass- & EQ-Mud Analyzer
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400">
            • 20 Hz - {freqSpanMode === 'bass' ? '500 Hz' : '2.5 kHz'}
          </span>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Transition Selector Dropdown if transitions exist */}
          {allTransitions.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-mono bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
              <span className="text-slate-500 uppercase">Mix:</span>
              <select
                value={activeTrans?.id || ''}
                onChange={(e) => {
                  const found = allTransitions.find((t) => t.id === e.target.value);
                  if (found && onSelectTransition) {
                    onSelectTransition(found);
                  }
                }}
                className="bg-transparent text-white text-[10px] font-mono border-none focus:outline-none cursor-pointer"
                title="Wähle den Übergang für die EQ-Mud Resonanz-Prüfung"
              >
                {allTransitions.map((t, idx) => (
                  <option key={t.id} value={t.id} className="bg-[#121214] text-white">
                    #{idx + 1} ({formatTimeSeconds(t.timestamp)} • {t.fromKey || '8A'} → {t.toKey || '8A'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Span Switcher: Bass vs Full */}
          <div className="flex items-center rounded bg-white/5 border border-white/10 p-0.5 text-[9px] font-mono font-bold">
            <button
              onClick={() => setFreqSpanMode('bass')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                freqSpanMode === 'bass'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bass-Fokus: 20 Hz - 500 Hz (optimale Auflösung für Kick & Matsch-Zone)"
            >
              BASS (500Hz)
            </button>
            <button
              onClick={() => setFreqSpanMode('full')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                freqSpanMode === 'full'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vollbereich: 20 Hz - 2.5 kHz"
            >
              2.5 kHz
            </button>
          </div>

          {/* Hardware Mixer Crossover Guide */}
          <div className="hidden md:flex items-center rounded bg-white/5 border border-white/10 p-0.5 text-[9px] font-mono">
            <span className="px-1.5 text-slate-500 uppercase text-[8px]">Guide:</span>
            <button
              onClick={() => setMixerGuide((prev) => (prev === 'xone' ? 'none' : 'xone'))}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                mixerGuide === 'xone'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Xone:96 Crossover-Frequenzlinien (120 Hz)"
            >
              Xone:96
            </button>
            <button
              onClick={() => setMixerGuide((prev) => (prev === 'djm' ? 'none' : 'djm'))}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                mixerGuide === 'djm'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pioneer DJM Isolator Crossover (180 Hz)"
            >
              DJM
            </button>
          </div>

          {/* Close Overlay Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Frequenzspektrum-Overlay schließen"
              aria-label="Close Frequency Spectrum Overlay"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Spectrum Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-44 sm:h-52 rounded border border-white/10 relative overflow-hidden bg-black select-none shadow-inner"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Real-Time Hover Tooltip Pill */}
        {hoverData && (
          <div
            style={{
              left: `${Math.min(canvasRef.current ? canvasRef.current.clientWidth - 150 : 200, Math.max(10, hoverData.x + 12))}px`,
              top: `${Math.min(canvasRef.current ? canvasRef.current.clientHeight - 40 : 150, Math.max(8, hoverData.y - 35))}px`
            }}
            className="absolute pointer-events-none bg-[#090b10]/95 border border-cyan-500/50 rounded px-2 py-1 text-[10px] font-mono shadow-xl backdrop-blur-sm z-30 flex flex-col gap-0.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">{hoverData.freqHz} Hz</span>
              <span className="text-emerald-400 font-bold">({hoverData.note})</span>
              <span className="text-white">{hoverData.db} dB</span>
            </div>
            {hoverData.isMudZone && (
              <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                EQ-Mud Matsch-Zone
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Diagnostic HUD & Telemetry Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        {/* Card 1: Sub-Bass Level */}
        <div className="bg-white/[0.02] border border-white/5 rounded p-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Sub-Bass (20 - 60 Hz)</span>
            <span className="text-white font-bold text-sm tracking-tight">{telemetry.subBassDb} dB</span>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              telemetry.subBassDb > -15
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {telemetry.subBassDb > -15 ? 'DRUCKVOLL' : 'MODERAT'}
          </div>
        </div>

        {/* Card 2: Kick Punch Level */}
        <div className="bg-white/[0.02] border border-white/5 rounded p-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Kick Punch (60 - 120 Hz)</span>
            <span className="text-white font-bold text-sm tracking-tight">{telemetry.kickPunchDb} dB</span>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              telemetry.kickPunchDb > -12
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {telemetry.kickPunchDb > -12 ? '909 PUNCH' : 'TRANSIENT'}
          </div>
        </div>

        {/* Card 3: Mud Zone Clash Status */}
        <div
          className={`border rounded p-2 flex items-center justify-between transition-colors ${
            telemetry.mudClashDetected
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-emerald-950/15 border-emerald-500/30'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Matsch-Zone (120 - 250 Hz)</span>
            <span
              className={`font-bold text-sm tracking-tight ${
                telemetry.mudClashDetected ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {telemetry.mudZoneDb} dB
            </span>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
              telemetry.mudClashDetected
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {telemetry.mudClashDetected ? (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>RESONANZ-MATSCH</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>LOW-END KLAR</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Actionable EQ-Mud Recommendation & Audio Audition Controls */}
      {eqAdvice && (
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[280px] flex-1">
            <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white font-mono">
                  Advisor-Empfehlung für {activeTrans?.fromKey || '8A'} → {activeTrans?.toKey || '8A'}:
                </span>
                {primaryCut && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    {primaryCut.cutGainDb} dB @ {primaryCut.centerFrequencyHz} Hz
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-1">
                {primaryCut?.actionSummary ||
                  `Mitten auf Deck B absenken, um die ${eqAdvice.primaryMudZoneHz} Überlagerung zu neutralisieren.`}
              </p>
            </div>
          </div>

          {/* Interactive Carve Audition Mode & Full Advisor Link */}
          <div className="flex items-center gap-2">
            {/* Audio Simulation Toggle Buttons */}
            <div className="flex items-center rounded bg-black/60 border border-white/10 p-0.5 text-[10px] font-mono">
              <button
                onClick={() => handleSetCarveMode('normal')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  eqCarveMode === 'normal'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Normaler Sound ohne künstliche Effekte"
              >
                Normal
              </button>
              <button
                onClick={() => handleSetCarveMode('muddy')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  eqCarveMode === 'muddy'
                    ? 'bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/30'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
                title="Simuliere überlagerte Bass-Resonanz (Matsch-Simulation)"
              >
                Matsch-Clash
              </button>
              <button
                onClick={() => handleSetCarveMode('carved')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  eqCarveMode === 'carved'
                    ? 'bg-emerald-500 text-black font-bold shadow-sm shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
                title="Simuliere den bereinigten Sound mit angewendetem EQ-Cut"
              >
                Mit EQ-Cut
              </button>
            </div>

            {/* Jump to Diagnosis Tab for full hardware breakdown */}
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('diagnosis')}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Öffne den vollen EQ-Mud Advisor mit Hardware-Potistellungen"
              >
                <span>Advisor Details</span>
                <ArrowRight className="w-3 h-3 text-black" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
