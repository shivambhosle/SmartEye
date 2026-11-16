import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Tag, AlertTriangle, MessageSquare, Upload, X, ThumbsUp, CheckCircle2 } from 'lucide-react';
import LocationPicker from '../components/LocationPicker.jsx';
import { citizenApi as api } from '../lib/api.js';

const CATEGORIES = [
  { value: 'road_infrastructure', label: 'Road & Public Infrastructure' },
  { value: 'street_lighting', label: 'Street Lighting' },
  { value: 'waste_sanitation', label: 'Waste & Sanitation' },
  { value: 'water_drainage', label: 'Water & Drainage' },
  { value: 'trees_green_infrastructure', label: 'Trees & Green Infrastructure' },
  { value: 'public_property_vandalism', label: 'Vandalism, Graffiti & Damaged Signboards' },
  { value: 'illegal_parking', label: 'Illegal Parking' },
  { value: 'other_civic_issue', label: 'Other Civic Issue' },
];

const LEGACY_CATEGORY_MAP = {
  pothole: 'road_infrastructure',
  road_crack: 'road_infrastructure',
  damaged_signboard: 'public_property_vandalism',
  graffiti: 'public_property_vandalism',
  streetlight: 'street_lighting',
  garbage: 'waste_sanitation',
  construction_waste: 'waste_sanitation',
  water_leakage: 'water_drainage',
  drainage: 'water_drainage',
  open_manhole: 'water_drainage',
  flooding: 'water_drainage',
  fallen_tree: 'trees_green_infrastructure',
  stray_animal: 'other_civic_issue',
  animal_civic_issue: 'other_civic_issue',
  illegal_parking: 'illegal_parking',
  other: 'other_civic_issue',
};

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-status-low' },
  { value: 'medium', label: 'Medium', color: 'bg-status-medium' },
  { value: 'high', label: 'High', color: 'bg-status-high' },
  { value: 'urgent', label: 'Urgent', color: 'bg-status-urgent' },
];

export default function Report() {
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [captureMode, setCaptureMode] = useState('gallery'); // 'live' | 'gallery'
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('medium');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null); // { category, confidence, rawClass } | null
  const [suggesting, setSuggesting] = useState(false);

  // Duplicate issue detection states
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [ignoredDuplicate, setIgnoredDuplicate] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [upvotedIssue, setUpvotedIssue] = useState(null);

  function handleFile(file, mode = 'gallery') {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setCaptureMode(mode);
    setSuggestion(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Fire-and-forget: ask the local trained model for a category suggestion.
    // If it's confident about a category it knows (road infrastructure/waste), we fill
    // the dropdown automatically — the citizen can still change it manually
    // at any time.
    setSuggesting(true);
    const formData = new FormData();
    formData.append('image', file);
    api.suggestCategory(formData)
      .then((result) => {
        if (result.category) {
          const canonicalCategory = LEGACY_CATEGORY_MAP[result.category] || result.category;
          const match = CATEGORIES.find((c) => c.value === canonicalCategory);
          if (match) {
            setSuggestion({ ...result, category: canonicalCategory });
            setCategory(canonicalCategory);
          }
        }
      })
      .catch(() => {
        // Local model service not running or errored — falls back to manual selection.
      })
      .finally(() => setSuggesting(false));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0], 'gallery');
  }

  // Automatically check for nearby duplicates whenever location and category are selected
  useEffect(() => {
    if (!location?.lat || !location?.lng || !category) {
      setDuplicates([]);
      setCheckingDuplicates(false);
      return;
    }

    let isCurrent = true;
    setCheckingDuplicates(true);
    setIgnoredDuplicate(false);

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkDuplicates(location.lat, location.lng, category);
        if (isCurrent) {
          setDuplicates(res.duplicates || []);
        }
      } catch (err) {
        if (isCurrent) setDuplicates([]);
      } finally {
        if (isCurrent) setCheckingDuplicates(false);
      }
    }, 400);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [location?.lat, location?.lng, category]);

  async function handleUpvote(duplicateIssue) {
    setUpvoting(true);
    setError('');
    try {
      await api.upvoteIssue(duplicateIssue._id);
      setUpvotedIssue(duplicateIssue);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpvoting(false);
    }
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
      if (location.address) {
        formData.append('address', location.address);
      }
      formData.append('userNote', note);
      formData.append('captureMode', captureMode);

      await api.createIssue(formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (upvotedIssue) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-resolved/20 text-status-resolved">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Issue Supported!</h2>
        <p className="mt-2 text-muted">
          You have successfully supported an existing civic report nearby. This avoids duplicate tickets and increases repair urgency for municipal officers.
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
          <label className="mb-3 flex items-center justify-between font-semibold">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-brand-light" /> Photo Evidence
            </span>
            <span className="text-xs text-muted">
              Live on-site capture <strong className="text-emerald-400">recommended</strong>
            </span>
          </label>

          {/* Hidden inputs for camera vs gallery */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0], 'live')}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0], 'gallery')}
          />

          {imagePreview ? (
            <div className="relative flex flex-col items-center justify-center rounded-xl border border-border bg-surface/40 p-6 text-center">
              <img src={imagePreview} alt="Preview" className="max-h-72 rounded-lg object-contain shadow-md" />
              
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {captureMode === 'live' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <Camera className="h-3.5 w-3.5" /> Verified Live Capture
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    <Upload className="h-3.5 w-3.5" /> Gallery Upload
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setSuggestion(null);
                    setSuggesting(false);
                    setCategory('');
                    if (cameraInputRef.current) cameraInputRef.current.value = '';
                    if (galleryInputRef.current) galleryInputRef.current.value = '';
                  }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-status-urgent transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Remove & Retake
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {/* Option 1: Live Camera Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-500/10"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                  <Camera className="h-7 w-7" />
                </div>
                <span className="text-base font-bold text-emerald-300">Take Live Photo</span>
                <span className="mt-1 text-xs text-muted">Direct on-site camera verification</span>
                <span className="mt-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Recommended for Priority Action
                </span>
              </button>

              {/* Option 2: Gallery File Upload */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/50 p-6 text-center transition-all hover:border-brand-light hover:bg-surface"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt text-muted transition-transform group-hover:scale-110">
                  <Upload className="h-7 w-7" />
                </div>
                <span className="text-base font-semibold">Upload from Gallery</span>
                <span className="mt-1 text-xs text-muted">Or drag & drop photo</span>
                <span className="mt-2 text-[10px] text-muted">
                  For passenger or offline reports
                </span>
              </button>
            </div>
          )}
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
              📍 Auto-identified from photo: <strong>{CATEGORIES.find((c) => c.value === suggestion.category)?.label || suggestion.category}</strong>{' '}
              <span className="text-muted">({Math.round(suggestion.confidence * 100)}% match)</span> — tap below to change if incorrect.
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
            Covers municipal roads, sanitation, streetlights, drainage, trees, vandalism, and traffic parking.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-4 text-xs text-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-urgent" />
          <div>
            <strong className="text-foreground">🚨 Emergency Notice:</strong> For active emergencies, severe road accidents, or fires, dial 112 immediately. SmartEye is dedicated to non-emergency civic maintenance.
          </div>
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
            placeholder="Describe location landmarks, obstruction level, or safety hazards..."
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
          />
        </div>

        {/* Duplicate Prevention Alert */}
        {!ignoredDuplicate && duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm">
                  Similar issue already reported nearby ({duplicates[0].distanceMeters} meters away)
                </h4>
                <p className="mt-1 text-xs text-muted">
                  A matching{' '}
                  <strong className="text-foreground">
                    {CATEGORIES.find((c) => c.value === duplicates[0].category)?.label || duplicates[0].category}
                  </strong>{' '}
                  report exists within your vicinity with {duplicates[0].supportCount || 1} supporter(s).
                </p>

                {duplicates[0].photoUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={duplicates[0].photoUrl}
                      alt="Existing report"
                      className="h-20 w-24 object-cover rounded-lg border border-border"
                    />
                    {duplicates[0].userNote && (
                      <p className="text-xs text-muted italic line-clamp-2">
                        "{duplicates[0].userNote}"
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={upvoting || duplicates[0].isUserUpvoted}
                    onClick={() => handleUpvote(duplicates[0])}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {duplicates[0].isUserUpvoted ? 'Already Supported' : 'Upvote & Support Existing Report'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIgnoredDuplicate(true)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-foreground"
                  >
                    No, this is a distinct issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-4 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Submitting Grievance...' : 'Submit Grievance to Municipal Authority'}
        </button>
      </form>
    </div>
  );
}