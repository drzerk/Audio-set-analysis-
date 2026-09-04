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
        className="bg-[#121214] border border-white/10 rounded-lg w-full max-w-2xl p-5 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Disc3 className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <h3 className="font-mono text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Techno-Set reinladen & analysieren
            </h3>
          </div>
          <p className="font-mono text-[10px] text-slate-400">
            100% Offline-Analyse via Browser Web Audio API. Keine Audio-Uploads an externe Server erforderlich.
          </p>
        </div>

        {error && (
          <div className="bg-pink-950/40 border border-pink-800/60 p-2.5 rounded flex items-center gap-2 text-[10px] font-mono text-pink-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Box */}
        {isProcessing ? (
          <div className="bg-white/[0.02] border border-emerald-500/40 rounded p-8 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div>
              <h4 className="font-mono text-xs font-bold text-white mb-1 uppercase tracking-wider">
                {progressText}
              </h4>
              <p className="font-mono text-[10px] text-slate-400">
                Analysiere Onsets, Frequenzspektren, Phasen & Übergänge...
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md bg-black border border-white/10 rounded-full h-2 overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              />
            </div>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">
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
            className={`border border-dashed rounded p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all ${
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
            <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Audiodatei hier ablegen oder durchsuchen
              </p>
              <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                WAV, MP3, FLAC, AAC, AIFF bis zu 2 Stunden Sets
              </p>
            </div>
          </div>
        )}

        {/* Demo Sets Section for Instant Testing */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Vorgefertigte Techno-Sets zum Testen:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEMO_SETS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => {
                  onSelectDemoSet(demo);
                  onClose();
                }}
                disabled={isProcessing}
                className="bg-white/5 border border-white/5 hover:border-emerald-500/50 p-2.5 rounded text-left transition-all group cursor-pointer"
              >
                <div className="font-mono text-[11px] font-bold text-white group-hover:text-emerald-400 truncate mb-0.5">
                  {demo.name}
                </div>
                <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
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
