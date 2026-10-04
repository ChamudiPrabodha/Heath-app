# 📍 HealthTrack: Real-Time Patient & Caregiver Live Location Tracking

A comprehensive mobile healthcare platform built with **React Native**, **Expo SDK 57**, and **OpenStreetMap (Leaflet)** designed for high-precision real-time tracking, similar to **WhatsApp Live Location**. Optimized for **Expo Go** deployment on Android, iOS, and Web.

---

## 🛡️ Multi-Patient Caregiver Command Center (`CaregiverDashboardScreen.js`)

When a caregiver signs in, they land directly on their **Caregiver Dashboard**:
* **Multi-Patient Roster Management**:
  * Manage multiple patients simultaneously, each identified by a **Unique Identification Number** (`CARE-XXXX`).
  * Live status tags (*LIVE NOW* with pulsating green radar dot, *IDLE*, *WANDERING*).
  * Real-time battery indicator and condition overview.
* **Add Customer / New Patient (`AddPatientModal.js`)**:
  * Register new patients with auto-generated or custom Unique Patient IDs.
  * Define medical condition, age, emergency contact, and initial safe zone radius.
* **Individual Live Tracking (`CaregiverScreen.js`)**:
  * Select any patient to track on the interactive OpenStreetMap live radar with full auto-follow, heading indicator, and trajectory trail.
  * Includes top navigation bar (`← Back to Dashboard`) to return to the roster anytime.
* **Assign Medication Plan (`AssignMedicationModal.js`)**:
  * Caregiver can assign, schedule, and remove prescriptions (Medicine name, dosage, time, and instructions) for each patient individually.
* **Assign Daily Activities (`AssignActivitiesModal.js`)**:
  * Schedule daily routines and habits (Physical walks, Brain memory puzzles, Hydration checks, Rest).
* **Emergency Distress Notifications (`EmergencyAlertsModal.js`)**:
  * Displays all patient emergency SOS triggers and geofence perimeter breach logs with timestamp, coordinates, and 1-tap "View on Live Map" and "Call" actions.
* **My Account (`CaregiverAccountModal.js`)**:
  * Caregiver profile overview, monitored patient counter, and customizable alert preferences (SOS siren sound, wander push alerts).
* **Contact Support Hub (`ContactSupportModal.js`)**:
  * 24/7 Clinical Emergency Line (`1-800-555-CARE`).
  * Technical support email and emergency wander protocol guides.
  * Direct support ticket submission.

---

## 👤 Patient Interface (`PatientDashboardScreen.js`)

* **Personalized Greeting**: Dynamic time-of-day greeting displaying the patient's signup name.
* **Live Clock & Calendar Date**: Real-time ticking digital clock and full calendar date.
* **Emergency SOS Button**: Large red distress button that broadcasts emergency alerts with GPS coordinates.
* **Feature Grid**:
  1. 📍 **Location Share**: Directly opens WhatsApp-style live location broadcaster (`PatientScreen.js`).
  2. 💊 **Medication Plan**: Daily schedule and pill-taking checklist.
  3. 📞 **Contacts**: Quick-dial directory for caregiver, doctor, and emergency hotline.
  4. 👤 **Profile**: Patient medical identity card and pairing info.
  5. 💓 **Vitals**: Heart Rate (72 BPM), Blood Pressure (120/80), SpO2 (98%), Steps, and Sleep.
  6. 🧩 **Cognitive Activities**: Playable memory match card game.
  7. 🏃 **My Activities**: Daily routine checklist and interactive water glass hydration counter.

---

## 🔐 Dedicated Authentication (Email & Password)

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@healthtrack.com` | `patient123` | Eleanor Vance (Unique ID: `CARE-1001`) |
| **Caregiver** | `caregiver@healthtrack.com` | `caregiver123` | Sarah Vance (Monitors multiple patients) |

*(Use the **"Auto-Fill Demo"** button on either login screen to populate these credentials in 1 tap).*

---

## 🚀 Quick Start Guide

### Step 1: Start the Real-Time Relay Server
In your terminal, run:
```bash
npm run server
```
This starts the WebSocket server on port `4000`:
```
======================================================
🚀 Live Location Relay Server Running on Port 4000
======================================================
Local Access:   ws://localhost:4000
Mobile Access:  ws://172.18.150.21:4000 (Wi-Fi)
======================================================
```

### Step 2: Start the Expo Development Server
In another terminal, run:
```bash
npx expo start
```
- **Android**: Open the **Expo Go** app and scan the QR code.
- **iOS**: Scan the QR code using the Camera app.
- **Web**: Press `w` in the terminal to open in your browser.

---

## 📂 Project Structure

```
├── App.js                                          # Navigation, authentication gateway & role routing
├── server.js                                       # Node.js WebSocket relay server
├── app.json                                        # Expo config, plugins & location permissions
├── src/
│   ├── screens/
│   │   ├── auth/                                   # Authentication portal & 4 separate sign in/up screens
│   │   │   ├── AuthGatewayScreen.js
│   │   │   ├── PatientLoginScreen.js
│   │   │   ├── PatientSignUpScreen.js
│   │   │   ├── CaregiverLoginScreen.js
│   │   │   └── CaregiverSignUpScreen.js
│   │   ├── patient/
│   │   │   └── PatientDashboardScreen.js           # Patient post-login home dashboard
│   │   ├── caregiver/
│   │   │   └── CaregiverDashboardScreen.js         # Multi-patient command center & management
│   │   ├── PatientScreen.js                        # WhatsApp-style live location broadcaster
│   │   ├── CaregiverScreen.js                      # Live tracking radar & geofence monitor
│   │   └── DualSplitScreen.js                      # Side-by-side simulator for instant demo
│   ├── components/
│   │   ├── patient/                                # Patient care sheets (Meds, Contacts, Profile, Vitals, Games, Habits)
│   │   └── caregiver/                              # Caregiver tools (Add patient, Assign meds/acts, SOS alerts, Account, Support)
│   └── services/
│       ├── patientManagementService.js             # Multi-patient storage, medications, activities & alert logs
│       ├── authService.js                          # Email auth & session persistence
│       ├── locationService.js                      # Real GPS tracking & route movement simulator
│       ├── syncService.js                          # WebSocket & local event bus synchronization
│       ├── batteryService.js                       # Battery status reader
│       └── geoUtils.js                             # Distance, ETA, compass, geofence math
```
