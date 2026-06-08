const contactService = require('../services/contact.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  await contactService.create(req.body);
  res.status(201).json({ success: true, message: 'Mensaje recibido, te contactaremos pronto.' });
});

const list = asyncHandler(async (_req, res) => {
  const messages = await contactService.list();
  res.json({ success: true, data: messages });
});

module.exports = { create, list };
