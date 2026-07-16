// Calls the local Python FastAPI service (ai-training/serve.py) that wraps
// your trained MobileNetV2 model. Kept as its own function, separate from
// aiVision.js (the Gemini call), so either can fail independently without
// breaking the other.

const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL || 'http://localhost:8001';

export async function classifyWithLocalModel(buffer, filename, mimetype) {
  const formData = new FormData();
  // Node's built-in FormData/Blob (no extra package needed on Node 18+)
  formData.append('image', new Blob([buffer], { type: mimetype }), filename);

  const response = await fetch(`${LOCAL_MODEL_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Local model service returned ${response.status}`);
  }

  return response.json(); // { rawClass, category, confidence }
}