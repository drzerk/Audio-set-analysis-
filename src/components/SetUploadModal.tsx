import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, X, AlertTriangle, Sparkles, Disc3, Check, Loader2 } from 'lucide-react';
import { TechnoSetAnalysis } from '../types';
import { analyzeTechnoAudioFile } from '../utils/audioAnalyzer';
import { DEMO_SETS } from '../data/demoSets';

interface SetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAnalyzed: (newSet: TechnoSetAnalysis) => void;
  onSelectDemoSet: (set: TechnoSetAnalysis) => void;
}

export const SetUploadModal: React.FC<SetUploadModalProps> = ({
  isOpen,
  onClose,
  onSetAnalyzed,
  onSelectDemoSet
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

  return (
    <div
      id="upload-set-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="upload-set-modal-window"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Disc3 className="w-5 h-5 text-emerald-400 animate-spin-slow" />
            <h3 className="font-mono text-lg font-bold text-zinc-100">
              Techno-Set reinladen & analysieren
            </h3>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            100% Offline-Analyse via Browser Web Audio API. Keine Audio-Uploads an externe Server erforderlich.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 p-3 rounded-lg flex items-center gap-2 text-xs font-mono text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Box */}
        {isProcessing ? (
          <div className="bg-zinc-900/80 border border-emerald-500/40 rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <div>
              <h4 className="font-mono text-sm font-bold text-zinc-100 mb-1">
                {progressText}
              </h4>
              <p className="font-mono text-xs text-zinc-400">
                Analysiere Onsets, Frequenzspektren, Phasen & Übergänge...
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_#10b981]"
              />
            </div>
            <span className="font-mono text-xs text-emerald-400 font-bold">
              {progressPercent}%
            </span>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-400 bg-emerald-950/20'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900/80'
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
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-zinc-200">
                Audiodatei hier ablegen oder durchsuchen
              </p>
              <p className="font-mono text-xs text-zinc-500 mt-1">
                Unterstützt WAV, MP3, FLAC, AAC, AIFF bis zu 2 Stunden Sets
              </p>
            </div>
          </div>
        )}

        {/* Demo Sets Section for Instant Testing */}
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Oder sofort ein vorgefertigtes Techno-Set testen:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DEMO_SETS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => {
                  onSelectDemoSet(demo);
                  onClose();
                }}
                disabled={isProcessing}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/60 p-3 rounded-lg text-left transition-all group cursor-pointer"
              >
                <div className="font-mono text-xs font-bold text-zinc-200 group-hover:text-emerald-400 truncate mb-1">
                  {demo.name}
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span>{demo.bpmAverage} BPM</span>
                  <span className="text-purple-400">{demo.dominantKey}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
