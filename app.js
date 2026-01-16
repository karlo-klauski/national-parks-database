const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const db = require('./src/db/db');
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');
const { stringify } = require('csv-stringify/sync');

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
  res.status(200).json(req.oidc.user);
});

app.get('/refreshCopies', requiresAuth(), async (req, res) => {
  const exportDir = path.join(process.cwd(), 'public');
  fs.mkdirSync(exportDir, { recursive: true });

  // CSV
  const queryResultCSV = await db.query(`SELECT * FROM cumulative`);
  const csv = stringify(queryResultCSV.rows, { header: true });
  const filePathCSV = path.join(exportDir, 'nationalParks.csv');
  fs.writeFileSync(filePathCSV, csv);

  // JSON - TODO
  const query = `
    SELECT json_agg(
      json_build_object(
        'parkID', id,
        'parkName', name,
        'area_km2', area_km2,
        'yearEstablished', yearEstablished,
        'coordinates', coordinates,
        'countryCode', countryCode,
        'countryName', (
          SELECT name
          FROM country
          WHERE country.code = np.countryCode
        ),
        'region', region,
        'species', (
          SELECT json_agg(json_build_object('speciesID', speciesID, 'engName', engName, 'latName', latName))
          FROM species
            JOIN harboursSpecies 
              ON species.id = harboursSpecies.speciesID
          WHERE np.id = harboursSpecies.parkID
        ),
        'website', website
      )
    ) data
    FROM nationalPark np`;
  const queryResultJSON = await db.query(query);
  const data = queryResultJSON.rows[0].data;
  const filePathJSON = path.join(exportDir, 'nationalParks.json');
  fs.writeFileSync(
    filePathJSON,
    JSON.stringify(data),
    'utf8'
  );

  res.redirect('/index');
});

app.use((req, res) => {
  res.status(404).json({
    status: 'Not found',
    message: 'endpoint not found',
    response: null
  });
});

const PORT = process.env.PORT || 5000;
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
