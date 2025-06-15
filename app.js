require('dotenv').config();
const express = require('express');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const port = process.env.PORT || 3000;

// Azure Key Vault Setup
const vaultName = process.env.KEY_VAULT_NAME;
const vaultUrl = `https://${vaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

// Middleware and Static Files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/', async (req, res) => {
  try {
    const secret = await client.getSecret('DB-Connection-String');
    res.render('index', { secret: secret.value });
  } catch (err) {
    console.error('Error accessing secret:', err.message);
    res.render('index', { secret: 'Error retrieving secret' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
