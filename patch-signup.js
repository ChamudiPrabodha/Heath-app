const fs = require('fs');
const path = require('path');

const configs = {
  'PatientSignUpScreen.js': {
    primaryColor: '#059669',
    secondaryColor: '#10B981',
    bgStart: '#FFFFFF',
    bgMid: '#ECFDF5',
    bgEnd: '#D1FAE5',
    iconColor: '#059669',
    sparkleColor: '#10B981',
    shadowColor: '#10B981',
    borderColor: '#ECFDF5'
  },
  'CaregiverSignUpScreen.js': {
    primaryColor: '#1D4ED8',
    secondaryColor: '#3B82F6',
    bgStart: '#FFFFFF',
    bgMid: '#EFF6FF',
    bgEnd: '#DBEAFE',
    iconColor: '#1D4ED8',
    sparkleColor: '#3B82F6',
    shadowColor: '#3B82F6',
    borderColor: '#EFF6FF'
  },
  'DoctorSignUpScreen.js': {
    primaryColor: '#7E22CE',
    secondaryColor: '#A855F7',
    bgStart: '#FFFFFF',
    bgMid: '#FAF5FF',
    bgEnd: '#F3E8FF',
    iconColor: '#7E22CE',
    sparkleColor: '#A855F7',
    shadowColor: '#A855F7',
    borderColor: '#FAF5FF'
  },
  'AdminSignUpScreen.js': {
    primaryColor: '#DC2626',
    secondaryColor: '#EF4444',
    bgStart: '#FFFFFF',
    bgMid: '#FEF2F2',
    bgEnd: '#FEE2E2',
    iconColor: '#DC2626',
    sparkleColor: '#EF4444',
    shadowColor: '#EF4444',
    borderColor: '#FEF2F2'
  }
};

const screensDir = path.join(__dirname, 'src/screens/auth');

Object.keys(configs).forEach(file => {
  const filePath = path.join(screensDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Add LinearGradient import if missing
  if (!content.includes('LinearGradient')) {
    content = content.replace("from 'react-native';", "from 'react-native';\nimport { LinearGradient } from 'expo-linear-gradient';");
  }

  // Ensure MaterialCommunityIcons and Ionicons are imported
  if (content.includes('@expo/vector-icons')) {
    if (!content.includes('MaterialCommunityIcons')) {
      content = content.replace("@expo/vector-icons';", "MaterialCommunityIcons, @expo/vector-icons';").replace(", @", ", ");
    }
    if (!content.includes('Ionicons')) {
      content = content.replace("@expo/vector-icons';", "Ionicons, @expo/vector-icons';").replace(", @", ", ");
    }
  } else {
    content = content.replace("from 'react-native';", "from 'react-native';\nimport { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';");
  }

  const c = configs[file];

  // Add Logo UI and Gradient
  // Replace <View style={styles.container}> or similar with <LinearGradient colors={[...]} style={styles.container}>
  // We need to match <View style={styles.container}> and also add the logo inside.
  
  const logoUI = `
      {/* Modern Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="brain" size={40} color="${c.iconColor}" />
          <View style={styles.logoSparkle}>
            <Ionicons name="sparkles" size={16} color="${c.sparkleColor}" />
          </View>
        </View>
      </View>
  `;

  // Check if we already applied this
  if (!content.includes('logoBox')) {
    // Replace <View style={styles.container}>
    content = content.replace(
      /<View style=\{styles\.container\}>/,
      `<LinearGradient colors={['${c.bgStart}', '${c.bgMid}', '${c.bgEnd}']} style={styles.container}>\n${logoUI}`
    );

    // Some files might be using <KeyboardAvoidingView> at root instead of <View style={styles.container}>
    // In PatientSignUpScreen, maybe it's <KeyboardAvoidingView>
    if (!content.includes('logoBox')) {
      content = content.replace(
        /<KeyboardAvoidingView[^>]*style=\{styles\.container\}[^>]*>/,
        match => `<LinearGradient colors={['${c.bgStart}', '${c.bgMid}', '${c.bgEnd}']} style={styles.container}>\n${match}\n${logoUI}`
      );
      // need to close LinearGradient at the end
      // replace the last </KeyboardAvoidingView> or </View> with properly nested one.
      content = content.replace(/<\/KeyboardAvoidingView>\s*\);\s*\}/, `</KeyboardAvoidingView>\n    </LinearGradient>\n  );\n}`);
    } else {
      content = content.replace(/<\/View>\s*\);\s*\}/, `</View>\n    </LinearGradient>\n  );\n}`);
    }

    // Add styles for logo
    const logoStyles = `
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '${c.shadowColor}',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '${c.borderColor}',
  },
  logoSparkle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },`;

    content = content.replace(/const styles = StyleSheet\.create\({/, `const styles = StyleSheet.create({\n${logoStyles}`);

    // Remove background color from container style
    content = content.replace(/container: \{([^}]*)backgroundColor:[^,]+,([^}]*)\}/, "container: {$1$2}");

    fs.writeFileSync(filePath, content);
    console.log(`Patched ${file}`);
  }
});
