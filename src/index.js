const express = require('express');
const cors = require('cors');
// const mongodb = require('mongodb');

const my_utils = require('./my_utils.js');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('help me');
});

// ======================================================

app.get('/search', (req, res) => {
    var { query, count, author, venue, begin_date, end_date } = req.query;

    console.log(`
        Query: >${query}<
        Count: >${count}<
        Author: >${author}<
        Venue: >${venue}<
        Begin Date: >${begin_date}<
        End Date: >${end_date}<
        ${begin_date > end_date}`)

    query = (query == '') ? ' ' : query;
    count = (count == '' || isNaN(count)) ? 1000 : count;
    author = (author == '') ? '' : author;
    venue = (venue == '') ? '' : venue;
    begin_date = (begin_date == '') ? '' : begin_date;

    end_date = (end_date == '') ? my_utils.get_today() : end_date;
    if (begin_date > end_date) begin_date = ''

    count = parseInt(count);
    // my_utils.search(res, query, count, author, venue, begin_date, end_date);
    my_utils.search_article_metadata(res, query, count, author, venue, begin_date, end_date);
});


app.get('/venues', (req, res) => {
    my_utils.search_venues(res);
});

app.get('/conferences', (req, res) => {
    my_utils.search_conferences(res);
});

app.get('/journals', (req, res) => {
    my_utils.search_journals(res);
});

// ======================================================

app.get('/acm-authors', (req, res) => {
    my_utils.mongo_authors(res, 'venues', 'acm_authors', 100);
});

app.get('/springer-chapters-authors', (req, res) => {
    my_utils.mongo_authors(res, 'venues', 'springer_chapters_authors', 100);
});

app.get('/springer-authors', (req, res) => {
    my_utils.mongo_authors(res, 'venues', 'springer_authors', 100);
});

// ======================================================

app.get('/acm-articles', (req, res) => {
    my_utils.mongo_articles(res, 'venues', 'acm_articles', 5);
});

app.get('/springer-chapters-articles', (req, res) => {
    my_utils.mongo_articles(res, 'venues', 'springer_chapters_articles', 5);
});

app.get('/springer-articles', (req, res) => {
    my_utils.mongo_articles(res, 'venues', 'springer_articles', 5);
});

// app.get('/ieeex-authors', (req, res) => {
//     my_utils.mongo_authors(res, 'venues', 'ieeex_authors', 100);
// });


app.listen(4000, () => {
    console.log(`Backend now working on port 4000...`);
});