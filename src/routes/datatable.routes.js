const express = require('express');
const db = require('../db/db');
const { Parser } = require('json2csv');

const router = express.Router();

async function getAttributes() {
    let colNames = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name=\'cumulative\'');
    return colNames.rows.map(object => object["column_name"]);
}

router.get('/', async (req, res) => {
    let attributes = await getAttributes();

    let queryResult = await db.query('SELECT * FROM cumulative');
    let table = queryResult.rows;

    res.render('datatable', { attributes, table, query: req.query});
});

router.get('/filter', async (req, res) => {
    let attributes = await getAttributes();
    let filterStr = req.query.filterStr || '';
    let filterBy = req.query.filterBy || 'wildcard';

    let queryResult;
    if (filterStr == '') {
        queryResult = await db.query(`SELECT * FROM cumulative`);
    } else if (filterBy == 'wildcard') {
        let conditions = attributes.map(attr => `${attr}::text LIKE '%${filterStr}%'`).join(' OR ');
        queryResult = await db.query(`SELECT * FROM cumulative WHERE ${conditions}`);
    } else {
        queryResult = await db.query(`SELECT * FROM cumulative WHERE ${filterBy}::text LIKE '%${filterStr}%'`);    
    }
    let table = queryResult.rows;

    res.render('datatable', {attributes, table, query: req.query});
});

router.get('/filtered/json', async (req, res) => {
    let attributes = await getAttributes();
    let filterStr = req.query.filterStr || '';
    let filterBy = req.query.filterBy || 'wildcard';

    if (filterStr == '') {
        var query = `SELECT * FROM cumulative`;
    } else if (filterBy == 'wildcard') {
        let conditions = attributes.map(attr => `${attr}::text LIKE '%${filterStr}%'`).join(' OR ');
        var query = `SELECT * FROM cumulative WHERE ${conditions}`;
    } else {
        var query = `SELECT * FROM cumulative WHERE ${filterBy}::text LIKE '%${filterStr}%'` 
    }

    var queryResult = await db.query(`SELECT json_agg(cumulative) FROM (${query}) cumulative;`);
    let dataArray = queryResult.rows[0].json_agg;

    res.header('Content-Type', 'application/json');
    res.attachment('parks_filtered.json');
    res.json(dataArray);
});

router.get('/filtered/csv', async (req, res) => {
    let attributes = await getAttributes();
    let filterStr = req.query.filterStr || '';
    let filterBy = req.query.filterBy || 'wildcard';

    if (filterStr == '') {
        var query = `SELECT * FROM cumulative`;
    } else if (filterBy == 'wildcard') {
        let conditions = attributes.map(attr => `${attr}::text LIKE '%${filterStr}%'`).join(' OR ');
        var query = `SELECT * FROM cumulative WHERE ${conditions}`;
    } else {
        var query = `SELECT * FROM cumulative WHERE ${filterBy}::text LIKE '%${filterStr}%'` 
    }

    var queryResult = await db.query(query);
    let dataArray = queryResult.rows

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(dataArray);

    res.header('Content-Type', 'text/csv');
    res.attachment('parks_filtered.csv');
    res.send(csv);
});

module.exports = router;