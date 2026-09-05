import React, { useState, useMemo } from 'react';
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  Play,
  Edit2,
  Trash2,
  Plus,
  Sliders,
  Sparkles,
  Save,
  ChevronDown,
  ChevronUp,
  Volume2,
  Activity
} from 'lucide-react';
import { TransitionItem, TechnoSetAnalysis } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';
import { generateTransitionEqAdvice } from '../utils/eqFrequencyAdvisor';
import { analyzeTransitionPhaseSync } from '../utils/phaseSyncAnalyzer';
import { PhaseSyncVisualizer } from './PhaseSyncVisualizer';
import { TransitionDriftHeatmap } from './TransitionDriftHeatmap';

interface TransitionInspectorProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onJumpToTransition: (t: TransitionItem) => void;
  onUpdateTransition: (updated: TransitionItem) => void;
  onDeleteTransition: (id: string) => void;
  onAddTransitionAtCurrentTime: () => void;
  audioBuffer?: AudioBuffer | null;
  onSeek?: (seconds: number) => void;
}

export const TransitionInspector: React.FC<TransitionInspectorProps> = ({
  currentSet,
  currentTime,
  onJumpToTransition,
  onUpdateTransition,
  onDeleteTransition,
  onAddTransitionAtCurrentTime,
  audioBuffer,
  onSeek
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'clash' | 'perfect' | 'drift'>('all');
  const [expandedEqId, setExpandedEqId] = useState<string | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);

  const transitions = currentSet.transitions;

  // Average quality calculation
  const avgQuality = Math.round(
    transitions.reduce((acc, t) => acc + t.qualityScore, 0) / (transitions.length || 1)
  );

  // Identify drift-prone transitions
  const driftProneTransitions = useMemo(() => {
    return transitions.filter((t) => {
      const psa = t.phaseSyncAnalysis || analyzeTransitionPhaseSync(t, audioBuffer);
      return psa.isDriftProne;
    });
  }, [transitions, audioBuffer]);

  const filteredTransitions = transitions.filter((t) => {
    if (filterType === 'perfect') return t.qualityScore >= 92;
    if (filterType === 'clash') return t.eqClashRisk === 'medium' || t.eqClashRisk === 'high';
    if (filterType === 'drift') {
      const psa = t.phaseSyncAnalysis || analyzeTransitionPhaseSync(t, audioBuffer);
      return psa.isDriftProne;
    }
    return true;
  });

  const startEdit = (t: TransitionItem) => {
    setEditingId(t.id);
    setEditNotes(t.notes);
  };

  const saveEdit = (t: TransitionItem) => {
    onUpdateTransition({
      ...t,
      notes: editNotes
    });
    setEditingId(null);
  };

  return (
    <div
      id="transition-quality-inspector"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-2.5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
            TRANSITION QUALITY LOG
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-400 font-mono font-bold">
            Ø {avgQuality}%
          </span>
          {driftProneTransitions.length > 0 ? (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
              onClick={() => setFilterType('drift')}
              title={`${driftProneTransitions.length} Übergänge mit Phasen-Drift erkannt`}
            >
              <Activity className="w-2.5 h-2.5" />
              {driftProneTransitions.length} DRIFT-RISIKO
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" />
              PHASEN-SYNCHRON
            </span>
          )}
        </div>

        {/* Filter & Quick Add Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Filter */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All ({transitions.length})
            </button>
            <button
              onClick={() => setFilterType('perfect')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterType === 'perfect' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              90%+
            </button>
            <button
              onClick={() => setFilterType('clash')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterType === 'clash' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Clash
            </button>
            <button
              onClick={() => setFilterType('drift')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'drift'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Nur drift-gefährdete Übergänge anzeigen"
            >
              <Activity className="w-2.5 h-2.5" />
              <span>Drift ({driftProneTransitions.length})</span>
            </button>
          </div>

          {/* Add Marker at Current Playhead */}
          <button
            id="btn-add-transition-marker"
            onClick={onAddTransitionAtCurrentTime}
            className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer uppercase"
            title={`Neuen Übergangs-Marker bei aktuellem Zeitpunkt (${formatTimeSeconds(currentTime)}) einfügen`}
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Marker ({formatTimeSeconds(currentTime)})</span>
          </button>
        </div>
      </div>

      {/* Transition Scorecards List */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredTransitions.length === 0 ? (
          <div className="text-center py-6 text-[10px] font-mono text-slate-500">
            Keine Übergänge entsprechen dem ausgewählten Filter.
          </div>
        ) : (
          filteredTransitions.map((t, idx) => {
            const isEditing = editingId === t.id;
            const isNearPlayhead = Math.abs(t.timestamp - currentTime) < 30;
            const phaseSync = t.phaseSyncAnalysis || analyzeTransitionPhaseSync(t, audioBuffer);

            const borderAccent =
              phaseSync.driftRisk === 'critical-flam'
                ? 'border-l-2 border-rose-500'
                : t.qualityScore >= 90
                ? 'border-l-2 border-emerald-500'
                : t.eqClashRisk === 'high' || t.qualityScore < 80
                ? 'border-l-2 border-pink-500'
                : 'border-l-2 border-amber-500';

            const scoreText =
              t.qualityScore >= 90
                ? 'text-emerald-400'
                : t.qualityScore >= 80
                ? 'text-amber-400'
                : 'text-pink-400';

            return (
              <div
                key={t.id}
                className={`pl-3 py-1.5 pr-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-r transition-all border border-white/5 ${borderAccent} ${
                  isNearPlayhead ? 'ring-1 ring-white/20' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  {/* Transition Meta & Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => onJumpToTransition(t)}
                      className="font-mono text-xs font-bold text-white hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      title="15s vor dem Übergang vorhören"
                    >
                      <Play className="w-3 h-3 fill-current text-amber-400" />
                      {formatTimeSeconds(t.timestamp)}
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({t.duration}s Mix)
                    </span>
                  </div>

                  {/* Badges & Scores */}
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    {/* Quality Score */}
                    <div
                      className={`font-bold ${scoreText}`}
                      title="Gesamte Übergangsqualität"
                    >
                      {t.qualityScore}% SCORE
                    </div>

                    {/* Phase Sync Drift Badge */}
                    <div
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase flex items-center gap-1 border ${
                        phaseSync.driftRisk === 'locked'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : phaseSync.driftRisk === 'mild-drift'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : phaseSync.driftRisk === 'drift-prone'
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      }`}
                      title={`Phasenversatz: ${phaseSync.timeDeltaMs > 0 ? '+' : ''}${phaseSync.timeDeltaMs}ms | Kohärenz: ${phaseSync.phaseCoherenceScore}% | Flam ab: Bar ${phaseSync.barsUntilFlam}`}
                    >
                      <Activity className="w-2.5 h-2.5" />
                      <span>
                        {phaseSync.driftRisk === 'locked'
                          ? `PHASE LOCKED (${phaseSync.timeDeltaMs > 0 ? '+' : ''}${phaseSync.timeDeltaMs}ms)`
                          : phaseSync.driftRisk === 'mild-drift'
                          ? `MILD DRIFT (${phaseSync.timeDeltaMs > 0 ? '+' : ''}${phaseSync.timeDeltaMs}ms)`
                          : phaseSync.driftRisk === 'drift-prone'
                          ? `DRIFT-PRONE (${phaseSync.timeDeltaMs > 0 ? '+' : ''}${phaseSync.timeDeltaMs}ms)`
                          : `CRITICAL FLAM (${phaseSync.timeDeltaMs > 0 ? '+' : ''}${phaseSync.timeDeltaMs}ms)`}
                      </span>
                    </div>

                    {/* Low-End Clash Badge */}
                    <div
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        t.eqClashRisk === 'low'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : t.eqClashRisk === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-pink-500/20 text-pink-400'
                      }`}
                      title="Kick / Subbass Kollisionsrisiko im Blend"
                    >
                      BASS: {t.eqClashRisk.toUpperCase()}
                    </div>

                    {/* Harmonies */}
                    <div className="text-[9px] text-purple-300 bg-purple-900/30 border border-purple-500/30 px-1 py-0.2 rounded font-bold">
                      {t.fromKey} → {t.toKey}
                    </div>

                    {/* Actions: Phase-Sync & EQ-Cuts Drawers */}
                    <div className="flex items-center gap-1 ml-1">
                      {/* Phase Sync Waveform Inspector Toggle */}
                      <button
                        id={`btn-toggle-phase-sync-${t.id}`}
                        onClick={() => {
                          setExpandedPhaseId(expandedPhaseId === t.id ? null : t.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          expandedPhaseId === t.id
                            ? 'bg-cyan-500 text-black shadow-sm'
                            : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'
                        }`}
                        title="Waveform-Phasenabgleich & Transienten-Drift inspizieren"
                      >
                        <Activity className="w-2.5 h-2.5" />
                        <span>Phase Sync</span>
                        {expandedPhaseId === t.id ? (
                          <ChevronUp className="w-2.5 h-2.5" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>

                      {/* EQ-Cuts Toggle */}
                      <button
                        onClick={() => setExpandedEqId(expandedEqId === t.id ? null : t.id)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          expandedEqId === t.id
                            ? 'bg-emerald-500 text-black'
                            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                        }`}
                        title="EQ-Cuts & Matsch-Entzerrung anzeigen"
                      >
                        <Sliders className="w-2.5 h-2.5" />
                        <span>EQ-Cuts</span>
                        {expandedEqId === t.id ? (
                          <ChevronUp className="w-2.5 h-2.5" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>

                      <button
                        onClick={() => startEdit(t)}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Notiz bearbeiten"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteTransition(t.id)}
                        className="p-1 rounded text-slate-600 hover:text-pink-400 hover:bg-white/10 transition-colors cursor-pointer"
                        title="Marker entfernen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 32-Bar Phase Drift Mini-Heatmap with Spike Highlighting */}
                <div className="mt-1.5 mb-2">
                  <TransitionDriftHeatmap
                    transition={t}
                    phaseSync={phaseSync}
                    currentTime={currentTime}
                    onSeekToBarTime={onSeek}
                  />
                </div>

                {/* Inline Expandable Phase Sync Waveform Inspector */}
                {expandedPhaseId === t.id && (
                  <div className="mt-2 mb-2">
                    <PhaseSyncVisualizer
                      transition={t}
                      audioBuffer={audioBuffer}
                      onUpdateTransition={onUpdateTransition}
                    />
                  </div>
                )}

                {/* Inline Expandable EQ Mud Cuts Drawer */}
                {expandedEqId === t.id && (() => {
                  const advice = generateTransitionEqAdvice(t);
                  return (
                    <div className="mt-2 mb-1.5 p-2.5 rounded bg-black/70 border border-emerald-500/30 flex flex-col gap-2 font-mono text-[9px]">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Sliders className="w-3 h-3" />
                          EMPFOHLENE EQ-SCHNITTE GEGEN MATSCH (RISIKO: {advice.mudRiskIndex}%)
                        </span>
                        <span className="text-pink-400 font-bold">
                          Fokus-Zone: {advice.primaryMudZoneHz}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {advice.recommendedCuts.map((cut) => (
                          <div
                            key={cut.id}
                            className="bg-white/5 p-1.5 rounded border border-white/5 flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold">{cut.actionSummary}</span>
                              <span
                                className={`text-[8px] px-1 py-0.2 rounded uppercase ${
                                  cut.priority === 'critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {cut.priority}
                              </span>
                            </div>
                            <div className="text-[8px] text-slate-400">
                              Hardware (Xone:96): {cut.hardwareKnobSettings.xone96.knob} @ {cut.hardwareKnobSettings.xone96.position}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[8.5px] text-slate-300 bg-emerald-950/20 border border-emerald-500/20 p-1.5 rounded">
                        <strong className="text-emerald-400">Kick-Swap Regel: </strong>
                        <span>{advice.mixChoreography[2]?.action || 'Subbass niemals gleichzeitig bei 100% überlappen lassen.'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Transition Notes & Editable Area */}
                {isEditing ? (
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="flex-1 bg-black border border-white/20 rounded px-2 py-0.5 text-[11px] font-mono text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Eigene DJ-Notiz zum Übergang..."
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(t)}
                      className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400 cursor-pointer uppercase"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-slate-300">
                    {t.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
