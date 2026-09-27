import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getRow, getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar ingresos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const incomes = await getAllRows(
      `SELECT i.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              ba.institution_name, ba.account_name
       FROM incomes i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN bank_accounts ba ON i.bank_account_id = ba.id
       WHERE i.user_id = ?
       ORDER BY i.date DESC`,
      [req.user.id]
    );
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los ingresos' });
  }
});

// Registrar ingreso
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, amount, date, category_id, bank_account_id, status, notes, is_recurring, recurrence_period } = req.body;

    if (!title || !amount || !date) {
      return res.status(400).json({ error: 'Título, monto y fecha son requeridos' });
    }

    const incomeId = uuidv4();
    const todayStr = new Date().toISOString().split('T')[0];
    let incomeStatus = 'por_pagar';
    if (date < todayStr) {
      incomeStatus = 'pagado';
    } else if (date === todayStr) {
      incomeStatus = status || 'pagado';
    } else {
      incomeStatus = status === 'pagado' ? 'pagado' : 'por_pagar';
    }
    const recurring = is_recurring ? 1 : 0;
    const period = recurrence_period || 'monthly';

    await runQuery(
      `INSERT INTO incomes (id, user_id, title, amount, date, category_id, bank_account_id, status, notes, is_recurring, recurrence_period)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [incomeId, req.user.id, title.trim(), Number(amount), date, category_id || null, bank_account_id || null, incomeStatus, notes || '', recurring, period]
    );

    res.status(201).json({
      id: incomeId,
      user_id: req.user.id,
      title,
      amount: Number(amount),
      date,
      category_id,
      bank_account_id,
      status: incomeStatus,
      notes,
      is_recurring: recurring,
      recurrence_period: period
    });
  } catch (err) {
    console.error('Error al registrar ingreso:', err);
    res.status(500).json({ error: 'Error al registrar ingreso' });
  }
});

// Actualizar ingreso
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, amount, date, category_id, bank_account_id, status, notes, is_recurring, recurrence_period } = req.body;

    if (!title || !amount || !date) {
      return res.status(400).json({ error: 'Título, monto y fecha son requeridos' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let incomeStatus = 'por_pagar';
    if (date < todayStr) {
      incomeStatus = 'pagado';
    } else if (date === todayStr) {
      incomeStatus = status || 'pagado';
    } else {
      incomeStatus = status === 'pagado' ? 'pagado' : 'por_pagar';
    }
    const recurring = is_recurring ? 1 : 0;
    const period = recurrence_period || 'monthly';

    await runQuery(
      `UPDATE incomes
       SET title = ?, amount = ?, date = ?, category_id = ?, bank_account_id = ?, status = ?, notes = ?, is_recurring = ?, recurrence_period = ?
       WHERE id = ? AND user_id = ?`,
      [
        title.trim(),
        Number(amount),
        date,
        category_id || null,
        bank_account_id || null,
        incomeStatus,
        notes || '',
        recurring,
        period,
        req.params.id,
        req.user.id
      ]
    );

    res.json({ message: 'Ingreso actualizado con éxito' });
  } catch (err) {
    console.error('Error al actualizar ingreso:', err);
    res.status(500).json({ error: 'Error al actualizar el ingreso' });
  }
});

// Cambiar estado de ingreso
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pagado', 'por_pagar'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    await runQuery(
      `UPDATE incomes SET status = ? WHERE id = ? AND user_id = ?`,
      [status, req.params.id, req.user.id]
    );

    res.json({ message: 'Estado del ingreso actualizado', status });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado del ingreso' });
  }
});

// Mover fecha de un ingreso (puntual o cíclico)
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { new_date, mode, original_date } = req.body;
    if (!new_date) {
      return res.status(400).json({ error: 'La nueva fecha es requerida' });
    }

    const incomeId = req.params.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const income = await getRow(`SELECT * FROM incomes WHERE id = ? AND user_id = ?`, [incomeId, req.user.id]);
    if (!income) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    if (income.is_recurring === 1) {
      if (mode === 'cycle') {
        const newDay = new_date.split('-')[2];
        const [y, m] = income.date.split('-');
        const updatedDate = `${y}-${m}-${newDay}`;

        await runQuery(`UPDATE incomes SET date = ? WHERE id = ? AND user_id = ?`, [updatedDate, income.id, req.user.id]);

        const origMonthPrefix = (original_date || new_date).slice(0, 7);
        await runQuery(
          `UPDATE income_installments SET due_date = ? WHERE income_id = ? AND strftime('%Y-%m', due_date) = ?`,
          [new_date, income.id, origMonthPrefix]
        );
      } else {
        const origMonthPrefix = (original_date || new_date).slice(0, 7);
        const existingInst = await getRow(
          `SELECT * FROM income_installments WHERE income_id = ? AND strftime('%Y-%m', due_date) = ?`,
          [income.id, origMonthPrefix]
        );

        if (existingInst) {
          await runQuery(`UPDATE income_installments SET due_date = ? WHERE id = ?`, [new_date, existingInst.id]);
        } else {
          const newInstId = uuidv4();
          const status = new_date < todayStr ? 'pagado' : 'por_pagar';
          const paidDate = status === 'pagado' ? new_date : null;
          await runQuery(
            `INSERT INTO income_installments (id, income_id, amount, due_date, status, paid_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [newInstId, income.id, income.amount, new_date, status, paidDate]
          );
        }
      }
    } else {
      await runQuery(`UPDATE incomes SET date = ? WHERE id = ? AND user_id = ?`, [new_date, income.id, req.user.id]);
    }

    res.json({ message: 'Fecha de ingreso actualizada con éxito' });
  } catch (err) {
    console.error('Error al mover ingreso:', err);
    res.status(500).json({ error: 'Error al mover el ingreso' });
  }
});

// Eliminar ingreso
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM incomes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Ingreso eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar ingreso' });
  }
});

export default router;
