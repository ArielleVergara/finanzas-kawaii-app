import rateLimit from 'express-rate-limit';

/**
 * Rate limiter estricto para autenticación (Login y Registro)
 * Previene ataques de fuerza bruta y credential stuffing.
 * Permite máximo 5 intentos cada 15 minutos por IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de acceso desde esta IP. Por seguridad, intente nuevamente en 15 minutos 🌸'
  }
});

/**
 * Rate limiter general para la API
 * Protege contra Denegación de Servicio (DoS).
 * Permite máximo 150 peticiones cada 15 minutos por IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 solicitudes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Has realizado demasiadas solicitudes en poco tiempo. Por favor espera un momento 🌸'
  }
});
