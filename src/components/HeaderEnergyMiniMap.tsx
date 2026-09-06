import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Flame,
  Zap,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Activity,
  Sliders,
  Maximize2
} from 'lucide-react';
import { TechnoSetAnalysis, PeakMoment, SetSegment } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';

interface HeaderEnergyMiniMapProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek?: (time: number) => void;
}

interface EnergySlice {
  index: number;
  time: number;
  timeFormatted: string;
  energy: number;
  subBass: number;
  midHigh: number;
  tension: number;
  intensityLevel: 'high' | 'mid' | 'low';
  segmentName: string;
  isPeakMoment: boolean;
  peakLabel?: string;
  isBreakdown: boolean;
}

export const HeaderEnergyMiniMap: React.FC<HeaderEnergyMiniMapProps> = ({
  currentSet,
  currentTime,
  onSeek
}) => {
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; percent: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filterHighlight, setFilterHighlight] = useState<'all' | 'high' | 'low'>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const duration = Math.max(1, currentSet.duration || 3600);
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  // 1. Calculate 120 high-density energy slices across the entire set
  const SLICE_COUNT = 120;
  const energySlices = useMemo<EnergySlice[]>(() => {
    const rawPoints = currentSet.energyPoints && currentSet.energyPoints.length > 0
      ? [...currentSet.energyPoints].sort((a, b) => a.time - b.time)
      : [
          { time: 0, energy: 60, subBass: 60, midHigh: 50, tension: 50 },
          { time: duration, energy: 60, subBass: 60, midHigh: 50, tension: 50 }
        ];

    const getInterpolatedPoint = (t: number) => {
      if (t <= rawPoints[0].time) return rawPoints[0];
      if (t >= rawPoints[rawPoints.length - 1].time) return rawPoints[rawPoints.length - 1];

      for (let i = 0; i < rawPoints.length - 1; i++) {
        const p1 = rawPoints[i];
        const p2 = rawPoints[i + 1];
        if (t >= p1.time && t <= p2.time) {
          const delta = p2.time - p1.time;
          const ratio = delta === 0 ? 0 : (t - p1.time) / delta;
          return {
            time: t,
            energy: Math.round(p1.energy + ratio * (p2.energy - p1.energy)),
            subBass: Math.round(p1.subBass + ratio * (p2.subBass - p1.subBass)),
            midHigh: Math.round(p1.midHigh + ratio * (p2.midHigh - p1.midHigh)),
            tension: Math.round(p1.tension + ratio * (p2.tension - p1.tension))
          };
        }
      }
      return rawPoints[rawPoints.length - 1];
    };

    const slices: EnergySlice[] = [];
    for (let i = 0; i < SLICE_COUNT; i++) {
      const sliceTime = (i / (SLICE_COUNT - 1)) * duration;
      const interp = getInterpolatedPoint(sliceTime);

      // Check if slice coincides with any peak moment (+- 15 sec window)
      const nearbyPeak = currentSet.peakMoments?.find(
        (p) => Math.abs(p.timestamp - sliceTime) <= duration / (SLICE_COUNT * 1.5)
      );

      // Check active segment
      const activeSeg = currentSet.segments?.find(
        (s) => sliceTime >= s.startTime && sliceTime <= s.endTime
      );

      const intensity: 'high' | 'mid' | 'low' =
        interp.energy >= 75 ? 'high' : interp.energy < 50 ? 'low' : 'mid';

      slices.push({
        index: i,
        time: sliceTime,
        timeFormatted: formatTimeSeconds(sliceTime),
        energy: interp.energy,
        subBass: interp.subBass,
        midHigh: interp.midHigh,
        tension: interp.tension,
        intensityLevel: intensity,
        segmentName: activeSeg?.tag || (intensity === 'high' ? 'Peak Section' : intensity === 'low' ? 'Breakdown' : 'Groove'),
        isPeakMoment: Boolean(nearbyPeak),
        peakLabel: nearbyPeak?.label,
        isBreakdown: interp.energy < 50
      });
    }
    return slices;
  }, [currentSet.energyPoints, currentSet.peakMoments, currentSet.segments, duration]);

  // 2. Compute aggregate set energy metrics
  const setMetrics = useMemo(() => {
    if (energySlices.length === 0) {
      return {
        averageEnergy: 60,
        highEnergyPercent: 0,
        lowEnergyPercent: 0,
        maxEnergy: 100,
        minEnergy: 40,
        currentSliceEnergy: 60,
        currentIntensity: 'mid' as const
      };
    }

    const totalEnergy = energySlices.reduce((sum, s) => sum + s.energy, 0);
    const averageEnergy = Math.round(totalEnergy / energySlices.length);

    const highCount = energySlices.filter((s) => s.intensityLevel === 'high').length;
    const lowCount = energySlices.filter((s) => s.intensityLevel === 'low').length;

    const highEnergyPercent = Math.round((highCount / energySlices.length) * 100);
    const lowEnergyPercent = Math.round((lowCount / energySlices.length) * 100);

    const maxEnergy = Math.max(...energySlices.map((s) => s.energy));
    const minEnergy = Math.min(...energySlices.map((s) => s.energy));

    // Current playhead slice
    const currentIndex = Math.min(
      energySlices.length - 1,
      Math.max(0, Math.floor((currentTime / duration) * energySlices.length))
    );
    const currentSlice = energySlices[currentIndex];

    return {
      averageEnergy,
      highEnergyPercent,
      lowEnergyPercent,
      maxEnergy,
      minEnergy,
      currentSliceEnergy: currentSlice ? currentSlice.energy : averageEnergy,
      currentIntensity: currentSlice ? currentSlice.intensityLevel : 'mid'
    };
  }, [energySlices, currentTime, duration]);

  // 3. Find adjacent high intensity drops and low-energy breakdowns for quick navigation
  const nextPeakDrop = useMemo(() => {
    return currentSet.peakMoments?.find((p) => p.timestamp > currentTime + 2);
  }, [currentSet.peakMoments, currentTime]);

  const prevPeakDrop = useMemo(() => {
    if (!currentSet.peakMoments) return null;
    const past = currentSet.peakMoments.filter((p) => p.timestamp < currentTime - 3);
    return past.length > 0 ? past[past.length - 1] : null;
  }, [currentSet.peakMoments, currentTime]);

  const nextBreakdown = useMemo(() => {
    const lowSlice = energySlices.find(
      (s) => s.time > currentTime + 5 && s.intensityLevel === 'low'
    );
    return lowSlice || null;
  }, [energySlices, currentTime]);

  const prevBreakdown = useMemo(() => {
    const pastLowSlices = energySlices.filter(
      (s) => s.time < currentTime - 5 && s.intensityLevel === 'low'
    );
    return pastLowSlices.length > 0 ? pastLowSlices[pastLowSlices.length - 1] : null;
  }, [energySlices, currentTime]);

  // 4. Mouse interaction & scrubbing
  const handleSeekFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (!containerRef.current || !onSeek) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percent = x / rect.width;
      const targetTime = Math.max(0, Math.min(duration, percent * duration));
      onSeek(targetTime);
    },
    [duration, onSeek]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    const hoverTime = percent * duration;

    setHoverPosition({
      x,
      percent: percent * 100,
      time: hoverTime
    });

    if (isDragging) {
      handleSeekFromEvent(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeekFromEvent(e);

    const onGlobalMouseMove = (moveEvent: MouseEvent) => {
      handleSeekFromEvent(moveEvent);
    };

    const onGlobalMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

  // Hover slice data for tooltip
  const hoverSlice = useMemo<EnergySlice | null>(() => {
    if (!hoverPosition) return null;
    const idx = Math.min(
      energySlices.length - 1,
      Math.max(0, Math.round((hoverPosition.percent / 100) * (energySlices.length - 1)))
    );
    return energySlices[idx] || null;
  }, [hoverPosition, energySlices]);

  return (
    <div
      id="header-energy-mini-map-container"
      className="w-full bg-[#0C0D0F]/95 border-t border-white/5 px-4 sm:px-6 py-1.5 flex flex-col gap-1 transition-all select-none"
    >
      {/* Mini-Map Header Telemetry Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono leading-none gap-2">
        {/* Left: Overall Set Average Energy Density & Classification */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-400 uppercase tracking-tight">Set-Energie-Dichte:</span>
            <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
              Ø {setMetrics.averageEnergy}%
            </span>
          </div>

          {/* High Intensity % Badge */}
          <button
            id="filter-high-intensity-toggle"
            onClick={() => setFilterHighlight(filterHighlight === 'high' ? 'all' : 'high')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filterHighlight === 'high'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
            title="Klicken, um High-Intensity Sektionen (>75%) hervorzuheben"
          >
            <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">High-Intensity (&gt;75%):</span>
            <span className="xs:hidden">High:</span>
            <strong className="text-amber-300 font-bold">{setMetrics.highEnergyPercent}%</strong>
          </button>

          {/* Low Energy / Breakdown % Badge */}
          <button
            id="filter-low-energy-toggle"
            onClick={() => setFilterHighlight(filterHighlight === 'low' ? 'all' : 'low')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filterHighlight === 'low'
                ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/50'
                : 'text-indigo-300/80 hover:text-indigo-200 hover:bg-indigo-500/10'
            }`}
            title="Klicken, um Low-Energy / Breakdown Sektionen (<50%) hervorzuheben"
          >
            <TrendingDown className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span className="hidden xs:inline">Low-Energy (&lt;50%):</span>
            <span className="xs:hidden">Low:</span>
            <strong className="text-indigo-300 font-bold">{setMetrics.lowEnergyPercent}%</strong>
          </button>

          {/* Current Section Status */}
          <div className="hidden md:flex items-center gap-1 text-slate-400 pl-2 border-l border-white/10">
            <span>Aktuell:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                setMetrics.currentIntensity === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : setMetrics.currentIntensity === 'low'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {setMetrics.currentSliceEnergy}% •{' '}
              {setMetrics.currentIntensity === 'high'
                ? 'High-Intensity / Peak'
                : setMetrics.currentIntensity === 'low'
                ? 'Low-Energy / Breakdown'
                : 'Mid-Groove Flow'}
            </span>
          </div>
        </div>

        {/* Right: Quick Jump to Next Drop or Breakdown & Collapse Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Jump to Next High-Intensity Peak */}
          {nextPeakDrop && onSeek && (
            <button
              id="mini-map-jump-next-peak-btn"
              onClick={() => onSeek(nextPeakDrop.timestamp)}
              className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[9px] font-medium transition-colors"
              title={`Springe zu nächstem Peak Drop: "${nextPeakDrop.label}" (${formatTimeSeconds(nextPeakDrop.timestamp)})`}
            >
              <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>Nächster Drop ({formatTimeSeconds(nextPeakDrop.timestamp)})</span>
            </button>
          )}

          {/* Jump to Next Low-Energy Breakdown */}
          {nextBreakdown && onSeek && (
            <button
              id="mini-map-jump-next-breakdown-btn"
              onClick={() => onSeek(nextBreakdown.time)}
              className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-[9px] font-medium transition-colors"
              title={`Springe zu nächster Breakdown (${nextBreakdown.timeFormatted})`}
            >
              <TrendingDown className="w-2.5 h-2.5 text-indigo-400" />
              <span>Breakdown ({nextBreakdown.timeFormatted})</span>
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            id="mini-map-toggle-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title={isCollapsed ? 'Mini-Map vergrößern' : 'Mini-Map kompakt schalten'}
          >
            {isCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Mini-Map Interactive Visualization Canvas / Bar Track */}
      {!isCollapsed ? (
        <div
          ref={containerRef}
          id="header-energy-mini-map-track"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setHoverPosition(null);
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          className="relative w-full h-8 sm:h-9 bg-black/60 rounded border border-white/10 overflow-hidden cursor-pointer group select-none shadow-inner"
        >
          {/* Reference Threshold Grid Lines */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {/* 75% High Intensity Threshold */}
            <div
              className="absolute w-full border-b border-dashed border-amber-500/25"
              style={{ top: '25%' }}
              title="75% High-Intensity Threshold"
            />
            {/* 50% Mid/Low Energy Threshold */}
            <div
              className="absolute w-full border-b border-dashed border-indigo-500/25"
              style={{ top: '50%' }}
              title="50% Low-Energy Threshold"
            />
          </div>

          {/* Low-Energy Valley & High-Intensity Plateau Shaded Background Zones */}
          <div className="absolute inset-0 flex pointer-events-none z-0">
            {energySlices.map((s, idx) => {
              const isHigh = s.intensityLevel === 'high';
              const isLow = s.intensityLevel === 'low';
              const isHighlighted =
                filterHighlight === 'all' ||
                (filterHighlight === 'high' && isHigh) ||
                (filterHighlight === 'low' && isLow);

              let bgColor = 'transparent';
              if (isHigh && isHighlighted) bgColor = 'rgba(245, 158, 11, 0.08)';
              if (isLow && isHighlighted) bgColor = 'rgba(99, 102, 241, 0.1)';

              return (
                <div
                  key={`bg-zone-${idx}`}
                  className="h-full flex-1"
                  style={{ backgroundColor: bgColor }}
                />
              );
            })}
          </div>

          {/* SVG Energy Curve Fill & Density Profile */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
            preserveAspectRatio="none"
            viewBox={`0 0 ${SLICE_COUNT} 100`}
          >
            <defs>
              <linearGradient id="headerEnergyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="35%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Continuous Smooth Area Polygon */}
            <polygon
              points={`0,100 ${energySlices
                .map((s, i) => `${i},${100 - s.energy}`)
                .join(' ')} ${SLICE_COUNT - 1},100`}
              fill="url(#headerEnergyGradient)"
            />

            {/* Top Energy Contour Line */}
            <polyline
              points={energySlices.map((s, i) => `${i},${100 - s.energy}`).join(' ')}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            />
          </svg>

          {/* Discrete Micro Bars Overlay for Optical Density & Texture */}
          <div className="absolute inset-0 flex items-end gap-[1px] px-0.5 pointer-events-none z-20">
            {energySlices.map((s, idx) => {
              const isHigh = s.intensityLevel === 'high';
              const isLow = s.intensityLevel === 'low';
              const isFilterDimmed =
                (filterHighlight === 'high' && !isHigh) ||
                (filterHighlight === 'low' && !isLow);

              // Bar color matching intensity
              let barColor = 'bg-emerald-400';
              if (isHigh) barColor = 'bg-amber-400';
              if (isLow) barColor = 'bg-indigo-400';

              const barHeight = Math.max(8, s.energy);

              return (
                <div
                  key={`bar-${idx}`}
                  className="flex-1 flex flex-col justify-end h-full"
                >
                  <div
                    className={`w-full rounded-t-xs transition-opacity duration-150 ${barColor} ${
                      isFilterDimmed ? 'opacity-20' : isHigh ? 'opacity-85 shadow-[0_0_4px_rgba(245,158,11,0.4)]' : isLow ? 'opacity-70' : 'opacity-75'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Peak Moments Markers (Drops / Climaxes) */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {currentSet.peakMoments?.map((p) => {
              const leftPercent = (p.timestamp / duration) * 100;
              if (leftPercent < 0 || leftPercent > 100) return null;
              return (
                <div
                  key={`peak-marker-${p.id}`}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-start -translate-x-1/2"
                  style={{ left: `${leftPercent}%` }}
                  title={`Drop: ${p.label} (${formatTimeSeconds(p.timestamp)}) - ${p.energyLevel}%`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 border border-black shadow-[0_0_6px_#f59e0b] animate-pulse mt-0.5 flex items-center justify-center" />
                  <div className="w-[1px] h-full bg-amber-400/40" />
                </div>
              );
            })}
          </div>

          {/* Low Energy Breakdown Indicators (Troughs) */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {energySlices
              .filter((s, idx) => s.energy < 46 && idx % 10 === 0)
              .map((s, i) => {
                const leftPercent = (s.time / duration) * 100;
                return (
                  <div
                    key={`low-marker-${i}`}
                    className="absolute bottom-0 w-[1px] h-3 bg-indigo-400/50"
                    style={{ left: `${leftPercent}%` }}
                  />
                );
              })}
          </div>

          {/* Elapsed Progress Translucent Shade */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/[0.04] pointer-events-none z-25 border-r border-white/20"
            style={{ width: `${playheadPercent}%` }}
          />

          {/* Playhead Needle Indicator */}
          <div
            id="mini-map-playhead-needle"
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] z-40 pointer-events-none -translate-x-1/2 transition-transform duration-75"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-2 h-2 bg-emerald-300 rotate-45 -translate-x-[3px] -translate-y-1 shadow-sm border border-black" />
          </div>

          {/* Hover Scrubber Line & Tooltip */}
          {isHovering && hoverPosition && hoverSlice && (
            <>
              {/* Vertical Hover Guide Line */}
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-white/70 shadow-[0_0_4px_#ffffff] z-40 pointer-events-none -translate-x-1/2"
                style={{ left: `${hoverPosition.percent}%` }}
              />

              {/* Floating Tooltip HUD */}
              <div
                className="absolute top-full mt-1.5 z-50 pointer-events-none -translate-x-1/2 bg-[#121418] border border-white/20 rounded-md px-2.5 py-1.5 shadow-2xl text-[11px] font-mono text-white flex flex-col gap-1 backdrop-blur-md min-w-[190px]"
                style={{
                  left: `${Math.min(92, Math.max(8, hoverPosition.percent))}%`
                }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <span className="text-emerald-400 font-bold">{hoverSlice.timeFormatted}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      hoverSlice.intensityLevel === 'high'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : hoverSlice.intensityLevel === 'low'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {hoverSlice.energy}% ENERGIE
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span className="text-slate-400">Sektion:</span>
                  <span className="font-semibold text-white truncate max-w-[110px]">
                    {hoverSlice.peakLabel ? `🔥 ${hoverSlice.peakLabel}` : hoverSlice.segmentName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span>Sub: <strong className="text-cyan-300">{hoverSlice.subBass}%</strong></span>
                  <span>Mid/High: <strong className="text-purple-300">{hoverSlice.midHigh}%</strong></span>
                  <span>Tension: <strong className="text-amber-300">{hoverSlice.tension}%</strong></span>
                </div>

                <div className="text-[9px] text-slate-500 text-center border-t border-white/5 pt-0.5 italic">
                  Klicken zum Springen
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Compact 4px Slim Progress Strip when collapsed */
        <div
          ref={containerRef}
          onClick={handleMouseDown}
          className="relative w-full h-1.5 bg-black/70 rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all"
          title="Klicken zum Springen oder Mini-Map ausklappen"
        >
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400"
            style={{ width: `${playheadPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
