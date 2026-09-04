import {
  TechnoSetAnalysis,
  TargetEnergyProfile,
  TargetProfileMilestone,
  ProfileComparisonFeedback,
  ProfileComparisonZone
} from '../types';
import { formatTimeSeconds } from './pdfExport';

export const DEFAULT_TARGET_PROFILES: TargetEnergyProfile[] = [
  {
    id: 'profile-rising-intensity',
    name: 'Rising Intensity',
    category: 'Rising Intensity',
    description: 'Kontinuierlicher, exponentieller Spannungsaufbau vom kontrollierten Warm-up (42%) bis zum energetischen Peak-Climax (98%) in der zweiten Set-Hälfte.',
    tolerance: 10,
    color: '#ec4899',
    milestones: [
      { percentTime: 0, targetEnergy: 42 },
      { percentTime: 20, targetEnergy: 54 },
      { percentTime: 40, targetEnergy: 68 },
      { percentTime: 65, targetEnergy: 82 },
      { percentTime: 82, targetEnergy: 98 },
      { percentTime: 100, targetEnergy: 62 }
    ]
  },
  {
    id: 'profile-constant-flow',
    name: 'Constant Flow (Hypnotic Roller)',
    category: 'Constant Flow',
    description: 'Monolithischer, rollender Druck ohne drastische Abbrüche oder Energieeinbrüche. Hypnotischer Berliner Club-Standard zwischen 76% und 84%.',
    tolerance: 8,
    color: '#3b82f6',
    milestones: [
      { percentTime: 0, targetEnergy: 74 },
      { percentTime: 15, targetEnergy: 79 },
      { percentTime: 40, targetEnergy: 82 },
      { percentTime: 65, targetEnergy: 83 },
      { percentTime: 85, targetEnergy: 84 },
      { percentTime: 100, targetEnergy: 77 }
    ]
  },
  {
    id: 'profile-double-peak',
    name: 'Double Peak Wave (Festival Odyssey)',
    category: 'Double Peak',
    description: 'Dynamische 2-Wellen-Dramaturgie mit frühem Climax (88%), atmosphärischem Reset-Breakdown im Mittelteil und massivem Zweit-Peak (96%).',
    tolerance: 10,
    color: '#f59e0b',
    milestones: [
      { percentTime: 0, targetEnergy: 48 },
      { percentTime: 25, targetEnergy: 88 },
      { percentTime: 50, targetEnergy: 58 },
      { percentTime: 75, targetEnergy: 96 },
      { percentTime: 90, targetEnergy: 88 },
      { percentTime: 100, targetEnergy: 64 }
    ]
  },
  {
    id: 'profile-warmup-discipline',
    name: 'Warm-up / Opening Discipline',
    category: 'Warm-up Opening',
    description: 'Disziplinierter, sanfter Opener-Verlauf von 32% auf maximal 68%. Bereitet die Crowd behutsam vor, ohne dem Headliner die Luft zu nehmen.',
    tolerance: 8,
    color: '#10b981',
    milestones: [
      { percentTime: 0, targetEnergy: 32 },
      { percentTime: 25, targetEnergy: 44 },
      { percentTime: 50, targetEnergy: 55 },
      { percentTime: 75, targetEnergy: 64 },
      { percentTime: 100, targetEnergy: 68 }
    ]
  },
  {
    id: 'profile-afterhour-deep',
    name: 'Late Night / Deep Afterhour',
    category: 'Afterhour Deep',
    description: 'Subtiler, warmer Tiefbass-Groove mit kontrollierter Intensität zwischen 50% und 64% für lange, hypnotische Afterhour-Sessions.',
    tolerance: 9,
    color: '#a855f7',
    milestones: [
      { percentTime: 0, targetEnergy: 52 },
      { percentTime: 25, targetEnergy: 62 },
      { percentTime: 50, targetEnergy: 58 },
      { percentTime: 75, targetEnergy: 64 },
      { percentTime: 100, targetEnergy: 54 }
    ]
  }
];

/**
 * Interpolates target energy at a given percentage [0..100] using piecewise linear interpolation
 */
export function interpolateTargetEnergy(milestones: TargetProfileMilestone[], pct: number): number {
  const sorted = [...milestones].sort((a, b) => a.percentTime - b.percentTime);
  if (sorted.length === 0) return 50;
  if (pct <= sorted[0].percentTime) return sorted[0].targetEnergy;
  if (pct >= sorted[sorted.length - 1].percentTime) return sorted[sorted.length - 1].targetEnergy;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (pct >= p1.percentTime && pct <= p2.percentTime) {
      const span = p2.percentTime - p1.percentTime;
      if (span === 0) return p1.targetEnergy;
      const ratio = (pct - p1.percentTime) / span;
      return Math.round(p1.targetEnergy + ratio * (p2.targetEnergy - p1.targetEnergy));
    }
  }
  return sorted[sorted.length - 1].targetEnergy;
}

/**
 * Compares the current set against the selected Target Energy Profile
 */
export function compareSetAgainstProfile(
  set: TechnoSetAnalysis,
  profile: TargetEnergyProfile
): ProfileComparisonFeedback {
  const duration = set.duration || 3600;
  const energyPoints = set.energyPoints || [];

  const SAMPLE_COUNT = 60;
  let sumSquaredError = 0;
  let sumAbsError = 0;
  let maxAbsError = 0;
  let maxErrorTime = 0;
  let maxErrorDelta = 0;

  const actualSamples: number[] = [];
  const targetSamples: number[] = [];

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const pct = (i / SAMPLE_COUNT) * 100;
    const timeSec = (pct / 100) * duration;

    // Determine actual energy at timeSec
    let actualEnergy = 50;
    if (energyPoints.length > 0) {
      // Find nearest or interpolate
      const pt = energyPoints.reduce((prev, curr) =>
        Math.abs(curr.time - timeSec) < Math.abs(prev.time - timeSec) ? curr : prev
      );
      actualEnergy = pt.energy;
    }

    const targetEnergy = interpolateTargetEnergy(profile.milestones, pct);
    actualSamples.push(actualEnergy);
    targetSamples.push(targetEnergy);

    const delta = actualEnergy - targetEnergy;
    const absDelta = Math.abs(delta);

    sumSquaredError += delta * delta;
    sumAbsError += absDelta;

    if (absDelta > maxAbsError) {
      maxAbsError = absDelta;
      maxErrorTime = timeSec;
      maxErrorDelta = delta;
    }
  }

  const rmsd = Math.sqrt(sumSquaredError / (SAMPLE_COUNT + 1));
  const avgDeviation = Math.round((sumAbsError / (SAMPLE_COUNT + 1)) * 10) / 10;

  // Correlation calculation (Pearson coefficient between actual and target curves)
  const actualMean = actualSamples.reduce((a, b) => a + b, 0) / actualSamples.length;
  const targetMean = targetSamples.reduce((a, b) => a + b, 0) / targetSamples.length;
  let num = 0;
  let den1 = 0;
  let den2 = 0;
  for (let i = 0; i < actualSamples.length; i++) {
    const dx = actualSamples[i] - actualMean;
    const dy = targetSamples[i] - targetMean;
    num += dx * dy;
    den1 += dx * dx;
    den2 += dy * dy;
  }
  const pacingCorrelation = den1 > 0 && den2 > 0 ? Math.round((num / Math.sqrt(den1 * den2)) * 100) / 100 : 0.5;

  // Score calculation: baseline 100 minus deviation penalties with tolerance window
  let rawScore = 100 - rmsd * 1.6;
  if (pacingCorrelation < 0) {
    rawScore -= 20;
  } else if (pacingCorrelation < 0.4) {
    rawScore -= 8;
  } else if (pacingCorrelation > 0.8) {
    rawScore += 4;
  }
  const overallScore = Math.max(25, Math.min(100, Math.round(rawScore)));

  // Grade assignment
  let grade: 'S+' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (overallScore >= 92) grade = 'S+';
  else if (overallScore >= 82) grade = 'A';
  else if (overallScore >= 68) grade = 'B';
  else if (overallScore >= 52) grade = 'C';
  else grade = 'D';

  // Zone Breakdown (4 Quarters)
  const quarters = [
    { name: 'Phase 1: Set Entry & Framing', startPct: 0, endPct: 25 },
    { name: 'Phase 2: Groove Progression & Development', startPct: 25, endPct: 50 },
    { name: 'Phase 3: Main Room Tension & Climax', startPct: 50, endPct: 75 },
    { name: 'Phase 4: Climax Resolution & Outro', startPct: 75, endPct: 100 }
  ];

  const zoneBreakdown: ProfileComparisonZone[] = quarters.map((q) => {
    const startSec = Math.round((q.startPct / 100) * duration);
    const endSec = Math.round((q.endPct / 100) * duration);

    // Calculate actual avg in this time slice
    const ptsInZone = energyPoints.filter((p) => p.time >= startSec && p.time <= endSec);
    const actualAvg = ptsInZone.length > 0
      ? Math.round(ptsInZone.reduce((acc, cur) => acc + cur.energy, 0) / ptsInZone.length)
      : 50;

    // Calculate target avg in this zone
    const tStart = interpolateTargetEnergy(profile.milestones, q.startPct);
    const tMid = interpolateTargetEnergy(profile.milestones, (q.startPct + q.endPct) / 2);
    const tEnd = interpolateTargetEnergy(profile.milestones, q.endPct);
    const targetAvg = Math.round((tStart + tMid * 2 + tEnd) / 4);

    const dev = actualAvg - targetAvg;

    let status: ProfileComparisonZone['status'] = 'optimal';
    let feedback = 'Perfekte Ausrichtung an der Soll-Intensität.';

    if (dev > 15) {
      status = 'critical-over';
      feedback = `Signifikanter Energie-Überschuss (+${dev}%). Crowd wurde vorzeitig überreizt oder zu hart gepusht.`;
    } else if (dev > 5) {
      status = 'slight-over';
      feedback = `Leicht über dem Soll-Pegel (+${dev}%). Energie war etwas druckvoller als geplant.`;
    } else if (dev < -15) {
      status = 'critical-under';
      feedback = `Starker Energie-Einbruch (${dev}%). Spannungsabfall durch zu lange Breakdowns oder fehlendes Low-End.`;
    } else if (dev < -5) {
      status = 'slight-under';
      feedback = `Leichter Energie-Sag (${dev}%). Zielkurve wurde im Groove knapp verfehlt.`;
    }

    return {
      zoneName: q.name,
      timeRangeFormatted: `${formatTimeSeconds(startSec)} - ${formatTimeSeconds(endSec)}`,
      startSec,
      endSec,
      targetAvg,
      actualAvg,
      deviation: dev,
      status,
      feedback
    };
  });

  // DJ Coaching Tips based on profile & comparison
  const djTips: string[] = [];

  if (profile.category === 'Rising Intensity') {
    if (zoneBreakdown[0].deviation > 10) {
      djTips.push('Starte Phase 1 subtiler: Nimm Bass-Elemente und Ride-Becken zu Beginn zurück, um den späteren Anstieg dramatischer wirken zu lassen.');
    }
    if (zoneBreakdown[2].actualAvg < zoneBreakdown[2].targetAvg - 8) {
      djTips.push('Haupt-Climax verstärken: In der 3. Phase fehlte der sprunghafte Energieschub auf >85%. Nutze High-Pass-Sweeps und Acid-Layer vor dem Main-Drop.');
    }
    if (overallScore >= 85) {
      djTips.push('Exzellente Spannungsdramaturgie: Der stetige Druckaufbau erzeugt exakt das gewünschte Club-Peak-Gefühl.');
    }
  } else if (profile.category === 'Constant Flow') {
    if (Math.abs(avgDeviation) < 6) {
      djTips.push('Monolithische Meisterleistung: Der rollende Beat blieb wie gefordert ohne Unterbrechung auf Club-Betriebstemperatur.');
    } else {
      djTips.push('Breakdowns straffen: Halte die Kickdrum bei Übergängen durchgehend präsent, um den hypnotischen "Constant Flow" nicht zu unterbrechen.');
      djTips.push('Filter subtiler einsetzen: Statt vollständigen Bass-Cuts lieber 12dB/Okt Filter sanft modulieren.');
    }
  } else if (profile.category === 'Double Peak') {
    if (zoneBreakdown[1].actualAvg > 72) {
      djTips.push('Zwischen-Breakdown vertiefen: Die Crowd braucht in Phase 2 mehr Raum zum Atmen (Atmosphäre, Chords), damit der zweite Peak zündet.');
    } else {
      djTips.push('Hervorragender Kontrast zwischen den beiden Energie-Wellen.');
    }
  } else if (profile.category === 'Warm-up Opening') {
    if (maxAbsError > 12 && maxErrorDelta > 0) {
      djTips.push(`Headliner-Disziplin beachten: Bei ${formatTimeSeconds(maxErrorTime)} war der Track mit ${Math.round(actualSamples[0] || 70)}% zu laut/hart für ein Opening-Set.`);
    } else {
      djTips.push('Vorbildliches Support-Set: Konstant vorbereitend ohne dem Haupt-Act die Show zu stehlen.');
    }
  } else {
    djTips.push('Pacing-Kontrolle: Nutze gezielte Low-Cut-Automation vor energiereichen Übergängen.');
    djTips.push('Prüfe die Lautheits-Dynamik (LUFS/RMS) parallel zur energetischen Kurve.');
  }

  // Summary headline
  let headline = '';
  let summary = '';
  if (overallScore >= 90) {
    headline = `Perfekte Kurventreue (${overallScore}%) — Mustergültige Umsetzung von "${profile.name}"`;
    summary = `Das Set adaptiert die Dramaturgie von ${profile.name} mit chirurgischer Präzision. Pacing-Korrelation liegt bei ${pacingCorrelation > 0 ? '+' : ''}${pacingCorrelation}. Keine kritischen Phasenbrüche oder Energie-Löcher festgestellt.`;
  } else if (overallScore >= 75) {
    headline = `Starke Ausrichtung (${overallScore}%) — Gute Dramaturgie mit kleinen Abweichungen`;
    summary = `Das Set fängt die Grundstimmung von ${profile.name} erfolgreich ein. Durchschnittliche Abweichung beträgt lediglich ${avgDeviation}%. Kleinere Optimierungspotenziale in ${zoneBreakdown.find((z) => z.status !== 'optimal')?.zoneName || 'den Übergangsphasen'}.`;
  } else if (overallScore >= 60) {
    headline = `Moderate Übereinstimmung (${overallScore}%) — Pacing weicht stellenweise spürbar ab`;
    summary = `Die intendierte Spannungskurve von ${profile.name} wird im Kern berührt, leidet jedoch unter merklichen Über- oder Untersteuerungen (Größte Abweichung: ${maxErrorDelta > 0 ? '+' : ''}${Math.round(maxErrorDelta)}% bei ${formatTimeSeconds(maxErrorTime)}).`;
  } else {
    headline = `Signifikante Profil-Diskrepanz (${overallScore}%) — Konträre Dramaturgie`;
    summary = `Das gespielte Set folgt einer gänzlich anderen Dynamik als im Zielprofil "${profile.name}" vorgesehen. Bitte die Phasenübersicht und Coaching-Tipps prüfen, um das Pacing gezielt anzupassen.`;
  }

  return {
    overallScore,
    grade,
    headline,
    summary,
    pacingCorrelation,
    avgDeviation,
    maxDeviation: {
      timestamp: maxErrorTime,
      delta: Math.round(maxErrorDelta),
      type: maxErrorDelta >= 0 ? 'over-energy' : 'under-energy',
      description: maxErrorDelta >= 0
        ? `Energie lag ${Math.round(maxErrorDelta)}% über dem Zielprofil (zu druckvoll)`
        : `Energie lag ${Math.abs(Math.round(maxErrorDelta))}% unter dem Zielprofil (Energie-Sag)`
    },
    zoneBreakdown,
    djTips,
    targetProfile: profile
  };
}
