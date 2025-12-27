const express = require('express');
const db = require('../db/db');
const { Parser } = require('json2csv');

const router = express.Router();

async function getAttributes() {
    const colNames = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name=\'cumulative\'');
    return colNames.rows.map(object => object["column_name"]);
}

async function makeQuery(req) {
    const attributes = await getAttributes();
    const filterStr = req.query.filterStr || '';
    const filterBy = req.query.filterBy || 'wildcard';

    if (filterStr == '') {
        return `SELECT * FROM cumulative`;
    } else if (filterBy == 'wildcard') {
        const conditions = attributes.map(attr => `${attr}::text LIKE '%${filterStr}%'`).join(' OR ');
        return `SELECT * FROM cumulative WHERE ${conditions}`;
    } else {
        return `SELECT * FROM cumulative WHERE ${filterBy}::text LIKE '%${filterStr}%'`
    }
}

router.get('/', async (req, res) => {
    const attributes = await getAttributes();

    const queryResult = await db.query('SELECT * FROM cumulative');
    const table = queryResult.rows;

    res.render('datatable', { attributes, table, query: req.query});
});

router.get('/filter', async (req, res) => {
    const queryResult = await db.query(await makeQuery(req));
    const table = queryResult.rows;

    const attributes = await getAttributes();
    res.render('datatable', {attributes, table, query: req.query});
});

router.get('/filtered/json', async (req, res) => {
    const queryResult = await db.query(`
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
        )
        FROM nationalPark np
        WHERE id IN (SELECT DISTINCT id FROM (${await makeQuery(req)}));    
    `);
    const dataArray = queryResult.rows[0].json_agg;
        
    res.header('Content-Type', 'application/json');
    res.attachment('parks_filtered.json');
    res.json(dataArray);
});

router.get('/filtered/csv', async (req, res) => {
    const queryResult = await db.query(await makeQuery(req));
    const dataArray = queryResult.rows

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(dataArray);

    res.header('Content-Type', 'text/csv');
    res.attachment('parks_filtered.csv');
    res.send(csv);
});

module.exports = router;