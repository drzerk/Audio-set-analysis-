import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Zap,
  Volume2,
  ChevronRight,
  Disc3,
  Flame,
  ArrowRight,
  Info
} from 'lucide-react';
import { TransitionItem, PhaseSyncAnalysis } from '../types';
import { analyzeTransitionPhaseSync, simulateNudge } from '../utils/phaseSyncAnalyzer';
import { TransitionDriftHeatmap } from './TransitionDriftHeatmap';

interface PhaseSyncVisualizerProps {
  transition: TransitionItem;
  audioBuffer?: AudioBuffer | null;
  onUpdateTransition?: (updated: TransitionItem) => void;
  compact?: boolean;
}

export const PhaseSyncVisualizer: React.FC<PhaseSyncVisualizerProps> = ({
  transition,
  audioBuffer,
  onUpdateTransition,
  compact = false
}) => {
  // Compute initial phase sync analysis if not cached
  const initialAnalysis = useMemo(() => {
    return transition.phaseSyncAnalysis || analyzeTransitionPhaseSync(transition, audioBuffer);
  }, [transition, audioBuffer]);

  // Interactive live nudge state (in milliseconds offset from current)
  const [manualNudgeMs, setManualNudgeMs] = useState<number>(0);
  const [showCombDetails, setShowCombDetails] = useState<boolean>(false);

  // Current active analysis reflecting simulated jog-wheel nudges
  const currentAnalysis: PhaseSyncAnalysis = useMemo(() => {
    if (manualNudgeMs === 0) return initialAnalysis;
    return simulateNudge(initialAnalysis, manualNudgeMs);
  }, [initialAnalysis, manualNudgeMs]);

  const {
    isDriftProne,
    driftRisk,
    phaseCoherenceScore,
    timeDeltaMs,
    phaseAngleDeg,
    tempoDeltaBpm,
    driftRateMsPerBar,
    barsUntilFlam,
    subPhaseCancellationRisk,
    waveformAlignment,
    driftForecast,
    nudgeAdvice
  } = currentAnalysis;

  // Auto-lock action: set manual nudge to exactly cancel timeDeltaMs
  const handleAutoAlign = () => {
    setManualNudgeMs(-initialAnalysis.timeDeltaMs);
  };

  const handleStepNudge = (delta: number) => {
    setManualNudgeMs((prev) => Math.round((prev + delta) * 10) / 10);
  };

  const handleResetNudge = () => {
    setManualNudgeMs(0);
  };

  const handleSaveAlignment = () => {
    if (onUpdateTransition) {
      onUpdateTransition({
        ...transition,
        phaseScore: Math.min(100, Math.max(80, phaseCoherenceScore)),
        qualityScore: Math.min(
          100,
          Math.max(transition.qualityScore, Math.round((transition.qualityScore + phaseCoherenceScore) / 2))
        ),
        phaseSyncAnalysis: currentAnalysis
      });
      setManualNudgeMs(0);
    }
  };

  // Status Badge Styling
  const riskBadge = useMemo(() => {
    switch (driftRisk) {
      case 'locked':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          label: 'PHASE LOCKED (SYNCHRON)',
          icon: CheckCircle2
        };
      case 'mild-drift':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          label: 'LEICHTER PHASE DRIFT',
          icon: Info
        };
      case 'drift-prone':
        return {
          bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
          label: 'DRIFT-GEFÄHRDET (FLAM-GEFAHR)',
          icon: AlertTriangle
        };
      case 'critical-flam':
      default:
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          label: 'AKUTER TRANSISTOR-FLAM / AUSLÖSCHUNG',
          icon: Flame
        };
    }
  }, [driftRisk]);

  const StatusIcon = riskBadge.icon;

  // SVG Waveform Drawing Dimensions
  const svgWidth = 560;
  const svgHeight = 150;
  const paddingX = 35;
  const paddingY = 20;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  // Map time (-50 to +50ms) to X coordinate
  const getX = (tMs: number) => {
    const norm = (tMs + 50) / 100;
    return paddingX + norm * plotWidth;
  };

  // Map normalized amplitude (0 to 1.8) to Y coordinate (inverted)
  const getY = (amp: number, maxAmp = 1.8) => {
    const norm = Math.min(maxAmp, Math.max(0, amp)) / maxAmp;
    return paddingY + plotHeight * (1 - norm);
  };

  // Generate SVG path points
  const deckAPath = useMemo(() => {
    return waveformAlignment.timeLabels
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t).toFixed(1)} ${getY(waveformAlignment.deckA[i], 1.2).toFixed(1)}`)
      .join(' ');
  }, [waveformAlignment]);

  const deckBPath = useMemo(() => {
    return waveformAlignment.timeLabels
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t).toFixed(1)} ${getY(waveformAlignment.deckB[i], 1.2).toFixed(1)}`)
      .join(' ');
  }, [waveformAlignment]);

  const summedPath = useMemo(() => {
    return waveformAlignment.timeLabels
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t).toFixed(1)} ${getY(waveformAlignment.summedWaveform[i], 2.2).toFixed(1)}`)
      .join(' ');
  }, [waveformAlignment]);

  return (
    <div
      id={`phase-sync-visualizer-${transition.id}`}
      className="p-3 bg-black/80 border border-emerald-500/30 rounded flex flex-col gap-3 font-mono text-[10px]"
    >
      {/* 1. Header Bar: Title, Risk Status & Quick Scores */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            PHASE SYNC & WAVEFORM ALIGNMENT
          </span>
          <span className="text-slate-500 font-mono">
            @{Math.floor(transition.timestamp / 60)}:{String(transition.timestamp % 60).padStart(2, '0')} min
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className={`px-2 py-0.5 rounded border flex items-center gap-1 font-bold ${riskBadge.bg}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{riskBadge.label}</span>
          </div>

          {/* Phase Coherence Score */}
          <div
            className={`px-2 py-0.5 rounded font-bold border ${
              phaseCoherenceScore >= 90
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : phaseCoherenceScore >= 75
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
            title="Phasen-Kohärenz im Kick/Sub-Transientenbereich"
          >
            KOHÄRENZ: {phaseCoherenceScore}%
          </div>
        </div>
      </div>

      {/* 2. Key Diagnostic Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Transient Offset Delta */}
        <div className="bg-white/5 p-2 rounded border border-white/5 flex flex-col">
          <span className="text-slate-400 text-[9px] uppercase">Transient-Offset (Δt)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-sm font-bold font-mono ${
                Math.abs(timeDeltaMs) < 4
                  ? 'text-emerald-400'
                  : Math.abs(timeDeltaMs) < 12
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {timeDeltaMs > 0 ? `+${timeDeltaMs}` : timeDeltaMs} ms
            </span>
            <span className="text-[8px] text-slate-500">
              {timeDeltaMs === 0 ? 'Exakt' : timeDeltaMs > 0 ? '(Deck B vorn)' : '(Deck B nach)'}
            </span>
          </div>
        </div>

        {/* Phase Angle */}
        <div className="bg-white/5 p-2 rounded border border-white/5 flex flex-col">
          <span className="text-slate-400 text-[9px] uppercase">Phasenwinkel (60Hz Sub)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-sm font-bold font-mono ${
                phaseAngleDeg < 45
                  ? 'text-emerald-400'
                  : phaseAngleDeg < 90
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {phaseAngleDeg}°
            </span>
            <span className="text-[8px] text-slate-500">
              {phaseAngleDeg < 45 ? 'In Phase' : phaseAngleDeg > 110 ? 'Gegenphase' : 'Phasing'}
            </span>
          </div>
        </div>

        {/* Tempo Differential & Drift Rate */}
        <div className="bg-white/5 p-2 rounded border border-white/5 flex flex-col">
          <span className="text-slate-400 text-[9px] uppercase">Tempo-Drift Rate</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-bold text-white font-mono">
              {driftRateMsPerBar > 0 ? `+${driftRateMsPerBar}` : driftRateMsPerBar} ms/Bar
            </span>
            <span className="text-[8px] text-slate-500">
              (Δ {tempoDeltaBpm > 0 ? `+${tempoDeltaBpm}` : tempoDeltaBpm} BPM)
            </span>
          </div>
        </div>

        {/* Flam Warning Horizon */}
        <div className="bg-white/5 p-2 rounded border border-white/5 flex flex-col">
          <span className="text-slate-400 text-[9px] uppercase">Flamming-Schwelle</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-sm font-bold font-mono ${
                barsUntilFlam <= 6
                  ? 'text-rose-400'
                  : barsUntilFlam <= 16
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {barsUntilFlam === 0 ? 'AKUT' : `Bar ${barsUntilFlam}`}
            </span>
            <span className="text-[8px] text-slate-500">
              {barsUntilFlam === 0 ? 'Hörbarer Doppelschlag' : `bis Flam (>14ms)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Dual Waveform Overlay Canvas */}
      <div className="bg-[#09090b] border border-white/10 rounded p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
          <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1">
            <Disc3 className="w-3 h-3 text-cyan-400" />
            WAVEFORM-AUSRICHTUNG DER TRANSIENTEN (±50 ms FENSTER)
          </span>

          {/* Waveform Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
              <span>Deck A (Auslaufend: 0ms)</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
              <span>Deck B (Eingehend: {timeDeltaMs > 0 ? `+${timeDeltaMs}` : timeDeltaMs}ms)</span>
            </div>
            <div className="flex items-center gap-1 text-purple-300">
              <span className="w-2.5 h-0.5 border-b border-dashed border-purple-400" />
              <span>Summiertes Signal</span>
            </div>
          </div>
        </div>

        {/* SVG Graphic Display */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36 bg-black/50 rounded border border-white/5 select-none"
          >
            <defs>
              <linearGradient id="deckAGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="deckBGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Time Grid Lines */}
            {[-40, -20, 0, 20, 40].map((t) => {
              const x = getX(t);
              const isCenter = t === 0;
              return (
                <g key={t}>
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={svgHeight - paddingY}
                    stroke={isCenter ? '#06b6d4' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isCenter ? '1.5' : '1'}
                    strokeDasharray={isCenter ? undefined : '2,2'}
                  />
                  <text
                    x={x}
                    y={svgHeight - 6}
                    fill={isCenter ? '#06b6d4' : '#64748b'}
                    fontSize="8"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {isCenter ? '0ms (Grid)' : `${t > 0 ? '+' : ''}${t}ms`}
                  </text>
                </g>
              );
            })}

            {/* Transient Deck A Peak Marker at 0ms */}
            <circle cx={getX(0)} cy={getY(1.0, 1.2)} r="3" fill="#06b6d4" />

            {/* Transient Deck B Peak Marker at timeDeltaMs */}
            <circle
              cx={getX(timeDeltaMs)}
              cy={getY(1.0, 1.2)}
              r="3"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="0.8"
            />

            {/* Offset Gap Connector Line if offset != 0 */}
            {Math.abs(timeDeltaMs) > 1 && (
              <g>
                <line
                  x1={getX(0)}
                  y1={getY(1.0, 1.2) - 10}
                  x2={getX(timeDeltaMs)}
                  y2={getY(1.0, 1.2) - 10}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                />
                <circle cx={getX(0)} cy={getY(1.0, 1.2) - 10} r="2" fill="#f43f5e" />
                <circle cx={getX(timeDeltaMs)} cy={getY(1.0, 1.2) - 10} r="2" fill="#f43f5e" />
                <text
                  x={(getX(0) + getX(timeDeltaMs)) / 2}
                  y={getY(1.0, 1.2) - 14}
                  fill="#f43f5e"
                  fontSize="8"
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Δt = {timeDeltaMs > 0 ? `+${timeDeltaMs}` : timeDeltaMs} ms
                </text>
              </g>
            )}

            {/* Deck A Waveform (Cyan) */}
            <path
              d={deckAPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Deck B Waveform (Emerald) */}
            <path
              d={deckBPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Summed Interference Waveform (Dashed purple/white) */}
            <path
              d={summedPath}
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.5"
              strokeDasharray="4,2"
              strokeOpacity="0.8"
            />
          </svg>
        </div>

        {/* 4. Interactive Virtual DJ Jog-Wheel Nudge Simulator */}
        <div className="bg-black/60 p-2 rounded border border-white/5 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              INTERAKTIVER CDJ-JOG NUDGE SIMULATOR
            </span>

            {manualNudgeMs !== 0 && (
              <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                Simulierter Nudge: {manualNudgeMs > 0 ? `+${manualNudgeMs}` : manualNudgeMs} ms
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Step Nudge Buttons */}
            <button
              onClick={() => handleStepNudge(-5)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 cursor-pointer font-bold active:scale-95 transition-all text-[9px]"
              title="5ms nach hinten bremsen"
            >
              -5 ms
            </button>
            <button
              onClick={() => handleStepNudge(-1)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 cursor-pointer font-bold active:scale-95 transition-all text-[9px]"
              title="1ms nach hinten bremsen (1 Tick)"
            >
              -1 ms
            </button>

            {/* AUTO-ALIGN ONE-CLICK FIX */}
            <button
              id={`btn-auto-align-${transition.id}`}
              onClick={handleAutoAlign}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded font-bold cursor-pointer flex items-center gap-1 active:scale-95 transition-all text-[9px] uppercase shadow-sm"
              title="Transienten-Phasenversatz automatisch auf 0ms synchronisieren"
            >
              <Zap className="w-3 h-3 fill-current" />
              AUTO-LOCK (AUF RASTER EINRASTEN)
            </button>

            <button
              onClick={() => handleStepNudge(1)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 cursor-pointer font-bold active:scale-95 transition-all text-[9px]"
              title="1ms nach vorne anschieben (1 Tick)"
            >
              +1 ms
            </button>
            <button
              onClick={() => handleStepNudge(5)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 cursor-pointer font-bold active:scale-95 transition-all text-[9px]"
              title="5ms nach vorne anschieben"
            >
              +5 ms
            </button>

            {manualNudgeMs !== 0 && (
              <>
                <button
                  onClick={handleResetNudge}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 cursor-pointer flex items-center gap-1 text-[9px]"
                  title="Auf Original-Analyse zurücksetzen"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>

                {onUpdateTransition && (
                  <button
                    onClick={handleSaveAlignment}
                    className="ml-auto px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black rounded font-bold cursor-pointer text-[9px] uppercase flex items-center gap-1"
                    title="Diese korrigierte Ausrichtung für den Übergang speichern"
                  >
                    Korrektur speichern
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. 32-Bar Phase Drift Mini-Heatmap with Spike Highlighting (Synchronized to Nudges) */}
      <TransitionDriftHeatmap
        transition={transition}
        phaseSync={currentAnalysis}
      />

      {/* 6. Drift Progression Forecast Timeline (Bars 1 to 64) */}
      <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-cyan-400" />
            DRIFT-PROGNOSE ÜBER DIE MIX-DAUER (1 BIS 64 TAKTE)
          </span>
          <span className="text-[8px] text-slate-400">
            Flam-Grenze: &gt;14 ms | Trainwreck: &gt;22 ms
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {driftForecast.map((step) => {
            const isFlam = step.status === 'flamming' || step.status === 'trainwreck';
            const isLocked = step.status === 'locked';

            return (
              <div
                key={step.bar}
                className={`p-1.5 rounded border text-center flex flex-col items-center gap-0.5 ${
                  isLocked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : step.status === 'acceptable'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse'
                }`}
              >
                <span className="text-[8px] font-bold uppercase text-slate-300">
                  Bar {step.bar}
                </span>
                <span className="text-[10px] font-bold font-mono">
                  {step.driftMs > 0 ? `+${step.driftMs}` : step.driftMs}ms
                </span>
                <span className="text-[7.5px] uppercase font-mono tracking-tighter opacity-80">
                  {step.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Actionable Hardware Advice Box */}
      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 font-bold uppercase text-[9px] flex items-center gap-1">
            <Sliders className="w-3 h-3" />
            DJ-HARDWARE KORREKTUR-ANWEISUNG (BOOTH-GUIDE)
          </span>
          {subPhaseCancellationRisk === 'severe' && (
            <span className="text-[8px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              SUB-AUSLÖSCHUNG ERKANNT
            </span>
          )}
        </div>

        <div className="text-[9.5px] text-slate-200">
          <strong>Jog-Wheel & Pitch: </strong>
          <span>{nudgeAdvice.hardwareCorrection}</span>
        </div>

        {nudgeAdvice.phaseCancellationWarning && (
          <div className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-1.5 rounded">
            <strong>Kammfilter & Bass-Schutz: </strong>
            <span>{nudgeAdvice.phaseCancellationWarning}</span>
          </div>
        )}

        {waveformAlignment.combFilterNotchesHz.length > 0 && (
          <div className="flex items-center gap-2 text-[8.5px] text-slate-400 mt-0.5">
            <span>Potenzielle Kammfilter-Dips:</span>
            <div className="flex items-center gap-1">
              {waveformAlignment.combFilterNotchesHz.map((hz) => (
                <span key={hz} className="px-1 py-0.2 rounded bg-white/5 border border-white/10 text-rose-300 font-mono">
                  {hz} Hz
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
