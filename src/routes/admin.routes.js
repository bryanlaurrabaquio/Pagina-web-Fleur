const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const { updateOrderStatusSchema } = require('../validators/order.validator');

const router = Router();

// Todo el panel admin requiere sesión + rol admin
router.use(authenticate, requireAdmin);

// Dashboard / resúmenes
router.get('/dashboard', adminController.dashboard);
router.get('/sales-summary', adminController.salesSummary);

// Pedidos (admin)
router.get('/orders', adminController.listOrders); // ?status=&paymentStatus=&page=&limit=
router.get('/orders/summary', adminController.ordersSummary);
router.get('/orders/pending-shipments', adminController.pendingShipments);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), adminController.updateOrderStatus);

module.exports = router;
