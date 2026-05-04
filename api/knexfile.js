/**
 * Knex configuration file (for knex CLI commands).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const client = process.env.DB_CLIENT || "sqlite3";

module.exports = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.SQLITE_PATH || "./api/dev.db",
    },
    useNullAsDefault: true,
    migrations: { directory: "./api/migrations" },
    seeds: { directory: "./api/seeds" },
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: { directory: "./api/migrations" },
    seeds: { directory: "./api/seeds" },
  },
};
