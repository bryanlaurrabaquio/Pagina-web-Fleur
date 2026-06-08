const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/products', require('./products.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/orders', require('./orders.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/admin', require('./admin.routes'));

// Health check
router.get('/health', (_req, res) =>
  res.json({ success: true, service: 'fleur-backend', status: 'ok', time: new Date().toISOString() })
);

module.exports = router;
