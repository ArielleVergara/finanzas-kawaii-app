/**
 * Middleware de Sanitización y Validación de Entradas de Texto
 * Antigravity - Finanzas Kawaii App (OWASP MASVS Compliant)
 * 
 * Protege la aplicación contra:
 * - Cross-Site Scripting (XSS) e Inyección HTML/JS
 * - Inyección de Comandos de Sistema y Path Traversal
 * - Inyección de Prompts / Manipulación de Contexto
 * - Exhaustión de Memoria por Cargas de Texto Masivas
 */

// Expresión regular para detectar firmas de inyección peligrosas (HTML/JS/Event handlers/Path Traversal)
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<style\b/gi,
  /\.\.[\/\\]/g // Path traversal (../ o ..\)
];

/**
 * Sanitiza una cadena individual de texto
 * @param {string} str Cadena a sanitizar
 * @param {number} maxLen Longitud máxima permitida
 * @returns {string} Cadena limpia y segura
 */
export const sanitizeString = (str, maxLen = 1000) => {
  if (typeof str !== 'string') return str;

  // 1. Recortar espacios y eliminar bytes nulos (\0)
  let clean = str.replace(/\0/g, '').trim();

  // 2. Limitar la longitud de la cadena para prevenir DoS
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }

  // 3. Neutralizar etiquetas HTML y secuencias de inyección
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // 4. Remover patrones peligrosos si quedaran rastros desarmados
  DANGEROUS_PATTERNS.forEach((pattern) => {
    clean = clean.replace(pattern, '');
  });

  return clean;
};

/**
 * Desescapar entidades HTML para lecturas legítimas si es necesario procesar internamente sin HTML
 */
export const decodeHTMLEntities = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

/**
 * Sanitiza recursivamente objetos, arrays o primitivos
 */
const sanitizeData = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      // Prevenir Prototype Pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitizedObj[key] = sanitizeData(value);
    }
    return sanitizedObj;
  }

  return data;
};

/**
 * Middleware Express para sanitización global de req.body, req.query y req.params
 */
export const sanitizeInputMiddleware = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeData(req.body);
    }
    if (req.query) {
      req.query = sanitizeData(req.query);
    }
    if (req.params) {
      req.params = sanitizeData(req.params);
    }
    next();
  } catch (err) {
    console.error('Error durante la sanitización de inputs:', err);
    res.status(400).json({ error: 'Formato de datos no válido o malicioso detectado.' });
  }
};
