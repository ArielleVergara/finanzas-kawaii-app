import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar Cuentas Bancarias / Entidades Financieras del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await getAllRows(
      'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY balance DESC',
      [req.user.id]
    );

    const totalBalance = accounts.reduce((acc, item) => acc + (Number(item.balance) || 0), 0);
    const totalCreditLimit = accounts
      .filter((item) => item.has_credit_card === 1)
      .reduce((acc, item) => acc + (Number(item.credit_limit) || 0), 0);

    // Calcular retornos proyectados para cuentas de ahorro con tasa fija (diario / mensual / anual)
    let totalProjectedDaily = 0;
    let totalProjectedMonthly = 0;
    let totalProjectedAnnual = 0;

    const enrichedAccounts = accounts.map((acc) => {
      const balance = Number(acc.balance) || 0;
      const rate = Number(acc.annual_return_rate) || 0;
      const isSavings = acc.is_savings === 1;

      let dailyYield = 0;
      let monthlyYield = 0;
      let annualYield = 0;

      if (isSavings && rate > 0) {
        annualYield = balance * (rate / 100);
        monthlyYield = annualYield / 12;
        dailyYield = annualYield / 365;

        totalProjectedDaily += dailyYield;
        totalProjectedMonthly += monthlyYield;
        totalProjectedAnnual += annualYield;
      }

      return {
        ...acc,
        projected_daily_yield: Math.round(dailyYield),
        projected_monthly_yield: Math.round(monthlyYield),
        projected_annual_yield: Math.round(annualYield)
      };
    });

    res.json({
      accounts: enrichedAccounts,
      total_balance: totalBalance,
      total_credit_limit: totalCreditLimit,
      projected_returns: {
        daily: Math.round(totalProjectedDaily),
        monthly: Math.round(totalProjectedMonthly),
        annual: Math.round(totalProjectedAnnual)
      }
    });
  } catch (err) {
    console.error('Error al obtener cuentas bancarias:', err);
    res.status(500).json({ error: 'Error al obtener cuentas bancarias e instituciones financieras' });
  }
});

// Registrar nueva Cuenta Bancaria / Entidad Financiera
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      institution_name,
      account_name,
      account_type,
      is_savings,
      balance,
      annual_return_rate,
      return_frequency,
      has_debit_card,
      has_credit_card,
      credit_limit,
      closing_day,
      due_day,
      last_four,
      color,
      icon,
      notes
    } = req.body;

    if (!institution_name || !account_name) {
      return res.status(400).json({ error: 'La institución financiera y el nombre de la cuenta son requeridos' });
    }

    const accountId = uuidv4();
    const saveColor = color || '#E3D5FF';
    const saveIcon = icon || 'landmark';

    await runQuery(
      `INSERT INTO bank_accounts (
        id, user_id, institution_name, account_name, account_type, is_savings, balance,
        annual_return_rate, return_frequency,
        has_debit_card, has_credit_card, credit_limit, closing_day, due_day,
        last_four, color, icon, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        req.user.id,
        institution_name.trim(),
        account_name.trim(),
        account_type || 'corriente',
        is_savings ? 1 : 0,
        Number(balance) || 0,
        Number(annual_return_rate) || 0,
        return_frequency || 'diario',
        has_debit_card ? 1 : 0,
        has_credit_card ? 1 : 0,
        Number(credit_limit) || 0,
        Number(closing_day) || 25,
        Number(due_day) || 5,
        last_four || '',
        saveColor,
        saveIcon,
        notes || ''
      ]
    );

    res.status(201).json({ message: 'Cuenta bancaria creada con éxito', id: accountId });
  } catch (err) {
    console.error('Error al registrar cuenta bancaria:', err);
    res.status(500).json({ error: 'Error al registrar la cuenta bancaria: ' + err.message });
  }
});

// Actualizar Cuenta Bancaria / Entidad Financiera
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      institution_name,
      account_name,
      account_type,
      is_savings,
      balance,
      annual_return_rate,
      return_frequency,
      has_debit_card,
      has_credit_card,
      credit_limit,
      closing_day,
      due_day,
      last_four,
      color,
      icon,
      notes
    } = req.body;

    await runQuery(
      `UPDATE bank_accounts
       SET institution_name = ?, account_name = ?, account_type = ?, is_savings = ?, balance = ?,
           annual_return_rate = ?, return_frequency = ?,
           has_debit_card = ?, has_credit_card = ?, credit_limit = ?, closing_day = ?,
           due_day = ?, last_four = ?, color = ?, icon = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        institution_name.trim(),
        account_name.trim(),
        account_type,
        is_savings ? 1 : 0,
        Number(balance) || 0,
        Number(annual_return_rate) || 0,
        return_frequency || 'diario',
        has_debit_card ? 1 : 0,
        has_credit_card ? 1 : 0,
        Number(credit_limit) || 0,
        Number(closing_day) || 25,
        Number(due_day) || 5,
        last_four || '',
        color,
        icon,
        notes,
        req.params.id,
        req.user.id
      ]
    );

    res.json({ message: 'Cuenta bancaria actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar cuenta bancaria:', err);
    res.status(500).json({ error: 'Error al actualizar cuenta bancaria: ' + err.message });
  }
});

// Registrar Cierre / Saldo Mensual Real para Comparación de Rendimientos de Inversión (ej. Fintual)
router.post('/:id/balance-history', authenticateToken, async (req, res) => {
  try {
    const { year, month, ending_balance } = req.body;
    const accountId = req.params.id;

    if (!year || !month || ending_balance === undefined) {
      return res.status(400).json({ error: 'Año, mes y saldo final son requeridos' });
    }

    const endingBal = Number(ending_balance);

    // Calcular transferencias netas recibidas en esta cuenta durante ese mes
    const monthStr = String(month).padStart(2, '0');
    const transfers = await getAllRows(
      `SELECT amount, source_account_id, destination_account_id
       FROM transfers
       WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
      [req.user.id, `${year}-${monthStr}`]
    );

    let netTransfers = 0;
    transfers.forEach((t) => {
      if (t.destination_account_id === accountId) netTransfers += Number(t.amount);
      if (t.source_account_id === accountId) netTransfers -= Number(t.amount);
    });

    // Obtener saldo del mes anterior en el historial o saldo inicial
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevHistory = await getAllRows(
      `SELECT ending_balance FROM account_balance_history
       WHERE user_id = ? AND bank_account_id = ? AND year = ? AND month = ?`,
      [req.user.id, accountId, prevYear, prevMonth]
    );

    const prevBalance = prevHistory.length > 0 ? Number(prevHistory[0].ending_balance) : 0;
    const calculatedYield = endingBal - (prevBalance + netTransfers);
    const yieldPercentage = prevBalance > 0 ? (calculatedYield / prevBalance) * 100 : 0;

    const historyId = uuidv4();

    // Eliminar registro previo si existía para ese mismo mes y año
    await runQuery(
      `DELETE FROM account_balance_history WHERE user_id = ? AND bank_account_id = ? AND year = ? AND month = ?`,
      [req.user.id, accountId, year, month]
    );

    await runQuery(
      `INSERT INTO account_balance_history (
        id, user_id, bank_account_id, year, month, ending_balance, net_transfers, calculated_yield, yield_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [historyId, req.user.id, accountId, year, month, endingBal, netTransfers, calculatedYield, yieldPercentage]
    );

    res.json({
      message: 'Cierre mensual registrado con éxito 📈',
      calculated_yield: Math.round(calculatedYield),
      yield_percentage: Number(yieldPercentage.toFixed(2))
    });
  } catch (err) {
    console.error('Error al registrar historial de saldo:', err);
    res.status(500).json({ error: 'Error al registrar historial de saldo e inversión' });
  }
});

// Obtener Historial de Rendimientos de una Cuenta de Inversión
router.get('/:id/balance-history', authenticateToken, async (req, res) => {
  try {
    const history = await getAllRows(
      `SELECT * FROM account_balance_history
       WHERE user_id = ? AND bank_account_id = ?
       ORDER BY year ASC, month ASC`,
      [req.user.id, req.params.id]
    );
    res.json(history);
  } catch (err) {
    console.error('Error al obtener historial de saldo:', err);
    res.status(500).json({ error: 'Error al obtener historial de saldo' });
  }
});

// Eliminar Cuenta Bancaria
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM bank_accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Cuenta bancaria eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cuenta bancaria' });
  }
});

export default router;
