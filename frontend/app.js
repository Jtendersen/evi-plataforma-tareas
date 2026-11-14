const API = '/api';
const ESTADOS = [
  ['ToDo', 'Por hacer'],
  ['Doing', 'En curso'],
  ['Done', 'Hecho'],
];

const formulario = document.querySelector('#formulario');
const aviso = document.querySelector('#aviso');
const reporte = document.querySelector('#reporte');

async function pedir(ruta, opciones = {}) {
  const res = await fetch(API + ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    throw new Error(cuerpo.error || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function mostrarError(err) {
  aviso.textContent = err.message === 'Failed to fetch' ? 'No se pudo conectar con la API' : err.message;
  aviso.hidden = false;
}

async function accion(fn) {
  try {
    aviso.hidden = true;
    await fn();
    await cargar();
  } catch (err) {
    mostrarError(err);
  }
}

function crearTarjeta(t) {
  const item = document.createElement('div');
  item.className = 'item';
  item.draggable = true;
  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(t.id));
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('arrastrando');
  });
  item.addEventListener('dragend', () => item.classList.remove('arrastrando'));

  const titulo = document.createElement('input');
  titulo.className = 'item-input';
  titulo.type = 'text';
  titulo.disabled = true;
  titulo.value = t.titulo;
  titulo.maxLength = 200;

  const meta = document.createElement('p');
  meta.className = 'meta';
  const prioridad = document.createElement('span');
  prioridad.className = `prioridad-${t.prioridad}`;
  prioridad.textContent = `Prioridad ${t.prioridad.toLowerCase()}`;
  meta.append(prioridad, ` · ${t.responsable || 'Sin responsable'}`);

  const estado = document.createElement('select');
  estado.setAttribute('aria-label', 'Estado');
  for (const [valor, texto] of ESTADOS) {
    const op = new Option(texto, valor, false, valor === t.estado);
    estado.add(op);
  }
  estado.addEventListener('change', () =>
    accion(() => pedir(`/tareas/${t.id}`, { method: 'PATCH', body: JSON.stringify({ estado: estado.value }) }))
  );

  const editar = document.createElement('button');
  editar.className = 'boton-editar';
  editar.type = 'button';
  editar.textContent = '🔒';
  editar.title = 'Editar título';
  editar.addEventListener('click', () => {
    if (titulo.disabled) {
      titulo.disabled = false;
      item.draggable = false;
      titulo.focus();
      editar.textContent = '🔓';
      return;
    }
    const nuevo = titulo.value.trim();
    if (nuevo === t.titulo) return cargar();
    accion(() => pedir(`/tareas/${t.id}`, { method: 'PATCH', body: JSON.stringify({ titulo: nuevo }) }));
  });

  const borrar = document.createElement('button');
  borrar.className = 'boton-remover';
  borrar.type = 'button';
  borrar.textContent = '✕';
  borrar.title = 'Eliminar tarea';
  borrar.addEventListener('click', () => accion(() => pedir(`/tareas/${t.id}`, { method: 'DELETE' })));

  const acciones = document.createElement('div');
  acciones.className = 'acciones';
  acciones.append(estado, editar, borrar);

  item.append(titulo, meta, acciones);
  return item;
}

async function cargar() {
  try {
    const [tareas, resumen] = await Promise.all([pedir('/tareas'), pedir('/reporte')]);
    document.querySelectorAll('.columna').forEach((col) => {
      const lista = col.querySelector('.lista');
      lista.replaceChildren(...tareas.filter((t) => t.estado === col.dataset.estado).map(crearTarjeta));
    });
    const p = resumen.por_estado;
    reporte.textContent = `Total: ${resumen.total} · Por hacer: ${p.ToDo} · En curso: ${p.Doing} · Hecho: ${p.Done}`;
  } catch (err) {
    mostrarError(err);
  }
}

document.querySelectorAll('.columna').forEach((col) => {
  col.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('destino');
  });
  col.addEventListener('dragleave', (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('destino');
  });
  col.addEventListener('drop', (e) => {
    e.preventDefault();
    col.classList.remove('destino');
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    accion(() =>
      pedir(`/tareas/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: col.dataset.estado }) })
    );
  });
});

formulario.addEventListener('submit', (e) => {
  e.preventDefault();
  const titulo = document.querySelector('#titulo').value.trim();
  if (!titulo) return;
  const responsable = document.querySelector('#responsable').value.trim() || null;
  const prioridad = document.querySelector('#prioridad').value;
  accion(async () => {
    await pedir('/tareas', { method: 'POST', body: JSON.stringify({ titulo, responsable, prioridad }) });
    formulario.reset();
  });
});

cargar();
