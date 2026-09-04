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
  technicalMetrics: TechnicalMetrics;
  aiAssessment?: AiAssessment;
  isCloudSynced: boolean;
  audioUrl?: string; // object URL or generated tone stream for playback
  customNotes?: string;
}

export type BoothTheme = 'booth-dark' | 'red-stage-night' | 'cyan-laser';
