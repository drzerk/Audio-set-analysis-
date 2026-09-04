import {
  TransitionItem,
  TransitionEqAdvice,
  EqCutRecommendation,
  HardwareMixerType
} from '../types';
import { parseCamelotKey, getCamelotDelta } from './harmonicEnergyClashDetector';

// Fundamental frequency map for Camelot keys (in Hz, 1st/2nd/3rd octave fundamentals)
interface KeyAcoustics {
  rootHz: number;
  harmonics: number[]; // [f0, 2f0, 3f0, 4f0, minor3rd, fifth]
  noteName: string;
}

const CAMELOT_ACOUSTICS: Record<string, KeyAcoustics> = {
  // Minor Keys (A)
  '1A': { rootHz: 51.9, harmonics: [51.9, 103.8, 207.6, 415.3, 123.5, 155.6], noteName: 'G#-Moll' },
  '2A': { rootHz: 38.9, harmonics: [38.9, 77.8, 155.6, 311.1, 92.5, 116.5], noteName: 'D#-Moll' },
  '3A': { rootHz: 58.3, harmonics: [58.3, 116.5, 233.1, 466.2, 138.6, 174.6], noteName: 'B-Moll (A#m)' },
  '4A': { rootHz: 43.7, harmonics: [43.7, 87.3, 174.6, 349.2, 103.8, 130.8], noteName: 'F-Moll' },
  '5A': { rootHz: 65.4, harmonics: [65.4, 130.8, 261.6, 523.3, 155.6, 196.0], noteName: 'C-Moll' },
  '6A': { rootHz: 49.0, harmonics: [49.0, 98.0, 196.0, 392.0, 116.5, 146.8], noteName: 'G-Moll' },
  '7A': { rootHz: 36.7, harmonics: [36.7, 73.4, 146.8, 293.7, 87.3, 110.0], noteName: 'D-Moll' },
  '8A': { rootHz: 55.0, harmonics: [55.0, 110.0, 220.0, 440.0, 130.8, 164.8], noteName: 'A-Moll' },
  '9A': { rootHz: 41.2, harmonics: [41.2, 82.4, 164.8, 329.6, 98.0, 123.5], noteName: 'E-Moll' },
  '10A': { rootHz: 61.7, harmonics: [61.7, 123.5, 246.9, 493.9, 146.8, 185.0], noteName: 'H-Moll (Bm)' },
  '11A': { rootHz: 46.2, harmonics: [46.2, 92.5, 185.0, 370.0, 110.0, 138.6], noteName: 'F#-Moll' },
  '12A': { rootHz: 69.3, harmonics: [69.3, 138.6, 277.2, 554.4, 164.8, 207.6], noteName: 'C#-Moll' },

  // Major Keys (B)
  '1B': { rootHz: 61.7, harmonics: [61.7, 123.5, 246.9, 493.9, 155.6, 185.0], noteName: 'H-Dur' },
  '2B': { rootHz: 46.2, harmonics: [46.2, 92.5, 185.0, 370.0, 116.5, 138.6], noteName: 'F#-Dur' },
  '3B': { rootHz: 69.3, harmonics: [69.3, 138.6, 277.2, 554.4, 174.6, 207.6], noteName: 'C#-Dur' },
  '4B': { rootHz: 51.9, harmonics: [51.9, 103.8, 207.6, 415.3, 130.8, 155.6], noteName: 'G#-Dur' },
  '5B': { rootHz: 38.9, harmonics: [38.9, 77.8, 155.6, 311.1, 98.0, 116.5], noteName: 'D#-Dur' },
  '6B': { rootHz: 58.3, harmonics: [58.3, 116.5, 233.1, 466.2, 146.8, 174.6], noteName: 'B-Dur (A#)' },
  '7B': { rootHz: 43.7, harmonics: [43.7, 87.3, 174.6, 349.2, 110.0, 130.8], noteName: 'F-Dur' },
  '8B': { rootHz: 65.4, harmonics: [65.4, 130.8, 261.6, 523.3, 164.8, 196.0], noteName: 'C-Dur' },
  '9B': { rootHz: 49.0, harmonics: [49.0, 98.0, 196.0, 392.0, 123.5, 146.8], noteName: 'G-Dur' },
  '10B': { rootHz: 36.7, harmonics: [36.7, 73.4, 146.8, 293.7, 92.5, 110.0], noteName: 'D-Dur' },
  '11B': { rootHz: 55.0, harmonics: [55.0, 110.0, 220.0, 440.0, 138.6, 164.8], noteName: 'A-Dur' },
  '12B': { rootHz: 41.2, harmonics: [41.2, 82.4, 164.8, 329.6, 103.8, 123.5], noteName: 'E-Dur' }
};

export function getKeyAcoustics(rawKey: string): KeyAcoustics {
  const parsed = parseCamelotKey(rawKey);
  const camelotCode = `${parsed.num}${parsed.mode}`;
  return (
    CAMELOT_ACOUSTICS[camelotCode] || {
      rootHz: 55.0,
      harmonics: [55.0, 110.0, 220.0, 440.0, 130.8, 164.8],
      noteName: 'A-Moll (Fallback)'
    }
  );
}

/**
 * Generates surgical, actionable EQ cut recommendations and mud reduction strategies
 * based on the harmonic overlap of a transition.
 */
export function generateTransitionEqAdvice(transition: TransitionItem): TransitionEqAdvice {
  const fromKeyParsed = parseCamelotKey(transition.fromKey);
  const toKeyParsed = parseCamelotKey(transition.toKey);

  const fromCode = `${fromKeyParsed.num}${fromKeyParsed.mode}`;
  const toCode = `${toKeyParsed.num}${toKeyParsed.mode}`;

  const fromAcoustics = getKeyAcoustics(fromCode);
  const toAcoustics = getKeyAcoustics(toCode);

  const camelotDist = getCamelotDelta(transition.fromKey, transition.toKey).absDistance;

  // 1. Determine Mud Risk Index (0 - 100)
  // Factors: blend duration (longer = more cumulative mud), eqClashRisk, camelot distance, bass overlap
  let mudRiskIndex = 40;

  if (transition.duration >= 45) mudRiskIndex += 18;
  else if (transition.duration >= 30) mudRiskIndex += 10;

  if (transition.eqClashRisk === 'high') mudRiskIndex += 26;
  else if (transition.eqClashRisk === 'medium') mudRiskIndex += 14;

  if (camelotDist >= 3) mudRiskIndex += 20; // Dissonant harmonics generate intermodulation distortion & beating
  else if (camelotDist === 0) mudRiskIndex += 12; // Identical key = identical fundamentals clashing 1:1

  mudRiskIndex = Math.min(98, Math.max(15, mudRiskIndex));

  const mudRiskLevel: TransitionEqAdvice['mudRiskLevel'] =
    mudRiskIndex >= 75 ? 'severe' : mudRiskIndex >= 55 ? 'high' : mudRiskIndex >= 35 ? 'moderate' : 'minimal';

  // 2. Identify Resonant Harmonic Collision & Primary Mud Frequency
  // Compare 2nd and 3rd harmonics in the 120 - 320 Hz boxiness region
  const hFromLowMid = fromAcoustics.harmonics[2] || 220; // 2nd overtone (~220Hz)
  const hToLowMid = toAcoustics.harmonics[2] || 165;

  const targetMudCenterHz = Math.round((hFromLowMid + hToLowMid) / 2);
  const beatDiffHz = Math.abs(hFromLowMid - hToLowMid);
  const primaryMudZoneHz = `${Math.min(hFromLowMid, hToLowMid) - 25} - ${Math.max(hFromLowMid, hToLowMid) + 25} Hz`;

  const fundamentalCollision =
    camelotDist === 0
      ? `Phasen-Doppelung auf Grundton (${fromAcoustics.rootHz.toFixed(1)} Hz) und 2. Harmonische (${hFromLowMid.toFixed(0)} Hz). Hohes Risiko von Phasenauslöschung!`
      : beatDiffHz < 25
      ? `Intermodulations-Schwebung von ${beatDiffHz.toFixed(1)} Hz zwischen ${fromCode} (${hFromLowMid.toFixed(0)} Hz) und ${toCode} (${hToLowMid.toFixed(0)} Hz) erzeugt Low-Mid Wummern.`
      : `Harmonische Dissonanz (${camelotDist} Camelot-Schritte): Bass-Obertöne überlagern sich im Bereich ${primaryMudZoneHz}.`;

  // 3. Formulate Specific Surgical EQ Cuts
  const recommendedCuts: EqCutRecommendation[] = [];

  // CUT 1: Sub / Kick Low-End Management (Crucial for Techno)
  recommendedCuts.push({
    id: `cut-sub-${transition.id}`,
    band: 'sub-low',
    targetTrack: 'incoming',
    filterType: 'hpf',
    centerFrequencyHz: 85,
    bandwidthQ: 1.0,
    cutGainDb: -24,
    priority: 'critical',
    targetMudIssue: `Kick-Rumble & Subbass-Kollision (< 90 Hz, ${fromAcoustics.rootHz.toFixed(0)} Hz vs. ${toAcoustics.rootHz.toFixed(0)} Hz)`,
    actionSummary: 'Aktiviere High-Pass-Filter (HPF) bei 85 Hz auf Track B während des Einblendens; Low-Kill auf Track A beim Drop.',
    hardwareKnobSettings: {
      xone96: {
        knob: 'CH2 HPF Filter',
        position: '9:00 Uhr (ca. 85 Hz)',
        action: 'Filter ON, Resonanz auf MIN; Track 1 LOW Kill (-30 dB) schlagartig bei Bar 33'
      },
      djm900: {
        knob: 'Color FX FILTER (CH 2)',
        position: '9:30 Uhr (HPF Modus)',
        action: 'Isolator LOW (CH 2) auf -inf bis zum Drop; dann Swap mit CH 1 LOW'
      },
      djmV10: {
        knob: 'CH2 HPF / LOW Isolator',
        position: 'Isolator LOW ganz links (-inf)',
        action: 'Halte Subbass komplett isoliert; Kick-Swap exakt auf Eins des Hauptteils'
      },
      parametric: {
        freq: '85 Hz',
        gain: '-24 dB (HPF 24dB/Okt)',
        q: '0.71 (Butterworth)'
      }
    }
  });

  // CUT 2: Resonant Low-Mid "Boxiness" & Mud Notch (160 - 280 Hz)
  const cutDepthLowMid = mudRiskIndex > 70 ? -5.5 : -3.8;
  recommendedCuts.push({
    id: `cut-lowmid-${transition.id}`,
    band: 'low-mid',
    targetTrack: 'outgoing',
    filterType: 'bell-cut',
    centerFrequencyHz: targetMudCenterHz,
    bandwidthQ: 2.2,
    cutGainDb: cutDepthLowMid,
    priority: 'critical',
    targetMudIssue: `Low-Mid Matsch & Bassline-Resonanz um ${targetMudCenterHz} Hz (${fromCode} vs ${toCode})`,
    actionSummary: `Senke ${targetMudCenterHz} Hz um ${cutDepthLowMid} dB am Lo-Mid Band des auslaufenden Tracks ab.`,
    hardwareKnobSettings: {
      xone96: {
        knob: 'CH1 LO-MID (Parametrisch)',
        position: 'Gain auf 10:00 Uhr (-4.5 dB), Freq-Poti auf ca. 240 Hz',
        action: 'Zieht den dröhnenden Resonanzbauch aus Track A und schafft Platz für Track B'
      },
      djm900: {
        knob: 'CH1 MID EQ',
        position: '10:30 Uhr (-3.5 dB)',
        action: 'Leichtes Zurückdrehen des Mittenbands verhindert Brei im Überblendbereich'
      },
      djmV10: {
        knob: 'CH1 LOW-MID',
        position: '10:00 Uhr (-4.0 dB)',
        action: 'Spezifisches LOW-MID Band des V10 fängt exakt die 200-400 Hz Zone auf'
      },
      parametric: {
        freq: `${targetMudCenterHz} Hz`,
        gain: `${cutDepthLowMid} dB`,
        q: '2.2 (Gezielter Bell-Cut)'
      }
    }
  });

  // CUT 3: Mid-Range Masking (500 - 850 Hz) for Synth & Clap Space
  recommendedCuts.push({
    id: `cut-mid-${transition.id}`,
    band: 'mid',
    targetTrack: 'incoming',
    filterType: 'bell-cut',
    centerFrequencyHz: 620,
    bandwidthQ: 1.4,
    cutGainDb: -3.0,
    priority: 'recommended',
    targetMudIssue: 'Mitten-Verdeckung (Synth-Leads, Percussion & Clap-Körper)',
    actionSummary: 'Dämpfe 620 Hz um -3 dB auf Track B, damit Track A Lead-Sounds sauber ausklingen können.',
    hardwareKnobSettings: {
      xone96: {
        knob: 'CH2 HI-MID',
        position: '11:00 Uhr (-2.5 dB)',
        action: 'Hält die Gesang/Synth-Präsenz von Track A transparent'
      },
      djm900: {
        knob: 'CH2 MID EQ',
        position: '11:00 Uhr (-2.0 dB)',
        action: 'Verhindert Mitten-Stauung vor der eigentlichen Übergabe'
      },
      djmV10: {
        knob: 'CH2 HI-MID',
        position: '11:00 Uhr (-2.5 dB)',
        action: 'Sanfte Absenkung des oberen Mittenbands'
      },
      parametric: {
        freq: '620 Hz',
        gain: '-3.0 dB',
        q: '1.4'
      }
    }
  });

  // CUT 4: High-End Transients Phasing (Hi-Hats & Ride Cymbals)
  if (transition.duration >= 30) {
    recommendedCuts.push({
      id: `cut-high-${transition.id}`,
      band: 'high-mid',
      targetTrack: 'incoming',
      filterType: 'high-shelf',
      centerFrequencyHz: 6500,
      bandwidthQ: 0.8,
      cutGainDb: -2.5,
      priority: 'optional',
      targetMudIssue: 'Hi-Hat Phasen-Kammfilter & Zischeln bei doppelten 909-Beats',
      actionSummary: 'Track B HI-Poti bis zum Drop auf 11 Uhr halten, um Phasing der Becken zu verhindern.',
      hardwareKnobSettings: {
        xone96: {
          knob: 'CH2 HIGH EQ',
          position: '11:00 Uhr (-2.5 dB)',
          action: 'Erst beim Kick-Swap oder Takt 17 sanft auf 12:00 Uhr öffnen'
        },
        djm900: {
          knob: 'CH2 HI EQ',
          position: '11:00 Uhr (-2.0 dB)',
          action: 'Verhindert zischelnde Phasenlöcher zwischen zwei offenen Hi-Hats'
        },
        djmV10: {
          knob: 'CH2 HI EQ',
          position: '11:00 Uhr (-2.0 dB)',
          action: 'Sanftes Höhen-Bedampfen'
        },
        parametric: {
          freq: '6.5 kHz',
          gain: '-2.5 dB (High Shelf)',
          q: '0.8'
        }
      }
    });
  }

  // 4. Actionable Mix Choreography (Phased Bar-by-Bar Steps)
  const mixChoreography = [
    {
      phase: 'Phase 1: Einleitung (Bars 1 - 16)',
      bars: 'Takt 1 - 16',
      action: 'Track B einfahren mit aktivem Bass-Kill oder HPF bei 90 Hz. Hi-Hat leicht gedämpft.',
      eqMove: 'Track B: LOW = -inf, LO-MID = 11 Uhr, HI = 11 Uhr. Track A: Linear bei 12 Uhr.'
    },
    {
      phase: 'Phase 2: Harmonischer Carve (Bars 17 - 32)',
      bars: 'Takt 17 - 32',
      action: `Matsch-Entzerrung: Zupfe den dröhnenden ${targetMudCenterHz} Hz Resonanzbauch aus Track A heraus.`,
      eqMove: `Track A: LO-MID auf 10 Uhr (-4.5 dB). Track B: Mitten langsam auf 12 Uhr hochfahren.`
    },
    {
      phase: 'Phase 3: Der Kick-Swap (Bar 33 - Drop)',
      bars: 'Takt 33 (Eins)',
      action: 'Konsequenter Bass-Tausch! Keine Sekunde beide Kicks gleichzeitig bei 100% laufen lassen.',
      eqMove: 'Track A: LOW schlagartig auf -inf (Kill). Track B: HPF Bypass / LOW voll auf 12 Uhr!'
    },
    {
      phase: 'Phase 4: Ausklang (Bars 34 - 48)',
      bars: 'Takt 34 - 48',
      action: 'Track A langsam über HPF oder Fader ausblenden, Reverb-Tail verhallen lassen.',
      eqMove: 'Track A Fader auf 0; Track B EQs alle neutral auf 12:00 Uhr.'
    }
  ];

  // 5. Simulated Spectral Data (for Visualizing the Mud Curve vs. Carved Curve)
  // Frequency steps (logarithmic distribution from 20 Hz to 20 kHz)
  const testFreqs = [
    25, 35, 50, 70, 90, 120, 160, 200, 240, 280, 350, 450, 600, 800, 1100, 1500, 2200, 3200, 4800, 7000, 10000, 15000, 20000
  ];

  const spectralSimulation = testFreqs.map((freq) => {
    // Baseline sound energy from both tracks overlapping
    let track1 = -18 - Math.log10(freq / 20) * 4;
    let track2 = -18 - Math.log10(freq / 20) * 4;

    // Sub bump
    if (freq >= 40 && freq <= 90) {
      track1 += 9;
      track2 += 8.5;
    }

    // Low-mid bump at harmonics
    if (Math.abs(freq - hFromLowMid) < 40) track1 += 6;
    if (Math.abs(freq - hToLowMid) < 40) track2 += 6.5;

    // Raw overlap sum (uncorrected acoustic superposition with severe low-end and mud buildup)
    const rawSumLinear = Math.pow(10, track1 / 20) + Math.pow(10, track2 / 20);
    const rawCombinedDb = 20 * Math.log10(rawSumLinear);

    // Mud accumulation is excessive energy above clean single-track level (+3 to +9 dB)
    let mudAccumulationDb = 0;
    if (freq >= 30 && freq <= 95) {
      mudAccumulationDb = 7.5; // Sub clash
    } else if (freq >= 140 && freq <= 320) {
      mudAccumulationDb = 6.2; // Boxy mud peak
    } else if (freq >= 400 && freq <= 900) {
      mudAccumulationDb = 3.8;
    } else if (freq >= 4000 && freq <= 8000) {
      mudAccumulationDb = 2.4;
    }

    // Carved curve: simulate applying our recommended cuts
    let carvedReduction = 0;
    // HPF cut below 90Hz
    if (freq < 90) {
      carvedReduction += Math.max(0, 7.5 * (1 - freq / 90));
    }
    // Low-mid notch around targetMudCenterHz
    const lowMidDist = Math.abs(freq - targetMudCenterHz);
    if (lowMidDist < 90) {
      carvedReduction += Math.max(0, 5.0 * (1 - lowMidDist / 90));
    }
    // Mid cut around 620Hz
    const midDist = Math.abs(freq - 620);
    if (midDist < 180) {
      carvedReduction += Math.max(0, 2.5 * (1 - midDist / 180));
    }

    const carvedCombinedDb = Math.max(-45, rawCombinedDb - carvedReduction);

    return {
      freqHz: freq,
      rawCombinedDb: Math.round(rawCombinedDb * 10) / 10,
      carvedCombinedDb: Math.round(carvedCombinedDb * 10) / 10,
      mudAccumulationDb: Math.round(mudAccumulationDb * 10) / 10
    };
  });

  return {
    transitionId: transition.id,
    timestamp: transition.timestamp,
    fromKey: transition.fromKey,
    toKey: transition.toKey,
    camelotDistance: camelotDist,
    fromKeyRootHz: fromAcoustics.rootHz,
    toKeyRootHz: toAcoustics.rootHz,
    mudRiskIndex,
    mudRiskLevel,
    primaryMudZoneHz,
    fundamentalCollision,
    recommendedCuts,
    mixChoreography,
    spectralSimulation
  };
}
