const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} = require('../validators/product.validator');

const router = Router();

// Públicas
router.get('/', validate(listProductsQuerySchema, 'query'), productController.list);
router.get('/featured', productController.featured); // destacados
router.get('/discounted', productController.discounted); // con descuento
router.get('/:identifier', productController.getOne); // por id, sku o slug

// Admin
router.post('/', authenticate, requireAdmin, validate(createProductSchema), productController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateProductSchema), productController.update);
router.delete('/:id', authenticate, requireAdmin, productController.remove);

module.exports = router;
