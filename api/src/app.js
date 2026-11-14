const express = require('express');
const { pool } = require('./db');

const ESTADOS = ['ToDo', 'Doing', 'Done'];
const PRIORIDADES = ['Baja', 'Media', 'Alta'];

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok' });
  } catch {
    res.status(503).json({ estado: 'sin conexion a la base' });
  }
});

app.get('/tareas', async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
  }
  const { rows } = estado
    ? await pool.query('SELECT * FROM tareas WHERE estado = $1 ORDER BY id', [estado])
    : await pool.query('SELECT * FROM tareas ORDER BY id');
  res.json(rows);
});

app.get('/tareas/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tareas WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'tarea no encontrada' });
  res.json(rows[0]);
});

app.post('/tareas', async (req, res) => {
  const { titulo, estado = 'ToDo', responsable = null, prioridad = 'Media' } = req.body ?? {};
  if (typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({ error: 'titulo es obligatorio' });
  }
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
  }
  if (!PRIORIDADES.includes(prioridad)) {
    return res.status(400).json({ error: `prioridad debe ser una de: ${PRIORIDADES.join(', ')}` });
  }
  const { rows } = await pool.query(
    'INSERT INTO tareas (titulo, estado, responsable, prioridad) VALUES ($1, $2, $3, $4) RETURNING *',
    [titulo.trim(), estado, responsable, prioridad]
  );
  res.status(201).json(rows[0]);
});

app.patch('/tareas/:id', async (req, res) => {
  const cuerpo = req.body ?? {};
  const campos = [];
  const valores = [];

  if ('titulo' in cuerpo) {
    if (typeof cuerpo.titulo !== 'string' || !cuerpo.titulo.trim()) {
      return res.status(400).json({ error: 'titulo no puede estar vacio' });
    }
    valores.push(cuerpo.titulo.trim());
    campos.push(`titulo = $${valores.length}`);
  }
  if ('estado' in cuerpo) {
    if (!ESTADOS.includes(cuerpo.estado)) {
      return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
    }
    valores.push(cuerpo.estado);
    campos.push(`estado = $${valores.length}`);
  }
  if ('prioridad' in cuerpo) {
    if (!PRIORIDADES.includes(cuerpo.prioridad)) {
      return res.status(400).json({ error: `prioridad debe ser una de: ${PRIORIDADES.join(', ')}` });
    }
    valores.push(cuerpo.prioridad);
    campos.push(`prioridad = $${valores.length}`);
  }
  if ('responsable' in cuerpo) {
    valores.push(cuerpo.responsable);
    campos.push(`responsable = $${valores.length}`);
  }
  if (!campos.length) return res.status(400).json({ error: 'no hay campos para actualizar' });

  valores.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE tareas SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  if (!rows.length) return res.status(404).json({ error: 'tarea no encontrada' });
  res.json(rows[0]);
});

app.delete('/tareas/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM tareas WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'tarea no encontrada' });
  res.status(204).end();
});

app.get('/reporte', async (req, res) => {
  const { rows } = await pool.query('SELECT estado, count(*)::int AS cantidad FROM tareas GROUP BY estado');
  const reporte = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  rows.forEach((r) => { reporte[r.estado] = r.cantidad; });
  res.json({ total: Object.values(reporte).reduce((a, b) => a + b, 0), por_estado: reporte });
});

app.use((err, req, res, next) => {
  if (err.code === '22P02') return res.status(400).json({ error: 'id invalido' });
  console.error(err);
  res.status(500).json({ error: 'error interno' });
});

module.exports = app;
