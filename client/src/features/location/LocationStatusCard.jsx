import { useState } from 'react';
import { AlertTriangle, MapPin, Navigation } from 'lucide-react';
import useAutoLocationSync from './useAutoLocationSync';
import useLocationUpdater from './useLocationUpdater';

const formatCoordinates = (location) => {
  const [lng, lat] = location?.coordinates || [];
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return 'No GPS coordinates saved yet';
  }

  if (Number(lat) === 0 && Number(lng) === 0) {
    return 'Location is still at the default placeholder';
  }

  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
};

const getGoogleMapsUrl = (location) => {
  const [lng, lat] = location?.coordinates || [];
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return '';
  }

  if (Number(lat) === 0 && Number(lng) === 0) {
    return '';
  }

  return `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`;
};

const getOpenStreetMapEmbedUrl = (location) => {
  const [lng, lat] = location?.coordinates || [];
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return '';
  }

  if (latitude === 0 && longitude === 0) {
    return '';
  }

  const bbox = [
    longitude - 0.002,
    latitude - 0.002,
    longitude + 0.002,
    latitude + 0.002
  ].join(',');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
};

const formatUpdatedAt = (value) => {
  if (!value) return 'Not updated yet';
  return new Date(value).toLocaleString();
};

export default function LocationStatusCard({
  title = 'Location Status',
  description = 'Keep your location updated so emergency and task routing can work accurately.',
  readOnly = false,
  location: readOnlyLocation = null,
  showEmbeddedMap = false
}) {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => !readOnly);
  const {
    location,
    updating,
    error,
    success,
    updateLocation
  } = useLocationUpdater();
  const {
    syncedLocation,
    syncing,
    permissionDenied,
    lastSyncAt
  } = useAutoLocationSync({
    enabled: !readOnly && autoSyncEnabled,
    latestLocation: location
  });

  const activeLocation = readOnly ? readOnlyLocation : (syncedLocation || location);
  const googleMapsUrl = getGoogleMapsUrl(activeLocation);
  const openStreetMapUrl = getOpenStreetMapEmbedUrl(activeLocation);
  const isDefaultLocation =
    !activeLocation?.coordinates ||
    (Number(activeLocation.coordinates[0]) === 0 && Number(activeLocation.coordinates[1]) === 0);

  return (
    <div className="motion-card rounded-2xl border border-emerald-200 bg-white/90 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <MapPin size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">{title}</h3>
            <p className="mt-1 text-sm text-gray-700">{description}</p>
          </div>
        </div>

        <span
          className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${
            isDefaultLocation ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {isDefaultLocation ? 'Needs Update' : 'Active'}
        </span>
      </div>

      {showEmbeddedMap && (
        <div className="mt-5">
          {openStreetMapUrl ? (
            <iframe
              title={`${title} map`}
              src={openStreetMapUrl}
              className="h-[180px] w-full rounded-2xl border border-emerald-100"
              loading="lazy"
              scrolling="no"
            />
          ) : (
            <div className="flex h-[180px] w-full items-center justify-center rounded-2xl bg-gray-100 text-sm font-semibold text-gray-500">
              Location not available yet
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700">Google Maps Location</p>
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white no-underline transition hover:bg-emerald-800"
            >
              Open in Maps
            </a>
          ) : (
            <p className="mt-1 text-gray-900">{formatCoordinates(activeLocation)}</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Last Updated</p>
          <p className="mt-1 text-gray-900">{formatUpdatedAt(activeLocation?.lastUpdated)}</p>
        </div>
      </div>

      {isDefaultLocation && (
        <div className="mt-4 flex gap-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Location is not enabled yet. Update your location so emergency routing can use your real position instead of the default placeholder.
          </span>
        </div>
      )}

      {!readOnly && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-900">Auto location sync</p>
              <p className="text-sm text-emerald-700">
                Checks every 60 seconds and updates only after 50 meters of movement.
              </p>
              {lastSyncAt && (
                <p className="mt-1 text-xs text-emerald-600">
                  Last auto-sync: {lastSyncAt.toLocaleString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAutoSyncEnabled((current) => !current)}
              className={`self-start rounded-full px-4 py-2 text-sm font-semibold transition ${
                autoSyncEnabled
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-white text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {autoSyncEnabled ? 'Auto-sync On' : 'Auto-sync Off'}
            </button>
          </div>

          {permissionDenied && (
            <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>Location permission was denied. Auto-sync is paused; manual updates require browser permission.</span>
            </div>
          )}

          {syncing && (
            <p className="text-sm font-medium text-emerald-700">Checking current location...</p>
          )}

          <button
            type="button"
            onClick={updateLocation}
            disabled={updating}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            <Navigation size={18} />
            {updating ? 'Updating Location...' : 'Update Location Now'}
          </button>
        </div>
      )}

      {success && <p className="mt-3 text-sm font-medium text-green-700">{success}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
