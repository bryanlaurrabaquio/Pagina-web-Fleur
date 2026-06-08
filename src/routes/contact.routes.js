const { Router } = require('express');
const contactController = require('../controllers/contact.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');
const { contactSchema } = require('../validators/contact.validator');

const router = Router();

// Pública — formulario de contacto
router.post('/', validate(contactSchema), contactController.create);

// Admin — listar mensajes
router.get('/', authenticate, requireAdmin, contactController.list);

module.exports = router;
