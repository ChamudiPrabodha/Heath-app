const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Add collections to the db object
if (!code.includes('connections: []')) {
    code = code.replace(
        'alerts: [',
        `connections: [],
  invitations: [],
  alerts: [`
    );
}

// Add routes for connections and invitations
const routesToAdd = `
// --- Invitations & Connections API ---
app.get('/api/invitations/:email', (req, res) => {
  const email = req.params.email.toLowerCase();
  const userInvs = db.invitations.filter(inv => inv.toEmail.toLowerCase() === email);
  res.json(userInvs);
});

app.post('/api/invitations', (req, res) => {
  const inv = {
    id: 'inv-' + Date.now(),
    fromName: req.body.fromName,
    fromEmail: req.body.fromEmail,
    fromRole: req.body.fromRole,
    toEmail: req.body.toEmail.toLowerCase(),
    status: 'pending',
    createdAt: Date.now()
  };
  db.invitations.push(inv);
  res.status(201).json(inv);
});

app.put('/api/invitations/:id/respond', (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'
  const invIndex = db.invitations.findIndex(i => i.id === id);
  if (invIndex === -1) return res.status(404).json({ error: 'Not found' });
  
  if (action === 'approve') {
    const inv = db.invitations[invIndex];
    // Create connection
    const conn = {
      id: 'conn-' + Date.now(),
      user1Email: inv.fromEmail,
      user1Name: inv.fromName,
      user1Role: inv.fromRole,
      user2Email: inv.toEmail,
      // The current user approving it
      user2Name: req.body.approverName || inv.toEmail,
      user2Role: req.body.approverRole || 'patient',
      createdAt: Date.now()
    };
    db.connections.push(conn);
    db.invitations.splice(invIndex, 1);
    res.json(conn);
  } else {
    // reject
    db.invitations.splice(invIndex, 1);
    res.json({ success: true, message: 'Rejected' });
  }
});

app.get('/api/connections/:email', (req, res) => {
  const email = req.params.email.toLowerCase();
  const userConns = db.connections.filter(c => 
    c.user1Email.toLowerCase() === email || c.user2Email.toLowerCase() === email
  );
  res.json(userConns);
});

app.delete('/api/connections/:id', (req, res) => {
  const { id } = req.params;
  db.connections = db.connections.filter(c => c.id !== id);
  res.json({ success: true });
});
`;

if (!code.includes('/api/invitations')) {
    code = code.replace(
        'app.get(\'/api/alerts\'',
        routesToAdd + '\\napp.get(\'/api/alerts\''
    );
    fs.writeFileSync(serverFile, code);
    console.log('Backend routes added to server.js');
} else {
    console.log('Backend routes already exist.');
}
