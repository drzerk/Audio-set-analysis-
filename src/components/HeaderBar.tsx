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
      className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#121214] sticky top-0 z-40"
    >
      {/* Left: Set Brand & Session ID */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-black font-mono font-bold text-xs shrink-0 tracking-tighter">
          SET
        </div>
        <div>
          <h1 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Sonic-Analyzer v2.4</span>
            <span className="hidden md:inline-block text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 font-mono rounded border border-emerald-500/30">
              142+ BPM PRO
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-tight uppercase truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            SESSION: {currentSet.name.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Center: Set Selector Dropdown */}
      <div className="hidden lg:flex items-center gap-2">
        <select
          id="set-selector-dropdown"
          value={currentSet.id}
          onChange={(e) => {
            const found = allSets.find((s) => s.id === e.target.value);
            if (found) onSelectSet(found);
          }}
          className="bg-black/60 border border-white/10 text-slate-300 text-[11px] rounded px-3 py-1 font-mono focus:outline-none focus:border-emerald-500 max-w-[200px] xl:max-w-xs truncate cursor-pointer"
        >
          {allSets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.bpmAverage} BPM)
            </option>
          ))}
        </select>

        <button
          id="btn-upload-new-set"
          onClick={onOpenUpload}
          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold font-mono rounded uppercase tracking-tighter flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Neues Set oder Audio-Stream laden (SoundCloud, HearThis, Datei)"
        >
          <Radio className="w-3 h-3 stroke-[2.5]" />
          <span>Set / Stream laden</span>
        </button>
      </div>

      {/* Right: Telemetry pill & Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Offline / Online Mode Pill */}
        <div
          id="offline-stage-badge"
          className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-tight">
            {isOnline ? 'ONLINE & STREAM READY' : 'STAGE OFFLINE ACTIVE'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Upload Button */}
          <button
            id="btn-upload-new-set-mobile"
            onClick={onOpenUpload}
            className="lg:hidden px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold font-mono rounded uppercase tracking-tighter flex items-center gap-1 cursor-pointer"
          >
            <Radio className="w-3 h-3 stroke-[2.5]" />
            <span>Stream / Set</span>
          </button>

          {/* PDF Export button */}
          <button
            id="btn-export-pdf"
            onClick={onExportPdf}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold rounded uppercase tracking-tighter flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-blue-500/20"
            title="Detaillierten Analysebericht als PDF exportieren"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">PDF Export</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* Cloud Sync button */}
          <button
            id="btn-cloud-sync-hub"
            onClick={onOpenCloudSync}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold rounded uppercase tracking-tighter flex items-center gap-1.5 cursor-pointer transition-colors border border-white/5"
            title="Cloud Sync für alle Geräte"
          >
            {currentSet.isCloudSynced ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <Cloud className="w-3 h-3 text-slate-400" />
            )}
            <span className="hidden sm:inline">Cloud Sync</span>
            <span className="sm:hidden">Cloud</span>
          </button>

          {/* High Density Theme Selector */}
          <div
            id="booth-theme-selector"
            className="flex items-center bg-white/5 border border-white/10 rounded p-0.5"
          >
            <button
              id="theme-booth-dark"
              onClick={() => onThemeChange('booth-dark')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'booth-dark'
                  ? 'bg-white/15 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Dark Booth High Density"
            >
              <Moon className="w-3 h-3" />
            </button>
            <button
              id="theme-red-stage"
              onClick={() => onThemeChange('red-stage-night')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'red-stage-night'
                  ? 'bg-red-900/60 text-red-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Red Stage Night"
            >
              <Flame className="w-3 h-3" />
            </button>
            <button
              id="theme-cyan-laser"
              onClick={() => onThemeChange('cyan-laser')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'cyan-laser'
                  ? 'bg-cyan-900/60 text-cyan-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Cyan Laser Mode"
            >
              <Zap className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
