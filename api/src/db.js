const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const esquema = `
  CREATE TABLE IF NOT EXISTS tareas (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
    estado TEXT NOT NULL DEFAULT 'ToDo' CHECK (estado IN ('ToDo', 'Doing', 'Done')),
    responsable TEXT,
    prioridad TEXT NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function inicializar(intentos = 15) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await pool.query(esquema);
      return;
    } catch (err) {
      if (i === intentos) throw err;
      console.log(`Base no disponible (${i}/${intentos}): ${err.message}`);
      await esperar(2000);
    }
  }
}

module.exports = { pool, inicializar };
