const { Router } = require('express');
const newsletterController = require('../controllers/newsletter.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const { subscribeSchema } = require('../validators/newsletter.validator');

const router = Router();

// Pública — suscripción
router.post('/', validate(subscribeSchema), newsletterController.subscribe);

// Admin — listar suscriptores
router.get('/', authenticate, requireAdmin, newsletterController.list);

module.exports = router;
