import React from 'react';
import { Gauge, ShieldAlert, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TechnicalMetrics } from '../types';

interface TechnicalStatsCardProps {
  metrics: TechnicalMetrics;
}

export const TechnicalStatsCard: React.FC<TechnicalStatsCardProps> = ({ metrics }) => {
  return (
    <div
      id="technical-mastering-stats-card"
      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col gap-3"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
            TECHNISCHE SOUND- & MASTERING-ANALYSE
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          Club-Sound-Integrität: <strong className="text-emerald-400">Bühnenreif</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {/* Metric 1: LUFS */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Lautheit (Est.)</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400">
            {metrics.lufsEstimated} <span className="text-xs text-zinc-500 font-normal">LUFS</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">Club-Lautstärke</div>
        </div>

        {/* Metric 2: True Peak */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">True Peak</div>
          <div
            className={`text-base sm:text-lg font-bold ${
              metrics.peakDb > -0.2 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.peakDb} <span className="text-xs text-zinc-500 font-normal">dBFS</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            {metrics.peakDb > -0.2 ? 'Grenzbereich' : 'Sicherer Headroom'}
          </div>
        </div>

        {/* Metric 3: RMS */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Durchschnitts-RMS</div>
          <div className="text-base sm:text-lg font-bold text-zinc-100">
            {metrics.rmsDb} <span className="text-xs text-zinc-500 font-normal">dBFS</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">Druck & Dichte</div>
        </div>

        {/* Metric 4: Dynamic Range */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Dynamikbereich</div>
          <div className="text-base sm:text-lg font-bold text-cyan-400">
            {metrics.dynamicRangeDb} <span className="text-xs text-zinc-500 font-normal">dB</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">Punch & Kick-Atmung</div>
        </div>

        {/* Metric 5: Sub Mono */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Sub-Mono Integrität</div>
          <div className="text-base sm:text-lg font-bold text-purple-400">
            {metrics.subMonoCleanScore}%
          </div>
          <div className="text-[10px] text-zinc-400 truncate">&lt; 90 Hz Phase</div>
        </div>

        {/* Metric 6: Clipping */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Clipping Events</div>
          <div
            className={`text-base sm:text-lg font-bold ${
              metrics.clippingEvents === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {metrics.clippingEvents}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            {metrics.clippingEvents === 0 ? 'Verzerrungsfrei' : 'Digitaler Clip!'}
          </div>
        </div>
      </div>
    </div>
  );
};
