const express = require('express');
const db = require('../db/db');
const { Parser } = require('json2csv');

const router = express.Router();

const singleQuery = `
    SELECT json_build_object(
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
    ) data
    FROM nationalPark np`;

const multiQuery = `
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
    try {
        const queryResult = await db.query(multiQuery);
        const data = queryResult.rows[0].data;

        res.header('Content-Type', 'application/json');
        res.status(200).json({
            status: 'OK',
            message: 'fetched whole data collection',
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to fetch all data',
            response: null
        });
    }
});

router.get('/parks/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid ID provided',
            response: null 
        });

    const query = `${singleQuery} WHERE id = ${id}`;

    try {
        const queryResult = await db.query(query);
        const data = queryResult.rows[0].data;
        if (!data)
            return res.status(404).json({
                status: 'Not Found',
                message: `park with id ${id} not found`,
                response: null
            }); 

        res.header('Content-Type', 'application/json');
        res.status(200).json({
            status: 'OK',
            message: `fetched park with id ${id}`,
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to fetch park',
            response: null
        });
    }
});

router.post('/parks', async (req, res) => {
    const { name, area_km2, yearEstablished, coordinates, countryCode, region = null, website = null } = req.body
    const x = coordinates?.x;
    const y = coordinates?.y;   
    if (!name || !area_km2 || !yearEstablished || x === undefined || y === undefined|| !countryCode)
        return res.status(400).json({
            status: 'Bad Request',
            message: `some mandatory fields missing`,
            response: null
        });
    
    try {
        const { rows } = await db.query(`
            INSERT INTO nationalPark (name, area_km2, yearEstablished, coordinates, countryCode, region, website) VALUES 
                ($1, $2, $3, POINT($4, $5), $6, $7, $8) 
            RETURNING id
        `, [name, area_km2, yearEstablished, x, y, countryCode, region, website]);
        const id = rows[0].id;

        const query = `${singleQuery} WHERE id = ${id}`;
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
            message: 'invalid ID provided',
            response: null 
        });

    // s ovim nacinom, ako korisnik ne updatea region i website, oni se brisu ako su bili tamo
    const { name, area_km2, yearEstablished, coordinates, countryCode, region = null, website = null } = req.body
    const x = coordinates?.x;
    const y = coordinates?.y;   
    if (!name || !area_km2 || !yearEstablished || x === undefined || y === undefined|| !countryCode)
        return res.status(400).json({
            status: 'Bad Request',
            message: `some mandatory fields missing`,
            response: null
        });

    try {
        const { rows } = await db.query(`
            UPDATE nationalPark
            SET name = $1, area_km2 = $2, yearEstablished = $3, coordinates = POINT($4, $5),
                countryCode = $6, region = $7, website = $8
            WHERE id = $9
        `, [name, area_km2, yearEstablished, x, y, countryCode, region, website, id]);

        const query = `${singleQuery} WHERE id = ${id}`;
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
            message: 'Failed to update park',
            response: null
        });
    }
});

router.delete('/parks/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid ID provided',
            response: null 
        });

    try {
        // moramo dohvatiti park prije brisanja
        const query = `${singleQuery} WHERE id = ${id}`;
        const queryResult = await db.query(query);
        const data = queryResult.rows[0].data;

        await db.query(`
            DELETE FROM harboursSpecies WHERE parkID = ${id};
            DELETE FROM nationalPark WHERE id = ${id}`);

        res.status(204);
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to delete park',
            response: null
        });
    }
});

router.get('/countries/:code', async (req, res) => {
    const code = req.params.code;
    if (code.length != 2)
        return res.status(400).json({ 
            status: 'Bad request',
            message: `invalid length of provided code (${code.length} instead of 2)`,
            response: null 
        });

    try {
        const queryResult = await db.query(`
            SELECT json_build_object(
                'countryCode', code,
                'countryName', name
            ) data
            FROM country
            WHERE code = $1
        `, [code]); 
        const data = queryResult.rows[0].data;
        if (!data)
            return res.status(404).json({
                status: 'Not Found',
                message: `contry with code '${code}' not found`,
                response: null
            }); 


        res.header('Content-Type', 'application/json');
        res.status(200).json({
            status: 'OK',
            message: 'fetched country',
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to fetch country',
            response: null
        });
    }
});

router.get('/species/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid ID provided',
            response: null 
        });

    try {
        const queryResult = await db.query(`
            SELECT json_build_object(
                'id', id,
                'englishName', engName,
                'latinName', latName
            ) data
            FROM species
            WHERE id = '${id}'
        `);
        const data = queryResult.rows[0].data;
        if (!data)
            return res.status(404).json({
                status: 'Not Found',
                message: `species with id ${id} not found`,
                response: null
            }); 

        res.header('Content-Type', 'application/json');
        res.status(200).json({
            status: 'OK',
            message: 'fetched species',
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to fetch country',
            response: null
        });
    }
});

router.get('/parkSpecies/:parkID', async (req, res) => {
    const parkID = Number(req.params.parkID)
    if (!Number.isInteger(parkID))
        return res.status(400).json({ 
            status: 'Bad request',
            message: 'invalid park ID provided',
            response: null 
        });

    const query = `
        SELECT json_agg(json_build_object('speciesID', speciesID, 'engName', engName, 'latName', latName)) data
			FROM species
				JOIN harboursSpecies 
					ON species.id = harboursSpecies.speciesID
			WHERE harboursSpecies.parkID = ${parkID}
    `;

    try {
        const queryResult = await db.query(query);
        const data = queryResult.rows[0].data;
        if (!data)
            return res.status(404).json({
                status: 'Not Found',
                message: `park with id ${parkID} not found`,
                response: null
            }); 

        res.header('Content-Type', 'application/json');
        res.status(200).json({
            status: 'OK',
            message: `fetched species living in park with id ${parkID}`,
            response: data
        });
    } catch (err) {
        res.status(500).json({
            status: 'Internal server error',
            message: 'Failed to fetch species',
            response: null
        });
    }
});

function methodNotAllowed() {
    return {
        "status": "Not Implemented",
        "message": "Method not implemented for requested resource",
        "response": null
    }
}

router.use('/parks', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/parks/:id', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/countries', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/countries/:code', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/species', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/species/:id', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/parkSpecies', (req, res) => {
    res.status(501).json(methodNotAllowed());
});
router.use('/parkSpecies/:parkID', (req, res) => {
    res.status(501).json(methodNotAllowed());
});

module.exports = router;