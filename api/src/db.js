/**
 * Knex configuration — suporta SQLite (dev) e PostgreSQL (produção).
 * Selecionado via variável de ambiente DB_CLIENT.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const client = process.env.DB_CLIENT || "sqlite3";

const configs = {
  sqlite3: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.SQLITE_PATH || "./api/dev.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
  pg: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};

const config = configs[client] || configs.sqlite3;

module.exports = require("knex")(config);
