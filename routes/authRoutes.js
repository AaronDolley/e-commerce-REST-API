const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password) { 
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, hashedPassword]
        );

        res.status(201).json({ 
            message: 'User registered successfully', 
            user: { id: newUser.rows[0].id, name: newUser.rows[0].name, email: newUser.rows[0].email } });

    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
      res.status(409).json({ error: 'User with this email already exists' });
    } else {
      res.status(500).send('Server Error');
    }
    } 
});

//User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) { 
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if(userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid email' });
        }

        const user = userResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        res.json({ message: 'Login successful', 
            user: { id: user.id, name: user.name, email: user.email } });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;