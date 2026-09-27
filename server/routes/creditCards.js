import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar tarjetas de crédito
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cards = await getAllRows('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY card_name ASC', [req.user.id]);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tarjetas de crédito' });
  }
});

// Agregar tarjeta de crédito
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { card_name, bank_name, last_four, credit_limit, closing_day, due_day, color } = req.body;

    if (!card_name) {
      return res.status(400).json({ error: 'El nombre de la tarjeta es requerido' });
    }

    const cardId = uuidv4();
    const cardColor = color || '#E3D5FF';

    await runQuery(
      `INSERT INTO credit_cards (id, user_id, card_name, bank_name, last_four, credit_limit, closing_day, due_day, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cardId, req.user.id, card_name.trim(), bank_name || '', last_four || '', credit_limit || 0, closing_day || 1, due_day || 10, cardColor]
    );

    const card = { id: cardId, user_id: req.user.id, card_name: card_name.trim(), bank_name, last_four, credit_limit, closing_day, due_day, color: cardColor };
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar tarjeta de crédito' });
  }
});

// Eliminar tarjeta
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM credit_cards WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Tarjeta de crédito eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la tarjeta' });
  }
});

export default router;
