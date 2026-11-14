const app = require('./app');
const { inicializar } = require('./db');

const puerto = Number(process.env.PORT) || 3000;

inicializar()
  .then(() => app.listen(puerto, () => console.log(`API escuchando en el puerto ${puerto}`)))
  .catch((err) => {
    console.error('No se pudo inicializar la base:', err.message);
    process.exit(1);
  });
