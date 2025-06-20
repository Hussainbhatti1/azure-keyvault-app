if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const session = require('express-session');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage (simulate DB)
const messages = [];
const products = [
  { id: 1, name: "Product A", description: "Desc A", price: "$10" },
  { id: 2, name: "Product B", description: "Desc B", price: "$20" },
];

// Mock user (for login)
const USER = {
  username: 'admin',
  password: 'password123'
};

// Azure Key Vault Setup
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

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: 'your_secret_key', // Ideally from process.env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true only if using HTTPS
}));

// Helper middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    keyVault: client ? 'connected' : 'not connected'
  });
});

// Home Page
app.get('/', async (req, res) => {
  try {
    if (!client) throw new Error('Key Vault client not initialized');
    const secret = await client.getSecret('DB-Connection-String');
    res.render('index', {
      secret: secret.value,
      environment: process.env.NODE_ENV || 'development',
      error: null,
      loggedIn: req.session.loggedIn || false
    });
  } catch (err) {
    res.render('index', {
      secret: null,
      environment: process.env.NODE_ENV || 'development',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to retrieve secret',
      loggedIn: req.session.loggedIn || false
    });
  }
});

// Browse Products
app.get('/browse', (req, res) => {
  res.render('browse', { products, loggedIn: req.session.loggedIn || false });
});

// Product Details Page
app.get('/details/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).send("Product not found");
  res.render('product', { product, loggedIn: req.session.loggedIn || false });
});

// Show Submitted Form Messages
app.get('/form', (req, res) => {
  res.render('messages', { messages, loggedIn: req.session.loggedIn || false });
});

// Handle Form Submission
app.post('/form-submit', (req, res) => {
  const { name, email, message } = req.body;
  messages.push({ name, email, message });
  res.redirect('/form');
});

// Show Add Product Page (Protected)
app.get('/add-product', requireLogin, (req, res) => {
  res.render('add-product', { loggedIn: true });
});

// Handle Product Submission (Protected)
app.post('/add-product', requireLogin, (req, res) => {
  const { name, description, price } = req.body;
  const newProduct = {
    id: products.length + 1,
    name,
    description,
    price
  };
  products.push(newProduct);
  res.redirect('/browse');
});

// Show Login Form
app.get('/login', (req, res) => {
  res.render('login', { error: null, loggedIn: false });
});

// Handle Login Submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === USER.username && password === USER.password) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password', loggedIn: false });
  }
});

// Handle Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send('Logout failed');
    }
    res.redirect('/');
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
