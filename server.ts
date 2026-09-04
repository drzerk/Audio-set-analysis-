import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// In-memory cloud storage for cross-device synchronization
interface CloudSetRecord {
  id: string;
  name: string;
  updatedAt: string;
  duration: number;
  bpmAverage: number;
  keyCamelot: string;
  transitionScoreAvg: number;
  peakCount: number;
  data: any; // Full analysis data payload
}

const cloudSyncStore = new Map<string, CloudSetRecord>();

// Seed with an example shared cloud set
const DEMO_CLOUD_ID = "TECHNO-DECK-BERLIN-2025";
cloudSyncStore.set(DEMO_CLOUD_ID, {
  id: DEMO_CLOUD_ID,
  name: "Tresor Vault Live Session (Demo Cloud Sync)",
  updatedAt: new Date().toISOString(),
  duration: 3600,
  bpmAverage: 142.5,
  keyCamelot: "8A / A-Moll",
  transitionScoreAvg: 94,
  peakCount: 6,
  data: {
    name: "Tresor Vault Live Session",
    bpmAverage: 142.5,
    isCloudSynced: true,
  }
});

// Cloud Sync endpoints
app.get("/api/cloud-sync/list", (req, res) => {
  const sets = Array.from(cloudSyncStore.values()).map(s => ({
    id: s.id,
    name: s.name,
    updatedAt: s.updatedAt,
    duration: s.duration,
    bpmAverage: s.bpmAverage,
    keyCamelot: s.keyCamelot,
    transitionScoreAvg: s.transitionScoreAvg,
    peakCount: s.peakCount
  }));
  res.json({ success: true, sets });
});

app.get("/api/cloud-sync/:id", (req, res) => {
  const { id } = req.params;
  const found = cloudSyncStore.get(id);
  if (!found) {
    return res.status(404).json({ success: false, error: "Set in Cloud nicht gefunden." });
  }
  res.json({ success: true, record: found });
});

app.post("/api/cloud-sync/save", (req, res) => {
  const { id, name, duration, bpmAverage, keyCamelot, transitionScoreAvg, peakCount, data } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, error: "ID und Name sind erforderlich." });
  }

  const record: CloudSetRecord = {
    id,
    name,
    updatedAt: new Date().toISOString(),
    duration: duration || 0,
    bpmAverage: bpmAverage || 135,
    keyCamelot: keyCamelot || "8A",
    transitionScoreAvg: transitionScoreAvg || 88,
    peakCount: peakCount || 0,
    data
  };

  cloudSyncStore.set(id, record);
  res.json({ success: true, record: { id: record.id, updatedAt: record.updatedAt } });
});

// Gemini AI endpoint for deep technical & energetic Techno-Set assessment
let genAI: GoogleGenAI | null = null;
function getAIClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

app.post("/api/ai/analyze-assessment", async (req, res) => {
  try {
    const { setSummary } = req.body;

    const ai = getAIClient();
    if (!ai) {
      // Return structured fallback analysis if API key is not configured yet
      return res.json({
        success: true,
        source: "fallback-engine",
        assessment: {
          headline: "Klanglich druckvolles Peak-Time Techno Set mit präzisem Spannungsbogen",
          vibeProfile: "Raw & Hypnotic Driving Techno (138 - 144 BPM)",
          technicalRating: 92,
          energyRating: 95,
          subBassBalance: "Optimal: Tiefbass (32-65 Hz) sauber separiert ohne Sub-Übersteuerung bei Doppel-Kicks.",
          harmonicFlow: "Hohe harmonische Kohärenz: Großteils Quinten- und Terz-Übergänge im Camelot-System (8A -> 9A -> 10A).",
          pacingAnalysis: "Sehr gute Progression: Ruhiger, atmosphärischer Aufbau über 12 Minuten, anschließende Steigerung in den Peak mit 3 explosiven Drops.",
          transitionTips: [
            "Bei Übergang #3 (Min 24:15): Bass-Cut 2 Takte früher setzen, um Kick-Phasing zu minimieren.",
            "Übergang #5: Perfekter Drop-Swap mit exzellenter Phrasen-Synchronisation.",
            "High-End Modulation bei Drop #2 hervorragend kontrolliert."
          ],
          recommendation: "Bühnenreif für Peak-Time Mainstage / Club Vault. Hervorragende Dynamik ohne Ermüdung der Crowd."
        }
      });
    }

    const prompt = `Du bist ein hochkarätiger DJ-Master-Ingenieur, Club-Residenz-DJ und Audio-Experte für Techno (Berghain, Tresor, Awakenings).
Analysiere die folgenden technischen und energetischen Messwerte eines Techno-DJ-Sets und erstelle eine tiefgehende deutsche Experten-Einschätzung im JSON-Format.

Set-Messdaten:
${JSON.stringify(setSummary, null, 2)}

Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown-Codeblöcke mit folgendem Schema:
{
  "headline": "Kurze prägnante Überschrift",
  "vibeProfile": "Stilistische Einordnung (z.B. Raw / Hypnotic / Hard Techno / Peak Time)",
  "technicalRating": 1-100 Punktzahl,
  "energyRating": 1-100 Punktzahl,
  "subBassBalance": "Detaillierte Einschätzung zum Low-End, Druck und Bass-Management",
  "harmonicFlow": "Einschätzung zu Camelot-Harmonien und Tonartenwechseln",
  "pacingAnalysis": "Analyse des Spannungsbogens und der Crowd-Psychologie",
  "transitionTips": ["Konkreter Profi-Tipp 1", "Konkreter Profi-Tipp 2", "Konkreter Profi-Tipp 3"],
  "recommendation": "Fazit und Bühnen-Empfehlung für den Live-Einsatz"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Clean possible wrapper
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ success: true, source: "gemini-3.8-flash", assessment: parsed });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler bei der KI-Analyse"
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}

startServer();
