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
import { computeAutoTaggedSegments } from '../utils/segmentAutoTagger';

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

  // Segments calculation
  const segments = currentSet.segments && currentSet.segments.length > 0
    ? currentSet.segments
    : computeAutoTaggedSegments(duration, currentSet.energyPoints);

  // Active segment
  const activeSegment = segments.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  ) || segments[0];

  // Find next transition and peak
  const nextTransition = currentSet.transitions.find((t) => t.timestamp > currentTime);
  const nextPeak = currentSet.peakMoments.find((p) => p.timestamp > currentTime);

  const calculatedBpm = Math.round((currentSet.bpmAverage * (1 + pitchPercent / 100)) * 10) / 10;

  return (
    <div
      id="techno-audio-deck"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded relative overflow-hidden flex flex-col gap-2"
    >
      {/* Top Deck Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            ENERGIE-ANALYSE & WAVEFORM
          </span>
          <span className="text-slate-600 font-mono text-xs">•</span>
          {currentSet.artworkUrl && (
            <img
              src={currentSet.artworkUrl}
              alt={currentSet.name}
              className="w-5 h-5 rounded object-cover border border-white/10 shrink-0 shadow-sm"
              referrerPolicy="no-referrer"
            />
          )}
          <h2 className="font-mono text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate max-w-[200px] sm:max-w-md">
            {currentSet.name}
          </h2>
          {currentSet.sourcePlatform && currentSet.sourcePlatform !== 'file' && (
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase ${
                currentSet.sourcePlatform === 'hearthis'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : currentSet.sourcePlatform === 'soundcloud'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : currentSet.sourcePlatform === 'mixcloud'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {currentSet.sourcePlatform}
            </span>
          )}
          {activeSegment && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${activeSegment.color}15`,
                borderColor: `${activeSegment.color}40`,
                color: activeSegment.color
              }}
              title={`Aktiver Abschnitt: ${activeSegment.tag} (Ø ${activeSegment.averageEnergy}% Energie)`}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeSegment.color }} />
              <span>{activeSegment.tag}</span>
              <span className="text-[8px] opacity-70">Ø {activeSegment.averageEnergy}%</span>
            </div>
          )}
        </div>

        {/* Real-time Deck Telemetry */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px]">
            <span className="text-slate-500 uppercase">BPM</span>
            <span className="font-bold text-emerald-400 font-mono">{calculatedBpm}</span>
            {pitchPercent !== 0 && (
              <span className={`text-[9px] ${pitchPercent > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                {pitchPercent > 0 ? `+${pitchPercent}%` : `${pitchPercent}%`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px]">
            <span className="text-slate-500 uppercase">KEY</span>
            <span className="font-bold text-purple-400 font-mono">{currentSet.dominantKey}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px]">
            <span className="text-slate-500 uppercase">DURATION</span>
            <span className="font-mono text-slate-300">{formatTimeSeconds(duration)}</span>
          </div>
        </div>
      </div>

      {/* Waveform & Cue Marker Timeline */}
      <div className="relative">
        {/* Waveform Bar Canvas / Representation */}
        <div
          id="deck-waveform-track"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            onSeek(Math.max(0, Math.min(duration, newTime)));
          }}
          className="h-24 sm:h-28 bg-[#0A0A0B] border border-white/5 rounded relative overflow-hidden cursor-pointer group select-none flex items-center"
        >
          {/* Waveform frequency bars matching High Density theme (blue-500 & pink-500) */}
          <div className="absolute inset-0 flex items-center justify-between px-1 gap-[1px]">
            {currentSet.energyPoints.map((pt, i) => {
              const heightPct = Math.max(16, Math.min(96, pt.energy * 0.95));
              const isPast = pt.time <= currentTime;
              const isPeakDrop = pt.energy > 88 || pt.subBass > 85;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-center h-full"
                  title={`${formatTimeSeconds(pt.time)}: Energie ${pt.energy}%, Sub ${pt.subBass}%`}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-[1px] transition-all duration-150 ${
                      isPast
                        ? isPeakDrop
                          ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                          : 'bg-emerald-500 opacity-90'
                        : isPeakDrop
                        ? 'bg-pink-500/70 group-hover:bg-pink-400'
                        : 'bg-blue-500/60 group-hover:bg-blue-400'
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
                className="absolute top-0 bottom-0 w-1 bg-blue-400/80 hover:w-2 hover:bg-blue-300 z-10 cursor-pointer group/trans transition-all"
                title={`Übergang bei ${formatTimeSeconds(t.timestamp)} (Score: ${t.qualityScore}%)`}
              >
                <div className="hidden group-hover/trans:flex absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-950 border border-blue-500 text-[9px] font-mono text-blue-200 rounded whitespace-nowrap z-20 shadow-md">
                  MIX {formatTimeSeconds(t.timestamp)} • {t.qualityScore}%
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
                className="absolute top-0 bottom-0 w-1.5 bg-pink-500 hover:w-2.5 hover:bg-pink-400 z-10 cursor-pointer group/peak transition-all"
                title={`PEAK DROP: ${p.label} (${formatTimeSeconds(p.timestamp)})`}
              >
                <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-pink-600 text-white text-[9px] font-mono font-bold rounded shadow-lg uppercase whitespace-nowrap">
                  {p.label}
                </div>
              </div>
            );
          })}

          {/* Current Playhead Scrubber */}
          <div
            id="deck-playhead"
            style={{ left: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_10px_white]"
          >
            <div className="w-2.5 h-2.5 bg-white rounded -ml-1 top-0 absolute shadow-sm" />
          </div>

          {/* High Density progress bar on bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 pointer-events-none">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
            />
          </div>
        </div>

        {/* Auto-Tagged Segment Ribbon Bar */}
        {segments.length > 0 && (
          <div className="mt-1 h-3 w-full bg-black/70 border border-white/5 rounded overflow-hidden flex relative">
            {segments.map((seg) => {
              const segDuration = seg.endTime - seg.startTime;
              const widthPct = (segDuration / duration) * 100;
              const isActive = currentTime >= seg.startTime && currentTime <= seg.endTime;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(seg.startTime);
                  }}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: seg.color
                  }}
                  className={`h-full border-r border-black/50 text-[8px] font-mono font-bold uppercase truncate px-1 flex items-center justify-between text-black transition-all cursor-pointer ${
                    isActive ? 'opacity-100 ring-1 ring-white z-10 brightness-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={`${seg.tag}: ${formatTimeSeconds(seg.startTime)} - ${formatTimeSeconds(seg.endTime)} (Ø ${seg.averageEnergy}% Energie) • Klick zum Anspringen`}
                >
                  <span className="truncate">{seg.tag}</span>
                  <span className="hidden sm:inline opacity-80 text-[7px]">{seg.averageEnergy}%</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Time Labels */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1 px-1">
          <span className="text-white font-bold">{formatTimeSeconds(currentTime)}</span>
          <span>REMAINING: -{formatTimeSeconds(Math.max(0, duration - currentTime))}</span>
          <span className="text-slate-400">{formatTimeSeconds(duration)}</span>
        </div>
      </div>

      {/* Primary Deck Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/5 rounded p-2 sm:p-2.5">
        {/* Left: Quick Jump Cues & Segment Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {nextTransition ? (
            <button
              id="btn-jump-next-transition"
              onClick={() => onJumpToTransition(nextTransition)}
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 text-blue-300 transition-all cursor-pointer truncate"
              title={`Springe zu Übergang bei ${formatTimeSeconds(nextTransition.timestamp)}`}
            >
              <Zap className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">Übergang ({formatTimeSeconds(nextTransition.timestamp)})</span>
            </button>
          ) : (
            <div className="text-[10px] font-mono text-slate-600 px-1 py-0.5">Kein nächster Übergang</div>
          )}

          {nextPeak && (
            <button
              id="btn-jump-next-peak"
              onClick={() => onJumpToPeak(nextPeak)}
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-pink-500/10 border border-pink-500/30 hover:border-pink-400 text-pink-300 transition-all cursor-pointer truncate"
              title={`Springe zu Peak Drop bei ${formatTimeSeconds(nextPeak.timestamp)}`}
            >
              <Flame className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="truncate">Peak Drop ({formatTimeSeconds(nextPeak.timestamp)})</span>
            </button>
          )}

          {/* Quick Segment Jump Pills */}
          <div className="hidden xl:flex items-center gap-1 pl-1 border-l border-white/10">
            {segments.map((seg) => {
              const isActive = currentTime >= seg.startTime && currentTime <= seg.endTime;
              return (
                <button
                  key={seg.id}
                  onClick={() => onSeek(seg.startTime)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer truncate max-w-[85px] ${
                    isActive ? 'ring-1 ring-white font-bold' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: `${seg.color}50`,
                    backgroundColor: `${seg.color}20`,
                    color: seg.color
                  }}
                  title={`${seg.tag} anspringen (${formatTimeSeconds(seg.startTime)})`}
                >
                  {seg.tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Play, Pause & Scrub Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            id="btn-deck-back-15"
            onClick={() => onSeek(Math.max(0, currentTime - 15))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer border border-white/5"
            title="15s zurückspringen"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-deck-play-toggle"
            onClick={onTogglePlay}
            className={`px-4 py-1.5 rounded flex items-center justify-center font-bold text-xs font-mono tracking-tighter uppercase transition-all transform active:scale-95 cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
            }`}
            title={isPlaying ? 'Pausieren' : 'Techno-Set Audio abspielen'}
          >
            {isPlaying ? (
              <div className="flex items-center gap-1.5">
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>PLAY</span>
              </div>
            )}
          </button>

          <button
            id="btn-deck-forward-15"
            onClick={() => onSeek(Math.min(duration, currentTime + 15))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer border border-white/5"
            title="15s vorwärtsspringen"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-deck-restart"
            onClick={() => onSeek(0)}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="An den Anfang springen"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Pitch & Volume controls */}
        <div className="flex items-center justify-end gap-3">
          {/* Pitch adjustment */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Sliders className="w-3 h-3 text-slate-500" />
            <input
              id="slider-pitch-bend"
              type="range"
              min="-8"
              max="8"
              step="0.5"
              value={pitchPercent}
              onChange={(e) => setPitchPercent(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-emerald-500 cursor-pointer"
              title="Pitch Fader: -8% bis +8%"
            />
            <button
              onClick={() => setPitchPercent(0)}
              className="text-[9px] px-1 py-0.2 rounded bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer border border-white/5"
              title="Pitch auf 0% zurücksetzen"
            >
              0%
            </button>
          </div>

          {/* Volume toggle */}
          <button
            id="btn-volume-mute"
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-white cursor-pointer p-1"
            title={isMuted ? 'Lautsprecher an' : 'Stummschalten'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-pink-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
