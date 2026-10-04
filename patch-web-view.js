const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, 'App.js');
let code = fs.readFileSync(appFile, 'utf8');

if (!code.includes('const WebWrapper =')) {
  // Add WebWrapper component
  code = code.replace(
    'export default function App() {',
    `const WebWrapper = ({ children }) => {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={{ flex: 1, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
};

export default function App() {`
  );

  // Wrap loading state
  code = code.replace(
    `if (isAuthChecking) {
    return (
      <View style={styles.loadingContainer}>`,
    `if (isAuthChecking) {
    return (
      <WebWrapper>
        <View style={styles.loadingContainer}>`
  );
  code = code.replace(
    `Initializing Dementia Care 360...</Text>
      </View>
    );`,
    `Initializing Dementia Care 360...</Text>
        </View>
      </WebWrapper>
    );`
  );

  // Wrap auth gate
  code = code.replace(
    `if (!currentUser) {
    return (
      <AuthGatewayScreen`,
    `if (!currentUser) {
    return (
      <WebWrapper>
        <AuthGatewayScreen`
  );
  code = code.replace(
    `onLoginSuccess={handleLoginSuccess}
      />
    );`,
    `onLoginSuccess={handleLoginSuccess}
        />
      </WebWrapper>
    );`
  );

  // Wrap main return
  code = code.replace(
    `return (
    <SafeAreaView style={styles.safeArea}>`,
    `return (
    <WebWrapper>
      <SafeAreaView style={styles.safeArea}>`
  );

  // Since main return ends near bottomNav:
  code = code.replace(
    `</SafeAreaView>
  );
}

const styles =`,
    `</SafeAreaView>
    </WebWrapper>
  );
}

const styles =`
  );
  
  fs.writeFileSync(appFile, code);
  console.log('App.js wrapped with WebWrapper');
} else {
  console.log('App.js already has WebWrapper');
}
