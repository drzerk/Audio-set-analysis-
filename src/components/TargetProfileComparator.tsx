import React, { useState, useMemo, useRef } from 'react';
import {
  Activity,
  Sliders,
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Info,
  Maximize2,
  ShieldCheck,
  Zap,
  Flame,
  Clock
} from 'lucide-react';
import {
  TechnoSetAnalysis,
  TargetEnergyProfile,
  TargetProfileMilestone,
  ProfileComparisonFeedback,
  ProfileComparisonZone
} from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import {
  DEFAULT_TARGET_PROFILES,
  interpolateTargetEnergy,
  compareSetAgainstProfile
} from '../utils/targetProfileComparator';

interface TargetProfileComparatorProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek: (time: number) => void;
}

export const TargetProfileComparator: React.FC<TargetProfileComparatorProps> = ({
  currentSet,
  currentTime,
  onSeek
}) => {
  const [profiles, setProfiles] = useState<TargetEnergyProfile[]>(DEFAULT_TARGET_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('profile-rising-intensity');
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  const [customMilestones, setCustomMilestones] = useState<TargetProfileMilestone[]>([
    { percentTime: 0, targetEnergy: 45 },
    { percentTime: 25, targetEnergy: 60 },
    { percentTime: 50, targetEnergy: 75 },
    { percentTime: 75, targetEnergy: 92 },
    { percentTime: 100, targetEnergy: 65 }
  ]);
  const [hoverData, setHoverData] = useState<{
    timeSec: number;
    pct: number;
    actualEnergy: number;
    targetEnergy: number;
    delta: number;
    xPct: number;
  } | null>(null);

  const duration = currentSet.duration || 3600;
  const currentPct = (currentTime / duration) * 100;

  // Selected Profile
  const activeProfile = useMemo(() => {
    if (selectedProfileId === 'custom-user-profile') {
      return {
        id: 'custom-user-profile',
        name: 'Benutzerdefiniertes Zielprofil',
        category: 'Custom' as const,
        description: 'Individuell justiertes Energie-Sollprofil mit maßgeschneiderten Meilensteinen für dein persönliches Set.',
        tolerance: 10,
        color: '#06b6d4',
        milestones: customMilestones,
        isCustom: true
      };
    }
    return profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  }, [profiles, selectedProfileId, customMilestones]);

  // Compute Performance Comparison
  const comparison: ProfileComparisonFeedback = useMemo(() => {
    return compareSetAgainstProfile(currentSet, activeProfile);
  }, [currentSet, activeProfile]);

  // SVG Chart Dimensions
  const chartRef = useRef<HTMLDivElement>(null);
  const chartHeight = 160;
  const chartWidth = 800; // viewBox units

  // Generate Path for Target Profile Curve
  const targetPointsCoords = useMemo(() => {
    const points: { x: number; y: number; pct: number; energy: number }[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const pct = (i / steps) * 100;
      const energy = interpolateTargetEnergy(activeProfile.milestones, pct);
      const x = (pct / 100) * chartWidth;
      const y = chartHeight - (energy / 100) * chartHeight;
      points.push({ x, y, pct, energy });
    }
    return points;
  }, [activeProfile, chartWidth, chartHeight]);

  const targetPathD = useMemo(() => {
    return targetPointsCoords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  }, [targetPointsCoords]);

  // Target tolerance corridor (upper & lower band)
  const targetCorridorPathD = useMemo(() => {
    const upper: string[] = [];
    const lower: string[] = [];
    const tol = activeProfile.tolerance || 10;
    targetPointsCoords.forEach((pt) => {
      const uY = chartHeight - (Math.min(100, pt.energy + tol) / 100) * chartHeight;
      const lY = chartHeight - (Math.max(0, pt.energy - tol) / 100) * chartHeight;
      upper.push(`${pt.x},${uY}`);
      lower.unshift(`${pt.x},${lY}`);
    });
    return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
  }, [targetPointsCoords, activeProfile.tolerance, chartHeight]);

  // Generate Path for Actual Set Energy Curve
  const actualPointsCoords = useMemo(() => {
    const rawPts = currentSet.energyPoints || [];
    if (rawPts.length === 0) return [];
    return rawPts.map((p) => {
      const x = (p.time / duration) * chartWidth;
      const y = chartHeight - (p.energy / 100) * chartHeight;
      return { x, y, time: p.time, energy: p.energy };
    });
  }, [currentSet.energyPoints, duration, chartWidth, chartHeight]);

  const actualPathD = useMemo(() => {
    if (actualPointsCoords.length === 0) return '';
    return actualPointsCoords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  }, [actualPointsCoords]);

  const actualAreaD = useMemo(() => {
    if (actualPointsCoords.length === 0) return '';
    const line = actualPathD;
    const last = actualPointsCoords[actualPointsCoords.length - 1];
    return `${line} L ${last.x},${chartHeight} L 0,${chartHeight} Z`;
  }, [actualPathD, actualPointsCoords, chartHeight]);

  // Handle Chart Click for seeking
  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = clickRatio * duration;
    onSeek(targetSec);
  };

  // Handle Hover for Tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const boundedPct = Math.max(0, Math.min(1, xPct));
    const timeSec = boundedPct * duration;
    const pct = boundedPct * 100;

    const targetVal = interpolateTargetEnergy(activeProfile.milestones, pct);
    let actualVal = 50;
    const pts = currentSet.energyPoints || [];
    if (pts.length > 0) {
      const pt = pts.reduce((prev, curr) =>
        Math.abs(curr.time - timeSec) < Math.abs(prev.time - timeSec) ? curr : prev
      );
      actualVal = pt.energy;
    }

    setHoverData({
      timeSec,
      pct,
      actualEnergy: actualVal,
      targetEnergy: targetVal,
      delta: actualVal - targetVal,
      xPct: boundedPct * 100
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Handle Custom Milestone Drag / Slider
  const handleMilestoneChange = (idx: number, newEnergy: number) => {
    const updated = [...customMilestones];
    updated[idx] = { ...updated[idx], targetEnergy: Math.max(0, Math.min(100, newEnergy)) };
    setCustomMilestones(updated);
  };

  // Status color helper for zones
  const getZoneStatusBadge = (status: ProfileComparisonZone['status'], dev: number) => {
    switch (status) {
      case 'optimal':
        return {
          label: 'OPTIMALER FLOW',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400'
        };
      case 'slight-over':
        return {
          label: `LEICHT ZU HOCH (+${dev}%)`,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400'
        };
      case 'critical-over':
        return {
          label: `ZU AGGRESSIV (+${dev}%)`,
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400'
        };
      case 'slight-under':
        return {
          label: `LEICHTER SAG (${dev}%)`,
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400'
        };
      case 'critical-under':
        return {
          label: `ENERGIE-LOCH (${dev}%)`,
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400'
        };
    }
  };

  return (
    <div
      id="target-profile-comparator"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-3.5"
    >
      {/* Top Header: Title & Profile Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            ZIEL-ENERGIEPROFIL & PERFORMANCE-FEEDBACK
          </h3>
          <span className="text-slate-600 font-mono text-xs">•</span>
          <span className="text-[10px] font-mono text-slate-400">
            Dramaturgie-Benchmarking & Soll/Ist-Vergleich
          </span>
        </div>

        {/* Profile Preset Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {profiles.map((p) => {
            const isSelected = selectedProfileId === p.id;
            return (
              <button
                key={p.id}
                id={`btn-profile-${p.id}`}
                onClick={() => {
                  setSelectedProfileId(p.id);
                  setIsEditingCustom(false);
                }}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? 'font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-white/20'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isSelected ? `${p.color}20` : undefined,
                  borderColor: isSelected ? `${p.color}60` : undefined,
                  color: isSelected ? p.color : undefined
                }}
                title={p.description}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}</span>
              </button>
            );
          })}

          {/* Custom Profile Option */}
          <button
            id="btn-profile-custom"
            onClick={() => {
              setSelectedProfileId('custom-user-profile');
              setIsEditingCustom(true);
            }}
            className={`flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded border transition-all cursor-pointer ${
              selectedProfileId === 'custom-user-profile'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold ring-1 ring-white/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Eigenes Kurvenprofil mit frei konfigurierbaren Meilensteinen erstellen"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Custom Profil</span>
          </button>
        </div>
      </div>

      {/* Active Profile Description & Target Tolerance Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.02] border border-white/5 p-2.5 rounded">
        <div className="flex items-center gap-2 max-w-2xl">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: activeProfile.color }}
          />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-white">
              Zielprofil: {activeProfile.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400 leading-relaxed">
              {activeProfile.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-slate-300">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Toleranzband:</span>
            <span className="font-bold text-white">±{activeProfile.tolerance}%</span>
          </div>
          {selectedProfileId === 'custom-user-profile' && (
            <button
              onClick={() => setIsEditingCustom(!isEditingCustom)}
              className="text-[9px] font-mono px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-pointer"
            >
              {isEditingCustom ? 'Schieberegler minimieren' : 'Meilensteine bearbeiten'}
            </button>
          )}
        </div>
      </div>

      {/* Custom Profile Milestone Sliders (shown if custom profile selected and editing) */}
      {selectedProfileId === 'custom-user-profile' && isEditingCustom && (
        <div className="p-3 bg-black/40 border border-cyan-500/30 rounded flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400 font-bold uppercase">
            <span>Interaktive Meilensteine (0% bis 100% Set-Dauer)</span>
            <span className="text-slate-400 text-[9px]">Justiere die Zielenergie für die Set-Phasen</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {customMilestones.map((m, idx) => (
              <div key={idx} className="flex flex-col gap-1 bg-white/[0.02] border border-white/5 p-2 rounded">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400">Position {m.percentTime}%:</span>
                  <span className="font-bold text-cyan-300">{m.targetEnergy}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={m.targetEnergy}
                  onChange={(e) => handleMilestoneChange(idx, parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-1 bg-white/10 rounded"
                />
                <div className="text-[8px] font-mono text-slate-500 truncate">
                  {formatTimeSeconds(Math.round((m.percentTime / 100) * duration))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Hero & Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Score Card (Left 4 cols) */}
        <div className="md:col-span-4 bg-gradient-to-br from-white/[0.04] to-black/60 border border-white/10 p-3 sm:p-4 rounded flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              PROFIL-ALIGNMENT SCORE
            </span>
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
                comparison.grade === 'S+'
                  ? 'bg-pink-500/20 border-pink-400 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                  : comparison.grade === 'A'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : comparison.grade === 'B'
                  ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                  : 'bg-amber-500/20 border-amber-400 text-amber-300'
              }`}
            >
              Rang {comparison.grade}
            </div>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white">
              {comparison.overallScore}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              Übereinstimmung
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="w-full bg-black/60 h-2 rounded overflow-hidden border border-white/10">
            <div
              className="h-full transition-all duration-500 rounded"
              style={{
                width: `${comparison.overallScore}%`,
                backgroundColor: activeProfile.color
              }}
            />
          </div>

          <p className="text-[10px] font-mono text-slate-300 leading-relaxed border-t border-white/5 pt-2">
            {comparison.headline}
          </p>
        </div>

        {/* Telemetry Metrics & Verdict (Right 8 cols) */}
        <div className="md:col-span-8 bg-white/[0.02] border border-white/5 p-3 sm:p-4 rounded flex flex-col justify-between gap-2.5">
          {/* Top 3 Quick Diagnostic Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-black/40 border border-white/5 p-2 rounded flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase">PACING-KORRELATION</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-mono font-bold ${comparison.pacingCorrelation > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {comparison.pacingCorrelation > 0 ? '+' : ''}{comparison.pacingCorrelation}
                </span>
                <span className="text-[8px] font-mono text-slate-500">(-1 bis +1)</span>
              </div>
              <span className="text-[8px] font-mono text-slate-400">
                {comparison.pacingCorrelation > 0.75 ? 'Hochsynchroner Spannungsanstieg' : 'Leicht asynchrones Pacing'}
              </span>
            </div>

            <div className="bg-black/40 border border-white/5 p-2 rounded flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase">DURCHSCHN. ABWEICHUNG</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-mono font-bold text-cyan-300">
                  ±{comparison.avgDeviation}%
                </span>
                <span className="text-[8px] font-mono text-slate-500">vom Soll</span>
              </div>
              <span className="text-[8px] font-mono text-slate-400">
                {comparison.avgDeviation <= activeProfile.tolerance ? 'Innerhalb der Toleranz' : 'Außerhalb Toleranzgrenze'}
              </span>
            </div>

            <div className="bg-black/40 border border-white/5 p-2 rounded flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase">MAX. DIVERGENZ</span>
                <button
                  onClick={() => onSeek(comparison.maxDeviation.timestamp)}
                  className="text-[8px] font-mono text-pink-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Zur Stelle mit der größten Abweichung springen"
                >
                  <Play className="w-2 h-2 fill-current" />
                  <span>{formatTimeSeconds(comparison.maxDeviation.timestamp)}</span>
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-mono font-bold ${comparison.maxDeviation.delta > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                  {comparison.maxDeviation.delta > 0 ? '+' : ''}{comparison.maxDeviation.delta}%
                </span>
                <span className="text-[8px] font-mono text-slate-500">
                  bei {formatTimeSeconds(comparison.maxDeviation.timestamp)}
                </span>
              </div>
              <span className="text-[8px] font-mono text-slate-400 truncate">
                {comparison.maxDeviation.description}
              </span>
            </div>
          </div>

          {/* Diagnostic Summary Paragraph */}
          <div className="border-t border-white/5 pt-2">
            <p className="text-[10px] font-mono text-slate-300 leading-relaxed">
              {comparison.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Superimposed Dual-Curve Chart Visualizer */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-pink-500" />
              <span className="text-white font-bold">IST-ENERGIE (DEIN SET)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-b-2 border-dashed" style={{ borderColor: activeProfile.color }} />
              <span style={{ color: activeProfile.color }} className="font-bold">
                SOLL-PROFIL ({activeProfile.name})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 bg-white/10 border border-white/20 rounded" />
              <span className="text-slate-400">TOLERANZ-KORRIDOR (±{activeProfile.tolerance}%)</span>
            </div>
          </div>

          <span className="text-slate-500 hidden sm:inline">
            Klicke in den Graphen, um die Abspielposition anzusteuern
          </span>
        </div>

        {/* Interactive SVG Stage Container */}
        <div
          ref={chartRef}
          onClick={handleChartClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="h-44 sm:h-52 w-full bg-black/80 border border-white/10 rounded relative overflow-hidden cursor-crosshair select-none"
        >
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full block"
          >
            <defs>
              {/* Gradient for Actual Set Energy Area */}
              <linearGradient id="actualEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#ec4899" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
              </linearGradient>

              {/* Gradient for Target Profile Corridor */}
              <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeProfile.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={activeProfile.color} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines at 25%, 50%, 75% */}
            {[25, 50, 75].map((level) => {
              const y = chartHeight - (level / 100) * chartHeight;
              return (
                <line
                  key={level}
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Vertical Quarter Grid Dividers */}
            {[25, 50, 75].map((pct) => {
              const x = (pct / 100) * chartWidth;
              return (
                <line
                  key={pct}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2={chartHeight}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Target Profile Tolerance Corridor */}
            {targetCorridorPathD && (
              <path
                d={targetCorridorPathD}
                fill="url(#corridorGrad)"
                stroke={activeProfile.color}
                strokeWidth="0.5"
                strokeOpacity="0.25"
              />
            )}

            {/* Actual Energy Area Fill */}
            {actualAreaD && (
              <path d={actualAreaD} fill="url(#actualEnergyGrad)" />
            )}

            {/* Actual Energy Outline Stroke */}
            {actualPathD && (
              <path
                d={actualPathD}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Target Profile Dashed Center Curve */}
            {targetPathD && (
              <path
                d={targetPathD}
                fill="none"
                stroke={activeProfile.color}
                strokeWidth="2.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Milestone Anchor Nodes on Target Curve */}
            {activeProfile.milestones.map((m, i) => {
              const cx = (m.percentTime / 100) * chartWidth;
              const cy = chartHeight - (m.targetEnergy / 100) * chartHeight;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#000"
                  stroke={activeProfile.color}
                  strokeWidth="2"
                />
              );
            })}

            {/* Maximum Divergence Marker */}
            {comparison.maxDeviation.timestamp > 0 && (
              <g>
                <line
                  x1={(comparison.maxDeviation.timestamp / duration) * chartWidth}
                  y1="0"
                  x2={(comparison.maxDeviation.timestamp / duration) * chartWidth}
                  y2={chartHeight}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
              </g>
            )}

            {/* Live Playhead Line */}
            <line
              x1={(currentPct / 100) * chartWidth}
              y1="0"
              x2={(currentPct / 100) * chartWidth}
              y2={chartHeight}
              stroke="#ffffff"
              strokeWidth="2"
              className="drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
            />
          </svg>

          {/* Hover Overlay Crosshair & Floating Tooltip */}
          {hoverData && (
            <>
              <div
                style={{ left: `${hoverData.xPct}%` }}
                className="absolute top-0 bottom-0 w-px bg-cyan-400 pointer-events-none shadow-[0_0_8px_cyan]"
              />
              <div
                style={{
                  left: `${Math.min(84, Math.max(16, hoverData.xPct))}%`,
                  top: '12px'
                }}
                className="absolute -translate-x-1/2 bg-[#18181b]/95 border border-white/20 p-2 rounded shadow-2xl backdrop-blur-md text-[9px] font-mono pointer-events-none z-30 flex flex-col gap-1 min-w-[150px]"
              >
                <div className="flex justify-between items-center text-white font-bold border-b border-white/10 pb-1">
                  <span>ZEITPUNKT: {formatTimeSeconds(hoverData.timeSec)}</span>
                  <span className="text-slate-400">({Math.round(hoverData.pct)}%)</span>
                </div>
                <div className="flex justify-between items-center text-pink-400">
                  <span>Ist-Energie:</span>
                  <span className="font-bold">{hoverData.actualEnergy}%</span>
                </div>
                <div className="flex justify-between items-center" style={{ color: activeProfile.color }}>
                  <span>Soll-Profil:</span>
                  <span className="font-bold">{hoverData.targetEnergy}%</span>
                </div>
                <div className="flex justify-between items-center pt-0.5 border-t border-white/10">
                  <span className="text-slate-400">Delta:</span>
                  <span className={`font-bold ${hoverData.delta >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                    {hoverData.delta >= 0 ? '+' : ''}{hoverData.delta}%
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Quarter Indicators on bottom */}
          <div className="absolute bottom-1 left-2 text-[8px] font-mono text-slate-500 pointer-events-none">
            0% (Intro)
          </div>
          <div className="absolute bottom-1 left-1/4 text-[8px] font-mono text-slate-500 pointer-events-none -translate-x-1/2">
            25% (Phase 1)
          </div>
          <div className="absolute bottom-1 left-2/4 text-[8px] font-mono text-slate-500 pointer-events-none -translate-x-1/2">
            50% (Midway)
          </div>
          <div className="absolute bottom-1 left-3/4 text-[8px] font-mono text-slate-500 pointer-events-none -translate-x-1/2">
            75% (Peak Zone)
          </div>
          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-500 pointer-events-none">
            100% (Outro)
          </div>
        </div>
      </div>

      {/* 4-Quarter Detailed Zone Breakdown Cards */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            PHASEN-VERGLEICH (4 QUARTALE)
          </span>
          <span className="text-[9px] text-slate-500">
            Soll- vs. Ist-Auswertung nach dramaturgischen Abschnitten
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {comparison.zoneBreakdown.map((zone, idx) => {
            const badge = getZoneStatusBadge(zone.status, zone.deviation);
            const isPlayingInZone = currentTime >= zone.startSec && currentTime <= zone.endSec;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded border transition-all flex flex-col justify-between gap-2 ${
                  isPlayingInZone
                    ? 'bg-white/[0.04] border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.04)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-white truncate">
                      {zone.zoneName}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {zone.timeRangeFormatted}
                    </span>
                  </div>

                  <button
                    onClick={() => onSeek(zone.startSec)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                    title={`Springe zu ${zone.timeRangeFormatted}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
                </div>

                {/* Status Pill */}
                <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wider ${badge.bg} ${badge.border} ${badge.text}`}>
                  {badge.label}
                </div>

                {/* Comparison Bar: Target vs Actual */}
                <div className="flex flex-col gap-1.5 bg-black/40 p-1.5 rounded border border-white/5 text-[9px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Soll-Pegel:</span>
                    <span className="font-bold" style={{ color: activeProfile.color }}>
                      {zone.targetAvg}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded overflow-hidden">
                    <div
                      style={{ width: `${zone.targetAvg}%`, backgroundColor: activeProfile.color }}
                      className="h-full rounded"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-400">Ist-Pegel:</span>
                    <span className="font-bold text-pink-400">{zone.actualAvg}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded overflow-hidden">
                    <div
                      style={{ width: `${zone.actualAvg}%` }}
                      className="h-full rounded bg-pink-500"
                    />
                  </div>
                </div>

                {/* Feedback Text */}
                <p className="text-[9px] font-mono text-slate-400 line-clamp-3 leading-relaxed">
                  {zone.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable DJ Coaching & Recommendations */}
      <div className="bg-gradient-to-r from-cyan-950/20 via-black/40 to-pink-950/20 border border-cyan-500/20 p-3 sm:p-3.5 rounded flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <h4 className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
            ACTIONABLE DJ COACHING & DRAMATURGIE-EMPFEHLUNGEN
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {comparison.djTips.map((tip, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-black/40 border border-white/5 p-2 rounded text-[10px] font-mono text-slate-300 leading-relaxed"
            >
              <span className="text-cyan-400 font-bold shrink-0">#{idx + 1}</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
