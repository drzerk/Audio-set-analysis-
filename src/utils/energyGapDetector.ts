import { EnergyPoint, EnergyGap, EnergyGapAnalysisResult, EnergyGapSeverity } from '../types';
import { formatTimeSeconds } from './pdfExport';

/**
 * Sensitivity configurations for detecting crowd-flow killing energy dips
 */
export const GAP_SENSITIVITY_CONFIG = {
  conservative: {
    deltaBelowAverage: 22, // Drops >= 22% below set average
    minDurationSeconds: 35,
    label: 'Konservativ (-22% Drop, >35s)'
  },
  standard: {
    deltaBelowAverage: 16, // Drops >= 16% below set average
    minDurationSeconds: 25,
    label: 'Standard (-16% Drop, >25s)'
  },
  aggressive: {
    deltaBelowAverage: 12, // Drops >= 12% below set average
    minDurationSeconds: 18,
    label: 'Sensibel (-12% Drop, >18s)'
  }
};

/**
 * Analyzes track energy progression to identify time ranges where energy
 * drops significantly below set average, threatening dancefloor momentum.
 */
export function detectEnergyGaps(
  energyPoints: EnergyPoint[],
  duration: number,
  sensitivity: 'conservative' | 'standard' | 'aggressive' = 'standard'
): EnergyGapAnalysisResult {
  if (!energyPoints || energyPoints.length === 0) {
    return {
      setAverageEnergy: 75,
      thresholdEnergy: 60,
      sensitivityMode: sensitivity,
      gaps: [],
      criticalGapsCount: 0,
      totalGapDuration: 0,
      gapPercentageOfSet: 0,
      flowContinuityScore: 100,
      heatmapTimeline: []
    };
  }

  // 1. Calculate Set Average Energy
  const totalEnergySum = energyPoints.reduce((sum, p) => sum + p.energy, 0);
  const setAverageEnergy = Math.round(totalEnergySum / energyPoints.length);

  const config = GAP_SENSITIVITY_CONFIG[sensitivity] || GAP_SENSITIVITY_CONFIG.standard;
  const thresholdEnergy = Math.max(15, setAverageEnergy - config.deltaBelowAverage);

  // 2. Identify contiguous ranges where energy < thresholdEnergy
  const sortedPoints = [...energyPoints].sort((a, b) => a.time - b.time);

  interface RawRange {
    startIndex: number;
    endIndex: number;
    startTime: number;
    endTime: number;
  }

  const rawRanges: RawRange[] = [];
  let inRange = false;
  let currentStart = 0;
  let currentStartIndex = 0;

  for (let i = 0; i < sortedPoints.length; i++) {
    const pt = sortedPoints[i];
    const isBelow = pt.energy < thresholdEnergy;

    if (isBelow && !inRange) {
      inRange = true;
      currentStart = pt.time;
      currentStartIndex = i;
    } else if (!isBelow && inRange) {
      inRange = false;
      const prevTime = sortedPoints[i - 1]?.time || pt.time;
      rawRanges.push({
        startIndex: currentStartIndex,
        endIndex: i - 1,
        startTime: currentStart,
        endTime: prevTime
      });
    }
  }

  if (inRange) {
    const lastPoint = sortedPoints[sortedPoints.length - 1];
    rawRanges.push({
      startIndex: currentStartIndex,
      endIndex: sortedPoints.length - 1,
      startTime: currentStart,
      endTime: lastPoint.time
    });
  }

  // 3. Merge ranges that are very close to each other (e.g. within 12 seconds)
  const mergedRanges: RawRange[] = [];
  for (const r of rawRanges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(r);
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (r.startTime - last.endTime <= 12) {
        last.endTime = r.endTime;
        last.endIndex = r.endIndex;
      } else {
        mergedRanges.push(r);
      }
    }
  }

  // 4. Filter by min duration and compute gap diagnostics
  const gaps: EnergyGap[] = [];

  mergedRanges.forEach((range, idx) => {
    const rangeDuration = Math.round(range.endTime - range.startTime);
    if (rangeDuration < config.minDurationSeconds) {
      return;
    }

    const pointsInRange = sortedPoints.slice(range.startIndex, range.endIndex + 1);
    if (pointsInRange.length === 0) return;

    let minEnergy = 100;
    let minSubBass = 100;
    let sumEnergy = 0;
    let peakTroughTime = range.startTime;

    pointsInRange.forEach((p) => {
      sumEnergy += p.energy;
      if (p.energy < minEnergy) {
        minEnergy = p.energy;
        peakTroughTime = p.time;
      }
      if (p.subBass < minSubBass) {
        minSubBass = p.subBass;
      }
    });

    const avgGapEnergy = Math.round(sumEnergy / pointsInRange.length);
    const energyDeficit = Math.round(setAverageEnergy - minEnergy);

    // Assess severity
    let severity: EnergyGapSeverity = 'moderate';
    let severityScore = 40;

    if (
      energyDeficit >= 24 ||
      (energyDeficit >= 18 && rangeDuration >= 70) ||
      (minSubBass < 30 && rangeDuration >= 50 && energyDeficit >= 16)
    ) {
      severity = 'critical';
      severityScore = Math.min(100, Math.round(60 + (energyDeficit * 1.2) + (rangeDuration * 0.2)));
    } else if (energyDeficit >= 17 || rangeDuration >= 45) {
      severity = 'warning';
      severityScore = Math.min(79, Math.round(45 + (energyDeficit * 0.9) + (rangeDuration * 0.15)));
    } else {
      severity = 'moderate';
      severityScore = Math.min(50, Math.round(30 + energyDeficit));
    }

    // Contextual Crowd-Flow Impact & Actionable Tip
    let crowdFlowImpact = '';
    let actionableTip = '';

    if (severity === 'critical') {
      crowdFlowImpact = `Akutes Flow-Killer Risiko: Energie bricht um -${energyDeficit}% unter Set-Ø ein (${rangeDuration}s Lull). Sub-Bass sinkt auf ${minSubBass}%. Die Tanzfläche droht den Takt und das Momentum zu verlieren.`;
      actionableTip = `Breakdown um 16-32 Takte verkürzen. Kick-Drum früher einsetzen oder gefilterte Percussions/Claps weiterlaufen lassen, um den Groove aufrechtzuerhalten.`;
    } else if (severity === 'warning') {
      crowdFlowImpact = `Spürbarer Spannungsabfall: ${rangeDuration}s langes Tief mit Tiefstwert ${minEnergy}% (-${energyDeficit}% unter Ø). Gefahr von Unruhe im Publikum, falls der Drop zu spät kommt.`;
      actionableTip = `Spannungsaufbau mit Snare-Rolls oder Riser-Effekten 8 Takte früher anziehen, um den Spannungsbogen vor dem Drop nicht abreißen zu lassen.`;
    } else {
      crowdFlowImpact = `Moderater Durchatmer: Kontrollierter Energieabfall um -${energyDeficit}%. Eignet sich gut als geplante Verschnaufpause zwischen zwei Peak-Clustern.`;
      actionableTip = `Timing optimal halten. Drop auf Takt 1 präzise setzen, damit das Tempo sofort wieder zündet.`;
    }

    gaps.push({
      id: `energy-gap-${idx + 1}-${Math.round(range.startTime)}`,
      startTime: range.startTime,
      endTime: range.endTime,
      duration: rangeDuration,
      minEnergy,
      avgGapEnergy,
      setAverageEnergy,
      energyDeficit,
      minSubBass,
      severity,
      severityScore,
      crowdFlowImpact,
      actionableTip,
      peakTroughTime
    });
  });

  // Sort gaps chronologically
  gaps.sort((a, b) => a.startTime - b.startTime);

  // 5. Build Continuous Heatmap Timeline
  const heatmapTimeline = sortedPoints.map((pt) => {
    const deficit = Math.max(0, thresholdEnergy - pt.energy);
    const inGap = pt.energy < thresholdEnergy;
    const activeGap = gaps.find((g) => pt.time >= g.startTime && pt.time <= g.endTime);

    // Intensity normalized 0.0 to 1.0 based on deficit relative to max possible drop
    const maxPossibleDeficit = Math.max(15, thresholdEnergy - 20);
    const intensity = inGap
      ? Math.min(1.0, Math.max(0.15, deficit / maxPossibleDeficit))
      : 0;

    return {
      time: pt.time,
      energy: pt.energy,
      deficit,
      intensity,
      inGap,
      gapId: activeGap?.id
    };
  });

  const criticalGapsCount = gaps.filter((g) => g.severity === 'critical').length;
  const totalGapDuration = gaps.reduce((sum, g) => sum + g.duration, 0);
  const gapPercentageOfSet = Math.min(100, Math.round((totalGapDuration / Math.max(1, duration)) * 100));

  // Flow continuity score: 100 minus penalty for duration and critical deficits
  const penalty = (criticalGapsCount * 14) + (gaps.length * 5) + (gapPercentageOfSet * 0.6);
  const flowContinuityScore = Math.max(25, Math.min(100, Math.round(100 - penalty)));

  return {
    setAverageEnergy,
    thresholdEnergy,
    sensitivityMode: sensitivity,
    gaps,
    criticalGapsCount,
    totalGapDuration,
    gapPercentageOfSet,
    flowContinuityScore,
    heatmapTimeline
  };
}

/**
 * Returns color codes for gap severity
 */
export function getGapSeverityColors(severity: EnergyGapSeverity) {
  switch (severity) {
    case 'critical':
      return {
        stroke: '#f43f5e',
        fill: '#f43f5e33',
        gradientStart: '#ef4444',
        gradientEnd: '#991b1b',
        badgeBg: 'bg-rose-500/20',
        badgeText: 'text-rose-300',
        badgeBorder: 'border-rose-500/40',
        title: 'KRITISCHER FLOW-KILLER'
      };
    case 'warning':
      return {
        stroke: '#f97316',
        fill: '#f9731626',
        gradientStart: '#f97316',
        gradientEnd: '#c2410c',
        badgeBg: 'bg-amber-500/20',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-amber-500/40',
        title: 'ERHÖHTER SPANNUNGSABFALL'
      };
    case 'moderate':
    default:
      return {
        stroke: '#eab308',
        fill: '#eab3081a',
        gradientStart: '#eab308',
        gradientEnd: '#854d0e',
        badgeBg: 'bg-yellow-500/15',
        badgeText: 'text-yellow-300',
        badgeBorder: 'border-yellow-500/30',
        title: 'MODERATER ATEMHOLER'
      };
  }
}
