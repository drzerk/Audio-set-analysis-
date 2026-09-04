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
      <div className="bg-[#121214] border border-white/5 rounded p-6 text-center">
        <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
        <h3 className="font-mono text-sm font-bold text-white mb-1 uppercase tracking-wider">
          Noch keine KI-Gesamtbewertung vorhanden
        </h3>
        <p className="text-[10px] font-mono text-slate-400 max-w-md mx-auto mb-4">
          Generiere eine tiefgehende audio-technische und energetische Einschätzung deines Techno-Sets via Gemini AI.
        </p>
        <button
          onClick={handleRunAiAnalysis}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] flex items-center gap-2 mx-auto cursor-pointer uppercase tracking-wider"
        >
          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Jetzt KI-Analyse starten</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="ai-master-assessment-card"
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-2.5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <h3 className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">
            AI MASTER-EINSCHÄTZUNG & CROWD-PSYCHOLOGIE
          </h3>
        </div>

        <button
          id="btn-refresh-ai-assessment"
          onClick={handleRunAiAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer uppercase"
          title="Erneute Analyse mit Gemini AI anstoßen"
        >
          <RefreshCw className={`w-3 h-3 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analysiere...' : 'Neu analysieren'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-pink-950/40 border border-pink-800/60 p-2 rounded text-[10px] font-mono text-pink-300">
          {errorMsg}
        </div>
      )}

      {/* Main Headline & Scores */}
      <div className="bg-white/5 p-3 rounded border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest">
            {assessment.vibeProfile}
          </span>
          <h4 className="font-mono text-sm sm:text-base font-bold text-white mt-0.5">
            "{assessment.headline}"
          </h4>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-black/70 border border-white/10 p-2 rounded text-center font-mono min-w-[75px]">
            <div className="text-[9px] text-slate-500 uppercase">Technik</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {assessment.technicalRating}
              <span className="text-[9px] text-slate-500 font-normal">/100</span>
            </div>
          </div>
          <div className="bg-black/70 border border-white/10 p-2 rounded text-center font-mono min-w-[75px]">
            <div className="text-[9px] text-slate-500 uppercase">Energie</div>
            <div className="text-lg font-bold text-amber-400 font-mono">
              {assessment.energyRating}
              <span className="text-[9px] text-slate-500 font-normal">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
        {/* Sub-Bass & Low-End */}
        <div className="bg-white/5 border border-white/5 rounded p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
            <Volume2 className="w-3 h-3" />
            <span>Tiefbass & Low-End</span>
          </div>
          <p className="text-slate-300 text-[10px] leading-relaxed">
            {assessment.subBassBalance}
          </p>
        </div>

        {/* Harmonic Flow */}
        <div className="bg-white/5 border border-white/5 rounded p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[10px] uppercase">
            <Music className="w-3 h-3" />
            <span>Harmonie & Camelot</span>
          </div>
          <p className="text-slate-300 text-[10px] leading-relaxed">
            {assessment.harmonicFlow}
          </p>
        </div>

        {/* Pacing Analysis */}
        <div className="bg-white/5 border border-white/5 rounded p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[10px] uppercase">
            <Award className="w-3 h-3" />
            <span>Dramaturgie & Pacing</span>
          </div>
          <p className="text-slate-300 text-[10px] leading-relaxed">
            {assessment.pacingAnalysis}
          </p>
        </div>
      </div>

      {/* Actionable Pro-DJ Transition Tips */}
      <div className="bg-white/[0.02] border border-white/5 rounded p-2.5">
        <h5 className="font-mono text-[10px] font-bold text-white mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Empfehlungen für Set-Performance:
        </h5>
        <ul className="space-y-1 font-mono text-[10px] text-slate-300">
          {assessment.transitionTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stage PA Verdict */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 flex items-center gap-2.5 font-mono">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="text-[10px]">
          <span className="text-emerald-400 font-bold mr-1">BÜHNEN-FAZIT:</span>
          <span className="text-slate-200">{assessment.recommendation}</span>
        </div>
      </div>
    </div>
  );
};
