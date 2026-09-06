import React, { useState, useRef, useMemo } from 'react';
import { TechnoSetAnalysis, EnergyGap } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import {
  Activity,
  Disc,
  Zap,
  Info,
  TrendingUp,
  Layers,
  Flame,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Sliders,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { computeAutoTaggedSegments } from '../utils/segmentAutoTagger';
import { detectEnergyGaps, getGapSeverityColors } from '../utils/energyGapDetector';
import { generateSmoothSvgPath } from '../utils/curveUtils';

interface BpmHarmonicChartProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek: (time: number) => void;
}

export const BpmHarmonicChart: React.FC<BpmHarmonicChartProps> = ({
  currentSet,
  currentTime,
  onSeek
}) => {
  const [hoverData, setHoverData] = useState<{
    time: number;
    bpm: number;
    energy: number;
    subBass: number;
    key: string;
    xPct: number;
    activeGap?: EnergyGap | null;
  } | null>(null);

  const [showEnergyGapOverlay, setShowEnergyGapOverlay] = useState<boolean>(true);
  const [gapSensitivity, setGapSensitivity] = useState<'conservative' | 'standard' | 'aggressive'>('standard');
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [isGapDrawerExpanded, setIsGapDrawerExpanded] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const duration = currentSet.duration || 3600;
  const currentPct = (currentTime / duration) * 100;

  // Detect Energy Gaps below set average
  const gapAnalysis = useMemo(() => {
    return detectEnergyGaps(currentSet.energyPoints, duration, gapSensitivity);
  }, [currentSet.energyPoints, duration, gapSensitivity]);

  const segments = currentSet.segments && currentSet.segments.length > 0
    ? currentSet.segments
    : computeAutoTaggedSegments(duration, currentSet.energyPoints);

  // Derive min and max for BPM scale
  const minBpm = Math.floor(currentSet.bpmMin - 1);
  const maxBpm = Math.ceil(currentSet.bpmMax + 1);
  const bpmRange = Math.max(2, maxBpm - minBpm);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xPct = (x / rect.width) * 100;
    const targetTime = (x / rect.width) * duration;

    // Find closest data points
    const closestBpm = currentSet.bpmPoints.reduce((prev, curr) =>
      Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev
    , currentSet.bpmPoints[0] || { time: targetTime, bpm: currentSet.bpmAverage });

    const closestEnergy = currentSet.energyPoints.reduce((prev, curr) =>
      Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev
    , currentSet.energyPoints[0] || { time: targetTime, energy: 75, subBass: 75 });

    const closestHarm = currentSet.harmonyPoints.reduce((prev, curr) =>
      Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev
    , currentSet.harmonyPoints[0] || { time: targetTime, keyCamelot: currentSet.dominantKey });

    const activeGap = gapAnalysis.gaps.find(
      (g) => targetTime >= g.startTime && targetTime <= g.endTime
    ) || null;

    setHoverData({
      time: Math.round(targetTime),
      bpm: closestBpm.bpm,
      energy: closestEnergy.energy,
      subBass: closestEnergy.subBass,
      key: closestHarm.keyCamelot,
      xPct,
      activeGap
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = (x / rect.width) * duration;
    onSeek(targetTime);
  };

  // Build SVG path for BPM curve with smooth spline interpolation
  const bpmPointsSorted = [...currentSet.bpmPoints].sort((a, b) => a.time - b.time);
  const bpmCoords = bpmPointsSorted.map((p) => ({
    x: (p.time / duration) * 100,
    y: Math.max(2, Math.min(98, 100 - ((p.bpm - minBpm) / bpmRange) * 100))
  }));
  const bpmPathData = generateSmoothSvgPath(bpmCoords, 0.2);

  // Build SVG path for Energy curve with smooth spline interpolation
  const energyPointsSorted = [...currentSet.energyPoints].sort((a, b) => a.time - b.time);
  const energyCoords = energyPointsSorted.map((p) => ({
    x: (p.time / duration) * 100,
    y: Math.max(2, Math.min(98, 100 - p.energy))
  }));
  const energyPathData = generateSmoothSvgPath(energyCoords, 0.2);

  const subBassCoords = energyPointsSorted.map((p) => ({
    x: (p.time / duration) * 100,
    y: Math.max(2, Math.min(98, 100 - p.subBass))
  }));
  const subBassPathData = generateSmoothSvgPath(subBassCoords, 0.2);

  return (
    <div
      id="bpm-harmonic-analysis-card"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-2.5"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
            BPM-PROGRESSION & HARMONISCHES CAMELOT-FELD
          </h3>
        </div>

        {/* Heatmap Toggle & Sensitivity Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEnergyGapOverlay(!showEnergyGapOverlay)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-bold transition-all border cursor-pointer ${
              showEnergyGapOverlay
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
            title="Energy-Gap Heatmap Overlay ein-/ausschalten"
          >
            <Flame className={`w-3 h-3 ${showEnergyGapOverlay ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span>ENERGY-GAP HEATMAP</span>
            {gapAnalysis.gaps.length > 0 && (
              <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                gapAnalysis.criticalGapsCount > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 text-black'
              }`}>
                {gapAnalysis.gaps.length} {gapAnalysis.gaps.length === 1 ? 'GAP' : 'GAPS'}
              </span>
            )}
          </button>

          {showEnergyGapOverlay && (
            <div className="flex items-center bg-black/60 border border-white/10 rounded p-0.5 text-[8.5px] font-mono">
              <span className="text-slate-500 px-1 hidden sm:inline">SCHWELLE:</span>
              <button
                type="button"
                onClick={() => setGapSensitivity('conservative')}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  gapSensitivity === 'conservative' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Konservative Schwelle: -22% unter Set-Ø (>35s Lull)"
              >
                -22%
              </button>
              <button
                type="button"
                onClick={() => setGapSensitivity('standard')}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  gapSensitivity === 'standard' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Standard Schwelle: -16% unter Set-Ø (>25s Lull)"
              >
                -16% (Ø)
              </button>
              <button
                type="button"
                onClick={() => setGapSensitivity('aggressive')}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  gapSensitivity === 'aggressive' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Sensible Schwelle: -12% unter Set-Ø (>18s Lull)"
              >
                -12%
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-1 bg-blue-500 rounded-full" />
              <span>BPM ({currentSet.bpmAverage} Ø)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-1 bg-pink-500 rounded-full" />
              <span>Energie</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-1 bg-amber-500 rounded-full" />
              <span>Sub-Bass</span>
            </div>
            {showEnergyGapOverlay && (
              <div className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-1 bg-rose-500 rounded-full" />
                <span>Gap-Zone</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverData(null)}
        onClick={handleClick}
        className="relative bg-[#0A0A0B] border border-white/5 rounded p-2.5 cursor-crosshair select-none"
      >
        {/* 1. BPM Track Section */}
        <div className="relative mb-2">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-blue-400 font-bold uppercase">
              <TrendingUp className="w-3 h-3" /> TEMPO-PROGRESSION (BPM)
            </span>
            <span>SKALA: {minBpm} - {maxBpm} BPM</span>
          </div>

          <div className="h-20 sm:h-24 w-full relative bg-black/70 border border-white/5 rounded overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20 pointer-events-none">
              <div className="border-b border-slate-600 border-dashed w-full" />
              <div className="border-b border-slate-600 border-dashed w-full" />
              <div className="border-b border-slate-600 border-dashed w-full" />
            </div>

            {/* SVG Graph for BPM */}
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="bpmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
                </linearGradient>
                <filter id="bpmLineGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#38bdf8" floodOpacity="0.75" />
                </filter>
              </defs>
              {/* Fill area under curve */}
              <path
                d={`${bpmPathData} L 100 100 L 0 100 Z`}
                fill="url(#bpmGrad)"
              />
              {/* Stroke line with smooth curve & neon glow */}
              <path
                d={bpmPathData}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                filter="url(#bpmLineGlow)"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Current Playhead on BPM graph */}
            <div
              style={{ left: `${currentPct}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white]"
            />
          </div>
        </div>

        {/* 2. Energetic Dynamic Curve */}
        <div className="relative mb-2">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-pink-400 font-bold uppercase">
              <Zap className="w-3 h-3" /> ENERGETISCHER SPANNUNGSVERLAUF & TIEFBASS-DRUCK
            </span>
            <div className="flex items-center gap-2">
              {showEnergyGapOverlay && (
                <span className="text-amber-400 font-bold">
                  SCHWELLE: &lt;{gapAnalysis.thresholdEnergy}% (Ø {gapAnalysis.setAverageEnergy}%)
                </span>
              )}
              <span>0% - 100% INTENSITÄT</span>
            </div>
          </div>

          <div className="h-20 sm:h-24 w-full relative bg-black/70 border border-white/5 rounded overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20 pointer-events-none">
              <div className="border-b border-slate-600 border-dashed w-full" />
              <div className="border-b border-slate-600 border-dashed w-full" />
              <div className="border-b border-slate-600 border-dashed w-full" />
            </div>

            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Energy Gap Heatmap Gradients */}
                <linearGradient id="energyGapCritGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id="energyGapWarnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.05" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#c2410c" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="energyGapModGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity="0.03" />
                  <stop offset="50%" stopColor="#eab308" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#854d0e" stopOpacity="0.25" />
                </linearGradient>
                {/* Diagonal hazard stripes for critical flow-killers */}
                <pattern id="critStripes" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#f43f5e" strokeWidth="1.2" strokeOpacity="0.25" />
                </pattern>
                {/* Energy curve ambient area fill */}
                <linearGradient id="overallEnergyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.32" />
                  <stop offset="50%" stopColor="#ec4899" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </linearGradient>
                {/* SubBass ambient area fill */}
                <linearGradient id="subBassAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                {/* Neon Glow Filters */}
                <filter id="energyGlowFilter" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="#ec4899" floodOpacity="0.8" />
                </filter>
                <filter id="subBassGlowFilter" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodColor="#f59e0b" floodOpacity="0.75" />
                </filter>
              </defs>

              {/* Energy curve area under curve */}
              <path
                d={`${energyPathData} L 100 100 L 0 100 Z`}
                fill="url(#overallEnergyAreaGrad)"
              />

              {/* Sub-Bass area under curve */}
              <path
                d={`${subBassPathData} L 100 100 L 0 100 Z`}
                fill="url(#subBassAreaGrad)"
              />

              {/* Energy-Gap Heatmap Zones */}
              {showEnergyGapOverlay && gapAnalysis.gaps.map((gap) => {
                const x1 = (gap.startTime / duration) * 100;
                const x2 = (gap.endTime / duration) * 100;
                const w = Math.max(0.6, x2 - x1);
                const isCrit = gap.severity === 'critical';
                const isWarn = gap.severity === 'warning';
                const fillUrl = isCrit ? 'url(#energyGapCritGrad)' : isWarn ? 'url(#energyGapWarnGrad)' : 'url(#energyGapModGrad)';
                const strokeColor = isCrit ? '#f43f5e' : isWarn ? '#f97316' : '#eab308';
                const isSelected = selectedGapId === gap.id;

                return (
                  <g key={gap.id}>
                    <rect
                      x={x1}
                      y="0"
                      width={w}
                      height="100"
                      fill={fillUrl}
                      stroke={isSelected ? '#ffffff' : 'none'}
                      strokeWidth={isSelected ? '0.8' : '0'}
                    />
                    {isCrit && (
                      <rect x={x1} y="0" width={w} height="100" fill="url(#critStripes)" />
                    )}
                    <line
                      x1={x1}
                      y1="0"
                      x2={x1}
                      y2="100"
                      stroke={strokeColor}
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                      strokeOpacity="0.8"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={x2}
                      y1="0"
                      x2={x2}
                      y2="100"
                      stroke={strokeColor}
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                      strokeOpacity="0.8"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}

              {/* Set Average Line & Gap Threshold Line */}
              {showEnergyGapOverlay && (
                <>
                  {/* Set-Average Energy Reference */}
                  <line
                    x1="0"
                    y1={100 - gapAnalysis.setAverageEnergy}
                    x2="100"
                    y2={100 - gapAnalysis.setAverageEnergy}
                    stroke="#94a3b8"
                    strokeWidth="0.8"
                    strokeDasharray="3,3"
                    strokeOpacity="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Gap Detection Threshold Reference */}
                  <line
                    x1="0"
                    y1={100 - gapAnalysis.thresholdEnergy}
                    x2="100"
                    y2={100 - gapAnalysis.thresholdEnergy}
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    strokeOpacity="0.85"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}

              {/* Sub-Bass curve */}
              <path
                d={subBassPathData}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="2,2"
                filter="url(#subBassGlowFilter)"
                vectorEffect="non-scaling-stroke"
              />
              {/* Overall Energy curve */}
              <path
                d={energyPathData}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2.4"
                filter="url(#energyGlowFilter)"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Reference Badges on the right edge */}
            {showEnergyGapOverlay && (
              <div className="absolute right-1.5 top-1.5 flex flex-col items-end gap-1 pointer-events-none text-[8px] font-mono z-10">
                <span className="text-slate-300 bg-black/75 px-1 py-0.5 rounded border border-white/10 shadow-sm backdrop-blur-xs">
                  Set-Ø: {gapAnalysis.setAverageEnergy}%
                </span>
                <span className="text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30 shadow-sm backdrop-blur-xs">
                  Schwelle: {gapAnalysis.thresholdEnergy}%
                </span>
              </div>
            )}

            {/* Peak Moments Markers on Energy Curve */}
            {currentSet.peakMoments.map((p) => {
              const xPct = (p.timestamp / duration) * 100;
              return (
                <div
                  key={p.id}
                  style={{ left: `${xPct}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-pink-500/90 pointer-events-none"
                  title={`Drop: ${p.label}`}
                >
                  <div className="w-2 h-2 rounded-full bg-pink-500 -ml-0.5 top-1 absolute shadow-sm" />
                </div>
              );
            })}

            {/* Interactive Energy-Gap Beacon Pins */}
            {showEnergyGapOverlay && gapAnalysis.gaps.map((gap) => {
              const leftPct = (gap.peakTroughTime / duration) * 100;
              const isCrit = gap.severity === 'critical';
              const isWarn = gap.severity === 'warning';
              const isSelected = selectedGapId === gap.id;

              return (
                <div
                  key={gap.id}
                  style={{ left: `${Math.min(95, Math.max(5, leftPct))}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGapId(gap.id);
                    onSeek(gap.startTime);
                  }}
                  className={`absolute bottom-1 -translate-x-1/2 cursor-pointer z-20 transition-all hover:scale-110 ${
                    isSelected ? 'scale-110 ring-2 ring-white rounded' : ''
                  }`}
                  title={`Energy-Gap: ${gap.severity.toUpperCase()} • Klick zum Vorhören @ ${formatTimeSeconds(gap.startTime)}`}
                >
                  <div className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono font-bold flex items-center gap-1 shadow-md border backdrop-blur-xs ${
                    isCrit
                      ? 'bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-rose-900/50 animate-pulse'
                      : isWarn
                      ? 'bg-amber-950/90 text-amber-200 border-amber-500/80'
                      : 'bg-yellow-950/90 text-yellow-200 border-yellow-500/70'
                  }`}>
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>-{gap.energyDeficit}% ({gap.duration}s)</span>
                  </div>
                </div>
              );
            })}

            {/* Playhead */}
            <div
              style={{ left: `${currentPct}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white]"
            />
          </div>
        </div>

        {/* Heatmap Spectrum Track (Continuous Energy Deficit Density) */}
        {showEnergyGapOverlay && (
          <div className="relative mb-2">
            <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400 mb-0.5">
              <span className="flex items-center gap-1 text-amber-400 font-bold uppercase">
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                ENERGY-GAP HEATMAP SPEKTRUM (DURCHGÄNGIGER FLOW-STATUS)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">
                  Flow-Score: {gapAnalysis.flowContinuityScore}/100
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  ({gapAnalysis.totalGapDuration}s Lulls = {gapAnalysis.gapPercentageOfSet}% des Sets)
                </span>
              </div>
            </div>

            <div className="h-3.5 w-full bg-black/80 border border-white/10 rounded overflow-hidden relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Background base (normal energy zone) */}
                <rect x="0" y="0" width="100" height="100" fill="#18181b" />
                {/* Gap heat zones */}
                {gapAnalysis.gaps.map((g) => {
                  const x1 = (g.startTime / duration) * 100;
                  const x2 = (g.endTime / duration) * 100;
                  const w = Math.max(0.6, x2 - x1);
                  const fillColor = g.severity === 'critical' ? '#ef4444' : g.severity === 'warning' ? '#f97316' : '#eab308';
                  return (
                    <rect
                      key={g.id}
                      x={x1}
                      y="0"
                      width={w}
                      height="100"
                      fill={fillColor}
                      fillOpacity={g.severity === 'critical' ? 0.95 : 0.75}
                    />
                  );
                })}
              </svg>
              {/* Playhead on Heatmap */}
              <div
                style={{ left: `${currentPct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_4px_white]"
              />
            </div>
          </div>
        )}

        {/* 3. Camelot Harmonic Progression Track */}
        <div>
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-purple-400 font-bold uppercase">
              <Disc className="w-3 h-3" /> CAMELOT-RAD & TONARTEN-PROGRESSION
            </span>
            <span>HARMONISCHE KOMPATIBILITÄT</span>
          </div>

          <div className="h-8 w-full bg-black/80 border border-white/5 rounded flex overflow-hidden relative">
            {currentSet.harmonyPoints.map((h, i, arr) => {
              const nextTime = arr[i + 1]?.time || duration;
              const segDuration = nextTime - h.time;
              const widthPct = (segDuration / duration) * 100;

              return (
                <div
                  key={i}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full border-r border-white/5 px-2 flex items-center justify-between font-mono text-[10px] font-bold ${
                    i % 2 === 0 ? 'bg-purple-950/40 text-purple-300' : 'bg-indigo-950/40 text-indigo-300'
                  } hover:bg-purple-900/50 transition-colors`}
                  title={`${h.keyNote} (${h.keyCamelot}) ab ${formatTimeSeconds(h.time)}`}
                >
                  <span className="truncate">{h.keyCamelot}</span>
                  <span className="text-[9px] text-slate-500 hidden sm:inline truncate">{h.keyNote}</span>
                </div>
              );
            })}

            {/* Playhead on Harmonies */}
            <div
              style={{ left: `${currentPct}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white]"
            />
          </div>
        </div>

        {/* 4. Auto-Tagged Set-Segmente Track */}
        <div className="mt-2">
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-emerald-400 font-bold uppercase">
              <Layers className="w-3 h-3" /> SET-SEGMENTE & PHASEN-DRAMATURGIE
            </span>
            <span>AUTO-TAGGED PHASEN</span>
          </div>

          <div className="h-7 w-full bg-black/80 border border-white/5 rounded flex overflow-hidden relative">
            {segments.map((seg) => {
              const segLen = seg.endTime - seg.startTime;
              const widthPct = (segLen / duration) * 100;
              const isCurrent = currentTime >= seg.startTime && currentTime <= seg.endTime;
              return (
                <div
                  key={seg.id}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: `${seg.color}25`,
                    borderLeft: `2px solid ${seg.color}`
                  }}
                  className={`h-full px-1.5 flex items-center justify-between font-mono text-[9px] font-bold transition-all border-r border-black/30 cursor-pointer ${
                    isCurrent ? 'bg-white/10 ring-1 ring-inset ring-white/30' : 'hover:bg-white/5'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(seg.startTime);
                  }}
                  title={`${seg.tag}: ${formatTimeSeconds(seg.startTime)} - ${formatTimeSeconds(seg.endTime)} • Ø ${seg.averageEnergy}% Energie`}
                >
                  <span className="truncate" style={{ color: seg.color }}>{seg.tag}</span>
                  <span className="text-[8px] text-slate-400 hidden sm:inline">{seg.averageEnergy}%</span>
                </div>
              );
            })}

            {/* Playhead on Segments */}
            <div
              style={{ left: `${currentPct}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white]"
            />
          </div>
        </div>

        {/* Crosshair & Tooltip during Hover */}
        {hoverData && (
          <>
            <div
              style={{ left: `${hoverData.xPct}%` }}
              className="absolute top-0 bottom-0 w-px bg-blue-400/80 pointer-events-none z-30"
            />
            <div
              style={{
                left: `${Math.min(78, Math.max(22, hoverData.xPct))}%`,
                top: '8px'
              }}
              className={`absolute -translate-x-1/2 bg-[#121214] p-2.5 rounded shadow-2xl z-40 pointer-events-none font-mono text-[10px] flex flex-col gap-1.5 whitespace-nowrap border ${
                hoverData.activeGap
                  ? hoverData.activeGap.severity === 'critical'
                    ? 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50'
                    : 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40'
                  : 'border-white/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-500">ZEIT: </span>
                  <span className="text-white font-bold">{formatTimeSeconds(hoverData.time)}</span>
                </div>
                <div>
                  <span className="text-slate-500">BPM: </span>
                  <span className="text-blue-400 font-bold">{hoverData.bpm}</span>
                </div>
                <div>
                  <span className="text-slate-500">KEY: </span>
                  <span className="text-purple-400 font-bold">{hoverData.key}</span>
                </div>
                <div>
                  <span className="text-slate-500">ENERGIE: </span>
                  <span className={`font-bold ${hoverData.activeGap ? 'text-rose-400' : 'text-pink-400'}`}>
                    {hoverData.energy}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">SUB: </span>
                  <span className="text-amber-400 font-bold">{hoverData.subBass}%</span>
                </div>
              </div>

              {hoverData.activeGap && (
                <div className={`pt-1.5 border-t ${
                  hoverData.activeGap.severity === 'critical' ? 'border-rose-500/30 text-rose-300' : 'border-amber-500/30 text-amber-300'
                } flex items-center justify-between gap-3 text-[9px]`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                    <span>
                      {hoverData.activeGap.severity === 'critical' ? 'KRITISCHER FLOW-KILLER' : 'ENERGY-GAP ZONE'}: -{hoverData.activeGap.energyDeficit}% UNTER SET-Ø
                    </span>
                  </div>
                  <span className="text-slate-400">
                    Dauer: {hoverData.activeGap.duration}s (Min: {hoverData.activeGap.minEnergy}%)
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Energy-Gap Diagnostic Inspector & Action Drawer */}
      {showEnergyGapOverlay && gapAnalysis.gaps.length > 0 && (
        <div className="bg-[#0e0e11] border border-amber-500/30 rounded p-3 flex flex-col gap-2.5">
          {/* Header with quick stats */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h4 className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span>ERKANNTE ENERGY-GAPS & FLOW-KILLER</span>
                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40 text-[9px]">
                  {gapAnalysis.gaps.length} {gapAnalysis.gaps.length === 1 ? 'ZONE' : 'ZONEN'}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] font-mono text-slate-300 flex items-center gap-3">
                <span>
                  Set-Ø: <strong className="text-slate-100">{gapAnalysis.setAverageEnergy}%</strong>
                </span>
                <span>
                  Schwelle: <strong className="text-amber-400">&lt;{gapAnalysis.thresholdEnergy}%</strong>
                </span>
                <span>
                  Flow-Kontinuität:{' '}
                  <strong
                    className={
                      gapAnalysis.flowContinuityScore >= 80
                        ? 'text-emerald-400'
                        : gapAnalysis.flowContinuityScore >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                  >
                    {gapAnalysis.flowContinuityScore}%
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsGapDrawerExpanded(!isGapDrawerExpanded)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                title={isGapDrawerExpanded ? 'Details einklappen' : 'Details ausklappen'}
              >
                {isGapDrawerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded Gap Cards */}
          {isGapDrawerExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 border-t border-white/5">
              {gapAnalysis.gaps.map((gap, idx) => {
                const colors = getGapSeverityColors(gap.severity);
                const isSelected = selectedGapId === gap.id;

                return (
                  <div
                    key={gap.id}
                    onClick={() => {
                      setSelectedGapId(gap.id);
                      onSeek(gap.startTime);
                    }}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-white/10 border-white/40 ring-1 ring-white/30'
                        : 'bg-black/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-white">
                          #{idx + 1} • {formatTimeSeconds(gap.startTime)} - {formatTimeSeconds(gap.endTime)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          ({gap.duration}s)
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${colors.badgeBg} ${colors.badgeText} ${colors.badgeBorder}`}>
                        {colors.title}
                      </span>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-1 bg-black/40 p-1.5 rounded text-[9px] font-mono border border-white/5">
                      <div>
                        <span className="text-slate-500 block">ENERGIE-DEF.</span>
                        <span className="text-rose-400 font-bold">-{gap.energyDeficit}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">MIN-WERT</span>
                        <span className="text-slate-200 font-bold">{gap.minEnergy}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">SUB-BASS</span>
                        <span className={gap.minSubBass < 30 ? 'text-amber-400 font-bold' : 'text-slate-300 font-bold'}>
                          {gap.minSubBass}%
                        </span>
                      </div>
                    </div>

                    {/* Crowd Flow Impact & Action Advice */}
                    <div className="text-[9.5px] text-slate-300 leading-relaxed flex flex-col gap-1">
                      <p className="text-slate-400 font-sans">
                        <strong className="text-slate-300 font-mono">Ursache: </strong>
                        {gap.crowdFlowImpact}
                      </p>
                      <p className="text-amber-300/90 font-sans bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                        <strong className="text-amber-200 font-mono">DJ-Tipp: </strong>
                        {gap.actionableTip}
                      </p>
                    </div>

                    {/* Action button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGapId(gap.id);
                          onSeek(gap.startTime);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-mono text-[9px] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                        <span>Zu Gap-Start springen</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Insight Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 bg-white/[0.02] p-2 rounded border border-white/5">
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3 text-slate-500" />
          <span>Klicke auf den Graph für schnellen Seek.</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Tempo-Stabilität: <strong className="text-blue-400">99.2%</strong></span>
          <span>Harmonie-Kohärenz: <strong className="text-purple-400">Sehr hoch</strong></span>
        </div>
      </div>
    </div>
  );
};
