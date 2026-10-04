const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens/auth');

['PatientSignUpScreen.js', 'CaregiverSignUpScreen.js', 'DoctorSignUpScreen.js'].forEach(file => {
  const filePath = path.join(screensDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to extract the Modern Logo block
  const logoMatch = content.match(/(\s*\{\/\* Modern Logo \*\/\}[\s\S]*?<\/View>\s*<\/View>\s*)/);
  
  if (logoMatch && logoMatch[1]) {
    const logoBlock = logoMatch[1];
    
    // Check if it's already inside ScrollView
    // If it's right after KeyboardAvoidingView, it's outside.
    const isOutside = content.indexOf(logoBlock) < content.indexOf('<ScrollView');
    
    if (isOutside) {
      // Remove logo from its current place
      content = content.replace(logoBlock, '');
      
      // Inject logo right after the header navigation block inside ScrollView
      // The header navigation block ends with: </TouchableOpacity>\s*<\/View>
      content = content.replace(/(<\/TouchableOpacity>\s*<\/View>\s*)/, `$1${logoBlock}`);
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed logo placement in ${file}`);
    }
  }
});
