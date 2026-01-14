const express = require('express');
const path = require('path');
const fs = require('fs')  // file system
const bodyParser = require('body-parser');
const db = require('./src/db/db');
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');

const indexRoutes = require('./src/routes/index.routes.js');
const datatableRoutes = require('./src/routes/datatable.routes.js');
const APIroutes = require('./src/routes/api.routes.js');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: '9f8d7a6c5b4a3e2d1f0e9d8c7b6a5f4e',
  baseURL: 'http://localhost:5000',
  clientID: 'VS3l9ANBnUDtVONkLgamy963mqjUemrx',
  issuerBaseURL: 'https://national-parks.eu.auth0.com'
};

const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'src/views'));  // source folder for views

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

app.use('/index', indexRoutes);
app.use('/datatable', datatableRoutes);
app.use('/api', APIroutes);

// req.isAuthenticated is provided from the auth router
app.get('/', (req, res) => {
  res.redirect('/index');
});

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.use((req, res) => {
    res.status(404).json({
        status: 'Not found',
        message: 'endpoint not found',
        response: null
    });
});

const PORT = process.env.PORT ||5000;
app.listen(PORT, async () => {
  try {
    // Optional: test the connection once at startup
    await db.query('SELECT NOW()');
    console.log('Connected to database');
  } catch (err) {
    console.error('Database connection error:', err);
  }
  console.log(
  `Server started on port ${PORT}`)
});
