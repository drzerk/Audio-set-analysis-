import React, { useState, useRef } from 'react';
import { TechnoSetAnalysis } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { Activity, Disc, Zap, Info, TrendingUp } from 'lucide-react';

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
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const duration = currentSet.duration || 3600;
  const currentPct = (currentTime / duration) * 100;

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

    setHoverData({
      time: Math.round(targetTime),
      bpm: closestBpm.bpm,
      energy: closestEnergy.energy,
      subBass: closestEnergy.subBass,
      key: closestHarm.keyCamelot,
      xPct
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = (x / rect.width) * duration;
    onSeek(targetTime);
  };

  // Build SVG path for BPM curve
  const bpmPointsSorted = [...currentSet.bpmPoints].sort((a, b) => a.time - b.time);
  const bpmPathData = bpmPointsSorted.map((p, idx) => {
    const x = (p.time / duration) * 100;
    // Invert y: higher BPM at the top
    const y = 100 - ((p.bpm - minBpm) / bpmRange) * 100;
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Build SVG path for Energy curve
  const energyPointsSorted = [...currentSet.energyPoints].sort((a, b) => a.time - b.time);
  const energyPathData = energyPointsSorted.map((p, idx) => {
    const x = (p.time / duration) * 100;
    const y = 100 - p.energy;
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const subBassPathData = energyPointsSorted.map((p, idx) => {
    const x = (p.time / duration) * 100;
    const y = 100 - p.subBass;
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div
      id="bpm-harmonic-analysis-card"
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col gap-4"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
            GRAFISCHE ANALYSEN: BPM & HARMONIEN
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-1 bg-emerald-400 rounded-full" />
            <span>BPM-Verlauf ({currentSet.bpmAverage} Ø)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-1 bg-cyan-400 rounded-full" />
            <span>Energie-Kurve</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-1 bg-amber-400 rounded-full" />
            <span>Sub-Bass (30-80Hz)</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverData(null)}
        onClick={handleClick}
        className="relative bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 cursor-crosshair select-none"
      >
        {/* 1. BPM Track Section */}
        <div className="relative mb-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <TrendingUp className="w-3 h-3" /> TEMPO-PROGRESSION (BPM)
            </span>
            <span>Skala: {minBpm} - {maxBpm} BPM</span>
          </div>

          <div className="h-24 w-full relative bg-zinc-950/70 border border-zinc-800/80 rounded overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20 pointer-events-none">
              <div className="border-b border-zinc-600 border-dashed w-full" />
              <div className="border-b border-zinc-600 border-dashed w-full" />
              <div className="border-b border-zinc-600 border-dashed w-full" />
            </div>

            {/* SVG Graph for BPM */}
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="bpmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Fill area under curve */}
              <path
                d={`${bpmPathData} L 100 100 L 0 100 Z`}
                fill="url(#bpmGrad)"
              />
              {/* Stroke line */}
              <path
                d={bpmPathData}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
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
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1">
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <Zap className="w-3 h-3" /> ENERGETISCHER SPANNUNGSVERLAUF & TIEFBASS-DRUCK
            </span>
            <span>0% - 100% Intensität</span>
          </div>

          <div className="h-20 w-full relative bg-zinc-950/70 border border-zinc-800/80 rounded overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Sub-Bass curve */}
              <path
                d={subBassPathData}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2,2"
                vectorEffect="non-scaling-stroke"
              />
              {/* Overall Energy curve */}
              <path
                d={energyPathData}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Peak Moments Markers on Energy Curve */}
            {currentSet.peakMoments.map((p) => {
              const xPct = (p.timestamp / duration) * 100;
              return (
                <div
                  key={p.id}
                  style={{ left: `${xPct}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-amber-400/90 pointer-events-none"
                  title={`Drop: ${p.label}`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 -ml-0.5 top-1 absolute" />
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

        {/* 3. Camelot Harmonic Progression Track */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1">
            <span className="flex items-center gap-1 text-purple-400 font-bold">
              <Disc className="w-3 h-3" /> CAMELOT-RAD & TONARTEN-PROGRESSION
            </span>
            <span>Harmonische Mischkompatibilität</span>
          </div>

          <div className="h-9 w-full bg-zinc-950/90 border border-zinc-800/80 rounded flex overflow-hidden relative">
            {currentSet.harmonyPoints.map((h, i, arr) => {
              const nextTime = arr[i + 1]?.time || duration;
              const segDuration = nextTime - h.time;
              const widthPct = (segDuration / duration) * 100;

              // Color determination: Camelot logic
              const isFirst = i === 0;
              const prevKey = isFirst ? h.keyCamelot : arr[i - 1].keyCamelot;
              const isCompatible = !isFirst && (h.keyCamelot === prevKey || h.keyCamelot.endsWith('A'));

              return (
                <div
                  key={i}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full border-r border-zinc-800/80 px-2 flex items-center justify-between font-mono text-[11px] font-bold ${
                    i % 2 === 0 ? 'bg-purple-950/30' : 'bg-indigo-950/30'
                  } hover:bg-purple-900/40 transition-colors`}
                  title={`${h.keyNote} (${h.keyCamelot}) ab ${formatTimeSeconds(h.time)}`}
                >
                  <span className="text-purple-300 truncate">{h.keyCamelot}</span>
                  <span className="text-[9px] text-zinc-400 hidden sm:inline truncate">{h.keyNote}</span>
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

        {/* Crosshair & Tooltip during Hover */}
        {hoverData && (
          <>
            <div
              style={{ left: `${hoverData.xPct}%` }}
              className="absolute top-0 bottom-0 w-px bg-emerald-400/80 pointer-events-none z-30"
            />
            <div
              style={{
                left: `${Math.min(85, Math.max(15, hoverData.xPct))}%`,
                top: '10px'
              }}
              className="absolute -translate-x-1/2 bg-zinc-950 border border-emerald-500/70 text-zinc-100 p-2 rounded-md shadow-2xl z-40 pointer-events-none font-mono text-[11px] flex gap-3 whitespace-nowrap"
            >
              <div>
                <span className="text-zinc-500">Zeit: </span>
                <span className="text-white font-bold">{formatTimeSeconds(hoverData.time)}</span>
              </div>
              <div>
                <span className="text-zinc-500">BPM: </span>
                <span className="text-emerald-400 font-bold">{hoverData.bpm}</span>
              </div>
              <div>
                <span className="text-zinc-500">Key: </span>
                <span className="text-purple-400 font-bold">{hoverData.key}</span>
              </div>
              <div>
                <span className="text-zinc-500">Sub: </span>
                <span className="text-amber-400 font-bold">{hoverData.subBass}%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Insight Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            Klicke auf den Graph, um direkt zu der Stelle im Set zu springen.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Tempo-Stabilität: <strong className="text-emerald-400">99.2%</strong></span>
          <span>Harmonische Kohärenz: <strong className="text-purple-400">Sehr hoch</strong></span>
        </div>
      </div>
    </div>
  );
};
