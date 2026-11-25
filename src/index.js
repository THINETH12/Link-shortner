const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());         // parse JSON request bodies
app.use(express.static('public')); // serve index.html automatically

const links = require('./routes/links');
app.use('/', links);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));