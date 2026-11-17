import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
//import { api } from '../lib/api.js';
import { staffApi as api, getPhotoUrl } from '../lib/api.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function AdminMap() {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAllIssues().then(setIssues).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Admin Map View <span className="ml-2 text-base font-normal text-muted">Visualize all reported civic issues for effective management.</span>
        </h1>
      </div>

      {error && <p className="mb-4 text-status-urgent">{error}</p>}

      <div className="relative isolate z-0 h-[500px] overflow-hidden rounded-xl border border-border sm:h-[650px]">
        <MapContainer center={{ lat: 28.6139, lng: 77.209 }} zoom={12} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {issues.map((issue) => (
            <Marker key={issue._id} position={{ lat: issue.location.lat, lng: issue.location.lng }}>
              <Popup>
                <div className="text-sm">
                  <img src={getPhotoUrl(issue.photoUrl)} alt={issue.category} className="mb-2 h-24 w-full rounded object-cover" />
                  <p className="font-bold">Issue #{issue._id.slice(-4)}</p>
                  <p className="capitalize"><strong>Category:</strong> {issue.category?.replace(/_/g, ' ')}</p>
                  {issue.department && <p><strong>Department:</strong> {issue.department}</p>}
                  <p><strong>Status:</strong> {issue.status}</p>
                  <p><strong>Reported by:</strong> {issue.reportedBy?.name || 'Unknown'}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}