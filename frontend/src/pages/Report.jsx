import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Tag, AlertTriangle, MessageSquare, Upload, X } from 'lucide-react';
import LocationPicker from '../components/LocationPicker.jsx';
import { citizenApi as api } from '../lib/api.js';

const CATEGORIES = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'garbage', label: 'Garbage / Waste' },
  { value: 'streetlight', label: 'Broken Streetlight' },
  { value: 'illegal_parking', label: 'Illegal Parking' },
  { value: 'road_crack', label: 'Road Crack' },
  { value: 'water_leakage', label: 'Water Leakage' },
  { value: 'drainage', label: 'Drainage Issue' },
  { value: 'open_manhole', label: 'Open Manhole' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-status-low' },
  { value: 'medium', label: 'Medium', color: 'bg-status-medium' },
  { value: 'high', label: 'High', color: 'bg-status-high' },
  { value: 'urgent', label: 'Urgent', color: 'bg-status-urgent' },
];

export default function Report() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('medium');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null); // { category, confidence, rawClass } | null
  const [suggesting, setSuggesting] = useState(false);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setSuggestion(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Fire-and-forget: ask the local trained model for a category suggestion.
    // If it's confident about a category it knows (pothole/garbage), we fill
    // the dropdown automatically — the citizen can still change it manually
    // at any time, this just saves a step for the categories the model covers.
    // If the model isn't confident or doesn't recognize the photo (e.g. it's
    // an untrained category like a streetlight), the dropdown is simply left
    // for manual selection, same as before.
    setSuggesting(true);
    const formData = new FormData();
    formData.append('image', file);
    api.suggestCategory(formData)
      .then((result) => {
        if (result.category) {
          setSuggestion(result);
          setCategory(result.category);
        }
      })
      .catch(() => {
        // Local model service not running or errored — fine, falls back to fully manual.
      })
      .finally(() => setSuggesting(false));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!imageFile || !location || !category) {
      setError('Please add a photo, category, and location before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('lat', location.lat);
      formData.append('lng', location.lng);
      formData.append('userNote', note);

      await api.createIssue(formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-resolved/20 text-status-resolved">
          ✓
        </div>
        <h2 className="text-2xl font-bold">Report Submitted</h2>
        <p className="mt-2 text-muted">
          Thanks for helping your community. You can track this report from your Dashboard.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-6 py-3 font-semibold text-white"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Report an Issue</h1>
        <p className="mt-4 text-lg text-muted">Help make your community better by reporting civic issues</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-border p-6 sm:p-10">
        <div>
          <label className="mb-3 flex items-center gap-2 font-semibold">
            <Camera className="h-5 w-5" /> Upload Photo
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-12 text-center hover:border-brand-light"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreview(null);
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" /> Remove photo
                </button>
              </>
            ) : (
              <>
                <Upload className="mb-4 h-10 w-10 text-muted" />
                <p className="font-medium">Click or drag to upload an image</p>
                <p className="mt-1 text-sm text-muted">PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 font-semibold">
            <Tag className="h-5 w-5" /> Issue Category
          </label>

          {suggesting && (
            <p className="mb-2 text-xs text-muted">Checking photo against our trained model...</p>
          )}

          {suggestion && category === suggestion.category && (
            <p className="mb-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
              ✓ Our trained model detected this as <strong className="capitalize">{suggestion.category}</strong>{' '}
              <span className="text-muted">({Math.round(suggestion.confidence * 100)}% confidence)</span> — change it below if that's wrong.
            </p>
          )}

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            Our trained model currently recognizes potholes and garbage — for any other issue type, just pick it manually below.
          </p>
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 font-semibold">📍 Location</label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" /> Priority Level
          </label>
          <div className="flex flex-wrap gap-4">
            {PRIORITIES.map((p) => (
              <label key={p.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={priority === p.value}
                  onChange={() => setPriority(p.value)}
                  className="sr-only"
                />
                <span className={`h-3 w-3 rounded-full ${p.color} ${priority === p.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''}`} />
                <span className={priority === p.value ? 'font-semibold' : 'text-muted'}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 font-semibold">
            <MessageSquare className="h-5 w-5" /> Additional Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else worth mentioning?"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
          />
        </div>

        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-4 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}