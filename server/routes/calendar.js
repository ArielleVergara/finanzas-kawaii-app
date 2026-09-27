import express from 'express';
import { getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseISO, format, addDays, getDaysInMonth, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';

const router = express.Router();

// Eventos del calendario para un mes y año específicos (incluye puntuales y cíclicos)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const monthStr = month.toString().padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(new Date(year, month - 1, 1));
    const daysInCurrentMonth = getDaysInMonth(monthStart);

    // 1. Ingresos Puntuales del mes
    const incomes = await getAllRows(
      `SELECT i.id, i.title, i.amount, i.date, i.category_id, i.bank_account_id, i.status, i.notes, i.is_recurring, i.recurrence_period,
              'income' as type,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM incomes i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.user_id = ? AND (i.is_recurring = 0 OR i.is_recurring IS NULL) AND strftime('%Y-%m', i.date) = ?
       ORDER BY i.date ASC`,
      [req.user.id, datePrefix]
    );

    // 2. Ingresos Cíclicos / Recurrentes activos
    const recurringIncomes = await getAllRows(
      `SELECT i.id, i.title, i.amount, i.date, i.category_id, i.bank_account_id, i.status, i.notes, i.is_recurring, i.recurrence_period,
              'income' as type,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM incomes i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.user_id = ? AND i.is_recurring = 1 AND i.date <= ?`,
      [req.user.id, format(monthEnd, 'yyyy-MM-dd')]
    );

    const allIncomeInstallments = await getAllRows(
      `SELECT ii.* FROM income_installments ii
       JOIN incomes i ON ii.income_id = i.id
       WHERE i.user_id = ?`,
      [req.user.id]
    );

    // 3. Cuotas de Gastos Puntuales y con Tarjeta del mes
    const installments = await getAllRows(
      `SELECT ei.id as installment_id, ei.installment_number, ei.total_installments,
              ei.amount, ei.due_date as date, ei.status,
              e.id as expense_id, e.title as expense_title, e.total_amount, e.payment_method, e.category_id, e.bank_account_id, e.notes, e.is_recurring, e.recurrence_period, e.start_date,
              'expense' as type,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              cc.card_name, cc.bank_name
       FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id
       WHERE e.user_id = ? AND (e.is_recurring = 0 OR e.is_recurring IS NULL) AND strftime('%Y-%m', ei.due_date) = ?
       ORDER BY ei.due_date ASC`,
      [req.user.id, datePrefix]
    );

    // 4. Gastos Cíclicos / Recurrentes activos
    const recurringExpenses = await getAllRows(
      `SELECT e.id as expense_id, e.title, e.total_amount as amount, e.start_date as date, e.payment_method, e.category_id, e.bank_account_id, e.notes, e.is_recurring, e.recurrence_period,
              'expense' as type,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND e.is_recurring = 1 AND e.start_date <= ?`,
      [req.user.id, format(monthEnd, 'yyyy-MM-dd')]
    );

    const events = [];

    // Agregar Ingresos Puntuales
    incomes.forEach((inc) => {
      events.push({
        id: `inc-${inc.id}`,
        raw_id: inc.id,
        income_id: inc.id,
        type: 'income',
        title: inc.title,
        amount: inc.amount,
        date: inc.date,
        status: inc.status,
        category_id: inc.category_id,
        bank_account_id: inc.bank_account_id,
        category_name: inc.category_name || 'Ingreso',
        category_icon: inc.category_icon || 'wallet',
        category_color: inc.category_color || '#D1F2E2',
        notes: inc.notes,
        is_recurring: false
      });
    });

    // Proyectar Ingresos Cíclicos en este mes
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    recurringIncomes.forEach((inc) => {
      const startDate = parseISO(inc.date);
      const startDay = startDate.getDate();
      const period = inc.recurrence_period || 'monthly';

      if (period === 'monthly') {
        const targetDay = Math.min(startDay, daysInCurrentMonth);
        const projectedDateStr = `${year}-${monthStr}-${targetDay.toString().padStart(2, '0')}`;
        const matchedInst = allIncomeInstallments.find((i) => i.income_id === inc.id && i.due_date.startsWith(datePrefix));
        const effectiveDateStr = matchedInst ? matchedInst.due_date : projectedDateStr;
        const rawId = matchedInst ? matchedInst.id : inc.id;

        let status = 'por_pagar';
        if (matchedInst) {
          status = matchedInst.status;
        } else if (effectiveDateStr < todayStr) {
          status = 'pagado';
        } else if (effectiveDateStr === todayStr) {
          status = inc.status || 'pagado';
        } else {
          status = 'por_pagar';
        }

        events.push({
          id: `inc-rec-${inc.id}-${effectiveDateStr}`,
          raw_id: rawId,
          income_id: inc.id,
          type: 'income',
          title: `🔄 ${inc.title} (Cíclico)`,
          amount: inc.amount,
          date: effectiveDateStr,
          status,
          category_id: inc.category_id,
          bank_account_id: inc.bank_account_id,
          category_name: inc.category_name || 'Ingreso Cíclico',
          category_icon: inc.category_icon || 'wallet',
          category_color: inc.category_color || '#D1F2E2',
          notes: inc.notes,
          is_recurring: true,
          recurrence_period: period
        });
      } else if (period === 'weekly' || period === 'biweekly') {
        const stepDays = period === 'weekly' ? 7 : 14;
        let current = startDate;

        while (isBefore(current, monthStart)) {
          current = addDays(current, stepDays);
        }

        while (!isAfter(current, monthEnd)) {
          const projectedDateStr = format(current, 'yyyy-MM-dd');
          
          let status = 'por_pagar';
          if (projectedDateStr < todayStr) {
            status = 'pagado';
          } else if (projectedDateStr === todayStr) {
            status = inc.status || 'pagado';
          } else {
            status = 'por_pagar';
          }

          events.push({
            id: `inc-rec-${inc.id}-${projectedDateStr}`,
            raw_id: inc.id,
            income_id: inc.id,
            type: 'income',
            title: `🔄 ${inc.title} (${period === 'weekly' ? 'Semanal' : 'Quincenal'})`,
            amount: inc.amount,
            date: projectedDateStr,
            status,
            category_id: inc.category_id,
            bank_account_id: inc.bank_account_id,
            category_name: inc.category_name || 'Ingreso Cíclico',
            category_icon: inc.category_icon || 'wallet',
            category_color: inc.category_color || '#D1F2E2',
            notes: inc.notes,
            is_recurring: true,
            recurrence_period: period
          });
          current = addDays(current, stepDays);
        }
      }
    });

    // Agregar Cuotas / Gastos Puntuales
    installments.forEach((inst) => {
      const isCuotas = inst.total_installments > 1;
      const subtitle = isCuotas ? ` (Cuota ${inst.installment_number}/${inst.total_installments})` : ' (Contado)';

      events.push({
        id: `inst-${inst.installment_id}`,
        raw_id: inst.installment_id,
        expense_id: inst.expense_id,
        type: 'expense',
        title: `${inst.expense_title}${subtitle}`,
        expense_title: inst.expense_title,
        amount: inst.amount,
        total_amount: inst.total_amount,
        date: inst.date,
        start_date: inst.start_date,
        status: inst.status,
        installment_number: inst.installment_number,
        total_installments: inst.total_installments,
        payment_method: inst.payment_method,
        category_id: inst.category_id,
        bank_account_id: inst.bank_account_id,
        card_name: inst.card_name,
        category_name: inst.category_name || 'Gasto',
        category_icon: inst.category_icon || 'shopping-bag',
        category_color: inst.category_color || '#FFD6E8',
        notes: inst.notes,
        is_recurring: false
      });
    });

    // Proyectar Gastos Cíclicos en este mes
    const allInstallments = await getAllRows(
      `SELECT ei.* FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       WHERE e.user_id = ?`,
      [req.user.id]
    );

    recurringExpenses.forEach((exp) => {
      const startDate = parseISO(exp.date);
      const startDay = startDate.getDate();
      const period = exp.recurrence_period || 'monthly';

      if (period === 'monthly') {
        const targetDay = Math.min(startDay, daysInCurrentMonth);
        const projectedDateStr = `${year}-${monthStr}-${targetDay.toString().padStart(2, '0')}`;
        const matchedInst = allInstallments.find((i) => i.expense_id === exp.expense_id && i.due_date.startsWith(datePrefix));
        const effectiveDateStr = matchedInst ? matchedInst.due_date : projectedDateStr;
        const isPast = effectiveDateStr < todayStr;

        const status = matchedInst ? matchedInst.status : (isPast ? 'pagado' : 'por_pagar');
        const rawId = matchedInst ? matchedInst.id : exp.expense_id;

        events.push({
          id: `exp-rec-${exp.expense_id}-${effectiveDateStr}`,
          raw_id: rawId,
          expense_id: exp.expense_id,
          type: 'expense',
          title: `🔄 ${exp.title} (Cíclico)`,
          expense_title: exp.title,
          amount: exp.amount,
          total_amount: exp.amount,
          date: effectiveDateStr,
          start_date: exp.date,
          status,
          category_id: exp.category_id,
          bank_account_id: exp.bank_account_id,
          payment_method: exp.payment_method,
          category_name: exp.category_name || 'Gasto Cíclico',
          category_icon: exp.category_icon || 'shopping-bag',
          category_color: exp.category_color || '#FFD6E8',
          notes: exp.notes,
          is_recurring: true,
          recurrence_period: period
        });
      } else if (period === 'weekly' || period === 'biweekly') {
        const stepDays = period === 'weekly' ? 7 : 14;
        let current = startDate;

        while (isBefore(current, monthStart)) {
          current = addDays(current, stepDays);
        }

        while (!isAfter(current, monthEnd)) {
          const projectedDateStr = format(current, 'yyyy-MM-dd');
          const isPast = projectedDateStr < todayStr;

          const matchedInst = allInstallments.find((i) => i.expense_id === exp.expense_id && i.due_date === projectedDateStr);

          const status = matchedInst ? matchedInst.status : (isPast ? 'pagado' : 'por_pagar');
          const rawId = matchedInst ? matchedInst.id : exp.expense_id;

          events.push({
            id: `exp-rec-${exp.expense_id}-${projectedDateStr}`,
            raw_id: rawId,
            expense_id: exp.expense_id,
            type: 'expense',
            title: `🔄 ${exp.title} (${period === 'weekly' ? 'Semanal' : 'Quincenal'})`,
            expense_title: exp.title,
            amount: exp.amount,
            total_amount: exp.amount,
            date: projectedDateStr,
            start_date: exp.date,
            status,
            category_id: exp.category_id,
            bank_account_id: exp.bank_account_id,
            payment_method: exp.payment_method,
            category_name: exp.category_name || 'Gasto Cíclico',
            category_icon: exp.category_icon || 'shopping-bag',
            category_color: exp.category_color || '#FFD6E8',
            notes: exp.notes,
            is_recurring: true,
            recurrence_period: period
          });
          current = addDays(current, stepDays);
        }
      }
    });

    res.json({ year, month, events });
  } catch (err) {
    console.error('Error al obtener datos del calendario:', err);
    res.status(500).json({ error: 'Error al consultar el calendario financiero' });
  }
});

export default router;
