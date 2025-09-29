const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's order history
 *     description: Retrieve all completed orders for the current user
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
 *       500:
 *         description: Server error
 */

//Get all orders
router.get('/',async (req, res) => {
    try {
        const userId = 1;

        const userOrders = await pool.query(`SELECT o.*, COUNT(oi.id) as item_count, SUM(oi.quantity * oi.price_at_time_of_purchase) as calculated_total FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = $1 AND o.status != 'cart' GROUP BY o.id ORDER BY o.id DESC`, [userId]);

        res.json({ orders: userOrders.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve detailed information about a specific order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

//Get specific order by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = 1;
        const { id } = req.params;

        const orderResult = await pool.query(`SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status != 'cart'`, [id, userId]);

        if(orderResult.rows.length === 0){
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        const orderItemsResult = await pool.query(`SELECT oi.*, p.name, p.img_url 
       FROM order_items oi JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = $1`, [id]);

       res.json({
        order: order,
        items: orderItemsResult.rows
         });
       }catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
       }
    });

//GET items for a specific order
router.get('/:id/items', async (req, res) => {
    try {
        const userId = 1;
        const { id } = req.params;

        const orderResult = await pool.query(`SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status != 'cart'`, [id, userId]);

        if(orderResult.rows.length === 0){
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderItemsResult = await pool.query(`SELECT oi.*, p.name, p.img_url 
            FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`,
            [id]);

      res.json({ items: orderItemsResult.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;