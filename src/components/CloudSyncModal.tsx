import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  UploadCloud,
  DownloadCloud,
  Check,
  Copy,
  RefreshCw,
  FolderDown,
  FolderUp,
  Radio,
  Share2
} from 'lucide-react';
import { TechnoSetAnalysis } from '../types';
import { syncSetToCloud, fetchCloudSetList, loadSetFromCloud } from '../utils/storage';
import { formatTimeSeconds } from '../utils/pdfExport';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSet: TechnoSetAnalysis;
  onSetUpdated: (updated: TechnoSetAnalysis) => void;
  onLoadCloudSet: (set: TechnoSetAnalysis) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentSet,
  onSetUpdated,
  onLoadCloudSet
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudSets, setCloudSets] = useState<any[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadIdInput, setLoadIdInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadCloudList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadCloudList = async () => {
    const list = await fetchCloudSetList();
    setCloudSets(list);
  };

  const handlePushCurrentSet = async () => {
    setIsSyncing(true);
    setMessage(null);

    const res = await syncSetToCloud(currentSet);
    setIsSyncing(false);

    if (res.success) {
      setMessage({
        type: 'success',
        text: 'Set erfolgreich in die Cloud synchronisiert! Auf allen Geräten abrufbar.'
      });
      onSetUpdated({
        ...currentSet,
        isCloudSynced: true,
        updatedAt: res.updatedAt || new Date().toISOString()
      });
      loadCloudList();
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'Fehler beim Synchronisieren in die Cloud.'
      });
    }
  };

  const handlePullSet = async (id: string) => {
    setIsSyncing(true);
    setMessage(null);

    const set = await loadSetFromCloud(id);
    setIsSyncing(false);

    if (set) {
      onLoadCloudSet(set);
      setMessage({
        type: 'success',
        text: `Set "${set.name}" erfolgreich aus der Cloud geladen!`
      });
    } else {
      setMessage({
        type: 'error',
        text: 'Set konnte nicht geladen werden.'
      });
    }
  };

  const copySyncCode = () => {
    navigator.clipboard.writeText(currentSet.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export full set as JSON for offline USB
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentSet, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `technoset_${currentSet.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="cloud-sync-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="cloud-sync-modal-window"
        className="bg-[#121214] border border-white/10 rounded-lg w-full max-w-2xl p-5 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Multi-Device Cloud-Synchronisation
            </h3>
          </div>
          <p className="font-mono text-[10px] text-slate-400">
            Greife auf deine analysierten DJ-Sets von jedem Laptop, iPad oder Smartphone zu.
          </p>
        </div>

        {message && (
          <div
            className={`p-2.5 rounded text-[10px] font-mono border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-pink-950/40 border-pink-800/60 text-pink-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current Set Sync Card */}
        <div className="bg-white/5 border border-white/5 rounded p-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Aktives Set</span>
              <h4 className="font-mono text-xs font-bold text-white">{currentSet.name}</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePushCurrentSet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black uppercase transition-all cursor-pointer"
              >
                {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                <span>In Cloud sichern</span>
              </button>
            </div>
          </div>

          {/* Sync Code / Share ID */}
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-[10px] font-mono">
            <span className="text-slate-500">SYNC-ID:</span>
            <span className="text-emerald-400 font-bold flex-1 truncate">{currentSet.id}</span>
            <button
              onClick={copySyncCode}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white cursor-pointer uppercase font-bold"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
            </button>
          </div>
        </div>

        {/* Load via ID */}
        <div className="flex gap-2">
          <input
            type="text"
            value={loadIdInput}
            onChange={(e) => setLoadIdInput(e.target.value)}
            placeholder="Sync-ID eines anderen Geräts eingeben..."
            className="flex-1 bg-black border border-white/10 rounded px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => {
              if (loadIdInput.trim()) {
                handlePullSet(loadIdInput.trim());
              }
            }}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
          >
            Laden
          </button>
        </div>

        {/* Cloud Sets Library */}
        <div>
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
            <span>In der Cloud gespeicherte Sets:</span>
            <button
              onClick={loadCloudList}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <RefreshCw className="w-3 h-3" /> Aktualisieren
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {cloudSets.length === 0 ? (
              <div className="text-center py-5 text-[10px] font-mono text-slate-600 bg-white/[0.02] rounded">
                Noch keine Sets in der Cloud. Klicke oben auf "In Cloud sichern".
              </div>
            ) : (
              cloudSets.map((cs) => (
                <div
                  key={cs.id}
                  className="bg-white/5 border border-white/5 rounded p-2 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="font-mono text-xs font-bold text-white truncate">{cs.name}</div>
                    <div className="font-mono text-[9px] text-slate-500 flex gap-2">
                      <span>{cs.bpmAverage} BPM</span>
                      <span>{cs.keyCamelot}</span>
                      <span>{formatTimeSeconds(cs.duration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePullSet(cs.id)}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white uppercase transition-all cursor-pointer shrink-0"
                  >
                    <DownloadCloud className="w-3 h-3 text-emerald-400" />
                    <span>Laden</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Offline Backup USB Option */}
        <div className="border-t border-white/5 pt-3 flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-400">
            <span className="text-white font-bold block uppercase tracking-wider">Offline USB-Backup</span>
            Exportiere die komplette Analyse als JSON Datei für den USB-Stick.
          </div>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-white uppercase cursor-pointer"
          >
            <FolderDown className="w-3 h-3 text-emerald-400" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
