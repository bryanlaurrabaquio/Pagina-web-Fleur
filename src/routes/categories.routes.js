const { Router } = require('express');
const categoryController = require('../controllers/category.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');

const router = Router();

// Públicas
router.get('/', categoryController.list);
router.get('/:slug', categoryController.getOne);

// Admin
router.post('/', authenticate, requireAdmin, validate(createCategorySchema), categoryController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateCategorySchema), categoryController.update);
router.delete('/:id', authenticate, requireAdmin, categoryController.remove);

module.exports = router;
