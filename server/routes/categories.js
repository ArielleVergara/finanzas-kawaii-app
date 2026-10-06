import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener todas las categorías del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await getAllRows(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC',
      [req.user.id]
    );
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clasificaciones de gastos/ingresos' });
  }
});

// Crear una categoría personalizada
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'El nombre y el tipo de categoría son obligatorios' });
    }

    const catId = uuidv4();
    const catIcon = icon || 'tag';
    const catColor = color || '#FFD6E8';

    await runQuery(
      `INSERT INTO categories (id, user_id, name, type, icon, color, is_default)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [catId, req.user.id, name.trim(), type, catIcon, catColor]
    );

    const createdCat = { id: catId, user_id: req.user.id, name: name.trim(), type, icon: catIcon, color: catColor, is_default: 0 };
    res.status(201).json(createdCat);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Editar categoría personalizada o predeterminada
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    await runQuery(
      `UPDATE categories
       SET name = ?, type = ?, icon = ?, color = ?
       WHERE id = ? AND user_id = ?`,
      [name.trim(), type || 'expense', icon || 'tag', color || '#FFD6E8', req.params.id, req.user.id]
    );

    res.json({ message: 'Categoría actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
});

// Eliminar categoría personalizada
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

export default router;
