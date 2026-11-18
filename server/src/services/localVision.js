import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths for the exported ONNX model and class names
const MODEL_PATH = path.join(__dirname, '../models/ai/issue_classifier.onnx');
const CLASSES_PATH = path.join(__dirname, '../models/ai/class_names.json');

// Canonical mapping of the model's 7 classes
const CATEGORY_MAP = {
  'road_infrastructure': 'road_infrastructure',
  'street_lighting': 'street_lighting',
  'waste_sanitation': 'waste_sanitation',
  'water_drainage': 'water_drainage',
  'trees_green_infrastructure': 'trees_green_infrastructure',
  'public_property_vandalism': 'public_property_vandalism',
  'illegal_parking': 'illegal_parking',
  // Legacy aliases
  'pothole': 'road_infrastructure',
  'garbage': 'waste_sanitation',
};

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let onnxSession = null;
let classNames = null;

async function getSession() {
  if (onnxSession && classNames) return { session: onnxSession, classNames };

  if (!fs.existsSync(MODEL_PATH) || !fs.existsSync(CLASSES_PATH)) {
    throw new Error(`ONNX model or class names not found at ${MODEL_PATH}`);
  }

  classNames = JSON.parse(fs.readFileSync(CLASSES_PATH, 'utf-8'));
  onnxSession = await ort.InferenceSession.create(MODEL_PATH);
  console.log(`[localVision] ONNX MobileNetV2 loaded (${classNames.length} classes: ${classNames.join(', ')})`);
  return { session: onnxSession, classNames };
}

/**
 * Preprocesses an image buffer into a CHW Float32Array tensor normalized with ImageNet stats
 */
async function preprocessImage(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(224, 224, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const floatData = new Float32Array(3 * 224 * 224);

  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 224; x++) {
      const idx = (y * 224 + x) * 3;
      const r = (data[idx] / 255.0 - MEAN[0]) / STD[0];
      const g = (data[idx + 1] / 255.0 - MEAN[1]) / STD[1];
      const b = (data[idx + 2] / 255.0 - MEAN[2]) / STD[2];

      floatData[0 * 224 * 224 + y * 224 + x] = r;
      floatData[1 * 224 * 224 + y * 224 + x] = g;
      floatData[2 * 224 * 224 + y * 224 + x] = b;
    }
  }

  return new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
}

/**
 * Computes softmax probabilities over raw logits
 */
function softmax(logits) {
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }

  let sumExp = 0;
  const expLogits = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    expLogits[i] = Math.exp(logits[i] - maxLogit);
    sumExp += expLogits[i];
  }

  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = expLogits[i] / sumExp;
  }
  return probs;
}

/**
 * Classifies an uploaded civic issue photo using the native in-process ONNX MobileNetV2 model.
 * 
 * @param {Buffer} buffer - Raw image file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - Image mimetype
 * @returns {Promise<{ rawClass: string, category: string, confidence: number }>}
 */
export async function classifyWithLocalModel(buffer, filename, mimetype) {
  const start = Date.now();

  try {
    const { session, classNames } = await getSession();
    const inputTensor = await preprocessImage(buffer);
    const results = await session.run({ input: inputTensor });
    const outputData = results.output.data;

    const probabilities = softmax(outputData);

    let bestIdx = 0;
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > probabilities[bestIdx]) {
        bestIdx = i;
      }
    }

    const predictedClass = classNames[bestIdx];
    const confidence = Math.round(probabilities[bestIdx] * 10000) / 10000;
    const duration = Date.now() - start;

    console.log(`[localVision] ONNX inference completed in ${duration}ms: ${predictedClass} (${(confidence * 100).toFixed(1)}%)`);

    return {
      rawClass: predictedClass,
      category: CATEGORY_MAP[predictedClass] || predictedClass,
      confidence,
    };
  } catch (err) {
    console.error(`[localVision] In-process ONNX classification failed:`, err.message);

    // Optional fallback to external Python service if LOCAL_MODEL_URL is set
    const externalUrl = process.env.LOCAL_MODEL_URL;
    if (externalUrl && externalUrl !== 'http://localhost:8001') {
      console.log(`[localVision] Retrying via external LOCAL_MODEL_URL: ${externalUrl}`);
      const formData = new FormData();
      formData.append('image', new Blob([buffer], { type: mimetype }), filename);
      const res = await fetch(`${externalUrl}/predict`, { method: 'POST', body: formData });
      if (res.ok) return res.json();
    }

    throw err;
  }
}
