import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format, parseISO } from 'date-fns';
import { runQuery } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Endpoint para importación masiva de ingresos y gastos procesados desde la planilla
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { incomes = [], expenses = [] } = req.body;
    const userId = req.user.id;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    let insertedIncomesCount = 0;
    let insertedExpensesCount = 0;

    // 1. Procesar Ingresos
    for (const inc of incomes) {
      if (!inc.title || !inc.amount || !inc.date) continue;

      const incomeId = uuidv4();
      const amount = Number(inc.amount);
      if (isNaN(amount) || amount <= 0) continue;

      let status = 'por_pagar';
      if (inc.date < todayStr) {
        status = 'pagado';
      } else if (inc.date === todayStr) {
        status = inc.status || 'pagado';
      } else {
        status = inc.status === 'pagado' ? 'pagado' : 'por_pagar';
      }

      await runQuery(
        `INSERT INTO incomes (id, user_id, title, amount, date, category_id, bank_account_id, status, notes, is_recurring, recurrence_period)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          incomeId,
          userId,
          inc.title.trim(),
          amount,
          inc.date,
          inc.category_id || null,
          inc.bank_account_id || null,
          status,
          inc.notes || 'Importado desde planilla 📊',
          inc.is_recurring ? 1 : 0,
          inc.recurrence_period || 'monthly'
        ]
      );
      insertedIncomesCount++;
    }

    // 2. Procesar Gastos y generar cuotas
    for (const exp of expenses) {
      if (!exp.title || !exp.total_amount || !exp.start_date) continue;

      const expenseId = uuidv4();
      const amount = Number(exp.total_amount);
      if (isNaN(amount) || amount <= 0) continue;

      const numInstallments = Math.max(1, parseInt(exp.total_installments) || 1);
      const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;
      const method = exp.payment_method || 'contado';
      const recurring = exp.is_recurring ? 1 : 0;
      const period = exp.recurrence_period || 'monthly';

      await runQuery(
        `INSERT INTO expenses (id, user_id, title, total_amount, payment_method, bank_account_id, category_id, total_installments, start_date, notes, is_recurring, recurrence_period)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expenseId,
          userId,
          exp.title.trim(),
          amount,
          method,
          exp.bank_account_id || null,
          exp.category_id || null,
          numInstallments,
          exp.start_date,
          exp.notes || 'Importado desde planilla 📊',
          recurring,
          period
        ]
      );

      if (!recurring) {
        let startDateObj;
        try {
          startDateObj = parseISO(exp.start_date);
        } catch (e) {
          startDateObj = new Date();
        }

        for (let i = 1; i <= numInstallments; i++) {
          const installmentId = uuidv4();
          const dueDate = format(addMonths(startDateObj, i - 1), 'yyyy-MM-dd');

          let instStatus = 'por_pagar';
          let paidDate = null;

          if (dueDate < todayStr) {
            instStatus = 'pagado';
            paidDate = dueDate;
          } else if (dueDate === todayStr && exp.initial_status) {
            instStatus = exp.initial_status;
            if (instStatus === 'pagado') paidDate = todayStr;
          } else {
            instStatus = 'por_pagar';
          }

          await runQuery(
            `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [installmentId, expenseId, i, numInstallments, installmentAmount, dueDate, instStatus, paidDate]
          );
        }
      } else {
        const installmentId = uuidv4();
        const isPast = exp.start_date < todayStr;
        const isToday = exp.start_date === todayStr;
        const instStatus = isPast ? 'pagado' : (isToday ? (exp.initial_status || 'por_pagar') : 'por_pagar');
        const paidDate = instStatus === 'pagado' ? (isPast ? exp.start_date : todayStr) : null;

        await runQuery(
          `INSERT INTO expense_installments (id, expense_id, installment_number, total_installments, amount, due_date, status, paid_date)
           VALUES (?, ?, 1, 1, ?, ?, ?, ?)`,
          [installmentId, expenseId, amount, exp.start_date, instStatus, paidDate]
        );
      }

      insertedExpensesCount++;
    }

    res.status(201).json({
      message: 'Importación masiva completada con éxito ✨',
      insertedIncomes: insertedIncomesCount,
      insertedExpenses: insertedExpensesCount
    });
  } catch (err) {
    console.error('Error al importar datos masivamente:', err);
    res.status(500).json({ error: 'Error al realizar la importación masiva' });
  }
});

export default router;
