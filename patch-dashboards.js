const fs = require('fs');
const path = require('path');

function patchScreen(filePath, buttonLabel, iconName = 'people') {
  if (!fs.existsSync(filePath)) return false;
  
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes('ConnectionsModal')) return true; // Already patched
  
  // Add import
  code = code.replace(
    'import {',
    `import ConnectionsModal from '../../components/ConnectionsModal';\nimport {`
  );
  
  // Add state
  const stateRegex = /const \[.+?\] = useState\([^)]*\);/g;
  let lastStateIndex = -1;
  let match;
  while ((match = stateRegex.exec(code)) !== null) {
    lastStateIndex = match.index + match[0].length;
  }
  
  if (lastStateIndex !== -1) {
    const before = code.substring(0, lastStateIndex);
    const after = code.substring(lastStateIndex);
    code = before + `\n  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);` + after;
  }
  
  // Add button to grid/menu
  // Find <View style={styles.grid}> or something similar
  const buttonCode = `
        <TouchableOpacity style={styles.gridCard || styles.actionCard || { padding: 16, backgroundColor: '#E0E7FF', borderRadius: 12, marginVertical: 8, alignItems: 'center' }} onPress={() => setConnectionsModalVisible(true)}>
          <Ionicons name="${iconName}" size={28} color="#3B82F6" />
          <Text style={{ marginTop: 8, fontWeight: '600', color: '#111827' }}>${buttonLabel}</Text>
        </TouchableOpacity>
  `;
  
  // Usually there's a ScrollView or grid
  if (code.includes('<View style={styles.grid}>')) {
    code = code.replace('<View style={styles.grid}>', '<View style={styles.grid}>' + buttonCode);
  } else if (code.includes('<View style={styles.actionGrid}>')) {
    code = code.replace('<View style={styles.actionGrid}>', '<View style={styles.actionGrid}>' + buttonCode);
  } else if (code.includes('<ScrollView')) {
    code = code.replace(/(<ScrollView[^>]*>)/, `$1\n      <View style={{paddingHorizontal: 20}}>` + buttonCode + `</View>`);
  }
  
  // Add modal at the end before </ScrollView> or </SafeAreaView>
  code = code.replace(
    /(\n\s*)(<\/(ScrollView|SafeAreaView|View)>)$/m,
    `$1  <ConnectionsModal visible={connectionsModalVisible} onClose={() => setConnectionsModalVisible(false)} />$1$2`
  );
  // fallback if regex misses
  if (!code.includes('<ConnectionsModal')) {
    code = code.replace('export default', `
// Fallback modal rendering for ${path.basename(filePath)}
// (Make sure to render <ConnectionsModal visible={connectionsModalVisible} onClose={() => setConnectionsModalVisible(false)} /> somewhere in the UI!)
export default`);
  }
  
  fs.writeFileSync(filePath, code);
  return true;
}

patchScreen(path.join(__dirname, 'src/screens/patient/PatientDashboardScreen.js'), 'My Connections', 'people-circle-outline');
patchScreen(path.join(__dirname, 'src/screens/caregiver/CaregiverDashboardScreen.js'), 'Connections & Invites', 'git-network-outline');
patchScreen(path.join(__dirname, 'src/screens/doctor/DoctorDashboardScreen.js'), 'Manage Connections', 'person-add-outline');

console.log('Dashboards patched');
