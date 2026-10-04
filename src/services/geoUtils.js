// src/services/geoUtils.js - Geospatial and Navigation Helper Utilities

/**
 * Calculates distance in meters between two lat/lng pairs using the Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats distance into human readable text (e.g. "350 m" or "2.4 km")
 */
export function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return '--';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calculates estimated time of arrival based on distance
 * @param {number} meters
 * @param {'walking'|'driving'} mode
 */
export function calculateETA(meters, mode = 'walking') {
  if (meters == null || meters <= 0) return 'Arrived';
  // Average speeds: walking ~ 4.5 km/h (1.25 m/s), driving ~ 35 km/h (9.7 m/s)
  const speed = mode === 'driving' ? 9.7 : 1.25;
  const seconds = meters / speed;
  const minutes = Math.round(seconds / 60);

  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${minutes} min${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `~${hours}h ${remainingMins}m`;
}

/**
 * Converts degrees (0-360) to 8-point compass direction
 */
export function getCompassDirection(degrees) {
  if (degrees == null || isNaN(degrees)) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}

/**
 * Formats speed from meters/second to km/h
 */
export function formatSpeed(mps) {
  if (mps == null || isNaN(mps) || mps < 0) return '0.0 km/h';
  const kmh = (mps * 3.6).toFixed(1);
  return `${kmh} km/h`;
}

/**
 * Detects activity type from speed in m/s
 */
export function detectActivity(mps) {
  if (mps == null || mps < 0.3) return { type: 'Stationary', icon: 'human-male' };
  if (mps < 1.8) return { type: 'Walking', icon: 'walk' };
  if (mps < 5.0) return { type: 'Running / Jogging', icon: 'run' };
  return { type: 'In Vehicle', icon: 'car' };
}

/**
 * Checks if a point is inside a circular safe zone (geofence)
 */
export function checkGeofence(patientLat, patientLng, safeZone) {
  if (!safeZone || safeZone.lat == null || safeZone.lng == null) {
    return { isInside: true, distanceToEdge: 0 };
  }
  const distanceToCenter = calculateDistance(patientLat, patientLng, safeZone.lat, safeZone.lng);
  const radius = safeZone.radiusMeters || 500;
  const isInside = distanceToCenter <= radius;
  return {
    isInside,
    distanceToCenter,
    radius,
    distanceToEdge: Math.abs(distanceToCenter - radius),
  };
}

/**
 * Formats relative timestamp
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 3) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}
