const express = require('express');
const path = require('path');
const fs = require('fs')  // file system
const bodyParser = require('body-parser');
const db = require('./src/db/db');

const indexRoutes = require('./src/routes/index.routes.js');
const datatableRoutes = require('./src/routes/datatable.routes.js');
const APIroutes = require('./src/routes/api.routes.js');

const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'src/views'));  // source folder for views

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

app.use('/index', indexRoutes);
app.use('/datatable', datatableRoutes);
app.use('/api', APIroutes);

app.get('/', (req, res) => { 
    res.redirect('index');
})

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
