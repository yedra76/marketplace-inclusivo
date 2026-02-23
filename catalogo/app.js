const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Datos simulados de productos
const products = [
  { id: 1, name: 'Producto 1', price: 10.99, stock: 100 },
  { id: 2, name: 'Producto 2', price: 20.50, stock: 50 }
];

app.get('/', (req, res) => {
  res.send('Microservicio de Catálogo');
});

// Ruta interna para obtener precio y stock de un producto
app.get('/internal/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json({ price: product.price, stock: product.stock });
});

// Ruta interna para reservar stock
app.post('/internal/reserve', (req, res) => {
  const { product_id, quantity } = req.body;
  const product = products.find(p => p.id == product_id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Stock insuficiente' });
  }
  product.stock -= quantity;
  res.status(200).json({ message: 'Reserva exitosa' });
});

app.listen(port, () => {
  console.log(`Catálogo corriendo en puerto ${port}`);
});