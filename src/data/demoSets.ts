import { TechnoSetAnalysis } from '../types';
import { analyzeTransitionPhaseSync } from '../utils/phaseSyncAnalyzer';

const RAW_DEMO_SETS: TechnoSetAnalysis[] = [
  {
    id: 'set-berghain-peak-142',
    name: 'Berghain 04:00 Peak-Time Raw Vault',
    fileName: 'berghain_residency_live_rec_142.wav',
    fileSizeFormatted: '482 MB',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    duration: 3600, // 60 minutes
    bpmAverage: 142.2,
    bpmMin: 141.0,
    bpmMax: 143.5,
    dominantKey: '8A (A-Moll)',
    isCloudSynced: true,
    customNotes: 'Gespielt mit 3x CDJ-3000 und Allen & Heath Xone:96. Focus auf Raw Analog Kicks & Industrial Percussion.',
    technicalMetrics: {
      peakDb: -0.3,
      rmsDb: -8.4,
      lufsEstimated: -7.8,
      dynamicRangeDb: 8.1,
      subMonoCleanScore: 97,
      clippingEvents: 0,
      tempoDriftPercent: 0.8
    },
    bpmPoints: [
      { time: 0, bpm: 141.0, confidence: 0.95 },
      { time: 300, bpm: 141.5, confidence: 0.96 },
      { time: 600, bpm: 141.8, confidence: 0.98 },
      { time: 900, bpm: 142.0, confidence: 0.97 },
      { time: 1200, bpm: 142.0, confidence: 0.99 },
      { time: 1500, bpm: 142.2, confidence: 0.98 },
      { time: 1800, bpm: 142.5, confidence: 0.99 },
      { time: 2100, bpm: 142.8, confidence: 0.96 },
      { time: 2400, bpm: 143.0, confidence: 0.98 },
      { time: 2700, bpm: 143.2, confidence: 0.97 },
      { time: 3000, bpm: 142.8, confidence: 0.96 },
      { time: 3300, bpm: 142.0, confidence: 0.98 },
      { time: 3600, bpm: 141.8, confidence: 0.95 }
    ],
    energyPoints: [
      { time: 0, energy: 55, subBass: 60, midHigh: 50, tension: 45 },
      { time: 300, energy: 68, subBass: 75, midHigh: 62, tension: 58 },
      { time: 600, energy: 78, subBass: 82, midHigh: 74, tension: 70 },
      { time: 880, energy: 40, subBass: 25, midHigh: 60, tension: 88 }, // Breakdown
      { time: 960, energy: 94, subBass: 96, midHigh: 92, tension: 96 }, // Peak Drop 1
      { time: 1300, energy: 86, subBass: 88, midHigh: 84, tension: 80 },
      { time: 1650, energy: 50, subBass: 30, midHigh: 70, tension: 92 }, // Breakdown
      { time: 1740, energy: 98, subBass: 99, midHigh: 95, tension: 98 }, // Peak Drop 2
      { time: 2100, energy: 88, subBass: 90, midHigh: 86, tension: 82 },
      { time: 2500, energy: 92, subBass: 94, midHigh: 90, tension: 88 },
      { time: 2850, energy: 45, subBass: 35, midHigh: 65, tension: 95 }, // Acid Breakdown
      { time: 2940, energy: 100, subBass: 100, midHigh: 98, tension: 100 }, // Maximum Peak Climax
      { time: 3300, energy: 82, subBass: 85, midHigh: 78, tension: 75 },
      { time: 3600, energy: 65, subBass: 70, midHigh: 60, tension: 50 }
    ],
    harmonyPoints: [
      { time: 0, keyCamelot: '8A', keyNote: 'A-Moll', confidence: 0.92 },
      { time: 600, keyCamelot: '8A', keyNote: 'A-Moll', confidence: 0.94 },
      { time: 960, keyCamelot: '9A', keyNote: 'E-Moll', confidence: 0.95 },
      { time: 1740, keyCamelot: '9A', keyNote: 'E-Moll', confidence: 0.93 },
      { time: 2150, keyCamelot: '10A', keyNote: 'H-Moll', confidence: 0.91 },
      { time: 2940, keyCamelot: '10A', keyNote: 'H-Moll', confidence: 0.96 },
      { time: 3300, keyCamelot: '9A', keyNote: 'E-Moll', confidence: 0.89 }
    ],
    transitions: [
      {
        id: 'trans-1',
        timestamp: 540,
        duration: 48,
        qualityScore: 96,
        phaseScore: 98,
        harmonicScore: 100,
        eqClashRisk: 'low',
        fromKey: '8A',
        toKey: '8A',
        fromBpm: 141.5,
        toBpm: 141.8,
        notes: 'Perfekter 64-Bar Long Blend. Sub-Cut am Xone:96 Kanal 2 exakt im Break getauscht.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-2',
        timestamp: 1120,
        duration: 36,
        qualityScore: 92,
        phaseScore: 90,
        harmonicScore: 95,
        eqClashRisk: 'low',
        fromKey: '8A',
        toKey: '9A',
        fromBpm: 141.8,
        toBpm: 142.2,
        notes: 'Harmonischer Quintensprung (8A -> 9A). Erhöht die Grundenergie spürbar.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-3',
        timestamp: 1680,
        duration: 24,
        qualityScore: 84,
        phaseScore: 82,
        harmonicScore: 90,
        eqClashRisk: 'medium',
        fromKey: '9A',
        toKey: '9A',
        fromBpm: 142.2,
        toBpm: 142.5,
        notes: 'Kurzes Sub-Phasing für ca. 2 Takte hörbar, danach sauberer Hochpass-Filter Übergang.',
        type: 'filter-sweep'
      },
      {
        id: 'trans-4',
        timestamp: 2340,
        duration: 42,
        qualityScore: 97,
        phaseScore: 99,
        harmonicScore: 95,
        eqClashRisk: 'low',
        fromKey: '9A',
        toKey: '10A',
        fromBpm: 142.5,
        toBpm: 143.0,
        notes: 'Makelloser Phrasenaustausch. Kick-Swap bei Bar 32 traf exakt den Raumakzent.',
        type: 'breakdown-swap'
      },
      {
        id: 'trans-5',
        timestamp: 3180,
        duration: 32,
        qualityScore: 89,
        phaseScore: 88,
        harmonicScore: 90,
        eqClashRisk: 'low',
        fromKey: '10A',
        toKey: '9A',
        fromBpm: 143.0,
        toBpm: 142.0,
        notes: 'Controlled Outro Blend mit warmem analogem Low-Pass Cutoff.',
        type: 'seamless-blend'
      }
    ],
    peakMoments: [
      {
        id: 'peak-1',
        timestamp: 960,
        label: 'Drop 1 - 909 Industrial Assault',
        energyLevel: 94,
        spectralPower: -6.2,
        dropIntensity: 92,
        description: 'Plötzlicher Wiedereintritt des 45-Hz Subbasses nach 16 Takten weißem Rauschen. Höchster Druckwechsel.',
        type: 'main-drop'
      },
      {
        id: 'peak-2',
        timestamp: 1740,
        label: 'Drop 2 - Hypnotic Ride & Vocal Stab',
        energyLevel: 98,
        spectralPower: -5.8,
        dropIntensity: 96,
        description: 'Zweiter Hauptgipfel. Maximale Crowd-Resonanz durch offene Hi-Hats und perkussive Rollings.',
        type: 'sub-surge'
      },
      {
        id: 'peak-3',
        timestamp: 2940,
        label: 'Peak Climax - Acid Mayhem Overdrive',
        energyLevel: 100,
        spectralPower: -5.4,
        dropIntensity: 100,
        description: 'Set-Höhepunkt bei 143.2 BPM mit vollem Frequenzspektrum und resonanter TB-303 Modulation.',
        type: 'acid-build'
      }
    ],
    segments: [
      {
        id: 'seg-berg-1',
        startTime: 0,
        endTime: 880,
        tag: 'Warm-up',
        averageEnergy: 65,
        peakEnergy: 78,
        subBassIntensity: 72,
        description: 'Warm-up Phase: Etablierung des 141 BPM Industrial Grooves mit rollendem Subbass-Fundament.',
        color: '#3b82f6'
      },
      {
        id: 'seg-berg-2',
        startTime: 880,
        endTime: 1650,
        tag: 'Build-up',
        averageEnergy: 79,
        peakEnergy: 94,
        subBassIntensity: 82,
        description: 'Build-up Phase: Anstieg der spektralen Dichte und Vorbereitung des Main Climax.',
        color: '#f59e0b'
      },
      {
        id: 'seg-berg-3',
        startTime: 1650,
        endTime: 3000,
        tag: 'Peak Hour',
        averageEnergy: 94,
        peakEnergy: 100,
        subBassIntensity: 98,
        description: 'Peak Hour Climax: Ungebremster 143 BPM Berghain Main-Room Druck mit Spitzenwerten bei 100% Energie.',
        color: '#ec4899'
      },
      {
        id: 'seg-berg-4',
        startTime: 3000,
        endTime: 3600,
        tag: 'Cool-down',
        averageEnergy: 71,
        peakEnergy: 82,
        subBassIntensity: 76,
        description: 'Cool-down Phase: Ausklang der Acid-Sequenzen und Übergang in das atmosphärische Set-Outro.',
        color: '#10b981'
      }
    ],
    aiAssessment: {
      headline: 'Brachiales, klanglich erstklassig kontrolliertes Peak-Time Techno-Masterpiece',
      vibeProfile: 'Berghain Heavy Industrial / Raw Hypnotic (141.0 - 143.5 BPM)',
      technicalRating: 94,
      energyRating: 97,
      subBassBalance: 'Herausragendes Bassmanagement: Mono-Sub unter 85 Hz absolut phasenkohärent (97%). Keine destruktive Kick-Überlagerung.',
      harmonicFlow: 'Exzellente Camelot-Dramaturgie (8A -> 9A -> 10A). Der Wechsel nach 10A bei Minute 39 erzeugt maximale Euphorie.',
      pacingAnalysis: 'Spannungsbogen folgt dem Goldenen Schnitt: Kontinuierlicher Druckaufbau mit gezielten, kurzen Sauerstoffpausen in den Breakdowns.',
      transitionTips: [
        'Übergang #3 bei 28:00 Min: Nutze den Low-EQ Killswitch minimal früher, um den 120Hz Mitten-Boom komplett zu eliminieren.',
        'Die Tempo-Steigerung von 141 auf 143.5 BPM wirkt organisch und pusht das Set zur richtigen Zeit nach vorne.',
        'Tipp für die Club-PA: Der Headroom von -0.3 dB True Peak ist bühnensicher gegen Wandler-Inter-Sample Peaks.'
      ],
      recommendation: 'Sofort bühnenreif für Club-Mainstages und Festival-Vaults. Referenz-Niveau in Punch und Dynamik.'
    }
  },
  {
    id: 'set-awakenings-acid-145',
    name: 'Awakenings Festival Energy Surge 138-146',
    fileName: 'awakenings_outdoor_set_2025.mp3',
    fileSizeFormatted: '345 MB',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    duration: 3600,
    bpmAverage: 143.8,
    bpmMin: 138.0,
    bpmMax: 146.0,
    dominantKey: '6A (G-Moll)',
    isCloudSynced: true,
    customNotes: 'Schnellere Gangart mit Hard-Techno & Acid-Elementen. Getestet auf Funktion-One.',
    technicalMetrics: {
      peakDb: -0.1,
      rmsDb: -7.9,
      lufsEstimated: -7.2,
      dynamicRangeDb: 7.2,
      subMonoCleanScore: 94,
      clippingEvents: 1,
      tempoDriftPercent: 1.2
    },
    bpmPoints: [
      { time: 0, bpm: 138.0, confidence: 0.96 },
      { time: 600, bpm: 140.0, confidence: 0.98 },
      { time: 1200, bpm: 142.5, confidence: 0.99 },
      { time: 1800, bpm: 144.0, confidence: 0.98 },
      { time: 2400, bpm: 145.2, confidence: 0.99 },
      { time: 3000, bpm: 146.0, confidence: 0.97 },
      { time: 3600, bpm: 145.5, confidence: 0.95 }
    ],
    energyPoints: [
      { time: 0, energy: 62, subBass: 70, midHigh: 60, tension: 55 },
      { time: 600, energy: 76, subBass: 80, midHigh: 72, tension: 68 },
      { time: 1100, energy: 48, subBass: 30, midHigh: 65, tension: 85 },
      { time: 1200, energy: 95, subBass: 96, midHigh: 94, tension: 94 },
      { time: 1800, energy: 90, subBass: 92, midHigh: 88, tension: 88 },
      { time: 2300, energy: 52, subBass: 38, midHigh: 75, tension: 95 },
      { time: 2400, energy: 99, subBass: 99, midHigh: 98, tension: 99 },
      { time: 3000, energy: 96, subBass: 98, midHigh: 95, tension: 95 },
      { time: 3600, energy: 72, subBass: 78, midHigh: 68, tension: 60 }
    ],
    harmonyPoints: [
      { time: 0, keyCamelot: '6A', keyNote: 'G-Moll', confidence: 0.95 },
      { time: 1100, keyCamelot: '7A', keyNote: 'D-Moll', confidence: 0.93 },
      { time: 2200, keyCamelot: '8A', keyNote: 'A-Moll', confidence: 0.94 },
      { time: 3000, keyCamelot: '9A', keyNote: 'E-Moll', confidence: 0.92 }
    ],
    transitions: [
      {
        id: 'trans-awk-1',
        timestamp: 480,
        duration: 35,
        qualityScore: 91,
        phaseScore: 94,
        harmonicScore: 90,
        eqClashRisk: 'low',
        fromKey: '6A',
        toKey: '6A',
        fromBpm: 138.0,
        toBpm: 139.5,
        notes: 'Konstanter Pitch-Bend Übergang ohne Stottern.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-awk-2',
        timestamp: 1140,
        duration: 28,
        qualityScore: 95,
        phaseScore: 96,
        harmonicScore: 95,
        eqClashRisk: 'low',
        fromKey: '6A',
        toKey: '7A',
        fromBpm: 141.0,
        toBpm: 142.5,
        notes: 'Breakdown-Wechsel mit sofortigem Energie-Anstieg.',
        type: 'breakdown-swap'
      },
      {
        id: 'trans-awk-3',
        timestamp: 2280,
        duration: 22,
        qualityScore: 88,
        phaseScore: 86,
        harmonicScore: 92,
        eqClashRisk: 'medium',
        fromKey: '7A',
        toKey: '8A',
        fromBpm: 144.0,
        toBpm: 145.2,
        notes: 'Aggressiver Drop-Swap. Leichte Mitten-Kollision bei 2.5 kHz behoben.',
        type: 'cut-drop'
      }
    ],
    peakMoments: [
      {
        id: 'peak-awk-1',
        timestamp: 1200,
        label: 'Drop 1 - 142 BPM Acid Squelch',
        energyLevel: 95,
        spectralPower: -5.9,
        dropIntensity: 94,
        description: 'Verzerrte 303 Resonanzlinie bricht nach 32 Takten Hallfahne herein.',
        type: 'acid-build'
      },
      {
        id: 'peak-awk-2',
        timestamp: 2400,
        label: 'Drop 2 - Full Power Climax 145 BPM',
        energyLevel: 99,
        spectralPower: -5.2,
        dropIntensity: 99,
        description: 'Ultimativer Open-Air Moment mit donnerndem Rumble-Bass und Schranz-Hihats.',
        type: 'main-drop'
      }
    ],
    segments: [
      {
        id: 'seg-awk-1',
        startTime: 0,
        endTime: 800,
        tag: 'Warm-up',
        averageEnergy: 66,
        peakEnergy: 76,
        subBassIntensity: 72,
        description: 'Warm-up Phase: 138 BPM Einleitung und Einstieg in das Open-Air Festival Setup.',
        color: '#3b82f6'
      },
      {
        id: 'seg-awk-2',
        startTime: 800,
        endTime: 1700,
        tag: 'Build-up',
        averageEnergy: 81,
        peakEnergy: 95,
        subBassIntensity: 84,
        description: 'Build-up Phase: Progressive Beschleunigung auf 142.5 BPM und Einführung der 303 Acid-Linie.',
        color: '#f59e0b'
      },
      {
        id: 'seg-awk-3',
        startTime: 1700,
        endTime: 3100,
        tag: 'Peak Hour',
        averageEnergy: 96,
        peakEnergy: 99,
        subBassIntensity: 97,
        description: 'Peak Hour Climax: Maximaler Festival-Pegel mit Hard-Techno Drops bei 146 BPM.',
        color: '#ec4899'
      },
      {
        id: 'seg-awk-4',
        startTime: 3100,
        endTime: 3600,
        tag: 'Cool-down',
        averageEnergy: 72,
        peakEnergy: 80,
        subBassIntensity: 78,
        description: 'Cool-down Phase: Druckreduktion und Vorbereitung auf den nächsten Act.',
        color: '#10b981'
      }
    ],
    aiAssessment: {
      headline: 'Hochoktaniges Festival-Set mit kompromisslosem Vorwärtsdrang',
      vibeProfile: 'Peak-Time Hard / Acid Techno (138 -> 146 BPM)',
      technicalRating: 90,
      energyRating: 99,
      subBassBalance: 'Sehr satter Subbass. Bei Drop 2 leichter True-Peak-Ausschlag (-0.1 dB), leichtes Limiter-Sättigen bemerkbar.',
      harmonicFlow: 'Strikter energetischer Aufstieg über den Camelot-Ring (6A -> 7A -> 8A -> 9A). Hervorragende Spannung!',
      pacingAnalysis: 'Fast keine Atempause. Ideal für 2:00 bis 4:00 Uhr Festival-Slots.',
      transitionTips: [
        'Aufpassen bei -7.2 LUFS: Die Gesamtlautstärke ist sehr am Limit. 0.5 dB Headroom schont die PA-Endstufen.',
        'Cut-Drops bei 145 BPM sitzen präzise auf der Eins.'
      ],
      recommendation: 'Perfekt für Festival-Bühnen mit großem Soundsystem.'
    }
  },
  {
    id: 'set-tresor-dub-135',
    name: 'Tresor Vault Deep Hypnotic Groove 135',
    fileName: 'tresor_underground_monochrome_135.flac',
    fileSizeFormatted: '512 MB',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
    duration: 3600,
    bpmAverage: 135.0,
    bpmMin: 134.8,
    bpmMax: 135.4,
    dominantKey: '4A (F-Moll)',
    isCloudSynced: true,
    customNotes: 'Sub-fokussiertes Detroit/Berlin Hypnotic Set. Warme Chords und endlose Tape-Delays.',
    technicalMetrics: {
      peakDb: -1.2,
      rmsDb: -10.2,
      lufsEstimated: -9.4,
      dynamicRangeDb: 10.4,
      subMonoCleanScore: 99,
      clippingEvents: 0,
      tempoDriftPercent: 0.2
    },
    bpmPoints: [
      { time: 0, bpm: 135.0, confidence: 0.98 },
      { time: 900, bpm: 135.0, confidence: 0.99 },
      { time: 1800, bpm: 135.2, confidence: 0.99 },
      { time: 2700, bpm: 135.1, confidence: 0.98 },
      { time: 3600, bpm: 135.0, confidence: 0.99 }
    ],
    energyPoints: [
      { time: 0, energy: 45, subBass: 65, midHigh: 40, tension: 40 },
      { time: 900, energy: 60, subBass: 75, midHigh: 55, tension: 55 },
      { time: 1700, energy: 72, subBass: 84, midHigh: 66, tension: 70 },
      { time: 2300, energy: 82, subBass: 92, midHigh: 75, tension: 80 },
      { time: 3000, energy: 75, subBass: 86, midHigh: 68, tension: 72 },
      { time: 3600, energy: 50, subBass: 60, midHigh: 45, tension: 40 }
    ],
    harmonyPoints: [
      { time: 0, keyCamelot: '4A', keyNote: 'F-Moll', confidence: 0.97 },
      { time: 1500, keyCamelot: '4A', keyNote: 'F-Moll', confidence: 0.98 },
      { time: 2400, keyCamelot: '5A', keyNote: 'C-Moll', confidence: 0.95 },
      { time: 3600, keyCamelot: '4A', keyNote: 'F-Moll', confidence: 0.96 }
    ],
    transitions: [
      {
        id: 'trans-tr-1',
        timestamp: 840,
        duration: 64,
        qualityScore: 99,
        phaseScore: 99,
        harmonicScore: 100,
        eqClashRisk: 'low',
        fromKey: '4A',
        toKey: '4A',
        fromBpm: 135.0,
        toBpm: 135.0,
        notes: 'Extrem subtiler 64-Bar Übergang. Kaum wahrnehmbar wo Track A endet und B beginnt.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-tr-2',
        timestamp: 2100,
        duration: 54,
        qualityScore: 98,
        phaseScore: 97,
        harmonicScore: 98,
        eqClashRisk: 'low',
        fromKey: '4A',
        toKey: '5A',
        fromBpm: 135.0,
        toBpm: 135.2,
        notes: 'Harmonische Modulation nach 5A (C-Moll). Dub-Chords verschmelzen makellos.',
        type: 'seamless-blend'
      }
    ],
    peakMoments: [
      {
        id: 'peak-tr-1',
        timestamp: 2340,
        label: 'Sub-Bass Hypnosis Peak',
        energyLevel: 85,
        spectralPower: -7.5,
        dropIntensity: 82,
        description: 'Massiver 35-Hz Tieftongipfel. Reine physische Schwingung für den Keller.',
        type: 'sub-surge'
      }
    ],
    segments: [
      {
        id: 'seg-tres-1',
        startTime: 0,
        endTime: 1100,
        tag: 'Warm-up',
        averageEnergy: 52,
        peakEnergy: 65,
        subBassIntensity: 68,
        description: 'Warm-up Phase: Tiefer, resonanter Sub-Bass Einstieg in die Tresor-Kellerakustik.',
        color: '#3b82f6'
      },
      {
        id: 'seg-tres-2',
        startTime: 1100,
        endTime: 2100,
        tag: 'Hypnotic Plateau',
        averageEnergy: 74,
        peakEnergy: 82,
        subBassIntensity: 86,
        description: 'Hypnotic Plateau: Hypnotisch rollender Detroit/Berlin Dub-Chords Groove ohne Hektik.',
        color: '#a855f7'
      },
      {
        id: 'seg-tres-3',
        startTime: 2100,
        endTime: 2900,
        tag: 'Peak Hour',
        averageEnergy: 81,
        peakEnergy: 85,
        subBassIntensity: 92,
        description: 'Peak Hour Climax: Intensivster Moment mit tiefstem 40-Hz Sub-Bass Peak.',
        color: '#ec4899'
      },
      {
        id: 'seg-tres-4',
        startTime: 2900,
        endTime: 3600,
        tag: 'Cool-down',
        averageEnergy: 58,
        peakEnergy: 68,
        subBassIntensity: 65,
        description: 'Cool-down Phase: Monochrome Ausblendung mit analogen Tape-Echo Delays.',
        color: '#10b981'
      }
    ],
    aiAssessment: {
      headline: 'Meisterhaft subtiles, hypnotisches Tiefen-Techno-Set',
      vibeProfile: 'Tresor Vault Dub / Deep Hypnotic Techno (135 BPM)',
      technicalRating: 98,
      energyRating: 84,
      subBassBalance: 'Perfektionierter Submono-Kanal (99% Phasenkohärenz). Gewaltiger Druck ohne jegliche Schärfe.',
      harmonicFlow: 'Statischer, meditativer Tonart-Fluss (4A -> 5A). Typischer Berliner Dub-Techno Sound.',
      pacingAnalysis: 'Zeitloses Pacing. Zieht den Tänzer in eine tiefe Trance ohne künstliche Hektik.',
      transitionTips: [
        'Die 60-Sekunden-Blends sind handwerklich auf allerhöchstem Niveau.',
        'Hervorragende Dynamikspanne (10.4 dB) – der Sound bleibt lebendig und atmet.'
      ],
      recommendation: 'Goldstandard für Clubkeller und lange Afterhour-Sets.'
    }
  },
  {
    id: 'set-warehouse-raw-clash-144',
    name: 'Warehouse Tension & Harmonic Clash Showcase 144',
    fileName: 'warehouse_live_session_raw_clash.wav',
    fileSizeFormatted: '498 MB',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    duration: 3600,
    bpmAverage: 144.2,
    bpmMin: 142.0,
    bpmMax: 146.0,
    dominantKey: '8A (A-Moll)',
    isCloudSynced: false,
    customNotes: 'Live-Aufnahme mit bewussten tonalen Kontrasten zur Demonstration von Dissonanzen und Anti-Climax-Stellen.',
    technicalMetrics: {
      peakDb: -0.2,
      rmsDb: -8.0,
      lufsEstimated: -7.5,
      dynamicRangeDb: 7.8,
      subMonoCleanScore: 92,
      clippingEvents: 2,
      tempoDriftPercent: 1.1
    },
    bpmPoints: [
      { time: 0, bpm: 142.0, confidence: 0.95 },
      { time: 900, bpm: 143.5, confidence: 0.97 },
      { time: 1800, bpm: 144.5, confidence: 0.98 },
      { time: 2700, bpm: 145.2, confidence: 0.97 },
      { time: 3600, bpm: 144.0, confidence: 0.94 }
    ],
    energyPoints: [
      { time: 0, energy: 50, subBass: 55, midHigh: 45, tension: 45 },
      { time: 600, energy: 72, subBass: 76, midHigh: 68, tension: 65 },
      { time: 1140, energy: 44, subBass: 25, midHigh: 62, tension: 88 },
      { time: 1220, energy: 95, subBass: 96, midHigh: 94, tension: 96 },
      { time: 1700, energy: 78, subBass: 82, midHigh: 74, tension: 75 },
      { time: 1920, energy: 48, subBass: 28, midHigh: 65, tension: 92 },
      { time: 2000, energy: 98, subBass: 99, midHigh: 96, tension: 99 },
      { time: 2600, energy: 88, subBass: 90, midHigh: 85, tension: 80 },
      { time: 2700, energy: 46, subBass: 28, midHigh: 60, tension: 50 },
      { time: 3100, energy: 94, subBass: 95, midHigh: 92, tension: 92 },
      { time: 3600, energy: 60, subBass: 68, midHigh: 55, tension: 48 }
    ],
    harmonyPoints: [
      { time: 0, keyCamelot: '8A', keyNote: 'A-Moll', confidence: 0.95 },
      { time: 1200, keyCamelot: '12A', keyNote: 'C#-Moll', confidence: 0.91 },
      { time: 1980, keyCamelot: '10A', keyNote: 'H-Moll', confidence: 0.93 },
      { time: 2700, keyCamelot: '11A', keyNote: 'F#-Moll', confidence: 0.94 },
      { time: 3100, keyCamelot: '12A', keyNote: 'C#-Moll', confidence: 0.96 }
    ],
    transitions: [
      {
        id: 'trans-clash-1',
        timestamp: 600,
        duration: 38,
        qualityScore: 94,
        phaseScore: 96,
        harmonicScore: 98,
        eqClashRisk: 'low',
        fromKey: '8A',
        toKey: '8A',
        fromBpm: 142.5,
        toBpm: 143.0,
        notes: 'Solider Warm-up Blend in gleicher Tonart 8A. Sehr saubere Phasen.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-clash-2',
        timestamp: 1200,
        duration: 32,
        qualityScore: 68,
        phaseScore: 84,
        harmonicScore: 52,
        eqClashRisk: 'high',
        fromKey: '8A',
        toKey: '12A',
        fromBpm: 143.5,
        toBpm: 144.2,
        notes: 'Dissonanz-Kollision: 4-Schritte-Sprung von 8A (A-Moll) nach 12A (C#-Moll) bei vollem 95% Pegel.',
        type: 'seamless-blend'
      },
      {
        id: 'trans-clash-3',
        timestamp: 1980,
        duration: 28,
        qualityScore: 72,
        phaseScore: 88,
        harmonicScore: 65,
        eqClashRisk: 'medium',
        fromKey: '12A',
        toKey: '10A',
        fromBpm: 144.5,
        toBpm: 145.0,
        notes: 'Paradoxer Anti-Climax: Energie explodiert von 48% auf 98%, während die Tonart -2 Schritte (12A nach 10A) absackt.',
        type: 'cut-drop'
      },
      {
        id: 'trans-clash-4',
        timestamp: 2700,
        duration: 30,
        qualityScore: 78,
        phaseScore: 85,
        harmonicScore: 75,
        eqClashRisk: 'medium',
        fromKey: '10A',
        toKey: '11A',
        fromBpm: 145.2,
        toBpm: 144.8,
        notes: 'Deplatzierter Key-Boost (+1) mitten im tiefen Breakdown-Loch (46% Energie).',
        type: 'filter-sweep'
      },
      {
        id: 'trans-clash-5',
        timestamp: 3100,
        duration: 36,
        qualityScore: 96,
        phaseScore: 97,
        harmonicScore: 98,
        eqClashRisk: 'low',
        fromKey: '11A',
        toKey: '12A',
        fromBpm: 144.8,
        toBpm: 144.5,
        notes: 'Idealer Quintensprung (+1) direkt auf den letzten Peak-Drop. Pure Synergie!',
        type: 'breakdown-swap'
      }
    ],
    peakMoments: [
      {
        id: 'peak-clash-1',
        timestamp: 1220,
        label: 'Drop 1 - 12A Dissonant Climax',
        energyLevel: 95,
        spectralPower: -5.8,
        dropIntensity: 94,
        description: 'Heftiger Drop mit überlappender 12A Melodie über 8A Rest-Bassline.',
        type: 'main-drop'
      },
      {
        id: 'peak-clash-2',
        timestamp: 2000,
        label: 'Drop 2 - 98% Overdrive Drop',
        energyLevel: 98,
        spectralPower: -5.3,
        dropIntensity: 98,
        description: 'Set-Höhepunkt mit maximalem Schalldruck.',
        type: 'sub-surge'
      }
    ],
    segments: [
      {
        id: 'seg-clash-1',
        startTime: 0,
        endTime: 1140,
        tag: 'Warm-up',
        averageEnergy: 62,
        peakEnergy: 74,
        subBassIntensity: 68,
        description: 'Warm-up Phase in 8A.',
        color: '#3b82f6'
      },
      {
        id: 'seg-clash-2',
        startTime: 1140,
        endTime: 2600,
        tag: 'Peak Hour',
        averageEnergy: 92,
        peakEnergy: 98,
        subBassIntensity: 96,
        description: 'Turbulente Peak Hour mit massiven Tonart-Wechseln.',
        color: '#ec4899'
      },
      {
        id: 'seg-clash-3',
        startTime: 2600,
        endTime: 3600,
        tag: 'Cool-down',
        averageEnergy: 70,
        peakEnergy: 94,
        subBassIntensity: 78,
        description: 'Breakdown und Abschluss-Progression.',
        color: '#10b981'
      }
    ],
    aiAssessment: {
      headline: 'Hochexplosives Set mit aufschlussreichen harmonischen Reibungszonen',
      vibeProfile: 'Raw Warehouse Industrial & Acid Clash (142 - 146 BPM)',
      technicalRating: 88,
      energyRating: 94,
      subBassBalance: 'Solider Druck. Bei 20:00 Min True-Peak Limitierung leicht hörbar.',
      harmonicFlow: 'Mehrere signifikante Konflikte zwischen Schalldruck und Camelot-Schritten aufgedeckt.',
      pacingAnalysis: 'Intensiv und mutig. Die Reibung bei Drop 1 erzeugt zwar Tension, polarisiert aber tonale Hörer.',
      transitionTips: [
        'Übergang #2 bei 20:00 Min: Nutze Low-Cut vor dem Drop um den dissonanten Tonart-Schock abzufedern.',
        'Den Key-Lift bei 45:00 Min erst beim Drop freigeben.'
      ],
      recommendation: 'Hervorragendes Anschauungsmaterial für das Harmonic-Energy Clash Visualizer Tool.'
    }
  }
];

export const DEMO_SETS: TechnoSetAnalysis[] = RAW_DEMO_SETS.map((set) => ({
  ...set,
  transitions: set.transitions.map((t) => ({
    ...t,
    phaseSyncAnalysis: t.phaseSyncAnalysis || analyzeTransitionPhaseSync(t)
  }))
}));
