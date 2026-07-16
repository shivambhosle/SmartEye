import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Locate, Search } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Recenters the map whenever position/zoom changes — react-leaflet doesn't
// auto-pan the view just because the marker's position prop changed, so
// without this, "Use Current Location" would move the pin but the map view
// itself would stay put, making the pin appear to vanish off-screen.
function RecenterOnChange({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [position, zoom, map]);
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [position, setPosition] = useState(value || DEFAULT_CENTER);
  // undefined = don't force a zoom change (used for manual clicks/drags)
  const [focusZoom, setFocusZoom] = useState(undefined);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (value) setPosition(value);
  }, [value]);

  function handlePick(latlng, zoom) {
    setPosition(latlng);
    setFocusZoom(zoom);
    onChange(latlng);
    setResults([]);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      // Zoom in close (16) — this is the user's precise location, so a wide
      // city-level zoom would make the pin easy to miss.
      (pos) => handlePick({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 16),
      () => alert('Could not get your location. Check location permissions and try again.')
    );
  }

  function handleSearchChange(e) {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`
        );
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('[LocationPicker] geocoding search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function selectResult(result) {
    const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setQuery(result.display_name);
    handlePick(latlng, 16);
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search for an address..."
          className="w-full rounded-lg border border-border bg-surface py-3 pl-11 pr-4 text-sm"
        />
        {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">Searching...</span>}

        {results.length > 0 && (
          <div className="absolute z-[1000] mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectResult(r)}
                className="block w-full truncate px-4 py-2 text-left text-sm hover:bg-surface-hover"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted"
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background"
        >
          <Locate className="h-4 w-4" />
          Use Current
        </button>
      </div>

      <div className="relative isolate z-0 h-[350px] overflow-hidden rounded-xl border border-border sm:h-[400px]">
        <MapContainer center={position} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend: (e) => handlePick(e.target.getLatLng()),
            }}
          />
          <ClickHandler onPick={(latlng) => handlePick(latlng)} />
          <RecenterOnChange position={position} zoom={focusZoom} />
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-muted">Search an address, click anywhere on the map, drag the pin, or use your current location.</p>
    </div>
  );
}