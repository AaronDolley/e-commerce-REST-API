require('dotenv').config({debug: true});
const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const usersRoutes = require('./routes/usersRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//test route
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

//api routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// greeting Routes
app.use('/', cors(), async (req, res) => {
    res.send('Welcome to the E-commerce API');
});



app.listen(port, () => {
  console.log(`E-commerce API listening at http://localhost:${port}`);
});
