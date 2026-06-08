const userRepo = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

async function register({ name, email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw ApiError.conflict('Ya existe una cuenta con ese email');

  const hashed = await hashPassword(password);
  const user = await userRepo.create({ name, email, password: hashed });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw ApiError.unauthorized('Credenciales inválidas');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  // No exponer el hash de la contraseña
  const { password: _omit, ...safeUser } = user;
  return { user: safeUser, token };
}

module.exports = { register, login };
