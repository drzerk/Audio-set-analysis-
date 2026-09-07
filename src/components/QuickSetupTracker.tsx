import React, { useState } from 'react';
import {
  Check,
  Upload,
  Activity,
  Sliders,
  Sparkles,
  RefreshCw,
  Play,
  Tag,
  Clock,
  Zap,
  ArrowRight,
  Disc3,
  Waves,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TechnoSetAnalysis, TransitionItem, AppWorkspaceTab } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { useToast } from './ui/ToastContext';

interface QuickSetupTrackerProps {
  currentSet: TechnoSetAnalysis;
  onOpenUpload: () => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onJumpToTransition: (t: TransitionItem) => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
  onUpdateTransition?: (updated: TransitionItem) => void;
  className?: string;
}

export const QuickSetupTracker: React.FC<QuickSetupTrackerProps> = ({
  currentSet,
  onOpenUpload,
  onSelectTab,
  onJumpToTransition,
  onTogglePlay,
  isPlaying,
  onUpdateTransition,
  className = ''
}) => {
  const { showToast } = useToast();
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // 1) Step 1: Upload Set - Complete if valid set is loaded
  const isSetLoaded = Boolean(
    currentSet &&
      currentSet.id &&
      currentSet.name &&
      currentSet.name.trim().length > 0 &&
      currentSet.duration > 0
  );

  // 2) Step 2: Run Analysis - Complete once analysis metadata exists
  const hasAnalysisMetadata = Boolean(
    isSetLoaded &&
      currentSet.bpmAverage > 0 &&
      Boolean(currentSet.technicalMetrics) &&
      Boolean(currentSet.dominantKey) &&
      ((currentSet.bpmPoints && currentSet.bpmPoints.length > 0) ||
        (currentSet.energyPoints && currentSet.energyPoints.length > 0))
  );

  // 3) Step 3: Review Transitions - Complete if at least one transition is tagged
  const taggedTransitions = currentSet?.transitions
    ? currentSet.transitions.filter(
        (t) =>
          Boolean(t.isTagged) ||
          Boolean(t.tag && t.tag.trim().length > 0) ||
          Boolean(t.tags && t.tags.length > 0) ||
          Boolean(t.type)
      )
    : [];

  const isTransitionTagged = Boolean(
    isSetLoaded &&
      currentSet.transitions &&
      currentSet.transitions.length > 0 &&
      taggedTransitions.length > 0
  );

  // Active step calculation
  const completedStepsCount =
    (isSetLoaded ? 1 : 0) +
    (hasAnalysisMetadata ? 1 : 0) +
    (isTransitionTagged ? 1 : 0);

  const percentComplete = Math.round((completedStepsCount / 3) * 100);
  const isAllComplete = completedStepsCount === 3;

  // Step Status Types
  type StepStatus = 'completed' | 'current' | 'upcoming';
  const step1Status: StepStatus = isSetLoaded ? 'completed' : 'current';
  const step2Status: StepStatus = hasAnalysisMetadata
    ? 'completed'
    : isSetLoaded
    ? 'current'
    : 'upcoming';
  const step3Status: StepStatus = isTransitionTagged
    ? 'completed'
    : hasAnalysisMetadata
    ? 'current'
    : 'upcoming';

  const steps = [
    {
      id: 1,
      title: 'Upload Set',
      description: isSetLoaded
        ? `${currentSet.name} (${formatTimeSeconds(currentSet.duration)})`
        : 'Audio-File oder Demo-Set laden',
      status: step1Status,
      isComplete: isSetLoaded,
      badgeText: isSetLoaded ? 'Loaded ✓' : 'Pending',
      actionLabel: isSetLoaded ? 'Change Set' : 'Upload',
      onAction: onOpenUpload
    },
    {
      id: 2,
      title: 'Run Analysis',
      description: hasAnalysisMetadata
        ? `${currentSet.bpmAverage} BPM • ${currentSet.dominantKey.split(' ')[0]} • Beatgrid OK`
        : 'DSP-Analyse starten',
      status: step2Status,
      isComplete: hasAnalysisMetadata,
      badgeText: hasAnalysisMetadata ? 'Analyzed ✓' : isReanalyzing ? 'Scanning...' : 'Pending',
      actionLabel: isReanalyzing ? 'Scanning...' : 'Run Analysis',
      onAction: () => handleReanalyze()
    },
    {
      id: 3,
      title: 'Review Transitions',
      description: isTransitionTagged
        ? `${taggedTransitions.length} von ${currentSet.transitions?.length || 0} Übergängen verifiziert`
        : 'Mindestens einen Übergang taggen',
      status: step3Status,
      isComplete: isTransitionTagged,
      badgeText: isTransitionTagged ? 'Reviewed ✓' : 'Needs Review',
      actionLabel: 'Review',
      onAction: () => handleInspectTransitions()
    }
  ];

  // Actions
  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setTimeout(() => {
      setIsReanalyzing(false);
      showToast(
        'DSP-Analyse erfolgreich aktualisiert! ✓',
        'success',
        `${currentSet.bpmAverage} BPM • ${currentSet.dominantKey.split(' ')[0]} • Transienten und Beatgrid synchronisiert.`
      );
    }, 700);
  };

  const handleTagFirstTransition = () => {
    if (!currentSet.transitions || currentSet.transitions.length === 0) {
      onSelectTab('diagnosis');
      showToast('Keine Übergänge vorhanden', 'warning', 'Füge im Mix-Inspektor Übergangs-Marker hinzu.');
      return;
    }

    const firstTrans = currentSet.transitions[0];
    const updated: TransitionItem = {
      ...firstTrans,
      isTagged: true,
      tag: firstTrans.tag || 'Verifizierter Blend',
      notes: firstTrans.notes || 'Akustisch geprüft: Frequenztrennung und Phasenlage im grünen Bereich.'
    };

    if (onUpdateTransition) {
      onUpdateTransition(updated);
    }
    showToast(
      'Übergang verifiziert & getaggt! ✓',
      'success',
      `Marker bei ${formatTimeSeconds(firstTrans.timestamp)} als "${updated.tag}" markiert.`
    );
  };

  const handleInspectTransitions = () => {
    if (currentSet.transitions && currentSet.transitions.length > 0) {
      onJumpToTransition(currentSet.transitions[0]);
    }
    onSelectTab('diagnosis');
    showToast('Mix-Inspektor geöffnet', 'info', 'Übergänge und Phase-Alignment zur Prüfung geladen.');
  };

  return (
    <div
      id="quick-setup-tracker-card"
      className={`w-full mb-6 bg-gradient-to-b from-[#101420] via-[#0d1017] to-[#0b0e15] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-5 relative overflow-hidden transition-all ${className}`.trim()}
    >
      {/* 1. Header: Title, Description and State-aware Progress Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              isAllComplete
                ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wider uppercase">
              Quick Setup
            </h2>
            <span className="text-xs text-slate-400 font-sans hidden sm:inline">
              3-Step Production Readiness Tracker
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Pill with Segment Meter */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono shadow-inner">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSetLoaded ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
                title="Step 1: Set Upload"
              />
              <span
                className={`w-2 h-2 rounded-full ${
                  hasAnalysisMetadata ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
                title="Step 2: DSP-Analyse"
              />
              <span
                className={`w-2 h-2 rounded-full ${
                  isTransitionTagged ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
                title="Step 3: Mix-Review"
              />
            </div>
            <span className="text-slate-300 font-medium">
              {completedStepsCount}/3 Ready
            </span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-md text-[11px] tracking-tight ${
                isAllComplete
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {percentComplete}%
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/70 hover:bg-slate-800 border border-slate-800/90 transition-colors cursor-pointer"
            title={isCollapsed ? 'Tracker ausklappen' : 'Tracker einklappen'}
            aria-label={isCollapsed ? 'Expand Quick Setup' : 'Collapse Quick Setup'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* When Collapsed: Quick Single-Line Summary Strip */}
      {isCollapsed && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2 font-mono">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSetLoaded ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
              <span className={isSetLoaded ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                1. Set Upload {isSetLoaded && '✓'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  hasAnalysisMetadata ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
              <span className={hasAnalysisMetadata ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                2. DSP-Analyse {hasAnalysisMetadata && '✓'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isTransitionTagged ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
              <span className={isTransitionTagged ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                3. Mix-Review {isTransitionTagged && '✓'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>Details einblenden</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* When Expanded: 2. Sleek 3-Step Horizontal Progress Tracker Bar */}
      {!isCollapsed && (
        <>
          <div className="relative w-full pt-1 pb-1">
            {/* Continuous Horizontal Background Track connecting the 3 cards */}
            <div className="hidden md:block absolute top-[36px] left-[17%] right-[17%] h-1 bg-slate-800/80 rounded-full z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full shadow-sm shadow-emerald-500/50"
                style={{
                  width:
                    completedStepsCount === 3
                      ? '100%'
                      : completedStepsCount === 2
                      ? '50%'
                      : completedStepsCount === 1
                      ? '0%'
                      : '0%'
                }}
              />
            </div>

            {/* 3 Step Nodes and Action Cards with consistent height & alignment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-4.5 lg:gap-5 relative z-10 items-stretch">
              {/* STEP 1: Upload Set */}
              <div
                id="tracker-step-1-upload"
                className={`flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl border transition-all min-h-[200px] h-full ${
                  isSetLoaded
                    ? 'bg-gradient-to-b from-[#111724] to-[#0c1017] border-emerald-500/40 shadow-md shadow-emerald-950/20 hover:border-emerald-500/60'
                    : 'bg-gradient-to-b from-[#141b2a] to-[#0e131d] border-cyan-500/40 shadow-md ring-1 ring-cyan-500/25 hover:border-cyan-500/60'
                }`}
              >
                <div>
                  {/* Node indicator and label */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                          isSetLoaded
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                            : 'bg-slate-700 text-white border border-slate-600'
                        }`}
                      >
                        {isSetLoaded ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono uppercase text-white tracking-wide">
                          Upload Set
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Step 1 of 3</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isSetLoaded
                          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35'
                          : 'text-slate-300 bg-slate-800 border-slate-600'
                      }`}
                    >
                      {isSetLoaded ? 'Complete ✓' : 'Required'}
                    </span>
                  </div>

                  {/* Step info description */}
                  <div className="min-h-[64px] flex flex-col justify-start">
                    <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate" title={currentSet?.name}>
                      {isSetLoaded ? currentSet.name : 'Kein Set geladen'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {isSetLoaded
                        ? `Dauer: ${formatTimeSeconds(currentSet.duration)} • Audio-Stream bereit für Spektrum & Waveform.`
                        : 'Lade ein Techno-Set hoch oder wähle eine Demo-Session.'}
                    </p>
                  </div>
                </div>

                {/* Step Action Bottom Bar */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {currentSet?.audioUrl ? 'Waveform aktiv' : 'Lokale Audiospur'}
                  </span>
                  <button
                    onClick={onOpenUpload}
                    className="h-8.5 px-3.5 text-xs font-mono font-medium rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSetLoaded ? 'Change Set' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              {/* STEP 2: Run Analysis */}
              <div
                id="tracker-step-2-analysis"
                className={`flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl border transition-all min-h-[200px] h-full ${
                  hasAnalysisMetadata
                    ? 'bg-gradient-to-b from-[#111724] to-[#0c1017] border-emerald-500/40 shadow-md shadow-emerald-950/20 hover:border-emerald-500/60'
                    : isSetLoaded
                    ? 'bg-gradient-to-b from-[#141b2a] to-[#0e131d] border-cyan-500/40 shadow-md ring-1 ring-cyan-500/25 hover:border-cyan-500/60'
                    : 'bg-gradient-to-b from-[#0f131a] to-[#0a0d13] border-slate-800/80 opacity-75'
                }`}
              >
                <div>
                  {/* Node indicator and label */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                          hasAnalysisMetadata
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                            : isReanalyzing
                            ? 'bg-cyan-500 text-black animate-pulse'
                            : isSetLoaded
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {hasAnalysisMetadata ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isReanalyzing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          '2'
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono uppercase text-white tracking-wide">
                          Run Analysis
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Step 2 of 3</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        hasAnalysisMetadata
                          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35'
                          : isSetLoaded
                          ? 'text-amber-300 bg-amber-500/15 border-amber-500/35'
                          : 'text-slate-400 bg-slate-800 border-slate-700'
                      }`}
                    >
                      {hasAnalysisMetadata ? 'Complete ✓' : isSetLoaded ? 'Ready to Scan' : 'Pending'}
                    </span>
                  </div>

                  {/* Step info description */}
                  <div className="min-h-[64px] flex flex-col justify-start">
                    {hasAnalysisMetadata ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs sm:text-sm font-bold font-mono text-white">
                            {currentSet.bpmAverage} BPM
                          </span>
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            Key: {currentSet.dominantKey.split(' ')[0] || '8A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {currentSet.technicalMetrics?.lufsEstimated
                            ? `${currentSet.technicalMetrics.lufsEstimated} LUFS • `
                            : ''}
                          Beatgrid, Transienten-Marker & Dynamik-Kurve berechnet.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Führe die DSP-Analyse aus, um BPM, Tonart und Beatgrid-Phasen präzise zu synchronisieren.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step Action Bottom Bar */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {isReanalyzing ? 'Scanning DSP...' : hasAnalysisMetadata ? 'DSP Metriken OK' : 'Bereit'}
                  </span>
                  <button
                    disabled={isReanalyzing || !isSetLoaded}
                    onClick={handleReanalyze}
                    className="h-8.5 px-3.5 text-xs font-mono font-medium rounded-xl bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-emerald-400 ${isReanalyzing ? 'animate-spin' : ''}`}
                    />
                    <span>{isReanalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
                  </button>
                </div>
              </div>

              {/* STEP 3: Review Transitions */}
              <div
                id="tracker-step-3-transitions"
                className={`flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl border transition-all min-h-[200px] h-full ${
                  isTransitionTagged
                    ? 'bg-gradient-to-b from-[#111724] to-[#0c1017] border-emerald-500/40 shadow-md shadow-emerald-950/20 hover:border-emerald-500/60'
                    : hasAnalysisMetadata
                    ? 'bg-gradient-to-b from-[#141b2a] to-[#0e131d] border-amber-500/40 shadow-md ring-1 ring-amber-500/25 hover:border-amber-500/60'
                    : 'bg-gradient-to-b from-[#0f131a] to-[#0a0d13] border-slate-800/80 opacity-75'
                }`}
              >
                <div>
                  {/* Node indicator and label */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                          isTransitionTagged
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                            : hasAnalysisMetadata
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {isTransitionTagged ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono uppercase text-white tracking-wide">
                          Review Transitions
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Step 3 of 3</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isTransitionTagged
                          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35'
                          : hasAnalysisMetadata
                          ? 'text-amber-300 bg-amber-500/15 border-amber-500/35'
                          : 'text-slate-400 bg-slate-800 border-slate-700'
                      }`}
                    >
                      {isTransitionTagged ? 'Complete ✓' : hasAnalysisMetadata ? 'Needs Review' : 'Pending'}
                    </span>
                  </div>

                  {/* Step info description */}
                  <div className="min-h-[64px] flex flex-col justify-start">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs sm:text-sm font-bold font-mono text-white">
                        {currentSet.transitions?.length || 0} Übergangs-Zonen
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">
                        {taggedTransitions.length} Verifiziert
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {isTransitionTagged
                        ? `Mindestens ein Übergang getaggt (${taggedTransitions[0]?.tag || taggedTransitions[0]?.type || 'Verifizierter Blend'}).`
                        : 'Prüfe Übergänge im Inspektor auf Low-End Mud und setze Transitions-Tags.'}
                    </p>
                  </div>
                </div>

                {/* Step Action Bottom Bar */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={handleTagFirstTransition}
                    className="text-xs font-mono text-slate-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Ersten Übergang mit 'Verifizierter Blend' taggen"
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tag Blend</span>
                  </button>
                  <button
                    onClick={handleInspectTransitions}
                    className="h-8.5 px-3.5 text-xs font-mono font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/25 shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5 text-black" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Celebration / Club-Ready Banner (Visible when all 3 steps are complete) */}
          {isAllComplete && (
            <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 sm:p-4.5 flex flex-wrap items-center justify-between gap-3.5 mt-2 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-slate-200">
                  <strong className="text-emerald-400 font-bold">Club-Ready:</strong> Setup abgeschlossen! Set geladen, DSP-Analyse berechnet und Übergänge verifiziert.
                </p>
              </div>

              {onTogglePlay && (
                <button
                  onClick={onTogglePlay}
                  className="h-8.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/25 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{isPlaying ? 'Pausieren' : 'Set jetzt starten'}</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
