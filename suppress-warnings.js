/* eslint-env node */
const fs = require('fs');
const path = require('path');

const files = [
  'src/services/patientManagementService.js',
  'src/services/authService.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace console.warn('Backend...') with console.log so it doesn't trigger yellow box
    content = content.replace(/console\.warn\('Backend/g, "console.log('Backend");
    fs.writeFileSync(filePath, content);
    console.log(`Patched ${file}`);
  }
});
