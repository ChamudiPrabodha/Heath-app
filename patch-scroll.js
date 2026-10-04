const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, 'src/screens/auth');

if (fs.existsSync(authDir)) {
  const files = fs.readdirSync(authDir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(authDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Ensure Platform is imported
      if (!content.includes('Platform,')) {
        content = content.replace("from 'react-native';", "Platform, from 'react-native';").replace(", from", ", ");
      }

      // Replace showsVerticalScrollIndicator={false}
      const newContent = content.replace(/showsVerticalScrollIndicator=\{false\}/g, "showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}");
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Patched ${file}`);
      }
    }
  });
}
