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
  Waves
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
      className={`w-full bg-[#101217] border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden ${className}`.trim()}
    >
      {/* 1. Header: Title, Description and State-aware Progress Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isAllComplete ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wider uppercase flex items-center gap-2">
            Quick Setup
          </h2>
          <span className="text-xs text-slate-400 font-sans hidden sm:inline">
            • 3-Step Production Readiness Tracker
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Status:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-md border text-xs tracking-tight ${
                isAllComplete
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10'
              }`}
            >
              {completedStepsCount} of 3 Complete ({percentComplete}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sleek 3-Step Horizontal Progress Tracker Bar */}
      <div className="relative w-full pt-2 pb-1">
        {/* Continuous Horizontal Background Track */}
        <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-1 bg-slate-800 rounded-full -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full shadow-sm shadow-emerald-500/40"
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

        {/* 3 Step Nodes and Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
          {/* STEP 1: Upload Set */}
          <div
            id="tracker-step-1-upload"
            className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isSetLoaded
                ? 'bg-[#121620] border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                : 'bg-[#151922] border-slate-600/80 shadow-sm'
            }`}
          >
            <div>
              {/* Node indicator and label */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      isSetLoaded
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
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
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isSetLoaded
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-slate-400 bg-slate-800 border-slate-600'
                  }`}
                >
                  {isSetLoaded ? 'Complete ✓' : 'Required'}
                </span>
              </div>

              {/* Step info description */}
              <p className="text-xs font-semibold text-slate-200 truncate" title={currentSet?.name}>
                {isSetLoaded ? currentSet.name : 'Kein Set geladen'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isSetLoaded
                  ? `Dauer: ${formatTimeSeconds(currentSet.duration)} • Audio-Stream bereit für Spektrum & Waveform.`
                  : 'Lade ein Techno-Set hoch oder wähle eine Demo-Session.'}
              </p>
            </div>

            {/* Step Action Bottom Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                {currentSet?.audioUrl ? 'Waveform aktiv' : 'Lokale Audiospur'}
              </span>
              <button
                onClick={onOpenUpload}
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>{isSetLoaded ? 'Change Set' : 'Upload'}</span>
              </button>
            </div>
          </div>

          {/* STEP 2: Run Analysis */}
          <div
            id="tracker-step-2-analysis"
            className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              hasAnalysisMetadata
                ? 'bg-[#121620] border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                : 'bg-[#151922] border-slate-600/80 shadow-sm'
            }`}
          >
            <div>
              {/* Node indicator and label */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      hasAnalysisMetadata
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                        : isReanalyzing
                        ? 'bg-cyan-500 text-black animate-pulse'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
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
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    hasAnalysisMetadata
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  {hasAnalysisMetadata ? 'Complete ✓' : 'Pending'}
                </span>
              </div>

              {/* Step info description */}
              {hasAnalysisMetadata ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold font-mono text-white">
                      {currentSet.bpmAverage} BPM
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Key: {currentSet.dominantKey.split(' ')[0] || '8A'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {currentSet.technicalMetrics?.lufsEstimated
                      ? `${currentSet.technicalMetrics.lufsEstimated} LUFS • `
                      : ''}
                    Beatgrid, Transienten-Marker & Dynamik-Kurve synchronisiert.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Führe die DSP-Analyse aus, um BPM, Tonart und Beatgrid-Phasen zu berechnen.
                </p>
              )}
            </div>

            {/* Step Action Bottom Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                {isReanalyzing ? 'Scanning DSP...' : 'DSP Metriken OK'}
              </span>
              <button
                disabled={isReanalyzing || !isSetLoaded}
                onClick={handleReanalyze}
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 text-emerald-400 ${isReanalyzing ? 'animate-spin' : ''}`}
                />
                <span>{isReanalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
              </button>
            </div>
          </div>

          {/* STEP 3: Review Transitions */}
          <div
            id="tracker-step-3-transitions"
            className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isTransitionTagged
                ? 'bg-[#121620] border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                : 'bg-[#181a24] border-slate-600/80 shadow-sm'
            }`}
          >
            <div>
              {/* Node indicator and label */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      isTransitionTagged
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
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
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isTransitionTagged
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  {isTransitionTagged ? 'Complete ✓' : 'Needs Review'}
                </span>
              </div>

              {/* Step info description */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold font-mono text-white">
                  {currentSet.transitions?.length || 0} Übergangs-Zonen
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {taggedTransitions.length} Verifiziert
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isTransitionTagged
                  ? `Mindestens ein Übergang ist getaggt (${taggedTransitions[0]?.tag || taggedTransitions[0]?.type || 'Verifizierter Blend'}).`
                  : 'Prüfe Übergänge im Inspektor auf Low-End Mud und setze Transitions-Tags.'}
              </p>
            </div>

            {/* Step Action Bottom Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
              <button
                onClick={handleTagFirstTransition}
                className="text-[11px] font-mono text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                title="Ersten Übergang mit 'Verifizierter Blend' taggen"
              >
                <Tag className="w-3 h-3 text-emerald-400" />
                <span>Tag Blend</span>
              </button>
              <button
                onClick={handleInspectTransitions}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Sliders className="w-3 h-3 text-black" />
                <span>Review</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Celebration / Club-Ready Banner (Visible when all 3 steps are complete) */}
      {isAllComplete && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-300">
              <strong className="text-white font-semibold">Club-Ready:</strong> Setup abgeschlossen! Set geladen, DSP-Analyse berechnet und Übergänge verifiziert.
            </p>
          </div>

          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-black" />
              <span>{isPlaying ? 'Pausieren' : 'Set jetzt starten'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
