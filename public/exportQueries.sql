/* Export to JSON */
SELECT jsonb_pretty(
    jsonb_agg(
        jsonb_build_object(
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
                SELECT jsonb_agg(jsonb_build_object('speciesID', speciesID, 'engName', engName, 'latName', latName))
                FROM species
                    JOIN harboursSpecies 
                        ON species.id = harboursSpecies.speciesID
                WHERE np.id = harboursSpecies.parkID
            ),
            'website', website
        )
    )
)
FROM nationalPark np;

/* Export to CSV */
COPY cumulative TO 'C:\Users\karlo\Nextcloud\otvrac\national-parks-database\nacionalniParkovi.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');