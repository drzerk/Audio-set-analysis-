import React, { useState, useEffect } from 'react';
import {
  Check,
  Upload,
  Activity,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  Play,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { TechnoSetAnalysis, TransitionItem, AppWorkspaceTab } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { useToast } from './ui/ToastContext';

interface QuickSetupProps {
  currentSet: TechnoSetAnalysis;
  onOpenUpload: () => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onJumpToTransition: (t: TransitionItem) => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
}

export const QuickSetup: React.FC<QuickSetupProps> = ({
  currentSet,
  onOpenUpload,
  onSelectTab,
  onJumpToTransition,
  onTogglePlay,
  isPlaying
}) => {
  const { showToast } = useToast();

  const reviewStorageKey = `techno_setup_reviewed_${currentSet.id}`;
  const [isReviewed, setIsReviewed] = useState<boolean>(() => {
    return localStorage.getItem(reviewStorageKey) === 'true';
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState<boolean>(true);

  // Sync state if active set changes
  useEffect(() => {
    const saved = localStorage.getItem(`techno_setup_reviewed_${currentSet.id}`) === 'true';
    setIsReviewed(saved);
  }, [currentSet.id]);

  // Step 1: Upload Set - Complete if currentSet has valid duration & name
  const step1Complete = Boolean(currentSet && currentSet.duration > 0 && currentSet.name);

  // Step 2: Run Analysis - Complete if set has BPM, key and transitions computed
  const step2Complete = Boolean(
    isAnalysisComplete &&
      currentSet &&
      currentSet.bpmAverage > 0 &&
      currentSet.transitions &&
      currentSet.transitions.length > 0
  );

  // Step 3: Review Transitions - Complete if user has reviewed/confirmed transitions
  const step3Complete = isReviewed;

  // Compute completed count & percentage
  const completedCount =
    (step1Complete ? 1 : 0) +
    (step2Complete ? 1 : 0) +
    (step3Complete ? 1 : 0);
  const percentComplete = Math.round((completedCount / 3) * 100);
  const allComplete = completedCount === 3;

  const handleRunAnalysis = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      showToast(
        'Analyse abgeschlossen! ✓',
        'success',
        `${currentSet.bpmAverage} BPM • ${currentSet.dominantKey.split(' ')[0]} • ${currentSet.transitions.length} Übergänge analysiert.`
      );
    }, 800);
  };

  const handleToggleReview = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !isReviewed;
    setIsReviewed(next);
    localStorage.setItem(reviewStorageKey, next ? 'true' : 'false');
    if (next) {
      showToast(
        'Übergänge geprüft! ✓',
        'success',
        'Alle Mix-Punkte und Frequenz-Übergänge sind bestätigt.'
      );
    }
  };

  const handleReviewInInspector = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSet.transitions.length > 0) {
      onJumpToTransition(currentSet.transitions[0]);
    }
    onSelectTab('diagnosis');
    if (!isReviewed) {
      setIsReviewed(true);
      localStorage.setItem(reviewStorageKey, 'true');
      showToast('Mix-Inspektor geöffnet', 'info', 'Erster Übergang wurde im Detail geladen.');
    }
  };

  return (
    <div
      id="quick-setup-widget"
      className="w-full bg-[#101217] border border-white/10 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Top Title & Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide uppercase">
            Quick Setup
          </h2>
          <span className="text-xs text-slate-400 font-sans hidden sm:inline">
            • 3-stufiger interaktiver Fortschritts-Tracker
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Fortschritt:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md border text-xs ${
                allComplete
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10'
              }`}
            >
              {completedCount} von 3 erledigt ({percentComplete}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3-Step Horizontal Progress Tracker */}
      <div className="relative w-full pt-2 pb-1">
        {/* Horizontal Connector Line Behind Step Circles */}
        <div className="absolute top-7 left-8 right-8 h-0.5 bg-slate-700/60 hidden md:block -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{
              width:
                completedCount === 3
                  ? '100%'
                  : completedCount === 2
                  ? '50%'
                  : completedCount === 1
                  ? '0%'
                  : '0%'
            }}
          />
        </div>

        {/* 3 Horizontal Step Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 relative z-10">
          {/* STEP 1: Upload Set */}
          <div
            id="quick-setup-step-1"
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
              step1Complete
                ? 'bg-[#121620] border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                : 'bg-[#151922] border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                      step1Complete
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {step1Complete ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                  </div>
                  <span className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                    1: Upload Set
                  </span>
                </div>

                {step1Complete && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Abgeschlossen
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-200 truncate" title={currentSet.name}>
                {currentSet.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Laufzeit: {formatTimeSeconds(currentSet.duration)} • Audio-Signal bereit
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                {currentSet.audioUrl ? 'Waveform aktiv' : 'Demo Set'}
              </span>
              <button
                onClick={onOpenUpload}
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>{step1Complete ? 'Set wechseln' : 'Hochladen'}</span>
              </button>
            </div>
          </div>

          {/* STEP 2: Run Analysis */}
          <div
            id="quick-setup-step-2"
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
              step2Complete
                ? 'bg-[#121620] border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                : 'bg-[#151922] border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                      step2Complete
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : isAnalyzing
                        ? 'bg-cyan-500 text-black animate-pulse'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {step2Complete ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isAnalyzing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      '2'
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                    2: Run Analysis
                  </span>
                </div>

                {step2Complete && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Synchron
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold font-mono text-white">
                  {currentSet.bpmAverage} BPM
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  Tonart: {currentSet.dominantKey.split(' ')[0] || '8A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {currentSet.transitions.length} Übergänge berechnet • Beatgrid eingerastet
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                {isAnalyzing ? 'Berechne...' : 'DSP Analyse OK'}
              </span>
              <button
                disabled={isAnalyzing}
                onClick={handleRunAnalysis}
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`}
                />
                <span>{isAnalyzing ? 'Scanne...' : 'Neu scannen'}</span>
              </button>
            </div>
          </div>

          {/* STEP 3: Review Transitions */}
          <div
            id="quick-setup-step-3"
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
              step3Complete
                ? 'bg-[#121620] border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                : 'bg-[#181a24] border-slate-600 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                      step3Complete
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {step3Complete ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
                  </div>
                  <span className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                    3: Review Transitions
                  </span>
                </div>

                {step3Complete ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Bestätigt
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Offen
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold font-mono text-white">
                  {currentSet.transitions.length} Übergangs-Zonen
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  • {currentSet.peakMoments.length} Peaks
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {step3Complete
                  ? 'Phasen-Alignments und Low-End-Cuts wurden bestätigt.'
                  : 'Prüfe Übergänge auf Sub-Bass-Überlagerung und Phasen-Drift.'}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
              <button
                onClick={handleToggleReview}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                {step3Complete ? 'Zurücksetzen' : 'Als geprüft abhaken'}
              </button>
              <button
                onClick={handleReviewInInspector}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Sliders className="w-3 h-3 text-black" />
                <span>Inspektor</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner with Positive Reinforcement */}
      {allComplete && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-300">
              <strong className="text-white font-semibold">Club-Ready:</strong> Alle 3 Setup-Schritte abgeschlossen. Dein Set ist bestens für den Club vorbereitet!
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
