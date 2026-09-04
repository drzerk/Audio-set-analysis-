import {
  TechnoSetAnalysis,
  HarmonicEnergyClashPoint,
  HarmonicEnergyAnalysisResult,
  ClashSeverity,
  ClashType
} from '../types';
import { formatTimeSeconds } from './pdfExport';

// Camelot wheel positions, colors, and classical pitch mappings
export interface CamelotWheelPosition {
  number: number;
  minorKey: string;
  majorKey: string;
  color: string;
  angleDeg: number; // 0 at top (12), 30 for 1, 60 for 2, etc.
}

export const CAMELOT_WHEEL: CamelotWheelPosition[] = [
  { number: 12, minorKey: 'C#m', majorKey: 'E', color: '#10b981', angleDeg: 0 },
  { number: 1, minorKey: 'G#m', majorKey: 'B', color: '#06b6d4', angleDeg: 30 },
  { number: 2, minorKey: 'D#m', majorKey: 'F#', color: '#0284c7', angleDeg: 60 },
  { number: 3, minorKey: 'Bbm', majorKey: 'Db', color: '#2563eb', angleDeg: 90 },
  { number: 4, minorKey: 'Fm', majorKey: 'Ab', color: '#4f46e5', angleDeg: 120 },
  { number: 5, minorKey: 'Cm', majorKey: 'Eb', color: '#7c3aed', angleDeg: 150 },
  { number: 6, minorKey: 'Gm', majorKey: 'Bb', color: '#a855f7', angleDeg: 180 },
  { number: 7, minorKey: 'Dm', majorKey: 'F', color: '#e11d48', angleDeg: 210 },
  { number: 8, minorKey: 'Am', majorKey: 'C', color: '#ea580c', angleDeg: 240 },
  { number: 9, minorKey: 'Em', majorKey: 'G', color: '#d97706', angleDeg: 270 },
  { number: 10, minorKey: 'Bm', majorKey: 'D', color: '#eab308', angleDeg: 300 },
  { number: 11, minorKey: 'F#m', majorKey: 'A', color: '#84cc16', angleDeg: 330 }
];

export function parseCamelotKey(keyStr: string): { num: number; mode: 'A' | 'B'; original: string } {
  if (!keyStr) return { num: 8, mode: 'A', original: '8A' };
  const cleaned = keyStr.trim().toUpperCase();
  const match = cleaned.match(/(\d+)\s*([AB])/i);
  if (match) {
    const num = Math.min(12, Math.max(1, parseInt(match[1], 10)));
    const mode = (match[2].toUpperCase() === 'B' ? 'B' : 'A') as 'A' | 'B';
    return { num, mode, original: `${num}${mode}` };
  }
  return { num: 8, mode: 'A', original: '8A' };
}

export function getCamelotColor(keyStr: string): string {
  const parsed = parseCamelotKey(keyStr);
  const pos = CAMELOT_WHEEL.find((w) => w.number === parsed.num);
  return pos ? pos.color : '#8b5cf6';
}

/**
 * Calculates step difference on the circular Camelot wheel.
 * Clockwise: positive (+1, +2: energy lift / harmonic boost)
 * Counter-clockwise: negative (-1, -2: harmonic drop / grounding)
 * Distance: absolute minimum steps (0 to 6)
 */
export function getCamelotDelta(
  fromKey: string,
  toKey: string
): {
  stepDelta: number; // -6 to +6
  absDistance: number; // 0 to 6
  isSameKey: boolean;
  isModeChange: boolean;
} {
  const from = parseCamelotKey(fromKey);
  const to = parseCamelotKey(toKey);

  if (from.original === to.original) {
    return { stepDelta: 0, absDistance: 0, isSameKey: true, isModeChange: false };
  }

  let diff = to.num - from.num;
  // Circular wrap-around [-6, +6]
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  const isModeChange = from.mode !== to.mode;
  const absDistance = Math.abs(diff);

  return {
    stepDelta: diff,
    absDistance,
    isSameKey: diff === 0 && !isModeChange,
    isModeChange
  };
}

/**
 * Helper to interpolate energy from points at a given timestamp
 */
export function getEnergyAtTime(energyPoints: { time: number; energy: number }[], timestamp: number): number {
  if (!energyPoints || energyPoints.length === 0) return 50;
  const sorted = [...energyPoints].sort((a, b) => a.time - b.time);
  if (timestamp <= sorted[0].time) return sorted[0].energy;
  if (timestamp >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].energy;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (timestamp >= p1.time && timestamp <= p2.time) {
      const span = p2.time - p1.time;
      if (span === 0) return p1.energy;
      const ratio = (timestamp - p1.time) / span;
      return Math.round(p1.energy + ratio * (p2.energy - p1.energy));
    }
  }
  return 50;
}

/**
 * Core Harmonic-Energy Conflict & Synergy Analysis
 */
export function analyzeHarmonicEnergyClashes(set: TechnoSetAnalysis): HarmonicEnergyAnalysisResult {
  const duration = set.duration || 3600;
  const energyPoints = set.energyPoints || [];
  const harmonyPoints = [...(set.harmonyPoints || [])].sort((a, b) => a.time - b.time);
  const transitions = [...(set.transitions || [])].sort((a, b) => a.timestamp - b.timestamp);

  const clashPoints: HarmonicEnergyClashPoint[] = [];

  // 1. Analyze explicit DJ transitions
  transitions.forEach((trans) => {
    const tTime = trans.timestamp;
    const windowSec = Math.max(20, trans.duration || 32);
    const beforeTime = Math.max(0, tTime - windowSec / 2);
    const afterTime = Math.min(duration, tTime + windowSec / 2);

    const fromE = getEnergyAtTime(energyPoints, beforeTime);
    const toE = getEnergyAtTime(energyPoints, afterTime);
    const energyDelta = toE - fromE;
    const avgE = (fromE + toE) / 2;

    const delta = getCamelotDelta(trans.fromKey, trans.toKey);

    let severity: ClashSeverity = 'synergy';
    let clashType: ClashType = 'hypnotic-steady';
    let title = '';
    let description = '';
    let remedy = '';
    let isConflict = false;

    // Check Clash 1: Paradoxical Anti-Climax
    // Energy is surging (+12% or more) or high peak (>80%), but key drops backwards (-1, -2)
    if ((energyDelta >= 10 || avgE >= 82) && delta.stepDelta <= -1) {
      isConflict = true;
      severity = avgE >= 88 || energyDelta >= 18 ? 'critical' : 'moderate';
      clashType = 'anti-climax-drop';
      title = 'Paradoxer Spannungsabfall (Anti-Climax)';
      description = `Akustische Energie steigt um ${energyDelta > 0 ? `+${energyDelta}%` : `${energyDelta}%`} auf ${toE}% Intensität, während die Tonart harmonisch von ${trans.fromKey} nach ${trans.toKey} abfällt (${delta.stepDelta} Schritt). Dies erzeugt beim Publikum eine emotionale Bremse statt befreiender Katharsis.`;
      remedy = `Verschiebe den Key-Drop in das folgende Break oder bleibe im Peak auf gleicher Tonart (${trans.fromKey}). Ein Aufwärtsschritt (+1) würde den Drop verdoppeln.`;
    }
    // Check Clash 2: Misplaced Harmonic Boost in Low Energy / Breakdown
    // Key shifts forward +1/+2, but energy is dropping sharply (< -12%) or is in a deep quiet dip (< 55%)
    else if ((energyDelta <= -12 || avgE <= 54) && delta.stepDelta >= 1) {
      isConflict = true;
      severity = 'moderate';
      clashType = 'misplaced-boost-breakdown';
      title = 'Deplatzierter Key-Lift im Energie-Loch';
      description = `Harmonischer Quintensprung (${trans.fromKey} → ${trans.toKey}) triggert tonale Vorfreude, während die akustische Energie gleichzeitig um ${energyDelta}% absackt (${toE}% Restenergie). Der Spannungsbogen verliert dadurch rhythmischen Halt.`;
      remedy = `Halte den Breakdown harmonisch stabil und hebe den Tonart-Wechsel exakt auf den Schlag des Wiedereintritts (Drop) auf.`;
    }
    // Check Clash 3: High-Energy Dissonance Clash
    // Camelot distance >= 3 (distant / dissonant key) during high energy (>72%) or long blend
    else if (delta.absDistance >= 3 && (avgE >= 72 || trans.duration >= 28)) {
      isConflict = true;
      severity = 'critical';
      clashType = 'dissonant-pressure-clash';
      title = 'Kritischer Dissonanz-Konflikt bei hohem Schalldruck';
      description = `Tonart-Sprung um ${delta.absDistance} Camelot-Felder (${trans.fromKey} → ${trans.toKey}) bei hohem Pegel (${Math.round(avgE)}%). Bei überlappendem Bass und Mitten entsteht starke tonale Schwebung und Frequenz-Maskierung.`;
      remedy = `Nutze einen kurzen 1-Takt Cut-Drop auf die Eins oder filtere die tonalen Bass- und Mid-Frequenzen mit HPF vor dem zweiten Drop rigoros heraus.`;
    }
    // Check Synergies
    else if (delta.stepDelta >= 1 && (energyDelta >= 8 || avgE >= 85)) {
      severity = 'synergy';
      clashType = 'optimal-energy-lift';
      title = 'Perfekter Energy-Lift (Harmonische Synergie)';
      description = `Harmonische Tonart-Steigerung (+${delta.stepDelta} Camelot-Schritt nach ${trans.toKey}) harmoniert ideal mit dem Energiezugriff (+${energyDelta}%). Erzeugt pure Peak-Euphorie.`;
      remedy = `Optimal umgesetzt. Bei Bedarf 32 Takte voll ausspielen.`;
    } else if (delta.stepDelta <= -1 && (energyDelta <= -8 || avgE <= 65)) {
      severity = 'synergy';
      clashType = 'controlled-grounding';
      title = 'Kontrolliertes Harmonic Grounding';
      description = `Organischer Rückschritt nach ${trans.toKey} parallel zur Energie-Entspannung (${toE}%). Unterstützt den natürlichen Set-Rhythmus.`;
      remedy = `Sehr saubere Pacing-Entlastung.`;
    } else if (delta.stepDelta === 0) {
      severity = 'synergy';
      clashType = 'hypnotic-steady';
      title = 'Hypnotische Tonart-Stabilität';
      description = `Stabile Tonart (${trans.fromKey}) hält den Dancefloor im gleichmäßigen Groove ohne tonale Verwirrung.`;
      remedy = `Ideal für lange 64-Bar Überblendungen.`;
    }

    // Determine phase context
    let phaseContext = 'Mid-Set Progression';
    if (tTime < duration * 0.25) phaseContext = 'Set Opening / Warm-up';
    else if (tTime > duration * 0.75) phaseContext = 'Outro / Final Resolution';
    else if (avgE >= 88) phaseContext = 'Peak-Time Climax';
    else if (avgE <= 55) phaseContext = 'Atmospheric Breakdown';

    clashPoints.push({
      id: `clash-${trans.id}`,
      timestamp: tTime,
      duration: trans.duration,
      fromKey: trans.fromKey,
      toKey: trans.toKey,
      fromEnergy: fromE,
      toEnergy: toE,
      energyDelta,
      camelotStepDelta: delta.stepDelta,
      camelotDistance: delta.absDistance,
      severity,
      clashType,
      title,
      description,
      remedy,
      phaseContext,
      xPct: (tTime / duration) * 100
    });
  });

  // 2. Check for continuous Harmonic Monotony if no key change for 15+ minutes at >85% energy
  if (harmonyPoints.length > 0) {
    for (let i = 0; i < harmonyPoints.length; i++) {
      const hCurrent = harmonyPoints[i];
      const nextTime = harmonyPoints[i + 1]?.time || duration;
      const spanMin = (nextTime - hCurrent.time) / 60;

      if (spanMin >= 16) {
        // Sample middle energy
        const midTime = (hCurrent.time + nextTime) / 2;
        const midE = getEnergyAtTime(energyPoints, midTime);
        if (midE >= 86) {
          clashPoints.push({
            id: `monotony-${Math.round(hCurrent.time)}`,
            timestamp: Math.round(midTime),
            duration: Math.round(nextTime - hCurrent.time),
            fromKey: hCurrent.keyCamelot,
            toKey: hCurrent.keyCamelot,
            fromEnergy: midE,
            toEnergy: midE,
            energyDelta: 0,
            camelotStepDelta: 0,
            camelotDistance: 0,
            severity: 'warning',
            clashType: 'harmonic-monotony',
            title: 'Harmonische Ermüdung bei Dauerdruck',
            description: `Dauerhafter Maximaldruck (${midE}% Energie) über ${Math.round(spanMin)} Minuten in unveränderter Tonart (${hCurrent.keyCamelot}). Das Gehör der Crowd stumpft tonal ab.`,
            remedy: `Führe nach 10-12 Minuten eine Modulation (+1 Quinte oder Wechsel zu Relative Dur) ein, um die emotionale Frische wiederzubeleben.`,
            phaseContext: 'Extended Peak Climax',
            xPct: (midTime / duration) * 100
          });
        }
      }
    }
  }

  // Sort clash points by timestamp
  clashPoints.sort((a, b) => a.timestamp - b.timestamp);

  // 3. Generate smoothed Harmonic Momentum Trend across 60 time samples
  const sampleCount = 60;
  const harmonicMomentumTrend = [];
  for (let s = 0; s <= sampleCount; s++) {
    const time = (s / sampleCount) * duration;
    const energy = getEnergyAtTime(energyPoints, time);

    // Find key at time
    let activeKey = set.dominantKey || '8A';
    for (let i = harmonyPoints.length - 1; i >= 0; i--) {
      if (time >= harmonyPoints[i].time) {
        activeKey = harmonyPoints[i].keyCamelot;
        break;
      }
    }
    const parsedKey = parseCamelotKey(activeKey);
    const keyColor = getCamelotColor(activeKey);

    // Calculate a tension index: normalized product of key position & energy
    const harmonicTensionIndex = Math.round(energy * 0.7 + (parsedKey.num / 12) * 30);

    // Check if within 45s of any clash point
    const nearClash = clashPoints.find((cp) => Math.abs(cp.timestamp - time) <= 45);

    harmonicMomentumTrend.push({
      time,
      energy,
      energySmoothed: energy,
      keyCamelot: activeKey,
      keyNumber: parsedKey.num,
      keyMode: parsedKey.mode,
      keyColor,
      harmonicTensionIndex,
      isClashHotspot: !!nearClash && nearClash.severity !== 'synergy',
      activeClash: nearClash
    });
  }

  // 4. Calculate Scores
  const criticalCount = clashPoints.filter((c) => c.severity === 'critical').length;
  const moderateCount = clashPoints.filter((c) => c.severity === 'moderate').length;
  const warningCount = clashPoints.filter((c) => c.severity === 'warning').length;
  const synergyCount = clashPoints.filter((c) => c.severity === 'synergy').length;
  const totalClashes = criticalCount + moderateCount + warningCount;

  // Base score 92, subtract penalties for clashes, reward synergies
  let score = 92 - criticalCount * 18 - moderateCount * 8 - warningCount * 4 + Math.min(10, synergyCount * 2);
  score = Math.max(30, Math.min(100, Math.round(score)));

  let grade: 'S+' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (score >= 95) grade = 'S+';
  else if (score >= 88) grade = 'A';
  else if (score >= 76) grade = 'B';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  let coherenceAssessment = '';
  if (criticalCount === 0 && moderateCount === 0) {
    coherenceAssessment =
      'Hervorragende harmonische Kohärenz: Tonart-Wechsel und Energiekurve unterstützen einander perfekt ohne tonale Dissonanzen oder paradoxe Spannungsabbrüche.';
  } else if (criticalCount > 0) {
    coherenceAssessment = `Achtung: ${criticalCount} kritische(r) Tonart-Energie-Konflikt(e) festgestellt. Intensive Pegelspitzen prallen auf gegenläufige oder dissonante Tonart-Sprünge.`;
  } else {
    coherenceAssessment = `Solide harmonische Führung mit ${moderateCount} optimierbare(n) Reibungspunkt(en). Kleine Anpassungen an den Übergangszeitpunkten maximieren den Impact.`;
  }

  // DJ Directives
  const djDirectives: string[] = [];
  if (criticalCount > 0) {
    djDirectives.push('Kritische Anti-Climax-Stellen maskieren: Bei Drops niemals gegenläufige Tonarten (-1/-2) einspielen, wenn die Energie maximal ist.');
  }
  if (clashPoints.some((c) => c.clashType === 'dissonant-pressure-clash')) {
    djDirectives.push('Frequenz-Kollisionen filtern: Weite Tonart-Sprünge (≥ 3 Schritte) immer per hartem Bass-Cut oder Quick-Cut lösen, nicht als 32-Bar Blend.');
  }
  if (synergyCount >= 2) {
    djDirectives.push('Bewährte Key-Lifts beibehalten: Quintensprünge (+1) im Main-Drop verstärken die euphorische Wirkung auf der Tanzfläche nachweislich.');
  }
  if (clashPoints.some((c) => c.clashType === 'harmonic-monotony')) {
    djDirectives.push('Tonale Ermüdung vermeiden: Längere Peak-Segmente (>15 Min) durch einen dezenten Tonartwechsel auffrischen.');
  }
  if (djDirectives.length === 0) {
    djDirectives.push('Makellose Balance aus akustischem Schalldruck und Camelot-Dramaturgie. Keine Eingriffe notwendig.');
  }

  return {
    overallSynergyScore: score,
    grade,
    clashesCount: {
      critical: criticalCount,
      moderate: moderateCount,
      warning: warningCount,
      synergy: synergyCount,
      total: totalClashes
    },
    clashPoints,
    harmonicMomentumTrend,
    coherenceAssessment,
    djDirectives
  };
}
