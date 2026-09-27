import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { sanitizeInputMiddleware } from './middleware/sanitizeInput.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import bankAccountsRoutes from './routes/bankAccounts.js';
import transfersRoutes from './routes/transfers.js';
import incomesRoutes from './routes/incomes.js';
import expensesRoutes from './routes/expenses.js';
import calendarRoutes from './routes/calendar.js';
import analyticsRoutes from './routes/analytics.js';
import importRoutes from './routes/importRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de Seguridad OWASP MASVS con Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: 'deny' }, // Protección contra Clickjacking
    noSniff: true // Protección contra MIME sniffing
  })
);

// Ocultar cabecera X-Powered-By para evitar enumeración de tecnologías
app.disable('x-powered-by');

// Restringir CORS
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true, // Permite mismo origen y solicitudes locales seguras
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Limitar tamaño máximo del Body para prevenir DoS / Payload demasiado grande
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Middleware global de sanitización de entradas contra XSS e inyecciones
app.use(sanitizeInputMiddleware);

// Middleware global de Rate Limiting para APIs
app.use('/api', apiRateLimiter);

// Inicializar base de datos SQLite con tablas seguras
await initDatabase();

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/bank-accounts', bankAccountsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);

// Servir cliente estático en producción
const clientDist = path.join(__dirname, '../dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('Finanzas Kawaii Backend Server is running! 🌸');
      }
    });
  }
});

// Manejador central de errores para evitar fugas de información interna (OWASP MASVS MASVS-CODE)
app.use((err, req, res, next) => {
  console.error('⚠️ [Server Error Log]:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: 'Ha ocurrido un error en el servidor. Intenta de nuevo más tarde 🌸'
  });
});

app.listen(PORT, () => {
  console.log(`🌸 Servidor Finanzas Kawaii ejecutándose de manera segura en http://localhost:${PORT}`);
});
