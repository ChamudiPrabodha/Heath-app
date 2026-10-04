const fs = require('fs');
const path = require('path');

const pmsFile = path.join(__dirname, 'src/services/patientManagementService.js');
let code = fs.readFileSync(pmsFile, 'utf8');

// 1. addCaregiverPatient
code = code.replace(
`  patients.push(newPatient);
  await saveCaregiverPatients(patients);

  return newPatient;
}`,
`  try {
    const res = await fetch(\`\${getApiBaseUrl()}/patients\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPatient)
    });
    if (res.ok) {
      const savedPatient = await res.json();
      patients.push(savedPatient);
      await saveCaregiverPatients(patients);
      return savedPatient;
    }
  } catch (err) {
    console.warn('Backend add failed, saving locally', err);
  }

  patients.push(newPatient);
  await saveCaregiverPatients(patients);
  return newPatient;
}`);

// 2. updateCaregiverPatient
code = code.replace(
`  await saveCaregiverPatients(patients);
  return patients[idx];
}`,
`  try {
    const res = await fetch(\`\${getApiBaseUrl()}/patients/\${patientId}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patients[idx])
    });
    if (res.ok) {
       patients[idx] = await res.json();
    }
  } catch (err) {
    console.warn('Backend update failed, saving locally', err);
  }

  await saveCaregiverPatients(patients);
  return patients[idx];
}`);

// 3. getCaregiverAlerts
code = code.replace(
`export async function getCaregiverAlerts() {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_ALERTS_KEY);`,
`export async function getCaregiverAlerts() {
  try {
    const res = await fetch(\`\${getApiBaseUrl()}/alerts\`);
    if (res.ok) {
      const data = await res.json();
      await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend alerts fetch failed, falling back to local', err);
  }

  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_ALERTS_KEY);`);

// 4. logEmergencyAlert
code = code.replace(
`  alerts.unshift(newAlert);
  try {
    await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Failed to log alert', e);
  }
  return newAlert;
}`,
`  try {
    const res = await fetch(\`\${getApiBaseUrl()}/alerts\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert)
    });
    if (res.ok) {
       const saved = await res.json();
       alerts.unshift(saved);
       await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(alerts));
       return saved;
    }
  } catch (err) {
    console.warn('Backend alert post failed, saving locally', err);
  }

  alerts.unshift(newAlert);
  try {
    await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Failed to log alert', e);
  }
  return newAlert;
}`);

// 5. markAlertsRead
code = code.replace(
`export async function markAlertsRead() {
  try {
    const alerts = await getCaregiverAlerts();`,
`export async function markAlertsRead() {
  try {
    const res = await fetch(\`\${getApiBaseUrl()}/alerts/mark-read\`, { method: 'POST' });
    if (res.ok) {
       // Proceed to update local
    }
  } catch (err) {
    console.warn('Backend mark read failed', err);
  }

  try {
    const alerts = await getCaregiverAlerts();`);

fs.writeFileSync(pmsFile, code);
console.log('patientManagementService.js updated');
