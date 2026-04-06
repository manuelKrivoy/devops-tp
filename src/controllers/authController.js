const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

// Almacenamiento en memoria (reemplazar por DB en producción)
const users = new Map();

async function register(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Se requieren email, password y name" });
  }

  if (typeof email !== "string" || !email.includes("@") || email.length > 254) {
    return res.status(400).json({ error: "Email inválido" });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "La contraseña debe tener entre 8 y 128 caracteres" });
  }

  if (users.has(email.toLowerCase())) {
    return res.status(409).json({ error: "El email ya está registrado" });
  }

  const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);
  const id = uuidv4();
  const user = { id, email: email.toLowerCase(), name, password: hashedPassword };
  users.set(user.email, user);

  const token = generateToken(user);

  res.status(201).json({
    message: "Usuario registrado correctamente",
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Se requieren email y password" });
  }

  const user = users.get(email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = generateToken(user);

  res.json({
    message: "Login exitoso",
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}

function generateToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = { register, login };
