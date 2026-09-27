import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';
import { runQuery, getAllRows, getRow } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar gastos con sus cuotas y detalles de cuenta bancaria y categoría
router.get('/', authenticateToken, async (req, res) => {
  try {
    const expenses = await getAllRows(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              ba.institution_name, ba.account_name, ba.color as account_color, ba.has_credit_card
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       LEFT JOIN bank_accounts ba ON e.bank_account_id = ba.id
       WHERE e.user_id = ?
       ORDER BY e.start_date DESC`,
      [req.user.id]
    );

    // Adjuntar cuotas a cada gasto
    for (const exp of expenses) {
      exp.installments = await getAllRows(
        `SELECT * FROM expense_installments WHERE expense_id = ? ORDER BY installment_number ASC`,
        [exp.id]
      );
    }

    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos:', err);
    res.status(500).json({ error: 'Error al obtener listado de gastos' });
  }
});

// Registrar gasto (al contado, cuotas con tarjeta de crédito o cíclico)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, total_amount, payment_method, bank_account_id, category_id, total_installments, start_date, notes, initial_status, is_recurring, recurrence_period } = req.body;

    if (!title || !total_amount || !start_date) {
      return res.status(400).json({ error: 'Título, monto y fecha de inicio son obligatorios' });
    }

    const expenseId = uuidv4();
    const numInstallments = Math.max(1, parseInt(total_installments) || 1);
    const amount = Number(total_amount);
    const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;
    const method = payment_method || 'contado';
    const recurring = is_recurring ? 1 : 0;
    const period = recurrence_period || 'monthly';

    await runQuery(
      `INSERT INTO expenses (id, user_id, title, total_amount, payment_method, bank_account_id, category_id, total_installments, start_date, notes, is_recurring, recurrence_period)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [expenseId, req.user.id, title.trim(), amount, method, bank_account_id || null, category_id || null, numInstallments, start_date, notes || '', recurring, period]
    );

    // Si no es un gasto recurrente infinito, generar sus cuotas regulares
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!recurring) {
      const startDateObj = parseISO(start_date);
      for (let i = 1; i <= numInstallments; i++) {
        const installmentId = uuidv4();
        const dueDate = format(addMonths(startDateObj, i - 1), 'yyyy-MM-dd');
        
        let status = 'por_pagar';
        let paidDate = null;

        if (dueDate < todayStr) {
          status = 'pagado';
          paidDate = dueDate;
        } else if (dueDate === todayStr && initial_status) {
          status = initial_status;
          if (status === 'pagado') paidDate = todayStr;
        } else {
          status = 'por_pagar';
        }

        await runQuery(
          `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [installmentId, expenseId, i, numInstallments, installmentAmount, dueDate, status, paidDate]
        );
      }
    } else {
      // Para gastos recurrentes, crear la cuota base del primer período
      const installmentId = uuidv4();
      const isPast = start_date < todayStr;
      const isToday = start_date === todayStr;
      const status = isPast ? 'pagado' : (isToday ? (initial_status || 'por_pagar') : 'por_pagar');
      const paidDate = status === 'pagado' ? (isPast ? start_date : todayStr) : null;

      await runQuery(
        `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
         VALUES (?, ?, 1, 1, ?, ?, ?, ?)`,
        [installmentId, expenseId, amount, start_date, status, paidDate]
      );
    }

    res.status(201).json({
      id: expenseId,
      user_id: req.user.id,
      title,
      total_amount: amount,
      payment_method: method,
      total_installments: numInstallments,
      start_date,
      is_recurring: recurring,
      recurrence_period: period
    });
  } catch (err) {
    console.error('Error al crear gasto:', err);
    res.status(500).json({ error: 'Error al registrar el gasto' });
  }
});

// Actualizar gasto completo y sus cuotas
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, total_amount, payment_method, bank_account_id, category_id, total_installments, start_date, notes, initial_status, is_recurring, recurrence_period } = req.body;

    if (!title || !total_amount || !start_date) {
      return res.status(400).json({ error: 'Título, monto y fecha de inicio son obligatorios' });
    }

    const expenseId = req.params.id;
    const existing = await getRow('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [expenseId, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const numInstallments = Math.max(1, parseInt(total_installments) || 1);
    const amount = Number(total_amount);
    const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;
    const method = payment_method || 'contado';
    const recurring = is_recurring ? 1 : 0;
    const period = recurrence_period || 'monthly';
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    await runQuery(
      `UPDATE expenses
       SET title = ?, total_amount = ?, payment_method = ?, bank_account_id = ?, category_id = ?, total_installments = ?, start_date = ?, notes = ?, is_recurring = ?, recurrence_period = ?
       WHERE id = ? AND user_id = ?`,
      [title.trim(), amount, method, bank_account_id || null, category_id || null, numInstallments, start_date, notes || '', recurring, period, expenseId, req.user.id]
    );

    // Borrar cuotas antiguas y regenerar
    await runQuery('DELETE FROM expense_installments WHERE expense_id = ?', [expenseId]);

    if (!recurring) {
      const startDateObj = parseISO(start_date);
      for (let i = 1; i <= numInstallments; i++) {
        const installmentId = uuidv4();
        const dueDate = format(addMonths(startDateObj, i - 1), 'yyyy-MM-dd');

        let status = 'por_pagar';
        let paidDate = null;

        if (dueDate < todayStr) {
          status = 'pagado';
          paidDate = dueDate;
        } else if (dueDate === todayStr && initial_status) {
          status = initial_status;
          if (status === 'pagado') paidDate = todayStr;
        } else {
          status = 'por_pagar';
        }

        await runQuery(
          `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [installmentId, expenseId, i, numInstallments, installmentAmount, dueDate, status, paidDate]
        );
      }
    } else {
      const installmentId = uuidv4();
      const isPast = start_date < todayStr;
      const isToday = start_date === todayStr;
      const status = isPast ? 'pagado' : (isToday ? (initial_status || 'por_pagar') : 'por_pagar');
      const paidDate = status === 'pagado' ? (isPast ? start_date : todayStr) : null;

      await runQuery(
        `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
         VALUES (?, ?, 1, 1, ?, ?, ?, ?)`,
        [installmentId, expenseId, amount, start_date, status, paidDate]
      );
    }

    res.json({ message: 'Gasto y cuotas actualizados correctamente' });
  } catch (err) {
    console.error('Error al actualizar gasto:', err);
    res.status(500).json({ error: 'Error al actualizar el gasto' });
  }
});

// Cambiar estado de una cuota individual (Pagado / Por pagar)
router.patch('/installments/:installmentId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pagado', 'por_pagar'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    let installment = await getRow(
      `SELECT ei.*, e.user_id FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       WHERE ei.id = ? AND e.user_id = ?`,
      [req.params.installmentId, req.user.id]
    );

    const paidDate = status === 'pagado' ? format(new Date(), 'yyyy-MM-dd') : null;

    if (!installment) {
      // Fallback: verificar si es el ID de un gasto (p.ej. gasto cíclico)
      const expense = await getRow(`SELECT * FROM expenses WHERE id = ? AND user_id = ?`, [req.params.installmentId, req.user.id]);
      if (expense) {
        const targetDueDate = req.body.due_date || req.body.date || expense.start_date;
        const existingInstForDate = await getRow(
          `SELECT * FROM expense_installments WHERE expense_id = ? AND due_date = ?`,
          [expense.id, targetDueDate]
        );
        if (existingInstForDate) {
          await runQuery(`UPDATE expense_installments SET status = ?, paid_date = ? WHERE id = ?`, [status, paidDate, existingInstForDate.id]);
          return res.json({ message: 'Estado actualizado correctamente', status, paidDate });
        } else {
          // Crear la cuota para esa fecha específica si no existía
          const newInstId = uuidv4();
          await runQuery(
            `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
             VALUES (?, ?, 1, 1, ?, ?, ?, ?)`,
            [newInstId, expense.id, expense.total_amount, targetDueDate, status, paidDate]
          );
          return res.json({ message: 'Estado actualizado correctamente', status, paidDate });
        }
      }
      return res.status(404).json({ error: 'Cuota no encontrada o sin permisos' });
    }

    await runQuery(
      `UPDATE expense_installments SET status = ?, paid_date = ? WHERE id = ?`,
      [status, paidDate, req.params.installmentId]
    );

    res.json({ message: 'Estado de cuota actualizado correctamente', status, paidDate });
  } catch (err) {
    console.error('Error al actualizar estado de cuota:', err);
    res.status(500).json({ error: 'Error al actualizar estado de la cuota' });
  }
});

// Mover fecha de un gasto (puntual o cíclico)
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { new_date, mode, original_date } = req.body;
    if (!new_date) {
      return res.status(400).json({ error: 'La nueva fecha es requerida' });
    }

    const expenseId = req.params.id;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Verificar si es un ID de gasto o de cuota
    let expense = await getRow(`SELECT * FROM expenses WHERE id = ? AND user_id = ?`, [expenseId, req.user.id]);
    let installment = null;

    if (!expense) {
      installment = await getRow(
        `SELECT ei.*, e.user_id FROM expense_installments ei
         JOIN expenses e ON ei.expense_id = e.id
         WHERE ei.id = ? AND e.user_id = ?`,
        [expenseId, req.user.id]
      );
      if (installment) {
        expense = await getRow(`SELECT * FROM expenses WHERE id = ?`, [installment.expense_id]);
      }
    }

    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (expense.is_recurring === 1) {
      if (mode === 'cycle') {
        const newDay = new_date.split('-')[2];
        const [y, m] = expense.start_date.split('-');
        const updatedStartDate = `${y}-${m}-${newDay}`;

        await runQuery(`UPDATE expenses SET start_date = ? WHERE id = ? AND user_id = ?`, [updatedStartDate, expense.id, req.user.id]);

        const origMonthPrefix = (original_date || new_date).slice(0, 7);
        await runQuery(
          `UPDATE expense_installments SET due_date = ? WHERE expense_id = ? AND strftime('%Y-%m', due_date) = ?`,
          [new_date, expense.id, origMonthPrefix]
        );
      } else {
        const origMonthPrefix = (original_date || new_date).slice(0, 7);
        const existingInst = await getRow(
          `SELECT * FROM expense_installments WHERE expense_id = ? AND strftime('%Y-%m', due_date) = ?`,
          [expense.id, origMonthPrefix]
        );

        if (existingInst) {
          await runQuery(`UPDATE expense_installments SET due_date = ? WHERE id = ?`, [new_date, existingInst.id]);
        } else {
          const newInstId = uuidv4();
          const status = new_date < todayStr ? 'pagado' : 'por_pagar';
          const paidDate = status === 'pagado' ? new_date : null;
          await runQuery(
            `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
             VALUES (?, ?, 1, 1, ?, ?, ?, ?)`,
            [newInstId, expense.id, expense.total_amount, new_date, status, paidDate]
          );
        }
      }
    } else {
      if (installment) {
        await runQuery(`UPDATE expense_installments SET due_date = ? WHERE id = ?`, [new_date, installment.id]);
      } else {
        await runQuery(`UPDATE expenses SET start_date = ? WHERE id = ? AND user_id = ?`, [new_date, expense.id, req.user.id]);
        await runQuery(`UPDATE expense_installments SET due_date = ? WHERE expense_id = ?`, [new_date, expense.id]);
      }
    }

    res.json({ message: 'Fecha de gasto actualizada con éxito' });
  } catch (err) {
    console.error('Error al mover gasto:', err);
    res.status(500).json({ error: 'Error al mover el gasto' });
  }
});

// Eliminar un gasto completo y todas sus cuotas asociadas
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Gasto y cuotas asociadas eliminadas' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el gasto' });
  }
});

export default router;
