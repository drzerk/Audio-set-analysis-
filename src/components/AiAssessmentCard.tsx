import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Volume2, Music, Award, ArrowUpRight } from 'lucide-react';
import { AiAssessment, TechnoSetAnalysis } from '../types';

interface AiAssessmentCardProps {
  currentSet: TechnoSetAnalysis;
  onUpdateAssessment: (newAssessment: AiAssessment) => void;
}

export const AiAssessmentCard: React.FC<AiAssessmentCardProps> = ({
  currentSet,
  onUpdateAssessment
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const assessment = currentSet.aiAssessment;

  const handleRunAiAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const summaryPayload = {
        name: currentSet.name,
        durationSeconds: currentSet.duration,
        bpmAverage: currentSet.bpmAverage,
        bpmMin: currentSet.bpmMin,
        bpmMax: currentSet.bpmMax,
        dominantKey: currentSet.dominantKey,
        transitionsCount: currentSet.transitions.length,
        averageTransitionScore: Math.round(
          currentSet.transitions.reduce((a, b) => a + b.qualityScore, 0) / (currentSet.transitions.length || 1)
        ),
        peakMomentsCount: currentSet.peakMoments.length,
        technicalMetrics: currentSet.technicalMetrics
      };

      const res = await fetch('/api/ai/analyze-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setSummary: summaryPayload })
      });

      const data = await res.json();
      if (data.success && data.assessment) {
        onUpdateAssessment(data.assessment);
      } else {
        setErrorMsg(data.error || 'Fehler beim Abrufen der KI-Analyse');
      }
    } catch (err: any) {
      setErrorMsg('Netzwerkfehler: Bitte prüfe die Verbindung oder nutze den Offline-Modus.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!assessment) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl text-center">
        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="font-mono text-base font-bold text-zinc-100 mb-1">
          Noch keine KI-Gesamtbewertung vorhanden
        </h3>
        <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto mb-4">
          Generiere eine tiefgehende audio-technische und energetische Einschätzung deines Techno-Sets via Gemini AI.
        </p>
        <button
          onClick={handleRunAiAnalysis}
          disabled={isLoading}
          className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs flex items-center gap-2 mx-auto cursor-pointer"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Jetzt KI-Analyse starten</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="ai-master-assessment-card"
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
            MASTER-EINSCHÄTZUNG & CROWD-PSYCHOLOGIE
          </h3>
        </div>

        <button
          id="btn-refresh-ai-assessment"
          onClick={handleRunAiAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-all cursor-pointer"
          title="Erneute Analyse mit Gemini AI anstoßen"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analysiere Set...' : 'Neu analysieren'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-800/60 p-2.5 rounded text-xs font-mono text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Main Headline & Scores */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-4 rounded-lg border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
            {assessment.vibeProfile}
          </span>
          <h4 className="font-mono text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
            "{assessment.headline}"
          </h4>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-lg text-center font-mono">
            <div className="text-[10px] text-zinc-500 uppercase">Technik-Score</div>
            <div className="text-xl font-black text-emerald-400">
              {assessment.technicalRating}
              <span className="text-xs text-zinc-500 font-normal">/100</span>
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-lg text-center font-mono">
            <div className="text-[10px] text-zinc-500 uppercase">Energie-Level</div>
            <div className="text-xl font-black text-amber-400">
              {assessment.energyRating}
              <span className="text-xs text-zinc-500 font-normal">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        {/* Sub-Bass & Low-End */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tiefbass & Low-End Druck</span>
          </div>
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            {assessment.subBassBalance}
          </p>
        </div>

        {/* Harmonic Flow */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-purple-400 font-bold">
            <Music className="w-3.5 h-3.5" />
            <span>Harmonie & Camelot-Flow</span>
          </div>
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            {assessment.harmonicFlow}
          </p>
        </div>

        {/* Pacing Analysis */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>Spannungsbogen & Crowd-Flow</span>
          </div>
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            {assessment.pacingAnalysis}
          </p>
        </div>
      </div>

      {/* Actionable Pro-DJ Transition Tips */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3.5">
        <h5 className="font-mono text-xs font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Konkrete Empfehlungen für Übergänge & Performance:
        </h5>
        <ul className="space-y-1.5 font-mono text-[11px] text-zinc-300">
          {assessment.transitionTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stage PA Verdict */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3 font-mono">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-xs">
          <span className="text-emerald-400 font-bold mr-1">Bühnen-Empfehlung:</span>
          <span className="text-zinc-200">{assessment.recommendation}</span>
        </div>
      </div>
    </div>
  );
};
