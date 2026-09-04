import { EnergyPoint, SetSegment, SegmentTag } from '../types';

export interface AutoTagOptions {
  mode?: 'adaptive' | '3-phase' | '5-phase';
  sensitivity?: 'high' | 'standard' | 'low';
}

export const SEGMENT_CONFIGS: Record<string, { tag: SegmentTag; color: string; bgClass: string; borderClass: string; textClass: string; defaultDesc: string }> = {
  'Warm-up': {
    tag: 'Warm-up',
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    defaultDesc: 'Groove-Induktion mit kontrolliertem Schalldruck zum Etablieren des Grundtempos.'
  },
  'Build-up': {
    tag: 'Build-up',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    defaultDesc: 'Spannungsaufbau durch steigende Frequenzdichte und anziehende Perkussion.'
  },
  'Peak Hour': {
    tag: 'Peak Hour',
    color: '#ec4899',
    bgClass: 'bg-pink-500/15',
    borderClass: 'border-pink-500/40',
    textClass: 'text-pink-400',
    defaultDesc: 'Höchste energetische Intensität, maximale Sub-Bass-Wucht und primäre Drops.'
  },
  'Hypnotic Plateau': {
    tag: 'Hypnotic Plateau',
    color: '#a855f7',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    defaultDesc: 'Kontinuierlicher, treibender Techno-Sog ohne abrupte Pausen – pure Trance.'
  },
  'Breakdown': {
    tag: 'Breakdown',
    color: '#8b5cf6',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/30',
    textClass: 'text-violet-400',
    defaultDesc: 'Atmosphärischer Kick-Cutout & Hallfahnen zur Spannungsaufladung vor dem Drop.'
  },
  'Cool-down': {
    tag: 'Cool-down',
    color: '#10b981',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    defaultDesc: 'Entspannendes Ausklingen, reduzierter Bassdruck und sanfter Übergang zum Outro.'
  }
};

/**
 * Computes energy statistics for a time window [startTime, endTime].
 */
function getWindowEnergyStats(energyPoints: EnergyPoint[], startTime: number, endTime: number) {
  const points = energyPoints.filter((p) => p.time >= startTime && p.time <= endTime);
  if (points.length === 0) {
    // Fallback: take nearest point
    const nearest = [...energyPoints].sort(
      (a, b) => Math.abs(a.time - (startTime + endTime) / 2) - Math.abs(b.time - (startTime + endTime) / 2)
    )[0];
    return {
      avgEnergy: nearest ? nearest.energy : 60,
      peakEnergy: nearest ? nearest.energy : 60,
      avgSubBass: nearest ? nearest.subBass : 60
    };
  }

  const sumEnergy = points.reduce((acc, p) => acc + p.energy, 0);
  const sumSub = points.reduce((acc, p) => acc + p.subBass, 0);
  const peak = Math.max(...points.map((p) => p.energy));

  return {
    avgEnergy: Math.round(sumEnergy / points.length),
    peakEnergy: peak,
    avgSubBass: Math.round(sumSub / points.length)
  };
}

/**
 * Automatically calculates set segments with labels (Warm-up, Peak Hour, Cool-down, etc.)
 * based on the analyzed energy intensity levels.
 */
export function computeAutoTaggedSegments(
  duration: number,
  energyPoints: EnergyPoint[],
  options: AutoTagOptions = { mode: 'adaptive' }
): SetSegment[] {
  if (!energyPoints || energyPoints.length === 0 || duration <= 0) {
    return [
      {
        id: 'seg-1',
        startTime: 0,
        endTime: Math.max(60, duration),
        tag: 'Warm-up',
        averageEnergy: 65,
        peakEnergy: 75,
        subBassIntensity: 60,
        description: SEGMENT_CONFIGS['Warm-up'].defaultDesc,
        color: SEGMENT_CONFIGS['Warm-up'].color
      }
    ];
  }

  const mode = options.mode || 'adaptive';

  // 1. Classic 3-Phase Auto-Tagging Mode
  if (mode === '3-phase') {
    // Warm-up: ~0 to 25-30%
    // Peak Hour: ~30% to 80-85%
    // Cool-down: ~85% to 100%
    const warmUpEnd = Math.round(duration * 0.28);
    const peakEnd = Math.round(duration * 0.84);

    const s1Stats = getWindowEnergyStats(energyPoints, 0, warmUpEnd);
    const s2Stats = getWindowEnergyStats(energyPoints, warmUpEnd, peakEnd);
    const s3Stats = getWindowEnergyStats(energyPoints, peakEnd, duration);

    return [
      {
        id: `seg-auto-1`,
        startTime: 0,
        endTime: warmUpEnd,
        tag: 'Warm-up',
        averageEnergy: s1Stats.avgEnergy,
        peakEnergy: s1Stats.peakEnergy,
        subBassIntensity: s1Stats.avgSubBass,
        description: `Warm-up Phase: Anfangsenergie bei Ø ${s1Stats.avgEnergy}%. Sanftes Einhören und Raumfüllung.`,
        color: SEGMENT_CONFIGS['Warm-up'].color
      },
      {
        id: `seg-auto-2`,
        startTime: warmUpEnd,
        endTime: peakEnd,
        tag: 'Peak Hour',
        averageEnergy: s2Stats.avgEnergy,
        peakEnergy: s2Stats.peakEnergy,
        subBassIntensity: s2Stats.avgSubBass,
        description: `Peak Hour Phase: Maximale Beschallungsdichte mit Ø ${s2Stats.avgEnergy}% Intensität und Spitzen bei ${s2Stats.peakEnergy}%.`,
        color: SEGMENT_CONFIGS['Peak Hour'].color
      },
      {
        id: `seg-auto-3`,
        startTime: peakEnd,
        endTime: Math.round(duration),
        tag: 'Cool-down',
        averageEnergy: s3Stats.avgEnergy,
        peakEnergy: s3Stats.peakEnergy,
        subBassIntensity: s3Stats.avgSubBass,
        description: `Cool-down Phase: Rückgang auf Ø ${s3Stats.avgEnergy}% Energie für kontrollierte Deeskalation.`,
        color: SEGMENT_CONFIGS['Cool-down'].color
      }
    ];
  }

  // 2. 5-Phase Extended Auto-Tagging Mode
  if (mode === '5-phase') {
    const t1 = Math.round(duration * 0.18);
    const t2 = Math.round(duration * 0.42);
    const t3 = Math.round(duration * 0.72);
    const t4 = Math.round(duration * 0.88);

    const s1 = getWindowEnergyStats(energyPoints, 0, t1);
    const s2 = getWindowEnergyStats(energyPoints, t1, t2);
    const s3 = getWindowEnergyStats(energyPoints, t2, t3);
    const s4 = getWindowEnergyStats(energyPoints, t3, t4);
    const s5 = getWindowEnergyStats(energyPoints, t4, duration);

    return [
      {
        id: 'seg-5p-1',
        startTime: 0,
        endTime: t1,
        tag: 'Warm-up',
        averageEnergy: s1.avgEnergy,
        peakEnergy: s1.peakEnergy,
        subBassIntensity: s1.avgSubBass,
        description: `Erstes Einleiten des Groove-Fundaments (Ø ${s1.avgEnergy}% Energie).`,
        color: SEGMENT_CONFIGS['Warm-up'].color
      },
      {
        id: 'seg-5p-2',
        startTime: t1,
        endTime: t2,
        tag: 'Build-up',
        averageEnergy: s2.avgEnergy,
        peakEnergy: s2.peakEnergy,
        subBassIntensity: s2.avgSubBass,
        description: `Intensivierung & Beschleunigung der Perkussionsstrukturen (Ø ${s2.avgEnergy}% Energie).`,
        color: SEGMENT_CONFIGS['Build-up'].color
      },
      {
        id: 'seg-5p-3',
        startTime: t2,
        endTime: t3,
        tag: 'Peak Hour',
        averageEnergy: s3.avgEnergy,
        peakEnergy: s3.peakEnergy,
        subBassIntensity: s3.avgSubBass,
        description: `Zentraler Dancefloor-Höhepunkt mit Spitzen bis ${s3.peakEnergy}% Energie.`,
        color: SEGMENT_CONFIGS['Peak Hour'].color
      },
      {
        id: 'seg-5p-4',
        startTime: t3,
        endTime: t4,
        tag: 'Hypnotic Plateau',
        averageEnergy: s4.avgEnergy,
        peakEnergy: s4.peakEnergy,
        subBassIntensity: s4.avgSubBass,
        description: `Stabiler, hypnotischer Spannungszustand (Ø ${s4.avgEnergy}% Energie).`,
        color: SEGMENT_CONFIGS['Hypnotic Plateau'].color
      },
      {
        id: 'seg-5p-5',
        startTime: t4,
        endTime: Math.round(duration),
        tag: 'Cool-down',
        averageEnergy: s5.avgEnergy,
        peakEnergy: s5.peakEnergy,
        subBassIntensity: s5.avgSubBass,
        description: `Abschluss-Sequenz mit Atmosphärischer Dekomprimierung (Ø ${s5.avgEnergy}% Energie).`,
        color: SEGMENT_CONFIGS['Cool-down'].color
      }
    ];
  }

  // 3. Adaptive Energy-Threshold Auto-Tagging
  // Dynamically analyze energy transitions, peak bursts and cool-down trajectories
  const numSlices = Math.min(10, Math.max(4, Math.floor(duration / 360))); // ~6 minute granularity
  const sliceDuration = duration / numSlices;
  const rawSlices: { start: number; end: number; avgEnergy: number; peakEnergy: number; avgSubBass: number }[] = [];

  for (let i = 0; i < numSlices; i++) {
    const start = Math.round(i * sliceDuration);
    const end = Math.round(i === numSlices - 1 ? duration : (i + 1) * sliceDuration);
    const stats = getWindowEnergyStats(energyPoints, start, end);
    rawSlices.push({
      start,
      end,
      avgEnergy: stats.avgEnergy,
      peakEnergy: stats.peakEnergy,
      avgSubBass: stats.avgSubBass
    });
  }

  // Assign raw label based on energy intensity & position
  const classified = rawSlices.map((slice, idx) => {
    const progress = (slice.start + slice.end) / 2 / duration;
    let tag: SegmentTag = 'Build-up';

    if (progress < 0.25 && slice.avgEnergy < 72) {
      tag = 'Warm-up';
    } else if (progress > 0.82 && slice.avgEnergy < 75) {
      tag = 'Cool-down';
    } else if (slice.avgEnergy >= 82 || slice.peakEnergy >= 92) {
      tag = 'Peak Hour';
    } else if (slice.avgEnergy >= 72) {
      tag = progress > 0.55 ? 'Hypnotic Plateau' : 'Build-up';
    } else if (slice.avgEnergy < 52 && progress > 0.2 && progress < 0.8) {
      tag = 'Breakdown';
    } else {
      tag = progress < 0.35 ? 'Warm-up' : progress > 0.75 ? 'Cool-down' : 'Build-up';
    }

    return { ...slice, tag };
  });

  // Merge adjacent slices sharing the same tag
  const merged: SetSegment[] = [];
  let currentGroup = { ...classified[0] };

  for (let i = 1; i < classified.length; i++) {
    const next = classified[i];
    if (next.tag === currentGroup.tag) {
      // Merge
      currentGroup.end = next.end;
      currentGroup.avgEnergy = Math.round((currentGroup.avgEnergy + next.avgEnergy) / 2);
      currentGroup.peakEnergy = Math.max(currentGroup.peakEnergy, next.peakEnergy);
      currentGroup.avgSubBass = Math.round((currentGroup.avgSubBass + next.avgSubBass) / 2);
    } else {
      // Push previous
      const cfg = SEGMENT_CONFIGS[currentGroup.tag] || SEGMENT_CONFIGS['Build-up'];
      merged.push({
        id: `seg-${merged.length + 1}`,
        startTime: currentGroup.start,
        endTime: currentGroup.end,
        tag: currentGroup.tag,
        averageEnergy: currentGroup.avgEnergy,
        peakEnergy: currentGroup.peakEnergy,
        subBassIntensity: currentGroup.avgSubBass,
        description: getSegmentDescription(currentGroup.tag, currentGroup.avgEnergy, currentGroup.peakEnergy),
        color: cfg.color
      });
      currentGroup = { ...next };
    }
  }

  // Push final group
  const finalCfg = SEGMENT_CONFIGS[currentGroup.tag] || SEGMENT_CONFIGS['Cool-down'];
  merged.push({
    id: `seg-${merged.length + 1}`,
    startTime: currentGroup.start,
    endTime: Math.round(duration),
    tag: currentGroup.tag,
    averageEnergy: currentGroup.avgEnergy,
    peakEnergy: currentGroup.peakEnergy,
    subBassIntensity: currentGroup.avgSubBass,
    description: getSegmentDescription(currentGroup.tag, currentGroup.avgEnergy, currentGroup.peakEnergy),
    color: finalCfg.color
  });

  // Ensure first is Warm-up and last is Cool-down if energy supports it
  if (merged.length > 0 && merged[0].averageEnergy < 75 && merged[0].tag !== 'Warm-up') {
    merged[0].tag = 'Warm-up';
    merged[0].color = SEGMENT_CONFIGS['Warm-up'].color;
  }
  if (merged.length > 1 && merged[merged.length - 1].averageEnergy < 78 && merged[merged.length - 1].tag !== 'Cool-down') {
    merged[merged.length - 1].tag = 'Cool-down';
    merged[merged.length - 1].color = SEGMENT_CONFIGS['Cool-down'].color;
  }

  // Ensure at least one Peak Hour segment exists
  const hasPeak = merged.some((s) => s.tag === 'Peak Hour');
  if (!hasPeak && merged.length > 0) {
    // Find highest energy segment and label as Peak Hour
    let maxIdx = 0;
    let maxEnergy = -1;
    merged.forEach((s, idx) => {
      if (s.averageEnergy > maxEnergy) {
        maxEnergy = s.averageEnergy;
        maxIdx = idx;
      }
    });
    merged[maxIdx].tag = 'Peak Hour';
    merged[maxIdx].color = SEGMENT_CONFIGS['Peak Hour'].color;
    merged[maxIdx].description = getSegmentDescription('Peak Hour', merged[maxIdx].averageEnergy, merged[maxIdx].peakEnergy);
  }

  return merged;
}

function getSegmentDescription(tag: SegmentTag, avgEnergy: number, peakEnergy: number): string {
  switch (tag) {
    case 'Warm-up':
      return `Warm-up Phase: Kontrolliertes Bassfundament bei Ø ${avgEnergy}% Energie. Perfekt für Groove-Etablierung und crowd building.`;
    case 'Build-up':
      return `Build-up Phase: Anziehende Frequenzdichte mit Ø ${avgEnergy}% Energie und merklichem Spannungszuwachs.`;
    case 'Peak Hour':
      return `Peak Hour Climax: Maximaler Dancefloor-Druck bei Ø ${avgEnergy}% (Spitzenwert ${peakEnergy}%). Ungebremster Club-Höhepunkt.`;
    case 'Hypnotic Plateau':
      return `Hypnotic Plateau: Dichter, kontinuierlicher Roll-Groove bei stabilen Ø ${avgEnergy}% Energie ohne Breaks.`;
    case 'Breakdown':
      return `Tension Breakdown: Sub-Bass-Kürzung auf Ø ${avgEnergy}% Energie für dramatischen Spannungsaufbau.`;
    case 'Cool-down':
      return `Cool-down Phase: Gezielter Abbau der Energie auf Ø ${avgEnergy}% zum harmonischen Abschluss des Sets.`;
    default:
      return `Abschnitts-Intensität: Ø ${avgEnergy}% Energie.`;
  }
}
