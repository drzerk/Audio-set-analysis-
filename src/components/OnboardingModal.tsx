import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Radio,
  AudioWaveform,
  Activity,
  Layers,
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  HelpCircle,
  Disc3,
  Gauge
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: 'dashboard' | 'dynamics' | 'diagnosis' | 'assistant' | 'help') => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectTab
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Willkommen beim TechnoSet Analyzer Pro',
      subtitle: 'Deine Schaltzentrale für DJ-Mix-Analyse, Phase-Sync & Klang-Dramaturgie',
      icon: Disc3,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description:
        'Diese Anwendung analysiert deine DJ-Sets auf Club-Standard: Sie erkennt Beat-Drift auf die Millisekunde genau, überprüft harmonische Übergänge nach dem Camelot-Rad und deckt Frequenzüberlagerungen (Bass-Clashes) auf.',
      details: [
        'Schneller Einstieg: Alle Kernfunktionen sind in 4 logische Arbeitsbereiche gegliedert.',
        '100% Offline-fähig: Deine Audiodaten werden direkt im Browser berechnet.',
        'Intelligenter Assistent: Proaktive Hinweise führen dich Schritt für Schritt durch jedes Set.'
      ],
      tip: 'Du kannst diesen Guide jederzeit über das Fragezeichen (?) oben rechts erneut aufrufen.'
    },
    {
      title: '1. DJ Deck & Phase-Delta Live Monitor',
      subtitle: 'Präzise Beat-Grids, Phasen-Versatz & Sub-Interferenz',
      icon: AudioWaveform,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description:
        'Das AudioDeck visualisiert nicht nur die Gesamtlaufzeit, sondern blendet bei jedem Übergang eine sekundäre Waveform ein. Hier siehst du genau, ob Track B vor- oder nacheilt.',
      details: [
        'Transienten-Synchronisation: Abweichungen werden in Millisekunden (Δt) und Phasenwinkel (°) gemessen.',
        'Kammfilter-Schutz: Eine Summenkurve warnt vor Auslöschungen im Sub-Bass.',
        'Virtueller Jog-Nudge: Probiere Korrekturen direkt am Bildschirm aus oder nutze den Auto-Align Button.'
      ],
      tip: 'Klicke auf die Timeline oder nutze die Leertaste, um die Wiedergabe an beliebigen Stellen zu prüfen.'
    },
    {
      title: '2. Set-Dynamik & Harmonischer Verlauf',
      subtitle: 'BPM-Stufen, Camelot-Wheel & Energie-Dramaturgie',
      icon: Activity,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description:
        'Ein Club-Set lebt von seiner Spannungskurve. In diesem Bereich siehst du, wie sich Tempo, Tonarten und Energie über die gesamte Spieldauer entwickeln.',
      details: [
        'BPM & Key Progression: Erkenne sprunghafte Tempowechsel und unharmonische Sprünge.',
        'Auto-Tagging: Das Set wird automatisch in Intro, Aufbau, Peak Time und Outro unterteilt.',
        'Zielprofil-Vergleich: Vergleiche dein Set mit typischen Profilen wie Peak-Time Berlin Techno oder Hypnotic Groove.'
      ],
      tip: 'Wechsle über den Reiter „Set-Dynamik“ oben jederzeit in diese Ansicht.'
    },
    {
      title: '3. Mix-Inspektor & Diagnose',
      subtitle: 'Übergangsqualität, EQ-Clash-Warnung & Peak-Radar',
      icon: Sliders,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description:
        'Hier findest du eine detaillierte Liste aller Mix-Momente mit individuellen Bewertungen für Phase, Harmonie und Frequenzsauberkeit.',
      details: [
        'Übergangs-Inspektor: Jeder Übergang wird mit Schulnoten und konkreten DJ-Tipps aufgeführt.',
        'EQ Mud Advisor: Erkennt matschige Frequenzbereiche unter 120 Hz und empfiehlt genaue EQ-Cuts.',
        'Peak Moments Radar: Zeigt explosive Drops und Ausbrüche der Crowd-Energie.'
      ],
      tip: 'Mit einem Klick auf einen Übergang springst du direkt 12 Sekunden vor den Mix, um ihn anzuhören.'
    },
    {
      title: '4. KI-Assistent & Export',
      subtitle: 'Auto-Mix-Empfehlungen, Crowd-Psychologie & PDF-Reports',
      icon: Sparkles,
      iconColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      description:
        'Der integrierte KI-Assistent liefert wertvolles Feedback zur Wirkung deines Sets und schlägt passende Folgetracks aus der Bibliothek vor.',
      details: [
        'Auto-Mix-Vorschläge: Findet Tracks, die BPM-kompatibel und harmonisch im Camelot-Verbund sind.',
        'Crowd-Psychologie: Detaillierte Auswertung von Spannungsaufbau und Entlastungsphasen.',
        'PDF-Export: Druckfertiger Bericht mit allen Kennzahlen für Bookings, Labels oder Mixcloud-Uploads.'
      ],
      tip: 'Drücke jederzeit Strg+K (oder ⌘K), um die Schnellbefehle aufzurufen.'
    }
  ];

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div
      id="onboarding-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#101217] border border-white/10 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Close and Step dots */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg border ${current.iconColor}`}>
              <current.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                SCHRITT {currentStep + 1} VON {steps.length}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {current.title}
              </h2>
            </div>
          </div>

          <button
            id="btn-close-onboarding"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Onboarding schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle & Main Description */}
        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono">
            {current.subtitle}
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {current.description}
          </p>

          {/* Bullet points */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-2">
            {current.details.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Helpful Tip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{current.tip}</span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1 px-2"
          >
            Überspringen
          </button>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? 'w-6 bg-emerald-400' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                title={`Zu Schritt ${idx + 1} springen`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zurück</span>
              </button>
            )}

            <button
              id="btn-onboarding-next"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <span>{isLast ? 'Verstanden & Loslegen' : 'Weiter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
