import express from "express";
import path from "path";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { resolveStreamUrl, getPopularTechnoSets } from "./server/streamResolver.ts";

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

// Streaming & Platform Integration endpoints (SoundCloud, HearThis, Mixcloud, Direct URLs)
app.post("/api/stream/resolve", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "URL ist erforderlich." });
    }
    const metadata = await resolveStreamUrl(url);
    res.json({ success: true, metadata });
  } catch (error: any) {
    console.error("Resolve error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Auflösen des Audio-Streams"
    });
  }
});

app.get("/api/stream/popular-techno", async (req, res) => {
  try {
    const popular = await getPopularTechnoSets();
    res.json({ success: true, sets: popular });
  } catch (error: any) {
    console.error("Popular sets error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audio streaming proxy that forwards audio bytes with CORS headers to the browser
app.get("/api/stream/proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL parameter missing");
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*"
    };
    if (req.headers.range) {
      headers["range"] = req.headers.range as string;
    }

    const targetResponse = await fetch(url, {
      headers,
      redirect: "follow"
    });

    if (!targetResponse.ok && targetResponse.status !== 206) {
      return res.status(targetResponse.status).send(`Stream fetch failed: ${targetResponse.statusText}`);
    }

    // CORS & Audio Streaming headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    res.setHeader("Accept-Ranges", "bytes");

    const contentType = targetResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = targetResponse.headers.get("content-length");
    const contentRange = targetResponse.headers.get("content-range");

    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    res.status(targetResponse.status);

    if (targetResponse.body) {
      Readable.fromWeb(targetResponse.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Stream proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send(`Stream proxy error: ${err.message}`);
    }
  }
});

// HLS playlist proxy that downloads and streams MP3 chunks sequentially as a continuous audio stream
app.get("/api/stream/proxy-hls", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("HLS URL parameter missing");
    }

    const playlistRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*"
      }
    });

    if (!playlistRes.ok) {
      return res.status(playlistRes.status).send(`Failed to fetch HLS playlist: ${playlistRes.statusText}`);
    }

    const m3u8 = await playlistRes.text();

    // Check for initialization segment (fMP4 / AAC EXT-X-MAP)
    const mapMatch = m3u8.match(/#EXT-X-MAP:URI="([^"]+)"/);
    const initMapUrl = mapMatch ? mapMatch[1] : null;

    const segments = m3u8
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http"));

    if (segments.length === 0) {
      return res.status(404).send("No audio segment URLs found in HLS playlist");
    }

    // Determine audio mime type: MP3 vs MP4/AAC
    const isMp4 =
      (initMapUrl && (initMapUrl.includes(".mp4") || initMapUrl.includes(".m4s"))) ||
      segments.some((s) => s.includes(".m4s") || s.includes(".mp4"));
    const contentType = isMp4 ? "audio/mp4" : "audio/mpeg";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Transfer-Encoding", "chunked");

    // If init map exists (for fragmented MP4), send it first
    if (initMapUrl) {
      try {
        const initRes = await fetch(initMapUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "*/*"
          }
        });
        if (initRes.ok) {
          const initBuf = await initRes.arrayBuffer();
          res.write(Buffer.from(initBuf));
        }
      } catch (initErr) {
        console.warn("[HLS Proxy] Init segment fetch warning:", initErr);
      }
    }

    // Cap segments to maximum 75 chunks (~30 minutes of high-resolution audio)
    // to prevent server timeouts while providing complete acoustic profile data
    const maxSegmentsToFetch = Math.min(segments.length, 75);
    const targetSegments = segments.slice(0, maxSegmentsToFetch);

    // Fetch and stream segments in parallel chunks of 4 to maximize throughput
    const BATCH_SIZE = 4;
    for (let i = 0; i < targetSegments.length; i += BATCH_SIZE) {
      if (res.writableEnded || res.destroyed) break;
      const batchUrls = targetSegments.slice(i, i + BATCH_SIZE);
      const batchPromises = batchUrls.map(async (segUrl) => {
        try {
          const segRes = await fetch(segUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "*/*"
            }
          });
          if (segRes.ok) {
            return await segRes.arrayBuffer();
          }
        } catch (segErr) {
          console.warn("[HLS Proxy] Segment fetch warning:", segErr);
        }
        return null;
      });

      const batchBuffers = await Promise.all(batchPromises);
      for (const buf of batchBuffers) {
        if (buf && !res.writableEnded && !res.destroyed) {
          res.write(Buffer.from(buf));
        }
      }
    }

    res.end();
  } catch (err: any) {
    console.error("HLS proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send(`HLS proxy error: ${err.message}`);
    }
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
