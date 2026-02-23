const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(express.json());

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'db',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// Inicializar base de datos
const initDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await pool.query(query);
    console.log('Tabla orders creada o ya existe');
  } catch (error) {
    console.error('Error creando tabla:', error);
  }
};

// Función central para crear una orden
async function createOrder(productId, quantity) {
  try {
    // Llamada sincrónica de consulta: obtener precio y stock
    const response = await axios.get(`http://catalogo:3000/internal/products/${productId}`);
    const { price, stock } = response.data;

    if (stock < quantity) {
      throw new Error('Stock insuficiente');
    }

    // Llamada sincrónica de reserva: decrementar stock
    await axios.post('http://catalogo:3000/internal/reserve', { product_id: productId, quantity });

    // Calcular total
    const total = price * quantity;

    // Guardar en base de datos local
    const query = 'INSERT INTO orders (product_id, quantity, price, total) VALUES ($1, $2, $3, $4) RETURNING id';
    const values = [productId, quantity, price, total];
    const result = await pool.query(query, values);

    return result.rows[0].id;
  } catch (error) {
    throw error;
  }
}

app.get('/', (req, res) => {
  res.send('Microservicio de Órdenes');
});

// Ruta para crear una orden
app.post('/orders', async (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Campos product_id y quantity son requeridos, quantity debe ser positivo' });
  }

  try {
    const orderId = await createOrder(product_id, quantity);
    res.status(201).json({ order_id: orderId, message: 'Orden creada exitosamente' });
  } catch (error) {
    if (error.message === 'Stock insuficiente') {
      res.status(400).json({ error: 'Stock insuficiente para el producto solicitado' });
    } else if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Producto no encontrado' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Inicializar DB y iniciar servidor
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Órdenes corriendo en puerto ${port}`);
  });
});