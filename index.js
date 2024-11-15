const express = require('express');
const bodyParser = require('body-parser');
const wpRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Rutas principales
app.use('/api/wp', wpRoutes);

app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

// Levanta el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
