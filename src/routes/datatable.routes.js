const express = require('express');
const db = require('../db/db');

const router = express.Router();
var attributes;
var filterBy, filterStr;

router.get('/', async (req, res) => {
    let colNames = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name=\'cumulative\'');
    attributes = colNames.rows.map(object => object["column_name"]);

    let queryResult = await db.query('SELECT * FROM cumulative');
    let table = queryResult.rows;

    res.render('datatable', { attributes, table });
});

router.get('/filter', async (req, res) => {
    await db.query(`DROP VIEW IF EXISTS temp`);

    filterBy = req.query.attributeChooser
    filterStr = req.query.searchField
    if (filterStr == '') {
        await db.query(`CREATE VIEW temp AS SELECT * FROM cumulative`);
    } else if (filterBy == 'wildcard' || filterBy == '') {
        let conditions = attributes.map(attr => `${attr}::text LIKE '%${filterStr}%'`).join(' OR ');
        await db.query(`CREATE VIEW temp AS SELECT * FROM cumulative WHERE ${conditions}`)
    } else {
        await db.query(`CREATE VIEW temp AS SELECT * FROM cumulative WHERE ${filterBy}::text LIKE '%${filterStr}%'`)
    }
    let queryResult = await db.query(`SELECT * FROM temp`);
    let table = queryResult.rows;

    res.render('datatable', {attributes, table});
});

router.get('/filtered/json', async (req, res) => {
    // TODO
});

router.get('/filtered/csv', async (req, res) => {
    // TODO
});

module.exports = router;