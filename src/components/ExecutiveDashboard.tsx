import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Disc3,
  FileText,
  Flame,
  Info,
  Layers,
  Lightbulb,
  Radio,
  Sliders,
  Sparkles,
  AudioWaveform,
  Zap,
  Play,
  Pause,
  Cloud
} from 'lucide-react';
import {
  TechnoSetAnalysis,
  TransitionItem,
  PeakMoment,
  AppWorkspaceTab,
  AppUserMode,
  SessionActivityItem
} from '../types';
import { AudioDeck } from './AudioDeck';
import { QuickSetupTracker } from './QuickSetupTracker';
import { formatTimeSeconds } from '../utils/pdfExport';
import { TechnoPreviewAudioEngine } from '../utils/audioAnalyzer';

interface ExecutiveDashboardProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onJumpToTransition: (t: TransitionItem) => void;
  onJumpToPeak: (p: PeakMoment) => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onOpenUpload: () => void;
  onOpenCloudSync: () => void;
  onExportPdf: () => void;
  onOpenTour: () => void;
  userMode: AppUserMode;
  onToggleUserMode: () => void;
  activityLog: SessionActivityItem[];
  onUpdateTransition?: (updated: TransitionItem) => void;
  audioEngine?: TechnoPreviewAudioEngine | null;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentSet,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  onJumpToTransition,
  onJumpToPeak,
  onSelectTab,
  onOpenUpload,
  onOpenCloudSync,
  onExportPdf,
  onOpenTour,
  userMode,
  onToggleUserMode,
  activityLog,
  onUpdateTransition,
  audioEngine
}) => {
  const duration = currentSet.duration || 3600;

  // Active or upcoming transition
  const activeTransition = currentSet.transitions.find(
    (t) => currentTime >= t.timestamp - 8 && currentTime <= t.timestamp + (t.duration || 30)
  );
  const nextTransition = currentSet.transitions.find((t) => t.timestamp > currentTime);
  const nextPeak = currentSet.peakMoments.find((p) => p.timestamp > currentTime);

  // Compute high-level health ratings
  const avgQuality = useMemo(() => {
    if (!currentSet.transitions.length) return 90;
    const sum = currentSet.transitions.reduce((acc, t) => acc + (t.qualityScore || 85), 0);
    return Math.round(sum / currentSet.transitions.length);
  }, [currentSet.transitions]);

  const avgPhaseScore = useMemo(() => {
    if (!currentSet.transitions.length) return 92;
    const sum = currentSet.transitions.reduce((acc, t) => acc + (t.phaseScore || 85), 0);
    return Math.round(sum / currentSet.transitions.length);
  }, [currentSet.transitions]);

  const mudRiskCount = useMemo(() => {
    return currentSet.transitions.filter((t) => t.eqClashRisk === 'high').length;
  }, [currentSet.transitions]);

  // Determine intelligent next recommended action
  const nextRecommendation = useMemo(() => {
    const criticalTransition = currentSet.transitions.find((t) => (t.phaseScore || 85) < 80);
    if (criticalTransition) {
      return {
        title: `Phasenversatz in Übergang bei ${formatTimeSeconds(criticalTransition.timestamp)} prüfen`,
        description: `Dieser Mix hat eine Genauigkeit von nur ${criticalTransition.phaseScore || 75}%. Klicke zum Vorhören und richte die Transienten mit dem Jog-Nudge aus.`,
        actionLabel: 'Übergang anspringen',
        action: () => {
          onSeek(Math.max(0, criticalTransition.timestamp - 10));
          onJumpToTransition(criticalTransition);
        },
        tab: 'dashboard' as AppWorkspaceTab
      };
    }

    if (mudRiskCount > 0) {
      return {
        title: `${mudRiskCount} kritische Frequenzüberlagerung(en) im Bassbereich erkannt`,
        description: 'Zwei Basslines überlappen sich mit hohem Schalldruck. Überprüfe die empfohlenen EQ-Cuts im Mix-Inspektor.',
        actionLabel: 'EQ Mud Advisor öffnen',
        action: () => onSelectTab('diagnosis'),
        tab: 'diagnosis' as AppWorkspaceTab
      };
    }

    if (!currentSet.aiAssessment) {
      return {
        title: 'KI-Crowd-Bewertung anfordern',
        description: 'Lass die psychologische Wirkung und die Spannungsdramaturgie deines Sets von der KI bewerten.',
        actionLabel: 'KI-Assistent öffnen',
        action: () => onSelectTab('assistant'),
        tab: 'assistant' as AppWorkspaceTab
      };
    }

    return {
      title: 'Druckfertigen PDF-Report exportieren',
      description: 'Dein Set ist in hervorragendem Zustand (Phase: ' + avgPhaseScore + '%). Generiere jetzt den fertigen Tour-Rider.',
      actionLabel: 'PDF erstellen',
      action: onExportPdf,
      tab: 'help' as AppWorkspaceTab
    };
  }, [currentSet, mudRiskCount, avgPhaseScore, onSeek, onJumpToTransition, onSelectTab, onExportPdf]);

  return (
    <div id="executive-dashboard-view" className="w-full flex flex-col">
      {/* 1. QUICK SETUP TRACKER (3-Step Horizontal Production Readiness Tracker) */}
      <QuickSetupTracker
        currentSet={currentSet}
        onOpenUpload={onOpenUpload}
        onSelectTab={onSelectTab}
        onJumpToTransition={onJumpToTransition}
        onTogglePlay={onTogglePlay}
        isPlaying={isPlaying}
        onUpdateTransition={onUpdateTransition}
        className="mb-6"
      />

      {/* 2. OPERATIONAL DASHBOARD (Live Status Ribbon, Health Metrics, Assistant Recommendation, Audio Deck & Activity Log) */}
      <div className="flex flex-col gap-6 w-full">
        {/* "WAS PASSIERT GERADE?" Live Status Ribbon */}
        <div
          id="live-app-status-ribbon"
          className="w-full bg-gradient-to-r from-[#0d121c] via-[#0e1422] to-[#101625] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl relative overflow-hidden transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isPlaying
                  ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <div>
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                <span>LIVE-STATUS • {isPlaying ? 'WIEDERGABE LÄUFT' : 'BEREIT & PAUSIERT'}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white mt-1">
                {isPlaying
                  ? `Set läuft bei ${currentSet.bpmAverage} BPM • Position: ${formatTimeSeconds(currentTime)} / ${formatTimeSeconds(duration)}`
                  : `Wiedergabe pausiert bei ${formatTimeSeconds(currentTime)}. Klicke auf Play oder die Timeline zum Vorhören.`}
              </p>
            </div>
          </div>

          {/* Transition / Peak status pill & User Mode Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeTransition ? (
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-mono font-bold animate-pulse shadow-sm shadow-pink-500/10">
                <Flame className="w-3.5 h-3.5 text-pink-400" />
                <span>MIX AKTIV ({activeTransition.fromKey} → {activeTransition.toKey})</span>
              </span>
            ) : nextTransition ? (
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/35 text-xs font-mono font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Nächster Mix in {formatTimeSeconds(Math.max(0, nextTransition.timestamp - currentTime))}</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-400 text-xs font-mono">
                Keine weiteren Übergänge
              </span>
            )}

            {/* User Mode Badge */}
            <button
              id="btn-toggle-user-mode-dash"
              onClick={onToggleUserMode}
              className={`h-8.5 px-3.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                userMode === 'pro'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/15'
                  : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
              title="Klicken zum Umschalten zwischen Einfach- und Pro-DJ-Modus"
            >
              <span>Modus:</span>
              <span className={userMode === 'pro' ? 'text-purple-300' : 'text-emerald-400'}>
                {userMode === 'pro' ? 'PRO DJ ⚡' : 'EINFACH ✓'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. PRIORITY HEALTH METRICS (4 Clean Cards with Unified Visual Hierarchy & Better Contrast) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5 lg:gap-5 items-stretch">
          {/* Metric 1: Harmonische Balance */}
          <div
            onClick={() => onSelectTab('dynamics')}
            className="bg-gradient-to-b from-[#111522] to-[#0c0f16] hover:from-[#13192a] hover:to-[#0e131d] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group min-h-[148px]"
            title="Klicken, um den harmonischen Verlauf im Detail zu analysieren"
          >
            <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              <span>Harmonische Balance</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:rotate-12 transition-transform">
                <Disc3 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {currentSet.dominantKey.split(' ')[0] || '8A'}
              </span>
              <span className="text-xs font-mono text-emerald-300 font-bold px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                Camelot Stabil
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto group-hover:text-slate-300 transition-colors">
              <span>{currentSet.transitions.length} Übergänge harmonisch</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>

          {/* Metric 2: Phasen-Genauigkeit */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="bg-gradient-to-b from-[#111522] to-[#0c0f16] hover:from-[#13192a] hover:to-[#0e131d] border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group min-h-[148px]"
            title="Klicken, um die Phasen-Genauigkeit zu überwachen"
          >
            <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              <span>Phasen-Genauigkeit</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <AudioWaveform className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {avgPhaseScore}%
              </span>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                avgPhaseScore >= 90
                  ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
                  : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
              }`}>
                {avgPhaseScore >= 90 ? 'Synchron' : 'Leichter Drift'}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto group-hover:text-slate-300 transition-colors">
              <span>Transient-Overlay aktiv</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>

          {/* Metric 3: Spannungsbogen & Peaks */}
          <div
            onClick={() => onSelectTab('diagnosis')}
            className="bg-gradient-to-b from-[#111522] to-[#0c0f16] hover:from-[#13192a] hover:to-[#0e131d] border border-slate-800/90 hover:border-purple-500/40 rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group min-h-[148px]"
            title="Klicken, um die Peak Moments und Drops zu prüfen"
          >
            <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              <span>Peak-Drops & Energie</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {currentSet.peakMoments.length}
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30">
                {currentSet.targetProfileMatch ? `${currentSet.targetProfileMatch.matchScore}% Match` : 'Club Dynamic'}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto group-hover:text-slate-300 transition-colors">
              <span>{currentSet.segments ? `${currentSet.segments.length} Phasen erkannt` : 'Peak Time Flow'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
          </div>

          {/* Metric 4: EQ & Low-End Sauberkeit */}
          <div
            onClick={() => onSelectTab('diagnosis')}
            className="bg-gradient-to-b from-[#111522] to-[#0c0f16] hover:from-[#13192a] hover:to-[#0e131d] border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group min-h-[148px]"
            title="Klicken, um den EQ Mud Advisor aufzurufen"
          >
            <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              <span>Low-End Sauberkeit</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Sliders className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {mudRiskCount === 0 ? '100%' : `${Math.max(60, 100 - mudRiskCount * 12)}%`}
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                  mudRiskCount === 0
                    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                    : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                }`}
              >
                {mudRiskCount === 0 ? 'Kein Matsch' : `${mudRiskCount} Warnung(en)`}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto group-hover:text-slate-300 transition-colors">
              <span>Sub-Bass unter 120Hz</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </div>
        </div>

        {/* 3. "NÄCHSTER EMPFOHLENER SCHRITT" Assistant Card */}
        <div className="bg-gradient-to-r from-[#0c1427] via-[#0f1a35] to-[#121f42] border border-blue-500/35 hover:border-blue-500/50 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl shadow-blue-950/20 transition-all">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/35 shrink-0 mt-0.5 shadow-inner">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-blue-400 uppercase tracking-wider font-bold">
                INTELLIGENTER NÄCHSTER SCHRITT
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                {nextRecommendation.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {nextRecommendation.description}
              </p>
            </div>
          </div>

          <button
            onClick={nextRecommendation.action}
            className="h-9.5 px-4.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 active:scale-[0.98] shrink-0 self-end sm:self-center"
          >
            <span>{nextRecommendation.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. MAIN AUDIO DECK & PHASE DELTA MONITOR */}
        <div className="w-full">
          <AudioDeck
            currentSet={currentSet}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onSeek={onSeek}
            onJumpToTransition={onJumpToTransition}
            onJumpToPeak={onJumpToPeak}
            audioEngine={audioEngine}
            onSelectTab={onSelectTab}
          />
        </div>

        {/* 5. SESSION ACTIVITY LOG & PRO SUMMARY */}
        <div className="bg-gradient-to-b from-[#111522] to-[#0c0f16] border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Aktivitätsverlauf & Set-Historie
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Zuletzt aktualisiert: {currentSet.updatedAt ? new Date(currentSet.updatedAt).toLocaleTimeString() : 'Gerade eben'}
            </span>
          </div>

          <div className="flex flex-col divide-y divide-slate-800/60 max-h-48 overflow-y-auto pr-1">
            {activityLog.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-mono">
                Noch keine Aktionen in dieser Session. Starte die Wiedergabe oder setze Marker.
              </div>
            ) : (
              activityLog.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 px-2 hover:bg-slate-800/40 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'success'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                          : item.type === 'warning'
                          ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                          : 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                      }`}
                    />
                    <div className="min-w-0 truncate">
                      <span className="text-slate-200 font-medium">{item.title}</span>
                      {item.description && (
                        <span className="text-slate-400 text-[11px] ml-2 hidden sm:inline">
                          • {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 shrink-0">
                    {item.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
