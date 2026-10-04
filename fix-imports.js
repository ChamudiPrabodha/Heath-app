const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens/auth');

['PatientSignUpScreen.js', 'CaregiverSignUpScreen.js', 'DoctorSignUpScreen.js', 'AdminSignUpScreen.js'].forEach(file => {
  const filePath = path.join(screensDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix import path error
  content = content.replace(/from 'MaterialCommunityIcons, expo\/vector-icons';/, "from '@expo/vector-icons';");
  content = content.replace(/from 'Ionicons, expo\/vector-icons';/, "from '@expo/vector-icons';");
  
  // Ensure Ionicons and MaterialCommunityIcons are imported properly
  if (!content.includes('import {') || !content.includes('Ionicons')) {
    content = content.replace(/import \{([^}]+)\}\s+from\s+'@expo\/vector-icons';/, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim());
      if (!imports.includes('Ionicons')) imports.push('Ionicons');
      if (!imports.includes('MaterialCommunityIcons')) imports.push('MaterialCommunityIcons');
      return `import { ${imports.join(', ')} } from '@expo/vector-icons';`;
    });
  }

  // Admin screen end fix
  if (file === 'AdminSignUpScreen.js') {
    content = content.replace(/<\/LinearGradient>\s*\);\s*\}\s*\);\s*\}/, "</LinearGradient>\n  );\n}");
  }

  fs.writeFileSync(filePath, content);
});
