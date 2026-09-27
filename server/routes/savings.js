import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar fuentes de ahorro y total acumulado
router.get('/', authenticateToken, async (req, res) => {
  try {
    const savings = await getAllRows(
      'SELECT * FROM savings_sources WHERE user_id = ? ORDER BY amount DESC',
      [req.user.id]
    );
    const totalSavings = savings.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    res.json({ sources: savings, total: totalSavings });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener fuentes de ahorro' });
  }
});

// Agregar fuente de ahorro
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { institution_name, account_name, amount, color, icon, notes } = req.body;

    if (!institution_name || !account_name) {
      return res.status(400).json({ error: 'La institución financiera y el nombre de la cuenta son requeridos' });
    }

    const savingId = uuidv4();
    const saveColor = color || '#D1F2E2';
    const saveIcon = icon || 'piggy-bank';

    await runQuery(
      `INSERT INTO savings_sources (id, user_id, institution_name, account_name, amount, color, icon, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [savingId, req.user.id, institution_name.trim(), account_name.trim(), Number(amount) || 0, saveColor, saveIcon, notes || '']
    );

    res.status(201).json({ id: savingId, user_id: req.user.id, institution_name, account_name, amount: Number(amount) || 0, color: saveColor, icon: saveIcon, notes });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar fuente de ahorro' });
  }
});

// Actualizar fuente de ahorro
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { institution_name, account_name, amount, color, icon, notes } = req.body;

    await runQuery(
      `UPDATE savings_sources
       SET institution_name = ?, account_name = ?, amount = ?, color = ?, icon = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [institution_name, account_name, Number(amount) || 0, color, icon, notes, req.params.id, req.user.id]
    );

    res.json({ message: 'Fuente de ahorro actualizada con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar fuente de ahorro' });
  }
});

// Eliminar fuente de ahorro
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM savings_sources WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Fuente de ahorro eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar fuente de ahorro' });
  }
});

export default router;
