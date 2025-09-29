const express = require('express');
const router = express.Router();
const pool = require('../db');

//Helper function to get or create cart order for user
async function getOrCreateCartOrder(userId) {
    const client = await pool.connect(); // We need a transaction for safety
  
  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Try to find existing cart order for this user
    const existingCart = await client.query(
      'SELECT * FROM orders WHERE user_id = $1 AND status = $2',
      [userId, 'cart']
    );

    // 2. If cart exists, return it
    if (existingCart.rows.length > 0) {
      await client.query('COMMIT'); // End transaction
      return existingCart.rows[0];
    }

    // 3. If no cart exists, create a new one
    const newCart = await client.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, 0, 'cart'] // total_amount starts at 0
    );

    await client.query('COMMIT'); // End transaction
    return newCart.rows[0];

  } catch (err) {
    await client.query('ROLLBACK'); // Undo changes on error
    throw err; // Re-throw the error for the route to handle
  } finally {
    client.release(); // Always release the client back to the pool
  }
}

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     description: Retrieve the current user's shopping cart with all items
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       500:
 *         description: Server error
 */

//GET cart items for a user
router.get('/', async (req, res) => {
    try {
        const userId = 1;
        const cartOrder = await getOrCreateCartOrder(userId);

        const cartItems = await pool.query(
            `SELECT oi.*, p.name, p.price FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`, [cartOrder.id]);
        
        return res.json({ cart: cartOrder, items: cartItems.rows }); // Added return
        } catch (err) {
            console.error(err.message);
            return res.status(500).send('Server Error'); // Added return
        }
});

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the user's shopping cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Item added to cart
 *       400:
 *         description: Product ID is required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

//POST add item to cart
router.post('/', async (req, res) => {
    try {
        const userId = 1;
        const { productId, quantity } = req.body;

        if(!productId ) {
            return res.status(400).json({ message: 'Product ID is required' });
        }
       
        const cartOrder = await getOrCreateCartOrder(userId);

        // CHECK IF PRODUCT EXISTS - ADDED THIS CHECK
        const product = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        //check if item already exists in cart
        const existingItem = await pool.query('SELECT * FROM order_items WHERE order_id = $1 AND product_id = $2', [cartOrder.id, productId]);

        if (existingItem.rows.length > 0) {
            const updatedItem = await pool.query(
                'UPDATE order_items SET quantity = quantity + $1 WHERE id = $2 RETURNING *',
                [quantity || 1, existingItem.rows[0].id]
            );
            return res.json({ message: 'Cart item updated', item: updatedItem.rows[0] });
        } else {
            const newItem = await pool.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_time_of_purchase) VALUES ($1, $2, $3, $4) RETURNING *',
                [cartOrder.id, productId, quantity || 1, product.rows[0].price] // Now safe to use product.rows[0]
            );
            return res.status(201).json({ message: 'Item added to cart', item: newItem.rows[0] }); // Added return
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error'); // Added return
    }
});

//PUT update cart item quantity
router.put('/items/:productId', async (req, res) => {
    try {
        const userId = 1;
        const { productId } = req.params;
        const { quantity } = req.body;

        if(quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        const cartOrder = await getOrCreateCartOrder(userId);

        const updatedItem = await pool.query(
            'UPDATE order_items SET quantity = $1 WHERE order_id = $2 AND product_id = $3 RETURNING *',
            [quantity, cartOrder.id, productId]
        );

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        return res.json({ message: 'Cart item updated', item: updatedItem.rows[0]});
    } catch(err) {
        console.error(err.message);
        return res.status(500).send('Server Error'); // Added return
    }
});

//DELETE remove item from cart
router.delete('/items/:productId', async (req, res) => {
    try {
        const userId = 1;
        const { productId } = req.params;
        
        const cartOrder = await getOrCreateCartOrder(userId);

        const deletedItem = await pool.query(
            'DELETE FROM order_items WHERE order_id = $1 AND product_id = $2 RETURNING *',
            [cartOrder.id, productId]
        );

        if (deletedItem.rows.length === 0) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        return res.json({ message: `Cart item removed`}); // Added return
    } catch(err) {
        console.error(err.message);
        return res.status(500).send('Server Error'); // Added return
    }
});

// POST /api/cart/checkout - Convert cart to completed order
router.post('/checkout', async (req, res) => {
  try {
    const userId = 1;
    const cartOrder = await getOrCreateCartOrder(userId);
    
    // Calculate total amount from cart items
    const totalResult = await pool.query(`
      SELECT SUM(quantity * price_at_time_of_purchase) as total 
      FROM order_items 
      WHERE order_id = $1
    `, [cartOrder.id]);

    // Update order status to 'completed' and set total amount
    const completedOrder = await pool.query(
      'UPDATE orders SET status = $1, total_amount = $2 WHERE id = $3 RETURNING *',
      ['completed', totalResult.rows[0].total, cartOrder.id]
    );

    return res.json({ message: 'Order completed successfully', order: completedOrder.rows[0] });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error'); // Added return
  }
});

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Checkout cart
 *     description: Convert the user's cart into a completed order
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Checkout completed successfully
 *       400:
 *         description: Cannot checkout empty cart
 *       404:
 *         description: Cart not found
 *       500:
 *         description: Server error
 */

//Checkout Route
// POST /api/cart/checkout - Convert cart to completed order
router.post('/checkout', async (req, res) => {
  const client = await pool.connect(); // Use transaction for safety
  
  try {
    await client.query('BEGIN'); // Start transaction
    const userId = 1; // Temporary - from auth later

    // 1. Get user's cart
    const cartResult = await client.query(
      'SELECT * FROM orders WHERE user_id = $1 AND status = $2',
      [userId, 'cart']
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cartOrder = cartResult.rows[0];

    // 2. Check if cart has items
    const cartItems = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [cartOrder.id]
    );

    if (cartItems.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot checkout empty cart' });
    }

    // 3. Calculate total amount
    const totalResult = await client.query(`
      SELECT SUM(quantity * price_at_time_of_purchase) as total 
      FROM order_items 
      WHERE order_id = $1
    `, [cartOrder.id]);

    const totalAmount = totalResult.rows[0].total || 0;

    // 4. Simulate payment processing (always succeed for now)
    // In a real app, this would integrate with Stripe, PayPal, etc.
    const paymentSuccessful = await simulatePayment(totalAmount);
    
    if (!paymentSuccessful) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Payment failed' });
    }

    // 5. Update inventory (optional - reduce stock quantities)
    for (const item of cartItems.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 6. Convert cart to completed order
    const completedOrder = await client.query(
      'UPDATE orders SET status = $1, total_amount = $2 WHERE id = $3 RETURNING *',
      ['completed', totalAmount, cartOrder.id]
    );

    // 7. Create a new empty cart for the user for future shopping
    const newCart = await client.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, 0, 'cart']
    );

    await client.query('COMMIT'); // Commit transaction if all steps succeed

    res.json({ 
      message: 'Checkout completed successfully', 
      order: completedOrder.rows[0],
      newCartId: newCart.rows[0].id
    });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on any error
    console.error('Checkout error:', err.message);
    
    if (err.code === '23505') { // Unique constraint
      res.status(409).json({ error: 'Order processing conflict' });
    } else if (err.message.includes('stock_quantity')) {
      res.status(400).json({ error: 'Insufficient stock for some items' });
    } else {
      res.status(500).json({ error: 'Checkout failed', details: err.message });
    }
  } finally {
    client.release(); // Always release the client
  }
});

// Simulate payment processing (always succeeds for now)
async function simulatePayment(amount) {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For now, always return success
  // Later, you can add random failures for testing error handling
  return true;
  
  // To test error handling, you could occasionally return false:
  // return Math.random() > 0.1; // 90% success rate for testing
}

        
    

module.exports = router;