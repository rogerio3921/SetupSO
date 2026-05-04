/**
 * Seed: cria o usuário admin inicial.
 * Executar com: npm run seed
 * (ou: node api/seeds/createAdmin.js)
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const bcrypt = require("bcrypt");
const db = require("../src/db");

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const name = process.env.ADMIN_NAME || "Administrador";
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.startsWith("TROQUE")) {
    console.error("ERRO: Defina ADMIN_PASSWORD no .env antes de criar o admin inicial.");
    process.exit(1);
  }

  const existing = await db("users").where({ username }).first();
  if (existing) {
    console.log("Usuário admin já existe. Nada a fazer.");
    process.exit(0);
  }

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
  const password_hash = await bcrypt.hash(password, rounds);

  await db("users").insert({
    name,
    username,
    password_hash,
    role: "admin",
    active: true,
  });

  console.log("Admin inicial criado com sucesso.");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Falha ao criar admin:", err);
  process.exit(1);
});
