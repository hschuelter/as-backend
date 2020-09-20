const os = require('os');
const mongodb = require('mongodb');
const { Pool, Client } = require("pg");
const pgp = require('pg-promise')();

require('dotenv').config({path:__dirname+'/./../.env'})

// const log = require('./logger.js')
// ====================================

function log(msg){
    console.log(msg);
}

function get_today() {
    var today = new Date();

    var yyyy = today.getFullYear();
    
    var mm = today.getMonth() +1;
    mm = (mm < 10) ? `0${mm}` : `${mm}`;

    return `2100-${mm}-01`;
}

const con = {
    user: process.env.PG_USER,
    password: process.env.PG_PSWD,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT
  };

function search(res, user_query, count, author, venue, begin_date, end_date){
    const mongodb_host = 'mongodb://localhost:27017/';
    const db_name = 'venues_simple';
    const collection_name = 'articles';
    
    var q = user_query.split(" ");
    var authors = author.split(" ");
    var venues = venue.split(" ");

    var MongoClient = mongodb.MongoClient;
    MongoClient.connect(mongodb_host, function(err, db) {
        if (err) res.send(err);
        var dbo = db.db(db_name);

        const search_form = make_query(q);
        const author_form = make_author_query(authors);
        const venue_form  = make_venue_query(venues);

        const date_form = make_date_query(begin_date, end_date);

        var query;
        if (begin_date == ''){
            query = {
                "$and": [
                    { "$or": search_form }, 
                    { "$and": author_form },
                    { "$or": venue_form }]}
        }
        else {
            query = {
                "$and": [
                    { "$or": search_form }, 
                    { "$and": author_form },
                    { "$or": venue_form },
                    { "$or": date_form }]}
        }

        dbo.collection(collection_name).find( query, { projection: { _id: 0, title: 1, abstract: 1, authors: 1, journal: 1, pages: 1, date: 1, doi: 1, keywords: 1, references: 1, link: 1, venue:1 } })
            .limit(count).toArray(function(err, results) {
                if (err) res.send(err);

                res.json({
                    data: results
                });
        });

        db.close();
    });
}

// MongoDB
function make_query(query){
    var search_form = Array();

    for (var i = 0; i < query.length; i++){
        var word = query[i];
        if (word[0] == '"' && word[word.length - 1] == '"'){
            console.log(word);
            word = word.replace('"', '').replace('"', '');

            search_form.push( { title:    {$regex: `${word} `, $options: "$i"} } );
            search_form.push( { abstract: {$regex: `${word} `, $options: "$i"} } );
            search_form.push( { keywords: {$elemMatch: {$regex: `${word} `, $options: "$i"} }} );
        }
        else {
            console.log(word);
            word = word.replace('"', '');

            search_form.push( { title: {$regex: word, $options: "$i"} } );
            search_form.push( { abstract: {$regex: word, $options: "$i"} } );
            search_form.push( { keywords: { $elemMatch: {$regex: word, $options: "$i"} }} );
        }

    }

    return search_form;
}

function make_author_query(authors){
    var author_form = Array();

    for (var i = 0; i < authors.length; i++){
        author_form.push( { authors: { $elemMatch: { name: {$regex: authors[i], $options: "$i"} }}} );
    }

    return author_form;
}

function make_venue_query(venues){
    var venue_form = Array();

    for (var i = 0; i < venues.length; i++){
        venue_form.push( { "venue.title": {$regex: venues[i], $options: "$i"} });
    }

    return venue_form;
}

function make_date_query(begin_date, end_date){
    var date_form = Array();

    if (begin_date == '') return date_form;
    
    bd = begin_date.split('-');
    b_year = parseInt(bd[0]);
    b_month = parseInt(bd[1]);
    
    ed = end_date.split('-');
    e_year = parseInt(ed[0]);
    e_month = parseInt(ed[1]);

    const months = ['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'out', 'nov', 'dec']
    var first_month = b_month;
    for ( var i = b_year; i <= e_year; i++){
        if ( i == e_year) {
            for (var j = first_month; j <= e_month; j++){
                // console.log(months[j], i);
                date_form.push( { "$and" : [{
                    "date": {$regex: months[j], $options: "$i"},
                    "date": {$regex: i.toString(), $options: "$i"}
                }]});
            }
        }
        else {
            for (var j = first_month; j <= 12; j++){
                // console.log(months[j], i);
                date_form.push( { "$and" : [{
                    "date": {$regex: months[j], $options: "$i"},
                    "date": {$regex: i.toString(), $options: "$i"}
                }]});
            }
        }
        first_month = 1;
    }

    return date_form;
}

// PostgreSQL
function search_article_metadata(res, user_query, count, author, venue, begin_date, end_date){
    const pool = new Pool(con);
      
    var q = user_query.split(" ");
    var filter_authors = author.split(" ");
    var filter_venues = venue.split(" ");
    
    console.log('Query =>', q);
    console.log('Authors =>', filter_authors);
    console.log('Venues =>', filter_venues);

    var flag_authors = true;
    if (filter_authors.length == 1 && filter_authors[0] === '')
        flag_authors = false;


    var where_search_field = []
    for (let i in q){
        where_search_field.push(`(ar.title ILIKE '%${q[i]}%' OR ar.abstract ILIKE '%${q[i]}%' OR ar.keywords ILIKE '%${q[i]}%')`);
    }
    where_search_field = where_search_field.join(' AND ');
    const where_date_field = pg_date_filter(begin_date, end_date);
    const where_author_field = pg_authors_filter(filter_authors);
    const where_venue_field = pg_venues_filter(filter_venues);
    
    // console.log(where_search_field);

    const author_subquery = `
    SELECT 
        array_agg( json_build_object(
            'author_name', au.name,
            'author_institute', au.institute))
    FROM 
        authors au 
    INNER JOIN authors_articles aa
        ON aa.fk_author = au.author_id
    WHERE
        aa.fk_article = ar.article_id
    `;

    const keyword_subquery = `
    SELECT 
        array_agg(kw.keyword)
    FROM
        keywords kw
    INNER JOIN
        articles_keywords ak
        ON ak.fk_keyword = kw.keyword_id
    WHERE
        ak.fk_article = ar.article_id
    `;

    const references_subquery = `
    SELECT 
        array_agg(ct.citation)
    FROM
        citations ct
    INNER JOIN
        articles_citations ac
        ON ac.fk_citation = ct.citation_id
    WHERE
        ac.fk_article = ar.article_id
    `;

    const select_query = `
    SELECT
        json_build_object(
            'title', ar.title,
            'abstract', ar.abstract,
            'pages', ar.pages,
            'date', ar.date, 
            'doi', ar.doi,
            'link', ar.link,
            'tipo', ar.tipo,
            'venue_title', ve.title,
            'venue_publisher', ve.publisher,
            'venue_link', ve.link,
            'authors', (${author_subquery}),
            'keywords', (${keyword_subquery}),
            'unique_keywords', ar.keywords,
            'references', (${references_subquery})
        ) dados
    FROM 
        articles ar
        INNER JOIN venues ve 
            ON ve.venue_id = ar.fk_venue
        ${flag_authors ? `
            INNER JOIN
                authors_articles aa
                ON ar.article_id  = aa.fk_article 
            INNER JOIN 
                authors au
                on au.author_id = aa.fk_author ` : ''}
        
    WHERE
        (${where_search_field}) AND
        (${where_date_field}) AND
        (${where_author_field}) AND
        (${where_venue_field})
    `;

    // console.log(select_query);

    console.log("Searching...")
    pool.query(select_query, (err, results) => {
        if (err){
            console.log(err);
            res.json({
                data: []
            });
        } else {
            var data = [];
            console.log("Artigos encontados:", results.rowCount);
            for (var i = 0; i < results.rowCount; i++){
                var resultadoAtual = results.rows[i].dados;
                // console.log(results.rows[i]);
    
                if (resultadoAtual.authors === null)
                    resultadoAtual.authors = [];
    
                if (resultadoAtual.keywords === null)
                    resultadoAtual.keywords = [];
    
                if (resultadoAtual.references === null)
                    resultadoAtual.references = [];
    
                
                data.push(resultadoAtual);
    
            }
            console.log("done");
            
            res.json({
                data: data
            });
        }
        pool.end();
    });

}

function search_venues(res) {
    const pool = new Pool(con);
      
    pool.query(
        `
        SELECT
            v.title
        FROM 
            venues as v
        WHERE 
            v.venue_id = 1;
        `,
        (err, results) => {
            if (err){
                console.log(err);
                res.json({
                    data: []
                });
            } else {
                res.json({
                    data: results.rows
                });
            }
            pool.end();
    });
}

function search_conferences(res) {
    const pool = new Pool(con);
      
    pool.query(
        `
        SELECT
            v.title,
            count(a.fk_venue)
        FROM 
            venues as v
        INNER JOIN 
            articles as a ON
                v.venue_id = a.fk_venue
        WHERE v.tipo = 'Conference'
        GROUP BY v.title
        ORDER BY v.title
        `,
        (err, results) => {
            if (err){
                console.log(err);
                res.json({
                    data: []
                });
            } else {
                res.json({
                    data: results.rows
                });
            }
            pool.end();
    });
}

function search_journals(res) {
    const pool = new Pool(con);
      
    pool.query(
        `
        SELECT
            v.title,
            count(a.fk_venue)
        FROM 
            venues as v
        INNER JOIN 
            articles as a ON
                v.venue_id = a.fk_venue
        WHERE v.tipo = 'Journal'
        GROUP BY v.title
        ORDER BY v.title
        `,
        (err, results) => {
            if (err){
                console.log(err);
                res.json({
                    data: []
                });
            } else {
                res.json({
                    data: results.rows
                });
            }
            pool.end();
    });
}

function pg_date_filter(begin_date, end_date){
    if (begin_date == '' && end_date == '') return '1=1';
    
    var date_clause = [];
    if (begin_date != '') date_clause.push(`(ar.date_formatted >= '${begin_date}')`);
    if (end_date   != '') date_clause.push(`(ar.date_formatted <= '${end_date}')`);

    return date_clause.join(" AND ");
}

function pg_authors_filter(filter_authors){
    if (filter_authors.length == 1 && filter_authors[0] === ''){
        return '1=1';
    }
    var authors_clause = [];
    for (var i = 0; i < filter_authors.length; i++){
        authors_clause.push(`( au.name ilike '%${filter_authors[i]}%')`)
    }
    return authors_clause.join(' AND ');
}

function pg_venues_filter(filter_venue){
    if (filter_venue.length == 1 && filter_venue[0] === ''){
        return '1=1';
    }
    var venues_clause = [];
    for (var i = 0; i < filter_venue.length; i++){
        venues_clause.push(`(ve.title ilike '%${filter_venue[i]}%')`)
    }
    return venues_clause.join(' OR ');
}

module.exports.log = log;
module.exports.get_today = get_today;

module.exports.search = search;
module.exports.search_article_metadata = search_article_metadata;
module.exports.search_venues = search_venues;
module.exports.search_conferences = search_conferences;
module.exports.search_journals = search_journals;
