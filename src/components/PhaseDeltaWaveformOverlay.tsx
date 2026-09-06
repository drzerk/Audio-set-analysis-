import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Flame,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Wand2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Gauge
} from 'lucide-react';
import { TransitionItem, PhaseSyncAnalysis } from '../types';
import { analyzeTransitionPhaseSync, simulateNudge } from '../utils/phaseSyncAnalyzer';
import { formatTimeSeconds } from '../utils/pdfExport';

interface PhaseDeltaWaveformOverlayProps {
  transition: TransitionItem;
  allTransitions?: TransitionItem[];
  currentTime: number;
  duration: number;
  onSelectTransition?: (t: TransitionItem) => void;
  onSeek?: (time: number) => void;
  compact?: boolean;
}

export const PhaseDeltaWaveformOverlay: React.FC<PhaseDeltaWaveformOverlayProps> = ({
  transition,
  allTransitions = [],
  currentTime,
  duration,
  onSelectTransition,
  onSeek,
  compact = false
}) => {
  const [manualNudgeMs, setManualNudgeMs] = useState<number>(0);
  const [showSummedWave, setShowSummedWave] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Compute base analysis if not cached
  const initialAnalysis = useMemo<PhaseSyncAnalysis>(() => {
    return transition.phaseSyncAnalysis || analyzeTransitionPhaseSync(transition, null, duration);
  }, [transition, duration]);

  // Current active analysis reflecting virtual CDJ jog-wheel nudge
  const currentAnalysis: PhaseSyncAnalysis = useMemo(() => {
    if (manualNudgeMs === 0) return initialAnalysis;
    return simulateNudge(initialAnalysis, manualNudgeMs);
  }, [initialAnalysis, manualNudgeMs]);

  const {
    timeDeltaMs,
    phaseAngleDeg,
    phaseCoherenceScore,
    driftRisk,
    waveformAlignment,
    nudgeAdvice,
    subPhaseCancellationRisk,
    tempoDeltaBpm,
    barsUntilFlam
  } = currentAnalysis;

  // Track position relative to this transition
  const timeDiff = transition.timestamp - currentTime;
  const isCurrentlyInBlend = currentTime >= transition.timestamp - 5 && currentTime <= transition.timestamp + (transition.duration || 30);
  const isUpcoming = timeDiff > 0 && timeDiff <= 180; // Within 3 minutes

  // Auto-align handler: adjusts nudge to exactly cancel timeDeltaMs
  const handleAutoAlign = useCallback(() => {
    setManualNudgeMs(-initialAnalysis.timeDeltaMs);
  }, [initialAnalysis.timeDeltaMs]);

  const handleStepNudge = useCallback((step: number) => {
    setManualNudgeMs((prev) => Math.round((prev + step) * 10) / 10);
  }, []);

  const handleResetNudge = useCallback(() => {
    setManualNudgeMs(0);
  }, []);

  // SVG dimensions for the secondary phase delta waveform
  const svgWidth = 560;
  const svgHeight = 110;
  const paddingX = 40;
  const paddingY = 16;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Scale functions: time range is -50ms to +50ms
  const getX = useCallback(
    (timeMs: number) => {
      const clamped = Math.max(-50, Math.min(50, timeMs));
      return paddingX + ((clamped + 50) / 100) * graphWidth;
    },
    [graphWidth, paddingX]
  );

  const getY = useCallback(
    (amp: number, maxAmp: number = 1.3) => {
      const norm = Math.max(0, Math.min(maxAmp, amp)) / maxAmp;
      return svgHeight - paddingY - norm * graphHeight;
    },
    [graphHeight, paddingY, svgHeight]
  );

  // Generate SVG path for Deck A (cyan)
  const deckAPath = useMemo(() => {
    if (!waveformAlignment) return '';
    const points = waveformAlignment.timeLabels.map((t, i) => {
      const x = getX(t);
      const y = getY(waveformAlignment.deckA[i] || 0, 1.3);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
  }, [waveformAlignment, getX, getY]);

  // Generate SVG closed area polygon for Deck A
  const deckAArea = useMemo(() => {
    if (!waveformAlignment) return '';
    const firstX = getX(waveformAlignment.timeLabels[0]);
    const lastX = getX(waveformAlignment.timeLabels[waveformAlignment.timeLabels.length - 1]);
    const baseY = svgHeight - paddingY;
    return `${deckAPath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  }, [deckAPath, waveformAlignment, getX, paddingY, svgHeight]);

  // Generate SVG path for Deck B (emerald/amber/rose secondary overlay)
  const deckBPath = useMemo(() => {
    if (!waveformAlignment) return '';
    const points = waveformAlignment.timeLabels.map((t, i) => {
      const x = getX(t);
      const y = getY(waveformAlignment.deckB[i] || 0, 1.3);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
  }, [waveformAlignment, getX, getY]);

  // Generate SVG closed area polygon for Deck B
  const deckBArea = useMemo(() => {
    if (!waveformAlignment) return '';
    const firstX = getX(waveformAlignment.timeLabels[0]);
    const lastX = getX(waveformAlignment.timeLabels[waveformAlignment.timeLabels.length - 1]);
    const baseY = svgHeight - paddingY;
    return `${deckBPath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  }, [deckBPath, waveformAlignment, getX, paddingY, svgHeight]);

  // Generate SVG path for Summed acoustic waveform (shows constructive punch vs comb notch dip)
  const summedPath = useMemo(() => {
    if (!waveformAlignment) return '';
    const points = waveformAlignment.timeLabels.map((t, i) => {
      const x = getX(t);
      // Normalized to scale
      const y = getY((waveformAlignment.summedWaveform[i] || 0) * 0.65, 1.3);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
  }, [waveformAlignment, getX, getY]);

  // Secondary Deck B color depending on alignment status
  const deckBColor = useMemo(() => {
    const absOffset = Math.abs(timeDeltaMs);
    if (absOffset <= 3.5) return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.18)', badge: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', text: 'PERFEKT SYNCHRON' };
    if (absOffset <= 11) return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.18)', badge: 'text-amber-400 border-amber-500/40 bg-amber-500/10', text: 'LEICHTER VERSATZ' };
    return { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.20)', badge: 'text-rose-400 border-rose-500/40 bg-rose-500/10', text: 'KRITISCHER DRIFT' };
  }, [timeDeltaMs]);

  // Find next and prev transitions for navigation
  const currentIndex = allTransitions.findIndex((t) => t.id === transition.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allTransitions.length - 1;

  return (
    <div
      id="phase-delta-waveform-overlay"
      className="w-full bg-[#08090B] border border-cyan-500/20 rounded-lg p-2.5 sm:p-3 flex flex-col gap-2.5 shadow-xl relative overflow-hidden transition-all backdrop-blur-md"
    >
      {/* Background Subtle Accent Glow */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-15"
        style={{
          backgroundColor: Math.abs(timeDeltaMs) <= 4 ? '#10b981' : Math.abs(timeDeltaMs) <= 12 ? '#f59e0b' : '#f43f5e'
        }}
      />

      {/* Header Bar: Transition Context, Alignment Status & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        {/* Left: Transition Title & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Disc3 className="w-3 h-3 text-cyan-400 animate-spin-slow" />
            <span>PHASE-DELTA MONITOR</span>
          </div>

          <span className="text-white font-mono text-xs font-bold">
            Mix @ {formatTimeSeconds(transition.timestamp)}
          </span>

          {/* Time Context Pill */}
          {isCurrentlyInBlend ? (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono text-[9px] font-bold animate-pulse">
              <Flame className="w-2.5 h-2.5 fill-pink-400" />
              LIVE IM ÜBERGANG
            </span>
          ) : isUpcoming ? (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[9px]">
              in {formatTimeSeconds(timeDiff)}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-mono text-[9px]">
              {transition.type.toUpperCase()}
            </span>
          )}

          {/* Key and BPM Progression */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            <span className="text-cyan-300 font-bold">{transition.fromKey || '8A'}</span>
            <span>({transition.fromBpm || 140} BPM)</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-emerald-300 font-bold">{transition.toKey || '8A'}</span>
            <span>({transition.toBpm || transition.fromBpm || 140} BPM)</span>
          </div>
        </div>

        {/* Right: Accuracy Pill & Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* Accuracy Status Badge */}
          <div
            id="phase-alignment-accuracy-badge"
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-tight ${deckBColor.badge}`}
          >
            {Math.abs(timeDeltaMs) <= 3.5 ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            )}
            <span>{phaseCoherenceScore}% GENAUIGKEIT</span>
            <span className="opacity-75 font-normal">({deckBColor.text})</span>
          </div>

          {/* Jump to Transition Cue Button */}
          {onSeek && (
            <button
              id="btn-seek-to-transition-blend"
              onClick={() => onSeek(Math.max(0, transition.timestamp - 10))}
              className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
              title="10 Sekunden vor Übergang springen"
            >
              <Zap className="w-2.5 h-2.5" />
              <span className="hidden md:inline">Anhören</span>
            </button>
          )}

          {/* Transition Pager */}
          {allTransitions.length > 1 && onSelectTransition && (
            <div className="flex items-center bg-white/5 rounded border border-white/10 p-0.5">
              <button
                disabled={!hasPrev}
                onClick={() => hasPrev && onSelectTransition(allTransitions[currentIndex - 1])}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Vorheriger Übergang"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[9px] font-mono text-slate-400 px-1">
                {currentIndex + 1}/{allTransitions.length}
              </span>
              <button
                disabled={!hasNext}
                onClick={() => hasNext && onSelectTransition(allTransitions[currentIndex + 1])}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Nächster Übergang"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Toggle Expand / Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title={isExpanded ? 'Kompakt schalten' : 'Vollständig anzeigen'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Secondary Waveform Visualization SVG */}
      <div className="relative w-full bg-[#040507] rounded border border-white/10 p-2 overflow-hidden flex flex-col gap-1.5">
        {/* Waveform Legend & Alignment Metrics Bar */}
        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono px-1 gap-2">
          {/* Legend Items */}
          <div className="flex items-center gap-3">
            {/* Track A: Cyan */}
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_#06b6d4]" />
              <span className="font-bold">Track A (Auslaufend)</span>
              <span className="text-slate-500 text-[9px]">0ms Grid</span>
            </div>

            {/* Track B: Secondary Waveform */}
            <div className="flex items-center gap-1.5" style={{ color: deckBColor.stroke }}>
              <span
                className="w-3 h-1 rounded-full shadow-sm"
                style={{ backgroundColor: deckBColor.stroke }}
              />
              <span className="font-bold">Track B (Eingehend)</span>
              <span className="text-slate-300 text-[9px] font-bold bg-white/10 px-1 py-0.2 rounded">
                Δt {timeDeltaMs > 0 ? `+${timeDeltaMs}` : timeDeltaMs} ms
              </span>
            </div>

            {/* Summed Signal Toggle */}
            <button
              onClick={() => setShowSummedWave(!showSummedWave)}
              className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                showSummedWave
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'text-slate-500 border-white/5 hover:text-slate-300'
              }`}
              title="Summiertes akustisches Interferenz-Signal ein-/ausblenden"
            >
              <span className="w-2 h-0.5 border-b border-dashed border-purple-400" />
              <span>Summe (Bass-Punch)</span>
            </button>
          </div>

          {/* Realtime Alignment Readings */}
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">Phasenwinkel:</span>
            <span
              className={`font-bold ${
                phaseAngleDeg < 45 ? 'text-emerald-400' : phaseAngleDeg < 95 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {phaseAngleDeg}°
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">Tempo-Diff:</span>
            <span className="text-slate-300 font-bold">
              {tempoDeltaBpm > 0 ? `+${tempoDeltaBpm}` : tempoDeltaBpm} BPM
            </span>
            {barsUntilFlam <= 16 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 font-bold flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 fill-rose-400" />
                  Flam in {barsUntilFlam} Takten
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dual Waveform Canvas */}
        <div className="w-full relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-28 sm:h-32 select-none"
          >
            <defs>
              {/* Deck A Cyan Gradient */}
              <linearGradient id="deckAOverlayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
              </linearGradient>

              {/* Deck B Secondary Gradient */}
              <linearGradient id="deckBOverlayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={deckBColor.stroke} stopOpacity="0.45" />
                <stop offset="100%" stopColor={deckBColor.stroke} stopOpacity="0.02" />
              </linearGradient>

              {/* Phase Delta Shading Pattern */}
              <pattern id="phaseDeltaPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.4" />
              </pattern>
            </defs>

            {/* Time Grid Lines (-40ms, -20ms, 0ms, +20ms, +40ms) */}
            {[-40, -20, 0, 20, 40].map((t) => {
              const x = getX(t);
              const isCenter = t === 0;
              return (
                <g key={`grid-${t}`}>
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={svgHeight - paddingY}
                    stroke={isCenter ? '#06b6d4' : 'rgba(255, 255, 255, 0.08)'}
                    strokeWidth={isCenter ? '1.5' : '1'}
                    strokeDasharray={isCenter ? undefined : '2,2'}
                  />
                  <text
                    x={x}
                    y={svgHeight - 4}
                    fill={isCenter ? '#06b6d4' : '#64748b'}
                    fontSize="8"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {isCenter ? '0ms (Deck A Grid)' : `${t > 0 ? '+' : ''}${t}ms`}
                  </text>
                </g>
              );
            })}

            {/* Alignment Tolerance Safe Zone (±3.5ms around 0ms) */}
            <rect
              x={getX(-3.5)}
              y={paddingY}
              width={getX(3.5) - getX(-3.5)}
              height={svgHeight - paddingY * 2}
              fill="rgba(16, 185, 129, 0.07)"
              stroke="rgba(16, 185, 129, 0.25)"
              strokeDasharray="2,2"
            />

            {/* Baseline */}
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />

            {/* 1. Deck A Waveform (Primary Outgoing - Cyan) */}
            <polygon points={deckAArea} fill="url(#deckAOverlayGrad)" />
            <path
              d={deckAPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            />

            {/* 2. Deck B Waveform (Secondary Incoming - Overlaid with Phase Delta Offset) */}
            <polygon points={deckBArea} fill="url(#deckBOverlayGrad)" />
            <path
              d={deckBPath}
              fill="none"
              stroke={deckBColor.stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />

            {/* 3. Optional Summed Waveform (Violet/Purple) */}
            {showSummedWave && (
              <path
                d={summedPath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.6"
                strokeDasharray="4,2"
                strokeLinecap="round"
                opacity="0.85"
                className="drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]"
              />
            )}

            {/* Transient Deck A Peak Marker at 0ms */}
            <circle
              cx={getX(0)}
              cy={getY(1.0, 1.3)}
              r="3.5"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="1"
              className="drop-shadow-[0_0_4px_#06b6d4]"
            />

            {/* Transient Deck B Peak Marker at timeDeltaMs */}
            <circle
              cx={getX(timeDeltaMs)}
              cy={getY(1.0, 1.3)}
              r="3.5"
              fill={deckBColor.stroke}
              stroke="#ffffff"
              strokeWidth="1"
              className="drop-shadow-[0_0_4px_#10b981]"
            />

            {/* Phase Delta Offset Bracket & Connector Bar between peaks */}
            {Math.abs(timeDeltaMs) > 0.8 && (
              <g>
                {/* Horizontal distance line */}
                <line
                  x1={getX(0)}
                  y1={getY(1.0, 1.3) - 10}
                  x2={getX(timeDeltaMs)}
                  y2={getY(1.0, 1.3) - 10}
                  stroke={deckBColor.stroke}
                  strokeWidth="1.5"
                />
                {/* Left tick */}
                <line
                  x1={getX(0)}
                  y1={getY(1.0, 1.3) - 14}
                  x2={getX(0)}
                  y2={getY(1.0, 1.3) - 6}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
                {/* Right tick */}
                <line
                  x1={getX(timeDeltaMs)}
                  y1={getY(1.0, 1.3) - 14}
                  x2={getX(timeDeltaMs)}
                  y2={getY(1.0, 1.3) - 6}
                  stroke={deckBColor.stroke}
                  strokeWidth="1.5"
                />
                {/* Offset label */}
                <text
                  x={(getX(0) + getX(timeDeltaMs)) / 2}
                  y={getY(1.0, 1.3) - 14}
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="drop-shadow-[0_1px_2px_black]"
                >
                  Δt = {timeDeltaMs > 0 ? `+${timeDeltaMs}` : timeDeltaMs} ms
                </text>
              </g>
            )}

            {/* In-Sync Perfect Lock Glow Beacon when timeDeltaMs ~ 0 */}
            {Math.abs(timeDeltaMs) <= 1.2 && (
              <g>
                <circle
                  cx={getX(0)}
                  cy={getY(1.0, 1.3)}
                  r="7"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  className="animate-ping opacity-75"
                />
                <text
                  x={getX(0)}
                  y={getY(1.0, 1.3) - 12}
                  fill="#10b981"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ✔ PHASE LOCKED
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Comb Filter & Sub Cancellation Acoustic Warning Strip (if detected) */}
        {subPhaseCancellationRisk !== 'minimal' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              <strong>Kammfilter-Interferenz:</strong> Sub-Bass Phasenversatz ({phaseAngleDeg}°) mindert den Druck um ca.{' '}
              {Math.round((phaseAngleDeg / 180) * 100)}%. Bass-EQ auf Deck B vorsichtig öffnen.
            </span>
          </div>
        )}
      </div>

      {/* Expanded Alignment Guidance, CDJ Jog Wheel Advice & Interactive Nudge Simulator */}
      {isExpanded && (
        <div className="flex flex-col sm:flex-row items-stretch justify-between gap-2.5 pt-1">
          {/* Left: Actionable DJ Booth Hardware Instructions */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded p-2 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" />
                Hardware-Ausrichtung (CDJ / Mixer)
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {nudgeAdvice.direction === 'in-sync'
                  ? 'Transienten deckungsgleich'
                  : nudgeAdvice.direction === 'forward'
                  ? 'Deck B eilt nach'
                  : 'Deck B eilt vor'}
              </span>
            </div>

            {/* Hardware Cue Message */}
            <div className="text-[11px] font-mono text-white flex items-center gap-1.5 font-semibold">
              {nudgeAdvice.direction === 'forward' && (
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              )}
              {nudgeAdvice.direction === 'backward' && (
                <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              )}
              {nudgeAdvice.direction === 'in-sync' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{nudgeAdvice.hardwareCorrection}</span>
            </div>

            {/* Pitch Bend Compensation note */}
            {nudgeAdvice.pitchBendPercent > 0.05 && (
              <div className="text-[9px] font-mono text-slate-400">
                ⚡ Pitch-Fader Korrektur: <strong>{nudgeAdvice.pitchBendPercent}%</strong> empfohlen zur Drift-Kompensation.
              </div>
            )}
          </div>

          {/* Right: Live Interactive Jog-Wheel Nudge Simulator */}
          <div className="bg-black/60 border border-white/10 rounded p-2 flex flex-col justify-between gap-1.5 min-w-[240px]">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 uppercase">Virtueller Jog-Nudge:</span>
              <span className="font-bold text-cyan-300">
                {manualNudgeMs > 0 ? `+${manualNudgeMs}` : manualNudgeMs} ms
              </span>
            </div>

            {/* Nudge Buttons Grid */}
            <div className="flex items-center gap-1">
              <button
                id="btn-nudge-back-heavy"
                onClick={() => handleStepNudge(-2.0)}
                className="flex-1 py-1 bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white rounded text-[10px] font-mono font-bold transition-all border border-white/5 cursor-pointer"
                title="Jog-Wheel: -2.0ms zurückdrehen"
              >
                -2ms
              </button>
              <button
                id="btn-nudge-back-fine"
                onClick={() => handleStepNudge(-0.5)}
                className="flex-1 py-1 bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white rounded text-[10px] font-mono font-bold transition-all border border-white/5 cursor-pointer"
                title="Jog-Wheel: -0.5ms Feintuning"
              >
                -0.5ms
              </button>
              <button
                id="btn-nudge-forward-fine"
                onClick={() => handleStepNudge(0.5)}
                className="flex-1 py-1 bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white rounded text-[10px] font-mono font-bold transition-all border border-white/5 cursor-pointer"
                title="Jog-Wheel: +0.5ms Feintuning"
              >
                +0.5ms
              </button>
              <button
                id="btn-nudge-forward-heavy"
                onClick={() => handleStepNudge(2.0)}
                className="flex-1 py-1 bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white rounded text-[10px] font-mono font-bold transition-all border border-white/5 cursor-pointer"
                title="Jog-Wheel: +2.0ms anschieben"
              >
                +2ms
              </button>
            </div>

            {/* Action Tools: Auto-Align Snap & Reset */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                id="btn-auto-align-phase-snap"
                onClick={handleAutoAlign}
                className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-mono font-bold rounded flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
                title="Automatisch Phasen-Sync einrasten (Delta auf 0ms kompensieren)"
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Align ⚡</span>
              </button>

              <button
                id="btn-reset-phase-nudge"
                disabled={manualNudgeMs === 0}
                onClick={handleResetNudge}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white text-[10px] font-mono rounded flex items-center gap-1 transition-all border border-white/5 cursor-pointer"
                title="Nudge auf Original-Zustand zurücksetzen"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
