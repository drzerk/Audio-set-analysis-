import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Scissors,
  Edit2,
  Check,
  Zap,
  Activity,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { TechnoSetAnalysis, SetSegment, SegmentTag } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { computeAutoTaggedSegments, SEGMENT_CONFIGS } from '../utils/segmentAutoTagger';

interface SegmentTaggerCardProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSegments: (segments: SetSegment[]) => void;
}

const AVAILABLE_TAGS: SegmentTag[] = [
  'Warm-up',
  'Build-up',
  'Peak Hour',
  'Hypnotic Plateau',
  'Breakdown',
  'Cool-down'
];

export const SegmentTaggerCard: React.FC<SegmentTaggerCardProps> = ({
  currentSet,
  currentTime,
  onSeek,
  onUpdateSegments
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<SegmentTag>('Peak Hour');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const duration = currentSet.duration || 3600;
  const segments = currentSet.segments && currentSet.segments.length > 0
    ? currentSet.segments
    : computeAutoTaggedSegments(duration, currentSet.energyPoints);

  // Active segment at current time
  const activeSegment = segments.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  ) || segments[0];

  const triggerFeedback = (text: string) => {
    setFeedbackMsg(text);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Re-run Auto-Tagging with chosen mode
  const handleAutoTag = (mode: 'adaptive' | '3-phase' | '5-phase') => {
    const newSegments = computeAutoTaggedSegments(duration, currentSet.energyPoints, { mode });
    onUpdateSegments(newSegments);
    triggerFeedback(`Auto-Tagging durchgeführt (${mode === '3-phase' ? '3-Phasen Klassiker' : mode === '5-phase' ? '5-Phasen Flow' : 'Adaptive Intensität'})`);
  };

  // Add a split at current time
  const handleSplitAtCurrentTime = () => {
    const t = Math.round(currentTime);
    if (t <= 30 || t >= duration - 30) {
      triggerFeedback('Schnittpunkt zu nah am Anfang oder Ende des Sets.');
      return;
    }

    // Find the segment containing t
    const segIdx = segments.findIndex((s) => t > s.startTime && t < s.endTime);
    if (segIdx === -1) {
      triggerFeedback('Kein teilbares Segment an der aktuellen Abspielposition.');
      return;
    }

    const targetSeg = segments[segIdx];
    const firstHalf: SetSegment = {
      ...targetSeg,
      id: `seg-split-${Date.now()}-1`,
      endTime: t,
      isCustom: true
    };
    const secondHalf: SetSegment = {
      ...targetSeg,
      id: `seg-split-${Date.now()}-2`,
      startTime: t,
      tag: targetSeg.tag === 'Warm-up' ? 'Build-up' : targetSeg.tag === 'Build-up' ? 'Peak Hour' : 'Cool-down',
      color: SEGMENT_CONFIGS[targetSeg.tag === 'Warm-up' ? 'Build-up' : targetSeg.tag === 'Build-up' ? 'Peak Hour' : 'Cool-down']?.color || '#3b82f6',
      isCustom: true
    };

    const updated = [
      ...segments.slice(0, segIdx),
      firstHalf,
      secondHalf,
      ...segments.slice(segIdx + 1)
    ];

    onUpdateSegments(updated);
    triggerFeedback(`Neuer Schnittpunkt bei ${formatTimeSeconds(t)} gesetzt.`);
  };

  const handleStartEdit = (seg: SetSegment) => {
    setEditingSegmentId(seg.id);
    setSelectedTag(seg.tag);
    setCustomDescription(seg.description);
  };

  const handleSaveEdit = (segId: string) => {
    const cfg = SEGMENT_CONFIGS[selectedTag] || SEGMENT_CONFIGS['Build-up'];
    const updated = segments.map((s) => {
      if (s.id === segId) {
        return {
          ...s,
          tag: selectedTag,
          color: cfg.color,
          description: customDescription || cfg.defaultDesc,
          isCustom: true
        };
      }
      return s;
    });

    onUpdateSegments(updated);
    setEditingSegmentId(null);
    triggerFeedback('Segment-Tag aktualisiert.');
  };

  return (
    <div
      id="segment-tagger-card"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-3"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-pink-400" />
          <h3 className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-widest">
            AUTO-TAGGING & SET-SEGMENTIERUNG
          </h3>
          <span className="text-slate-600 font-mono text-xs">•</span>
          <span className="text-[10px] font-mono text-slate-400">
            {segments.length} Abschnitte erkannt
          </span>
        </div>

        {/* Live Active Phase Indicator */}
        {activeSegment && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Aktive Phase:</span>
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${activeSegment.color}15`,
                borderColor: `${activeSegment.color}40`,
                color: activeSegment.color
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeSegment.color }} />
              <span>{activeSegment.tag}</span>
              <span className="text-[9px] opacity-70">({formatTimeSeconds(activeSegment.startTime)} - {formatTimeSeconds(activeSegment.endTime)})</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Controls & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.02] border border-white/5 p-2 rounded">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-mono text-slate-500 uppercase mr-1">Auto-Tagging Presets:</span>
          <button
            id="btn-autotag-adaptive"
            onClick={() => handleAutoTag('adaptive')}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
            title="Dynamische Segmentierung nach Energieintensität"
          >
            <Sparkles className="w-2.5 h-2.5 text-pink-400" />
            <span>Adaptive Schwelle</span>
          </button>
          <button
            id="btn-autotag-3phase"
            onClick={() => handleAutoTag('3-phase')}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
            title="Klassisches Club-Modell: Warm-up -> Peak Hour -> Cool-down"
          >
            <span>3-Phasen Club (Klassiker)</span>
          </button>
          <button
            id="btn-autotag-5phase"
            onClick={() => handleAutoTag('5-phase')}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
            title="Erweiterte 5-Phasen Dramaturgie"
          >
            <span>5-Phasen Flow</span>
          </button>
        </div>

        {/* Split at Playhead */}
        <div className="flex items-center gap-2">
          {feedbackMsg && (
            <span className="text-[10px] font-mono text-emerald-400 animate-fade-in font-bold">
              {feedbackMsg}
            </span>
          )}
          <button
            id="btn-split-segment-playhead"
            onClick={handleSplitAtCurrentTime}
            className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 transition-all cursor-pointer uppercase"
            title={`Neuen Schnitt bei ${formatTimeSeconds(currentTime)} hinzufügen`}
          >
            <Scissors className="w-3 h-3 text-pink-400" />
            <span>Schnitt bei {formatTimeSeconds(currentTime)}</span>
          </button>
        </div>
      </div>

      {/* Segment Multi-Color Ribbon Timeline */}
      <div className="flex flex-col gap-1">
        <div className="h-4 w-full bg-black/60 border border-white/5 rounded overflow-hidden flex relative">
          {segments.map((seg) => {
            const segLen = seg.endTime - seg.startTime;
            const widthPct = (segLen / duration) * 100;
            const isCurrent = currentTime >= seg.startTime && currentTime <= seg.endTime;

            return (
              <div
                key={seg.id}
                onClick={() => onSeek(seg.startTime)}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: seg.color
                }}
                className={`h-full border-r border-black/40 cursor-pointer transition-opacity relative group ${
                  isCurrent ? 'opacity-100 ring-1 ring-white' : 'opacity-70 hover:opacity-100'
                }`}
                title={`${seg.tag}: ${formatTimeSeconds(seg.startTime)} - ${formatTimeSeconds(seg.endTime)} (Ø ${seg.averageEnergy}%)`}
              >
                <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-[#121214] border border-white/20 text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-30 shadow-md">
                  {seg.tag} ({formatTimeSeconds(seg.startTime)} - {formatTimeSeconds(seg.endTime)})
                </div>
              </div>
            );
          })}

          {/* Current Playhead */}
          <div
            style={{ left: `${(currentTime / duration) * 100}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_6px_white] z-20"
          />
        </div>
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-0.5">
          <span>00:00 (Set-Start)</span>
          <span>Timeline-Übersicht der auto-getaggten Phasen</span>
          <span>{formatTimeSeconds(duration)} (Set-Ende)</span>
        </div>
      </div>

      {/* Segments Detailed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
        {segments.map((seg, idx) => {
          const isCurrent = currentTime >= seg.startTime && currentTime <= seg.endTime;
          const isEditing = editingSegmentId === seg.id;
          const segDuration = seg.endTime - seg.startTime;

          return (
            <div
              key={seg.id}
              className={`p-2.5 rounded border transition-all relative flex flex-col justify-between gap-2 ${
                isCurrent
                  ? 'bg-white/[0.04] border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              {/* Card Header: Tag & Time */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Color pill / tag */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value as SegmentTag)}
                        className="bg-black border border-white/20 rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:outline-none"
                      >
                        {AVAILABLE_TAGS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveEdit(seg.id)}
                        className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded cursor-pointer"
                        title="Speichern"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-mono font-bold uppercase tracking-wider"
                        style={{ color: seg.color }}
                      >
                        {seg.tag}
                      </span>
                      <button
                        onClick={() => handleStartEdit(seg)}
                        className="text-slate-600 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                        title="Tag oder Beschreibung ändern"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-white font-bold">
                    {formatTimeSeconds(seg.startTime)} - {formatTimeSeconds(seg.endTime)}
                  </span>
                  <span className="text-slate-500">
                    ({Math.round(segDuration / 60)} Min)
                  </span>
                </div>
              </div>

              {/* Description */}
              {isEditing ? (
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Beschreibung für diese Phase..."
                  className="w-full bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-slate-200"
                />
              ) : (
                <p className="text-[10px] font-mono text-slate-400 line-clamp-2 leading-relaxed">
                  {seg.description}
                </p>
              )}

              {/* Energy Metrics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[9px] font-mono">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Ø ENERGIE:</span>
                    <span className="font-bold text-slate-200">{seg.averageEnergy}%</span>
                    <div className="w-12 bg-black h-1 rounded overflow-hidden">
                      <div
                        style={{ width: `${seg.averageEnergy}%`, backgroundColor: seg.color }}
                        className="h-full rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-slate-500">PEAK:</span>
                    <span className="text-pink-400 font-bold">{seg.peakEnergy}%</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-slate-500">SUB:</span>
                    <span className="text-amber-400 font-bold">{seg.subBassIntensity}%</span>
                  </div>
                </div>

                {/* Jump to start of segment */}
                <button
                  onClick={() => onSeek(seg.startTime)}
                  className={`flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                  title={`Springe zu ${formatTimeSeconds(seg.startTime)}`}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isCurrent ? 'Aktiv' : 'Anspringen'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
