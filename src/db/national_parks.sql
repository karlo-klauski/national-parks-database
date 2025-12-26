/* Create all tables */
CREATE TABLE country (
    code CHAR(2) NOT NULL,
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (code),
    UNIQUE (name)
);
CREATE TABLE nationalPark (
    id INT GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(50) NOT NULL,
    area_km2 INT NOT NULL,
    yearEstablished INT NOT NULL,
    coordinates POINT NOT NULL,
    countryCode CHAR(2) NOT NULL,
    region VARCHAR(50),
    website VARCHAR(200),
    PRIMARY KEY (id),
    FOREIGN KEY (countryCode) REFERENCES country(code)
);
CREATE TABLE species (
    id INT GENERATED ALWAYS AS IDENTITY,
    engName VARCHAR(50) NOT NULL,
    latName VARCHAR(50) NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE harboursSpecies (
    parkID INT NOT NULL,
    speciesID INT NOT NULL,
    PRIMARY KEY (parkID, speciesID),
    FOREIGN KEY (parkID) REFERENCES nationalPark(id),
    FOREIGN KEY (speciesID) REFERENCES species(id)
);

/* Fill tables with data */
INSERT INTO country (code, name) VALUES
    ('no', 'Norway'),
    ('us', 'United States'),
    ('hr', 'Croatia'),
    ('ca', 'Canada'),
    ('tz', 'Tanzania'),
    ('th', 'Thailand'),
    ('cl', 'Chile'),
    ('za', 'South Africa');
INSERT INTO nationalPark (name, area_km2, yearEstablished, coordinates, countryCode, region, website) VALUES 
    ('Breheimen', 1671, 2009, POINT(61.7195, 7.0967), 'no', 'Innlandet and Vestland counties', 'https://www.norgesnasjonalparker.no/en/nationalparks/breheimen/'),
    ('Grand Canyon', 4926, 1919, POINT(36.055261, -112.121836), 'us', 'Arizona', 'https://www.nps.gov/grca/index.htm'),
    ('Plitvice Lakes', 297, 1979, POINT(44.880556, 15.616111), 'hr', 'Lika-Senj county', 'https://np-plitvicka-jezera.hr/'),
    ('Banff', 6641, 1885, POINT(51.5, -116.0), 'ca', 'Alberta', 'https://parks.canada.ca/pn-np/ab/banff'),
    ('Serengeti', 14763, 1940, POINT(-2.333333, 34.566667), 'tz', 'Mara and Simiyu regions', 'https://www.serengeti.com/'),
    ('Khao Sok', 739, 1980, POINT(8.936667, 98.530278), 'th', 'Surat Thani province', 'https://www.tourismthailand.org/Attraction/khao-sok-national-park'),
    ('Jasper', 10878, 1907, POINT(52.8, -117.9), 'ca', 'Alberta', 'https://parks.canada.ca/pn-np/ab/jasper'),
    ('Torres del Paine', 1814, 1959, POINT(-51.0, -73.0), 'cl', 'Magallanes Region', 'https://torresdelpaine.com/en/what-to-visit/torres-del-paine-national-park/'),
    ('Kruger', 19623, 1926, POINT(-24.011389, 31.485278), 'za', 'Limpopo and Mpumalanga provinces', 'https://www.sanparks.org/parks/kruger'),
    ('Arches', 310, 1971, POINT(38.728056, -109.54), 'us', 'Utah', 'https://www.nps.gov/arch/index.htm');
INSERT INTO species (engName, latName) VALUES 
	('Golden eagle', 'Aquila chrysaetos'),
	('Eurasian Elk', 'Alces alces'),
	('Pinyon pine', 'Pinus monophylla'),
	('Grand Canyon rattlesnake', 'Crotalus oreganus abyssus'),
	('Lady''s slipper orchid', 'Cypripedium calceolus'),
	('Nose-horned viper', 'Vipera ammodytes'),
	('Bull trout', 'Salvelinus confluentus'),
	('Plains bison', 'Bison bison bison'),
	('African leopard', 'Panthera pardus pardus'),
	('Sausage Tree', 'Kigelia africana'),
	('Malayan tapir', 'Tapirus indicus'),
	('Centipede', 'Scolopendra cataracta'),
	('Grizzly bear', 'Ursus arctos horribilis'),
	('Orange agoseris', 'Agoseris aurantiaca'),
	('South American gray fox', 'Lycalopex griseus'),
	('Chilean firebush', 'Embothrium coccineum'),
	('Harlequin quail', 'Coturnix delegorguei'),
	('Mopane', 'Colophospermum mopane'),
	('Desert bighorn sheep', 'Ovis canadensis nelsoni'),
	('Black-tailed jackrabbit', 'Lepus californicus');
INSERT INTO harboursSpecies VALUES
    ((SELECT id FROM nationalPark WHERE name = 'Breheimen'), 1),
    ((SELECT id FROM nationalPark WHERE name = 'Breheimen'), 2),
    ((SELECT id FROM nationalPark WHERE name = 'Grand Canyon'), 3),
    ((SELECT id FROM nationalPark WHERE name = 'Grand Canyon'), 4),
    ((SELECT id FROM nationalPark WHERE name = 'Plitvice Lakes'), 5),
    ((SELECT id FROM nationalPark WHERE name = 'Plitvice Lakes'), 6),
    ((SELECT id FROM nationalPark WHERE name = 'Banff'), 7),
    ((SELECT id FROM nationalPark WHERE name = 'Banff'), 8),
    ((SELECT id FROM nationalPark WHERE name = 'Serengeti'), 9),
    ((SELECT id FROM nationalPark WHERE name = 'Serengeti'), 10),
    ((SELECT id FROM nationalPark WHERE name = 'Khao Sok'), 11),
    ((SELECT id FROM nationalPark WHERE name = 'Khao Sok'), 12),
    ((SELECT id FROM nationalPark WHERE name = 'Jasper'), 13),
    ((SELECT id FROM nationalPark WHERE name = 'Jasper'), 14),
    ((SELECT id FROM nationalPark WHERE name = 'Torres del Paine'), 15),
    ((SELECT id FROM nationalPark WHERE name = 'Torres del Paine'), 16),
    ((SELECT id FROM nationalPark WHERE name = 'Kruger'), 17),
    ((SELECT id FROM nationalPark WHERE name = 'Kruger'), 18),
    ((SELECT id FROM nationalPark WHERE name = 'Arches'), 19),
    ((SELECT id FROM nationalPark WHERE name = 'Arches'), 20);

CREATE VIEW cumulative AS
SELECT parkID, nationalPark.name AS parkName, area_km2, yearEstablished,
	coordinates, speciesID, engName, latName, countryCode, 
	country.name AS countryName, region, website
FROM country 
	RIGHT JOIN nationalPark
		ON country.code = nationalPark.countryCode
	LEFT JOIN harboursSpecies
		ON nationalPark.id = harboursSpecies.parkID
	LEFT JOIN species
		ON harboursSpecies.speciesID = species.id;