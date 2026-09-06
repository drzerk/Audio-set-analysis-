import React, { useState, useEffect } from 'react';
import {
  Radio,
  FileText,
  Cloud,
  Moon,
  Flame,
  Zap,
  CheckCircle2,
  Disc3,
  Activity,
  Sliders,
  Sparkles,
  HelpCircle,
  Search,
  BookOpen,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { TechnoSetAnalysis, BoothTheme, AppWorkspaceTab, AppUserMode } from '../types';
import { HeaderEnergyMiniMap } from './HeaderEnergyMiniMap';

interface HeaderBarProps {
  currentSet: TechnoSetAnalysis;
  allSets: TechnoSetAnalysis[];
  currentTime?: number;
  onSeek?: (time: number) => void;
  onSelectSet: (set: TechnoSetAnalysis) => void;
  onOpenUpload: () => void;
  onOpenCloudSync: () => void;
  onExportPdf: () => void;
  theme: BoothTheme;
  onThemeChange: (theme: BoothTheme) => void;
  isSyncing: boolean;
  onQuickSync: () => void;
  activeTab: AppWorkspaceTab;
  onSelectTab: (tab: AppWorkspaceTab) => void;
  onOpenCommandPalette: () => void;
  onOpenHelpDrawer: () => void;
  onOpenTour: () => void;
  userMode: AppUserMode;
  onToggleUserMode: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentSet,
  allSets,
  currentTime = 0,
  onSeek,
  onSelectSet,
  onOpenUpload,
  onOpenCloudSync,
  onExportPdf,
  theme,
  onThemeChange,
  isSyncing,
  onQuickSync,
  activeTab,
  onSelectTab,
  onOpenCommandPalette,
  onOpenHelpDrawer,
  onOpenTour,
  userMode,
  onToggleUserMode
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  const navTabs: { id: AppWorkspaceTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Übersicht & Deck', icon: Disc3 },
    { id: 'dynamics', label: 'Set-Dynamik', icon: Activity },
    { id: 'diagnosis', label: 'Mix-Diagnose', icon: Sliders, badge: `${currentSet.transitions.length}` },
    { id: 'assistant', label: 'KI-Assistent', icon: Sparkles },
    { id: 'help', label: 'Hilfe & Tour', icon: HelpCircle }
  ];

  const tabTitles: Record<AppWorkspaceTab, string> = {
    dashboard: 'Übersicht & Deck',
    dynamics: 'Set-Dynamik & Harmonik',
    diagnosis: 'Mix-Inspektor & Diagnose',
    assistant: 'KI-Assistent & Auto-Mix',
    help: 'Hilfe-Center & Glossar'
  };

  return (
    <header
      id="header-app-bar"
      className="flex flex-col border-b border-white/10 bg-[#0f1117] sticky top-0 z-40 shadow-xl"
    >
      {/* 1. Top Bar: Brand, Breadcrumbs, Global Search, Actions */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-white/5 gap-2">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-mono font-black text-xs shrink-0 shadow-md shadow-emerald-500/20">
            TS
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono truncate">
            <span className="font-bold text-white tracking-tight hidden sm:inline">TechnoSet Pro</span>
            <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline shrink-0" />
            <span className="text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
              {currentSet.name}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="text-emerald-400 font-semibold truncate">
              {tabTitles[activeTab]}
            </span>
          </div>
        </div>

        {/* Center: Command Palette Trigger Button (Ctrl+K) */}
        <div className="hidden md:flex items-center">
          <button
            id="btn-trigger-cmd-palette"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-emerald-500/40 text-slate-400 hover:text-white transition-all cursor-pointer text-xs"
            title="Schnellsuche und Befehle öffnen (Strg + K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Suchen oder Befehl eingeben...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Actions (Upload, PDF, Sync, Theme, Help) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Set Selector Dropdown */}
          <select
            id="set-selector-dropdown"
            value={currentSet.id}
            onChange={(e) => {
              const found = allSets.find((s) => s.id === e.target.value);
              if (found) onSelectSet(found);
            }}
            className="bg-black/50 border border-white/10 text-slate-200 text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-emerald-500 max-w-[130px] sm:max-w-[180px] truncate cursor-pointer"
            title="Aktives DJ-Set auswählen"
          >
            {allSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.bpmAverage} BPM)
              </option>
            ))}
          </select>

          {/* Upload Button */}
          <button
            id="btn-upload-new-set"
            onClick={onOpenUpload}
            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold font-mono rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-emerald-500/20"
            title="Neues DJ-Set oder Audio-Stream laden"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Set laden</span>
          </button>

          {/* PDF Export Button */}
          <button
            id="btn-export-pdf"
            onClick={onExportPdf}
            className="hidden sm:flex px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-mono font-bold rounded-lg items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-blue-500/20"
            title="Detaillierten Analysebericht als PDF exportieren"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            id="btn-cloud-sync-hub"
            onClick={onOpenCloudSync}
            className="hidden sm:flex px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-mono font-medium rounded-lg items-center gap-1.5 cursor-pointer transition-colors border border-white/10"
            title="Cloud Sync für alle Geräte"
          >
            {currentSet.isCloudSynced ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Sync</span>
          </button>

          {/* Context Help Trigger Button */}
          <button
            id="btn-open-context-help"
            onClick={onOpenHelpDrawer}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 rounded-lg transition-colors cursor-pointer"
            title="Kontext-Hilfe für diesen Bereich anzeigen"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Selector */}
          <div className="hidden lg:flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => onThemeChange('booth-dark')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'booth-dark' ? 'bg-white/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Dark Booth Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('red-stage-night')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'red-stage-night' ? 'bg-red-900/60 text-red-300' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Red Stage Mode"
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('cyan-laser')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'cyan-laser' ? 'bg-cyan-900/60 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Cyan Laser Mode"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            title="Menü öffnen"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 2. Secondary Navigation Tabs Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-1.5 bg-[#0a0c10] overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 sm:gap-1.5" role="tablist">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side: Guided Tour Shortcut & Mode Toggle */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenTour}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer"
            title="Interaktive App-Tour starten"
          >
            <BookOpen className="w-3 h-3" />
            <span>Tour</span>
          </button>

          <button
            onClick={onToggleUserMode}
            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
              userMode === 'pro'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Umschalten: Einfacher Modus oder Pro DJ Experte"
          >
            {userMode === 'pro' ? 'PRO EXPERTE' : 'EINFACH'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer if open */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d1017] border-b border-white/10 p-3 flex flex-col gap-2">
          <button
            onClick={() => {
              onOpenCommandPalette();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-300"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Befehlspalette öffnen (⌘K)</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onExportPdf();
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-mono text-left flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Export</span>
            </button>
            <button
              onClick={() => {
                onOpenCloudSync();
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-mono text-left flex items-center gap-2"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud Sync</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Integrated Mini-Map: Set Energy Density & Overview */}
      <HeaderEnergyMiniMap
        currentSet={currentSet}
        currentTime={currentTime}
        onSeek={onSeek}
      />
    </header>
  );
};
