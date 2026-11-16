import { GoogleGenerativeAI } from '@google/generative-ai';
import { ISSUE_CATEGORIES } from '../models/Issue.js';
import { getDepartmentForCategory, normalizeCategory } from '../config/departments.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are the AI Vision & Fraud Detection Engine for SmartEye, a civic issue reporting platform.
You will be shown a photo submitted by a citizen reporting a municipal civic problem in their city.

Analyze the image carefully and respond with ONLY a JSON object (no markdown fences, no preamble, no explanation) matching this exact shape:

{
  "category": one of ${JSON.stringify(ISSUE_CATEGORIES)},
  "severity": one of ["low", "medium", "high", "critical"],
  "description": a 1-2 sentence factual description of what's visible, written as it would appear on a government work order,
  "confidence": a number between 0 and 1 representing how confident you are in the category classification,
  "isAuthentic": boolean (true if this is a genuine on-site real-world photograph, false if it appears to be a spoof/photo taken of a computer monitor, phone screen, television, or printed paper),
  "authenticityNote": a concise 1-sentence assessment explaining whether the scene is an authentic outdoor photo or if signs of screen/printout spoofing (such as Moiré pixel grid patterns, screen bezels, display glare, or paper borders) are detected
}

Guidelines:
- Categorize using ONLY one of the specified canonical categories:
  * "road_infrastructure": potholes, road cracks, surface damage, uneven pavement.
  * "street_lighting": broken, non-functional, or damaged streetlights and public lighting.
  * "waste_sanitation": garbage accumulation, overflowing bins, illegal dumping, construction debris.
  * "water_drainage": water leakage, drainage blocks, sewage overflow, open manholes, waterlogging.
  * "trees_green_infrastructure": fallen trees, broken branches obstructing public spaces.
  * "public_property_vandalism": graffiti on public walls, defaced municipal structures, damaged or broken traffic/street signboards.
  * "illegal_parking": vehicles illegally parked or obstructing traffic and walkways.
  * "other_civic_issue": any other valid civic issue not covered above.
- Anti-Spoofing & Authenticity Rules:
  * Carefully examine pixel rasterization: if you see Moiré fringes (rainbow wavy interference patterns typical of camera-to-screen photos), visible monitor scanlines, reflection glare on monitor glass, laptop edges, or paper creases, set "isAuthentic" to false and describe the spoof indicator in "authenticityNote".
  * If it is a genuine real-world scene, set "isAuthentic" to true and "authenticityNote" to "Authentic on-site outdoor photo".
- Severity Assessment:
  * "critical": acute danger to human life (e.g., deep unlit road crater on fast road, open uncovered manhole, live electrical wire touching water).
  * "high": significant hazard (e.g., large pothole, major water main burst, large fallen tree blocking lane).
  * "medium": normal civic nuisance needing scheduled repair (e.g., standard pothole, overflowing garbage bin, unlit streetlight).
  * "low": minor cosmetic or non-hazardous issue.
- If the image does not show a genuine civic issue, set category to "other_civic_issue", severity to "low", and note this plainly in the description.
Respond with raw JSON only. Do not wrap it in backticks.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeIssueImage(base64Image, mediaType) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const model = genAI.getGenerativeModel({ model: modelName });

  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent([
        SYSTEM_PROMPT,
        { inlineData: { data: base64Image, mimeType: mediaType } },
        'Analyze this civic issue photo, evaluate authenticity/anti-spoofing, and respond with the JSON object described above.',
      ]);

      const rawText = result.response.text();
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const normalizedCategory = normalizeCategory(parsed.category);
      const departmentInfo = getDepartmentForCategory(normalizedCategory);

      return {
        ...parsed,
        category: normalizedCategory,
        isAuthentic: typeof parsed.isAuthentic === 'boolean' ? parsed.isAuthentic : true,
        authenticityNote: parsed.authenticityNote || 'Authentic on-site scene',
        recommendedDepartment: departmentInfo.name,
        rawModelResponse: rawText,
      };
    } catch (err) {
      lastError = err;

      // Only retry on 503 (overloaded) — anything else (bad image, bad key, etc.)
      // should fail immediately rather than wasting two more attempts.
      const isOverloaded = err.message?.includes('503') || err.message?.includes('overloaded');
      if (!isOverloaded || attempt === maxAttempts) break;

      const backoffMs = attempt * 1000; // 1s, then 2s
      console.warn(`[aiVision] Gemini overloaded, retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`);
      await sleep(backoffMs);
    }
  }

  throw lastError;
}