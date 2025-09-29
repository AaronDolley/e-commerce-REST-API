const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "secret123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "secret123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

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