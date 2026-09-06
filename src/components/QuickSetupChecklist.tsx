import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  UploadCloud,
  Activity,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
  Zap,
  Disc3,
  Flame,
  Clock
} from 'lucide-react';
import { TechnoSetAnalysis, TransitionItem, AppWorkspaceTab } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { useToast } from './ui/ToastContext';

interface QuickSetupChecklistProps {
  currentSet: TechnoSetAnalysis;
  onOpenUpload: () => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onJumpToTransition: (t: TransitionItem) => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
  onExportPdf?: () => void;
}

export const QuickSetupChecklist: React.FC<QuickSetupChecklistProps> = ({
  currentSet,
  onOpenUpload,
  onSelectTab,
  onJumpToTransition,
  onTogglePlay,
  isPlaying,
  onExportPdf
}) => {
  const { showToast } = useToast();

  // Track completion state with persistence key based on current set ID
  const storageKey = `techno_setup_reviewed_${currentSet.id}`;
  const [hasReviewedTransitions, setHasReviewedTransitions] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const [isAnalysisSimulating, setIsAnalysisSimulating] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(100);
  const [isManualAnalysisCompleted, setIsManualAnalysisCompleted] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Sync state if set changes
  useEffect(() => {
    const isReviewed = localStorage.getItem(`techno_setup_reviewed_${currentSet.id}`) === 'true';
    setHasReviewedTransitions(isReviewed);
  }, [currentSet.id]);

  // Determine completion of the 3 steps
  // 1) Upload Set: True if a set exists with duration and track data
  const isUploadCompleted = Boolean(currentSet && currentSet.duration > 0 && currentSet.name);

  // 2) Run Analysis: True if set has BPM, key and transitions computed
  const isAnalysisCompleted = Boolean(
    isManualAnalysisCompleted &&
      currentSet &&
      currentSet.bpmAverage > 0 &&
      currentSet.transitions &&
      currentSet.transitions.length > 0
  );

  // 3) Review Transitions: True if marked reviewed or inspected
  const isReviewCompleted = hasReviewedTransitions;

  // Calculate completed count
  const completedStepsCount =
    (isUploadCompleted ? 1 : 0) +
    (isAnalysisCompleted ? 1 : 0) +
    (isReviewCompleted ? 1 : 0);

  const progressPercent = Math.round((completedStepsCount / 3) * 100);
  const isAllCompleted = completedStepsCount === 3;

  // Handlers for steps
  const handleToggleStep1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenUpload();
  };

  const handleRunAnalysis = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAnalysisSimulating(true);
    setAnalysisProgress(0);

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalysisSimulating(false);
          setIsManualAnalysisCompleted(true);
          showToast(
            'Analyse erfolgreich aktualisiert!',
            'success',
            `${currentSet.bpmAverage} BPM • ${currentSet.transitions.length} Übergänge & Transienten-Grids synchronisiert.`
          );
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleToggleReviewStep = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !hasReviewedTransitions;
    setHasReviewedTransitions(nextVal);
    localStorage.setItem(storageKey, nextVal ? 'true' : 'false');
    if (nextVal) {
      showToast(
        'Übergänge als geprüft markiert! ✓',
        'success',
        'Alle Übergangs-Zonen und Frequenz-Cuts wurden bestätigt.'
      );
    }
  };

  const handleReviewAction = () => {
    // Jump to the first transition or diagnosis tab and mark completed
    if (currentSet.transitions.length > 0) {
      onJumpToTransition(currentSet.transitions[0]);
    }
    onSelectTab('diagnosis');
    if (!hasReviewedTransitions) {
      setHasReviewedTransitions(true);
      localStorage.setItem(storageKey, 'true');
      showToast('Mix-Inspektor geöffnet', 'info', 'Erster Übergang wurde im Detail geladen.');
    }
  };

  return (
    <div
      id="quick-setup-checklist-card"
      className="w-full bg-[#0d1017] border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all duration-300"
    >
      {/* Header bar with Progress Reinforcement */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#121622] via-[#0f131c] to-[#121622] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isAllCompleted
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
            }`}
          >
            {isAllCompleted ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Quick Setup • Fortschritts-Checkliste
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isAllCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}
              >
                {completedStepsCount} von 3 erledigt ({progressPercent}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAllCompleted
                ? 'Hervorragend! Dein Set ist vollständig vorbereitet und club-bereit.'
                : 'Folge den 3 Schritten, um dein Techno-Set akustisch und harmonisch abzusichern.'}
            </p>
          </div>
        </div>

        {/* Progress Bar & Collapse Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end gap-1 w-36">
            <div className="flex justify-between w-full text-[10px] font-mono text-slate-400">
              <span>Status</span>
              <span className={isAllCompleted ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {isAllCompleted ? '100% Bereit' : `${progressPercent}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isAllCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            id="btn-toggle-quick-setup-collapse"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? 'Checkliste erweitern' : 'Checkliste minimieren'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Checklist Content (Expanded or Collapsed preview) */}
      {!isCollapsed ? (
        <div className="p-3 sm:p-4 flex flex-col gap-3">
          {/* Mobile Progress Bar */}
          <div className="sm:hidden w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full transition-all duration-500 ${
                isAllCompleted ? 'bg-emerald-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 3 Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* STEP 1: Upload Set */}
            <div
              id="quick-setup-step-1"
              className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between gap-3 ${
                isUploadCompleted
                  ? 'bg-[#10141d] border-emerald-500/30 text-slate-200'
                  : 'bg-[#121622] border-blue-500/40 shadow-sm shadow-blue-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleStep1}
                      className="cursor-pointer focus:outline-none"
                      title="Klicken, um ein anderes Set zu laden"
                    >
                      {isUploadCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-400 font-mono text-xs font-bold">
                          1
                        </div>
                      )}
                    </button>
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      1. Set hochladen
                    </span>
                  </div>

                  {isUploadCompleted && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                      ✓ Geladen
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <h4 className="text-xs font-bold text-white truncate" title={currentSet.name}>
                    {currentSet.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Dauer: {formatTimeSeconds(currentSet.duration)} • Audio-Signal bereit für Waveform- & Beatgrid-Inspektion.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  {currentSet.audioUrl ? 'Club Audio Stream' : 'Lokale Synthese'}
                </span>
                <button
                  onClick={onOpenUpload}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3 h-3 text-cyan-400" />
                  <span>{isUploadCompleted ? 'Set wechseln' : 'Hochladen'}</span>
                </button>
              </div>
            </div>

            {/* STEP 2: Run Analysis */}
            <div
              id="quick-setup-step-2"
              className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between gap-3 ${
                isAnalysisCompleted
                  ? 'bg-[#10141d] border-emerald-500/30 text-slate-200'
                  : 'bg-[#121622] border-blue-500/40 shadow-sm shadow-blue-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsManualAnalysisCompleted((prev) => !prev)}
                      className="cursor-pointer focus:outline-none"
                      title="Klicken zum manuellen Umschalten"
                    >
                      {isAnalysisCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-400 font-mono text-xs font-bold">
                          2
                        </div>
                      )}
                    </button>
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      2. Set analysieren
                    </span>
                  </div>

                  {isAnalysisCompleted && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                      ✓ Synchron
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {currentSet.bpmAverage} BPM
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                      Key: {currentSet.dominantKey.split(' ')[0] || '8A'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {currentSet.transitions.length} Übergänge erkannt • Phasen-Genauigkeit{' '}
                    {Math.round(
                      currentSet.transitions.reduce((a, b) => a + (b.phaseScore || 90), 0) /
                        (currentSet.transitions.length || 1)
                    )}
                    %
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  {isAnalysisSimulating ? `Scanne... ${analysisProgress}%` : 'DSP Beatgrid OK'}
                </span>
                <button
                  disabled={isAnalysisSimulating}
                  onClick={() => handleRunAnalysis()}
                  className="px-2.5 py-1 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-200 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Analyse neu starten"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-cyan-400 ${
                      isAnalysisSimulating ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{isAnalysisSimulating ? 'Analysiere...' : 'Neu scannen'}</span>
                </button>
              </div>
            </div>

            {/* STEP 3: Review Transitions */}
            <div
              id="quick-setup-step-3"
              className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between gap-3 ${
                isReviewCompleted
                  ? 'bg-[#10141d] border-emerald-500/30 text-slate-200'
                  : 'bg-[#151221] border-purple-500/40 shadow-sm shadow-purple-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleReviewStep}
                      className="cursor-pointer focus:outline-none"
                      title="Klicken, um den Status manuell zu bestätigen"
                    >
                      {isReviewCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-purple-400 font-mono text-xs font-bold">
                          3
                        </div>
                      )}
                    </button>
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      3. Übergänge prüfen
                    </span>
                  </div>

                  {isReviewCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                      ✓ Bestätigt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse font-semibold">
                      Prüfung nötig
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {currentSet.transitions.length} Mix-Punkte
                    </span>
                    <span className="text-[11px] font-mono text-purple-300 font-semibold">
                      {currentSet.peakMoments.length} Peak Drops
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {hasReviewedTransitions
                      ? 'Übergangs-Blends, EQ-Mud-Cuts und Phasen-Drift wurden begutachtet.'
                      : 'Prüfe kritische Frequenz-Überlagerungen im Sub-Bass und den Phasenversatz.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={handleToggleReviewStep}
                  className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  {isReviewCompleted ? 'Als ungeprüft markieren' : 'Als geprüft abhaken'}
                </button>
                <button
                  onClick={handleReviewAction}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-purple-600/20"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Mix-Inspektor</span>
                </button>
              </div>
            </div>
          </div>

          {/* POSITIVE REINFORCEMENT CELEBRATION BANNER (When 3/3 Completed) */}
          {isAllCompleted && (
            <div className="mt-1 bg-gradient-to-r from-emerald-950/40 via-[#0d1e19] to-teal-950/40 border border-emerald-500/30 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>🎉 Quick Setup vollständig abgeschlossen!</span>
                    <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      CLUB-READY
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dein Set <span className="text-white font-semibold">"{currentSet.name}"</span> hat alle 3 Vorbereitungsschritte erfolgreich durchlaufen. Keine Phasen- oder Bass-Überraschungen auf der Club-PA!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onTogglePlay && (
                  <button
                    onClick={onTogglePlay}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isPlaying ? 'Pause' : 'Set abspielen'}</span>
                  </button>
                )}

                {onExportPdf && (
                  <button
                    onClick={onExportPdf}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PDF-Rider exportieren</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Collapsed View: Minimalist Scannable Ribbon */
        <div className="px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Set hochgeladen</span>
            </span>
            <span className="text-slate-600">•</span>
            <span
              className={`flex items-center gap-1.5 ${
                isAnalysisCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              {isAnalysisCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>2. Analysiert</span>
            </span>
            <span className="text-slate-600">•</span>
            <span
              className={`flex items-center gap-1.5 ${
                isReviewCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              {isReviewCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>3. Übergänge geprüft</span>
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Details anzeigen
          </button>
        </div>
      )}
    </div>
  );
};
