const crypto = require("crypto");

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  bcryptRounds: 12,
};

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET no está definido. Se generó uno aleatorio. Definilo en producción.");
}

module.exports = config;
