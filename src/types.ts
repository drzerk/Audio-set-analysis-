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

