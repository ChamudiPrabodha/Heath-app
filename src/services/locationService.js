// src/services/locationService.js - Real GPS Tracking & Realistic Route Simulator
import * as Location from 'expo-location';
import { getBatteryStatus } from './batteryService';

let locationSubscription = null;
let simulationInterval = null;

// Default initial location if GPS is unavailable (e.g. Colombo / Central City)
export const DEFAULT_COORDS = {
  latitude: 6.9271,
  longitude: 79.8612,
  speed: 0,
  heading: 0,
  accuracy: 10,
  altitude: 12,
};

/**
 * Request GPS Permissions
 */
export async function requestLocationPermissions() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
}

/**
 * Get current single GPS location snapshot
 */
export async function getCurrentLocation() {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      return { ...DEFAULT_COORDS, permissionGranted: false };
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const battery = await getBatteryStatus();

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: Math.max(0, loc.coords.speed || 0),
      heading: loc.coords.heading || 0,
      accuracy: loc.coords.accuracy || 8,
      altitude: loc.coords.altitude || 10,
      batteryLevel: battery.batteryLevel,
      isCharging: battery.isCharging,
      timestamp: Date.now(),
      isSimulated: false,
      permissionGranted: true,
    };
  } catch (err) {
    console.warn('Fallback to default location:', err.message);
    const battery = await getBatteryStatus();
    return {
      ...DEFAULT_COORDS,
      batteryLevel: battery.batteryLevel,
      isCharging: battery.isCharging,
      timestamp: Date.now(),
      isSimulated: false,
      permissionGranted: false,
    };
  }
}

/**
 * Start watching real GPS location updates
 */
export async function startRealLocationTracking(onUpdate, onError) {
  try {
    stopAllTracking();

    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      if (onError) onError('Location permission denied. Please enable GPS in settings.');
      return false;
    }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 2, // notify every 2 meters
      },
      async (loc) => {
        const battery = await getBatteryStatus();
        const payload = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: Math.max(0, loc.coords.speed || 0),
          heading: loc.coords.heading != null && loc.coords.heading >= 0 ? loc.coords.heading : 0,
          accuracy: loc.coords.accuracy || 5,
          altitude: loc.coords.altitude || 10,
          batteryLevel: battery.batteryLevel,
          isCharging: battery.isCharging,
          timestamp: Date.now(),
          isSimulated: false,
        };
        onUpdate(payload);
      }
    );
    return true;
  } catch (err) {
    console.error('Error starting GPS tracking:', err);
    if (onError) onError(err.message);
    return false;
  }
}

/**
 * Realistic GPS Movement Simulator
 * Creates smooth street-like walking movement around an anchor point
 */
export function startSimulatedLocationTracking(anchorLocation, onUpdate) {
  stopAllTracking();

  const startLat = anchorLocation?.latitude || DEFAULT_COORDS.latitude;
  const startLng = anchorLocation?.longitude || DEFAULT_COORDS.longitude;

  // Generate realistic route offsets (simulating turns, straight walks, pausing at intersection)
  const routeWaypoints = [
    { dLat: 0.0000, dLng: 0.0000, targetSpeed: 1.2 }, // starting point
    { dLat: 0.0008, dLng: 0.0003, targetSpeed: 1.4 }, // walking north-east along street
    { dLat: 0.0017, dLng: 0.0007, targetSpeed: 1.5 },
    { dLat: 0.0024, dLng: 0.0013, targetSpeed: 1.3 }, // cross street
    { dLat: 0.0025, dLng: 0.0022, targetSpeed: 0.0 }, // paused at signal / shop
    { dLat: 0.0025, dLng: 0.0033, targetSpeed: 1.6 }, // turned east
    { dLat: 0.0021, dLng: 0.0044, targetSpeed: 1.4 }, // walking towards park
    { dLat: 0.0012, dLng: 0.0048, targetSpeed: 1.3 }, // turning south
    { dLat: 0.0003, dLng: 0.0045, targetSpeed: 1.5 },
    { dLat: -0.0005, dLng: 0.0037, targetSpeed: 1.2 },
    { dLat: -0.0008, dLng: 0.0025, targetSpeed: 1.3 }, // heading back
    { dLat: -0.0004, dLng: 0.0012, targetSpeed: 1.4 },
    { dLat: 0.0000, dLng: 0.0000, targetSpeed: 1.2 }, // loop back
  ];

  let currentWaypointIndex = 0;
  let progressBetweenWaypoints = 0;
  const stepsPerSegment = 5; // smooth interpolation steps
  let simulatedBattery = 92;

  // Send initial point
  onUpdate({
    latitude: startLat,
    longitude: startLng,
    speed: 1.2,
    heading: 35,
    accuracy: 6,
    altitude: 14,
    batteryLevel: simulatedBattery,
    isCharging: false,
    timestamp: Date.now(),
    isSimulated: true,
  });

  simulationInterval = setInterval(() => {
    progressBetweenWaypoints += 1 / stepsPerSegment;

    if (progressBetweenWaypoints >= 1) {
      progressBetweenWaypoints = 0;
      currentWaypointIndex = (currentWaypointIndex + 1) % (routeWaypoints.length - 1);
    }

    const p1 = routeWaypoints[currentWaypointIndex];
    const p2 = routeWaypoints[currentWaypointIndex + 1] || routeWaypoints[0];

    const currentDLat = p1.dLat + (p2.dLat - p1.dLat) * progressBetweenWaypoints;
    const currentDLng = p1.dLng + (p2.dLng - p1.dLng) * progressBetweenWaypoints;

    // Calculate heading angle
    const deltaY = (p2.dLat - p1.dLat);
    const deltaX = (p2.dLng - p1.dLng);
    let headingDegrees = Math.round((Math.atan2(deltaX, deltaY) * 180) / Math.PI);
    if (headingDegrees < 0) headingDegrees += 360;

    const interpolatedSpeed = p1.targetSpeed + (p2.targetSpeed - p1.targetSpeed) * progressBetweenWaypoints;
    const jitteredAccuracy = 4 + Math.round(Math.random() * 4);

    // Slowly drain 1% battery occasionally
    if (Math.random() < 0.05 && simulatedBattery > 15) {
      simulatedBattery -= 1;
    }

    const payload = {
      latitude: Number((startLat + currentDLat).toFixed(6)),
      longitude: Number((startLng + currentDLng).toFixed(6)),
      speed: Number(interpolatedSpeed.toFixed(1)),
      heading: headingDegrees,
      accuracy: jitteredAccuracy,
      altitude: 14 + Math.round(Math.random() * 2),
      batteryLevel: simulatedBattery,
      isCharging: false,
      timestamp: Date.now(),
      isSimulated: true,
    };

    onUpdate(payload);
  }, 2000);

  return true;
}

/**
 * Stop any active tracking (real or simulated)
 */
export function stopAllTracking() {
  if (locationSubscription) {
    try {
      locationSubscription.remove();
    } catch (e) {}
    locationSubscription = null;
  }
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}
