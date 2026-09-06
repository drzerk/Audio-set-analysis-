import {
  TrackLibraryItem,
  AutoMixSuggestion,
  AutoMixGoal,
  TechnoSetAnalysis
} from '../types';
import { parseCamelotKey, getCamelotDelta } from './harmonicEnergyClashDetector';

export interface AutoMixContext {
  currentKey: string; // e.g. "8A"
  currentBpm: number; // e.g. 142.0
  currentEnergy: number; // e.g. 85
  goal: AutoMixGoal;
  searchQuery?: string;
  filterSubgenre?: string;
  maxResults?: number;
}

/**
 * Evaluates a single candidate track against the current playback/set context
 * and produces a detailed, ranked Auto-Mix recommendation.
 */
export function evaluateTrackForNextTransition(
  track: TrackLibraryItem,
  context: AutoMixContext
): AutoMixSuggestion {
  const { currentKey, currentBpm, currentEnergy, goal } = context;

  // 1. Harmonic Analysis & Camelot Proximity
  const fromParsed = parseCamelotKey(currentKey);
  const toParsed = parseCamelotKey(track.keyCamelot);
  const delta = getCamelotDelta(currentKey, track.keyCamelot);

  let harmonicScore = 70;
  let harmonicType: AutoMixSuggestion['harmonicMatch']['type'] = 'exact-match';
  let harmonicTypeLabel = '';
  let harmonicDesc = '';

  if (delta.isSameKey) {
    harmonicType = 'exact-match';
    harmonicScore = 100;
    harmonicTypeLabel = `Harmonic Lock (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Identische Tonart: Perfekter, unendlicher Bassline-Layering-Blend ohne die geringste tonale Reibung.';
  } else if (!delta.isModeChange && delta.stepDelta === 1) {
    harmonicType = 'energy-lift';
    harmonicScore = 96;
    harmonicTypeLabel = `+1 Energy Lift (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Quintensprung (+1 auf Camelot-Rad): Steigert die gefühlte harmonische Helligkeit & Treibkraft optimal.';
  } else if (!delta.isModeChange && delta.stepDelta === -1) {
    harmonicType = 'deep-grounding';
    harmonicScore = 92;
    harmonicTypeLabel = `-1 Deep Grounding (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Quartenschritt (-1): Lässt den Groove tiefer, dunkler und wuchtiger wirken; ideal zur Spannungsstabilisierung.';
  } else if (delta.isModeChange && fromParsed.num === toParsed.num) {
    harmonicType = 'relative-swap';
    harmonicScore = 90;
    harmonicTypeLabel = `Paralleler Dur/Moll-Tausch (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Gleiche Grundtöne, anderer Modus: Schafft einen emotionalen, cineastischen Raumwechsel.';
  } else if (delta.stepDelta === 7 || delta.stepDelta === -5) {
    harmonicType = 'semitone-surge';
    harmonicScore = 80;
    harmonicTypeLabel = `+1 Halbton Surge (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Halbton-Modulation: Extrem energiereicher Überraschungsmoment für ekstatische Peak-Time Drops.';
  } else if (delta.isModeChange && Math.abs(delta.stepDelta) === 1) {
    harmonicType = 'diagonal-warmth';
    harmonicScore = 85;
    harmonicTypeLabel = `Diagonale Modulation (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Diagonaler Schritt auf dem Camelot-Rad: Warmer, fließender klanglicher Farbwechsel.';
  } else if (!delta.isModeChange && Math.abs(delta.stepDelta) === 2) {
    harmonicType = 'dissonant-tension';
    harmonicScore = 72;
    harmonicTypeLabel = `2-Schritt Intervall (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc =
      'Ganzton-Abstand: Erzeugt tonale Reibung; empfohlen für schnelle Übergänge im Breakdown oder Cut-Drop.';
  } else {
    harmonicType = 'dissonant-tension';
    harmonicScore = Math.max(30, Math.round(70 - delta.absDistance * 7));
    harmonicTypeLabel = `Harmonische Dissonanz (${currentKey} → ${track.keyCamelot})`;
    harmonicDesc = `Großer Tonartenabstand (${delta.absDistance} Schritte): Erfordert harten Cut im Drop oder High-Pass Filter-Fade.`;
  }

  // Goal-specific harmonic weighting
  if (goal === 'energy-lift' && harmonicType === 'energy-lift') {
    harmonicScore = 100;
  } else if (goal === 'hypnotic-flow' && harmonicType === 'exact-match') {
    harmonicScore = 100;
  } else if (goal === 'deep-grounding' && harmonicType === 'deep-grounding') {
    harmonicScore = 100;
  } else if (goal === 'relative-swap' && harmonicType === 'relative-swap') {
    harmonicScore = 100;
  }

  // 2. BPM Matching & Pitch Fader Calculation
  const bpmDelta = Math.round((track.bpm - currentBpm) * 10) / 10;
  const absBpmDelta = Math.abs(bpmDelta);
  const pitchBendPercent = Math.round(((track.bpm - currentBpm) / currentBpm) * 10000) / 100; // e.g. +0.70%
  const absPitchPercent = Math.abs(pitchBendPercent);

  let bpmScore = 80;
  let pitchStatus: AutoMixSuggestion['bpmMatch']['pitchStatus'] = 'exact-pitch';
  let statusLabel = '';
  let cdjPitchFaderAction = '';
  let cdjPitchRange: AutoMixSuggestion['bpmMatch']['cdjPitchRange'] = '±6%';

  if (absBpmDelta <= 0.2) {
    bpmScore = 100;
    pitchStatus = 'exact-pitch';
    statusLabel = 'Exakt 0.0% Pitch (Zero Audio Artefacts)';
    cdjPitchFaderAction = 'Tempo identisch. Pitchfader in Mittelrastung belassen.';
    cdjPitchRange = '±6%';
  } else if (absPitchPercent <= 1.2) {
    bpmScore = 96;
    pitchStatus = 'subtle-bend';
    statusLabel = `Feinjustierung (${pitchBendPercent > 0 ? '+' : ''}${pitchBendPercent.toFixed(2)}%)`;
    cdjPitchFaderAction = `Pitchfader auf ${pitchBendPercent > 0 ? '+' : ''}${pitchBendPercent.toFixed(2)}% justieren (absolut unhörbar).`;
    cdjPitchRange = '±6%';
  } else if (absPitchPercent <= 2.5) {
    bpmScore = 88;
    pitchStatus = 'moderate-shift';
    statusLabel = `Moderater Faderzug (${pitchBendPercent > 0 ? '+' : ''}${pitchBendPercent.toFixed(2)}%)`;
    cdjPitchFaderAction = `Pitchfader auf ${pitchBendPercent > 0 ? '+' : ''}${pitchBendPercent.toFixed(2)}% ziehen. Master Tempo optional.`;
    cdjPitchRange = '±6%';
  } else if (absPitchPercent <= 5.0) {
    bpmScore = 72;
    pitchStatus = 'moderate-shift';
    statusLabel = `Spürbarer Pitch-Shift (${pitchBendPercent > 0 ? '+' : ''}${pitchBendPercent.toFixed(2)}%)`;
    cdjPitchFaderAction = `Pitch-Range auf ±10% schalten. Master Tempo / Keylock zwingend aktivieren.`;
    cdjPitchRange = '±10%';
  } else {
    bpmScore = 48;
    pitchStatus = 'wide-shift';
    statusLabel = `Großer Temposprung (${bpmDelta > 0 ? '+' : ''}${bpmDelta.toFixed(1)} BPM)`;
    cdjPitchFaderAction = `Tempo-Ramp im Breakdown oder Drop-Cut bei ausgeschaltetem Takt notwendig.`;
    cdjPitchRange = '±16%';
  }

  // 3. Energy Trajectory Alignment
  const energyDelta = track.energy - currentEnergy;
  let trajectory: AutoMixSuggestion['energyMatch']['trajectory'] = 'maintain';
  let trajectoryLabel = '';
  let energyScore = 80;

  if (energyDelta >= 5) {
    trajectory = 'escalate';
    trajectoryLabel = `Energie-Steigerung (+${energyDelta}%)`;
    energyScore = goal === 'energy-lift' ? 98 : 88;
  } else if (energyDelta <= -5) {
    trajectory = 'de-escalate';
    trajectoryLabel = `Spannungsabbau (${energyDelta}%)`;
    energyScore = goal === 'deep-grounding' ? 98 : 82;
  } else {
    trajectory = 'maintain';
    trajectoryLabel = `Stabile Plateau-Energie (${track.energy}%)`;
    energyScore = goal === 'hypnotic-flow' ? 100 : 92;
  }

  // 4. Weighted Overall Compatibility Score based on DJ Goal
  let overallScore = 0;
  switch (goal) {
    case 'energy-lift':
      overallScore = harmonicScore * 0.45 + energyScore * 0.35 + bpmScore * 0.2;
      break;
    case 'hypnotic-flow':
      overallScore = harmonicScore * 0.5 + bpmScore * 0.35 + energyScore * 0.15;
      break;
    case 'deep-grounding':
      overallScore = harmonicScore * 0.45 + energyScore * 0.35 + bpmScore * 0.2;
      break;
    case 'relative-swap':
      overallScore = harmonicScore * 0.55 + bpmScore * 0.25 + energyScore * 0.2;
      break;
    case 'balanced':
    default:
      overallScore = harmonicScore * 0.45 + bpmScore * 0.35 + energyScore * 0.2;
      break;
  }

  overallScore = Math.min(100, Math.max(25, Math.round(overallScore)));

  // 5. Transition Strategy Formulation
  let style: AutoMixSuggestion['transitionStrategy']['style'] = 'seamless-blend';
  let recommendedBars: 16 | 32 | 64 = 32;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let eqChoreography = '';
  let djDirectives = '';

  const barSec = (60 / currentBpm) * 4;

  if (harmonicScore >= 90 && absBpmDelta <= 1.8) {
    style = 'seamless-blend';
    recommendedBars = track.subgenre.includes('Hypnotic') || goal === 'hypnotic-flow' ? 64 : 32;
    riskLevel = 'low';
    eqChoreography = `Xone:96 / DJM Kanal 2: Deck B mit HPF bei 120Hz einschleifen. Subbass-Cut an Deck A exakt bei Bar ${
      recommendedBars / 2 + 1
    } ausführen.`;
    djDirectives = `Perfekter Flow-Kandidat. Halte beide Tracks für mindestens ${recommendedBars} Takte im Mix, um maximale Hypnose aufzubauen.`;
  } else if (harmonicScore >= 80 && absBpmDelta <= 3.0) {
    style = 'filter-sweep';
    recommendedBars = 32;
    riskLevel = 'low';
    eqChoreography = `Mid-EQ an Deck A ab Bar 9 leicht dämpfen (-3 dB), um Raum für ${track.artist}'s Groove zu schaffen. Deck B bei Bar 17 voll aufreißen.`;
    djDirectives = `Flüssiger Übergang mit klarer Dynamik. Faderzügige Mitten-Trennung verhindert Matsch im Bereich 200–500 Hz.`;
  } else if (harmonicType === 'semitone-surge' || track.subgenre === 'Hard Techno') {
    style = 'cut-drop';
    recommendedBars = 16;
    riskLevel = 'medium';
    eqChoreography = `Im letzten Takt vor dem Drop Deck A hart killen oder mit 1-Beat Delay auslaufen lassen. Deck B Kick ungedrosselt einschlagen lassen.`;
    djDirectives = `Harter Energie-Cut! Bester Effekt wenn Deck B nach einem dramatischen 16-Bar Snare-Roll ohne Überblendung gedroppt wird.`;
  } else {
    style = 'breakdown-swap';
    recommendedBars = 32;
    riskLevel = absBpmDelta > 4.0 ? 'high' : 'medium';
    eqChoreography = `Nutze den nächsten Breakdown von Deck A. Ziehe das Tempo während der beatlosen Phase sanft auf ${track.bpm} BPM an und starte Deck B.`;
    djDirectives = `Größere Frequenz- oder Temposprünge immer in der kickfreien Zone vollziehen, um rhythmische Stolperer zu vermeiden.`;
  }

  const recommendedDurationSec = Math.round(recommendedBars * barSec);

  return {
    track,
    overallMatchScore: overallScore,
    rank: 1, // populated after sorting
    harmonicMatch: {
      score: harmonicScore,
      type: harmonicType,
      typeLabel: harmonicTypeLabel,
      camelotDelta: delta.stepDelta,
      fromKey: currentKey,
      toKey: track.keyCamelot,
      description: harmonicDesc
    },
    bpmMatch: {
      score: bpmScore,
      fromBpm: currentBpm,
      toBpm: track.bpm,
      bpmDelta,
      pitchBendPercent,
      pitchStatus,
      statusLabel,
      cdjPitchFaderAction,
      cdjPitchRange
    },
    energyMatch: {
      score: energyScore,
      fromEnergy: currentEnergy,
      toEnergy: track.energy,
      energyDelta,
      trajectory,
      trajectoryLabel
    },
    transitionStrategy: {
      style,
      recommendedBars,
      recommendedDurationSec,
      eqChoreography,
      riskLevel,
      djDirectives
    }
  };
}

/**
 * Ranks all available library tracks for the next transition.
 */
export function generateAutoMixSuggestions(
  library: TrackLibraryItem[],
  context: AutoMixContext
): AutoMixSuggestion[] {
  let candidateTracks = [...library];

  // Apply Subgenre filter if specified
  if (context.filterSubgenre && context.filterSubgenre !== 'Alle') {
    candidateTracks = candidateTracks.filter(
      (t) => t.subgenre.toLowerCase() === context.filterSubgenre?.toLowerCase()
    );
  }

  // Apply search query filter if specified
  if (context.searchQuery && context.searchQuery.trim()) {
    const q = context.searchQuery.toLowerCase().trim();
    candidateTracks = candidateTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.label && t.label.toLowerCase().includes(q)) ||
        t.keyCamelot.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }

  // Evaluate each track
  const evaluated = candidateTracks.map((track) =>
    evaluateTrackForNextTransition(track, context)
  );

  // Sort descending by overall match score, then harmonic score
  evaluated.sort((a, b) => {
    if (b.overallMatchScore !== a.overallMatchScore) {
      return b.overallMatchScore - a.overallMatchScore;
    }
    return b.harmonicMatch.score - a.harmonicMatch.score;
  });

  // Assign rankings (1, 2, 3...)
  evaluated.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const maxResults = context.maxResults || 8;
  return evaluated.slice(0, maxResults);
}

/**
 * Helper to determine current harmonic key, BPM, and energy at a given timestamp in a set.
 */
export function extractLivePlaybackContext(
  set: TechnoSetAnalysis,
  currentTimeSec: number
): { key: string; bpm: number; energy: number; timestampFormatted: string } {
  // 1. Current BPM
  let currentBpm = set.bpmAverage || 142.0;
  if (set.bpmPoints && set.bpmPoints.length > 0) {
    const sorted = [...set.bpmPoints].sort((a, b) => a.time - b.time);
    let match = sorted[0].bpm;
    for (let i = 0; i < sorted.length; i++) {
      if (currentTimeSec >= sorted[i].time) {
        match = sorted[i].bpm;
      } else {
        break;
      }
    }
    currentBpm = Math.round(match * 10) / 10;
  }

  // 2. Current Harmonic Key
  let currentKey = set.dominantKey ? set.dominantKey.split(' ')[0] : '8A';
  if (set.harmonyPoints && set.harmonyPoints.length > 0) {
    const sorted = [...set.harmonyPoints].sort((a, b) => a.time - b.time);
    let matchKey = sorted[0].keyCamelot;
    for (let i = 0; i < sorted.length; i++) {
      if (currentTimeSec >= sorted[i].time) {
        matchKey = sorted[i].keyCamelot;
      } else {
        break;
      }
    }
    currentKey = matchKey;
  }

  // 3. Current Energy
  let currentEnergy = 80;
  if (set.energyPoints && set.energyPoints.length > 0) {
    const sorted = [...set.energyPoints].sort((a, b) => a.time - b.time);
    let matchE = sorted[0].energy;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTimeSec >= sorted[i].time && currentTimeSec <= sorted[i + 1].time) {
        const ratio = (currentTimeSec - sorted[i].time) / (sorted[i + 1].time - sorted[i].time || 1);
        matchE = Math.round(sorted[i].energy + ratio * (sorted[i + 1].energy - sorted[i].energy));
        break;
      }
    }
    if (currentTimeSec >= sorted[sorted.length - 1].time) {
      matchE = sorted[sorted.length - 1].energy;
    }
    currentEnergy = matchE;
  }

  const mins = Math.floor(currentTimeSec / 60);
  const secs = Math.floor(currentTimeSec % 60);
  const timestampFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    key: currentKey,
    bpm: currentBpm,
    energy: currentEnergy,
    timestampFormatted
  };
}
