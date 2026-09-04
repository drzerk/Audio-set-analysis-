import jsPDF from 'jspdf';
import { TechnoSetAnalysis } from '../types';
import { computeAutoTaggedSegments } from './segmentAutoTagger';
import { DEFAULT_TARGET_PROFILES, compareSetAgainstProfile } from './targetProfileComparator';
import { analyzeHarmonicEnergyClashes } from './harmonicEnergyClashDetector';
import { generateTransitionEqAdvice } from './eqFrequencyAdvisor';

export function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function exportSetReportAsPdf(set: TechnoSetAnalysis) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 18, 24);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Line
  doc.setFillColor(34, 197, 94); // Neon Green Accent
  doc.rect(0, 32, pageWidth, 1.5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TECHNOSET ANALYZER PRO', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 205);
  doc.text('OFFLINE MASTERING & ENERGETIC PERFORMANCE REPORT', margin, 21);

  const printDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(8);
  doc.text(`Erstellt: ${printDate}`, pageWidth - margin - 38, 21);

  y = 42;

  // Set Info Card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 24, 33);
  doc.text(set.name, margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 95);

  const col1 = margin + 4;
  const col2 = margin + 50;
  const col3 = margin + 105;
  const col4 = margin + 145;

  doc.text(`Dauer: ${formatTimeSeconds(set.duration)}`, col1, y + 17);
  doc.text(`BPM: ${set.bpmAverage} (${set.bpmMin} - ${set.bpmMax})`, col2, y + 17);
  doc.text(`Haupt-Tonart: ${set.dominantKey}`, col3, y + 17);
  doc.text(`Dateigröße: ${set.fileSizeFormatted || 'N/A'}`, col4, y + 17);

  doc.text(`Übergänge: ${set.transitions.length}`, col1, y + 23);
  doc.text(`Peak-Momente: ${set.peakMoments.length}`, col2, y + 23);
  doc.text(`Sync-Status: ${set.isCloudSynced ? 'Cloud synchronisiert' : 'Lokal gesichert'}`, col3, y + 23);

  y += 36;

  // Technical Assessment Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. TECHNISCHE MESSWERTE & AUDIO-QUALITÄT', margin, y);
  y += 5;

  const tech = set.technicalMetrics;
  const metrics = [
    { label: 'True Peak:', val: `${tech.peakDb} dBFS`, note: tech.peakDb > -0.2 ? 'Achtung: Nahe an 0dBFS' : 'Optimaler Headroom' },
    { label: 'Durchschnitts-RMS:', val: `${tech.rmsDb} dBFS`, note: 'Druckvolles Techno-Level' },
    { label: 'Geschätzte Lautheit:', val: `${tech.lufsEstimated} LUFS`, note: tech.lufsEstimated > -8 ? 'Sehr laut gemastert' : 'Club-Standard' },
    { label: 'Dynamikbereich:', val: `${tech.dynamicRangeDb} dB`, note: 'Gute Atmung der Kicks' },
    { label: 'Sub-Mono Integrität:', val: `${tech.subMonoCleanScore}%`, note: tech.subMonoCleanScore >= 95 ? 'Phasenkohärent' : 'Leichtes Phasing' },
    { label: 'Tempo-Drift:', val: `±${tech.tempoDriftPercent}%`, note: 'Stabiles Timing' },
    { label: 'Clipping Events:', val: `${tech.clippingEvents}`, note: tech.clippingEvents === 0 ? 'Kein digitales Clipping' : 'Warnung!' }
  ];

  doc.setFillColor(250, 252, 255);
  doc.rect(margin, y, pageWidth - margin * 2, 26, 'F');
  doc.setDrawColor(225, 230, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 26, 'S');

  let gridX = margin + 4;
  let gridY = y + 6;
  metrics.forEach((m, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(m.label, gridX, gridY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text(m.val, gridX + 34, gridY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.note, gridX + 54, gridY);

    gridY += 6;
    if (idx === 3) {
      gridX = margin + 92;
      gridY = y + 6;
    }
  });

  y += 34;

  // Transition Quality Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ANALYSE DER ÜBERGANGSQUALITÄT (TRANSITIONS)', margin, y);
  y += 5;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Zeitpunkt', margin + 3, y + 4.8);
  doc.text('Länge', margin + 24, y + 4.8);
  doc.text('Score', margin + 39, y + 4.8);
  doc.text('Phasen', margin + 55, y + 4.8);
  doc.text('Harmonie (Camelot)', margin + 74, y + 4.8);
  doc.text('Low-End Clash', margin + 112, y + 4.8);
  doc.text('DJ-Anmerkung & Bewertung', margin + 140, y + 4.8);

  y += 7;

  set.transitions.slice(0, 8).forEach((t, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
    doc.setDrawColor(230, 235, 245);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(formatTimeSeconds(t.timestamp), margin + 3, y + 4.8);
    doc.text(`${t.duration}s`, margin + 24, y + 4.8);

    // Score colored
    doc.setFont('helvetica', 'bold');
    if (t.qualityScore >= 90) doc.setTextColor(16, 185, 129);
    else if (t.qualityScore >= 80) doc.setTextColor(234, 179, 8);
    else doc.setTextColor(239, 68, 68);
    doc.text(`${t.qualityScore}%`, margin + 39, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 70, 85);
    doc.text(`${t.phaseScore}%`, margin + 55, y + 4.8);
    doc.text(`${t.fromKey} -> ${t.toKey}`, margin + 74, y + 4.8);

    const clashColor = t.eqClashRisk === 'low' ? [16, 185, 129] : t.eqClashRisk === 'medium' ? [234, 179, 8] : [239, 68, 68];
    doc.setTextColor(clashColor[0], clashColor[1], clashColor[2]);
    doc.text(t.eqClashRisk.toUpperCase(), margin + 112, y + 4.8);

    doc.setTextColor(50, 60, 75);
    const shortNote = t.notes.length > 38 ? t.notes.substring(0, 38) + '...' : t.notes;
    doc.text(shortNote, margin + 140, y + 4.8);

    y += 7;
  });

  y += 7;

  // Peak Moments Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETEKTIERTE PEAK-MOMENTE & DROPS', margin, y);
  y += 5;

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Zeit', margin + 3, y + 4.8);
  doc.text('Bezeichnung', margin + 24, y + 4.8);
  doc.text('Energie', margin + 74, y + 4.8);
  doc.text('Drop-Intensität', margin + 98, y + 4.8);
  doc.text('Akustische Signatur', margin + 130, y + 4.8);

  y += 7;

  set.peakMoments.slice(0, 5).forEach((p, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 245 : 255);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
    doc.setDrawColor(230, 235, 245);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(formatTimeSeconds(p.timestamp), margin + 3, y + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.text(p.label.substring(0, 28), margin + 24, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text(`${p.energyLevel}%`, margin + 74, y + 4.8);
    doc.text(`${p.dropIntensity}%`, margin + 98, y + 4.8);

    doc.setTextColor(60, 70, 85);
    const shortDesc = p.description.length > 42 ? p.description.substring(0, 42) + '...' : p.description;
    doc.text(shortDesc, margin + 130, y + 4.8);

    y += 7;
  });

  // PAGE 2: Set Segments & AI Assessment
  doc.addPage();
  let y2 = margin;

  doc.setFillColor(15, 18, 24);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFillColor(236, 72, 153);
  doc.rect(0, 20, pageWidth, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('4. AUTO-GETAGGTE SET-SEGMENTE & PHASEN-DRAMATURGIE', margin, 13);

  y2 = 28;

  // Render Set Segments Table
  const segments = set.segments && set.segments.length > 0
    ? set.segments
    : computeAutoTaggedSegments(set.duration, set.energyPoints);

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y2, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Zeitspanne', margin + 3, y2 + 4.8);
  doc.text('Phase / Auto-Tag', margin + 34, y2 + 4.8);
  doc.text('Ø Energie', margin + 74, y2 + 4.8);
  doc.text('Peak-Wert', margin + 96, y2 + 4.8);
  doc.text('Sub-Bass', margin + 116, y2 + 4.8);
  doc.text('Phasen-Charakteristik & Pacing', margin + 135, y2 + 4.8);

  y2 += 7;

  segments.forEach((seg, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.rect(margin, y2, pageWidth - margin * 2, 7, 'F');
    doc.setDrawColor(230, 235, 245);
    doc.line(margin, y2 + 7, pageWidth - margin, y2 + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${formatTimeSeconds(seg.startTime)} - ${formatTimeSeconds(seg.endTime)}`, margin + 3, y2 + 4.8);

    doc.setFont('helvetica', 'bold');
    if (seg.tag === 'Peak Hour') {
      doc.setTextColor(236, 72, 153);
    } else if (seg.tag === 'Build-up') {
      doc.setTextColor(245, 158, 11);
    } else if (seg.tag === 'Cool-down') {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(59, 130, 246);
    }
    doc.text(seg.tag, margin + 34, y2 + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${seg.averageEnergy}%`, margin + 74, y2 + 4.8);
    doc.setTextColor(236, 72, 153);
    doc.text(`${seg.peakEnergy}%`, margin + 96, y2 + 4.8);
    doc.setTextColor(245, 158, 11);
    doc.text(`${seg.subBassIntensity}%`, margin + 116, y2 + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 70, 85);
    const shortDesc = seg.description.length > 38 ? seg.description.substring(0, 38) + '...' : seg.description;
    doc.text(shortDesc, margin + 135, y2 + 4.8);

    y2 += 7;
  });

  y2 += 8;

  // Section 5: AI & Master Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. MASTER-BEURTEILUNG & CROWD-PSYCHOLOGIE (AI ENGINE)', margin, y2);
  y2 += 5;

  if (set.aiAssessment) {
    const ai = set.aiAssessment;

    doc.setFillColor(243, 246, 252);
    doc.roundedRect(margin, y2, pageWidth - margin * 2, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 45);
    doc.text(ai.headline, margin + 4, y2 + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 75, 95);
    doc.text(`Profil: ${ai.vibeProfile}`, margin + 4, y2 + 16);
    doc.text(`Technik-Rating: ${ai.technicalRating}/100 | Energie-Score: ${ai.energyRating}/100`, pageWidth - margin - 85, y2 + 16);

    y2 += 28;

    // Subbass Balance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Tiefbass & Low-End Auswertung:', margin, y2);
    y2 += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 75);
    const splitSub = doc.splitTextToSize(ai.subBassBalance, pageWidth - margin * 2);
    doc.text(splitSub, margin, y2);
    y2 += splitSub.length * 4.5 + 4;

    // Harmonic Flow
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Harmonie-Verlauf & Camelot-Dramaturgie:', margin, y2);
    y2 += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 75);
    const splitHarm = doc.splitTextToSize(ai.harmonicFlow, pageWidth - margin * 2);
    doc.text(splitHarm, margin, y2);
    y2 += splitHarm.length * 4.5 + 4;

    // Pacing Analysis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Spannungsbogen & Crowd-Dynamik:', margin, y2);
    y2 += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 75);
    const splitPacing = doc.splitTextToSize(ai.pacingAnalysis, pageWidth - margin * 2);
    doc.text(splitPacing, margin, y2);
    y2 += splitPacing.length * 4.5 + 6;

    // Transition Tips
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Konkrete Optimierungs-Tipps für die Performance:', margin, y2);
    y2 += 5;

    ai.transitionTips.forEach((tip) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('•', margin + 2, y2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 65);
      const splitTip = doc.splitTextToSize(tip, pageWidth - margin * 2 - 8);
      doc.text(splitTip, margin + 8, y2);
      y2 += splitTip.length * 4.5 + 2;
    });

    y2 += 4;

    // Final Stage Recommendation Box
    doc.setFillColor(240, 253, 244); // Light Mint
    doc.roundedRect(margin, y2, pageWidth - margin * 2, 20, 2, 2, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y2, pageWidth - margin * 2, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text('BÜHNEN- UND SOUNDSYSTEM-FAZIT:', margin + 4, y2 + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    const splitRec = doc.splitTextToSize(ai.recommendation, pageWidth - margin * 2 - 8);
    doc.text(splitRec, margin + 4, y2 + 13);
    y2 += 22;
  }

  // Section 6: Target Energy Profile Benchmark (Rising Intensity & Constant Flow)
  if (y2 + 40 > pageHeight - 25) {
    doc.addPage();
    y2 = margin;
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 20, pageWidth, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('6. ZIEL-ENERGIEPROFIL BENCHMARKS & DRAMATURGIE', margin, 13);
    y2 = 28;
  } else {
    y2 += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('6. ZIEL-ENERGIEPROFIL BENCHMARKS & PERFORMANCE', margin, y2);
    y2 += 5;
  }

  const profileRising = DEFAULT_TARGET_PROFILES[0];
  const profileFlow = DEFAULT_TARGET_PROFILES[1];
  const fbRising = compareSetAgainstProfile(set, profileRising);
  const fbFlow = compareSetAgainstProfile(set, profileFlow);

  // Dual Profile Comparison Box
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Box 1: Rising Intensity
  doc.setFillColor(253, 242, 248);
  doc.roundedRect(margin, y2, colWidth, 32, 2, 2, 'F');
  doc.setDrawColor(244, 114, 182);
  doc.roundedRect(margin, y2, colWidth, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(190, 24, 93);
  doc.text('PROFIL: RISING INTENSITY', margin + 3, y2 + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(`Match-Score: ${fbRising.overallScore}% (${fbRising.grade})`, margin + 3, y2 + 11.5);
  doc.text(`Pacing-Korrelation: ${fbRising.pacingCorrelation > 0 ? '+' : ''}${fbRising.pacingCorrelation}`, margin + 3, y2 + 16.5);
  doc.text(`Durchschnittl. Abweichung: ±${fbRising.avgDeviation}%`, margin + 3, y2 + 21.5);
  doc.text(`Max. Divergenz: ${fbRising.maxDeviation.delta > 0 ? '+' : ''}${fbRising.maxDeviation.delta}% bei ${formatTimeSeconds(fbRising.maxDeviation.timestamp)}`, margin + 3, y2 + 26.5);

  // Box 2: Constant Flow
  const col2X = margin + colWidth + 6;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(col2X, y2, colWidth, 32, 2, 2, 'F');
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(col2X, y2, colWidth, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text('PROFIL: CONSTANT FLOW (HYPNOTIC)', col2X + 3, y2 + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(`Match-Score: ${fbFlow.overallScore}% (${fbFlow.grade})`, col2X + 3, y2 + 11.5);
  doc.text(`Pacing-Korrelation: ${fbFlow.pacingCorrelation > 0 ? '+' : ''}${fbFlow.pacingCorrelation}`, col2X + 3, y2 + 16.5);
  doc.text(`Durchschnittl. Abweichung: ±${fbFlow.avgDeviation}%`, col2X + 3, y2 + 21.5);
  doc.text(`Max. Divergenz: ${fbFlow.maxDeviation.delta > 0 ? '+' : ''}${fbFlow.maxDeviation.delta}% bei ${formatTimeSeconds(fbFlow.maxDeviation.timestamp)}`, col2X + 3, y2 + 26.5);

  y2 += 36;

  // Section 7: Camelot Harmonik vs. Energie-Trend (Konflikt-Diagnose)
  if (y2 + 45 > pageHeight - 25) {
    doc.addPage();
    y2 = margin;
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(147, 51, 234);
    doc.rect(0, 20, pageWidth, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('7. CAMELOT-HARMONIK VS. ENERGIE-TREND (KONFLIKT-ANALYSE)', margin, 13);
    y2 = 28;
  } else {
    y2 += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('7. CAMELOT-HARMONIK VS. ENERGIE-TREND (KONFLIKT-ANALYSE)', margin, y2);
    y2 += 6;
  }

  const harmonicClashAnalysis = analyzeHarmonicEnergyClashes(set);

  doc.setFillColor(250, 245, 255);
  doc.roundedRect(margin, y2, pageWidth - margin * 2, 28, 2, 2, 'F');
  doc.setDrawColor(216, 180, 254);
  doc.roundedRect(margin, y2, pageWidth - margin * 2, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(126, 34, 206);
  doc.text(
    `Harmonisch-Energetischer Kohärenz-Score: ${harmonicClashAnalysis.overallSynergyScore}% (Rang ${harmonicClashAnalysis.grade})`,
    margin + 3,
    y2 + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(
    `Identifizierte Stellen: ${harmonicClashAnalysis.clashesCount.critical} Kritische Konflikte | ${harmonicClashAnalysis.clashesCount.moderate} Moderate Reibungen | ${harmonicClashAnalysis.clashesCount.synergy} Optimale Synergien`,
    margin + 3,
    y2 + 11
  );

  const splitFazit = doc.splitTextToSize(harmonicClashAnalysis.coherenceAssessment, pageWidth - margin * 2 - 8);
  doc.text(splitFazit, margin + 3, y2 + 16);

  if (harmonicClashAnalysis.djDirectives.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(109, 40, 217);
    const splitTip = doc.splitTextToSize(`DJ-Leitlinie: ${harmonicClashAnalysis.djDirectives[0]}`, pageWidth - margin * 2 - 8);
    doc.text(splitTip, margin + 3, y2 + 23);
  }

  y2 += 32;

  // Section 8: Harmonischer EQ-Mud Advisor & Frequenz-Schnitte
  if (set.transitions && set.transitions.length > 0) {
    if (y2 + 45 > pageHeight - 25) {
      doc.addPage();
      y2 = margin;
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 20, pageWidth, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('8. HARMONISCHER EQ-MUD ADVISOR & FREQUENZ-SCHNITTE', margin, 13);
      y2 = 28;
    } else {
      y2 += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('8. HARMONISCHER EQ-MUD ADVISOR & FREQUENZ-SCHNITTE', margin, y2);
      y2 += 6;
    }

    // Pick transition with highest mud risk
    const allAdvices = set.transitions.map((t) => generateTransitionEqAdvice(t));
    const highestMud = allAdvices.reduce((prev, curr) => (curr.mudRiskIndex > prev.mudRiskIndex ? curr : prev));

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin, y2, pageWidth - margin * 2, 34, 2, 2, 'F');
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, y2, pageWidth - margin * 2, 34, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text(
      `Fokus-Übergang: @ ${formatTimeSeconds(highestMud.timestamp)} (${highestMud.fromKey} -> ${highestMud.toKey}) — Matsch-Risiko: ${highestMud.mudRiskIndex}% (${highestMud.mudRiskLevel.toUpperCase()})`,
      margin + 3,
      y2 + 5.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 95);
    doc.text(`Kritische Matsch-Zone: ${highestMud.primaryMudZoneHz} | Grundton-Kollision: ${highestMud.fromKeyRootHz.toFixed(1)} Hz vs ${highestMud.toKeyRootHz.toFixed(1)} Hz`, margin + 3, y2 + 11);

    // List cuts
    const cutsSummary = highestMud.recommendedCuts
      .slice(0, 2)
      .map((c) => `• ${c.actionSummary} (Xone:96: ${c.hardwareKnobSettings.xone96.knob} @ ${c.hardwareKnobSettings.xone96.position})`)
      .join('  ');
    const splitCuts = doc.splitTextToSize(cutsSummary, pageWidth - margin * 2 - 8);
    doc.text(splitCuts, margin + 3, y2 + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136);
    doc.text(`Kick-Swap Regel: ${highestMud.mixChoreography[2]?.action || 'Subbass schlagartig auf Takt 1 tauschen.'}`, margin + 3, y2 + 28);

    y2 += 38;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `TechnoSet Analyzer Pro — Seite ${p} von ${totalPages} — Offline & Stage Ready`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeName = set.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`TechnoSet_Analyse_${safeName}.pdf`);
}
