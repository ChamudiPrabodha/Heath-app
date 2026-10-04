const fs = require('fs');
const path = require('path');

const filesToFix = [
  { file: 'src/components/caregiver/AddPatientModal.js', rules: [{ line: 82, search: "Patient's", replace: "Patient&apos;s" }, { line: 115, search: "patient's", replace: "patient&apos;s" }, { line: 128, search: "You'll", replace: "You&apos;ll" }] },
  { file: 'src/components/caregiver/AssignActivitiesModal.js', rules: [{ line: 189, search: '"', replace: "&quot;", global: true }] },
  { file: 'src/components/caregiver/AssignMedicationModal.js', rules: [{ line: 185, search: '"', replace: "&quot;", global: true }] },
  { file: 'src/components/doctor/ConnectPatientModal.js', rules: [{ line: 49, search: "patient's", replace: "patient&apos;s" }, { line: 54, search: "You'll", replace: "You&apos;ll" }] },
  { file: 'src/components/patient/DailyActivitiesModal.js', rules: [{ line: 147, search: "You've", replace: "You&apos;ve" }] },
  { file: 'src/screens/auth/CaregiverSignUpScreen.js', rules: [{ line: 134, search: "patient's", replace: "patient&apos;s" }, { line: 146, search: "you're", replace: "you&apos;re" }] }
];

filesToFix.forEach(({ file, rules }) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    rules.forEach(rule => {
      if (lines[rule.line - 1]) {
        if (rule.global) {
            // For quotes, let's just replace the specific text in quotes
            // Without seeing the line it's hard, let's just replace all " with &quot; on that line only if it's inside text.
            // Since I don't know the exact text, I'll replace any text like `"{searchQuery}"` or similar.
            // Let's just use string replace.
            lines[rule.line - 1] = lines[rule.line - 1].replace(/"/g, '&quot;');
        } else {
            lines[rule.line - 1] = lines[rule.line - 1].replace(rule.search, rule.replace);
        }
      }
    });
    fs.writeFileSync(fullPath, lines.join('\n'));
    console.log(`Fixed ${file}`);
  }
});
