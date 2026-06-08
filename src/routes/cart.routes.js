const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { addItemSchema, updateItemSchema } = require('../validators/cart.validator');

const router = Router();

// Todas las rutas del carrito requieren sesión
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema), cartController.addItem);
router.patch('/items/:productId', validate(updateItemSchema), cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clear); // vaciar carrito

module.exports = router;
