"""
Trains SmartEye's multi-category civic issue classifier using Transfer Learning on MobileNetV2.

Upgrades over basic training:
1. Stratified 80/20 split & Class Capping (max 500 imgs/class) so massive folders
   (e.g. 11,000 trees) don't overpower smaller ones (e.g. 67 illegal parking).
2. WeightedRandomSampler during training so minority classes are sampled evenly.
3. Method 2 Advanced Data Augmentations (ColorJitter for lighting/shadows,
   RandomResizedCrop for distance variation, RandomRotation & Flip) isolated
   strictly to the training subset without affecting validation.
4. Saves the best-performing checkpoint to 'issue_classifier.pt'.
"""

import os
import random
from collections import defaultdict
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import datasets, transforms, models
from torchvision.datasets.folder import IMG_EXTENSIONS, has_file_allowed_extension

# --- Reproducibility ---
SEED = 42
random.seed(SEED)
torch.manual_seed(SEED)

# --- Device selection: CUDA GPU -> Apple Silicon Metal (MPS) -> CPU fallback ---
device = torch.device(
    'cuda' if torch.cuda.is_available()
    else 'mps' if torch.backends.mps.is_available()
    else 'cpu'
)
print(f'[train] Using device: {device}')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_PATH = os.path.join(BASE_DIR, 'issue_classifier.pt')

MAX_SAMPLES_PER_CLASS = 500
BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001

# --- Method 2: Advanced Data Augmentation for Training vs Clean Validation ---
train_transforms = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class TransformSubset(Dataset):
    """Applies a specific transform independently to a subset of ImageFolder."""
    def __init__(self, base_dataset, indices, transform):
        self.base_dataset = base_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        path, label = self.base_dataset.samples[self.indices[idx]]
        image = self.base_dataset.loader(path)
        if self.transform:
            image = self.transform(image)
        return image, label


EXCLUDED_SUBDIRS = {'label', 'labels', 'mask', 'masks', 'annotation', 'annotations'}


def is_valid_image_file(path):
    """Accepts real images while skipping segmentation masks/labels inside label folders."""
    if not has_file_allowed_extension(path, IMG_EXTENSIONS):
        return False
    rel_parts = os.path.relpath(path, DATA_DIR).split(os.sep)[:-1]
    return not any(part.lower() in EXCLUDED_SUBDIRS for part in rel_parts)


# Load raw folder index without transform (transforms are applied per split below)
base_dataset = datasets.ImageFolder(DATA_DIR, is_valid_file=is_valid_image_file)
class_names = base_dataset.classes
num_classes = len(class_names)
print(f'[train] Found {num_classes} classes: {class_names}')

# --- Stratified Split + Class Capping ---
class_to_indices = defaultdict(list)
for idx, (_, label) in enumerate(base_dataset.samples):
    class_to_indices[label].append(idx)

train_indices = []
val_indices = []
train_labels = []

print('\n[train] Balanced dataset allocation per category:')
for label_idx, cls_name in enumerate(class_names):
    indices = class_to_indices[label_idx]
    random.shuffle(indices)
    capped = indices[:MAX_SAMPLES_PER_CLASS]

    val_count = max(1, int(0.2 * len(capped)))
    cls_val = capped[:val_count]
    cls_train = capped[val_count:]

    val_indices.extend(cls_val)
    train_indices.extend(cls_train)
    train_labels.extend([label_idx] * len(cls_train))
    print(f'  • {cls_name:<28}: {len(cls_train):>3} train | {len(cls_val):>3} val (from {len(indices)} total)')

train_dataset = TransformSubset(base_dataset, train_indices, train_transforms)
val_dataset = TransformSubset(base_dataset, val_indices, val_transforms)

# WeightedRandomSampler ensures smaller classes (e.g. illegal_parking) appear
# equally alongside larger classes in every epoch!
class_sample_counts = defaultdict(int)
for lbl in train_labels:
    class_sample_counts[lbl] += 1

sample_weights = [1.0 / class_sample_counts[lbl] for lbl in train_labels]
sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(train_labels), replacement=True)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

print(f'\n[train] Training on {len(train_dataset)} images/epoch, validating on {len(val_dataset)} held-out images\n')

# --- Model: MobileNetV2 pretrained on ImageNet ---
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

# Freeze pretrained convolutional backbone
for param in model.parameters():
    param.requires_grad = False

# Replace final classification layer with N civic classes
model.classifier[1] = nn.Linear(model.last_channel, num_classes)
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.classifier[1].parameters(), lr=LEARNING_RATE)

# --- Training Loop ---
best_val_acc = 0.0

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

    train_loss = running_loss / len(train_dataset)

    # --- Validation ---
    model.eval()
    correct = 0
    class_correct = defaultdict(int)
    class_total = defaultdict(int)

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()

            for p, l in zip(predicted, labels):
                class_total[l.item()] += 1
                if p.item() == l.item():
                    class_correct[l.item()] += 1

    val_accuracy = correct / len(val_dataset) * 100
    print(f'Epoch {epoch + 1:2d}/{EPOCHS} — train loss: {train_loss:.4f} — val accuracy: {val_accuracy:.1f}%')

    if val_accuracy >= best_val_acc:
        best_val_acc = val_accuracy
        torch.save({
            'model_state_dict': model.state_dict(),
            'class_names': class_names,
            'val_accuracy': best_val_acc,
        }, OUTPUT_PATH)

print(f'\n[train] Best Validation Accuracy: {best_val_acc:.1f}%')
print('[train] Per-Class Final Validation Accuracy:')
for idx, cls_name in enumerate(class_names):
    total = class_total[idx]
    acc = (class_correct[idx] / total * 100) if total else 0.0
    print(f'  • {cls_name:<28}: {acc:5.1f}% ({class_correct[idx]}/{total})')

print(f'\nSaved best trained model to {OUTPUT_PATH}')
