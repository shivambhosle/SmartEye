"""
Loads the trained model and classifies a single image.
Usage: python predict.py path/to/photo.jpg
"""

import sys
import torch
from torchvision import transforms, models
import torch.nn as nn
from PIL import Image

device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

checkpoint = torch.load('pothole_classifier.pt', map_location=device)
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

image_path = sys.argv[1] if len(sys.argv) > 1 else None
if not image_path:
    print('Usage: python predict.py path/to/photo.jpg')
    sys.exit(1)

image = Image.open(image_path).convert('RGB')
input_tensor = transform(image).unsqueeze(0).to(device)

with torch.no_grad():
    outputs = model(input_tensor)
    probabilities = torch.softmax(outputs, dim=1)[0]
    predicted_idx = torch.argmax(probabilities).item()

print(f'Prediction: {class_names[predicted_idx]}')
print(f'Confidence: {probabilities[predicted_idx].item() * 100:.1f}%')
print('\nAll class probabilities:')
for name, prob in zip(class_names, probabilities):
    print(f'  {name}: {prob.item() * 100:.1f}%')