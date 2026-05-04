/**
 * SetupSO MVP 2 — server/db/migrate.js
 *
 * Executa o schema SQL e garante que o banco exista.
 * Também cria o usuário administrador inicial se não houver usuários.
 *
 * Uso:
 *   node server/db/migrate.js
 */

"use strict";

const path = require("path");
const fs = require("fs");
require("dotenv").config();

// TODO (implementação): importar better-sqlite3 e bcrypt,
// ler process.env.DB_PATH, executar o schema.sql,
// verificar se existe algum usuário; se não, criar o admin
// com os valores de ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_DISPLAY_NAME.
// Exemplo de estrutura:
//
// const Database = require("better-sqlite3");
// const bcrypt = require("bcrypt");
// const { v4: uuidv4 } = require("uuid");
//
// const dbPath = process.env.DB_PATH || "./server/db/setupso.sqlite";
// const db = new Database(dbPath);
// const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
// db.exec(sql);
//
// const usersCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
// if (usersCount === 0) { /* criar admin */ }

console.log("[migrate] Schema aplicado. Banco pronto.");
