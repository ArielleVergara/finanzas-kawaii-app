/**
 * Antigravity - Utility de Seguridad Frontend (OWASP MASVS Compliant)
 * 
 * Proporciona funciones de sanitización, filtrado de caracteres maliciosos,
 * prevención de inyección y comprobación de contraseñas para los componentes React.
 */

/**
 * Escapa caracteres HTML para evitar que el usuario inyecte scripts o código malicioso en la interfaz.
 * @param {string} str Texto ingresado por el usuario
 * @returns {string} Texto seguro
 */
export const escapeHTML = (str) => {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza una cadena eliminando scripts, event handlers y caracteres de control peligrosos.
 * @param {string} str Texto del input
 * @param {number} maxLen Límite de caracteres
 * @returns {string} Texto sanitizado
 */
export const sanitizeInput = (str, maxLen = 250) => {
  if (typeof str !== 'string') return '';
  
  // Limpiar bytes nulos y recortar
  let clean = str.replace(/\0/g, '');

  // Truncar a la longitud máxima permitida
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }

  // Filtrar intentos de inyección de código o scripts
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b/gi, '')
    .replace(/<object\b/gi, '');

  return clean;
};

/**
 * Evalúa la fortaleza de una contraseña y retorna recomendaciones de seguridad.
 * @param {string} password 
 * @returns {{ score: number, label: string, isStrong: boolean, feedback: string[] }}
 */
export const checkPasswordSecurity = (password) => {
  const feedback = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: 'Vacía', isStrong: false, feedback: ['Ingresa una contraseña.'] };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Mínimo 8 caracteres.');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Incluye al menos una letra mayúscula (A-Z).');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Incluye al menos una letra minúscula (a-z).');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Incluye al menos un número (0-9).');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Incluye un símbolo especial (!@#$%^&*).');
  }

  let label = 'Muy Débil 🔴';
  if (score === 3 || score === 4) label = 'Aceptable 🟡';
  if (score === 5) label = 'Fuerte 🌸';

  return {
    score,
    label,
    isStrong: score >= 4,
    feedback
  };
};
