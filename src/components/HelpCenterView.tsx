import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Sparkles,
  AudioWaveform,
  Sliders,
  Disc3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Radio,
  FileText
} from 'lucide-react';

interface HelpCenterViewProps {
  onOpenTour: () => void;
  onOpenUpload: () => void;
  onExportPdf: () => void;
}

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({
  onOpenTour,
  onOpenUpload,
  onExportPdf
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Was bedeutet der Begriff „Phasenversatz“ (Phase Delta) beim Auflegen?',
      a: 'Zwei Tracks können zwar exakt das gleiche Tempo (BPM) haben, aber die Kick-Drum-Peaks (Transienten) treffen nicht im selben Mikrosekunden-Moment aufeinander. Ein Versatz von mehr als 8–10 ms führt zu einem hörbaren Galoppieren („Flamming“) und Phasenauslöschungen im Club.'
    },
    {
      q: 'Warum klingt der Bass im Übergang manchmal kraftlos oder matschig?',
      a: 'Wenn beide Tracks gleichzeitig die tiefen Frequenzen (unter 120 Hz) voll übertragen, überlagern sich die Sinuswellen. Befinden sich diese in Gegenphase, löschen sie sich gegenseitig aus (Kammfilter-Interferenz). Befinden sie sich in gleicher Phase, übersteuert das Signal den Master-Limiter. Die goldene DJ-Regel: Immer nur eine dominante Sub-Bassline gleichzeitig spielen (Bass-Swap).'
    },
    {
      q: 'Wie funktioniert das Camelot-Rad für harmonisches Mixen?',
      a: 'Das Camelot-Rad übersetzt traditionelle Tonarten in Zahlen von 1 bis 12 und Buchstaben (A für Moll, B für Dur). Ein harmonischer Übergang gelingt am besten, wenn du auf derselben Zahl bleibst (z.B. 8A → 8A), um eine Zahl nach oben/unten wechselst (8A → 9A für Energieanstieg, 8A → 7A für Entlastung) oder zwischen Dur und Moll switchst (8A → 8B).'
    },
    {
      q: 'Werden meine Audio-Dateien auf einen Server hochgeladen?',
      a: 'Nein. TechnoSet Analyzer Pro nutzt die hardwarebeschleunigte Web Audio API deines Browsers. Die Berechnung von BPM, Transient-Peaks, Spektralanalyse und Camelot-Harmonik geschieht zu 100% lokal auf deinem Endgerät. Deine Musik bleibt privat.'
    },
    {
      q: 'Wie exportiere ich mein Analyse-Ergebnis für Club-Veranstalter oder Mixcloud?',
      a: 'Klicke oben rechts auf den blauen Button „PDF Export“. Das Tool generiert einen druckfertigen, mehrseitigen technischen Rider mit BPM-Verlauf, Übergangsbewertungen, Set-Segmentierung und Hinweisen zur Mastering-Lautstärke (LUFS).'
    }
  ];

  const glossaryItems = [
    {
      term: 'Transient (Kick Peak)',
      definition: 'Der steile, energiereiche Anfangsimpuls einer Kick-Drum. Seine zeitliche Übereinstimmung entscheidet über den Beat-Punch.'
    },
    {
      term: 'Δt (Delta Time)',
      definition: 'Der zeitliche Versatz zwischen Deck A und Deck B in Millisekunden. Zielwert im Club: ±0 bis 3.5 ms.'
    },
    {
      term: 'Kammfilter-Interferenz',
      definition: 'Akustischer Frequenzeinbruch durch Phasenverschiebung zweier kohärenter Schallquellen. Führt zu dünnem Klang.'
    },
    {
      term: 'LUFS (Loudness Units)',
      definition: 'Die internationale Maßeinheit für wahrgenommene Lautheit. Club-Standard liegt typischerweise zwischen -8 und -6 LUFS.'
    },
    {
      term: 'BPM-Drift',
      definition: 'Schleichendes Auseinanderlaufen zweier Tracks über Zeit, wenn das Tempo um Nachkommastellen (z.B. 0.05 BPM) abweicht.'
    },
    {
      term: 'Spannungsbogen (Dramaturgie)',
      definition: 'Die dynamische Reise des Sets von hypnotischem Aufbau über Peak-Time Drops bis zur kontrollierten Entlastung.'
    }
  ];

  return (
    <div id="help-center-view" className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-black to-blue-950/40 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>HILFE-CENTER & DJ AKADEMIE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Verstehe die Physik hinter deinem perfekten Set
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Lerne, wie du Phasenversatz vermeidest, harmonische Übergänge gestaltest und Frequenzüberlagerungen auf großen Festival-Soundsystemen verhinderst.
          </p>
        </div>

        {/* Quick Tour Button */}
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={onOpenTour}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Interaktive Tour starten</span>
          </button>
          <button
            onClick={onExportPdf}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/5"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>PDF-Report generieren</span>
          </button>
        </div>
      </div>

      {/* 3 Foundation Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Phase Sync */}
        <div className="bg-[#12141a] border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <AudioWaveform className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">1. Transienten & Phasen-Sync</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ein Unterschied von nur 3 Millisekunden entscheidet darüber, ob der Kick-Punch doppelt drückt oder matscht. Unser Phasen-Delta-Monitor zeigt dir die Abweichung im Millisekunden-Raster.
          </p>
          <div className="mt-auto pt-2 text-[11px] font-mono text-cyan-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Toleranzbereich: unter 3.5 ms</span>
          </div>
        </div>

        {/* Pillar 2: Camelot Harmonics */}
        <div className="bg-[#12141a] border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Disc3 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">2. Camelot-Harmonie</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Techno lebt von subtilen Dissonanzen, doch Lead-Synths und Basslines müssen im Einklang sein. Bewege dich maximal ±1 Schritt auf dem Camelot-Rad für makellose Melodie-Blends.
          </p>
          <div className="mt-auto pt-2 text-[11px] font-mono text-purple-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Regel: ±1 Schritt (z.B. 8A → 9A)</span>
          </div>
        </div>

        {/* Pillar 3: Low-End EQ Hygiene */}
        <div className="bg-[#12141a] border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">3. EQ & Low-End Hygiene</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Niemals zwei Basslines voll aufdrehen! Senke den Bass-EQ des auslaufenden Tracks um 6–12 dB ab, sobald die Kick des neuen Tracks einsetzt. Unser EQ-Mud-Advisor warnt dich präventiv.
          </p>
          <div className="mt-auto pt-2 text-[11px] font-mono text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gefahr: Bass-Matsch unter 120 Hz</span>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-[#101217] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Häufig gestellte Fragen (FAQ)</span>
        </h3>

        <div className="flex flex-col divide-y divide-white/5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-2.5">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans pr-6">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fachbegriffe & Glossar */}
      <div className="bg-[#101217] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Glossar der Fachbegriffe
        </h3>
        <p className="text-xs text-slate-400">
          Die wichtigsten Begriffe der professionellen Club- und Studio-Akustik kurz und verständlich erklärt:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {glossaryItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1 text-xs"
            >
              <div className="font-mono font-bold text-emerald-400">{item.term}</div>
              <div className="text-slate-300 leading-relaxed">{item.definition}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
