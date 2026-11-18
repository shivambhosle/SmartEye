import torch
import torch.nn as nn
from torchvision import models
import json
import os

checkpoint_path = os.path.join(os.path.dirname(__file__), 'issue_classifier.pt')
output_onnx_path = os.path.join(os.path.dirname(__file__), 'issue_classifier.onnx')
output_classes_path = os.path.join(os.path.dirname(__file__), 'class_names.json')

# Target in server directory as well so the server has it directly
server_model_dir = os.path.join(os.path.dirname(__file__), '../server/src/models/ai')
os.makedirs(server_model_dir, exist_ok=True)
server_onnx_path = os.path.join(server_model_dir, 'issue_classifier.onnx')
server_classes_path = os.path.join(server_model_dir, 'class_names.json')

print(f"Loading checkpoint from {checkpoint_path}...")
checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
class_names = checkpoint['class_names']
print(f"Classes ({len(class_names)}): {class_names}")

model = models.mobilenet_v2(weights=None)
model.classifier[1] = nn.Linear(model.last_channel, len(class_names))
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# Dummy input matching image tensor: batch_size=1, channels=3, height=224, width=224
dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)

print("Exporting to ONNX...")
torch.onnx.export(
    model,
    dummy_input,
    output_onnx_path,
    export_params=True,
    opset_version=14,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
    dynamo=False
)

# Also copy to server directory
import shutil
shutil.copyfile(output_onnx_path, server_onnx_path)

with open(output_classes_path, 'w') as f:
    json.dump(class_names, f, indent=2)

with open(server_classes_path, 'w') as f:
    json.dump(class_names, f, indent=2)

print(f"ONNX model successfully saved to:\n- {output_onnx_path}\n- {server_onnx_path}")
print(f"File size: {os.path.getsize(output_onnx_path) / (1024 * 1024):.2f} MB")
