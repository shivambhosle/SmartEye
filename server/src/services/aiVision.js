import { GoogleGenerativeAI } from '@google/generative-ai';
import { ISSUE_CATEGORIES } from '../models/Issue.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are the AI Vision Engine for SmartEye, a civic issue reporting platform.
You will be shown a photo submitted by a citizen reporting a problem in their city.

Analyze the image and respond with ONLY a JSON object (no markdown fences, no preamble, no explanation) matching this exact shape:

{
  "category": one of ${JSON.stringify(ISSUE_CATEGORIES)},
  "severity": one of ["low", "medium", "high", "critical"],
  "description": a 1-2 sentence factual description of what's visible, written as it would appear on a government work order,
  "confidence": a number between 0 and 1 representing how confident you are in the category classification,
  "recommendedDepartment": one of ["Public Works", "Sanitation", "Electrical", "Traffic Police", "Water Department", "Parks Department", "Other"]
}

If the image does not show a genuine civic issue, set category to "other", severity to "low", and say so plainly in the description.
Respond with raw JSON only. Do not wrap it in backticks.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeIssueImage(base64Image, mediaType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent([
        SYSTEM_PROMPT,
        { inlineData: { data: base64Image, mimeType: mediaType } },
        'Analyze this civic issue photo and respond with the JSON object described above.',
      ]);

      const rawText = result.response.text();
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return { ...parsed, rawModelResponse: rawText };
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