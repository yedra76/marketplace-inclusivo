const express = require('express');
const amqp = require('amqplib');
const { Pool } = require('pg');

const app = express();
const port = 3003;

app.use(express.json());

// Configuración de PostgreSQL
const pool = new Pool({
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Función para conectar a RabbitMQ y consumir mensajes
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect('amqp://rabbitmq');
    const channel = await connection.createChannel();
    const queue = 'order_events';

    await channel.assertQueue(queue, { durable: true });
    console.log('Esperando mensajes en la cola order_events...');

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());
        console.log('Mensaje recibido:', message);

        // Procesar el pago: guardar en la base de datos
        await savePayment(message);

        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Error conectando a RabbitMQ:', error);
  }
}

// Función para guardar el registro de pago en PostgreSQL
async function savePayment(orderData) {
  try {
    const query = 'INSERT INTO payments (order_id, amount, status, created_at) VALUES ($1, $2, $3, NOW())';
    const values = [orderData.order_id, orderData.amount, 'processed'];
    await pool.query(query, values);
    console.log('Pago guardado para orden:', orderData.order_id);
  } catch (error) {
    console.error('Error guardando pago:', error);
  }
}

// Iniciar conexiones
connectRabbitMQ();

app.get('/', (req, res) => {
  res.send('Microservicio de Pagos');
});

app.listen(port, () => {
  console.log(`Pagos corriendo en puerto ${port}`);
});