import React from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  Compass,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { AppWorkspaceTab, TechnoSetAnalysis } from '../types';

interface ContextHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppWorkspaceTab;
  currentSet: TechnoSetAnalysis;
  onOpenTour: () => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
}

export const ContextHelpDrawer: React.FC<ContextHelpDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  currentSet,
  onOpenTour,
  onSelectTab
}) => {
  if (!isOpen) return null;

  const contentByTab: Record<
    AppWorkspaceTab,
    {
      title: string;
      whereAmI: string;
      whatDoISee: string;
      whyImportant: string;
      proTips: string[];
      commonMistakes: string;
      nextAction: string;
      nextTab?: AppWorkspaceTab;
    }
  > = {
    dashboard: {
      title: 'Übersicht & Deck',
      whereAmI: 'Haupt-Schaltzentrale und Live-Playback deines DJ-Sets.',
      whatDoISee:
        'Den Status-Überblick über dein gesamtes Set (BPM, Phasen-Sync-Genauigkeit, nächste Übergänge), den interaktiven Audioplayer mit Wellenform und den Phasen-Delta-Monitor.',
      whyImportant:
        'Hier hörst du dein Set live ab, springst per Klick direkt in Übergänge und erkennst sofort, ob zwei Tracks rhythmisch auseinanderdriften.',
      proTips: [
        'Drücke die Leertaste oder klicke auf die Timeline, um an beliebigen Stellen hineinzuhören.',
        'Klicke auf den Auto-Align Button, um einen simulierten Phasenversatz sofort auf 0 ms zu locken.',
        'Nutze die Mini-Map ganz oben für die visuelle Dichte des gesamten Sets.'
      ],
      commonMistakes:
        'Galoppierende Kicks entstehen meist schon bei mehr als 8 ms Zeitversatz. Achte auf den Phasenwinkel unter 45°.',
      nextAction: 'Prüfe als Nächstes den gesamten BPM- und Harmonieverlauf in der Set-Dynamik.',
      nextTab: 'dynamics'
    },
    dynamics: {
      title: 'Set-Dynamik & Kurven',
      whereAmI: 'Analysebereich für Tempo, Tonarten und Spannungsbogen.',
      whatDoISee:
        'Die BPM- und Camelot-Harmoniekurve über die Zeit, die automatische Einteilung in Phasen (Intro, Build, Peak, Outro) und den Vergleich mit Club-Zielprofilen.',
      whyImportant:
        'Ein erfolgreiches Techno-Set braucht einen durchdachten Aufbau. Plötzliche Tempowechsel oder unpassende Tonartsprünge brechen die Trance auf der Tanzfläche.',
      proTips: [
        'Prüfe, ob BPM-Steigerungen allmählich (z.B. +1 bis +2 BPM über 20 Minuten) erfolgen.',
        'Das Camelot-Rad empfiehlt Schritte von ±1 Ziffer (z.B. 8A → 9A oder 8A → 8B).',
        'Vergleiche dein Set mit dem Profil „Peak-Time Techno“ für Festival-taugliche Dynamik.'
      ],
      commonMistakes:
        'Zu viele unharmonische Tonsprünge hintereinander erzeugen emotionale Unruhe statt hypnotischer Energie.',
      nextAction: 'Untersuche nun kritische Einzel-Übergänge im Mix-Inspektor.',
      nextTab: 'diagnosis'
    },
    diagnosis: {
      title: 'Mix-Inspektor & Diagnose',
      whereAmI: 'Diagnose-Werkstatt für Übergänge, EQ-Clashes und Drops.',
      whatDoISee:
        'Eine tabellarische Auflistung jedes einzelnen Übergangs mit Einzelbewertungen, den EQ-Mud-Advisor für Frequenz-Sauberkeit unter 120 Hz und das Peak-Radar.',
      whyImportant:
        'Hier deckst du technische Schwachstellen auf: Bass-Matsch (Kick & Bassline beider Tracks gleichzeitig laut) und Rhythmus-Galoppieren.',
      proTips: [
        'Klicke bei einem Übergang auf „Anhören“, um 12 Sekunden vor dem Blend einzutauchen.',
        'Der EQ Mud Advisor zeigt exakt an, bei welchem Track der Bass-EQ abgesenkt werden sollte.',
        'Füge über „+ Übergang“ eigene Markierungen an der aktuellen Abspielposition hinzu.'
      ],
      commonMistakes:
        'Beide Basslines voll aufgedreht im Übergang: Das überlastet den Limiter und raubt dem Club-Sound den Druck.',
      nextAction: 'Nutze die KI-Vorschläge, um Track-Auswahl und Spannungsbogen zu optimieren.',
      nextTab: 'assistant'
    },
    assistant: {
      title: 'KI-Assistent & Vorschläge',
      whereAmI: 'Intelligente Set-Bewertung und Track-Empfehlungs-Bibliothek.',
      whatDoISee:
        'Das Master-Feedback zur psychologischen Wirkung auf die Tanzfläche, Verbesserungsvorschläge für das nächste Mal und passende Track-Empfehlungen nach BPM und Tonart.',
      whyImportant:
        'Hilft dir, aus deinen Fehlern zu lernen, dein Track-Management zu verfeinern und das Set für Veröffentlichungen auf SoundCloud oder Mixcloud vorzubereiten.',
      proTips: [
        'Klicke bei einem Auto-Mix-Vorschlag auf „Übergang vormerken“, um ihn in die Setlist einzuplanen.',
        'Nutze den PDF-Export (oben rechts), um einen vollständigen Rider-Bericht mitzunehmen.'
      ],
      commonMistakes:
        'Nur auf die BPM achten und die Tonart ignorieren führt zu Dissonanzen im Intro-Blend.',
      nextAction: 'Exportiere jetzt deinen vollständigen Set-Report als druckreifes PDF.',
      nextTab: 'help'
    },
    help: {
      title: 'Hilfe-Center & Glossar',
      whereAmI: 'Umfassendes Handbuch, FAQ und DJ-Grundlagen.',
      whatDoISee:
        'Erklärungen aller Fachbegriffe (Camelot, Phase-Sync, Kammfilter, LUFS), Schritt-für-Schritt-Anleitungen und die Möglichkeit, die geführte Tour neu zu starten.',
      whyImportant:
        'Hier verstehst du die akustischen Grundlagen hinter den Messwerten und verbesserst deine DJ-Technik nachhaltig.',
      proTips: [
        'Starte die interaktive App-Tour, falls du dir unsicher über die Bedienung bist.',
        'Alle Analysedaten bleiben lokal in deinem Browser gespeichert.'
      ],
      commonMistakes:
        'Sich nur auf Sync-Buttons zu verlassen, anstatt die Transienten im Waveform-Overlay visuell und akustisch zu prüfen.',
      nextAction: 'Zurück zum Hauptdashboard, um dein Set zu analysieren.',
      nextTab: 'dashboard'
    }
  };

  const current = contentByTab[activeTab];

  return (
    <div
      id="context-help-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0e1015] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      role="complementary"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#13151c]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              KONTEXT-ASSISTENT
            </span>
            <h3 className="text-sm font-bold text-white">{current.title}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Hilfe schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs">
        {/* 1. Wo bin ich? */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 uppercase text-[10px] tracking-wider font-mono">
            <Compass className="w-3.5 h-3.5" />
            <span>Wo befinde ich mich?</span>
          </div>
          <p className="text-slate-200 leading-relaxed">{current.whereAmI}</p>
        </div>

        {/* 2. Was sehe ich hier? */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 uppercase text-[10px] tracking-wider font-mono">
            <Layers className="w-3.5 h-3.5" />
            <span>Was wird hier angezeigt?</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{current.whatDoISee}</p>
        </div>

        {/* 3. Warum ist das wichtig? */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-purple-400 uppercase text-[10px] tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Warum ist das für mein Set wichtig?</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{current.whyImportant}</p>
        </div>

        {/* 4. Pro-Tipps & Handlungsanweisungen */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-300 uppercase text-[10px] tracking-wider font-mono">
            <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
            <span>DJ-Booth Praxistipps</span>
          </div>
          <ul className="flex flex-col gap-1.5 text-slate-300">
            {current.proTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 5. Typischer Anfängerfehler */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase text-[10px] tracking-wider font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Häufiger Fehler im Club</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">{current.commonMistakes}</p>
        </div>

        {/* 6. Nächster empfohlener Schritt */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold">
            Empfohlener nächster Schritt
          </div>
          <p className="text-white font-medium">{current.nextAction}</p>
          {current.nextTab && (
            <button
              onClick={() => {
                onSelectTab(current.nextTab!);
                onClose();
              }}
              className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Jetzt öffnen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#13151c] flex items-center justify-between gap-3">
        <button
          onClick={onOpenTour}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Interaktive Tour starten</span>
        </button>

        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono rounded-lg transition-colors cursor-pointer"
        >
          Schließen
        </button>
      </div>
    </div>
  );
};
