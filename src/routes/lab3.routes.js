const express = require('express');
const db = require('../db/db');
const { Parser } = require('json2csv');

const router = express.Router();

const baseQuery = `
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
    FROM nationalPark np  
`;

router.get('/parks', async (req, res) => {
    const queryResult = await db.query(baseQuery);
    const data = queryResult.rows[0].data;

    res.header('Content-Type', 'application/json');
    res.status(200).json({
        status: 'OK',
        message: 'fetched whole data collection',
        response: data
    });
});

router.get('/parks/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid ID',
            response: null 
        });

    const query = baseQuery + `WHERE id = ${id}`;

    const queryResult = await db.query(query);
    if (!queryResult.rowCount)
        return res.status(404).json({
            status: 'Not Found',
            message: `park with id ${id} not found in database`,
            response: null
        }); 
    const data = queryResult.rows[0].data;

    res.header('Content-Type', 'application/json');
    res.status(200).json({
        status: 'OK',
        message: `fetched park with id ${id}`,
        response: data
    });
});

router.post('/parks', async (req, res) => {
    const { name, area_km2, yearEstablished, coordinates: { x, y }, countryCode, region = null, website = null } = req.body
    if (!name || !area_km2 || !yearEstablished || !x || !y || !countryCode)
        return res.status(400).json({
            status: 'Bad Request',
            message: `some mandatory fields missing`,
            response: null
        });
    
    try {
        const { rows } = await db.query(`
            INSERT INTO nationalPark (name, area_km2, yearEstablished, coordinates, countryCode, region, website) VALUES 
                (${name}, ${area_km2}, ${yearEstablished}, POINT(${x}, ${y}), ${region}, ${website}) 
            RETURNING id
        `);
        const id = rows[0].id;

        const query = baseQuery + `WHERE id = ${id}`;
        const queryResult = await db.query(query);
        const data = queryResult.rows[0].data;

        res.status(201).json({
            status: 'Created',
            message: 'Park created',
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to create park',
            response: null
        });
    }
});

router.put('/parks/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid ID',
            response: null 
        });

    const atts = Object.keys(req.body)
    const set = '';
    for (let i = 0; i < atts.length(); i++) {
        if (i > 0 && i < atts.length() - 1) 
            set += ', ';
        set += `${atts[i]} = ${req.body.atts[i]}`;
    }

    try {
        const { rows } = await db.query(`
            UPDATE nationalPark
            SET ${set}
            WHERE id = ${id}
        `);

        const query = baseQuery + `WHERE id = ${id}`;
        const queryResult = await db.query(query);
        const data = queryResult.rows[0].data;

        res.status(201).json({
            status: 'Updated',
            message: 'Park updated',
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to create park',
            response: null
        });
    }
});

router.delete('/parks/:id', async (req, res) => {
    const id = req.params.id;

    const query = baseQuery + `WHERE id = ${id}`;
    const queryResult = await db.query(query);
    const data = queryResult.rows[0].data;

    await db.query(`DELETE FROM nationalPark WHERE id = ${id}`)
    
    res.status(204).json({
        status: 'No content',
        message: 'Park deleted succesfully',
        response: data
    });
});

router.get('/countries/:code', async (req, res) => {
    const code = req.params.code;

    const queryResult = await db.query(`
        SELECT json_agg(
            json_build_object(
                'countryCode', code,
                'countryName', name
            )
        ) data
        FROM country
        WHERE code = '${code}'
    `);
    const data = queryResult.rows[0].data;

    res.header('Content-Type', 'application/json');
    res.status(200).json({
        status: 'OK',
        message: 'fetched country',
        response: data
    });
});

router.get('/species/:id', async (req, res) => {
    const id = req.params.id;

    const queryResult = await db.query(`
        SELECT json_agg(
            json_build_object(
                'id', id,
                'englishName', engName,
                'latinName', latName
            )
        ) data
        FROM species
        WHERE id = '${id}'
    `);
    const data = queryResult.rows[0].data;

    res.header('Content-Type', 'application/json');
    res.status(200).json({
        status: 'OK',
        message: 'fetched species',
        response: data
    });
});

router.get('/parkSpecies/:id', async (req, res) => {
    const id = req.params.id

    const query = `
        SELECT json_agg(
            json_build_object(
                SELECT json_agg(json_build_object('speciesID', speciesID, 'engName', engName, 'latName', latName))
                FROM species
                    JOIN harboursSpecies 
                        ON species.id = harboursSpecies.speciesID
                WHERE np.id = harboursSpecies.parkID
            )
        ) data
        FROM nationalPark np
        WHERE id = ${id}
    `;

    const queryResult = await db.query(query);
    const data = queryResult.rows[0].data;

    res.header('Content-Type', 'application/json');
    res.status(200).json({
        status: 'OK',
        message: `fetched species living in park with id ${id}`,
        response: data
    });
});

module.exports = router;