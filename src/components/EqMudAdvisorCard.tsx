import React, { useState, useMemo } from 'react';
import {
  TechnoSetAnalysis,
  TransitionItem,
  HardwareMixerType,
  EqCutRecommendation
} from '../types';
import { generateTransitionEqAdvice, getKeyAcoustics } from '../utils/eqFrequencyAdvisor';
import { formatTimeSeconds } from '../utils/pdfExport';
import { TechnoPreviewAudioEngine } from '../utils/audioAnalyzer';
import {
  Sliders,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Radio,
  Zap,
  Activity,
  Disc
} from 'lucide-react';

interface EqMudAdvisorCardProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onSeek: (time: number) => void;
  audioEngine?: TechnoPreviewAudioEngine | null;
}

export const EqMudAdvisorCard: React.FC<EqMudAdvisorCardProps> = ({
  currentSet,
  currentTime,
  onSeek,
  audioEngine
}) => {
  const transitions = currentSet.transitions || [];

  // Default to transition nearest to playhead, or first transition
  const nearestTransition = useMemo(() => {
    if (transitions.length === 0) return null;
    return transitions.reduce((prev, curr) =>
      Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime) ? curr : prev
    );
  }, [transitions, currentTime]);

  const [selectedTransitionId, setSelectedTransitionId] = useState<string>(
    nearestTransition ? nearestTransition.id : transitions[0]?.id || ''
  );

  const [selectedMixer, setSelectedMixer] = useState<HardwareMixerType>('xone96');
  const [bypassedCutIds, setBypassedCutIds] = useState<Set<string>>(new Set());
  const [hoveredFreq, setHoveredFreq] = useState<{
    freqHz: number;
    rawDb: number;
    carvedDb: number;
    mudDb: number;
    xPct: number;
  } | null>(null);

  // Audio preview simulation state
  const [simMode, setSimMode] = useState<'normal' | 'muddy' | 'carved'>('normal');

  // Currently inspected transition
  const activeTransition = useMemo(() => {
    return transitions.find((t) => t.id === selectedTransitionId) || transitions[0] || null;
  }, [transitions, selectedTransitionId]);

  // Compute EQ Mud advice for the selected transition
  const eqAdvice = useMemo(() => {
    if (!activeTransition) return null;
    return generateTransitionEqAdvice(activeTransition);
  }, [activeTransition]);

  // Handle sync to playhead
  const handleSyncToPlayhead = () => {
    if (nearestTransition) {
      setSelectedTransitionId(nearestTransition.id);
    }
  };

  // Toggle bypass on a specific cut
  const handleToggleCutBypass = (cutId: string) => {
    setBypassedCutIds((prev) => {
      const next = new Set(prev);
      if (next.has(cutId)) {
        next.delete(cutId);
      } else {
        next.add(cutId);
      }
      return next;
    });
  };

  // Reset all bypasses
  const handleResetBypasses = () => {
    setBypassedCutIds(new Set());
  };

  // Audio engine simulation toggle
  const handleSimulateAudio = (mode: 'normal' | 'muddy' | 'carved') => {
    setSimMode(mode);
    if (audioEngine) {
      audioEngine.setEqCarveMode(mode);
    }
  };

  if (!activeTransition || !eqAdvice) {
    return (
      <div className="bg-[#121214] border border-white/5 p-4 rounded text-center text-slate-500 font-mono text-xs">
        Keine Übergänge zur Frequenz-Entzerrung im aktuellen Set vorhanden.
      </div>
    );
  }

  // Helpers for logarithmic frequency mapping (20 Hz to 20,000 Hz)
  const minFreq = 20;
  const maxFreq = 20000;
  const freqToPct = (freq: number) => {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logVal = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));
    return ((logVal - logMin) / (logMax - logMin)) * 100;
  };

  // Map dB (-45 to 0) to Y percent (100 to 0)
  const dbToYPct = (db: number) => {
    const clamped = Math.max(-45, Math.min(0, db));
    return ((0 - clamped) / 45) * 100;
  };

  // Calculate dynamic curve points considering active vs bypassed cuts
  const dynamicSpectralPoints = eqAdvice.spectralSimulation.map((pt) => {
    let effectiveCarvedDb = pt.carvedCombinedDb;

    // If sub cut is bypassed
    const subCutBypassed = eqAdvice.recommendedCuts.some(
      (c) => c.band === 'sub-low' && bypassedCutIds.has(c.id)
    );
    if (subCutBypassed && pt.freqHz < 95) {
      effectiveCarvedDb = pt.rawCombinedDb;
    }

    // If low-mid cut is bypassed
    const lowMidCutBypassed = eqAdvice.recommendedCuts.some(
      (c) => c.band === 'low-mid' && bypassedCutIds.has(c.id)
    );
    if (lowMidCutBypassed && pt.freqHz >= 140 && pt.freqHz <= 320) {
      effectiveCarvedDb = pt.rawCombinedDb;
    }

    // If mid cut is bypassed
    const midCutBypassed = eqAdvice.recommendedCuts.some(
      (c) => c.band === 'mid' && bypassedCutIds.has(c.id)
    );
    if (midCutBypassed && pt.freqHz >= 450 && pt.freqHz <= 850) {
      effectiveCarvedDb = pt.rawCombinedDb;
    }

    return {
      ...pt,
      effectiveCarvedDb
    };
  });

  // SVG path for uncorrected raw curve
  const rawPathData = dynamicSpectralPoints
    .map((pt, idx) => {
      const x = freqToPct(pt.freqHz);
      const y = dbToYPct(pt.rawCombinedDb);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // SVG path for carved curve
  const carvedPathData = dynamicSpectralPoints
    .map((pt, idx) => {
      const x = freqToPct(pt.freqHz);
      const y = dbToYPct(pt.effectiveCarvedDb);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // SVG path for shaded mud area between raw and carved curves
  const mudShadedPathData = `${rawPathData} L ${freqToPct(20000)} ${dbToYPct(
    dynamicSpectralPoints[dynamicSpectralPoints.length - 1].effectiveCarvedDb
  )} ${dynamicSpectralPoints
    .slice()
    .reverse()
    .map((pt) => `L ${freqToPct(pt.freqHz).toFixed(1)} ${dbToYPct(pt.effectiveCarvedDb).toFixed(1)}`)
    .join(' ')} Z`;

  // Risk meter badge styles
  const riskBadgeClass =
    eqAdvice.mudRiskLevel === 'severe'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
      : eqAdvice.mudRiskLevel === 'high'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : eqAdvice.mudRiskLevel === 'moderate'
      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  const riskLabel =
    eqAdvice.mudRiskLevel === 'severe'
      ? 'SEHR HOCH (DRÖHN-GEFAHR)'
      : eqAdvice.mudRiskLevel === 'high'
      ? 'HOCH (LOW-MID MATSCH)'
      : eqAdvice.mudRiskLevel === 'moderate'
      ? 'MODERAT'
      : 'MINIMAL (SAUBER)';

  return (
    <div
      id="eq-mud-advisor-card"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-3"
    >
      {/* 1. Header Bar with Transition Picker & Risk Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              HARMONISCHER EQ-MUD ADVISOR & FREQUENZ-SCHNITT EMPFEHLUNGEN
              <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${riskBadgeClass}`}>
                MATSCH-RISIKO: {eqAdvice.mudRiskIndex}% — {riskLabel}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Spezifische EQ-Cuts und Frequenz-Bereinigungen gegen Bass-Kollisionen und Low-Mid-Wummern bei Track-Überlappungen.
            </p>
          </div>
        </div>

        {/* Transition Quick Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selectedTransitionId}
            onChange={(e) => setSelectedTransitionId(e.target.value)}
            className="bg-black/60 border border-white/10 text-white font-mono text-[10px] px-2 py-1 rounded focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {transitions.map((t, idx) => (
              <option key={t.id} value={t.id}>
                #{idx + 1} @ {formatTimeSeconds(t.timestamp)} ({t.fromKey} → {t.toKey}) [BASS: {t.eqClashRisk.toUpperCase()}]
              </option>
            ))}
          </select>

          {nearestTransition && (
            <button
              onClick={handleSyncToPlayhead}
              className="text-[9px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
              title="Springe zum Übergang, der am nächsten zum aktuellen Abspielzeitpunkt liegt"
            >
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              <span>Am Playhead ({formatTimeSeconds(currentTime)})</span>
            </button>
          )}

          <button
            onClick={() => onSeek(Math.max(0, activeTransition.timestamp - 10))}
            className="text-[9px] font-mono px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="10 Sekunden vor dem Übergang vorhören"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Vorhören ({formatTimeSeconds(activeTransition.timestamp)})</span>
          </button>
        </div>
      </div>

      {/* 2. Key Acoustics & Mud Diagnostics Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0A0A0B] border border-white/5 p-2.5 rounded font-mono text-[10px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 text-[9px] uppercase">Tonart & Grundtöne:</span>
          <div className="flex items-center gap-1.5 text-purple-300 font-bold">
            <span>{activeTransition.fromKey} ({eqAdvice.fromKeyRootHz.toFixed(1)} Hz)</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span>{activeTransition.toKey} ({eqAdvice.toKeyRootHz.toFixed(1)} Hz)</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Camelot-Abstand: {eqAdvice.camelotDistance} Stufen ({activeTransition.duration}s Mix-Dauer)
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 text-[9px] uppercase">Kritische Matsch-Frequenz:</span>
          <span className="text-pink-400 font-bold text-[11px]">
            {eqAdvice.primaryMudZoneHz} (Low-Mid Bauch)
          </span>
          <span className="text-[9px] text-slate-400">
            Resonanzüberlagerung & Phasen-Schwebung
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500 text-[9px] uppercase">Diagnostischer Befund:</span>
          <p className="text-[9px] text-slate-300 leading-tight">
            {eqAdvice.fundamentalCollision}
          </p>
        </div>
      </div>

      {/* 3. Interactive Spectrum Curve: Raw Overlap vs. Surgically Carved Master */}
      <div className="bg-[#0A0A0B] border border-white/5 p-2.5 rounded flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" />
              FREQUENZ-SPEKTRUM & MUD-REDUKTION (20 Hz - 20 kHz)
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-3 h-0.5 border-t-2 border-rose-500 border-dashed" />
              <span>Ungeschnittene Überlappung (Matsch)</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-3 h-1 bg-emerald-400 rounded-full" />
              <span>Bereinigter Mix (Nach EQ-Cuts)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/60" />
              <span>Gefilterter Matsch</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bypassedCutIds.size > 0 && (
              <button
                onClick={handleResetBypasses}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Alle Cuts aktivieren ({bypassedCutIds.size} pausiert)</span>
              </button>
            )}
            <span className="text-slate-500">Hover über Spektrum für Live-dB</span>
          </div>
        </div>

        {/* SVG Spectrum Canvas */}
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            // Invert log freq
            const logMin = Math.log10(minFreq);
            const logMax = Math.log10(maxFreq);
            const logVal = logMin + (xPct / 100) * (logMax - logMin);
            const freqHz = Math.round(Math.pow(10, logVal));

            // Closest simulation point
            const closest = dynamicSpectralPoints.reduce((prev, curr) =>
              Math.abs(curr.freqHz - freqHz) < Math.abs(prev.freqHz - freqHz) ? curr : prev
            );

            setHoveredFreq({
              freqHz,
              rawDb: closest.rawCombinedDb,
              carvedDb: closest.effectiveCarvedDb,
              mudDb: Math.max(0, Math.round((closest.rawCombinedDb - closest.effectiveCarvedDb) * 10) / 10),
              xPct
            });
          }}
          onMouseLeave={() => setHoveredFreq(null)}
          className="relative h-40 sm:h-44 w-full bg-black/80 border border-white/5 rounded overflow-hidden cursor-crosshair select-none"
        >
          {/* Decibel Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-20 pointer-events-none">
            <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">0 dB (Peak Limit)</div>
            <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">-12 dB</div>
            <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">-24 dB</div>
            <div className="border-b border-slate-600 border-dashed w-full text-[8px] text-slate-500">-36 dB</div>
          </div>

          {/* Log Frequency Vertical Markings */}
          <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-slate-600 opacity-40 pointer-events-none">
            <span style={{ left: `${freqToPct(30)}%` }} className="absolute bottom-1">30Hz</span>
            <span style={{ left: `${freqToPct(85)}%` }} className="absolute bottom-1">85Hz</span>
            <span style={{ left: `${freqToPct(250)}%` }} className="absolute bottom-1">250Hz</span>
            <span style={{ left: `${freqToPct(620)}%` }} className="absolute bottom-1">620Hz</span>
            <span style={{ left: `${freqToPct(2500)}%` }} className="absolute bottom-1">2.5kHz</span>
            <span style={{ left: `${freqToPct(8000)}%` }} className="absolute bottom-1">8kHz</span>
          </div>

          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mudAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Shaded Mud Zone */}
            <path d={mudShadedPathData} fill="url(#mudAreaGrad)" />

            {/* Uncorrected Muddy Curve */}
            <path
              d={rawPathData}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.8"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Carved Clean Curve */}
            <path
              d={carvedPathData}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Render Cut Filter Hotspots & Handles */}
          {eqAdvice.recommendedCuts.map((cut) => {
            const xPct = freqToPct(cut.centerFrequencyHz);
            const isBypassed = bypassedCutIds.has(cut.id);

            return (
              <div
                key={cut.id}
                style={{ left: `${xPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCutBypass(cut.id);
                }}
                className={`absolute top-0 bottom-0 w-0.5 group cursor-pointer z-10 ${
                  isBypassed ? 'opacity-40' : 'opacity-100'
                }`}
                title={`Klick zum ${isBypassed ? 'Aktivieren' : 'Bypass'}: ${cut.actionSummary}`}
              >
                {/* Vertical marker */}
                <div
                  className={`w-full h-full ${
                    isBypassed ? 'bg-slate-600' : 'bg-emerald-400'
                  }`}
                />

                {/* Pin Head */}
                <div
                  className={`absolute top-1.5 -ml-2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-bold shadow-lg transition-transform group-hover:scale-125 ${
                    isBypassed
                      ? 'bg-slate-700 text-slate-400 border border-slate-500'
                      : 'bg-emerald-400 text-black border-2 border-white'
                  }`}
                >
                  {isBypassed ? 'OFF' : 'CUT'}
                </div>

                {/* Floating frequency label */}
                <div className="absolute top-7 -translate-x-1/2 left-1/2 bg-black/90 border border-white/20 rounded px-1 py-0.5 text-[8px] font-mono text-white whitespace-nowrap pointer-events-none opacity-80 group-hover:opacity-100">
                  {cut.centerFrequencyHz} Hz ({cut.cutGainDb} dB)
                </div>
              </div>
            );
          })}

          {/* Hover Measurement Hairline */}
          {hoveredFreq && (
            <div
              style={{ left: `${hoveredFreq.xPct}%` }}
              className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none border-l border-dashed border-white z-20"
            />
          )}
        </div>

        {/* Real-time Hover Readout */}
        {hoveredFreq ? (
          <div className="p-1.5 rounded bg-black/60 border border-emerald-500/20 flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-300">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">FREQUENZ: {hoveredFreq.freqHz} Hz</span>
              <span className="text-rose-400">Vorher: {hoveredFreq.rawDb} dB</span>
              <span className="text-emerald-400">Nach Cut: {hoveredFreq.carvedDb} dB</span>
              {hoveredFreq.mudDb > 0 && (
                <span className="text-amber-300 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                  Bereinigter Matsch: -{hoveredFreq.mudDb} dB
                </span>
              )}
            </div>
            <span className="text-slate-500 text-[8px]">
              Klick auf Schnitt-Punkte im Spektrum zum De-/Aktivieren
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 px-1">
            <span>Sub-Bereich (20-90Hz)</span>
            <span>Matsch-Bauch (150-320Hz)</span>
            <span>Präsenz & Mitten (500Hz-2kHz)</span>
            <span>Brillanz & Air (5-20kHz)</span>
          </div>
        )}
      </div>

      {/* 4. Hardware Mixer Knob Guide (DJM-900 / Xone:96 / V10 / DAW) */}
      <div className="bg-[#0A0A0B] border border-white/5 p-2.5 rounded flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Disc className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
              HARDWARE-MIXER DREHREGLER & POTI-EINSTELLUNGEN
            </span>
          </div>

          {/* Mixer Gear Tabs */}
          <div className="flex items-center bg-black/70 border border-white/10 rounded p-0.5 text-[9px] font-mono">
            <button
              onClick={() => setSelectedMixer('xone96')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedMixer === 'xone96' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Allen & Heath Xone:96 (4-Band)
            </button>
            <button
              onClick={() => setSelectedMixer('djm900')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedMixer === 'djm900' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pioneer DJM-900 / A9 (3-Band)
            </button>
            <button
              onClick={() => setSelectedMixer('djmV10')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedMixer === 'djmV10' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pioneer DJM-V10 (4-Band Pro)
            </button>
            <button
              onClick={() => setSelectedMixer('parametric')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedMixer === 'parametric' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              DAW / Parametric EQ (Hz/Q)
            </button>
          </div>
        </div>

        {/* Knob Settings Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {eqAdvice.recommendedCuts.map((cut) => {
            const isBypassed = bypassedCutIds.has(cut.id);
            const setting =
              selectedMixer === 'xone96'
                ? cut.hardwareKnobSettings.xone96
                : selectedMixer === 'djm900'
                ? cut.hardwareKnobSettings.djm900
                : selectedMixer === 'djmV10'
                ? cut.hardwareKnobSettings.djmV10
                : null;

            return (
              <div
                key={cut.id}
                className={`p-2 rounded border transition-all ${
                  isBypassed
                    ? 'bg-black/30 border-white/5 opacity-50'
                    : 'bg-black/60 border-purple-500/20 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-mono font-bold text-slate-300">
                    {cut.targetMudIssue}
                  </span>
                  <span
                    className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                      cut.priority === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : cut.priority === 'recommended'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cut.priority}
                  </span>
                </div>

                {setting ? (
                  <div className="flex flex-col gap-0.5 font-mono text-[9px]">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>{setting.knob}:</span>
                      <span className="text-white bg-white/10 px-1 rounded">{setting.position}</span>
                    </div>
                    <p className="text-slate-400 text-[8.5px] leading-tight mt-0.5">
                      {setting.action}
                    </p>
                  </div>
                ) : (
                  <div className="font-mono text-[9px] text-slate-300 flex flex-col gap-0.5">
                    <div>Frequenz: <strong className="text-white">{cut.hardwareKnobSettings.parametric.freq}</strong></div>
                    <div>Gain-Cut: <strong className="text-pink-400">{cut.hardwareKnobSettings.parametric.gain}</strong></div>
                    <div>Güte (Q): <strong className="text-slate-200">{cut.hardwareKnobSettings.parametric.q}</strong></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Actionable Mix Choreography (Phrasing / Bars Guide) */}
      <div className="bg-[#0A0A0B] border border-white/5 p-2.5 rounded flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
              TAKT-FÜR-TAKT MIX-CHOREOGRAPHIE (MUD-FREE TRANSITION TIMELINE)
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">
            Dauer: {activeTransition.duration} Sekunden Überblendung
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {eqAdvice.mixChoreography.map((phase, idx) => (
            <div
              key={idx}
              className="bg-black/50 border border-white/5 p-2 rounded flex flex-col justify-between gap-1.5 font-mono text-[9px]"
            >
              <div>
                <div className="flex items-center justify-between text-amber-400 font-bold mb-0.5">
                  <span>{phase.phase}</span>
                  <span className="text-[8px] bg-amber-500/10 px-1 rounded border border-amber-500/20">
                    {phase.bars}
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">
                  {phase.action}
                </p>
              </div>

              <div className="bg-white/5 p-1 rounded text-[8px] text-emerald-300 border border-white/5">
                <strong className="text-slate-400">EQ-Aktion: </strong>
                {phase.eqMove}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Live Audio A/B Mud-Simulator Test & Actions */}
      <div className="border-t border-white/5 pt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">A/B Audio-Test:</span>
          <div className="flex items-center bg-black/60 border border-white/10 rounded p-0.5">
            <button
              onClick={() => handleSimulateAudio('normal')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                simMode === 'normal' ? 'bg-white/20 text-white font-bold' : 'text-slate-500 hover:text-white'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => handleSimulateAudio('muddy')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                simMode === 'muddy' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-500 hover:text-white'
              }`}
              title="Simuliert 2 kollidierende Kicks und dröhnende 220Hz Resonanz im Audio-Player"
            >
              Matsch-Simulation (+Boom)
            </button>
            <button
              onClick={() => handleSimulateAudio('carved')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                simMode === 'carved' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-500 hover:text-white'
              }`}
              title="Simuliert sauberen Kick-Swap und entzerrte Mitten"
            >
              EQ-Carved (Clean)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500">
            Tipp: Führe den Kick-Tausch stets synchron auf Takt 1 des Haupt-Drops durch.
          </span>
          <button
            onClick={() => onSeek(Math.max(0, activeTransition.timestamp - 15))}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Mix vorhören (-15s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
