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
      className="bg-[#121214] border border-white/5 p-3 sm:p-4 rounded flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
            TECHNICAL MASTERING & SOUND TELEMETRY
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Club-Integrität: <strong className="text-emerald-400">STAGE-READY</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
        {/* Metric 1: LUFS */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">Lautheit (Est.)</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {metrics.lufsEstimated} <span className="text-[10px] text-slate-500 font-normal">LUFS</span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">Club-Lautstärke</div>
        </div>

        {/* Metric 2: True Peak */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">True Peak</div>
          <div
            className={`text-base sm:text-lg font-bold font-mono mt-0.5 ${
              metrics.peakDb > -0.2 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.peakDb} <span className="text-[10px] text-slate-500 font-normal">dBFS</span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {metrics.peakDb > -0.2 ? 'Grenzbereich' : 'Headroom OK'}
          </div>
        </div>

        {/* Metric 3: RMS */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">Durchschnitts-RMS</div>
          <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">
            {metrics.rmsDb} <span className="text-[10px] text-slate-500 font-normal">dBFS</span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">Druck & Dichte</div>
        </div>

        {/* Metric 4: Dynamic Range */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">Dynamikbereich</div>
          <div className="text-base sm:text-lg font-bold text-blue-400 font-mono mt-0.5">
            {metrics.dynamicRangeDb} <span className="text-[10px] text-slate-500 font-normal">dB</span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">Punch & Kick-Atmung</div>
        </div>

        {/* Metric 5: Sub Mono */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">Sub-Mono Integrität</div>
          <div className="text-base sm:text-lg font-bold text-purple-400 font-mono mt-0.5">
            {metrics.subMonoCleanScore}%
          </div>
          <div className="text-[9px] text-slate-400 truncate">&lt; 90 Hz Phase</div>
        </div>

        {/* Metric 6: Clipping */}
        <div className="bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
          <div className="text-[9px] text-slate-500 uppercase">Clipping Events</div>
          <div
            className={`text-base sm:text-lg font-bold font-mono mt-0.5 ${
              metrics.clippingEvents === 0 ? 'text-emerald-400' : 'text-pink-500'
            }`}
          >
            {metrics.clippingEvents}
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {metrics.clippingEvents === 0 ? 'Verzerrungsfrei' : 'Digitaler Clip!'}
          </div>
        </div>
      </div>
    </div>
  );
};
