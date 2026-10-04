const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, 'src/services/authService.js');
let code = fs.readFileSync(authFile, 'utf8');

// 1. Add getApiBaseUrl at the top
code = code.replace(
`import AsyncStorage from '@react-native-async-storage/async-storage';`,
`import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiBaseUrl = () => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';
  return 'http://localhost:4000/api';
};`);

// 2. Patch loginUnified
code = code.replace(
`export async function loginUnified(email, password) {
  const users = await getUsers();`,
`export async function loginUnified(email, password) {
  try {
    const res = await fetch(\`\${getApiBaseUrl()}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: email, password })
    });
    if (res.ok) {
      const user = await res.json();
      await setCurrentUser(user);
      return user;
    }
  } catch(e) {
    console.warn('Backend login failed, falling back to local Auth', e);
  }

  const users = await getUsers();`);

fs.writeFileSync(authFile, code);
console.log('authService.js updated');
