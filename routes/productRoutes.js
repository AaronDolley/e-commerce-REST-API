const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products in the catalog
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 */

//GET all products
router.get('/', async (req, res) => {
    try {
        const allProducts = await pool.query('SELECT * FROM products');
        res.json(allProducts.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }       
});

//GET a product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if(product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Add a new product to the catalog (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Server error
 */

//POST a new product
router.post('/', async (req, res) => {
    try {
        const { name, price, description, img_url, stock_quantity  } = req.body;

        if(!name ||!price){
            return res.status(400).json({ message: 'Name and Price are required' });
        }

        const newProduct = await pool.query(
            'INSERT INTO products (name, price, description, img_url, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, price, description, img_url, stock_quantity]
        );
        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
        });
    
//PUT update a product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, img_url, stock_quantity } = req.body;

        const updatedProduct = await pool.query(
            'UPDATE products SET name = $1, price = $2, description = $3, img_url = $4, stock_quantity = $5 WHERE id = $6 RETURNING *',
            [name, price, description, img_url, stock_quantity, id]
        );

        if(updatedProduct.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found'})
        }

        res.json({
            message: 'Product updated succesfully',
            product: updatedProduct.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//DELETE a product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const deletedProduct = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING *',
            [id]
        );

        if(deletedProduct.rows.length === 0){
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        res.json({ message: 'Product deleted successfully' });
    }catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;