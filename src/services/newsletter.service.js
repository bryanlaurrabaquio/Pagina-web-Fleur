const newsletterRepo = require('../repositories/newsletter.repository');
const ApiError = require('../utils/ApiError');

async function subscribe(email) {
  const existing = await newsletterRepo.findByEmail(email);
  if (existing) throw ApiError.conflict('Este correo ya está suscrito');
  return newsletterRepo.create(email);
}

const list = () => newsletterRepo.list();

module.exports = { subscribe, list };
