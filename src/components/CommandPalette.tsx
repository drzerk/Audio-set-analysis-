import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sliders,
  Activity,
  Disc3,
  FileText,
  Cloud,
  Moon,
  Flame,
  Zap,
  HelpCircle,
  Radio,
  Play,
  Pause,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { AppWorkspaceTab, TechnoSetAnalysis, BoothTheme } from '../types';
import { formatTimeSeconds } from '../utils/pdfExport';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onTogglePlay: () => void;
  isPlaying: boolean;
  onExportPdf: () => void;
  onOpenCloudSync: () => void;
  onOpenUpload: () => void;
  onOpenTour: () => void;
  onThemeChange: (theme: BoothTheme) => void;
  currentSet: TechnoSetAnalysis;
  onSeek: (time: number) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onTogglePlay,
  isPlaying,
  onExportPdf,
  onOpenCloudSync,
  onOpenUpload,
  onOpenTour,
  onThemeChange,
  currentSet,
  onSeek
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  interface CommandItem {
    id: string;
    title: string;
    category: 'Navigation' | 'Playback' | 'Aktionen' | 'Übergänge' | 'Design';
    icon: React.ElementType;
    action: () => void;
    detail?: string;
  }

  const baseCommands: CommandItem[] = [
    {
      id: 'tab-dash',
      title: 'Gehe zu Übersicht & Deck',
      category: 'Navigation',
      icon: Disc3,
      action: () => onSelectTab('dashboard'),
      detail: 'Hauptplayer, Phasen-Delta Waveform & Set-Status'
    },
    {
      id: 'tab-dyn',
      title: 'Gehe zu Set-Dynamik & Kurven',
      category: 'Navigation',
      icon: Activity,
      action: () => onSelectTab('dynamics'),
      detail: 'BPM- & Harmonikverlauf, Camelot-Wheel, Segmente'
    },
    {
      id: 'tab-diag',
      title: 'Gehe zu Mix-Inspektor & Diagnose',
      category: 'Navigation',
      icon: Sliders,
      action: () => onSelectTab('diagnosis'),
      detail: 'Übergangs-Qualität, EQ-Clashes, Drop-Radar'
    },
    {
      id: 'tab-ai',
      title: 'Gehe zu KI-Assistent & Vorschläge',
      category: 'Navigation',
      icon: Zap,
      action: () => onSelectTab('assistant'),
      detail: 'Crowd-Psychologie, Auto-Mix Empfehlungen'
    },
    {
      id: 'tab-help',
      title: 'Gehe zu Hilfe-Center & Glossar',
      category: 'Navigation',
      icon: HelpCircle,
      action: () => onSelectTab('help'),
      detail: 'DJ-Grundlagen, FAQ & Phasen-Theorie'
    },
    {
      id: 'cmd-play-pause',
      title: isPlaying ? 'Audio pausieren' : 'Audio abspielen',
      category: 'Playback',
      icon: isPlaying ? Pause : Play,
      action: onTogglePlay,
      detail: `${currentSet.bpmAverage} BPM • Position: ${formatTimeSeconds(0)}`
    },
    {
      id: 'cmd-export-pdf',
      title: 'PDF-Analysebericht exportieren',
      category: 'Aktionen',
      icon: FileText,
      action: onExportPdf,
      detail: 'Druckfertiger Set-Rider mit allen Kennzahlen'
    },
    {
      id: 'cmd-upload',
      title: 'Neues Set oder Audio-Stream laden',
      category: 'Aktionen',
      icon: Radio,
      action: onOpenUpload,
      detail: 'SoundCloud, HearThis oder lokale MP3/WAV-Datei'
    },
    {
      id: 'cmd-cloud',
      title: 'Cloud-Synchronisation öffnen',
      category: 'Aktionen',
      icon: Cloud,
      action: onOpenCloudSync,
      detail: 'Set-Profile für alle Geräte synchronisieren'
    },
    {
      id: 'cmd-tour',
      title: 'Interaktive App-Tour starten',
      category: 'Aktionen',
      icon: BookOpen,
      action: onOpenTour,
      detail: 'Schritt-für-Schritt Einführung für Einsteiger'
    },
    {
      id: 'cmd-theme-dark',
      title: 'Design: Booth Dark High-Density',
      category: 'Design',
      icon: Moon,
      action: () => onThemeChange('booth-dark'),
      detail: 'Smaragd-Akzente für dunkle DJ-Kanzeln'
    },
    {
      id: 'cmd-theme-red',
      title: 'Design: Red Stage Night',
      category: 'Design',
      icon: Flame,
      action: () => onThemeChange('red-stage-night'),
      detail: 'Augenschonendes Rotlicht für die Bühne'
    },
    {
      id: 'cmd-theme-cyan',
      title: 'Design: Cyan Laser Mode',
      category: 'Design',
      icon: Zap,
      action: () => onThemeChange('cyan-laser'),
      detail: 'High-Contrast Cyan-Look'
    }
  ];

  // Dynamic transition commands
  const transitionCommands: CommandItem[] = currentSet.transitions.map((t, idx) => ({
    id: `trans-jump-${t.id}`,
    title: `Springe zu Übergang #${idx + 1} (${formatTimeSeconds(t.timestamp)})`,
    category: 'Übergänge',
    icon: Disc3,
    action: () => {
      onSeek(Math.max(0, t.timestamp - 10));
      onSelectTab('dashboard');
    },
    detail: `${t.fromKey || '8A'} → ${t.toKey || '8A'} • Phase: ${t.phaseScore || 85}%`
  }));

  const allCommands = [...baseCommands, ...transitionCommands];

  const filteredCommands = query.trim()
    ? allCommands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase()) ||
          (c.detail && c.detail.toLowerCase().includes(query.toLowerCase()))
      )
    : allCommands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#12141a] border border-white/15 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40">
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Aktion suchen, Übergang anspringen, Tool wählen... (Esc zum Schließen)"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-sans"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-[10px]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-0.5">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              Keine passenden Befehle gefunden für „{query}“
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-500/15 border border-emerald-500/30 text-white' : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{cmd.title}</span>
                        <span className="text-[9px] px-1 rounded bg-white/5 text-slate-400 font-mono uppercase">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.detail && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {cmd.detail}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                      isSelected ? 'opacity-100 text-emerald-400' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/10 bg-black/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigieren</span>
            <span>↵ Ausführen</span>
          </div>
          <span>Tipp: Strg+K öffnet dieses Menü überall</span>
        </div>
      </div>
    </div>
  );
};
