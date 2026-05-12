/**
 * SureCheck — GPS Geofence Hook
 * Checks if user is within 200m radius of a configured site location.
 * Uses the Haversine formula for accurate distance calculation.
 */

import { useState, useEffect, useCallback } from 'react';

// Mock site coordinates — in production, fetch from API based on userSession.siteId
// 16. Mock site coordinates: in production, fetch this from an API based on userSession.siteId.
const MOCK_SITE = {
  latitude: 19.1218,   // Andheri West, Mumbai (mock)
  longitude: 72.8397,
  radiusMeters: 200,
  name: 'Andheri West Depot',
};

/**
 * Haversine formula — returns distance in meters between two lat/lng points.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  // 16A. Haversine calculates real-world distance between two latitude/longitude points in meters.
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * @returns {{
 *   gps: { latitude, longitude } | null,
 *   distance: number | null,
 *   withinFence: boolean | null,
 *   gpsError: string | null,
 *   gpsLoading: boolean,
 *   refreshGps: () => void,
 *   site: object,
 * }}
 */
export function useGpsFence() {
  // 16B. GPS hook state tracks coordinates, calculated distance, fence result, and loading/errors.
  const [gps, setGps] = useState(null);
  const [distance, setDistance] = useState(null);
  const [withinFence, setWithinFence] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchPosition = useCallback(() => {
    // 16C. Browser capability check: geolocation may not exist on every device/browser.
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this device.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 16C(i). Success path: store coordinates, compute distance to site, and mark in/out of fence.
        const { latitude, longitude, accuracy } = position.coords;
        const coords = { latitude, longitude, accuracy };
        setGps(coords);

        const dist = haversineDistance(
          latitude,
          longitude,
          MOCK_SITE.latitude,
          MOCK_SITE.longitude
        );
        setDistance(Math.round(dist));
        setWithinFence(dist <= MOCK_SITE.radiusMeters);
        setGpsLoading(false);
      },
      (err) => {
        // 16C(ii). Failure path: translate browser error codes into user-readable messages.
        let message = 'Could not retrieve location.';
        if (err.code === 1) message = 'Location permission denied. Please enable GPS access.';
        if (err.code === 2) message = 'Location unavailable. Please try again.';
        if (err.code === 3) message = 'Location request timed out. Please try again.';
        setGpsError(message);
        setGpsLoading(false);
      },
      {
        // 16C(iii). Options favor fresh, accurate GPS while allowing a short cached position.
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  // 16D. Auto-fetch on mount so the Location Check card is populated as soon as SureCheck opens.
  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    // 16E. Public GPS API used by SureCheck and GpsStatus.
    gps,
    distance,
    withinFence,
    gpsError,
    gpsLoading,
    refreshGps: fetchPosition,
    site: MOCK_SITE,
  };
}
