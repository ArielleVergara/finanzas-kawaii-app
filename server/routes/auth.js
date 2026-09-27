import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getRow } from '../db/database.js';
import { seedDefaultCategories } from '../db/defaultCategories.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kawaii_finanzas_secret_key_2026_super_secure';

/**
 * Validador de Fortaleza de Contraseñas (OWASP MASVS MASVS-AUTH)
 */
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return 'La contraseña debe contener al menos 8 caracteres.';
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || (!hasNumber && !hasSpecial)) {
    return 'La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número o símbolo especial.';
  }
  return null;
};

// Registro de usuario con rate limit y validación de contraseña
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { email, password, name, avatar } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Todos los campos requeridos deben ser completados' });
    }

    const emailClean = email.toLowerCase().trim();
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
    }

    // Validar fortaleza de la contraseña
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existingUser = await getRow('SELECT id FROM users WHERE email = ?', [emailClean]);
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado' });
    }

    const userId = uuidv4();
    // bcrypt con costo 10
    const passwordHash = await bcrypt.hash(password, 10);
    const userAvatar = avatar || 'bunny';

    await runQuery(
      `INSERT INTO users (id, email, password_hash, name, avatar) VALUES (?, ?, ?, ?, ?)`,
      [userId, emailClean, passwordHash, name.trim(), userAvatar]
    );

    // Cargar categorías por defecto para el nuevo usuario
    await seedDefaultCategories(userId);

    const token = jwt.sign({ id: userId, email: emailClean, name: name.trim() }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: '¡Cuenta registrada con éxito! 🌸',
      token,
      user: { id: userId, email: emailClean, name: name.trim(), avatar: userAvatar }
    });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor al procesar el registro' });
  }
});

// Inicio de sesión con rate limit
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Debes proporcionar correo y contraseña' });
    }

    const emailClean = email.toLowerCase().trim();
    const user = await getRow('SELECT * FROM users WHERE email = ?', [emailClean]);
    
    // Evitar temporización / username enumeration usando respuesta genérica constante
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '¡Bienvenido de nuevo! 🌸',
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error interno al procesar el inicio de sesión' });
  }
});

// Perfil de usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getRow('SELECT id, email, name, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener datos del usuario' });
  }
});

export default router;
