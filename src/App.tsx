import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TechnoSetAnalysis,
  TransitionItem,
  PeakMoment,
  BoothTheme,
  AiAssessment,
  SetSegment,
  AppWorkspaceTab,
  AppUserMode,
  SessionActivityItem
} from './types';
import { DEMO_SETS } from './data/demoSets';
import { getLocalSets, saveLocalSet, deleteLocalSet, syncSetToCloud } from './utils/storage';
import { exportSetReportAsPdf, formatTimeSeconds } from './utils/pdfExport';
import { TechnoPreviewAudioEngine } from './utils/audioAnalyzer';
import { computeAutoTaggedSegments } from './utils/segmentAutoTagger';

import { ToastProvider, useToast } from './components/ui/ToastContext';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OnboardingModal } from './components/OnboardingModal';
import { ContextHelpDrawer } from './components/ContextHelpDrawer';
import { CommandPalette } from './components/CommandPalette';
import { HelpCenterView } from './components/HelpCenterView';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';

import { HeaderBar } from './components/HeaderBar';
import { AudioDeck } from './components/AudioDeck';
import { BpmHarmonicChart } from './components/BpmHarmonicChart';
import { SegmentTaggerCard } from './components/SegmentTaggerCard';
import { TargetProfileComparator } from './components/TargetProfileComparator';
import { HarmonicEnergyConflictVisualizer } from './components/HarmonicEnergyConflictVisualizer';
import { EqMudAdvisorCard } from './components/EqMudAdvisorCard';
import { TransitionInspector } from './components/TransitionInspector';
import { PeakMomentsRadar } from './components/PeakMomentsRadar';
import { TechnicalStatsCard } from './components/TechnicalStatsCard';
import { AutoMixSuggestionsCard } from './components/AutoMixSuggestionsCard';
import { AiAssessmentCard } from './components/AiAssessmentCard';
import { SetUploadModal } from './components/SetUploadModal';
import { CloudSyncModal } from './components/CloudSyncModal';

function AppContent() {
  const { showToast } = useToast();

  const [allSets, setAllSets] = useState<TechnoSetAnalysis[]>(DEMO_SETS);
  const [currentSet, setCurrentSet] = useState<TechnoSetAnalysis>(DEMO_SETS[0]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [theme, setTheme] = useState<BoothTheme>('booth-dark');

  // Workspace Navigation & User Mode
  const [activeTab, setActiveTab] = useState<AppWorkspaceTab>('dashboard');
  const [userMode, setUserMode] = useState<AppUserMode>('simple');

  // Modals & Panels
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('technoset_onboarded_v2') !== 'true';
  });
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Destructive Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Session Activity History
  const [activityLog, setActivityLog] = useState<SessionActivityItem[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      title: `Set geladen: ${DEMO_SETS[0].name}`,
      type: 'info',
      description: `${DEMO_SETS[0].bpmAverage} BPM • ${DEMO_SETS[0].transitions.length} Übergänge analysiert`
    }
  ]);

  const addActivity = useCallback((title: string, type: 'info' | 'success' | 'warning' | 'action', description?: string) => {
    const newItem: SessionActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      title,
      type,
      description
    };
    setActivityLog((prev) => [newItem, ...prev.slice(0, 24)]);
  }, []);

  const audioEngineRef = useRef<TechnoPreviewAudioEngine | null>(null);
  const playIntervalRef = useRef<number | null>(null);

  // Initialize Audio Engine and load stored sets from IndexedDB
  useEffect(() => {
    audioEngineRef.current = new TechnoPreviewAudioEngine();

    getLocalSets().then((loaded) => {
      if (loaded && loaded.length > 0) {
        const enriched = loaded.map((s) => {
          if (!s.segments || s.segments.length === 0) {
            return {
              ...s,
              segments: computeAutoTaggedSegments(s.duration || 3600, s.energyPoints || [])
            };
          }
          return s;
        });
        setAllSets(enriched);
        setCurrentSet(enriched[0]);
      }
    });

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Audio Playback loop & tick
  useEffect(() => {
    if (isPlaying) {
      if (audioEngineRef.current) {
        audioEngineRef.current.start(currentSet.bpmAverage, currentTime);
      }
      playIntervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentSet.duration) {
            setIsPlaying(false);
            showToast('Ende des Sets erreicht', 'info', 'Wiedergabe wurde gestoppt.');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentSet.bpmAverage, currentSet.duration, showToast]);

  // Global Keyboard Shortcuts (Ctrl+K, Space, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      // Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Space -> Toggle Play/Pause
      else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
      // ? -> Toggle Help
      else if (e.key === '?') {
        e.preventDefault();
        setIsHelpDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      addActivity(
        next ? 'Wiedergabe gestartet' : 'Wiedergabe pausiert',
        'action',
        `Position: ${formatTimeSeconds(currentTime)}`
      );
      return next;
    });
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isPlaying && audioEngineRef.current) {
      audioEngineRef.current.stop();
      audioEngineRef.current.start(currentSet.bpmAverage, time);
    }
  };

  const handleJumpToTransition = (t: TransitionItem) => {
    const target = Math.max(0, t.timestamp - 12);
    handleSeek(target);
    setIsPlaying(true);
    showToast(
      `Zu Übergang gesprungen (${formatTimeSeconds(t.timestamp)})`,
      'info',
      `Blend-Zone gestartet: ${t.fromKey} → ${t.toKey}`
    );
    addActivity(`Übergang angesteuert`, 'action', `Bei ${formatTimeSeconds(t.timestamp)}`);
  };

  const handleJumpToPeak = (p: PeakMoment) => {
    const target = Math.max(0, p.timestamp - 8);
    handleSeek(target);
    setIsPlaying(true);
    showToast(`Drop angesteuert: ${p.label}`, 'info', `Startet 8s vor dem Drop`);
    addActivity(`Drop Peak angesteuert`, 'action', `${p.label} bei ${formatTimeSeconds(p.timestamp)}`);
  };

  const handleSelectSet = (set: TechnoSetAnalysis) => {
    setIsPlaying(false);
    setCurrentSet(set);
    setCurrentTime(0);
    showToast(`Set gewechselt: ${set.name}`, 'success', `${set.bpmAverage} BPM • ${set.transitions.length} Übergänge`);
    addActivity(`Set geladen: ${set.name}`, 'info');
  };

  const handleSetAnalyzed = async (newSet: TechnoSetAnalysis) => {
    // 1. Update local IndexedDB storage before adding set to application state
    try {
      await saveLocalSet(newSet);
    } catch (dbErr) {
      console.warn('IndexedDB persistence confirmed with dual-layer fallback', dbErr);
    }

    // 2. Add set to application state and switch active deck view
    setAllSets((prev) => [newSet, ...prev.filter((s) => s.id !== newSet.id)]);
    setCurrentSet(newSet);
    setCurrentTime(0);
    showToast(`Neues Set erfolgreich analysiert!`, 'success', `${newSet.name} ist jetzt aktiv.`);
    addActivity(`Neues Set analysiert: ${newSet.name}`, 'success');
  };

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    localStorage.setItem('technoset_onboarded_v2', 'true');
  };

  // Safe deletion with confirmation modal
  const handleDeleteTransition = (id: string) => {
    const target = currentSet.transitions.find((t) => t.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Übergang wirklich löschen?',
      message: `Möchtest du den Marker für den Übergang bei ${formatTimeSeconds(
        target?.timestamp || 0
      )} (${target?.fromKey || ''} → ${target?.toKey || ''}) wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      onConfirm: () => {
        const updatedTransitions = currentSet.transitions.filter((t) => t.id !== id);
        const updatedSet: TechnoSetAnalysis = {
          ...currentSet,
          transitions: updatedTransitions,
          updatedAt: new Date().toISOString()
        };
        setCurrentSet(updatedSet);
        setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
        saveLocalSet(updatedSet);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('Übergang entfernt', 'warning', 'Der Marker wurde aus der Set-Analyse gelöscht.');
        addActivity('Übergang gelöscht', 'warning', `Marker-ID: ${id}`);
      }
    });
  };

  const handleUpdateTransition = (updated: TransitionItem) => {
    const updatedTransitions = currentSet.transitions.map((t) =>
      t.id === updated.id ? updated : t
    );
    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      transitions: updatedTransitions,
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('Übergang aktualisiert', 'success', 'Notizen und Parameter wurden gespeichert.');
    addActivity('Übergang bearbeitet', 'action', `Marker bei ${formatTimeSeconds(updated.timestamp)}`);
  };

  const handleAddTransitionAtCurrentTime = () => {
    const newId = `trans-${Date.now()}`;
    const newTransition: TransitionItem = {
      id: newId,
      timestamp: Math.round(currentTime),
      duration: 32,
      qualityScore: 92,
      phaseScore: 94,
      harmonicScore: 95,
      eqClashRisk: 'low',
      fromKey: currentSet.dominantKey.split(' ')[0] || '8A',
      toKey: currentSet.dominantKey.split(' ')[0] || '8A',
      fromBpm: currentSet.bpmAverage,
      toBpm: currentSet.bpmAverage,
      notes: `Manueller Übergangs-Marker bei ${formatTimeSeconds(currentTime)}`,
      type: 'seamless-blend'
    };

    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      transitions: [...currentSet.transitions, newTransition].sort((a, b) => a.timestamp - b.timestamp),
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('Übergang hinzugefügt', 'success', `Marker bei ${formatTimeSeconds(currentTime)} gesetzt.`);
    addActivity('Neuer Übergang erstellt', 'success', `Bei ${formatTimeSeconds(currentTime)}`);
  };

  const handlePlanAutoMixTransition = (newTransition: TransitionItem) => {
    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      transitions: [...currentSet.transitions, newTransition].sort((a, b) => a.timestamp - b.timestamp),
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('Auto-Mix eingeplant!', 'success', `Kompatibler Übergang bei ${formatTimeSeconds(newTransition.timestamp)} hinzugefügt.`);
    addActivity('Auto-Mix Übergang übernommen', 'success');
  };

  const handleAddPeakAtCurrentTime = () => {
    const newId = `peak-${Date.now()}`;
    const newPeak: PeakMoment = {
      id: newId,
      timestamp: Math.round(currentTime),
      label: `Peak Drop #${currentSet.peakMoments.length + 1}`,
      energyLevel: 96,
      spectralPower: -5.6,
      dropIntensity: 95,
      description: `Manueller Peak-Cue bei ${formatTimeSeconds(currentTime)}`,
      type: 'main-drop'
    };

    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      peakMoments: [...currentSet.peakMoments, newPeak].sort((a, b) => a.timestamp - b.timestamp),
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('Peak Moment gesetzt', 'success', `Drop-Cue bei ${formatTimeSeconds(currentTime)} gespeichert.`);
    addActivity('Peak Moment markiert', 'success', `Bei ${formatTimeSeconds(currentTime)}`);
  };

  const handleUpdateAssessment = (newAssessment: AiAssessment) => {
    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      aiAssessment: newAssessment,
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('KI-Bewertung aktualisiert', 'success', 'Die neue Set-Psychologie wurde berechnet.');
    addActivity('KI-Bewertung neu generiert', 'action');
  };

  const handleUpdateSegments = (updatedSegments: SetSegment[]) => {
    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      segments: updatedSegments,
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
    showToast('Set-Segmente gespeichert', 'success', `${updatedSegments.length} Phasen aktualisiert.`);
    addActivity('Dramaturgie-Segmente angepasst', 'action');
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    const res = await syncSetToCloud(currentSet);
    setIsSyncing(false);
    if (res.success) {
      setCurrentSet((prev) => ({ ...prev, isCloudSynced: true }));
      showToast('Cloud-Sync erfolgreich!', 'success', 'Set-Daten sind auf allen deinen Geräten synchron.');
      addActivity('Cloud Synchronisation abgeschlossen', 'success');
    } else {
      showToast('Cloud-Sync fehlgeschlagen', 'error', 'Die Verbindung konnte nicht hergestellt werden.');
    }
  };

  const handleExportPdfReport = () => {
    exportSetReportAsPdf(currentSet);
    showToast('PDF wird generiert', 'success', 'Der druckfertige Set-Report wird im Browser heruntergeladen.');
    addActivity('PDF-Report exportiert', 'success');
  };

  // Theme root styling
  const themeClass =
    theme === 'red-stage-night'
      ? 'bg-[#0d0404] text-red-100 selection:bg-red-900 selection:text-white'
      : theme === 'cyan-laser'
      ? 'bg-[#040a0f] text-cyan-100 selection:bg-cyan-900 selection:text-white'
      : 'bg-[#0a0c10] text-slate-300 selection:bg-emerald-950 selection:text-white';

  return (
    <div className={`min-h-screen ${themeClass} flex flex-col font-sans transition-colors duration-300`}>
      {/* Top Application Header with Navigation Tabs & Breadcrumbs */}
      <HeaderBar
        currentSet={currentSet}
        allSets={allSets}
        currentTime={currentTime}
        onSeek={handleSeek}
        onSelectSet={handleSelectSet}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onExportPdf={handleExportPdfReport}
        theme={theme}
        onThemeChange={setTheme}
        isSyncing={isSyncing}
        onQuickSync={handleQuickSync}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHelpDrawer={() => setIsHelpDrawerOpen(true)}
        onOpenTour={() => setIsOnboardingOpen(true)}
        userMode={userMode}
        onToggleUserMode={() =>
          setUserMode((prev) => (prev === 'simple' ? 'pro' : 'simple'))
        }
      />

      {/* Main Workspace Layout with Progressive Disclosure */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col gap-4">
        {/* WORKSPACE TAB 1: ÜBERSICHT & DECK (Primary Executive Dashboard & Player) */}
        {activeTab === 'dashboard' && (
          <ExecutiveDashboard
            currentSet={currentSet}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onJumpToTransition={handleJumpToTransition}
            onJumpToPeak={handleJumpToPeak}
            onSelectTab={setActiveTab}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
            onExportPdf={handleExportPdfReport}
            onOpenTour={() => setIsOnboardingOpen(true)}
            userMode={userMode}
            onToggleUserMode={() =>
              setUserMode((prev) => (prev === 'simple' ? 'pro' : 'simple'))
            }
            activityLog={activityLog}
            onUpdateTransition={handleUpdateTransition}
            audioEngine={audioEngineRef.current}
          />
        )}

        {/* WORKSPACE TAB 2: SET-DYNAMIK & KURVEN (BPM, Camelot, Segmente, Zielprofil) */}
        {activeTab === 'dynamics' && (
          <div className="flex flex-col gap-4">
            {/* Header info banner */}
            <div className="bg-[#101217] border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Set-Dynamik & Harmonische Progression
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisiert Tempo-Stufen, Camelot-Wheel-Verläufe, Auto-Tags und Zielprofil-Vergleiche über die gesamte Spieldauer.
                </p>
              </div>
            </div>

            {/* 1. BPM & Harmonic Chart */}
            <BpmHarmonicChart
              currentSet={currentSet}
              currentTime={currentTime}
              onSeek={handleSeek}
            />

            {/* 2. Auto-Tagging & Set-Segmentierung */}
            <SegmentTaggerCard
              currentSet={currentSet}
              currentTime={currentTime}
              onSeek={handleSeek}
              onUpdateSegments={handleUpdateSegments}
            />

            {/* 3. Target Energy Profiles & Performance Feedback */}
            <TargetProfileComparator
              currentSet={currentSet}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          </div>
        )}

        {/* WORKSPACE TAB 3: MIX-INSPEKTOR & DIAGNOSE (Transitions, EQ Mud, Conflicts, Technical Stats) */}
        {activeTab === 'diagnosis' && (
          <div className="flex flex-col gap-4">
            {/* Header info banner */}
            <div className="bg-[#101217] border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Mix-Inspektor & Akustische Diagnose
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detaillierte Analyse jedes einzelnen Übergangs, EQ-Clash-Vermeidung im Sub-Bass und Erkennung von Peak Drops.
                </p>
              </div>
            </div>

            {/* Dual Grid: Transition Quality Inspector & Peak Moments Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TransitionInspector
                currentSet={currentSet}
                currentTime={currentTime}
                onJumpToTransition={handleJumpToTransition}
                onUpdateTransition={handleUpdateTransition}
                onDeleteTransition={handleDeleteTransition}
                onAddTransitionAtCurrentTime={handleAddTransitionAtCurrentTime}
                onSeek={handleSeek}
              />

              <PeakMomentsRadar
                currentSet={currentSet}
                currentTime={currentTime}
                onJumpToPeak={handleJumpToPeak}
                onAddPeakAtCurrentTime={handleAddPeakAtCurrentTime}
              />
            </div>

            {/* Harmonic Progression vs. Energy Trend Conflict Visualizer */}
            <HarmonicEnergyConflictVisualizer
              currentSet={currentSet}
              currentTime={currentTime}
              onSeek={handleSeek}
            />

            {/* Harmonic EQ Cut & Mud Reduction Advisor */}
            <EqMudAdvisorCard
              currentSet={currentSet}
              currentTime={currentTime}
              onSeek={handleSeek}
              audioEngine={audioEngineRef.current}
            />

            {/* Technical Audio & Mastering Metrics */}
            <TechnicalStatsCard metrics={currentSet.technicalMetrics} />
          </div>
        )}

        {/* WORKSPACE TAB 4: KI-ASSISTENT & VORSCHLÄGE (Crowd Psychology & AutoMix Suggestions) */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col gap-4">
            {/* Header info banner */}
            <div className="bg-[#101217] border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  KI-Set-Bewertung & Auto-Mix-Bibliothek
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Psychologische Crowd-Analyse, Spannungskurven-Feedback und intelligente Folge-Track-Empfehlungen.
                </p>
              </div>
            </div>

            {/* AI Master Assessment & Crowd Psychology */}
            <AiAssessmentCard
              currentSet={currentSet}
              onUpdateAssessment={handleUpdateAssessment}
            />

            {/* Auto-Mix Suggestions (Harmonic & BPM Library Recommendations) */}
            <AutoMixSuggestionsCard
              currentSet={currentSet}
              currentTime={currentTime}
              onPlanTransition={handlePlanAutoMixTransition}
              onSeek={handleSeek}
            />
          </div>
        )}

        {/* WORKSPACE TAB 5: HILFE-CENTER & GLOSSAR (Academy, Guides, FAQ) */}
        {activeTab === 'help' && (
          <HelpCenterView
            onOpenTour={() => setIsOnboardingOpen(true)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onExportPdf={handleExportPdfReport}
          />
        )}
      </main>

      {/* Footer Info & Shortcuts hint */}
      <footer className="border-t border-white/5 bg-[#08090d] py-2.5 px-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>TechnoSet Analyzer Pro v2.4</span>
          <span>•</span>
          <span>100% Offline Web Audio Engine</span>
          <span>•</span>
          <span>Camelot-Harmonik & Transienten-Sync</span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Tastatur: <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400">Leertaste</kbd> Play/Pause
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400">⌘K</kbd> Befehle
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400">?</kbd> Hilfe
          </span>
        </div>
      </footer>

      {/* Modals & Slide-over Drawers */}
      <SetUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSetAnalyzed={handleSetAnalyzed}
        onSelectDemoSet={handleSelectSet}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        currentSet={currentSet}
        onSetUpdated={(updated) => {
          setCurrentSet(updated);
          setAllSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onLoadCloudSet={(set) => {
          handleSelectSet(set);
          setAllSets((prev) => [set, ...prev.filter((s) => s.id !== set.id)]);
        }}
      />

      {/* Interactive Onboarding Tour */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          handleCloseOnboarding();
        }}
      />

      {/* Contextual Assistance Drawer */}
      <ContextHelpDrawer
        isOpen={isHelpDrawerOpen}
        onClose={() => setIsHelpDrawerOpen(false)}
        activeTab={activeTab}
        currentSet={currentSet}
        onOpenTour={() => {
          setIsHelpDrawerOpen(false);
          setIsOnboardingOpen(true);
        }}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsHelpDrawerOpen(false);
        }}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onTogglePlay={handleTogglePlay}
        isPlaying={isPlaying}
        onExportPdf={handleExportPdfReport}
        onOpenCloudSync={() => {
          setIsCommandPaletteOpen(false);
          setIsCloudSyncOpen(true);
        }}
        onOpenUpload={() => {
          setIsCommandPaletteOpen(false);
          setIsUploadOpen(true);
        }}
        onOpenTour={() => {
          setIsCommandPaletteOpen(false);
          setIsOnboardingOpen(true);
        }}
        onThemeChange={setTheme}
        currentSet={currentSet}
        onSeek={handleSeek}
      />

      {/* Confirmation Dialog for Destructive Actions */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
