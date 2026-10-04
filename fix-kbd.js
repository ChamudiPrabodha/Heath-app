const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens/auth');

['PatientSignUpScreen.js', 'CaregiverSignUpScreen.js', 'DoctorSignUpScreen.js'].forEach(file => {
  const filePath = path.join(screensDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the butchered KeyboardAvoidingView tag
  content = content.replace(/behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}\r?\n\s*><\/View>/, "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}\n    >");

  // Ensure there's exactly one </KeyboardAvoidingView> closing tag at the end (before </LinearGradient>)
  // The end currently looks like:
  // </ScrollView>
  // </KeyboardAvoidingView>
  // </LinearGradient>
  // So it should be fine if we just fix the opening tag.

  fs.writeFileSync(filePath, content);
});
