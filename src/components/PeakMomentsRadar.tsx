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
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-2.5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-pink-500" />
          <h3 className="text-[10px] font-mono font-bold text-pink-500 uppercase tracking-widest">
            ENERGETIC PEAKS & DROPS
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-pink-400 font-mono font-bold">
            {peaks.length} DROPS
          </span>
        </div>

        <button
          id="btn-add-peak-cue"
          onClick={onAddPeakAtCurrentTime}
          className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer uppercase"
          title={`Aktuelle Stelle (${formatTimeSeconds(currentTime)}) als Peak markieren`}
        >
          <Plus className="w-3 h-3 text-pink-400" />
          <span>Peak ({formatTimeSeconds(currentTime)})</span>
        </button>
      </div>

      {/* Peak Drops List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {peaks.map((peak) => {
          const isNear = Math.abs(peak.timestamp - currentTime) < 25;

          return (
            <div
              key={peak.id}
              className={`bg-white/5 border rounded p-2.5 flex items-center justify-between gap-3 transition-all ${
                isNear
                  ? 'border-pink-500/80 ring-1 ring-pink-500/40'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Visual Pink Badge as in High Density design */}
                <div className="w-8 h-8 rounded bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  {peak.type === 'main-drop' ? 'H' : 'M'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono text-xs font-bold text-white truncate">
                      {peak.label}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-500">
                      {formatTimeSeconds(peak.timestamp)}
                    </span>
                  </div>

                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {peak.description}
                  </p>

                  {/* Micro intensity bar */}
                  <div className="w-full h-1 bg-white/10 mt-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${peak.dropIntensity}%` }}
                      className="h-full bg-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Jump button */}
              <button
                onClick={() => onJumpToPeak(peak)}
                className="px-2.5 py-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1"
                title="Direkt zum Drop springen"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Jump</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
