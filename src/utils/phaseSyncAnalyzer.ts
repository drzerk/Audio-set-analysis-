import {
  TransitionItem,
  PhaseSyncAnalysis,
  PhaseDriftRisk,
  WaveformAlignmentData,
  DriftForecastStep,
  PhaseNudgeAdvice,
  BarDriftHeatmapCell,
  DriftSpikeSegment,
  Transition32BarDriftMap
} from '../types';

/**
 * Generates an acoustic techno kick transient wave centered at a specific millisecond offset.
 * Mimics an analog punch with rapid attack (0-2ms), sub-decay (60Hz oscillation), and body envelope.
 */
function generateTechnoTransientCurve(centerMs: number, timePoints: number[]): number[] {
  const kickFreqHz = 62.0; // Typical techno kick fundamental
  const omega = (2 * Math.PI * kickFreqHz) / 1000; // radians per ms

  return timePoints.map((t) => {
    const delta = t - centerMs;
    if (delta < -3) {
      // Pre-attack silence/rise
      return Math.max(0, Math.exp((delta + 3) / 2) * 0.1);
    }
    // Attack and exponential resonant decay
    const attack = Math.exp(-Math.abs(delta) / 5);
    const bodyDecay = Math.exp(-Math.max(0, delta) / 18);
    const oscillation = Math.cos(omega * delta);

    // Combination of transient click (high) + sub oscillation
    const value = 0.35 * attack + 0.65 * bodyDecay * Math.max(0, oscillation);
    return Math.max(0, Math.min(1, value));
  });
}

/**
 * Computes high-resolution waveform alignment samples between Deck A (0ms) and Deck B (offsetMs)
 */
export function computeWaveformAlignmentData(offsetMs: number): WaveformAlignmentData {
  // 51 sampling points from -50ms to +50ms (every 2ms)
  const timeLabels: number[] = [];
  for (let t = -50; t <= 50; t += 2) {
    timeLabels.push(t);
  }

  const deckA = generateTechnoTransientCurve(0, timeLabels);
  const deckB = generateTechnoTransientCurve(offsetMs, timeLabels);

  // Calculate phase interference and summed acoustic waveform
  // Phase angle based on ~62Hz kick cycle (16.1ms period)
  const periodMs = 16.1;
  const normalizedDelta = Math.abs(offsetMs) % periodMs;
  const phaseAngleRad = (normalizedDelta / periodMs) * 2 * Math.PI;
  const interferenceCoeff = Math.cos(phaseAngleRad);

  const summedWaveform = deckA.map((valA, i) => {
    const valB = deckB[i];
    // In-phase adds constructively up to 2.0; out-of-phase cancels out
    const constructiveSum = valA + valB;
    const destructiveNotch = Math.max(0, Math.abs(valA - valB));
    const combined =
      interferenceCoeff >= 0
        ? valA + valB * interferenceCoeff
        : (1 + interferenceCoeff) * constructiveSum + Math.abs(interferenceCoeff) * destructiveNotch;

    return Math.max(0, Math.round(combined * 100) / 100);
  });

  // Calculate primary comb filter notch frequencies
  const combFilterNotchesHz: number[] = [];
  if (Math.abs(offsetMs) >= 1.5) {
    const firstNotch = Math.round(1000 / (2 * Math.abs(offsetMs)));
    if (firstNotch > 20 && firstNotch < 2000) {
      combFilterNotchesHz.push(firstNotch);
      if (firstNotch * 3 < 2000) combFilterNotchesHz.push(firstNotch * 3);
      if (firstNotch * 5 < 2000) combFilterNotchesHz.push(firstNotch * 5);
    }
  }

  return {
    timeOffsetMs: offsetMs,
    timeLabels,
    deckA,
    deckB,
    summedWaveform,
    combFilterNotchesHz
  };
}

/**
 * Analyzes whether a transition is drift-prone by comparing transient waveform alignment
 * of outgoing (Deck A) and incoming (Deck B) tracks at the transition timestamp.
 */
export function analyzeTransitionPhaseSync(
  transition: TransitionItem,
  audioBuffer?: AudioBuffer | null,
  fullDuration?: number
): PhaseSyncAnalysis {
  // 1. Determine BPM differential and rate of tempo drift
  const fromBpm = transition.fromBpm || 140;
  const toBpm = transition.toBpm || fromBpm;
  const tempoDeltaBpm = Math.round((toBpm - fromBpm) * 100) / 100;

  // Single beat durations in ms
  const beatMsA = 60000 / fromBpm;
  const beatMsB = 60000 / toBpm;
  const driftPerBeatMs = beatMsA - beatMsB;
  const driftRateMsPerBar = Math.round(driftPerBeatMs * 4 * 100) / 100; // 4 beats per bar

  // 2. Determine initial transient offset (timeDeltaMs)
  // If we have an AudioBuffer, extract real transient cross-correlation around transition.timestamp
  let timeDeltaMs = 0;

  if (audioBuffer) {
    try {
      const sampleRate = audioBuffer.sampleRate;
      const centerSample = Math.floor(transition.timestamp * sampleRate);
      const windowSec = 3.0; // 3 seconds around center
      const windowSamples = Math.floor(windowSec * sampleRate);
      const startSample = Math.max(0, centerSample - Math.floor(windowSamples / 2));
      const endSample = Math.min(audioBuffer.length, startSample + windowSamples);

      const channelData = audioBuffer.getChannelData(0);
      // Downsampled energy envelope to find beat peaks (1ms resolution)
      const step = Math.floor(sampleRate / 1000); // 1000 Hz = 1ms per bin
      const envelope: number[] = [];
      for (let s = startSample; s < endSample; s += step) {
        let maxVal = 0;
        for (let k = 0; k < step && s + k < endSample; k++) {
          const abs = Math.abs(channelData[s + k]);
          if (abs > maxVal) maxVal = abs;
        }
        envelope.push(maxVal);
      }

      // Detect prominent beat intervals
      const expectedIntervalMs = Math.round(beatMsA);
      let detectedOffset = 0;

      // Cross-correlate sub-peaks around the expected beat grid
      let maxCorrelation = -1;
      for (let lag = -35; lag <= 35; lag += 1) {
        let sum = 0;
        let count = 0;
        for (let i = 50; i < envelope.length - expectedIntervalMs - 50; i += expectedIntervalMs) {
          const val1 = envelope[i];
          const val2 = envelope[i + lag] || 0;
          sum += val1 * val2;
          count++;
        }
        const corr = count > 0 ? sum / count : 0;
        if (corr > maxCorrelation) {
          maxCorrelation = corr;
          detectedOffset = lag;
        }
      }

      timeDeltaMs = detectedOffset;
    } catch (err) {
      console.warn('Buffer correlation failed, falling back to acoustic model:', err);
      timeDeltaMs = deriveModelOffset(transition, tempoDeltaBpm);
    }
  } else {
    timeDeltaMs = deriveModelOffset(transition, tempoDeltaBpm);
  }

  // Bound initial offset to realistic DJ blend range (-35ms to +35ms)
  timeDeltaMs = Math.max(-35, Math.min(35, Math.round(timeDeltaMs * 10) / 10));

  // 3. Phase Angle & Coherence Calculations (relative to ~62Hz techno kick)
  const kickPeriodMs = 16.1;
  const cycleOffset = Math.abs(timeDeltaMs) % kickPeriodMs;
  let phaseAngleDeg = Math.round((cycleOffset / kickPeriodMs) * 360);
  if (phaseAngleDeg > 180) phaseAngleDeg = 360 - phaseAngleDeg;

  // Phase coherence score (100% is perfectly aligned, 0% is 180° antiphase cancellation)
  const baseCoherence = Math.max(10, Math.round(100 - (phaseAngleDeg / 180) * 85 - Math.abs(timeDeltaMs) * 0.4));
  const phaseCoherenceScore = Math.min(100, Math.max(15, baseCoherence));

  // 4. Flam & Drift Thresholds
  const flamThresholdMs = 14.0; // Standard human auditory threshold for distinguishing two distinct kick transients
  const absOffset = Math.abs(timeDeltaMs);
  const effectiveDriftRate = Math.max(0.15, Math.abs(driftRateMsPerBar));

  let barsUntilFlam: number;
  if (absOffset >= flamThresholdMs) {
    barsUntilFlam = 0;
  } else {
    barsUntilFlam = Math.max(1, Math.round((flamThresholdMs - absOffset) / effectiveDriftRate));
  }

  // 5. Drift Risk Categorization
  let driftRisk: PhaseDriftRisk = 'locked';
  if (absOffset >= flamThresholdMs || barsUntilFlam <= 6) {
    driftRisk = 'critical-flam';
  } else if (absOffset >= 8.0 || barsUntilFlam <= 16 || Math.abs(tempoDeltaBpm) >= 0.2) {
    driftRisk = 'drift-prone';
  } else if (absOffset >= 3.5 || barsUntilFlam <= 32 || Math.abs(tempoDeltaBpm) >= 0.1) {
    driftRisk = 'mild-drift';
  } else {
    driftRisk = 'locked';
  }

  const isDriftProne = driftRisk === 'drift-prone' || driftRisk === 'critical-flam';

  // 6. Sub-bass Phase Cancellation Risk
  let subPhaseCancellationRisk: 'minimal' | 'moderate' | 'severe' = 'minimal';
  if (phaseAngleDeg >= 115 || (absOffset >= 6 && absOffset <= 12)) {
    subPhaseCancellationRisk = 'severe';
  } else if (phaseAngleDeg >= 55 || (absOffset >= 3.5 && absOffset <= 15)) {
    subPhaseCancellationRisk = 'moderate';
  }

  // 7. Waveform Alignment Slices
  const waveformAlignment = computeWaveformAlignmentData(timeDeltaMs);

  // 8. Drift Progression Forecast over Transition Duration (Bars 1 to 64)
  const forecastBars = [1, 4, 8, 16, 24, 32, 48, 64];
  const barDurationSec = (beatMsA * 4) / 1000;

  const driftForecast: DriftForecastStep[] = forecastBars.map((bar) => {
    const cumulativeDrift = Math.round((timeDeltaMs + (bar - 1) * driftRateMsPerBar) * 10) / 10;
    const absDrift = Math.abs(cumulativeDrift);

    let status: 'locked' | 'acceptable' | 'flamming' | 'trainwreck' = 'locked';
    if (absDrift < 4.5) status = 'locked';
    else if (absDrift < 11.0) status = 'acceptable';
    else if (absDrift < 22.0) status = 'flamming';
    else status = 'trainwreck';

    // Comb cancellation estimate (maximum near 8ms / 180 deg)
    const normalizedMod = absDrift % kickPeriodMs;
    const combPercent = Math.min(100, Math.round(Math.sin((normalizedMod / kickPeriodMs) * Math.PI) * 100));

    return {
      bar,
      timeSeconds: Math.round((bar - 1) * barDurationSec),
      driftMs: cumulativeDrift,
      status,
      combCancellationPercent: combPercent
    };
  });

  // 9. Actionable DJ Nudge & Pitch Bend Advice
  const nudgeAdvice = generateNudgeAdvice(
    timeDeltaMs,
    tempoDeltaBpm,
    driftRateMsPerBar,
    barsUntilFlam,
    subPhaseCancellationRisk,
    fromBpm
  );

  const partialAnalysis: PhaseSyncAnalysis = {
    isDriftProne,
    driftRisk,
    phaseCoherenceScore,
    timeDeltaMs,
    phaseAngleDeg,
    tempoDeltaBpm,
    driftRateMsPerBar,
    barsUntilFlam,
    flamThresholdMs,
    subPhaseCancellationRisk,
    waveformAlignment,
    driftForecast,
    nudgeAdvice
  };

  // 10. Generate 32-Bar Phase Drift Heatmap with Spike Detection
  const barDriftHeatmap = generate32BarDriftHeatmap(transition, partialAnalysis);

  return {
    ...partialAnalysis,
    barDriftHeatmap
  };
}

/**
 * Deterministic calculation model based on transition properties when no audio buffer is in memory
 */
function deriveModelOffset(transition: TransitionItem, tempoDeltaBpm: number): number {
  const pScore = transition.phaseScore || 85;

  if (pScore >= 96) {
    // Ultra tight sync (±0.5 - 2.5 ms)
    const sign = tempoDeltaBpm >= 0 ? 1 : -1;
    return sign * Math.round((2.5 - (pScore - 96) * 0.5) * 10) / 10;
  } else if (pScore >= 88) {
    // Minor phase drift (±3.5 - 7.5 ms)
    const sign = tempoDeltaBpm >= 0 ? 1 : -1;
    return sign * Math.round((3.5 + (95 - pScore) * 0.6) * 10) / 10;
  } else if (pScore >= 80) {
    // Audible drift prone (±9.0 - 15.0 ms)
    const sign = tempoDeltaBpm >= 0 ? 1 : -1;
    return sign * Math.round((9.0 + (87 - pScore) * 0.9) * 10) / 10;
  } else {
    // Critical flam / cancellation (±16.0 - 26.0 ms)
    const sign = (transition.id.charCodeAt(transition.id.length - 1) % 2 === 0 ? 1 : -1);
    return sign * Math.round((16.0 + (80 - pScore) * 1.2) * 10) / 10;
  }
}

/**
 * Generates hardware-specific DJ advice for Pioneer CDJ-3000 / Xone mixers
 */
function generateNudgeAdvice(
  timeDeltaMs: number,
  tempoDeltaBpm: number,
  driftRateMsPerBar: number,
  barsUntilFlam: number,
  subRisk: 'minimal' | 'moderate' | 'severe',
  fromBpm: number
): PhaseNudgeAdvice {
  const absDelta = Math.abs(timeDeltaMs);
  const jogTicks = Math.max(1, Math.round(absDelta / 4.2)); // ~4.2ms per CDJ jog wheel touch tick

  let direction: 'forward' | 'backward' | 'in-sync' = 'in-sync';
  if (timeDeltaMs > 1.2) {
    direction = 'backward'; // Incoming track is ahead of beat grid -> slow down / nudge back
  } else if (timeDeltaMs < -1.2) {
    direction = 'forward'; // Incoming track is lagging behind -> push forward
  }

  // Pitch bend micro-adjustment
  const pitchBendPercent =
    Math.abs(tempoDeltaBpm) > 0.02
      ? Math.round((Math.abs(tempoDeltaBpm) / fromBpm) * 100 * 100) / 100
      : 0;

  // Warning Message
  let driftWarningMessage = '';
  if (absDelta >= 14) {
    driftWarningMessage = `Achtung: Akute Kaskaden-Flammbildung (${absDelta} ms). Transienten überlappen als Doppel-Kick!`;
  } else if (barsUntilFlam <= 12) {
    driftWarningMessage = `Tempo-Differenz (${tempoDeltaBpm > 0 ? '+' : ''}${tempoDeltaBpm} BPM): Beats driften bis Bar ${barsUntilFlam} hörbar auseinander.`;
  } else if (absDelta >= 6) {
    driftWarningMessage = `Phasenversatz (${timeDeltaMs > 0 ? '+' : ''}${timeDeltaMs} ms) führt zu Druckverlust im Bassbereich.`;
  } else {
    driftWarningMessage = 'Phase stabil im Toleranzbereich (<4 ms). Kein Drift-Risiko.';
  }

  // Hardware Jog Wheel & Pitch Instruction
  let hardwareCorrection = '';
  if (direction === 'in-sync') {
    hardwareCorrection = 'CDJ-3000 / DJM: Transienten perfekt synchron. Keine Jog-Korrektur notwendig.';
  } else if (direction === 'forward') {
    hardwareCorrection = `CDJ Jog-Wheel: +${jogTicks} ${
      jogTicks === 1 ? 'Klick' : 'Klicks'
    } nach VORNE anschieben. ${
      pitchBendPercent > 0.05
        ? `Pitch-Fader um +${pitchBendPercent}% anpassen, um Dauertempo anzugleichen.`
        : ''
    }`;
  } else {
    hardwareCorrection = `CDJ Jog-Wheel: -${jogTicks} ${
      jogTicks === 1 ? 'Klick' : 'Klicks'
    } nach HINTEN bremsen. ${
      pitchBendPercent > 0.05
        ? `Pitch-Fader um -${pitchBendPercent}% verlangsamen, um Drift zu stoppen.`
        : ''
    }`;
  }

  // Low-End Sub Cancellation Warning
  let phaseCancellationWarning: string | undefined;
  if (subRisk === 'severe') {
    phaseCancellationWarning =
      'Destruktive Sub-Phasenauslöschung (~60-90Hz)! Die Kicks löschen sich gegenseitig aus. Empfehlung: Den Low-EQ auf Deck B vollständig cutten (-inf dB) bis zum Drop.';
  } else if (subRisk === 'moderate') {
    phaseCancellationWarning =
      'Kammfilter-Interferenz im Oberbass. Für maximalen Punch Low-Pass Filter auf Deck A langsam schließen.';
  }

  return {
    direction,
    offsetMs: timeDeltaMs,
    jogWheelTicks: direction === 'in-sync' ? 0 : jogTicks,
    pitchBendPercent,
    driftWarningMessage,
    hardwareCorrection,
    phaseCancellationWarning
  };
}

/**
 * Recomputes the entire Phase Sync analysis when a DJ applies an interactive virtual jog-wheel nudge
 */
export function simulateNudge(base: PhaseSyncAnalysis, manualNudgeMs: number): PhaseSyncAnalysis {
  const newOffset = Math.round((base.timeDeltaMs + manualNudgeMs) * 10) / 10;
  const kickPeriodMs = 16.1;
  const cycleOffset = Math.abs(newOffset) % kickPeriodMs;
  let phaseAngleDeg = Math.round((cycleOffset / kickPeriodMs) * 360);
  if (phaseAngleDeg > 180) phaseAngleDeg = 360 - phaseAngleDeg;

  const baseCoherence = Math.max(10, Math.round(100 - (phaseAngleDeg / 180) * 85 - Math.abs(newOffset) * 0.4));
  const phaseCoherenceScore = Math.min(100, Math.max(15, baseCoherence));

  const flamThresholdMs = base.flamThresholdMs;
  const absOffset = Math.abs(newOffset);
  const effectiveDriftRate = Math.max(0.15, Math.abs(base.driftRateMsPerBar));

  let barsUntilFlam: number;
  if (absOffset >= flamThresholdMs) {
    barsUntilFlam = 0;
  } else {
    barsUntilFlam = Math.max(1, Math.round((flamThresholdMs - absOffset) / effectiveDriftRate));
  }

  let driftRisk: PhaseDriftRisk = 'locked';
  if (absOffset >= flamThresholdMs || barsUntilFlam <= 6) {
    driftRisk = 'critical-flam';
  } else if (absOffset >= 8.0 || barsUntilFlam <= 16 || Math.abs(base.tempoDeltaBpm) >= 0.2) {
    driftRisk = 'drift-prone';
  } else if (absOffset >= 3.5 || barsUntilFlam <= 32 || Math.abs(base.tempoDeltaBpm) >= 0.1) {
    driftRisk = 'mild-drift';
  } else {
    driftRisk = 'locked';
  }

  let subPhaseCancellationRisk: 'minimal' | 'moderate' | 'severe' = 'minimal';
  if (phaseAngleDeg >= 115 || (absOffset >= 6 && absOffset <= 12)) {
    subPhaseCancellationRisk = 'severe';
  } else if (phaseAngleDeg >= 55 || (absOffset >= 3.5 && absOffset <= 15)) {
    subPhaseCancellationRisk = 'moderate';
  }

  const waveformAlignment = computeWaveformAlignmentData(newOffset);

  const forecastBars = [1, 4, 8, 16, 24, 32, 48, 64];
  const driftForecast = forecastBars.map((bar) => {
    const cumulativeDrift = Math.round((newOffset + (bar - 1) * base.driftRateMsPerBar) * 10) / 10;
    const absDrift = Math.abs(cumulativeDrift);

    let status: 'locked' | 'acceptable' | 'flamming' | 'trainwreck' = 'locked';
    if (absDrift < 4.5) status = 'locked';
    else if (absDrift < 11.0) status = 'acceptable';
    else if (absDrift < 22.0) status = 'flamming';
    else status = 'trainwreck';

    const normalizedMod = absDrift % kickPeriodMs;
    const combPercent = Math.min(100, Math.round(Math.sin((normalizedMod / kickPeriodMs) * Math.PI) * 100));

    return {
      bar,
      timeSeconds: (bar - 1) * 1.7,
      driftMs: cumulativeDrift,
      status,
      combCancellationPercent: combPercent
    };
  });

  const nudgeAdvice = generateNudgeAdvice(
    newOffset,
    base.tempoDeltaBpm,
    base.driftRateMsPerBar,
    barsUntilFlam,
    subPhaseCancellationRisk,
    140
  );

  const updatedAnalysis: PhaseSyncAnalysis = {
    ...base,
    isDriftProne: driftRisk === 'drift-prone' || driftRisk === 'critical-flam',
    driftRisk,
    phaseCoherenceScore,
    timeDeltaMs: newOffset,
    phaseAngleDeg,
    barsUntilFlam,
    subPhaseCancellationRisk,
    waveformAlignment,
    driftForecast,
    nudgeAdvice
  };

  // Recompute 32-bar drift heatmap reflecting nudge simulation
  const mockTransition: TransitionItem = {
    id: 'simulated',
    timestamp: 0,
    duration: 32,
    qualityScore: 90,
    phaseScore: 90,
    harmonicScore: 90,
    eqClashRisk: 'low',
    fromKey: '8A',
    toKey: '8A',
    fromBpm: 140,
    toBpm: 140 + base.tempoDeltaBpm,
    notes: '',
    type: 'seamless-blend'
  };

  updatedAnalysis.barDriftHeatmap = generate32BarDriftHeatmap(mockTransition, updatedAnalysis);

  return updatedAnalysis;
}

/**
 * Computes a detailed 32-bar drift heatmap for a transition.
 * Breaks down the 32 bars into 4 musical phrases (8 bars each),
 * calculates exact transient offset and phase cancellation at each bar,
 * and identifies specific segments where drift spikes into flam/cancellation territory.
 */
export function generate32BarDriftHeatmap(
  transition: TransitionItem,
  analysis: PhaseSyncAnalysis
): Transition32BarDriftMap {
  const fromBpm = transition.fromBpm || 140;
  const barDurationSec = (60 / fromBpm) * 4;
  const kickPeriodMs = 16.1; // ~62Hz techno kick wave cycle
  const flamThresholdMs = analysis.flamThresholdMs || 14.0;
  const initialOffset = analysis.timeDeltaMs;
  const driftRate = analysis.driftRateMsPerBar;

  const phraseNames = [
    'Intro Blend (Layering)',
    'Groove Build (Mid EQ Swap)',
    'Kick & Bass Swap (Critical Clash Zone)',
    'Outro Bleed (Deck A Roll-Off)'
  ];

  const bars: BarDriftHeatmapCell[] = [];
  let maxAbsDrift = 0;
  let peakBar = 1;
  let peakDriftSigned = initialOffset;
  let sumDriftKickSwap = 0;
  let countKickSwap = 0;
  let totalAbsDrift = 0;

  for (let b = 1; b <= 32; b++) {
    const phraseIndex = Math.min(3, Math.floor((b - 1) / 8));
    const phraseName = phraseNames[phraseIndex];
    const timeOffsetSec = Math.round((b - 1) * barDurationSec * 10) / 10;
    const timestamp = Math.round((transition.timestamp + timeOffsetSec) * 10) / 10;

    // Linear drift accumulation from beat drift
    let drift = initialOffset + (b - 1) * driftRate;

    // In phrase 2 (bars 17-24, Kick & Bass Swap), phase sensitivity is amplified acoustically
    // if there is non-zero offset because both kicks are physically overlapping in the blend.
    if (phraseIndex === 2 && Math.abs(drift) > 4.5) {
      const phaseTension = Math.sin(((b - 17) / 8) * Math.PI) * 1.5;
      drift += (drift >= 0 ? 1 : -1) * phaseTension;
    }

    drift = Math.round(drift * 10) / 10;
    const absDrift = Math.abs(drift);
    totalAbsDrift += absDrift;

    if (absDrift > maxAbsDrift) {
      maxAbsDrift = absDrift;
      peakBar = b;
      peakDriftSigned = drift;
    }

    if (phraseIndex === 2) {
      sumDriftKickSwap += absDrift;
      countKickSwap++;
    }

    // Severity rating
    let driftSeverity: 'locked' | 'safe' | 'caution' | 'warning' | 'critical-spike' = 'locked';
    if (absDrift < 3.5) {
      driftSeverity = 'locked';
    } else if (absDrift < 7.0) {
      driftSeverity = 'safe';
    } else if (absDrift < 11.0) {
      driftSeverity = 'caution';
    } else if (absDrift < flamThresholdMs) {
      driftSeverity = 'warning';
    } else {
      driftSeverity = 'critical-spike';
    }

    // Normalized intensity between 0.05 (in sync) to 1.0 (severe flam)
    const intensity = Math.min(1.0, Math.max(0.06, absDrift / 22.0));

    // Comb filter cancellation calculation
    const mod = absDrift % kickPeriodMs;
    const combCancellationPercent = Math.min(100, Math.round(Math.sin((mod / kickPeriodMs) * Math.PI) * 100));
    let combNotchHz: number | undefined;
    if (absDrift >= 2.0) {
      combNotchHz = Math.round(1000 / (2 * absDrift));
    }

    // Acoustic risk note
    let acousticRiskNote = 'Perfektes Transienten-Alignment; druckvoller Punch.';
    if (absDrift >= flamThresholdMs) {
      acousticRiskNote = `Kritischer Flam-Effekt (${drift > 0 ? '+' : ''}${drift}ms): Hörbarer Doppel-Kick & Timing-Verwaschung.`;
    } else if (absDrift >= 11.0) {
      acousticRiskNote = `Hohes Drift-Risiko: Subbass-Druckverlust bei ${combNotchHz ? combNotchHz + 'Hz' : '60Hz'}.`;
    } else if (absDrift >= 7.0) {
      acousticRiskNote = 'Spürbarer Versatz: Kick-Attack verliert Definition.';
    } else if (absDrift >= 3.5) {
      acousticRiskNote = 'Leichter Phasenschlupf: Tolerabler Techno-Groove.';
    }

    // Mark as spike if it crosses flam threshold or is in kick-swap clash with >7.5ms drift
    const isSpike = absDrift >= flamThresholdMs || (phraseIndex === 2 && absDrift >= 8.0) || absDrift >= 12.0;

    bars.push({
      bar: b,
      phraseIndex,
      phraseName,
      timeOffsetSec,
      timestamp,
      driftMs: drift,
      absDriftMs: absDrift,
      driftSeverity,
      intensity,
      isSpike,
      combCancellationPercent,
      combNotchHz,
      acousticRiskNote
    });
  }

  // Detect contiguous spike segments
  const spikeSegments: DriftSpikeSegment[] = [];
  let currentSegment: { start: number; end: number; peak: number; peakBar: number } | null = null;

  for (let i = 0; i < bars.length; i++) {
    const cell = bars[i];
    if (cell.isSpike) {
      if (!currentSegment) {
        currentSegment = {
          start: cell.bar,
          end: cell.bar,
          peak: cell.absDriftMs,
          peakBar: cell.bar
        };
      } else {
        currentSegment.end = cell.bar;
        if (cell.absDriftMs > currentSegment.peak) {
          currentSegment.peak = cell.absDriftMs;
          currentSegment.peakBar = cell.bar;
        }
      }
    } else {
      if (currentSegment) {
        if (currentSegment.end - currentSegment.start >= 1 || currentSegment.peak >= flamThresholdMs) {
          pushSpikeSegment(currentSegment, bars, spikeSegments, flamThresholdMs);
        }
        currentSegment = null;
      }
    }
  }

  if (currentSegment) {
    pushSpikeSegment(currentSegment, bars, spikeSegments, flamThresholdMs);
  }

  // Helper to construct spike segment details
  function pushSpikeSegment(
    seg: { start: number; end: number; peak: number; peakBar: number },
    allBars: BarDriftHeatmapCell[],
    out: DriftSpikeSegment[],
    thresholdMs: number
  ) {
    const startPhrase = allBars[seg.start - 1]?.phraseName || '';
    const endPhrase = allBars[seg.end - 1]?.phraseName || '';
    const uniquePhrases = Array.from(new Set([startPhrase, endPhrase]));
    const isCritical = seg.peak >= thresholdMs;
    const peakCell = allBars[seg.peakBar - 1];
    const peakSigned = peakCell ? peakCell.driftMs : seg.peak;

    let desc = '';
    if (seg.start <= 24 && seg.end >= 17) {
      desc = `Kick-Swap Drift-Spike (Bars ${seg.start}–${seg.end}): Bis zu ${peakSigned > 0 ? '+' : ''}${peakSigned}ms Versatz führen zu deutlichem Subbass-Druckverlust.`;
    } else if (isCritical) {
      desc = `Akustischer Flam-Spike (Bars ${seg.start}–${seg.end}): Kicks trennen sich hörbar um ${peakSigned > 0 ? '+' : ''}${peakSigned}ms (Doppel-Kick).`;
    } else {
      desc = `Erhöhter Phasenversatz in Bars ${seg.start}–${seg.end} (Peak: ${peakSigned > 0 ? '+' : ''}${peakSigned}ms).`;
    }

    const nudgeTicks = Math.max(1, Math.round(Math.abs(peakSigned) / 4.5));
    const direction = peakSigned > 0 ? 'zurückbremsen' : 'anschieben';
    const recAction = `Jog-Wheel vor Bar ${seg.start} um ca. ${nudgeTicks} Tick(s) ${direction} (${peakSigned > 0 ? '-' : '+'}${Math.abs(peakSigned)}ms).`;

    out.push({
      startBar: seg.start,
      endBar: seg.end,
      peakDriftMs: peakSigned,
      peakBar: seg.peakBar,
      phraseNames: uniquePhrases,
      severity: isCritical ? 'critical' : 'warning',
      description: desc,
      recommendedAction: recAction
    });
  }

  // Determine overall status
  let overallStatus: 'locked' | 'moderate-drift' | 'severe-spike' = 'locked';
  if (spikeSegments.some((s) => s.severity === 'critical') || maxAbsDrift >= flamThresholdMs) {
    overallStatus = 'severe-spike';
  } else if (spikeSegments.length > 0 || maxAbsDrift >= 7.5) {
    overallStatus = 'moderate-drift';
  }

  const kickSwapAvg = countKickSwap > 0 ? Math.round((sumDriftKickSwap / countKickSwap) * 10) / 10 : 0;
  const averageDriftMs = Math.round((totalAbsDrift / bars.length) * 10) / 10;

  // Find first bar where flam occurs
  const firstFlamBar = bars.find((b) => b.absDriftMs >= flamThresholdMs)?.bar || null;

  return {
    bars,
    maxDriftMs: Math.round(peakDriftSigned * 10) / 10,
    peakDriftBar: peakBar,
    spikeSegments,
    barsUntilAudibleFlam: firstFlamBar,
    overallStatus,
    kickSwapZoneDrift: kickSwapAvg,
    averageDriftMs
  };
}
