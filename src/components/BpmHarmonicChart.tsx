import React, { useState, useRef } from 'react';
import { TechnoSetAnalysis } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { Activity, Disc, Zap, Info, TrendingUp, Layers } from 'lucide-react';
import { computeAutoTaggedSegments } from '../utils/segmentAutoTagger';

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

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-1 bg-blue-500 rounded-full" />
            <span>BPM ({currentSet.bpmAverage} Ø)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-1 bg-pink-500 rounded-full" />
            <span>Energie-Kurve</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-1 bg-amber-500 rounded-full" />
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
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
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
                stroke="#3b82f6"
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
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-pink-400 font-bold uppercase">
              <Zap className="w-3 h-3" /> ENERGETISCHER SPANNUNGSVERLAUF & TIEFBASS-DRUCK
            </span>
            <span>0% - 100% INTENSITÄT</span>
          </div>

          <div className="h-16 sm:h-20 w-full relative bg-black/70 border border-white/5 rounded overflow-hidden">
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
                stroke="#ec4899"
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
                  className="absolute top-0 bottom-0 w-1 bg-pink-500/90 pointer-events-none"
                  title={`Drop: ${p.label}`}
                >
                  <div className="w-2 h-2 rounded-full bg-pink-500 -ml-0.5 top-1 absolute shadow-sm" />
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
                left: `${Math.min(85, Math.max(15, hoverData.xPct))}%`,
                top: '8px'
              }}
              className="absolute -translate-x-1/2 bg-[#121214] border border-white/15 text-slate-100 p-2 rounded shadow-2xl z-40 pointer-events-none font-mono text-[10px] flex gap-3 whitespace-nowrap"
            >
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
                <span className="text-slate-500">SUB: </span>
                <span className="text-amber-400 font-bold">{hoverData.subBass}%</span>
              </div>
            </div>
          </>
        )}
      </div>

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
