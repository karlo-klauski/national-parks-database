const express = require('express');
const path = require('path');
const fs = require('fs')  // file system
const bodyParser = require('body-parser');
const db = require('./src/db/db');

const indexRoutes = require('./src/routes/index.routes.js');
const datatableRoutes = require('./src/routes/datatable.routes.js');
const lab3routes = require('./src/routes/lab3.routes.js');

const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'src/views'));  // source folder for views

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/index', indexRoutes);
app.use('/datatable', datatableRoutes);
app.use('/', lab3routes);

app.get('/', (req, res) => { 
    res.redirect('index');
})

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
