const express = require('express');
const router = express.Router();
const pool = require('../db');

//GET current users
router.get('/', async (req, res) => {
    try {
        const userId = 1;

        const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);   

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(userResult.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }   
});

//update user info
router.put('/', async (req, res) => {
    try {
        const userId = 1;
        const { name, email, address, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and Email are required' });
        }

        const updateUser = await pool.query(
            'UPDATE users SET name = $1, email = $2, address = $3, phone = $4 WHERE id = $5 RETURNING id, name, email, address, phone',
            [name, email, address, phone, userId]
        );

        res.json({
            message: 'User updated successfully',
            user: updateUser.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        if(err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Email already in use' });
        }   else {  
            res.status(500).send('Server Error');
        }
    }
});

module.exports = router;