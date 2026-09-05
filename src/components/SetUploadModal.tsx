import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileAudio,
  X,
  AlertTriangle,
  Sparkles,
  Disc3,
  Check,
  Loader2,
  Globe,
  Radio,
  ExternalLink,
  Play,
  ArrowRight,
  Music,
  RefreshCw,
  Volume2,
  Info,
  Link as LinkIcon
} from 'lucide-react';
import { TechnoSetAnalysis, StreamMetadataResult, StreamingPlatform } from '../types';
import { analyzeTechnoAudioFile, downloadAndAnalyzeStream } from '../utils/audioAnalyzer';
import { DEMO_SETS } from '../data/demoSets';
import { formatTimeSeconds } from '../utils/pdfExport';

interface SetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAnalyzed: (newSet: TechnoSetAnalysis) => void;
  onSelectDemoSet: (set: TechnoSetAnalysis) => void;
}

type UploadTab = 'file' | 'stream' | 'demos';

export const SetUploadModal: React.FC<SetUploadModalProps> = ({
  isOpen,
  onClose,
  onSetAnalyzed,
  onSelectDemoSet
}) => {
  const [activeTab, setActiveTab] = useState<UploadTab>('stream');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [streamUrlInput, setStreamUrlInput] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolvedMetadata, setResolvedMetadata] = useState<StreamMetadataResult | null>(null);
  const [popularSets, setPopularSets] = useState<StreamMetadataResult[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load popular live techno sets from HearThis API on mount
  useEffect(() => {
    if (isOpen && popularSets.length === 0) {
      loadPopularSets();
    }
  }, [isOpen]);

  const loadPopularSets = async () => {
    setIsLoadingPopular(true);
    try {
      const res = await fetch('/api/stream/popular-techno');
      const data = await res.json();
      if (data.success && Array.isArray(data.sets)) {
        setPopularSets(data.sets);
      }
    } catch (err) {
      console.error('Failed to load popular sets:', err);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  if (!isOpen) return null;

  // Local file processing
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/i)) {
      setError('Bitte wähle eine gültige Audiodatei aus (MP3, WAV, FLAC, AAC, OGG).');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressText('Initialisiere Web Audio Analyzer...');

    try {
      const result = await analyzeTechnoAudioFile(file, (step, percent) => {
        setProgressText(step);
        setProgressPercent(percent);
      });

      onSetAnalyzed(result);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError('Fehler beim Decodieren der Audiodatei: ' + (err.message || 'Format nicht unterstützt'));
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // URL Stream Resolution
  const handleResolveUrl = async (urlToResolve?: string) => {
    const targetUrl = (urlToResolve || streamUrlInput).trim();
    if (!targetUrl) {
      setError('Bitte gib einen gültigen Link von SoundCloud, HearThis, Mixcloud oder eine direkte MP3-URL ein.');
      return;
    }

    setError(null);
    setIsResolving(true);
    setResolvedMetadata(null);

    try {
      const res = await fetch('/api/stream/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();
      if (!data.success || !data.metadata) {
        throw new Error(data.error || 'Audio-Stream konnte nicht aufgelöst werden.');
      }

      setResolvedMetadata(data.metadata);
      if (data.metadata.error) {
        setError(data.metadata.error);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Auflösen der URL');
    } finally {
      setIsResolving(false);
    }
  };

  // Start download & analysis for stream
  const handleAnalyzeStream = async (meta: StreamMetadataResult) => {
    if (!meta.streamUrl) {
      setError('Für dieses Set ist kein direkter Audio-Stream verfügbar.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressText('Verbinde mit Stream-Proxy...');

    try {
      const result = await downloadAndAnalyzeStream(
        meta.streamUrl,
        {
          title: meta.title,
          artist: meta.artist,
          platform:
            meta.platform === 'soundcloud'
              ? 'soundcloud'
              : meta.platform === 'hearthis'
              ? 'hearthis'
              : meta.platform === 'mixcloud'
              ? 'mixcloud'
              : 'direct-stream',
          artworkUrl: meta.artworkUrl,
          permalinkUrl: meta.permalinkUrl
        },
        (step, percent) => {
          setProgressText(step);
          setProgressPercent(percent);
        }
      );

      onSetAnalyzed(result);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error('Stream analysis failed:', err);
      setError('Stream-Analyse fehlgeschlagen: ' + (err.message || 'Netzwerkfehler'));
      setIsProcessing(false);
    }
  };

  // Helper to detect platform from typed URL for badge display
  const detectPlatformFromUrl = (url: string): StreamingPlatform => {
    const l = url.toLowerCase();
    if (l.includes('hearthis.at') || l.includes('hearthis.app')) return 'hearthis';
    if (l.includes('soundcloud.com')) return 'soundcloud';
    if (l.includes('mixcloud.com')) return 'mixcloud';
    if (l.endsWith('.mp3') || l.endsWith('.wav') || l.endsWith('.flac') || l.includes('audio')) return 'direct';
    return 'unknown';
  };

  const detectedPlatform = detectPlatformFromUrl(streamUrlInput);

  return (
    <div
      id="upload-set-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="upload-set-modal-window"
        className="bg-[#121214] border border-white/10 rounded-xl w-full max-w-2xl p-5 shadow-2xl relative flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Disc3 className="w-5 h-5 text-emerald-400 animate-spin-slow" />
            <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
              Techno-Set importieren & analysieren
            </h3>
          </div>
          <p className="font-mono text-[11px] text-slate-400">
            Wähle eine lokale Audiodatei oder streame direkt von <strong>SoundCloud</strong>, <strong>HearThis.at</strong>, <strong>Mixcloud</strong> oder direkten Web-Links.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-pink-950/40 border border-pink-800/60 p-3 rounded-lg flex items-start gap-2.5 text-[11px] font-mono text-pink-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-pink-400 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-pink-400 hover:text-pink-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Analysis Progress View */}
        {isProcessing ? (
          <div className="bg-white/[0.02] border border-emerald-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center my-2">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <Radio className="w-4 h-4 text-emerald-300 absolute inset-0 m-auto" />
            </div>

            <div className="space-y-1">
              <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                {progressText}
              </h4>
              <p className="font-mono text-[11px] text-slate-400">
                Extrahiere Subbass (30-80 Hz), Camelot-Harmonien, BPM-Kurven & Drops...
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md bg-black/80 border border-white/10 rounded-full h-2.5 overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              />
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400 font-bold">{progressPercent}%</span>
              <span>•</span>
              <span>100% Web Audio Analyse</span>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-white/5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stream');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stream'
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>SoundCloud / HearThis / Web</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded uppercase">Neu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('file');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'file'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Lokale Datei</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('demos');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'demos'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo-Sets</span>
              </button>
            </div>

            {/* TAB 1: STREAMING & URL RESOLVER */}
            {activeTab === 'stream' && (
              <div className="flex flex-col gap-3.5">
                {/* Input & Resolve Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Set-URL eingeben:</span>
                    </label>

                    {/* Detected Platform Tag */}
                    {detectedPlatform !== 'unknown' && (
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                          detectedPlatform === 'hearthis'
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                            : detectedPlatform === 'soundcloud'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                            : detectedPlatform === 'mixcloud'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {detectedPlatform === 'hearthis'
                          ? 'HearThis.at erkannt'
                          : detectedPlatform === 'soundcloud'
                          ? 'SoundCloud erkannt'
                          : detectedPlatform === 'mixcloud'
                          ? 'Mixcloud erkannt'
                          : 'Direkter Audio-Link'}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        placeholder="https://hearthis.at/dj/... oder https://soundcloud.com/..."
                        value={streamUrlInput}
                        onChange={(e) => setStreamUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleResolveUrl();
                        }}
                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg py-2.5 px-3 font-mono text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResolveUrl()}
                      disabled={isResolving || !streamUrlInput.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-mono text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Laden...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Prüfen & Laden</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <span>Unterstützt:</span>
                    <span className="text-teal-400 font-bold">HearThis.at</span>
                    <span>•</span>
                    <span className="text-orange-400 font-bold">SoundCloud</span>
                    <span>•</span>
                    <span className="text-blue-400 font-bold">Mixcloud</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">MP3 / WAV / Web-Stream</span>
                  </div>
                </div>

                {/* Resolved Track Preview Card */}
                {resolvedMetadata && (
                  <div className="bg-[#0b0b0e] border border-emerald-500/30 rounded-lg p-3.5 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      {/* Artwork */}
                      {resolvedMetadata.artworkUrl ? (
                        <img
                          src={resolvedMetadata.artworkUrl}
                          alt={resolvedMetadata.title}
                          className="w-16 h-16 rounded-md object-cover border border-white/10 shrink-0 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Music className="w-6 h-6 text-emerald-400" />
                        </div>
                      )}

                      {/* Track Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                              resolvedMetadata.platform === 'hearthis'
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : resolvedMetadata.platform === 'soundcloud'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                : resolvedMetadata.platform === 'mixcloud'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {resolvedMetadata.platform}
                          </span>
                          {resolvedMetadata.genre && (
                            <span className="text-[9px] font-mono text-slate-400 truncate">
                              {resolvedMetadata.genre}
                            </span>
                          )}
                        </div>

                        <h4 className="font-mono text-sm font-bold text-white truncate mb-0.5">
                          {resolvedMetadata.title}
                        </h4>
                        <p className="font-mono text-[11px] text-slate-400 truncate">
                          {resolvedMetadata.artist}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-1">
                          {resolvedMetadata.duration > 0 && (
                            <span>Dauer: <strong className="text-white">{formatTimeSeconds(resolvedMetadata.duration)}</strong></span>
                          )}
                          {resolvedMetadata.permalinkUrl && (
                            <a
                              href={resolvedMetadata.permalinkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <span>Original öffnen</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Note or Tracklist for Mixcloud */}
                    {resolvedMetadata.note && (
                      <div className="text-[10px] font-mono text-slate-300 bg-white/5 p-2 rounded border border-white/5 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{resolvedMetadata.note}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {resolvedMetadata.downloadable && resolvedMetadata.streamUrl ? (
                      <button
                        type="button"
                        onClick={() => handleAnalyzeStream(resolvedMetadata)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>Set streamen & vollständige Techno-Analyse starten</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                        <span>Direkter Audio-Download durch Plattform limitiert.</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('file')}
                          className="text-emerald-400 hover:underline font-bold"
                        >
                          Als lokale MP3 einfügen →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Popular Live Techno Sets for 1-Click Testing */}
                <div className="border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Live Techno-Sets zum Direkt-Testen (HearThis.at):</span>
                    </div>

                    <button
                      type="button"
                      onClick={loadPopularSets}
                      disabled={isLoadingPopular}
                      className="text-slate-400 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isLoadingPopular ? 'animate-spin' : ''}`} />
                      <span>Neu laden</span>
                    </button>
                  </div>

                  {isLoadingPopular ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Lade beliebte Techno-Sets...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {popularSets.map((pop, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setStreamUrlInput(pop.permalinkUrl || pop.streamUrl || '');
                            handleAnalyzeStream(pop);
                          }}
                          className="bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 p-2.5 rounded-lg flex items-center gap-2.5 transition-all group cursor-pointer hover:bg-white/[0.04]"
                        >
                          {pop.artworkUrl ? (
                            <img
                              src={pop.artworkUrl}
                              alt={pop.title}
                              className="w-10 h-10 rounded object-cover border border-white/10 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-emerald-400">
                              <Music className="w-4 h-4" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[11px] font-bold text-white group-hover:text-emerald-400 truncate">
                              {pop.title}
                            </div>
                            <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 mt-0.5">
                              <span className="truncate">{pop.artist}</span>
                              <span className="shrink-0">{formatTimeSeconds(pop.duration)}</span>
                            </div>
                          </div>

                          <div className="w-6 h-6 rounded-full bg-white/5 group-hover:bg-emerald-500 group-hover:text-black flex items-center justify-center shrink-0 transition-colors">
                            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: LOCAL FILE DRAG & DROP */}
            {activeTab === 'file' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
                  onChange={(e) => {
                    if (e.target.value && e.target.files && e.target.files.length > 0) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shadow-inner">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-mono text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Audiodatei hier ablegen oder durchsuchen
                  </p>
                  <p className="font-mono text-[10px] text-slate-500 mt-1">
                    WAV, MP3, FLAC, AAC, AIFF bis zu 2 Stunden Sets (100% Offline im Browser decodiert)
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: DEMO SETS */}
            {activeTab === 'demos' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vorkonfigurierte Techno-Club-Sets:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {DEMO_SETS.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => {
                        onSelectDemoSet(demo);
                        onClose();
                      }}
                      className="bg-white/5 border border-white/10 hover:border-emerald-500/50 p-3 rounded-lg text-left transition-all group cursor-pointer hover:bg-white/[0.08] flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono text-xs font-bold text-white group-hover:text-emerald-400 truncate mb-1">
                          {demo.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {formatTimeSeconds(demo.duration)} • {demo.peakMoments?.length || 0} Drops
                        </div>
                      </div>

                      <div className="flex items-center justify-between font-mono text-[10px] pt-2 border-t border-white/5">
                        <span className="text-emerald-400 font-bold">{demo.bpmAverage} BPM</span>
                        <span className="text-purple-400 font-bold">{demo.dominantKey}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
