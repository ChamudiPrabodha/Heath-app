// src/components/OpenStreetMap.js - Interactive Leaflet OpenStreetMap with Live Pulsating Marker
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function OpenStreetMap({
  patientLocation,
  caregiverLocation,
  safeZone,
  autoFollow = true,
  showTrail = true,
  mapTheme = 'standard', // 'standard' | 'voyager' | 'dark'
  style,
  onMapReady,
}) {
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);

  const initialLat = patientLocation?.latitude || caregiverLocation?.latitude || 6.9271;
  const initialLng = patientLocation?.longitude || caregiverLocation?.longitude || 79.8612;

  // Generate Leaflet HTML
  const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #map {
      width: 100%;
      height: 100%;
    }

    /* WhatsApp-Style Pulsating Live Radar Marker */
    .patient-marker-container {
      position: relative;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.35);
      border: 2px solid #10B981;
      animation: pulseRadar 2s infinite ease-out;
      pointer-events: none;
    }

    .radar-pulse-outer {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      animation: pulseRadarOuter 2s infinite ease-out 0.6s;
      pointer-events: none;
    }

    @keyframes pulseRadar {
      0% {
        transform: scale(0.6);
        opacity: 0.9;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.4;
      }
      100% {
        transform: scale(1.9);
        opacity: 0;
      }
    }

    @keyframes pulseRadarOuter {
      0% {
        transform: scale(0.5);
        opacity: 0.8;
      }
      100% {
        transform: scale(1.8);
        opacity: 0;
      }
    }

    .avatar-disc {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #10B981;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 13px;
      z-index: 10;
    }

    .heading-pointer {
      position: absolute;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 12px solid #059669;
      top: -9px;
      left: calc(50% - 6px);
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
      transition: transform 0.3s ease;
      z-index: 12;
    }

    .speed-badge {
      position: absolute;
      bottom: -12px;
      background: #111827;
      color: #34D399;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 15;
    }

    /* Caregiver Pin Marker */
    .caregiver-marker-container {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .caregiver-disc {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3B82F6;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 800;
    }

    /* Accuracy Circle */
    .leaflet-container {
      touch-action: pan-x pan-y;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map;
    var patientMarker = null;
    var caregiverMarker = null;
    var accuracyCircle = null;
    var patientTrail = null;
    var safeZoneCircle = null;
    var trailCoords = [];
    var autoFollowEnabled = ${autoFollow ? 'true' : 'false'};

    // Map Tile Layer Options
    var tileUrls = {
      standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    };

    var currentTheme = '${mapTheme}' || 'voyager';
    var tileUrl = tileUrls[currentTheme] || tileUrls.voyager;

    // Initialize Map
    map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${initialLat}, ${initialLng}], 16);

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Breadcrumb Trail Polyline
    patientTrail = L.polyline([], {
      color: '#10B981',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: null
    }).addTo(map);

    // Create Patient Custom Marker
    function createPatientIcon(speedText, headingDeg) {
      return L.divIcon({
        className: 'custom-patient-icon',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        html: '<div class="patient-marker-container">' +
              '  <div class="radar-pulse"></div>' +
              '  <div class="radar-pulse-outer"></div>' +
              '  <div class="heading-pointer" style="transform: rotate(' + (headingDeg || 0) + 'deg); transform-origin: 50% 25px;"></div>' +
              '  <div class="avatar-disc">P</div>' +
              (speedText ? '  <div class="speed-badge">' + speedText + '</div>' : '') +
              '</div>'
      });
    }

    // Create Caregiver Marker
    function createCaregiverIcon() {
      return L.divIcon({
        className: 'custom-caregiver-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: '<div class="caregiver-marker-container">' +
              '  <div class="caregiver-disc">YOU</div>' +
              '</div>'
      });
    }

    // Function to update patient location smoothly
    window.updatePatientLocation = function(lat, lng, heading, speedKmh, accuracy, isSimulated) {
      if (lat == null || lng == null) return;
      var latLng = [lat, lng];

      var speedDisplay = speedKmh ? speedKmh + ' km/h' : '';

      if (!patientMarker) {
        patientMarker = L.marker(latLng, {
          icon: createPatientIcon(speedDisplay, heading),
          zIndexOffset: 1000
        }).addTo(map);
      } else {
        patientMarker.setLatLng(latLng);
        patientMarker.setIcon(createPatientIcon(speedDisplay, heading));
      }

      // Update Accuracy circle
      if (accuracy && accuracy > 0) {
        if (!accuracyCircle) {
          accuracyCircle = L.circle(latLng, {
            radius: accuracy,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.08,
            weight: 1
          }).addTo(map);
        } else {
          accuracyCircle.setLatLng(latLng);
          accuracyCircle.setRadius(accuracy);
        }
      }

      // Append to Trail
      trailCoords.push(latLng);
      // Keep last 150 points
      if (trailCoords.length > 150) trailCoords.shift();
      patientTrail.setLatLngs(trailCoords);

      // Auto-follow if enabled
      if (autoFollowEnabled) {
        map.panTo(latLng, { animate: true, duration: 0.7 });
      }
    };

    // Update Caregiver location
    window.updateCaregiverLocation = function(lat, lng) {
      if (lat == null || lng == null) return;
      var latLng = [lat, lng];
      if (!caregiverMarker) {
        caregiverMarker = L.marker(latLng, {
          icon: createCaregiverIcon(),
          zIndexOffset: 900
        }).addTo(map);
      } else {
        caregiverMarker.setLatLng(latLng);
      }
    };

    // Update Safe Zone Geofence
    window.updateSafeZone = function(lat, lng, radiusMeters, isBreached) {
      if (lat == null || lng == null || !radiusMeters) {
        if (safeZoneCircle) {
          map.removeLayer(safeZoneCircle);
          safeZoneCircle = null;
        }
        return;
      }

      var strokeColor = isBreached ? '#EF4444' : '#10B981';
      var fillColor = isBreached ? '#FCA5A5' : '#D1FAE5';

      if (!safeZoneCircle) {
        safeZoneCircle = L.circle([lat, lng], {
          radius: radiusMeters,
          color: strokeColor,
          fillColor: fillColor,
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '4, 6'
        }).addTo(map);
      } else {
        safeZoneCircle.setLatLng([lat, lng]);
        safeZoneCircle.setRadius(radiusMeters);
        safeZoneCircle.setStyle({
          color: strokeColor,
          fillColor: fillColor
        });
      }
    };

    // Set Auto Follow
    window.setAutoFollow = function(enabled) {
      autoFollowEnabled = enabled;
      if (enabled && patientMarker) {
        map.panTo(patientMarker.getLatLng(), { animate: true });
      }
    };

    // Center on Patient
    window.centerOnPatient = function() {
      if (patientMarker) {
        map.setView(patientMarker.getLatLng(), 17, { animate: true });
      }
    };

    // Fit both markers on screen
    window.fitBothMarkers = function() {
      if (patientMarker && caregiverMarker) {
        var group = L.featureGroup([patientMarker, caregiverMarker]);
        map.fitBounds(group.getBounds().pad(0.35), { animate: true });
      } else if (patientMarker) {
        map.setView(patientMarker.getLatLng(), 16);
      }
    };

    // Zoom Controls
    window.zoomIn = function() { map.zoomIn(); };
    window.zoomOut = function() { map.zoomOut(); };

    // Initial setup if props available
    ${patientLocation ? `
      updatePatientLocation(
        ${patientLocation.latitude},
        ${patientLocation.longitude},
        ${patientLocation.heading || 0},
        ${patientLocation.speed ? (patientLocation.speed * 3.6).toFixed(1) : '0'},
        ${patientLocation.accuracy || 10},
        ${patientLocation.isSimulated ? 'true' : 'false'}
      );
    ` : ''}

    ${caregiverLocation ? `
      updateCaregiverLocation(${caregiverLocation.latitude}, ${caregiverLocation.longitude});
    ` : ''}

    ${safeZone ? `
      updateSafeZone(${safeZone.lat}, ${safeZone.lng}, ${safeZone.radiusMeters || 500}, false);
    ` : ''}

    // Notify React Native that Map is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
    } else {
      window.parent.postMessage(JSON.stringify({ type: 'MAP_READY' }), '*');
    }
  </script>
</body>
</html>
  `;

  // Inject real-time patient location update whenever prop changes
  useEffect(() => {
    if (!patientLocation?.latitude || !patientLocation?.longitude) return;

    const speedKmh = patientLocation.speed ? (patientLocation.speed * 3.6).toFixed(1) : '0';
    const js = `
      if (window.updatePatientLocation) {
        window.updatePatientLocation(
          ${patientLocation.latitude},
          ${patientLocation.longitude},
          ${patientLocation.heading || 0},
          ${speedKmh},
          ${patientLocation.accuracy || 10},
          ${patientLocation.isSimulated ? 'true' : 'false'}
        );
      }
      true;
    `;

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.eval(js);
      } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  }, [
    patientLocation?.latitude,
    patientLocation?.longitude,
    patientLocation?.heading,
    patientLocation?.speed,
    patientLocation?.accuracy,
  ]);

  // Inject Caregiver location update
  useEffect(() => {
    if (!caregiverLocation?.latitude || !caregiverLocation?.longitude) return;

    const js = `
      if (window.updateCaregiverLocation) {
        window.updateCaregiverLocation(${caregiverLocation.latitude}, ${caregiverLocation.longitude});
      }
      true;
    `;

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.eval(js);
      } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  }, [caregiverLocation?.latitude, caregiverLocation?.longitude]);

  // Inject Safe Zone update
  useEffect(() => {
    const js = `
      if (window.updateSafeZone) {
        ${safeZone ? `window.updateSafeZone(${safeZone.lat}, ${safeZone.lng}, ${safeZone.radiusMeters || 500}, ${safeZone.isBreached ? 'true' : 'false'});` : `window.updateSafeZone(null, null, null, false);`}
      }
      true;
    `;

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.eval(js);
      } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  }, [safeZone?.lat, safeZone?.lng, safeZone?.radiusMeters, safeZone?.isBreached]);

  // Inject auto-follow update
  useEffect(() => {
    const js = `if (window.setAutoFollow) { window.setAutoFollow(${autoFollow ? 'true' : 'false'}); } true;`;
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.eval(js);
      } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  }, [autoFollow]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY' && onMapReady) {
        onMapReady();
      }
    } catch (e) {}
  };

  // Imperative map methods accessible via ref if needed
  const centerOnPatient = () => {
    const js = `if (window.centerOnPatient) window.centerOnPatient(); true;`;
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try { iframeRef.current.contentWindow.eval(js); } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  const fitBoth = () => {
    const js = `if (window.fitBothMarkers) window.fitBothMarkers(); true;`;
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try { iframeRef.current.contentWindow.eval(js); } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          ref={iframeRef}
          srcDoc={leafletHTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="OpenStreetMap Live Tracking"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: leafletHTML }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
