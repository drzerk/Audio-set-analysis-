import React, { useState, useEffect } from 'react';
import {
  Radio,
  FileText,
  Cloud,
  CloudCheck,
  FolderOpen,
  Plus,
  Moon,
  Flame,
  Zap,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { TechnoSetAnalysis, BoothTheme } from '../types';

interface HeaderBarProps {
  currentSet: TechnoSetAnalysis;
  allSets: TechnoSetAnalysis[];
  onSelectSet: (set: TechnoSetAnalysis) => void;
  onOpenUpload: () => void;
  onOpenCloudSync: () => void;
  onExportPdf: () => void;
  theme: BoothTheme;
  onThemeChange: (theme: BoothTheme) => void;
  isSyncing: boolean;
  onQuickSync: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentSet,
  allSets,
  onSelectSet,
  onOpenUpload,
  onOpenCloudSync,
  onExportPdf,
  theme,
  onThemeChange,
  isSyncing,
  onQuickSync
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header
      id="header-app-bar"
      className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 py-3 sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Identity */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm tracking-widest font-black text-zinc-100 uppercase">
                TECHNOSET
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                PRO 142+
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono tracking-wide hidden sm:block">
              BPM • Harmonie • Übergänge • Peak-Radar • Audio-Mastering
            </p>
          </div>
        </div>

        {/* Set Selector Dropdown & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              id="set-selector-dropdown"
              value={currentSet.id}
              onChange={(e) => {
                const found = allSets.find((s) => s.id === e.target.value);
                if (found) onSelectSet(found);
              }}
              className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs rounded-md pl-3 pr-8 py-1.5 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 max-w-[220px] sm:max-w-xs truncate cursor-pointer"
            >
              {allSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.bpmAverage} BPM)
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-upload-new-set"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all shadow-sm shadow-emerald-500/30 cursor-pointer"
            title="Neues Techno-Set analysieren (MP3, WAV, FLAC)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden md:inline">Set laden</span>
          </button>
        </div>

        {/* Right Status & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Offline / Stage Status Badge */}
          <div
            id="offline-stage-badge"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border ${
              isOnline
                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
            title={
              isOnline
                ? 'Online: Vollständige Web Audio Analyse & Cloud Sync aktiv'
                : 'Offline-Modus: Volle Bühnen-Funktionalität aktiv (IndexedDB)'
            }
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="hidden lg:inline">
              {isOnline ? 'Bühne / Bereit' : 'Stage Offline'}
            </span>
          </div>

          {/* Cloud Sync Button */}
          <button
            id="btn-cloud-sync-hub"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md border transition-all cursor-pointer ${
              currentSet.isCloudSynced
                ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200 hover:border-zinc-500'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Cloud-Synchronisation für alle Geräte"
          >
            {currentSet.isCloudSynced ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="hidden sm:inline">Cloud-Sync</span>
          </button>

          {/* PDF Export Button */}
          <button
            id="btn-export-pdf"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all cursor-pointer"
            title="Detaillierten Analysebericht als PDF exportieren"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>PDF Export</span>
          </button>

          {/* Booth Theme Selector */}
          <div
            id="booth-theme-selector"
            className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5"
          >
            <button
              id="theme-booth-dark"
              onClick={() => onThemeChange('booth-dark')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                theme === 'booth-dark'
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Booth Dark: Tiefschwarz für dunkle Club-Umgebungen"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              id="theme-red-stage"
              onClick={() => onThemeChange('red-stage-night')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                theme === 'red-stage-night'
                  ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Red Stage Night: Rotes Bühnenlicht (schont Nachtsicht am DJ-Pult)"
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
            <button
              id="theme-cyan-laser"
              onClick={() => onThemeChange('cyan-laser')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                theme === 'cyan-laser'
                  ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Cyan Laser: Hoher Kontrast & Club Lasereffekte"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
