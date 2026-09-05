import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Volume2,
  ArrowRight,
  Disc3,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  TransitionItem,
  PhaseSyncAnalysis,
  Transition32BarDriftMap,
  BarDriftHeatmapCell
} from '../types';
import { generate32BarDriftHeatmap } from '../utils/phaseSyncAnalyzer';
import { formatTimeSeconds } from '../utils/pdfExport';

interface TransitionDriftHeatmapProps {
  transition: TransitionItem;
  phaseSync: PhaseSyncAnalysis;
  currentTime?: number;
  onSeekToBarTime?: (seconds: number) => void;
  compact?: boolean;
}

export const TransitionDriftHeatmap: React.FC<TransitionDriftHeatmapProps> = ({
  transition,
  phaseSync,
  currentTime,
  onSeekToBarTime,
  compact = false
}) => {
  // Get or compute the 32-bar drift heatmap
  const heatmap: Transition32BarDriftMap =
    phaseSync.barDriftHeatmap || generate32BarDriftHeatmap(transition, phaseSync);

  const [hoveredBar, setHoveredBar] = useState<BarDriftHeatmapCell | null>(null);
  const [selectedBar, setSelectedBar] = useState<BarDriftHeatmapCell | null>(null);
  const [showSpikeDetails, setShowSpikeDetails] = useState<boolean>(false);

  const activeBar = hoveredBar || selectedBar || null;

  // Check if playhead is currently inside this transition
  const fromBpm = transition.fromBpm || 140;
  const barDurSec = (60 / fromBpm) * 4;
  const transitionStartSec = transition.timestamp;
  const transitionEndSec = transition.timestamp + 32 * barDurSec;

  const currentPlayingBar =
    currentTime !== undefined &&
    currentTime >= transitionStartSec &&
    currentTime <= transitionEndSec
      ? Math.min(32, Math.max(1, Math.floor((currentTime - transitionStartSec) / barDurSec) + 1))
      : null;

  // Severity color helpers
  const getCellColor = (cell: BarDriftHeatmapCell) => {
    switch (cell.driftSeverity) {
      case 'locked':
        return 'bg-emerald-500/80 hover:bg-emerald-400 border-emerald-500/40 text-emerald-950';
      case 'safe':
        return 'bg-cyan-500/80 hover:bg-cyan-400 border-cyan-500/40 text-cyan-950';
      case 'caution':
        return 'bg-amber-500/85 hover:bg-amber-400 border-amber-500/50 text-amber-950';
      case 'warning':
        return 'bg-orange-500/90 hover:bg-orange-400 border-orange-500/60 text-orange-950';
      case 'critical-spike':
        return 'bg-rose-500 hover:bg-rose-400 border-rose-400 text-rose-950 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse';
      default:
        return 'bg-slate-600 border-slate-500 text-white';
    }
  };

  const getCellHeight = (cell: BarDriftHeatmapCell) => {
    // Relative visual bar height (10px min to 20px max)
    const baseHeight = 10;
    const extra = Math.min(10, Math.round(cell.intensity * 10));
    return `${baseHeight + extra}px`;
  };

  const primarySpike = heatmap.spikeSegments[0] || null;

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-md p-2 flex flex-col gap-1.5 font-mono text-[10px]">
      {/* Header: Title, Spike Status Badge, and Summary */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px]">
            32-Bar Phase Drift Heatmap
          </span>
          <span className="text-[8px] text-slate-500 hidden sm:inline">
            ({fromBpm} BPM • ~{Math.round(barDurSec * 10) / 10}s/Bar)
          </span>
        </div>

        {/* Status Callout Badge */}
        <div className="flex items-center gap-1.5">
          {heatmap.spikeSegments.length > 0 ? (
            <div
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1 border ${
                primarySpike?.severity === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={primarySpike?.description}
            >
              <Flame className="w-2.5 h-2.5 fill-current" />
              <span>
                DRIFT-SPIKE: Bars {primarySpike.startBar}–{primarySpike.endBar} (Peak{' '}
                {primarySpike.peakDriftMs > 0 ? '+' : ''}
                {primarySpike.peakDriftMs}ms)
              </span>
            </div>
          ) : (
            <div className="px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>32-BAR PHASE LOCKED (Max {heatmap.maxDriftMs}ms)</span>
            </div>
          )}

          {/* Expand/Collapse Spike Details Toggle */}
          {heatmap.spikeSegments.length > 0 && (
            <button
              onClick={() => setShowSpikeDetails(!showSpikeDetails)}
              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Spike-Details & Hardware-Korrektur ein-/ausblenden"
            >
              {showSpikeDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 32-Bar Heatmap Strip */}
      <div className="relative pt-1 pb-1">
        {/* Phrase Region Markers (4 Phrases x 8 Bars) */}
        <div className="grid grid-cols-4 gap-1 mb-1 text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5">
            <span>Bars 1–8</span>
            <span className="text-slate-500 font-normal hidden sm:inline">Intro Blend</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5">
            <span>Bars 9–16</span>
            <span className="text-slate-500 font-normal hidden sm:inline">Build / Mid</span>
          </div>
          <div className="flex items-center justify-between border-b border-pink-500/40 pb-0.5 text-pink-300 font-extrabold">
            <span>Bars 17–24 ★</span>
            <span className="text-pink-400/80 font-bold hidden sm:inline">Kick-Swap</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-0.5">
            <span>Bars 25–32</span>
            <span className="text-slate-500 font-normal hidden sm:inline">Outro Roll</span>
          </div>
        </div>

        {/* 32 Interactive Heatmap Bar Cells (segmented in 4 phrase blocks) */}
        <div className="grid grid-cols-4 gap-1.5 items-end">
          {[0, 1, 2, 3].map((phraseIdx) => {
            const phraseBars = heatmap.bars.slice(phraseIdx * 8, (phraseIdx + 1) * 8);
            const isKickSwapBlock = phraseIdx === 2;

            return (
              <div
                key={`phrase-${phraseIdx}`}
                className={`grid grid-cols-8 gap-0.5 p-1 rounded ${
                  isKickSwapBlock
                    ? 'bg-pink-950/20 border border-pink-500/25 ring-1 ring-pink-500/10'
                    : 'bg-black/30 border border-white/5'
                }`}
              >
                {phraseBars.map((cell) => {
                  const isHovered = hoveredBar?.bar === cell.bar;
                  const isSelected = selectedBar?.bar === cell.bar;
                  const isCurrentlyPlaying = currentPlayingBar === cell.bar;
                  const cellColor = getCellColor(cell);
                  const cellHeight = getCellHeight(cell);

                  return (
                    <div
                      key={`bar-${cell.bar}`}
                      className="relative flex flex-col items-center justify-end group cursor-pointer"
                      onClick={() => {
                        setSelectedBar(isSelected ? null : cell);
                        if (onSeekToBarTime) {
                          onSeekToBarTime(cell.timestamp);
                        }
                      }}
                      onMouseEnter={() => setHoveredBar(cell)}
                      onMouseLeave={() => setHoveredBar(null)}
                      title={`Bar ${cell.bar} (${formatTimeSeconds(cell.timestamp)}): ${cell.driftMs > 0 ? '+' : ''}${cell.driftMs}ms Drift | ${cell.driftSeverity.toUpperCase()}`}
                    >
                      {/* Spike Indicator Pip */}
                      {cell.isSpike && (
                        <div
                          className="w-1 h-1 rounded-full bg-rose-400 mb-0.5 animate-ping"
                          title="Drift Spike erkannt"
                        />
                      )}

                      {/* Playhead Active Bar Marker */}
                      {isCurrentlyPlaying && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-white shadow-[0_0_6px_white] z-10" />
                      )}

                      {/* The Heatmap Cell Bar */}
                      <div
                        style={{ height: cellHeight }}
                        className={`w-full rounded-sm border transition-all ${cellColor} ${
                          isHovered || isSelected ? 'ring-2 ring-white scale-110 z-10' : ''
                        }`}
                      />

                      {/* Bar Index Subtext on Selected/Key Bars (1, 8, 16, 24, 32) */}
                      {(cell.bar === 1 ||
                        cell.bar === 8 ||
                        cell.bar === 16 ||
                        cell.bar === 24 ||
                        cell.bar === 32) && (
                        <span className="text-[6.5px] font-mono text-slate-400 mt-0.5 select-none">
                          {cell.bar}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap Legend & Micro Stats Bar */}
      <div className="flex flex-wrap items-center justify-between text-[8px] text-slate-400 pt-0.5 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold uppercase">Heatmap Scale:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500/80" /> &lt;3.5ms (Locked)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-cyan-500/80" /> &lt;7ms (Safe)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-500/85" /> &lt;11ms (Caution)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-orange-500/90" /> &lt;14ms (Warning)
          </span>
          <span className="flex items-center gap-1 font-bold text-rose-400">
            <span className="w-2 h-2 rounded-xs bg-rose-500 animate-pulse" /> ≥14ms (Flam Spike)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>
            Kick-Swap Zone (Bars 17–24):{' '}
            <strong
              className={
                heatmap.kickSwapZoneDrift >= 8 ? 'text-rose-400' : 'text-emerald-400'
              }
            >
              Ø {heatmap.kickSwapZoneDrift}ms
            </strong>
          </span>
          {heatmap.barsUntilAudibleFlam ? (
            <span className="text-pink-400">
              Flamming ab: <strong>Bar {heatmap.barsUntilAudibleFlam}</strong>
            </span>
          ) : (
            <span className="text-emerald-400 font-bold">Kein Flamming</span>
          )}
        </div>
      </div>

      {/* Active Hover / Clicked Bar Detailed Inspector Card */}
      {activeBar && (
        <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-wrap items-center justify-between gap-2 animate-fadeIn text-[8.5px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white px-1 py-0.5 rounded bg-white/10">
              BAR #{activeBar.bar}
            </span>
            <span className="text-slate-400">
              Zeitpunkt: <strong>{formatTimeSeconds(activeBar.timestamp)}</strong> (+
              {activeBar.timeOffsetSec}s)
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300 font-bold">{activeBar.phraseName}</span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span>
              Transienten-Drift:{' '}
              <strong
                className={`font-bold ${
                  activeBar.driftSeverity === 'critical-spike'
                    ? 'text-rose-400'
                    : activeBar.driftSeverity === 'warning'
                    ? 'text-orange-400'
                    : activeBar.driftSeverity === 'caution'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {activeBar.driftMs > 0 ? '+' : ''}
                {activeBar.driftMs}ms
              </strong>
            </span>

            {activeBar.combNotchHz && (
              <span>
                Notch-Filter: <strong className="text-pink-300">{activeBar.combNotchHz} Hz</strong>
              </span>
            )}

            <span>
              Kammfilter-Auslöschung:{' '}
              <strong
                className={
                  activeBar.combCancellationPercent > 50
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }
              >
                {activeBar.combCancellationPercent}%
              </strong>
            </span>

            {onSeekToBarTime && (
              <button
                onClick={() => onSeekToBarTime(activeBar.timestamp)}
                className="px-1.5 py-0.5 rounded bg-emerald-500 text-black font-bold hover:bg-emerald-400 cursor-pointer flex items-center gap-1 transition-colors"
                title={`Playhead auf Bar ${activeBar.bar} (${formatTimeSeconds(activeBar.timestamp)}) setzen`}
              >
                <Volume2 className="w-2.5 h-2.5" />
                <span>Bar vorhören</span>
              </button>
            )}
          </div>

          <div className="w-full text-slate-300 border-t border-white/5 pt-1 text-[8px] flex items-center gap-1">
            <span className="text-amber-400 font-bold">Akustische Analyse:</span>
            <span>{activeBar.acousticRiskNote}</span>
          </div>
        </div>
      )}

      {/* Expandable Spike Breakdown & DJ Nudge Correction Advice */}
      {showSpikeDetails && heatmap.spikeSegments.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-500/30 rounded p-2 flex flex-col gap-1.5 text-[8.5px]">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-1 text-rose-300 font-bold">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400 fill-current" />
              IDENTIFIZIERTE DRIFT-SPIKES IN DIESEM ÜBERGANG
            </span>
            <span className="text-slate-400 font-normal">
              {heatmap.spikeSegments.length} Segment(e) mit Transienten-Schlupf
            </span>
          </div>

          <div className="space-y-1.5">
            {heatmap.spikeSegments.map((spike, idx) => (
              <div
                key={`spike-${idx}`}
                className="bg-black/40 border border-rose-500/20 p-1.5 rounded flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 text-[8px]">
                      Bars {spike.startBar}–{spike.endBar}
                    </span>
                    <span>Peak: {spike.peakDriftMs > 0 ? '+' : ''}{spike.peakDriftMs}ms bei Bar {spike.peakBar}</span>
                  </span>
                  <span className="text-[7.5px] uppercase font-bold text-rose-400">
                    {spike.severity === 'critical' ? 'Kritischer Flam-Spike' : 'Erhöhte Phasenwarnung'}
                  </span>
                </div>

                <p className="text-slate-300 text-[8px]">{spike.description}</p>

                <div className="bg-white/5 border border-white/5 p-1 rounded flex items-center justify-between gap-2 text-[8px]">
                  <div className="flex items-center gap-1 text-cyan-300">
                    <Disc3 className="w-2.5 h-2.5" />
                    <strong>CDJ Jog-Wheel Korrektur:</strong>
                    <span>{spike.recommendedAction}</span>
                  </div>

                  {onSeekToBarTime && (
                    <button
                      onClick={() => {
                        const cell = heatmap.bars.find((b) => b.bar === spike.startBar);
                        if (cell) onSeekToBarTime(cell.timestamp);
                      }}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer shrink-0"
                    >
                      Zu Bar {spike.startBar} springen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
