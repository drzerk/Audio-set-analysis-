import React, { useState, useMemo, useRef } from 'react';
import {
  TechnoSetAnalysis,
  HarmonicEnergyClashPoint,
  ClashSeverity
} from '../types';
import {
  analyzeHarmonicEnergyClashes,
  CAMELOT_WHEEL,
  parseCamelotKey,
  getCamelotColor
} from '../utils/harmonicEnergyClashDetector';
import { formatTimeSeconds } from '../utils/pdfExport';
import { generateSmoothSvgPath } from '../utils/curveUtils';
import {
  Zap,
  AlertTriangle,
  Compass,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Disc,
  Filter,
  Volume2
} from 'lucide-react';

interface HarmonicEnergyConflictVisualizerProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek: (time: number) => void;
}

type ViewMode = 'timeline' | 'matrix' | 'wheel' | 'log';

export const HarmonicEnergyConflictVisualizer: React.FC<HarmonicEnergyConflictVisualizerProps> = ({
  currentSet,
  currentTime,
  onSeek
}) => {
  const [activeView, setActiveView] = useState<ViewMode>('timeline');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'clashes' | 'synergies'>('all');
  const [selectedClash, setSelectedClash] = useState<HarmonicEnergyClashPoint | null>(null);
  const [hoverTimeline, setHoverTimeline] = useState<{
    timeSec: number;
    xPct: number;
    key: string;
    energy: number;
    activeClash?: HarmonicEnergyClashPoint;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const duration = currentSet.duration || 3600;
  const currentPct = (currentTime / duration) * 100;

  // Run harmonic-energy clash diagnostic engine
  const analysis = useMemo(() => {
    return analyzeHarmonicEnergyClashes(currentSet);
  }, [currentSet]);

  const {
    overallSynergyScore,
    grade,
    clashesCount,
    clashPoints,
    harmonicMomentumTrend,
    coherenceAssessment,
    djDirectives
  } = analysis;

  // Find if currently playing inside an active clash zone
  const activePlayingClash = useMemo(() => {
    return clashPoints.find((cp) => Math.abs(cp.timestamp - currentTime) <= (cp.duration || 30));
  }, [clashPoints, currentTime]);

  // Timeline mouse scrubbing
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xPct = (x / rect.width) * 100;
    const timeSec = Math.round((x / rect.width) * duration);

    // Find closest trend sample
    const closest = harmonicMomentumTrend.reduce((prev, curr) =>
      Math.abs(curr.time - timeSec) < Math.abs(prev.time - timeSec) ? curr : prev
    );

    const nearClash = clashPoints.find((cp) => Math.abs(cp.timestamp - timeSec) <= 45);

    setHoverTimeline({
      timeSec,
      xPct,
      key: closest.keyCamelot,
      energy: closest.energy,
      activeClash: nearClash
    });
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = (x / rect.width) * duration;
    onSeek(targetTime);
  };

  const handleJumpToClash = (clash: HarmonicEnergyClashPoint) => {
    // Jump 10 seconds before the transition/clash moment so DJ can hear context
    const jumpTime = Math.max(0, clash.timestamp - 10);
    onSeek(jumpTime);
    setSelectedClash(clash);
  };

  // Filtered clash points for the diagnostic log
  const filteredClashPoints = useMemo(() => {
    if (filterSeverity === 'clashes') {
      return clashPoints.filter((c) => c.severity === 'critical' || c.severity === 'moderate' || c.severity === 'warning');
    }
    if (filterSeverity === 'synergies') {
      return clashPoints.filter((c) => c.severity === 'synergy');
    }
    return clashPoints;
  }, [clashPoints, filterSeverity]);

  // Grade color helper
  const gradeBadgeClass =
    grade === 'S+' || grade === 'A'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : grade === 'B'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      : grade === 'C'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  // SVG path for energy curve with smooth spline interpolation
  const energyPathData = useMemo(() => {
    if (!harmonicMomentumTrend || harmonicMomentumTrend.length === 0) return '';
    const coords = harmonicMomentumTrend.map((p) => ({
      x: (p.time / duration) * 100,
      y: Math.max(2, Math.min(98, 100 - p.energy))
    }));
    return generateSmoothSvgPath(coords, 0.2);
  }, [harmonicMomentumTrend, duration]);

  // SVG path for tension index with smooth spline interpolation
  const tensionPathData = useMemo(() => {
    if (!harmonicMomentumTrend || harmonicMomentumTrend.length === 0) return '';
    const coords = harmonicMomentumTrend.map((p) => ({
      x: (p.time / duration) * 100,
      y: Math.max(2, Math.min(98, 100 - Math.min(100, Math.max(0, p.harmonicTensionIndex))))
    }));
    return generateSmoothSvgPath(coords, 0.2);
  }, [harmonicMomentumTrend, duration]);

  return (
    <div
      id="harmonic-energy-conflict-visualizer"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-3"
    >
      {/* 1. Header Bar with Metrics & View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-purple-400" />
          <div>
            <h3 className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              CAMELOT-HARMONIK VS. ENERGIE-TREND
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${gradeBadgeClass}`}>
                KOHÄRENZ: {overallSynergyScore}% (RANG {grade})
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Erkennt Konflikte, Dissonanzen und Anti-Climax-Stellen zwischen Tonart-Modulation und Schalldruck.
            </p>
          </div>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
          <span
            className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
              clashesCount.critical > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Kritische Konflikte: Dissonanz-Kollision oder massiver Anti-Climax"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{clashesCount.critical} Kritisch</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
              clashesCount.moderate > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Moderate Konflikte: Deplatzierter Boost im Breakdown"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{clashesCount.moderate} Reibung</span>
          </span>

          <span
            className="px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1"
            title="Optimale Tonart-Energie Synergien"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{clashesCount.synergy} Synergien</span>
          </span>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs for Different Analytical Angles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center bg-black/50 border border-white/10 rounded p-0.5 text-[10px] font-mono">
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'timeline'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Timeline-Überlagerung</span>
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'matrix'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>2D-Konfliktmatrix</span>
          </button>
          <button
            onClick={() => setActiveView('wheel')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'wheel'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Disc className="w-3 h-3" />
            <span>Camelot-Rad Trajektorie</span>
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'log'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Diagnose-Log ({clashPoints.length})</span>
          </button>
        </div>

        {/* Live Playback Indicator */}
        {activePlayingClash ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>
              LIVE-ZONE ({formatTimeSeconds(currentTime)}): {activePlayingClash.title} ({activePlayingClash.fromKey} → {activePlayingClash.toKey})
            </span>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-500 hidden sm:block">
            Klick auf Graphen / Marker springt im DJ Deck
          </div>
        )}
      </div>

      {/* 3. MAIN VISUALIZATION PANELS */}

      {/* VIEW 1: TIMELINE OVERLAY & CLASH HEATMAP */}
      {activeView === 'timeline' && (
        <div className="flex flex-col gap-2">
          <div
            ref={containerRef}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => setHoverTimeline(null)}
            onClick={handleTimelineClick}
            className="relative bg-[#0A0A0B] border border-white/5 rounded p-2.5 cursor-crosshair select-none"
          >
            {/* Legend info row */}
            <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-400 mb-2 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-pink-500 rounded-full" />
                  <span>Energie-Trend (0-100%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-purple-400 rounded-full" />
                  <span>Camelot-Progression</span>
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Konflikt-Brennpunkt</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Harmonische Synergie</span>
                </span>
              </div>
              <span>SKALA: 0:00 - {formatTimeSeconds(duration)}</span>
            </div>

            {/* Combined Dual Curve Canvas */}
            <div className="h-32 sm:h-36 w-full relative bg-black/70 border border-white/5 rounded overflow-hidden">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-20 pointer-events-none">
                <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">100% Peak</div>
                <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">75% High</div>
                <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">50% Mid</div>
                <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">25% Low</div>
              </div>

              {/* SVG Curve Plot */}
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="clashEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.38" />
                    <stop offset="50%" stopColor="#ec4899" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="clashEnergyGlow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#ec4899" floodOpacity="0.8" />
                  </filter>
                  <filter id="tensionGlow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#c084fc" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Shaded Area under Energy */}
                <path d={`${energyPathData} L 100 100 L 0 100 Z`} fill="url(#clashEnergyGrad)" />

                {/* Energy Trend Path */}
                <path
                  d={energyPathData}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2.2"
                  filter="url(#clashEnergyGlow)"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Tension Curve Path */}
                <path
                  d={tensionPathData}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.6"
                  strokeDasharray="2.5,2.5"
                  filter="url(#tensionGlow)"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Clash Hotspot Markers along Timeline */}
              {clashPoints.map((clash) => {
                const isCritical = clash.severity === 'critical';
                const isModerate = clash.severity === 'moderate';
                const isWarning = clash.severity === 'warning';
                const isSynergy = clash.severity === 'synergy';

                const markerColor = isCritical
                  ? 'bg-rose-500'
                  : isModerate
                  ? 'bg-amber-500'
                  : isWarning
                  ? 'bg-yellow-400'
                  : 'bg-emerald-400';

                const ringColor = isCritical
                  ? 'ring-rose-500/50 animate-pulse'
                  : isModerate
                  ? 'ring-amber-500/40'
                  : 'ring-emerald-400/40';

                return (
                  <div
                    key={clash.id}
                    style={{ left: `${clash.xPct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJumpToClash(clash);
                    }}
                    className="absolute top-0 bottom-0 w-0.5 group cursor-pointer z-10"
                    title={`${clash.title} bei ${formatTimeSeconds(clash.timestamp)}`}
                  >
                    {/* Vertical line accent */}
                    <div className={`w-full h-full ${markerColor} opacity-70 group-hover:opacity-100`} />

                    {/* Top Beacon Pin */}
                    <div
                      className={`absolute top-1 -ml-1.5 w-3.5 h-3.5 rounded-full ${markerColor} ring-4 ${ringColor} flex items-center justify-center text-[7px] text-black font-bold shadow-md transform group-hover:scale-125 transition-transform`}
                    >
                      {isCritical ? '!' : isModerate ? '?' : '✓'}
                    </div>

                    {/* Pill label on hover or click */}
                    <div className="absolute bottom-1 -translate-x-1/2 left-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/20 rounded px-1.5 py-0.5 text-[8px] font-mono text-white whitespace-nowrap pointer-events-none z-20">
                      {clash.fromKey} → {clash.toKey} ({clash.energyDelta > 0 ? `+${clash.energyDelta}%` : `${clash.energyDelta}%`})
                    </div>
                  </div>
                );
              })}

              {/* Current Playhead Indicator */}
              <div
                style={{ left: `${currentPct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_8px_white] z-20"
              />

              {/* Hover Cursor Bar */}
              {hoverTimeline && (
                <div
                  style={{ left: `${hoverTimeline.xPct}%` }}
                  className="absolute top-0 bottom-0 w-px bg-purple-400/80 pointer-events-none border-l border-dashed border-purple-400 z-15"
                />
              )}
            </div>

            {/* Camelot Track Ribbon */}
            <div className="mt-1.5 h-7 w-full bg-black/80 border border-white/5 rounded flex overflow-hidden relative">
              {currentSet.harmonyPoints.map((h, idx, arr) => {
                const nextTime = arr[idx + 1]?.time || duration;
                const segSpan = nextTime - h.time;
                const widthPct = (segSpan / duration) * 100;
                const color = getCamelotColor(h.keyCamelot);

                return (
                  <div
                    key={idx}
                    style={{
                      width: `${widthPct}%`,
                      borderRightColor: 'rgba(255,255,255,0.08)'
                    }}
                    className="h-full border-r px-1.5 flex items-center justify-between font-mono text-[9px] font-bold text-slate-200 transition-colors hover:brightness-125"
                    style-border={{ borderLeftColor: color }}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{h.keyCamelot}</span>
                    </div>
                    <span className="text-[8px] text-slate-400 hidden sm:inline truncate">
                      {h.keyNote}
                    </span>
                  </div>
                );
              })}

              {/* Playhead on Camelot Ribbon */}
              <div
                style={{ left: `${currentPct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white] z-20"
              />
            </div>

            {/* Hover Telemetry Bar */}
            {hoverTimeline && (
              <div className="mt-2 p-1.5 rounded bg-purple-950/30 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-purple-300 font-bold">
                    ZEIT: {formatTimeSeconds(hoverTimeline.timeSec)}
                  </span>
                  <span className="text-slate-300">
                    TONART: <strong className="text-white">{hoverTimeline.key}</strong>
                  </span>
                  <span className="text-pink-300">
                    ENERGIE: <strong>{hoverTimeline.energy}%</strong>
                  </span>
                </div>

                {hoverTimeline.activeClash ? (
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      hoverTimeline.activeClash.severity === 'critical'
                        ? 'text-rose-400 bg-rose-500/20'
                        : hoverTimeline.activeClash.severity === 'moderate'
                        ? 'text-amber-400 bg-amber-500/20'
                        : 'text-emerald-400 bg-emerald-500/20'
                    }`}
                  >
                    [{hoverTimeline.activeClash.title}]
                  </span>
                ) : (
                  <span className="text-slate-500">Stabiler Verlauf ohne akuten Tonart-Konflikt</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 2D CONFLICT MATRIX (PHASE-SPACE) */}
      {activeView === 'matrix' && (
        <div className="bg-[#0A0A0B] border border-white/5 rounded p-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-purple-400 font-bold uppercase">
              2D-PHASENRAUM: TONART-SCHRITT (X) VS. ENERGIE-DELTA (Y)
            </span>
            <span>Klick auf Datenpunkt springt zur Stelle</span>
          </div>

          <div className="relative h-64 sm:h-72 w-full bg-black/80 border border-white/10 rounded overflow-hidden p-2 flex items-center justify-center">
            {/* Background 4-Quadrant Shading */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-25 pointer-events-none">
              {/* Top-Left: Anti-Climax Zone (Key down, Energy UP) */}
              <div className="bg-rose-950/40 border-r border-b border-white/10 p-2 text-[8px] font-mono text-rose-400">
                [ANTI-CLIMAX ZONE]: Key fällt, Energie explodiert
              </div>
              {/* Top-Right: Euphoric Synergy Zone (Key UP, Energy UP) */}
              <div className="bg-emerald-950/40 border-b border-white/10 p-2 text-[8px] font-mono text-emerald-400 text-right">
                [EUPHORIC SYNERGY]: Key-Lift (+1) treibt Peak
              </div>
              {/* Bottom-Left: Harmonious Release (Key down, Energy down) */}
              <div className="bg-blue-950/40 border-r border-white/10 p-2 text-[8px] font-mono text-blue-400 flex items-end">
                [CONTROLLED RELEASE]: Entspannung
              </div>
              {/* Bottom-Right: Misplaced Boost Zone (Key UP, Energy down) */}
              <div className="bg-amber-950/40 p-2 text-[8px] font-mono text-amber-400 flex items-end justify-end">
                [BREAKDOWN CLASH]: Key-Lift im Energie-Loch
              </div>
            </div>

            {/* Axes */}
            <div className="absolute inset-0 flex items-center pointer-events-none">
              <div className="w-full border-t border-white/20 border-dashed" />
            </div>
            <div className="absolute inset-0 flex justify-center pointer-events-none">
              <div className="h-full border-r border-white/20 border-dashed" />
            </div>

            {/* Axis Labels */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-400 bg-black/60 px-1 rounded">
              + Energie-Anstieg (+ΔE)
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-400 bg-black/60 px-1 rounded">
              - Energie-Abfall (-ΔE)
            </div>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-slate-400 bg-black/60 px-1 rounded">
              - Tonart (-Schritte)
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-slate-400 bg-black/60 px-1 rounded">
              + Tonart (+Schritte)
            </div>

            {/* Render Transition Data Nodes in Phase Space */}
            {clashPoints.map((cp) => {
              // Map camelotStepDelta [-6, +6] to X% [10% to 90%]
              // Clamp delta to range
              const step = Math.max(-6, Math.min(6, cp.camelotStepDelta));
              const xPct = 50 + (step / 6) * 40;

              // Map energyDelta [-40, +40] to Y% [90% to 10%] (inverted SVG coords)
              const eDelta = Math.max(-40, Math.min(40, cp.energyDelta));
              const yPct = 50 - (eDelta / 40) * 40;

              const isCritical = cp.severity === 'critical';
              const isModerate = cp.severity === 'moderate';
              const isSynergy = cp.severity === 'synergy';

              const color = isCritical
                ? 'bg-rose-500 text-white'
                : isModerate
                ? 'bg-amber-500 text-black'
                : isSynergy
                ? 'bg-emerald-500 text-black'
                : 'bg-yellow-400 text-black';

              return (
                <div
                  key={cp.id}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  onClick={() => handleJumpToClash(cp)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                >
                  <div
                    className={`w-6 h-6 rounded-full ${color} border-2 border-white/50 flex items-center justify-center font-mono text-[9px] font-bold shadow-md transform group-hover:scale-130 transition-transform`}
                  >
                    {cp.camelotStepDelta > 0 ? `+${cp.camelotStepDelta}` : cp.camelotStepDelta}
                  </div>

                  {/* Tooltip on node */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/95 border border-white/20 p-2 rounded text-[9px] font-mono text-white whitespace-nowrap z-30 shadow-xl">
                    <div className="font-bold text-purple-300">{cp.title}</div>
                    <div className="text-slate-300">
                      {cp.fromKey} → {cp.toKey} @ {formatTimeSeconds(cp.timestamp)}
                    </div>
                    <div className="text-slate-400">
                      Energie: {cp.fromEnergy}% → {cp.toEnergy}% ({cp.energyDelta > 0 ? `+${cp.energyDelta}%` : `${cp.energyDelta}%`})
                    </div>
                    <div className="text-[8px] text-emerald-400 mt-1">Klick zum Anhören</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] font-mono text-slate-400 bg-white/5 p-2 rounded border border-white/5 flex items-center justify-between">
            <span>
              <strong>Lesehilfe:</strong> Punkte im roten Quadranten oben-links zeigen Übergänge, bei denen trotz steigender Energie die Tonart nach unten moduliert wurde (Anti-Climax).
            </span>
          </div>
        </div>
      )}

      {/* VIEW 3: CAMELOT WHEEL TRAJECTORY (CIRCULAR RADAR) */}
      {activeView === 'wheel' && (
        <div className="bg-[#0A0A0B] border border-white/5 rounded p-3 flex flex-col items-center gap-3">
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-white/5 pb-1.5">
            <span className="text-purple-400 font-bold uppercase">
              CAMELOT-RAD & ZYKLISCHE SET-TRAJEKTORIE
            </span>
            <span>Radius & Leuchtkraft = Verweildauer & Energie</span>
          </div>

          {/* Circular SVG Wheel */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 select-none">
            <svg className="w-full h-full" viewBox="-120 -120 240 240">
              {/* Outer boundary circle */}
              <circle cx="0" cy="0" r="105" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <circle cx="0" cy="0" r="75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

              {/* 12 Camelot Wheel Sectors */}
              {CAMELOT_WHEEL.map((sec) => {
                const rad = ((sec.angleDeg - 90) * Math.PI) / 180;
                const x = Math.cos(rad) * 90;
                const y = Math.sin(rad) * 90;

                // Check if key is used in set
                const isKeyInSet = currentSet.harmonyPoints.some(
                  (hp) => parseCamelotKey(hp.keyCamelot).num === sec.number
                );

                return (
                  <g key={sec.number}>
                    {/* Sector node */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isKeyInSet ? 14 : 9}
                      fill={isKeyInSet ? sec.color : '#1e1e24'}
                      stroke={isKeyInSet ? '#ffffff' : 'rgba(255,255,255,0.1)'}
                      strokeWidth={isKeyInSet ? '2' : '1'}
                      className="transition-all"
                    />
                    <text
                      x={x}
                      y={y + 3}
                      textAnchor="middle"
                      fontSize={isKeyInSet ? '9' : '8'}
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={isKeyInSet ? '#000000' : '#888888'}
                    >
                      {sec.number}A
                    </text>
                    {/* Note label */}
                    <text
                      x={Math.cos(rad) * 114}
                      y={Math.sin(rad) * 114 + 3}
                      textAnchor="middle"
                      fontSize="7"
                      fontFamily="monospace"
                      fill={isKeyInSet ? sec.color : '#555555'}
                    >
                      {sec.minorKey}
                    </text>
                  </g>
                );
              })}

              {/* Set Trajectory Vectors connecting keys */}
              {currentSet.harmonyPoints.map((hp, idx, arr) => {
                if (idx === arr.length - 1) return null;
                const nextHp = arr[idx + 1];
                const fromP = CAMELOT_WHEEL.find((w) => w.number === parseCamelotKey(hp.keyCamelot).num) || CAMELOT_WHEEL[0];
                const toP = CAMELOT_WHEEL.find((w) => w.number === parseCamelotKey(nextHp.keyCamelot).num) || CAMELOT_WHEEL[0];

                const rad1 = ((fromP.angleDeg - 90) * Math.PI) / 180;
                const rad2 = ((toP.angleDeg - 90) * Math.PI) / 180;

                const x1 = Math.cos(rad1) * 85;
                const y1 = Math.sin(rad1) * 85;
                const x2 = Math.cos(rad2) * 85;
                const y2 = Math.sin(rad2) * 85;

                // Check distance
                let diff = toP.number - fromP.number;
                if (diff > 6) diff -= 12;
                if (diff < -6) diff += 12;
                const isClashing = Math.abs(diff) >= 3;

                return (
                  <g key={`path-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isClashing ? '#ef4444' : '#10b981'}
                      strokeWidth={isClashing ? '2.5' : '1.8'}
                      strokeDasharray={isClashing ? '3,3' : 'none'}
                      markerEnd="url(#arrow)"
                    />
                  </g>
                );
              })}

              {/* Center Hub */}
              <circle cx="0" cy="0" r="22" fill="#121214" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="0" y="-3" textAnchor="middle" fontSize="7" fill="#a855f7" fontFamily="monospace" fontWeight="bold">
                CAMELOT
              </text>
              <text x="0" y="8" textAnchor="middle" fontSize="6.5" fill="#888888" fontFamily="monospace">
                WHEEL
              </text>
            </svg>
          </div>

          <div className="w-full flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-400 bg-white/5 p-2 rounded">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-500" />
              <span>Harmonische Schritte (±1 Quinte)</span>
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-500 border-dashed" />
              <span>Dissonante Sprünge (≥ 3 Felder / Tritone)</span>
            </span>
          </div>
        </div>
      )}

      {/* VIEW 4: DIAGNOSTIC LOG & DJ REMEDIES */}
      {activeView === 'log' && (
        <div className="flex flex-col gap-2.5">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <Filter className="w-3 h-3 text-slate-500" />
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filterSeverity === 'all' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alle ({clashPoints.length})
              </button>
              <button
                onClick={() => setFilterSeverity('clashes')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filterSeverity === 'clashes' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nur Konflikte ({clashesCount.total})
              </button>
              <button
                onClick={() => setFilterSeverity('synergies')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filterSeverity === 'synergies' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nur Synergien ({clashesCount.synergy})
              </button>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Sortiert nach Chronologie im Set
            </span>
          </div>

          {/* Clash Point Cards */}
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredClashPoints.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-[10px] font-mono">
                Keine Einträge für den gewählten Filter gefunden.
              </div>
            ) : (
              filteredClashPoints.map((cp) => {
                const isCritical = cp.severity === 'critical';
                const isModerate = cp.severity === 'moderate';
                const isWarning = cp.severity === 'warning';
                const isSynergy = cp.severity === 'synergy';

                const borderClass = isCritical
                  ? 'border-rose-500/40 bg-rose-950/20'
                  : isModerate
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : isWarning
                  ? 'border-yellow-500/30 bg-yellow-950/15'
                  : 'border-emerald-500/30 bg-emerald-950/20';

                return (
                  <div
                    key={cp.id}
                    className={`border rounded p-2.5 flex flex-col gap-2 transition-all ${borderClass}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Severity Badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            isCritical
                              ? 'bg-rose-500 text-black'
                              : isModerate
                              ? 'bg-amber-500 text-black'
                              : isWarning
                              ? 'bg-yellow-400 text-black'
                              : 'bg-emerald-400 text-black'
                          }`}
                        >
                          {isCritical ? 'KRITISCHER KONFLIKT' : isModerate ? 'MODERATE REIBUNG' : isWarning ? 'WARNUNG' : 'OPTIMALE SYNERGIE'}
                        </span>

                        <span className="text-[10px] font-mono font-bold text-white">
                          {cp.title}
                        </span>

                        <span className="text-[9px] font-mono text-slate-400">
                          [{cp.phaseContext}]
                        </span>
                      </div>

                      {/* Jump Button */}
                      <button
                        onClick={() => handleJumpToClash(cp)}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Bei {formatTimeSeconds(cp.timestamp)} anhören</span>
                      </button>
                    </div>

                    {/* Technical Telemetry Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px] font-mono bg-black/50 p-1.5 rounded border border-white/5">
                      <div>
                        <span className="text-slate-500">Tonart-Wechsel: </span>
                        <span className="text-purple-300 font-bold">
                          {cp.fromKey} → {cp.toKey} ({cp.camelotStepDelta > 0 ? `+${cp.camelotStepDelta}` : cp.camelotStepDelta} Schritte)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Energie-Verlauf: </span>
                        <span className="text-pink-300 font-bold">
                          {cp.fromEnergy}% → {cp.toEnergy}% ({cp.energyDelta > 0 ? `+${cp.energyDelta}%` : `${cp.energyDelta}%`})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Camelot-Distanz: </span>
                        <span className="text-slate-200">{cp.camelotDistance} von 6 Feldern</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Blend-Dauer: </span>
                        <span className="text-slate-200">{cp.duration || 32}s Mix-Länge</span>
                      </div>
                    </div>

                    {/* Diagnostic Explanation & Remedy */}
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      {cp.description}
                    </p>

                    <div className="bg-black/40 border border-white/5 rounded p-2 text-[9px] font-mono flex items-start gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-400 uppercase">DJ-Korrektur / Remedy: </strong>
                        <span className="text-slate-300">{cp.remedy}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Overall Master Assessment & Directives */}
      <div className="border-t border-white/5 pt-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[10px] font-mono">
        <div className="flex-1 text-slate-300">
          <span className="text-purple-400 font-bold uppercase mr-1.5">Kuratoren-Fazit:</span>
          <span>{coherenceAssessment}</span>
        </div>

        {djDirectives.length > 0 && (
          <div className="text-[9px] text-slate-400 bg-purple-950/20 border border-purple-500/20 px-2 py-1 rounded max-w-md">
            <strong className="text-purple-300">Empfohlene Mix-Praxis: </strong>
            <span>{djDirectives[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
};
