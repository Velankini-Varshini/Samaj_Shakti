import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI with server-side API Key
// Telemetry header User-Agent: 'aistudio-build' is required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── LOCAL OFFLINE FALLBACK IMPLEMENTATIONS ───
function getLocalFallbackAnalysis(title: string, desc: string) {
  const t = (title || "").toLowerCase();
  const d = (desc || "").toLowerCase();
  
  let category = "Other";
  let priority = "medium";
  let suggestedAuthority = "Municipal Corporation";
  let technicalDiagnostic = "Offline Diagnostic: Keyword-based assessment active due to server load.";
  let immediateCitizenSafetyAction = "Exercise general caution around the affected area.";
  let priorityJustification = "Assessed automatically based on reported category.";
  let estimatedResolutionDays = 5;

  if (t.includes("light") || d.includes("light") || t.includes("bulb") || d.includes("bulb")) {
    category = "Streetlight";
    priority = "medium";
    suggestedAuthority = "TSSPDCL";
    technicalDiagnostic = "Offline Diagnostic: Reported dark spot or faulty streetlight luminaire detected from keywords.";
    immediateCitizenSafetyAction = "Avoid unlit alleys after sunset. Report to local block volunteers.";
    priorityJustification = "Standard municipal rating for public illumination failures.";
    estimatedResolutionDays = 3;
  } else if (t.includes("water") || d.includes("water") || t.includes("leak") || d.includes("leak") || t.includes("pipe") || d.includes("pipe") || t.includes("drain") || d.includes("drain")) {
    category = "Water Leakage";
    priority = "high";
    suggestedAuthority = "HMWS&SB";
    technicalDiagnostic = "Offline Diagnostic: Potential water main pressure drop or sewage drain block identified from description.";
    immediateCitizenSafetyAction = "Do not consume standing or unpurified water. Restrict foot traffic over stagnant water pools.";
    priorityJustification = "High priority to prevent structural damage, road erosion, and waterborne disease outbreaks.";
    estimatedResolutionDays = 2;
  } else if (t.includes("road") || d.includes("road") || t.includes("pothole") || d.includes("pothole") || t.includes("manhole") || d.includes("manhole") || t.includes("tar") || d.includes("tar")) {
    category = "Road Damage";
    priority = "critical";
    suggestedAuthority = "GHMC";
    technicalDiagnostic = "Offline Diagnostic: Asphalt degradation, surface pitting, or unsecured manhole cavity detected from words.";
    immediateCitizenSafetyAction = "Slow down vehicles. Place temporary visible warning markers around the crater or cavity.";
    priorityJustification = "Critical severity due to imminent risk of vehicular accidents and personal injury.";
    estimatedResolutionDays = 4;
  } else if (t.includes("garbage") || d.includes("garbage") || t.includes("waste") || d.includes("waste") || t.includes("trash") || d.includes("trash") || t.includes("dump") || d.includes("dump")) {
    category = "Waste Management";
    priority = "low";
    suggestedAuthority = "GHMC";
    technicalDiagnostic = "Offline Diagnostic: Accumulation of solid waste or illegal refuse dumping reported.";
    immediateCitizenSafetyAction = "Keep dry and wet waste segregated. Ensure pets are kept away from the garbage pile.";
    priorityJustification = "Low severity since it is primarily a sanitation and aesthetic hazard, pending escalation.";
    estimatedResolutionDays = 1;
  }

  return {
    category,
    priority,
    priorityJustification,
    estimatedResolutionDays,
    suggestedAuthority,
    immediateCitizenSafetyAction,
    technicalDiagnostic,
    isEvidenceLegitimate: true,
    isFallbackMode: true,
    fallbackReason: "The primary AI engine is currently over capacity or has no credentials. We used local smart keyword-matching to keep you moving."
  };
}

function getLocalFallbackChat(message: string, locality: string) {
  const msg = (message || "").toLowerCase();
  let text = "";

  if (msg.includes("predictive") || msg.includes("reported civic failures")) {
    text = `⚡ **Offline Civic Insight for ${locality || "Bowenpally"}**: Based on local community trends, public utility services (GHMC, TSSPDCL) are under high dispatch pressure due to seasonal demands. Standard resolution workflows are estimated between 2 to 5 days. Citizens are encouraged to participate in nearby community cleanups!`;
  } else if (msg.includes("light") || msg.includes("dark") || msg.includes("bulb") || msg.includes("electricity")) {
    text = `💡 **Samaj Shakti Offline Assist (TSSPDCL Streetlight Guide)**:
Streetlight repairs are managed by the Centralized Electricity Division. 
1. **Reporting**: Note down the Pole ID (usually painted in black on the pole).
2. **Standard Resolution**: TSSPDCL usually resolves light bulb and wiring failures within 48 to 72 hours.
3. **Citizen Action**: Inform block volunteers on your street to increase visibility while repairs are underway. Keep the area around the pole clear of any low-hanging branches.`;
  } else if (msg.includes("water") || msg.includes("leak") || msg.includes("drain") || msg.includes("sewer") || msg.includes("pipe")) {
    text = `💧 **Samaj Shakti Offline Assist (HMWS&SB Water Board Guide)**:
Water and sewerage complaints fall under the jurisdiction of the Hyderabad Water Board (HMWS&SB).
1. **Reporting**: Take a clear picture of the pooling water to submit with your ticket.
2. **Standard Resolution**: Water pipeline leaks are addressed with high urgency (24-48 hours) to prevent road sinkage, while sewage overflow is cleared in 2-3 days.
3. **Citizen Action**: Warn neighbors to restrict usage of direct borehole/sump supply in the immediate vicinity if mixing is suspected.`;
  } else if (msg.includes("road") || msg.includes("pothole") || msg.includes("manhole") || msg.includes("crater") || msg.includes("pavement")) {
    text = `🚧 **Samaj Shakti Offline Assist (GHMC Road Works Guide)**:
Potholes and open manholes pose major traffic safety hazards, especially for two-wheelers.
1. **Reporting**: Mark the precise road name on your Samaj Shakti live map so the Ward Engineer is notified.
2. **Standard Resolution**: Minor patch repairs take 3-5 days. Heavy re-carpeting can take longer depending on weather conditions.
3. **Citizen Action**: Place a cautionary plant branch, traffic cone, or temporary warning block near the open manhole/crater immediately to alert oncoming night-time traffic.`;
  } else if (msg.includes("garbage") || msg.includes("waste") || msg.includes("trash") || msg.includes("dump") || msg.includes("clean")) {
    text = `🧹 **Samaj Shakti Offline Assist (GHMC Sanitation Guide)**:
Sanitation is a vital collaborative effort between citizens and municipal sweepers.
1. **Reporting**: Record the nearest landmark of the garbage dump point.
2. **Standard Resolution**: Clearance of illegal dumping spots or garbage piles is scheduled within 24-36 hours.
3. **Citizen Action**: Form a block-level monitoring group or organize a 30-minute community cleanliness drive using Samaj Shakti's local coordination tools.`;
  } else {
    text = `👋 **Namaste from Samaj Shakti Voice Assist!** 
The primary AI service is currently at capacity (quota limit reached). I have activated **Samaj Shakti Offline Smart Assist** mode for you!

I can guide you on:
- 💡 **Streetlights** (TSSPDCL procedures)
- 💧 **Water & Drainage** (HMWS&SB guidelines)
- 🚧 **Road & Pothole Safety** (GHMC protocols)
- 🧹 **Sanitation & Waste Cleanup** (Community initiatives)

Please describe your query or use our manual 'Report Civic Issue' form to log a case!`;
  }

  return {
    text,
    isFallbackMode: true,
    fallbackReason: "The primary AI engine is currently over capacity (429 rate limit or missing credentials). We switched to offline mode to ensure your community platform remains accessible."
  };
}

// ─── API ENDPOINT: AI ANALYSIS (Image/Video understanding) ───
// Uses gemini-3.1-pro-preview for advanced understanding of images/videos.
app.post("/api/gemini/analyze", async (req: Request, res: Response): Promise<void> => {
  const { title, desc, imageBase64, videoBase64, mimeType, existingIssues } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key missing, returning local fallback diagnostic.");
      res.json(getLocalFallbackAnalysis(title, desc));
      return;
    }

    const parts: any[] = [];

    // Add image if provided
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    // Add video if provided
    if (videoBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "video/mp4",
          data: videoBase64,
        },
      });
    }

    // Construct the context for existing issues to check for duplicates
    let duplicateCheckContext = "No existing issues to check for duplicates.";
    if (existingIssues && existingIssues.length > 0) {
      duplicateCheckContext = "Compare the NEW reported issue below with these EXISTING active issues in the same locality to identify if it is a duplicate:\n" + 
        existingIssues.map((issue: any) => `- ID: ${issue.id}, Title: ${issue.title}, Description: ${issue.desc}${issue.imageUrl ? `, Image URL: ${issue.imageUrl}` : ""}`).join("\n");
    }

    // Comprehensive analysis prompt
    parts.push({
      text: `You are Samaj Shakti AI, a highly advanced civic engineering auditor. 
Analyze the provided visual evidence (image/video) and description:
Title: ${title || "Not provided"}
Description: ${desc || "Not provided"}

DUPLICATE CHECK CONTEXT:
${duplicateCheckContext}

Please perform a zero-trust diagnostic audit. Also, check if this is a DUPLICATE of any existing issue listed above based on the visual evidence and descriptions.

Provide your response as a JSON object matching this schema:
{
  "category": "Road Damage" | "Water Leakage" | "Streetlight" | "Waste Management" | "Infrastructure" | "Other",
  "priority": "low" | "medium" | "high" | "critical",
  "priorityJustification": "Clear diagnostic reason for this priority level.",
  "estimatedResolutionDays": 3,
  "suggestedAuthority": "GHMC" | "HMWS&SB" | "TSSPDCL" | "Traffic Police" | "Municipal Corporation",
  "immediateCitizenSafetyAction": "Actionable advice for residents to stay safe around this issue.",
  "technicalDiagnostic": "Advanced description of the structural failure or risk.",
  "isEvidenceLegitimate": true,
  "isDuplicate": boolean,
  "duplicateOfId": string | null,
  "duplicateReason": "Explanation of why this is considered a duplicate, or why it is unique."
}

Provide ONLY the valid JSON block.`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // Using latest Flash model for rapid diagnostic audits
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    // Graceful local fallback assessment instead of failing!
    res.json(getLocalFallbackAnalysis(title, desc));
  }
});

app.post("/api/gemini/voice-to-report", async (req: Request, res: Response): Promise<void> => {
  const { audioBase64, mimeType } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key missing, returning local fallback transcription.");
      res.json({
        title: "Voice Report Title",
        desc: "Fallback transcription: Please ensure your API key is set up to transcribe voice notes properly.",
      });
      return;
    }

    const parts: any[] = [];
    parts.push({
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64,
      },
    });

    parts.push({
      text: `You are Samaj Shakti AI. Listen to this voice recording and extract a very concise title and a detailed description for a civic issue report.
      
Respond ONLY with a JSON object matching this schema:
{
  "title": "A short, 4-7 word title",
  "desc": "A clear, descriptive summary of the issue mentioned in the audio"
}`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("AI Voice-to-Report Error:", error);
    res.json({
      title: "Error processing audio",
      desc: "There was an error processing the audio clip. Please type manually or try again.",
    });
  }
});

// ─── API ENDPOINT: CHAT (Civic queries & analysis) ───
// Supports normal chat, Google Search grounding, Maps grounding, and deep high thinking mode.
app.post("/api/gemini/chat", async (req: Request, res: Response): Promise<void> => {
  const { message, history, groundSearch, groundMaps, enableDeepReasoning, locality } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key missing, returning local fallback chat.");
      res.json(getLocalFallbackChat(message, locality));
      return;
    }

    const systemInstruction = `You are Samaj Shakti AI, a helpful, deeply knowledgeable community coordinator and civic advocate for local neighborhoods in India.
Your mission is to guide citizens, explain resolution steps, identify municipal divisions (like GHMC, TSSPDCL, HMWS&SB), and suggest cooperative community tasks (e.g., cleanliness drives, water conservation).
Locality Context: The user is currently browsing the "${locality || "Old Bowenpally"}" locality. Use this local context to make recommendations tailored to them.
Be extremely friendly, clear, empathetic, and civic-minded. Provide structural and concrete steps for resolution. Avoid generic boilerplate advice.
IMPORTANT: Keep your response very concise, highly engaging, and direct. Limit your answer to 2 short paragraphs maximum (less than 150 words) so it loads quickly and can be easily synthesized for Text-To-Speech.`;

    // Map history to standard GenAI schema
    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Append current user message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Configure tools
    const tools: any[] = [];
    let toolConfig: any = undefined;

    if (groundSearch) {
      tools.push({ googleSearch: {} });
    } else if (groundMaps) {
      tools.push({ googleMaps: {} });
    }

    if (tools.length > 0) {
      toolConfig = { includeServerSideToolInvocations: true };
    }

    // Select correct model based on Deep Reasoning toggle (Gemini 3 series)
    const selectedModel = enableDeepReasoning ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

    // Set configuration
    const config: any = {
      systemInstruction,
    };

    if (tools.length > 0) {
      config.tools = tools;
      config.toolConfig = toolConfig;
    }

    // Handle Deep Reasoning / High thinking mode
    if (enableDeepReasoning) {
      config.thinkingConfig = {
        thinkingLevel: "HIGH", // Enable ThinkingLevel.HIGH for high thinking queries
      };
      // Note: do NOT set maxOutputTokens for high thinking queries as per guidelines
    } else {
      config.maxOutputTokens = 1000;
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedContents,
      config,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    // Graceful fallback response instead of failing!
    res.json(getLocalFallbackChat(message, locality));
  }
});

// ─── API ENDPOINT: TEXT-TO-SPEECH (TTS) ───
// Uses gemini-3.1-flash-tts-preview to generate voice responses
app.post("/api/gemini/tts", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voiceName } = req.body;

    if (!text) {
      res.status(400).json({ error: "Text parameter is required" });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is not configured. Directing client to browser SpeechSynthesis.");
      res.json({ audioBase64: null, useLocalFallback: true, error: "API key not configured" });
      return;
    }

    // Use Kore by default, other options Puck, Charon, Zephyr, Fenrir
    const selectedVoice = voiceName || "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say warmly and clearly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini TTS model");
    }

    res.json({ audioBase64: base64Audio });
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    res.json({ audioBase64: null, useLocalFallback: true, error: error.message || "Failed to generate voice" });
  }
});

// ─── API ENDPOINT: GMAIL SENDER ───
// Proxy to safely send Gmail alerts using Google Workspace User OAuth Token
app.post("/api/gmail/send", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization;
    const { to, subject, bodyText } = req.body;

    if (!token) {
      res.status(401).json({ error: "Authorization access token is required" });
      return;
    }

    if (!to || !subject || !bodyText) {
      res.status(400).json({ error: "Missing required fields (to, subject, bodyText)" });
      return;
    }

    // Construct the raw email in RFC 822 format
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      "",
      bodyText,
    ];
    const emailString = emailParts.join("\r\n");

    // Base64Url encode the raw email string
    const encodedEmail = Buffer.from(emailString)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Google Gmail REST API
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Failed to send email");
    }

    res.json({ success: true, messageId: data.id });
  } catch (error: any) {
    console.error("Gmail Send Error:", error);
    res.status(500).json({ error: error.message || "Failed to send Gmail alert" });
  }
});

// ─── API ENDPOINT: HEALTH CHECK ───
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── VITE DEV SERVER & PRODUCTION ROUTING ───
async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware mounted in development mode");
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      console.log(`Serving static files from: ${distPath}`);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Samaj Shakti Full-Stack server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Critical Server Startup Error:", error);
    process.exit(1);
  }
}

startServer();
