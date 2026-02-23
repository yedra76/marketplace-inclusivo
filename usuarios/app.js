const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Microservicio de Usuarios');
});

app.post('/validate-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = authHeader.substring(7);
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

app.listen(port, () => {
  console.log(`Usuarios corriendo en puerto ${port}`);
});