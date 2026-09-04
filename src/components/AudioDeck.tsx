import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Sliders,
  Flame,
  Zap,
  Clock
} from 'lucide-react';
import { TechnoSetAnalysis, TransitionItem, PeakMoment } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { TechnoPreviewAudioEngine } from '../utils/audioAnalyzer';

interface AudioDeckProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onJumpToTransition: (t: TransitionItem) => void;
  onJumpToPeak: (p: PeakMoment) => void;
}

export const AudioDeck: React.FC<AudioDeckProps> = ({
  currentSet,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  onJumpToTransition,
  onJumpToPeak
}) => {
  const [pitchPercent, setPitchPercent] = useState<number>(0);
  const [isLoopingTransition, setIsLoopingTransition] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const duration = currentSet.duration || 3600;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  // Find next transition and peak
  const nextTransition = currentSet.transitions.find((t) => t.timestamp > currentTime);
  const nextPeak = currentSet.peakMoments.find((p) => p.timestamp > currentTime);

  const calculatedBpm = Math.round((currentSet.bpmAverage * (1 + pitchPercent / 100)) * 10) / 10;

  return (
    <div
      id="techno-audio-deck"
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl relative overflow-hidden"
    >
      {/* Top Deck Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-400">
            TRACK / SET DECK
          </div>
          <h2 className="font-mono text-sm sm:text-base font-bold text-zinc-100 truncate max-w-md">
            {currentSet.name}
          </h2>
        </div>

        {/* Real-time Deck Telemetry */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">BPM:</span>
            <span className="font-bold text-emerald-400">{calculatedBpm}</span>
            {pitchPercent !== 0 && (
              <span className={`text-[10px] ${pitchPercent > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {pitchPercent > 0 ? `+${pitchPercent}%` : `${pitchPercent}%`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">KEY:</span>
            <span className="font-bold text-purple-400">{currentSet.dominantKey}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">RMS:</span>
            <span className="font-bold text-zinc-200">{currentSet.technicalMetrics.rmsDb} dB</span>
          </div>
        </div>
      </div>

      {/* Waveform & Cue Marker Timeline */}
      <div className="relative mb-3">
        {/* Waveform Bar Canvas / Representation */}
        <div
          id="deck-waveform-track"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            onSeek(Math.max(0, Math.min(duration, newTime)));
          }}
          className="h-20 bg-zinc-900/90 border border-zinc-800/90 rounded-lg relative overflow-hidden cursor-pointer group select-none"
        >
          {/* Waveform frequency bars */}
          <div className="absolute inset-0 flex items-center justify-between px-1 gap-0.5 opacity-80">
            {currentSet.energyPoints.map((pt, i) => {
              const heightPct = Math.max(12, Math.min(95, pt.energy * 0.9));
              const subPct = pt.subBass;
              const isPast = pt.time <= currentTime;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-center h-full"
                  title={`${formatTimeSeconds(pt.time)}: Energie ${pt.energy}%, Sub ${pt.subBass}%`}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-xs transition-colors ${
                      isPast
                        ? subPct > 80
                          ? 'bg-emerald-400'
                          : 'bg-emerald-500/80'
                        : subPct > 85
                        ? 'bg-amber-500/60 group-hover:bg-amber-400/80'
                        : 'bg-zinc-700/60 group-hover:bg-zinc-600/80'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Transitions Overlay Markers on Waveform */}
          {currentSet.transitions.map((t) => {
            const leftPct = (t.timestamp / duration) * 100;
            return (
              <div
                key={t.id}
                style={{ left: `${leftPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToTransition(t);
                }}
                className="absolute top-0 bottom-0 w-1 bg-cyan-400/80 hover:w-2 hover:bg-cyan-300 z-10 cursor-pointer group/trans transition-all"
                title={`Übergang bei ${formatTimeSeconds(t.timestamp)} (Score: ${t.qualityScore}%)`}
              >
                <div className="hidden group-hover/trans:flex absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-950 border border-cyan-500 text-[10px] font-mono text-cyan-200 rounded whitespace-nowrap z-20">
                  {formatTimeSeconds(t.timestamp)} • {t.qualityScore}%
                </div>
              </div>
            );
          })}

          {/* Peak Drops Overlay Markers */}
          {currentSet.peakMoments.map((p) => {
            const leftPct = (p.timestamp / duration) * 100;
            return (
              <div
                key={p.id}
                style={{ left: `${leftPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToPeak(p);
                }}
                className="absolute top-0 bottom-0 w-1.5 bg-amber-400 hover:w-2.5 hover:bg-amber-300 z-10 cursor-pointer group/peak transition-all"
                title={`PEAK DROP: ${p.label} (${formatTimeSeconds(p.timestamp)})`}
              >
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-75" />
                <div className="hidden group-hover/peak:flex absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-950 border border-amber-500 text-[10px] font-mono text-amber-200 rounded whitespace-nowrap z-20">
                  DROP: {p.label}
                </div>
              </div>
            );
          })}

          {/* Current Playhead Scrubber */}
          <div
            id="deck-playhead"
            style={{ left: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          >
            <div className="w-2.5 h-2.5 bg-white rounded-full -ml-1 -top-1 absolute shadow-sm" />
          </div>
        </div>

        {/* Time Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mt-1 px-1">
          <span className="text-zinc-100 font-bold">{formatTimeSeconds(currentTime)}</span>
          <span className="text-zinc-500">Verbleibend: -{formatTimeSeconds(Math.max(0, duration - currentTime))}</span>
          <span className="text-zinc-400">{formatTimeSeconds(duration)}</span>
        </div>
      </div>

      {/* Primary Deck Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3">
        {/* Left: Quick Jump Cues */}
        <div className="flex items-center gap-2">
          {nextTransition ? (
            <button
              id="btn-jump-next-transition"
              onClick={() => onJumpToTransition(nextTransition)}
              className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 hover:border-cyan-500 text-cyan-300 transition-all cursor-pointer truncate"
              title={`Springe zu Übergang bei ${formatTimeSeconds(nextTransition.timestamp)}`}
            >
              <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Übergang ({formatTimeSeconds(nextTransition.timestamp)})</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-zinc-600 px-2 py-1">Kein nächster Übergang</div>
          )}

          {nextPeak && (
            <button
              id="btn-jump-next-peak"
              onClick={() => onJumpToPeak(nextPeak)}
              className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded bg-amber-950/60 border border-amber-800/60 hover:border-amber-500 text-amber-300 transition-all cursor-pointer truncate"
              title={`Springe zu Peak Drop bei ${formatTimeSeconds(nextPeak.timestamp)}`}
            >
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Peak Drop ({formatTimeSeconds(nextPeak.timestamp)})</span>
            </button>
          )}
        </div>

        {/* Center: Play, Pause & Scrub Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            id="btn-deck-back-15"
            onClick={() => onSeek(Math.max(0, currentTime - 15))}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
            title="15s zurückspringen"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            id="btn-deck-play-toggle"
            onClick={onTogglePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-zinc-950 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/30'
                : 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/30'
            }`}
            title={isPlaying ? 'Pausieren' : 'Techno-Set Audio abspielen'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            id="btn-deck-forward-15"
            onClick={() => onSeek(Math.min(duration, currentTime + 15))}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
            title="15s vorwärtsspringen"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            id="btn-deck-restart"
            onClick={() => onSeek(0)}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="An den Anfang springen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Pitch & VU Level Meters */}
        <div className="flex items-center justify-end gap-3">
          {/* Pitch adjustment */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <input
              id="slider-pitch-bend"
              type="range"
              min="-8"
              max="8"
              step="0.5"
              value={pitchPercent}
              onChange={(e) => setPitchPercent(parseFloat(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer"
              title="Pitch Fader: -8% bis +8%"
            />
            <button
              onClick={() => setPitchPercent(0)}
              className="text-[10px] px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
              title="Pitch auf 0% zurücksetzen"
            >
              Reset
            </button>
          </div>

          {/* Volume toggle */}
          <button
            id="btn-volume-mute"
            onClick={() => setIsMuted(!isMuted)}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title={isMuted ? 'Lautsprecher an' : 'Stummschalten'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
