"""
Serves the trained pothole/garbage/normal classifier over HTTP, so the
Node.js backend can call it like any other API — Node can't run PyTorch
directly, so this small FastAPI service is the bridge between the two.

Run with: uvicorn serve:app --port 8001
"""

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io

app = FastAPI()

# Only the Node backend calls this, running on localhost — CORS is wide open
# here since this service is never exposed publicly, only called
# server-to-server from your own Express app.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

checkpoint = torch.load('issue_classifier.pt', map_location=device)
class_names = checkpoint['class_names']

model = models.mobilenet_v2(weights=None)
model.classifier[1] = nn.Linear(model.last_channel, len(class_names))
model.load_state_dict(checkpoint['model_state_dict'])
model = model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Maps this model's own class names to the category values your app's
# ISSUE_CATEGORIES enum actually uses. "Normal" isn't a real issue category,
# so it maps to None — the Node side treats that as "no confident suggestion."
CATEGORY_MAP = {
    'Pothole': 'pothole',
    'Garbage': 'garbage',
    'Normal': None,
}


@app.post('/predict')
async def predict(image: UploadFile = File(...)):
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert('RGB')
    input_tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        predicted_idx = torch.argmax(probabilities).item()

    predicted_class = class_names[predicted_idx]
    confidence = probabilities[predicted_idx].item()

    return {
        'rawClass': predicted_class,
        'category': CATEGORY_MAP.get(predicted_class),
        'confidence': round(confidence, 4),
    }


@app.get('/health')
async def health():
    return {'status': 'ok', 'classes': class_names}