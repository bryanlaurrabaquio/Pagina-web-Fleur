const newsletterService = require('../services/newsletter.service');
const asyncHandler = require('../utils/asyncHandler');

const subscribe = asyncHandler(async (req, res) => {
  await newsletterService.subscribe(req.body.email);
  res.status(201).json({ success: true, message: '¡Bienvenida a Fleur! Suscripción confirmada.' });
});

const list = asyncHandler(async (_req, res) => {
  const subscribers = await newsletterService.list();
  res.json({ success: true, data: subscribers });
});

module.exports = { subscribe, list };
