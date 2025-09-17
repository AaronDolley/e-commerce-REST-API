require('dotenv').config({debug: true});
const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const pool = require('./db');

//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//testing the connection to the database
app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
          message:'Datasebase is connected successfully',
          time: result.rows[0].now
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
  });  

//Routes
app.use('/', cors(), async (req, res) => {
    res.send('Welcome to the E-commerce API');
});

app.listen(port, () => {
  console.log(`E-commerce API listening at http://localhost:${port}`);
});
