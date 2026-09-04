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
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="w-5 h-5 text-emerald-400" />
            <h3 className="font-mono text-lg font-bold text-zinc-100">
              Multi-Device Cloud-Synchronisation
            </h3>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Greife auf deine analysierten DJ-Sets von jedem Laptop, iPad oder Smartphone zu.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-mono border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current Set Sync Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Aktives Set</span>
              <h4 className="font-mono text-sm font-bold text-zinc-100">{currentSet.name}</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePushCurrentSet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all cursor-pointer"
              >
                {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>In Cloud sichern</span>
              </button>
            </div>
          </div>

          {/* Sync Code / Share ID */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono">
            <span className="text-zinc-500">Sync-ID:</span>
            <span className="text-emerald-400 font-bold flex-1 truncate">{currentSet.id}</span>
            <button
              onClick={copySyncCode}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => {
              if (loadIdInput.trim()) {
                handlePullSet(loadIdInput.trim());
              }
            }}
            className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Laden
          </button>
        </div>

        {/* Cloud Sets Library */}
        <div>
          <div className="flex items-center justify-between font-mono text-xs text-zinc-400 mb-2">
            <span>In der Cloud gespeicherte Sets:</span>
            <button
              onClick={loadCloudList}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Aktualisieren
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {cloudSets.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-zinc-600 bg-zinc-900/40 rounded-lg">
                Noch keine Sets in der Cloud. Klicke oben auf "In Cloud sichern".
              </div>
            ) : (
              cloudSets.map((cs) => (
                <div
                  key={cs.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="font-mono text-xs font-bold text-zinc-200 truncate">{cs.name}</div>
                    <div className="font-mono text-[10px] text-zinc-500 flex gap-2">
                      <span>{cs.bpmAverage} BPM</span>
                      <span>{cs.keyCamelot}</span>
                      <span>{formatTimeSeconds(cs.duration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePullSet(cs.id)}
                    className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all cursor-pointer shrink-0"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Laden</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Offline Backup USB Option */}
        <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
          <div className="text-xs font-mono text-zinc-400">
            <span className="text-zinc-300 font-bold block">Offline USB-Backup</span>
            Exportiere die komplette Analyse als JSON Datei für den USB-Stick.
          </div>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer"
          >
            <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
