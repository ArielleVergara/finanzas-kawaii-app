import express from 'express';
import { getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Estadísticas Mensuales (Gastos por Categoría + Balance Ingresos, Gastos y Ahorro Destinado)
router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const monthStr = month.toString().padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    // Gastos por categoría en este mes
    const expensesByCategory = await getAllRows(
      `SELECT c.id as category_id, COALESCE(c.name, 'Sin categoría') as category_name,
              COALESCE(c.color, '#FFD6E8') as color, COALESCE(c.icon, 'tag') as icon,
              SUM(ei.amount) as total_amount
       FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ?
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total_amount DESC`,
      [req.user.id, datePrefix]
    );

    // Total Ingresos del mes
    const incomesTotalRow = await getAllRows(
      `SELECT SUM(amount) as total FROM incomes WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
      [req.user.id, datePrefix]
    );
    const totalIncomes = incomesTotalRow[0]?.total || 0;
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + (item.total_amount || 0), 0);

    // Total Transferido a Ahorro en este mes
    const savingsAllocatedRow = await getAllRows(
      `SELECT SUM(amount) as total FROM transfers WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
      [req.user.id, datePrefix]
    );
    const totalSavingsAllocated = savingsAllocatedRow[0]?.total || 0;

    // Top 5 gastos más altos del mes
    const topExpenses = await getAllRows(
      `SELECT e.id as expense_id, e.title, ei.amount, ei.due_date,
              COALESCE(c.name, 'Sin categoría') as category_name,
              COALESCE(c.color, '#FFD6E8') as color,
              COALESCE(c.icon, 'tag') as icon
       FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ?
       ORDER BY ei.amount DESC
       LIMIT 5`,
      [req.user.id, datePrefix]
    );

    res.json({
      year,
      month,
      total_incomes: totalIncomes,
      total_expenses: totalExpenses,
      total_savings_allocated: totalSavingsAllocated,
      net_balance: totalIncomes - totalExpenses - totalSavingsAllocated,
      expenses_by_category: expensesByCategory,
      top_expenses: topExpenses
    });
  } catch (err) {
    console.error('Error al obtener analíticas mensuales:', err);
    res.status(500).json({ error: 'Error al procesar estadísticas mensuales' });
  }
});

// Estadísticas Anuales (Gastos por Categoría + Evolución Mes a Mes + Fondos por Banco + Proyecciones)
router.get('/annual', authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const yearStr = year.toString();

    const expensesByCategory = await getAllRows(
      `SELECT c.id as category_id, COALESCE(c.name, 'Sin categoría') as category_name,
              COALESCE(c.color, '#FFD6E8') as color, COALESCE(c.icon, 'tag') as icon,
              SUM(ei.amount) as total_amount
       FROM expense_installments ei
       JOIN expenses e ON ei.expense_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND strftime('%Y', ei.due_date) = ?
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total_amount DESC`,
      [req.user.id, yearStr]
    );

    const monthlyTrend = [];
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let m = 1; m <= 12; m++) {
      const monthPrefix = `${yearStr}-${m.toString().padStart(2, '0')}`;

      const incRow = await getAllRows(
        `SELECT SUM(amount) as total FROM incomes WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
        [req.user.id, monthPrefix]
      );
      const expRow = await getAllRows(
        `SELECT SUM(amount) as total FROM expense_installments ei JOIN expenses e ON ei.expense_id = e.id WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ?`,
        [req.user.id, monthPrefix]
      );
      const savRow = await getAllRows(
        `SELECT SUM(amount) as total FROM transfers WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
        [req.user.id, monthPrefix]
      );
      const cyclicRow = await getAllRows(
        `SELECT SUM(ei.amount) as total
         FROM expense_installments ei
         JOIN expenses e ON ei.expense_id = e.id
         WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ? AND e.is_recurring = 1`,
        [req.user.id, monthPrefix]
      );
      const variableRow = await getAllRows(
        `SELECT SUM(ei.amount) as total
         FROM expense_installments ei
         JOIN expenses e ON ei.expense_id = e.id
         WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ? AND (e.is_recurring = 0 OR e.is_recurring IS NULL)`,
        [req.user.id, monthPrefix]
      );

      const inc = incRow[0]?.total || 0;
      const exp = expRow[0]?.total || 0;
      const sav = savRow[0]?.total || 0;
      const cyclic = cyclicRow[0]?.total || 0;
      const variable = variableRow[0]?.total || 0;
      const netBalance = inc - exp;
      const savingsRate = inc > 0 ? parseFloat((((inc - exp) / inc) * 100).toFixed(1)) : 0;

      monthlyTrend.push({
        month_number: m,
        month_name: monthsNames[m - 1],
        incomes: inc,
        expenses: exp,
        savings: sav,
        cyclic_expenses: cyclic,
        variable_expenses: variable,
        net_balance: netBalance,
        savings_rate: savingsRate
      });
    }

    // Cuotas Comprometidas a Futuro (Próximos 6 meses a partir de la fecha actual)
    const futureCommitments = [];
    const today = new Date();
    const startYear = today.getFullYear();
    const startMonth = today.getMonth() + 1;

    for (let i = 0; i < 6; i++) {
      let targetMonth = startMonth + i;
      let targetYear = startYear;
      if (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      const monthPrefix = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
      const monthLabel = `${monthsNames[targetMonth - 1]} ${targetYear}`;

      const futureRow = await getAllRows(
        `SELECT SUM(ei.amount) as total, COUNT(ei.id) as count
         FROM expense_installments ei
         JOIN expenses e ON ei.expense_id = e.id
         WHERE e.user_id = ? AND strftime('%Y-%m', ei.due_date) = ?`,
        [req.user.id, monthPrefix]
      );

      futureCommitments.push({
        month_key: monthPrefix,
        month_label: monthLabel,
        committed_amount: futureRow[0]?.total || 0,
        count: futureRow[0]?.count || 0
      });
    }

    // Fondos / Saldos de Cuentas por Banco o Institución Financiera
    const savingsByBank = await getAllRows(
      `SELECT institution_name, SUM(balance) as total_amount, color
       FROM bank_accounts
       WHERE user_id = ?
       GROUP BY institution_name, color
       ORDER BY total_amount DESC`,
      [req.user.id]
    );

    const totalSavings = savingsByBank.reduce((sum, item) => sum + (item.total_amount || 0), 0);

    res.json({
      year,
      expenses_by_category: expensesByCategory,
      monthly_trend: monthlyTrend,
      future_commitments: futureCommitments,
      savings_by_bank: savingsByBank,
      total_savings: totalSavings
    });
  } catch (err) {
    console.error('Error al obtener analíticas anuales:', err);
    res.status(500).json({ error: 'Error al procesar estadísticas anuales' });
  }
});

export default router;
