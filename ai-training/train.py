"""
Trains a pothole/normal road classifier using transfer learning on MobileNetV2.

Why transfer learning: training a CNN from scratch needs tens of thousands of
images and a lot of compute. Instead, we start from a MobileNetV2 already
trained on 1.4 million general images (ImageNet) — it already knows how to
recognize edges, textures, and shapes. We freeze that knowledge and only train
a new, small classification head on top, which needs far fewer images
(hundreds, not millions) to learn "pothole vs normal road" specifically.
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models

# --- Device selection: use Apple's Metal backend if available ---
# This is the M4 Air's GPU acceleration path. Falls back to CPU if MPS
# isn't available (e.g. running this same script on a different machine).
device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
print(f'Using device: {device}')

DATA_DIR = 'data'
BATCH_SIZE = 16
EPOCHS = 8
LEARNING_RATE = 0.001

# --- Data loading and augmentation ---
# Augmentation (random flips/rotations) artificially expands a small dataset by
# showing the model varied versions of the same photos, which helps it
# generalize instead of memorizing exact pixels.
train_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),  # ImageNet stats
])

val_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

full_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transforms)
class_names = full_dataset.classes
print(f'Classes found: {class_names}')

# 80/20 train/validation split — validation images are held out from training
# entirely, so accuracy on them tells us how well the model generalizes
# rather than how well it memorized the training set.
val_size = int(0.2 * len(full_dataset))
train_size = len(full_dataset) - val_size
train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
val_dataset.dataset.transform = val_transforms  # val set shouldn't use random augmentation

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

print(f'Training on {train_size} images, validating on {val_size} images')

# --- Model: MobileNetV2 pretrained on ImageNet ---
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

# Freeze all pretrained layers — we don't want to destroy what it already
# learned by training it on our much smaller dataset.
for param in model.parameters():
    param.requires_grad = False

# Replace the final classification layer with one sized for our classes.
# This new layer is the ONLY part that actually gets trained.
num_classes = len(class_names)
model.classifier[1] = nn.Linear(model.last_channel, num_classes)

model = model.to(device)

criterion = nn.CrossEntropyLoss()
# Only the new classifier layer's parameters need an optimizer, since
# everything else is frozen (requires_grad=False).
optimizer = torch.optim.Adam(model.classifier[1].parameters(), lr=LEARNING_RATE)

# --- Training loop ---
for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)

    train_loss = running_loss / train_size

    # --- Validation ---
    model.eval()
    correct = 0
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()

    val_accuracy = correct / val_size * 100
    print(f'Epoch {epoch + 1}/{EPOCHS} — train loss: {train_loss:.4f} — val accuracy: {val_accuracy:.1f}%')

# --- Save the trained model ---
torch.save({
    'model_state_dict': model.state_dict(),
    'class_names': class_names,
}, 'pothole_classifier.pt')

print('\nSaved trained model to pothole_classifier.pt')