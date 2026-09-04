import React, { useState } from 'react';
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
  Save
} from 'lucide-react';
import { TransitionItem, TechnoSetAnalysis } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';

interface TransitionInspectorProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onJumpToTransition: (t: TransitionItem) => void;
  onUpdateTransition: (updated: TransitionItem) => void;
  onDeleteTransition: (id: string) => void;
  onAddTransitionAtCurrentTime: () => void;
}

export const TransitionInspector: React.FC<TransitionInspectorProps> = ({
  currentSet,
  currentTime,
  onJumpToTransition,
  onUpdateTransition,
  onDeleteTransition,
  onAddTransitionAtCurrentTime
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'clash' | 'perfect'>('all');

  const transitions = currentSet.transitions;

  // Average quality calculation
  const avgQuality = Math.round(
    transitions.reduce((acc, t) => acc + t.qualityScore, 0) / (transitions.length || 1)
  );

  const filteredTransitions = transitions.filter((t) => {
    if (filterType === 'perfect') return t.qualityScore >= 92;
    if (filterType === 'clash') return t.eqClashRisk === 'medium' || t.eqClashRisk === 'high';
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
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
            ÜBERGANGSQUALITÄT & TRANSITION RADAR
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-300 font-mono font-bold">
            Ø Score: {avgQuality}%
          </span>
        </div>

        {/* Filter & Quick Add Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Filter */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Alle ({transitions.length})
            </button>
            <button
              onClick={() => setFilterType('perfect')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'perfect' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              90%+ Nahtlos
            </button>
            <button
              onClick={() => setFilterType('clash')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterType === 'clash' ? 'bg-amber-950 text-amber-300 border border-amber-800/40' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Clash-Risiko
            </button>
          </div>

          {/* Add Marker at Current Playhead */}
          <button
            id="btn-add-transition-marker"
            onClick={onAddTransitionAtCurrentTime}
            className="flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all cursor-pointer"
            title={`Neuen Übergangs-Marker bei aktuellem Zeitpunkt (${formatTimeSeconds(currentTime)}) einfügen`}
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Marker bei {formatTimeSeconds(currentTime)}</span>
          </button>
        </div>
      </div>

      {/* Transition Scorecards List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredTransitions.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-zinc-500">
            Keine Übergänge entsprechen dem ausgewählten Filter.
          </div>
        ) : (
          filteredTransitions.map((t, idx) => {
            const isEditing = editingId === t.id;
            const isNearPlayhead = Math.abs(t.timestamp - currentTime) < 30;

            const scoreColor =
              t.qualityScore >= 92
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
                : t.qualityScore >= 84
                ? 'text-yellow-400 bg-yellow-950/40 border-yellow-500/40'
                : 'text-amber-400 bg-amber-950/40 border-amber-500/40';

            return (
              <div
                key={t.id}
                className={`bg-zinc-900/80 border rounded-lg p-3 transition-all ${
                  isNearPlayhead
                    ? 'border-cyan-500/80 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  {/* Transition Meta & Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => onJumpToTransition(t)}
                      className="font-mono text-sm font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                      title="15s vor dem Übergang vorhören"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                      {formatTimeSeconds(t.timestamp)}
                    </button>
                    <span className="text-[11px] font-mono text-zinc-500">
                      ({t.duration}s Mix)
                    </span>
                  </div>

                  {/* Badges & Scores */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {/* Quality Score */}
                    <div
                      className={`px-2 py-0.5 rounded border font-bold ${scoreColor}`}
                      title="Gesamte Übergangsqualität"
                    >
                      {t.qualityScore}% Qualität
                    </div>

                    {/* Low-End Clash Badge */}
                    <div
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        t.eqClashRisk === 'low'
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
                          : t.eqClashRisk === 'medium'
                          ? 'bg-amber-950/30 border-amber-800/40 text-amber-400'
                          : 'bg-red-950/30 border-red-800/40 text-red-400'
                      }`}
                      title="Kick / Subbass Kollisionsrisiko im Blend"
                    >
                      Bass: {t.eqClashRisk.toUpperCase()}
                    </div>

                    {/* Phasing Score */}
                    <div
                      className="text-[11px] text-zinc-400 hidden md:block"
                      title="Phasen-Kohärenz der Beat-Transienten"
                    >
                      Phase: <strong className="text-zinc-200">{t.phaseScore}%</strong>
                    </div>

                    {/* Harmonies */}
                    <div className="text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/40 px-1.5 py-0.5 rounded font-bold">
                      {t.fromKey} → {t.toKey}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Notiz bearbeiten"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransition(t.id)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Marker entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transition Notes & Editable Area */}
                {isEditing ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500"
                      placeholder="Eigene DJ-Notiz zum Übergang eingeben..."
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(t)}
                      className="flex items-center gap-1 text-xs font-mono px-3 py-1 bg-emerald-500 text-zinc-950 font-bold rounded hover:bg-emerald-400 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Speichern
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-zinc-400 bg-zinc-950/60 p-2 rounded border border-zinc-800/50">
                    <span className="text-zinc-500 mr-1">Anmerkung:</span>
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
