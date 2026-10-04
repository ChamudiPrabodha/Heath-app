const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens/auth');

['PatientSignUpScreen.js', 'CaregiverSignUpScreen.js', 'DoctorSignUpScreen.js'].forEach(file => {
  const filePath = path.join(screensDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Fix stylesheet syntax error
    content = content.replace(/container: \{ flex: 1, \r?\n\s*scrollContent:/, "container: { flex: 1 },\n  scrollContent:");
    fs.writeFileSync(filePath, content);
  }
});

const adminPath = path.join(screensDir, 'AdminSignUpScreen.js');
if (fs.existsSync(adminPath)) {
  let content = fs.readFileSync(adminPath, 'utf8');
  // Fix AdminSignUpScreen replacing </View> with </LinearGradient>
  content = content.replace(/<\/View>\s*<\/LinearGradient>\s*\);\s*\}/, "</LinearGradient>\n  );\n}");
  // Fix stylesheet syntax error
  content = content.replace(/container: \{ flex: 1, \r?\n\s*title:/, "container: { flex: 1 },\n  title:");
  fs.writeFileSync(adminPath, content);
}
