const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/order.validator');

const router = Router();

router.use(authenticate);

// Cliente
router.post('/', validate(createOrderSchema), orderController.create); // crear desde carrito
router.get('/mine', orderController.myOrders); // historial del usuario
router.get('/my-orders', orderController.myOrders); // alias (compat con front/Bruno)

// Admin — ver todos los pedidos (antes de /:id para no chocar)
router.get('/', requireAdmin, orderController.listAll);
router.patch('/:id/status', requireAdmin, validate(updateOrderStatusSchema), orderController.updateStatus);

// Detalle (cliente dueño o admin)
router.get('/:id', orderController.getOne);

module.exports = router;
