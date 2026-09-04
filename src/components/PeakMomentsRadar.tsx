import React from 'react';
import { Flame, Play, Plus, Zap, AlertCircle, Sparkles } from 'lucide-react';
import { PeakMoment, TechnoSetAnalysis } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';

interface PeakMomentsRadarProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onJumpToPeak: (p: PeakMoment) => void;
  onAddPeakAtCurrentTime: () => void;
}

export const PeakMomentsRadar: React.FC<PeakMomentsRadarProps> = ({
  currentSet,
  currentTime,
  onJumpToPeak,
  onAddPeakAtCurrentTime
}) => {
  const peaks = currentSet.peakMoments;

  return (
    <div
      id="peak-moments-radar"
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
            PEAK-MOMENTE & DROP-DETEKTION
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono font-bold">
            {peaks.length} Drops erkannt
          </span>
        </div>

        <button
          id="btn-add-peak-cue"
          onClick={onAddPeakAtCurrentTime}
          className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all cursor-pointer"
          title={`Aktuelle Stelle (${formatTimeSeconds(currentTime)}) als Peak markieren`}
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Peak bei {formatTimeSeconds(currentTime)}</span>
        </button>
      </div>

      {/* Peak Drops List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {peaks.map((peak, idx) => {
          const isNear = Math.abs(peak.timestamp - currentTime) < 20;

          return (
            <div
              key={peak.id}
              className={`bg-zinc-900/80 border rounded-lg p-3 flex flex-col justify-between gap-2 transition-all ${
                isNear
                  ? 'border-amber-500 ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold uppercase">
                    {peak.type}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{peak.dropIntensity}% Intensität</span>
                  </div>
                </div>

                <h4 className="font-mono text-xs font-bold text-zinc-100 mb-1">
                  {peak.label}
                </h4>

                <p className="text-[11px] font-mono text-zinc-400 line-clamp-2 mb-2">
                  {peak.description}
                </p>
              </div>

              {/* Action Jump to Drop */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <div className="text-[11px] font-mono text-zinc-400">
                  Zeit: <strong className="text-zinc-200">{formatTimeSeconds(peak.timestamp)}</strong>
                </div>

                <button
                  onClick={() => onJumpToPeak(peak)}
                  className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold transition-all cursor-pointer"
                  title="Direkt zum Drop springen & hören"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Zum Drop</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
