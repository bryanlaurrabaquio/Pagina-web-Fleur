const { Router } = require('express');
const favoriteController = require('../controllers/favorite.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { addFavoriteSchema } = require('../validators/favorite.validator');

const router = Router();

router.use(authenticate);

router.get('/', favoriteController.list);
router.post('/', validate(addFavoriteSchema), favoriteController.add);
router.delete('/:productId', favoriteController.remove);

module.exports = router;
