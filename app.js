if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced Azure Key Vault Setup with error handling
let client;
try {
  if (!process.env.KEY_VAULT_NAME) {
    throw new Error('KEY_VAULT_NAME environment variable not set');
  }
  const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
  client = new SecretClient(vaultUrl, new DefaultAzureCredential());
} catch (err) {
  console.error('Key Vault initialization error:', err.message);
}

// Middleware and Static Files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    keyVault: client ? 'connected' : 'not connected'
  });
});

// Main route with improved error handling
app.get('/', async (req, res) => {
  try {
    if (!client) {
      throw new Error('Key Vault client not initialized');
    }
    
    const secret = await client.getSecret('DB-Connection-String');
    res.render('index', { 
      secret: secret.value,
      environment: process.env.NODE_ENV || 'development',
      error: null
    });
  } catch (err) {
    console.error('Error:', err);
    res.render('index', {
      secret: null,
      environment: process.env.NODE_ENV || 'development',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to retrieve secret'
    });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});


module.exports = app;