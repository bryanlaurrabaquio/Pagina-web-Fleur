const contactRepo = require('../repositories/contact.repository');

async function create(data) {
  return contactRepo.create({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
  });
}

const list = () => contactRepo.list();

module.exports = { create, list };
