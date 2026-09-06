import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Disc3,
  Play,
  Square,
  Plus,
  Compass,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Search,
  Filter,
  Layers,
  RotateCcw,
  Zap,
  Flame,
  Radio,
  Clock,
  Music,
  FilePlus,
  Trash2,
  X
} from 'lucide-react';
import {
  TechnoSetAnalysis,
  TransitionItem,
  TrackLibraryItem,
  AutoMixSuggestion,
  AutoMixGoal
} from '../types';
import {
  generateAutoMixSuggestions,
  extractLivePlaybackContext
} from '../utils/autoMixSuggester';
import {
  getUserTrackLibrary,
  saveUserTrackItem,
  deleteUserTrackItem,
  resetUserTrackLibrary
} from '../utils/storage';
import { getCamelotColor, parseCamelotKey } from '../utils/harmonicEnergyClashDetector';
import { getKeyAcoustics } from '../utils/eqFrequencyAdvisor';

interface AutoMixSuggestionsCardProps {
  currentSet: TechnoSetAnalysis;
  currentTime: number;
  onPlanTransition: (newTransition: TransitionItem) => void;
  onSeek?: (seconds: number) => void;
}

export function AutoMixSuggestionsCard({
  currentSet,
  currentTime,
  onPlanTransition,
  onSeek
}: AutoMixSuggestionsCardProps) {
  // Library state
  const [library, setLibrary] = useState<TrackLibraryItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(true);

  // Auto-mix parameters
  const [goal, setGoal] = useState<AutoMixGoal>('balanced');
  const [liveSync, setLiveSync] = useState<boolean>(true);
  const [manualKey, setManualKey] = useState<string>('8A');
  const [manualBpm, setManualBpm] = useState<number>(142.0);
  const [manualEnergy, setManualEnergy] = useState<number>(85);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubgenre, setSelectedSubgenre] = useState<string>('Alle');

  // Expanded track card details
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Add Track Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTrack, setNewTrack] = useState<Partial<TrackLibraryItem>>({
    title: '',
    artist: '',
    label: '',
    bpm: 142.0,
    keyCamelot: '8A',
    keyNote: 'A-Moll',
    energy: 85,
    subgenre: 'Peak-Time Raw',
    tags: ['Peak-Time', 'Clean Sub'],
    kickCharacter: 'Punchy 909',
    bassStyle: 'Rolling 16th Sub',
    customNotes: ''
  });

  // Feedback Toast for planned transitions
  const [plannedFeedback, setPlannedFeedback] = useState<string | null>(null);

  // Web Audio Synth Audition State
  const [auditioningTrackId, setAuditioningTrackId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const auditionTimerRef = useRef<number | null>(null);
  const auditionStepRef = useRef<number>(0);

  // Load library from storage
  useEffect(() => {
    getUserTrackLibrary().then((tracks) => {
      setLibrary(tracks);
      setIsLoadingLibrary(false);
    });
  }, []);

  // Compute live context from current playback time
  const liveContext = useMemo(() => {
    return extractLivePlaybackContext(currentSet, currentTime);
  }, [currentSet, currentTime]);

  // Sync manual state when live sync is enabled
  useEffect(() => {
    if (liveSync) {
      setManualKey(liveContext.key);
      setManualBpm(liveContext.bpm);
      setManualEnergy(liveContext.energy);
    }
  }, [liveSync, liveContext.key, liveContext.bpm, liveContext.energy]);

  // Compute suggestions based on active key & bpm
  const suggestions = useMemo<AutoMixSuggestion[]>(() => {
    const activeKey = liveSync ? liveContext.key : manualKey;
    const activeBpm = liveSync ? liveContext.bpm : manualBpm;
    const activeEnergy = liveSync ? liveContext.energy : manualEnergy;

    return generateAutoMixSuggestions(library, {
      currentKey: activeKey,
      currentBpm: activeBpm,
      currentEnergy: activeEnergy,
      goal,
      searchQuery,
      filterSubgenre: selectedSubgenre,
      maxResults: 10
    });
  }, [
    library,
    liveSync,
    liveContext.key,
    liveContext.bpm,
    liveContext.energy,
    manualKey,
    manualBpm,
    manualEnergy,
    goal,
    searchQuery,
    selectedSubgenre
  ]);

  // Stop audition audio on unmount
  useEffect(() => {
    return () => {
      stopAudition();
    };
  }, []);

  // Web Audio Synthesized Audition Engine
  const stopAudition = () => {
    if (auditionTimerRef.current) {
      clearInterval(auditionTimerRef.current);
      auditionTimerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
    setAuditioningTrackId(null);
  };

  const startAudition = (track: TrackLibraryItem) => {
    if (auditioningTrackId === track.id) {
      stopAudition();
      return;
    }
    stopAudition();

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;
      setAuditioningTrackId(track.id);

      const acoustics = getKeyAcoustics(track.keyCamelot);
      const rootHz = acoustics.rootHz || 55.0; // Bass pitch fundamental
      const bpm = track.bpm || 142.0;
      const stepIntervalMs = (60 / bpm / 4) * 1000; // 16th note

      auditionStepRef.current = 0;

      const playStep = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const now = audioCtxRef.current.currentTime;
        const step = auditionStepRef.current;

        // 1. Kick on 1, 5, 9, 13 (Quarter notes)
        if (step % 4 === 0) {
          const kickOsc = audioCtxRef.current.createOscillator();
          const kickGain = audioCtxRef.current.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, now);
          kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

          kickGain.gain.setValueAtTime(0.7, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          kickOsc.connect(kickGain);
          kickGain.connect(audioCtxRef.current.destination);
          kickOsc.start(now);
          kickOsc.stop(now + 0.32);
        }

        // 2. Offbeat Hi-Hat on steps 2, 6, 10, 14
        if (step % 4 === 2) {
          const hatBuffer = audioCtxRef.current.createBuffer(1, audioCtxRef.current.sampleRate * 0.08, audioCtxRef.current.sampleRate);
          const hatData = hatBuffer.getChannelData(0);
          for (let i = 0; i < hatData.length; i++) {
            hatData[i] = Math.random() * 2 - 1;
          }
          const hatSource = audioCtxRef.current.createBufferSource();
          hatSource.buffer = hatBuffer;

          const filter = audioCtxRef.current.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(8000, now);

          const hatGain = audioCtxRef.current.createGain();
          hatGain.gain.setValueAtTime(0.2, now);
          hatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

          hatSource.connect(filter);
          filter.connect(hatGain);
          hatGain.connect(audioCtxRef.current.destination);
          hatSource.start(now);
          hatSource.stop(now + 0.08);
        }

        // 3. Tonal Bass Synth in the Track's Camelot Key
        if (step % 2 === 1) {
          const bassOsc = audioCtxRef.current.createOscillator();
          const bassGain = audioCtxRef.current.createGain();
          const bassFilter = audioCtxRef.current.createBiquadFilter();

          bassOsc.type = 'sawtooth';
          // Alternate octaves or minor thirds for melodic groove
          const pitchMultiplier = step % 4 === 1 ? 1 : 1.2; // Root vs minor third
          bassOsc.frequency.setValueAtTime(rootHz * 2 * pitchMultiplier, now);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(450, now);
          bassFilter.Q.setValueAtTime(4, now);

          bassGain.gain.setValueAtTime(0.25, now);
          bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(audioCtxRef.current.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.14);
        }

        auditionStepRef.current = (auditionStepRef.current + 1) % 16;
      };

      // Start loop
      playStep();
      auditionTimerRef.current = window.setInterval(playStep, stepIntervalMs);
    } catch (err) {
      console.warn('Could not initialize audio audition:', err);
    }
  };

  // Plan transition handler
  const handlePlanTransition = (suggestion: AutoMixSuggestion) => {
    const activeKey = liveSync ? liveContext.key : manualKey;
    const activeBpm = liveSync ? liveContext.bpm : manualBpm;

    const newTrans: TransitionItem = {
      id: `trans-auto-${Date.now()}`,
      timestamp: currentTime,
      duration: suggestion.transitionStrategy.recommendedDurationSec,
      qualityScore: suggestion.overallMatchScore,
      phaseScore: Math.min(99, Math.max(88, suggestion.overallMatchScore - 2)),
      harmonicScore: suggestion.harmonicMatch.score,
      eqClashRisk: suggestion.transitionStrategy.riskLevel,
      fromKey: activeKey,
      toKey: suggestion.track.keyCamelot,
      fromBpm: activeBpm,
      toBpm: suggestion.track.bpm,
      notes: `Auto-Mix: ${suggestion.track.artist} - ${suggestion.track.title} (${suggestion.harmonicMatch.typeLabel}, ${suggestion.bpmMatch.statusLabel}). ${suggestion.transitionStrategy.eqChoreography}`,
      type: suggestion.transitionStrategy.style
    };

    onPlanTransition(newTrans);
    setPlannedFeedback(`Übergang zu "${suggestion.track.title}" bei ${liveContext.timestampFormatted} erfolgreich eingeplant!`);
    setTimeout(() => {
      setPlannedFeedback(null);
    }, 4500);
  };

  // Save new track form
  const handleSaveNewTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrack.title || !newTrack.artist) return;

    const trackToAdd: TrackLibraryItem = {
      id: `user-track-${Date.now()}`,
      title: newTrack.title.trim(),
      artist: newTrack.artist.trim(),
      label: newTrack.label?.trim() || 'Self-Released',
      bpm: Number(newTrack.bpm) || 142.0,
      keyCamelot: newTrack.keyCamelot || '8A',
      keyNote: newTrack.keyNote || 'A-Moll',
      energy: Number(newTrack.energy) || 85,
      subgenre: (newTrack.subgenre as any) || 'Peak-Time Raw',
      durationSec: 360,
      introBars: 32,
      outroBars: 32,
      tags: newTrack.tags || ['Custom Track'],
      kickCharacter: newTrack.kickCharacter || 'Punchy 909',
      bassStyle: newTrack.bassStyle || 'Rolling 16th Sub',
      customNotes: newTrack.customNotes || '',
      isUserCustom: true
    };

    const updated = await saveUserTrackItem(trackToAdd);
    setLibrary(updated);
    setIsAddModalOpen(false);
    setNewTrack({
      title: '',
      artist: '',
      label: '',
      bpm: 142.0,
      keyCamelot: '8A',
      keyNote: 'A-Moll',
      energy: 85,
      subgenre: 'Peak-Time Raw',
      tags: ['Peak-Time', 'Custom'],
      kickCharacter: 'Punchy 909',
      bassStyle: 'Rolling 16th Sub',
      customNotes: ''
    });
  };

  const handleDeleteTrack = async (id: string) => {
    if (window.confirm('Track wirklich aus der DJ-Library löschen?')) {
      const updated = await deleteUserTrackItem(id);
      setLibrary(updated);
    }
  };

  const handleResetLibrary = async () => {
    if (window.confirm('Library auf die Standard-Techno-Referenztracks zurücksetzen?')) {
      const reset = await resetUserTrackLibrary();
      setLibrary(reset);
    }
  };

  const topSuggestion = suggestions[0];
  const runnerUpSuggestions = suggestions.slice(1);

  const subgenres = [
    'Alle',
    'Peak-Time Raw',
    'Hypnotic & Deep',
    'Hard Techno',
    'Acid Techno',
    'Industrial',
    'Groove / Detroit',
    'Dark Minimal'
  ];

  const camelotKeys = [
    '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
    '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'
  ];

  return (
    <section
      id="auto-mix-suggestions-section"
      className="bg-[#121214] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl"
    >
      {/* 1. Header & Live Sync Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Auto-Mix Suggestions
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                Harmonic & BPM Match
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Echtzeit-Empfehlungen für den optimalen nächsten Track aus der Library – harmonisch nach Camelot und mit CDJ-Pitchabstimmung abgestimmt.
          </p>
        </div>

        {/* Live Sync vs Manual Override */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="toggle-live-sync-btn"
            onClick={() => setLiveSync(!liveSync)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all border ${
              liveSync
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Schaltet zwischen Live-Auslesung des Playheads und manueller Zielauswahl um"
          >
            <Radio className={`w-3.5 h-3.5 ${liveSync ? 'text-emerald-400 animate-pulse' : ''}`} />
            {liveSync ? 'Live Playhead Sync: AKTIV' : 'Manuelle Tonart/BPM'}
          </button>

          <button
            id="open-add-track-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Track hinzufügen
          </button>

          <button
            id="reset-library-btn"
            onClick={handleResetLibrary}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
            title="Library auf Standard-Techno-Tracks zurücksetzen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Planned Feedback Notification */}
      {plannedFeedback && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{plannedFeedback}</span>
          </div>
          <button
            onClick={() => setPlannedFeedback(null)}
            className="text-emerald-400/80 hover:text-emerald-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Current State Bar & Manual Controllers */}
      <div className="bg-[#0C0C0E] border border-white/5 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Position:</span>
            <span className="text-white font-bold">{liveContext.timestampFormatted}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Aktuelle Tonart:</span>
            {liveSync ? (
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold text-white border"
                style={{
                  backgroundColor: `${getCamelotColor(liveContext.key)}25`,
                  borderColor: `${getCamelotColor(liveContext.key)}60`,
                  color: getCamelotColor(liveContext.key)
                }}
              >
                {liveContext.key}
              </span>
            ) : (
              <select
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                className="bg-black/50 border border-white/20 rounded px-2 py-0.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                {camelotKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Aktuelles Tempo:</span>
            {liveSync ? (
              <span className="text-white font-bold">{liveContext.bpm.toFixed(1)} BPM</span>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="120"
                  max="160"
                  value={manualBpm}
                  onChange={(e) => setManualBpm(parseFloat(e.target.value) || 140)}
                  className="w-16 bg-black/50 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-400">BPM</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Energie:</span>
            {liveSync ? (
              <div className="flex items-center gap-1.5">
                <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${liveContext.energy}%` }}
                  />
                </div>
                <span className="text-amber-400 font-bold">{liveContext.energy}%</span>
              </div>
            ) : (
              <input
                type="range"
                min="30"
                max="100"
                value={manualEnergy}
                onChange={(e) => setManualEnergy(parseInt(e.target.value, 10))}
                className="w-20 accent-amber-400 h-1 bg-white/10 rounded"
              />
            )}
          </div>
        </div>

        {/* Mix Intention / Goal Buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-500 font-mono uppercase mr-1">Ziel:</span>
          <button
            onClick={() => setGoal('balanced')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              goal === 'balanced'
                ? 'bg-cyan-500 text-black font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Ausgewogen
          </button>
          <button
            onClick={() => setGoal('energy-lift')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
              goal === 'energy-lift'
                ? 'bg-amber-400 text-black font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Zap className="w-3 h-3" />
            +1 Energy Lift
          </button>
          <button
            onClick={() => setGoal('hypnotic-flow')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
              goal === 'hypnotic-flow'
                ? 'bg-emerald-400 text-black font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc3 className="w-3 h-3" />
            Hypnotic Lock (0)
          </button>
          <button
            onClick={() => setGoal('deep-grounding')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              goal === 'deep-grounding'
                ? 'bg-purple-500 text-white font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            -1 Grounding
          </button>
          <button
            onClick={() => setGoal('relative-swap')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              goal === 'relative-swap'
                ? 'bg-rose-500 text-white font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            A ↔ B Dur/Moll
          </button>
        </div>
      </div>

      {/* 3. Subgenre Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          {subgenres.map((sg) => (
            <button
              key={sg}
              onClick={() => setSelectedSubgenre(sg)}
              className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all ${
                selectedSubgenre === sg
                  ? 'bg-white/20 text-white font-medium border border-white/30'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {sg}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Track, Artist oder Label suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
        </div>
      </div>

      {/* 4. Top Recommendation Spotlight Card */}
      {topSuggestion ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-[#14181f] to-[#121214] border-2 border-emerald-500/40 rounded-xl p-4 md:p-5 shadow-[0_0_25px_rgba(16,185,129,0.1)] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 fill-black" />
                TOP MATCH • BESTER NÄCHSTER TRACK
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Score: <strong className="text-emerald-300 font-bold text-sm">{topSuggestion.overallMatchScore}%</strong>
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span>{topSuggestion.track.subgenre}</span>
              {topSuggestion.track.label && (
                <>
                  <span>•</span>
                  <span className="text-slate-300">[{topSuggestion.track.label}]</span>
                </>
              )}
            </div>
          </div>

          {/* Main Track & Transition Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Track Info */}
            <div className="lg:col-span-4 flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white tracking-wide">
                {topSuggestion.track.title}
              </h3>
              <p className="text-sm text-cyan-400 font-medium">
                {topSuggestion.track.artist}
              </p>
              {topSuggestion.track.customNotes && (
                <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-0.5">
                  "{topSuggestion.track.customNotes}"
                </p>
              )}
            </div>

            {/* Harmonic & Pitch Transition Pathway */}
            <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-lg p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                {/* From -> To Key */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${getCamelotColor(topSuggestion.harmonicMatch.fromKey)}25`,
                      color: getCamelotColor(topSuggestion.harmonicMatch.fromKey)
                    }}
                  >
                    {topSuggestion.harmonicMatch.fromKey}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${getCamelotColor(topSuggestion.harmonicMatch.toKey)}30`,
                      color: getCamelotColor(topSuggestion.harmonicMatch.toKey),
                      borderColor: getCamelotColor(topSuggestion.harmonicMatch.toKey)
                    }}
                  >
                    {topSuggestion.harmonicMatch.toKey} ({topSuggestion.track.keyNote})
                  </span>
                </div>

                {/* Harmonic Delta Label */}
                <span className="text-[10px] font-semibold text-emerald-400">
                  {topSuggestion.harmonicMatch.typeLabel}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-white/5">
                {/* BPM & Fader */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400">{topSuggestion.bpmMatch.fromBpm.toFixed(1)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-white font-bold">{topSuggestion.track.bpm.toFixed(1)} BPM</span>
                </div>

                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    Math.abs(topSuggestion.bpmMatch.pitchBendPercent) <= 1.5
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {topSuggestion.bpmMatch.pitchBendPercent > 0 ? '+' : ''}
                  {topSuggestion.bpmMatch.pitchBendPercent.toFixed(2)}% Pitch
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 justify-end">
              <button
                id="plan-top-transition-btn"
                onClick={() => handlePlanTransition(topSuggestion)}
                className="flex-1 lg:flex-none px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                title="Fügt diesen Übergang direkt in die Transitions-Liste des aktuellen Sets ein"
              >
                <Plus className="w-3.5 h-3.5" />
                Als Übergang planen
              </button>

              <button
                id={`audition-top-${topSuggestion.track.id}`}
                onClick={() => startAudition(topSuggestion.track)}
                className={`flex-1 lg:flex-none px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  auditioningTrackId === topSuggestion.track.id
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {auditioningTrackId === topSuggestion.track.id ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-rose-300 text-rose-300" />
                    Stoppen
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    Vorhören ({topSuggestion.track.keyCamelot})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed DJ Choreography Advice */}
          <div className="bg-[#090A0C] border border-white/5 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" />
                Mixer-Choreografie & EQ-Empfehlung:
              </span>
              <p className="text-slate-200">
                {topSuggestion.transitionStrategy.eqChoreography}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>Länge: <strong className="text-white">{topSuggestion.transitionStrategy.recommendedBars} Takte</strong> (~{topSuggestion.transitionStrategy.recommendedDurationSec}s)</span>
              <span>Stil: <strong className="text-cyan-300 capitalize">{topSuggestion.transitionStrategy.style.replace('-', ' ')}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-white/[0.02] border border-white/5 rounded-lg text-slate-400 text-xs">
          Keine Tracks gefunden, die zu den Filtern passen. Ändere die Suchkriterien oder füge neue Tracks hinzu.
        </div>
      )}

      {/* 5. Runner-Up Candidate Recommendations */}
      {runnerUpSuggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>WEITERE EMPFOHLENE TRACKS ({runnerUpSuggestions.length})</span>
            <span>SORTIERT NACH GESAMT-KOMPATIBILITÄT</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {runnerUpSuggestions.map((sugg) => {
              const isExpanded = expandedTrackId === sugg.track.id;
              const isAuditioning = auditioningTrackId === sugg.track.id;
              const camelotColor = getCamelotColor(sugg.track.keyCamelot);

              return (
                <div
                  key={sugg.track.id}
                  className="bg-[#0F1012] hover:bg-[#15171A] border border-white/5 hover:border-white/15 rounded-lg p-3 transition-all flex flex-col gap-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Track Info & Rank */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/5 text-slate-400 font-mono text-xs flex items-center justify-center shrink-0">
                        #{sugg.rank}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {sugg.track.title}
                          </h4>
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono shrink-0"
                            style={{
                              backgroundColor: `${camelotColor}20`,
                              color: camelotColor,
                              border: `1px solid ${camelotColor}50`
                            }}
                          >
                            {sugg.track.keyCamelot}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {sugg.track.bpm.toFixed(1)} BPM
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 truncate">
                          {sugg.track.artist} {sugg.track.label ? `• [${sugg.track.label}]` : ''} • <span className="text-slate-500">{sugg.track.subgenre}</span>
                        </p>
                      </div>
                    </div>

                    {/* Compatibility Badges & Actions */}
                    <div className="flex items-center flex-wrap gap-2 shrink-0">
                      {/* Match Score Badge */}
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          sugg.overallMatchScore >= 90
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : sugg.overallMatchScore >= 75
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {sugg.overallMatchScore}% Match
                      </span>

                      {/* Harmonic Type Tag */}
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        {sugg.harmonicMatch.typeLabel.split('(')[0].trim()}
                      </span>

                      {/* Pitch Bend Tag */}
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        {sugg.bpmMatch.pitchBendPercent > 0 ? '+' : ''}
                        {sugg.bpmMatch.pitchBendPercent.toFixed(2)}% Pitch
                      </span>

                      {/* Audition Button */}
                      <button
                        onClick={() => startAudition(sugg.track)}
                        className={`p-1.5 rounded text-xs transition-all ${
                          isAuditioning
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                        }`}
                        title="Diesen Track im Browser-Synthesizer vorhören"
                      >
                        {isAuditioning ? (
                          <Square className="w-3.5 h-3.5 fill-rose-300" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Plan Transition */}
                      <button
                        onClick={() => handlePlanTransition(sugg)}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-emerald-500 hover:text-black text-white text-xs font-semibold transition-all flex items-center gap-1"
                        title="Als nächsten Übergang einplanen"
                      >
                        <Plus className="w-3 h-3" />
                        Planen
                      </button>

                      {/* Toggle Details */}
                      <button
                        onClick={() => setExpandedTrackId(isExpanded ? null : sugg.track.id)}
                        className="p-1 rounded text-slate-500 hover:text-slate-300 text-xs"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="mt-1 pt-2 border-t border-white/5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/30 rounded p-2.5">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Harmonische Bewertung:</span>
                        <p className="text-slate-300 mt-0.5">{sugg.harmonicMatch.description}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">CDJ Pitch-Aktion:</span>
                        <p className="text-slate-300 mt-0.5">{sugg.bpmMatch.cdjPitchFaderAction}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Mixer-Fahrweise:</span>
                        <p className="text-slate-300 mt-0.5">{sugg.transitionStrategy.eqChoreography}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Add Custom Track Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141518] border border-white/15 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Track zur Library hinzufügen</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTrack} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Titel *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Hydraulic Pulse"
                    value={newTrack.title}
                    onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Artist *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Planetary Assault Systems"
                    value={newTrack.artist}
                    onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">BPM *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newTrack.bpm}
                    onChange={(e) => setNewTrack({ ...newTrack, bpm: parseFloat(e.target.value) || 140 })}
                    className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Camelot Key *</label>
                  <select
                    value={newTrack.keyCamelot}
                    onChange={(e) => setNewTrack({ ...newTrack, keyCamelot: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {camelotKeys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Energie ({newTrack.energy}%)</label>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={newTrack.energy}
                    onChange={(e) => setNewTrack({ ...newTrack, energy: parseInt(e.target.value, 10) })}
                    className="accent-cyan-400 mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Subgenre</label>
                  <select
                    value={newTrack.subgenre}
                    onChange={(e) => setNewTrack({ ...newTrack, subgenre: e.target.value as any })}
                    className="bg-black/50 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {subgenres.filter((s) => s !== 'Alle').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-mono text-[11px]">Label</label>
                  <input
                    type="text"
                    placeholder="z.B. Ostgut Ton / Klockworks"
                    value={newTrack.label}
                    onChange={(e) => setNewTrack({ ...newTrack, label: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-mono text-[11px]">DJ-Notizen / Mix-Hinweise</label>
                <textarea
                  rows={2}
                  placeholder="z.B. Hat extrem druckvolle 40Hz Kick. Im Mix Low-End erst nach 32 Takten übergeben."
                  value={newTrack.customNotes}
                  onChange={(e) => setNewTrack({ ...newTrack, customNotes: e.target.value })}
                  className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-400 hover:text-white bg-white/5"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  Track Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
