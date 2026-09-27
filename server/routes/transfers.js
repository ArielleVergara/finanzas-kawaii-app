import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows, getRow } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar transferencias a ahorros entre cuentas del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const transfers = await getAllRows(
      `SELECT t.*,
              sa.institution_name as source_institution, sa.account_name as source_account_name,
              da.institution_name as destination_institution, da.account_name as destination_account_name
       FROM transfers t
       JOIN bank_accounts sa ON t.source_account_id = sa.id
       JOIN bank_accounts da ON t.destination_account_id = da.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC`,
      [req.user.id]
    );
    res.json(transfers);
  } catch (err) {
    console.error('Error al obtener transferencias:', err);
    res.status(500).json({ error: 'Error al obtener historial de transferencias a ahorros' });
  }
});

// Registrar transferencia / aporte a ahorro (Mover dinero de líquida a ahorro)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { source_account_id, destination_account_id, amount, date, notes } = req.body;

    if (!source_account_id || !destination_account_id || !amount || !date) {
      return res.status(400).json({ error: 'Todos los campos requeridos deben ser completados' });
    }

    if (source_account_id === destination_account_id) {
      return res.status(400).json({ error: 'La cuenta de origen y de destino no pueden ser la misma' });
    }

    const transferAmount = Number(amount);
    if (transferAmount <= 0) {
      return res.status(400).json({ error: 'El monto a transferir debe ser mayor a 0' });
    }

    // Verificar cuentas del usuario
    const sourceAcc = await getRow('SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?', [source_account_id, req.user.id]);
    const destAcc = await getRow('SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?', [destination_account_id, req.user.id]);

    if (!sourceAcc || !destAcc) {
      return res.status(404).json({ error: 'Una o ambas cuentas no fueron encontradas' });
    }

    const transferId = uuidv4();

    // 1. Restar del balance disponible de origen
    await runQuery(
      `UPDATE bank_accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [transferAmount, source_account_id]
    );

    // 2. Sumar al balance de ahorro de destino
    await runQuery(
      `UPDATE bank_accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [transferAmount, destination_account_id]
    );

    // 3. Insertar registro de transferencia
    await runQuery(
      `INSERT INTO transfers (id, user_id, source_account_id, destination_account_id, amount, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transferId, req.user.id, source_account_id, destination_account_id, transferAmount, date, notes || '']
    );

    res.status(201).json({
      message: '¡Aporte a ahorro registrado con éxito! 🌸',
      id: transferId,
      amount: transferAmount,
      source_account: sourceAcc.account_name,
      destination_account: destAcc.account_name
    });
  } catch (err) {
    console.error('Error al registrar transferencia a ahorro:', err);
    res.status(500).json({ error: 'Error al procesar la transferencia a ahorro' });
  }
});

// Revertir y eliminar transferencia a ahorro
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transfer = await getRow('SELECT * FROM transfers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (!transfer) {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }

    // Revertir saldos
    await runQuery(`UPDATE bank_accounts SET balance = balance + ? WHERE id = ?`, [transfer.amount, transfer.source_account_id]);
    await runQuery(`UPDATE bank_accounts SET balance = balance - ? WHERE id = ?`, [transfer.amount, transfer.destination_account_id]);

    // Eliminar registro
    await runQuery('DELETE FROM transfers WHERE id = ?', [req.params.id]);

    res.json({ message: 'Transferencia a ahorro revertida y eliminada' });
  } catch (err) {
    console.error('Error al eliminar transferencia:', err);
    res.status(500).json({ error: 'Error al revertir transferencia' });
  }
});

export default router;
