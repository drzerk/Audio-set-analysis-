import React, { useState, useEffect, useRef } from 'react';
import { TechnoSetAnalysis, TransitionItem, PeakMoment, BoothTheme, AiAssessment } from './types';
import { DEMO_SETS } from './data/demoSets';
import { getLocalSets, saveLocalSet, deleteLocalSet, syncSetToCloud } from './utils/storage';
import { exportSetReportAsPdf, formatTimeSeconds } from './utils/pdfExport';
import { TechnoPreviewAudioEngine } from './utils/audioAnalyzer';

import { HeaderBar } from './components/HeaderBar';
import { AudioDeck } from './components/AudioDeck';
import { BpmHarmonicChart } from './components/BpmHarmonicChart';
import { TransitionInspector } from './components/TransitionInspector';
import { PeakMomentsRadar } from './components/PeakMomentsRadar';
import { TechnicalStatsCard } from './components/TechnicalStatsCard';
import { AiAssessmentCard } from './components/AiAssessmentCard';
import { SetUploadModal } from './components/SetUploadModal';
import { CloudSyncModal } from './components/CloudSyncModal';

export default function App() {
  const [allSets, setAllSets] = useState<TechnoSetAnalysis[]>(DEMO_SETS);
  const [currentSet, setCurrentSet] = useState<TechnoSetAnalysis>(DEMO_SETS[0]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [theme, setTheme] = useState<BoothTheme>('booth-dark');

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const audioEngineRef = useRef<TechnoPreviewAudioEngine | null>(null);
  const playIntervalRef = useRef<number | null>(null);

  // Initialize Audio Engine and load stored sets from IndexedDB
  useEffect(() => {
    audioEngineRef.current = new TechnoPreviewAudioEngine();

    getLocalSets().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setAllSets(loaded);
        setCurrentSet(loaded[0]);
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
  }, [isPlaying, currentSet.bpmAverage, currentSet.duration]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isPlaying && audioEngineRef.current) {
      audioEngineRef.current.stop();
      audioEngineRef.current.start(currentSet.bpmAverage, time);
    }
  };

  const handleJumpToTransition = (t: TransitionItem) => {
    // Jump 12s before transition to listen to the blend
    const target = Math.max(0, t.timestamp - 12);
    handleSeek(target);
    setIsPlaying(true);
  };

  const handleJumpToPeak = (p: PeakMoment) => {
    // Jump 8s before the drop to hear the build-up and explosive drop
    const target = Math.max(0, p.timestamp - 8);
    handleSeek(target);
    setIsPlaying(true);
  };

  const handleSelectSet = (set: TechnoSetAnalysis) => {
    setIsPlaying(false);
    setCurrentSet(set);
    setCurrentTime(0);
  };

  const handleSetAnalyzed = (newSet: TechnoSetAnalysis) => {
    setAllSets((prev) => [newSet, ...prev]);
    setCurrentSet(newSet);
    setCurrentTime(0);
    saveLocalSet(newSet);
  };

  // Quick edits for fast workflow
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
  };

  const handleDeleteTransition = (id: string) => {
    const updatedTransitions = currentSet.transitions.filter((t) => t.id !== id);
    const updatedSet: TechnoSetAnalysis = {
      ...currentSet,
      transitions: updatedTransitions,
      updatedAt: new Date().toISOString()
    };
    setCurrentSet(updatedSet);
    setAllSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    saveLocalSet(updatedSet);
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
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    const res = await syncSetToCloud(currentSet);
    setIsSyncing(false);
    if (res.success) {
      setCurrentSet((prev) => ({ ...prev, isCloudSynced: true }));
    }
  };

  // Theme root styling
  const themeClass =
    theme === 'red-stage-night'
      ? 'bg-[#0d0404] text-red-100 selection:bg-red-900 selection:text-white'
      : theme === 'cyan-laser'
      ? 'bg-[#040a0f] text-cyan-100 selection:bg-cyan-900 selection:text-white'
      : 'bg-zinc-950 text-zinc-100 selection:bg-emerald-900 selection:text-white';

  return (
    <div className={`min-h-screen ${themeClass} flex flex-col font-sans transition-colors duration-300`}>
      {/* Top Application Header */}
      <HeaderBar
        currentSet={currentSet}
        allSets={allSets}
        onSelectSet={handleSelectSet}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onExportPdf={() => exportSetReportAsPdf(currentSet)}
        theme={theme}
        onThemeChange={setTheme}
        isSyncing={isSyncing}
        onQuickSync={handleQuickSync}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* 1. Main DJ Audio Deck & Scrubber */}
        <AudioDeck
          currentSet={currentSet}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onJumpToTransition={handleJumpToTransition}
          onJumpToPeak={handleJumpToPeak}
        />

        {/* 2. Graphical BPM & Harmonic Progression Visualizer */}
        <BpmHarmonicChart
          currentSet={currentSet}
          currentTime={currentTime}
          onSeek={handleSeek}
        />

        {/* 3. Technical Audio & Mastering Metrics */}
        <TechnicalStatsCard metrics={currentSet.technicalMetrics} />

        {/* 4. Dual Grid: Transition Quality Inspector & Peak Moments Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TransitionInspector
            currentSet={currentSet}
            currentTime={currentTime}
            onJumpToTransition={handleJumpToTransition}
            onUpdateTransition={handleUpdateTransition}
            onDeleteTransition={handleDeleteTransition}
            onAddTransitionAtCurrentTime={handleAddTransitionAtCurrentTime}
          />

          <PeakMomentsRadar
            currentSet={currentSet}
            currentTime={currentTime}
            onJumpToPeak={handleJumpToPeak}
            onAddPeakAtCurrentTime={handleAddPeakAtCurrentTime}
          />
        </div>

        {/* 5. AI Master Assessment & Crowd Psychology */}
        <AiAssessmentCard
          currentSet={currentSet}
          onUpdateAssessment={handleUpdateAssessment}
        />
      </main>

      {/* Footer info for DJ booth */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-3 px-4 text-center font-mono text-xs text-zinc-500">
        TechnoSet Analyzer Pro • 100% Offline Web Audio Engine • Camelot Harmonik & Onset-Detektion • Bühnen-Modus
      </footer>

      {/* Modals */}
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
    </div>
  );
}
