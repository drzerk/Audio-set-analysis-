export interface BpmPoint {
  time: number; // in seconds
  bpm: number;
  confidence: number;
}

export interface EnergyPoint {
  time: number; // in seconds
  energy: number; // 0 - 100
  subBass: number; // 0 - 100
  midHigh: number; // 0 - 100
  tension: number; // 0 - 100
}

export interface HarmonyPoint {
  time: number; // in seconds
  keyCamelot: string; // e.g. "8A"
  keyNote: string; // e.g. "A Minor"
  confidence: number;
}

export type PhaseDriftRisk = 'locked' | 'mild-drift' | 'drift-prone' | 'critical-flam';

export interface WaveformAlignmentData {
  timeOffsetMs: number; // e.g. +11.4ms
  timeLabels: number[]; // -50ms to +50ms (in ms)
  deckA: number[]; // normalized transient amplitude of outgoing track (Deck A)
  deckB: number[]; // normalized transient amplitude of incoming track (Deck B)
  summedWaveform: number[]; // acoustic sum of both tracks (highlights constructive peak or destructive comb dip)
  combFilterNotchesHz: number[]; // frequencies where phase cancellation occurs (e.g. [68, 136])
}

export interface DriftForecastStep {
  bar: number; // e.g. 1, 4, 8, 16, 24, 32, 48, 64
  timeSeconds: number; // elapsed seconds into the transition
  driftMs: number; // cumulative phase drift in milliseconds
  status: 'locked' | 'acceptable' | 'flamming' | 'trainwreck';
  combCancellationPercent: number; // 0 to 100% destructive interference
}

export interface BarDriftHeatmapCell {
  bar: number; // 1 to 32
  phraseIndex: number; // 0 (bars 1-8), 1 (bars 9-16), 2 (bars 17-24), 3 (bars 25-32)
  phraseName: string; // 'Intro Blend', 'Groove Build', 'Kick & Bass Swap', 'Outro Bleed'
  timeOffsetSec: number; // elapsed seconds from start of transition
  timestamp: number; // absolute set timestamp
  driftMs: number; // signed drift in ms
  absDriftMs: number; // absolute value in ms
  driftSeverity: 'locked' | 'safe' | 'caution' | 'warning' | 'critical-spike';
  intensity: number; // 0.0 to 1.0
  isSpike: boolean; // whether this bar is inside a detected drift spike zone
  combCancellationPercent: number; // 0 - 100%
  combNotchHz?: number;
  acousticRiskNote: string;
}

export interface DriftSpikeSegment {
  startBar: number;
  endBar: number;
  peakDriftMs: number;
  peakBar: number;
  phraseNames: string[];
  severity: 'warning' | 'critical';
  description: string;
  recommendedAction: string;
}

export interface Transition32BarDriftMap {
  bars: BarDriftHeatmapCell[];
  maxDriftMs: number;
  peakDriftBar: number;
  spikeSegments: DriftSpikeSegment[];
  barsUntilAudibleFlam: number | null;
  overallStatus: 'locked' | 'moderate-drift' | 'severe-spike';
  kickSwapZoneDrift: number; // average drift in bars 17-24
  averageDriftMs: number;
}

export interface PhaseNudgeAdvice {
  direction: 'forward' | 'backward' | 'in-sync';
  offsetMs: number;
  jogWheelTicks: number; // CDJ jog wheel nudge ticks (approx 4-5ms per tick)
  pitchBendPercent: number; // Pitch fader micro-adjustment (e.g. +0.14%)
  driftWarningMessage: string;
  hardwareCorrection: string; // Actionable hardware instruction (CDJ jog wheel / pitch bend)
  phaseCancellationWarning?: string; // Guidance on low-end kick phase cancellation
}

export interface PhaseSyncAnalysis {
  isDriftProne: boolean;
  driftRisk: PhaseDriftRisk;
  phaseCoherenceScore: number; // 0 - 100%
  timeDeltaMs: number; // transient alignment offset in ms (-40ms to +40ms)
  phaseAngleDeg: number; // 0° to 180°
  tempoDeltaBpm: number; // toBpm - fromBpm
  driftRateMsPerBar: number; // ms offset accumulation per 4/4 bar
  barsUntilFlam: number; // bars before drift exceeds audible threshold (~14ms)
  flamThresholdMs: number; // 14ms
  subPhaseCancellationRisk: 'minimal' | 'moderate' | 'severe';
  waveformAlignment: WaveformAlignmentData;
  driftForecast: DriftForecastStep[];
  nudgeAdvice: PhaseNudgeAdvice;
  barDriftHeatmap?: Transition32BarDriftMap;
}

export interface TransitionItem {
  id: string;
  timestamp: number; // in seconds
  duration: number; // mix length in seconds (e.g. 45s)
  qualityScore: number; // 0 - 100
  phaseScore: number; // 0 - 100
  harmonicScore: number; // 0 - 100
  eqClashRisk: 'low' | 'medium' | 'high';
  fromKey: string;
  toKey: string;
  fromBpm: number;
  toBpm: number;
  notes: string;
  type: 'seamless-blend' | 'cut-drop' | 'filter-sweep' | 'breakdown-swap';
  phaseSyncAnalysis?: PhaseSyncAnalysis;
}

export interface PeakMoment {
  id: string;
  timestamp: number; // in seconds
  label: string;
  energyLevel: number; // 0 - 100
  spectralPower: number; // dB or normalized
  dropIntensity: number; // 0 - 100
  description: string;
  type: 'main-drop' | 'acid-build' | 'sub-surge' | 'breakdown-climax';
}

export type SegmentTag =
  | 'Warm-up'
  | 'Build-up'
  | 'Peak Hour'
  | 'Hypnotic Plateau'
  | 'Cool-down'
  | 'Breakdown'
  | string;

export interface SetSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  tag: SegmentTag;
  averageEnergy: number; // 0 - 100
  peakEnergy: number; // 0 - 100
  subBassIntensity: number; // 0 - 100
  description: string;
  color: string; // e.g. '#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#a855f7'
  isCustom?: boolean;
}

export interface TechnicalMetrics {
  peakDb: number;
  rmsDb: number;
  lufsEstimated: number;
  dynamicRangeDb: number;
  subMonoCleanScore: number; // 0 - 100 (phase coherence below 90Hz)
  clippingEvents: number;
  tempoDriftPercent: number;
}

export interface AiAssessment {
  headline: string;
  vibeProfile: string;
  technicalRating: number; // 1 - 100
  energyRating: number; // 1 - 100
  subBassBalance: string;
  harmonicFlow: string;
  pacingAnalysis: string;
  transitionTips: string[];
  recommendation: string;
}

export interface TechnoSetAnalysis {
  id: string;
  name: string;
  fileName?: string;
  fileSizeFormatted?: string;
  createdAt: string;
  updatedAt: string;
  duration: number; // in seconds
  bpmAverage: number;
  bpmMin: number;
  bpmMax: number;
  dominantKey: string;
  bpmPoints: BpmPoint[];
  energyPoints: EnergyPoint[];
  harmonyPoints: HarmonyPoint[];
  transitions: TransitionItem[];
  peakMoments: PeakMoment[];
  segments: SetSegment[];
  technicalMetrics: TechnicalMetrics;
  aiAssessment?: AiAssessment;
  isCloudSynced: boolean;
  audioUrl?: string; // object URL or generated tone stream for playback
  customNotes?: string;
  sourcePlatform?: 'file' | 'soundcloud' | 'hearthis' | 'mixcloud' | 'direct-stream';
  sourceUrl?: string;
  artistName?: string;
  artworkUrl?: string;
}

export type StreamingPlatform = 'hearthis' | 'soundcloud' | 'mixcloud' | 'direct' | 'unknown';

export interface StreamMetadataResult {
  platform: StreamingPlatform;
  title: string;
  artist: string;
  duration: number; // in seconds
  artworkUrl?: string;
  streamUrl?: string;
  permalinkUrl?: string;
  downloadable: boolean;
  requiresProxy: boolean;
  description?: string;
  genre?: string;
  bpm?: number;
  tracklist?: Array<{ title: string; artist?: string; timestamp?: number }>;
  note?: string;
  error?: string;
}

export type BoothTheme = 'booth-dark' | 'red-stage-night' | 'cyan-laser';

export interface TargetProfileMilestone {
  percentTime: number; // 0 to 100
  targetEnergy: number; // 0 to 100
}

export interface TargetEnergyProfile {
  id: string;
  name: string;
  description: string;
  category: 'Rising Intensity' | 'Constant Flow' | 'Double Peak' | 'Warm-up Opening' | 'Afterhour Deep' | 'Custom';
  milestones: TargetProfileMilestone[];
  tolerance: number; // +/- tolerance percentage, e.g. 10
  color: string;
  isCustom?: boolean;
}

export interface ProfileComparisonZone {
  zoneName: string;
  timeRangeFormatted: string;
  startSec: number;
  endSec: number;
  targetAvg: number;
  actualAvg: number;
  deviation: number; // actualAvg - targetAvg
  status: 'optimal' | 'slight-over' | 'slight-under' | 'critical-over' | 'critical-under';
  feedback: string;
}

export interface ProfileComparisonFeedback {
  overallScore: number; // 0 - 100
  grade: 'S+' | 'A' | 'B' | 'C' | 'D';
  headline: string;
  summary: string;
  pacingCorrelation: number; // -1 to 1 (Pearson/slope correlation)
  avgDeviation: number; // percentage
  maxDeviation: {
    timestamp: number;
    delta: number;
    type: 'over-energy' | 'under-energy';
    description: string;
  };
  zoneBreakdown: ProfileComparisonZone[];
  djTips: string[];
  targetProfile: TargetEnergyProfile;
}

export type ClashSeverity = 'critical' | 'moderate' | 'warning' | 'synergy';

export type ClashType =
  | 'anti-climax-drop'
  | 'misplaced-boost-breakdown'
  | 'dissonant-pressure-clash'
  | 'harmonic-monotony'
  | 'optimal-energy-lift'
  | 'controlled-grounding'
  | 'hypnotic-steady';

export interface HarmonicEnergyClashPoint {
  id: string;
  timestamp: number; // in seconds
  duration?: number;
  fromKey: string;
  toKey: string;
  fromEnergy: number;
  toEnergy: number;
  energyDelta: number; // toEnergy - fromEnergy
  camelotStepDelta: number; // -6 to +6
  camelotDistance: number; // 0 to 6
  severity: ClashSeverity;
  clashType: ClashType;
  title: string;
  description: string;
  remedy: string;
  phaseContext: string;
  xPct: number; // 0 to 100
}

export interface HarmonicEnergyAnalysisResult {
  overallSynergyScore: number; // 0 - 100
  grade: 'S+' | 'A' | 'B' | 'C' | 'D';
  clashesCount: {
    critical: number;
    moderate: number;
    warning: number;
    synergy: number;
    total: number;
  };
  clashPoints: HarmonicEnergyClashPoint[];
  harmonicMomentumTrend: {
    time: number;
    energy: number;
    energySmoothed: number;
    keyCamelot: string;
    keyNumber: number;
    keyMode: 'A' | 'B';
    keyColor: string;
    harmonicTensionIndex: number;
    isClashHotspot: boolean;
    activeClash?: HarmonicEnergyClashPoint;
  }[];
  coherenceAssessment: string;
  djDirectives: string[];
}

export type HardwareMixerType = 'xone96' | 'djm900' | 'djmV10' | 'parametric';

export interface EqCutRecommendation {
  id: string;
  band: 'sub-low' | 'low-mid' | 'mid' | 'high-mid';
  targetTrack: 'incoming' | 'outgoing' | 'both';
  filterType: 'hpf' | 'bell-cut' | 'notch' | 'high-shelf' | 'low-shelf';
  centerFrequencyHz: number;
  bandwidthQ: number;
  cutGainDb: number; // e.g. -4.5 or -24 for kill
  targetMudIssue: string; // e.g. "Low-Mid Boxiness (220 Hz Resonanz & Schwebung)"
  actionSummary: string; // e.g. "Senke 220 Hz um -4.5 dB mit moderatem Q am Lo-Mid Band"
  priority: 'critical' | 'recommended' | 'optional';
  hardwareKnobSettings: {
    xone96: { knob: string; position: string; action: string };
    djm900: { knob: string; position: string; action: string };
    djmV10: { knob: string; position: string; action: string };
    parametric: { freq: string; gain: string; q: string };
  };
}

export interface TransitionEqAdvice {
  transitionId: string;
  timestamp: number;
  fromKey: string;
  toKey: string;
  camelotDistance: number;
  fromKeyRootHz: number;
  toKeyRootHz: number;
  mudRiskIndex: number; // 0 - 100
  mudRiskLevel: 'minimal' | 'moderate' | 'high' | 'severe';
  primaryMudZoneHz: string; // e.g. "175 - 280 Hz"
  fundamentalCollision: string;
  recommendedCuts: EqCutRecommendation[];
  mixChoreography: {
    phase: string;
    bars: string;
    action: string;
    eqMove: string;
  }[];
  spectralSimulation: {
    freqHz: number;
    rawCombinedDb: number;
    carvedCombinedDb: number;
    mudAccumulationDb: number;
  }[];
}

export type EnergyGapSeverity = 'critical' | 'warning' | 'moderate';

export interface EnergyGap {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  minEnergy: number; // lowest point (0-100)
  avgGapEnergy: number; // average energy during this gap
  setAverageEnergy: number; // set average reference
  energyDeficit: number; // setAverage - minEnergy
  minSubBass: number; // lowest subBass during this gap
  severity: EnergyGapSeverity;
  severityScore: number; // 0 - 100 for heatmap coloring
  crowdFlowImpact: string; // e.g. "Hohes Risiko: Tanzfläche verliert Momentum durch überlangen Breakdown"
  actionableTip: string; // e.g. "Breakdown um 16 Takte kürzen oder Percussion/Hi-Hats früher einbringen"
  peakTroughTime: number; // timestamp where the energy hits lowest trough
}

export interface EnergyGapAnalysisResult {
  setAverageEnergy: number;
  thresholdEnergy: number;
  sensitivityMode: 'conservative' | 'standard' | 'aggressive';
  gaps: EnergyGap[];
  criticalGapsCount: number;
  totalGapDuration: number; // total seconds spent in flow-deficit
  gapPercentageOfSet: number; // percentage of set duration in gap
  flowContinuityScore: number; // 0 - 100
  heatmapTimeline: {
    time: number;
    energy: number;
    deficit: number;
    intensity: number; // 0 to 1
    inGap: boolean;
    gapId?: string;
  }[];
}

