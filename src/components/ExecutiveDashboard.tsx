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
  onUpdateTransition
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
    <div id="executive-dashboard-view" className="flex flex-col gap-3.5 w-full">
      {/* 1. QUICK SETUP TRACKER (3-Step Horizontal Progress Tracker) */}
      <QuickSetupTracker
        className="mb-6"
        currentSet={currentSet}
        onOpenUpload={onOpenUpload}
        onSelectTab={onSelectTab}
        onJumpToTransition={onJumpToTransition}
        onTogglePlay={onTogglePlay}
        isPlaying={isPlaying}
        onUpdateTransition={onUpdateTransition}
      />

      {/* 2. "WAS PASSIERT GERADE?" Live Status Ribbon */}
      <div
        id="live-app-status-ribbon"
        className="w-full bg-[#0d1017] border border-emerald-500/20 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg relative overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
            }`}
          />
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>LIVE-STATUS • {isPlaying ? 'WIEDERGABE LÄUFT' : 'BEREIT & PAUSIERT'}</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {isPlaying
                ? `Set läuft bei ${currentSet.bpmAverage} BPM • Position: ${formatTimeSeconds(currentTime)} / ${formatTimeSeconds(duration)}`
                : `Wiedergabe pausiert bei ${formatTimeSeconds(currentTime)}. Klicke auf Play oder die Timeline zum Vorhören.`}
            </p>
          </div>
        </div>

        {/* Transition / Peak status pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTransition ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-mono font-bold animate-pulse">
              <Flame className="w-3 h-3 text-pink-400" />
              <span>MIX AKTIV ({activeTransition.fromKey} → {activeTransition.toKey})</span>
            </span>
          ) : nextTransition ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-mono">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Nächster Mix in {formatTimeSeconds(Math.max(0, nextTransition.timestamp - currentTime))}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 text-xs font-mono">
              Keine weiteren Übergänge
            </span>
          )}

          {/* User Mode Badge */}
          <button
            id="btn-toggle-user-mode-dash"
            onClick={onToggleUserMode}
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border transition-colors cursor-pointer ${
              userMode === 'pro'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-white/10 text-slate-300 border-white/15'
            }`}
            title="Klicken zum Umschalten zwischen Einfach- und Pro-DJ-Modus"
          >
            Modus: {userMode === 'pro' ? 'PRO DJ ⚡' : 'EINFACH ✓'}
          </button>
        </div>
      </div>

      {/* 3. PRIORITY HEALTH METRICS (4 Clean Cards with Progressive Disclosure) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1: Harmonische Balance */}
        <div
          onClick={() => onSelectTab('dynamics')}
          className="bg-[#101217] hover:bg-[#151821] border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer transition-all hover:border-emerald-500/30 group"
          title="Klicken, um den harmonischen Verlauf im Detail zu analysieren"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Harmonische Balance</span>
            <Disc3 className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">{currentSet.dominantKey.split(' ')[0] || '8A'}</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">Camelot Stabil</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{currentSet.transitions.length} Übergänge harmonisch</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        {/* Metric 2: Phasen-Genauigkeit */}
        <div
          onClick={() => onSelectTab('dashboard')}
          className="bg-[#101217] hover:bg-[#151821] border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer transition-all hover:border-cyan-500/30 group"
          title="Klicken, um die Phasen-Genauigkeit zu überwachen"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Phasen-Genauigkeit</span>
            <AudioWaveform className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">{avgPhaseScore}%</span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {avgPhaseScore >= 90 ? 'Synchron' : 'Leichter Drift'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Transient-Overlay aktiv</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
        </div>

        {/* Metric 3: Spannungsbogen & Peaks */}
        <div
          onClick={() => onSelectTab('diagnosis')}
          className="bg-[#101217] hover:bg-[#151821] border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer transition-all hover:border-purple-500/30 group"
          title="Klicken, um die Peak Moments und Drops zu prüfen"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Peak-Drops & Energie</span>
            <Flame className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">{currentSet.peakMoments.length}</span>
            <span className="text-xs font-mono text-purple-400 font-semibold">
              {currentSet.targetProfileMatch ? `${currentSet.targetProfileMatch.matchScore}% Match` : 'Club Dynamic'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{currentSet.segments ? `${currentSet.segments.length} Phasen erkannt` : 'Peak Time Flow'}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>

        {/* Metric 4: EQ & Low-End Sauberkeit */}
        <div
          onClick={() => onSelectTab('diagnosis')}
          className="bg-[#101217] hover:bg-[#151821] border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer transition-all hover:border-amber-500/30 group"
          title="Klicken, um den EQ Mud Advisor aufzurufen"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Low-End Sauberkeit</span>
            <Sliders className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">
              {mudRiskCount === 0 ? '100%' : `${Math.max(60, 100 - mudRiskCount * 12)}%`}
            </span>
            <span
              className={`text-xs font-mono font-semibold ${
                mudRiskCount === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {mudRiskCount === 0 ? 'Kein Matsch' : `${mudRiskCount} Warnung(en)`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sub-Bass unter 120Hz</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* 3. "NÄCHSTER EMPFOHLENER SCHRITT" Assistant Card */}
      <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/30 border border-blue-500/25 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-blue-300 uppercase tracking-wider font-bold">
              INTELLIGENTER NÄCHSTER SCHRITT
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">
              {nextRecommendation.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {nextRecommendation.description}
            </p>
          </div>
        </div>

        <button
          onClick={nextRecommendation.action}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20 shrink-0 self-end sm:self-center"
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
        />
      </div>

      {/* 5. SESSION ACTIVITY LOG & PRO SUMMARY */}
      <div className="bg-[#101217] border border-white/10 rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Aktivitätsverlauf & Set-Historie
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Zuletzt aktualisiert: {currentSet.updatedAt ? new Date(currentSet.updatedAt).toLocaleTimeString() : 'Gerade eben'}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-white/5 max-h-48 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 font-mono">
              Noch keine Aktionen in dieser Session. Starte die Wiedergabe oder setze Marker.
            </div>
          ) : (
            activityLog.slice(0, 6).map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.type === 'success'
                        ? 'bg-emerald-400'
                        : item.type === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <div className="min-w-0 truncate">
                    <span className="text-slate-200 font-medium">{item.title}</span>
                    {item.description && (
                      <span className="text-slate-500 text-[11px] ml-1.5 hidden sm:inline">
                        • {item.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 shrink-0">
                  {item.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
