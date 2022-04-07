CREATE DATABASE datascout;
GRANT ALL ON datascout.* to 'datascout'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
USE datascout;

/* Result Tables */

CREATE TABLE kijiji_results (
    id              text PRIMARY KEY,
    url             text NOT NULL,
    title           text NOT NULL,
    price           integer NOT NULL,
    postedAt        timestamp with time zone NOT NULL,
    scrapedAt       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,,
    distance        text,
    location        text,
    description     text
);

CREATE TABLE bunz_results (
    id              text PRIMARY KEY,
    url             text NOT NULL,
    title           text NOT NULL,
    postedAt        timestamp with time zone NOT NULL,
    scrapedAt       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,,
    location        text,
    description     text
);

CREATE TABLE gcsurplus_results (
    id              text PRIMARY KEY,
    title           text NOT NULL,
    price           integer NOT NULL,
    oldPrice        integer,
    quantity        integer,
    postedAt        timestamp with time zone NOT NULL,
    closingAt       timestamp with time zone NOT NULL,
    scrapedAt       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,,
    location        text,
    description     text
);

CREATE TABLE fbmarketplace_results (
    id              text PRIMARY KEY,
    url             text NOT NULL,
    title           text NOT NULL,
    price           integer NOT NULL,
    oldPrice        integer,
    postedAt        timestamp with time zone NOT NULL,
    scrapedAt       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,,
    location        text,
    condition       text,
    description     text
);

/* Searches */

CREATE TABLE searches (
    id                              serial PRIMARY KEY,
    term                            text NOT NULL,
    createdAt                       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timeLimit                       integer NOT NULL,
    budget                          integer NOT NULL,
    maxDistance                     integer NOT NULL,
    lowerPriceLimit                 integer NOT NULL,
    upperPriceLimit                 integer NOT NULL,
    keywords                        text,
    resultLimit                     integer,
    kijijiFrequency                 integer DEFAULT 1,
    kijijiLastSearchedAt            timestamp with time zone,
    fbmarketplaceFrequency          integer DEFAULT 1,
    fbmarketplaceLastSearchedAt     timestamp with time zone,
);


/* Association Tables */


CREATE TABLE searches_kijiji_results ( 
    searchId    int REFERENCES searches (id) ON UPDATE CASCADE ON DELETE CASCADE,
    resultId    text REFERENCES kijiji_results (id) ON UPDATE CASCADE,
    CONSTRAINT  searches_results_pkey PRIMARY KEY (searchId, resultId)  -- explicit pk
);


CREATE TABLE searches_bunz_results ( 
    searchId    int REFERENCES searches (id) ON UPDATE CASCADE ON DELETE CASCADE,
    resultId    text REFERENCES bunz_results (id) ON UPDATE CASCADE,
    CONSTRAINT  searches_results_pkey PRIMARY KEY (searchId, resultId)  -- explicit pk
);


CREATE TABLE searches_gcsurplus_results ( 
    searchId    int REFERENCES searches (id) ON UPDATE CASCADE ON DELETE CASCADE,
    resultId    text REFERENCES gcsurplus_results (id) ON UPDATE CASCADE,
    CONSTRAINT  searches_results_pkey PRIMARY KEY (searchId, resultId)  -- explicit pk
);


CREATE TABLE searches_fbmarketplace_results ( 
    searchId    int REFERENCES searches (id) ON UPDATE CASCADE ON DELETE CASCADE,
    resultId    text REFERENCES fbmarketplace_results (id) ON UPDATE CASCADE,
    CONSTRAINT  searches_results_pkey PRIMARY KEY (searchId, resultId)  -- explicit pk
);
