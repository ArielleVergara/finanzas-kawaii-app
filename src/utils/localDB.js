/**
 * Antigravity - Local Database & Offline Backup System
 * Permite el funcionamiento 100% autónomo, privado y offline en dispositivos móviles/tablets.
 * Incluye motor completo de base de datos local (localStorage) y copia de seguridad JSON.
 */

const LOCAL_STORAGE_KEY = 'kawaii_app_local_db_v1';

export const defaultCategories = [
  // Gastos
  { id: 'cat-def-1', name: 'Alimentación y Supermercado', type: 'expense', icon: 'shopping-bag', color: '#FFD6E8', is_default: 1 },
  { id: 'cat-def-2', name: 'Vivienda y Gastos Comunes', type: 'expense', icon: 'home', color: '#E3D5FF', is_default: 1 },
  { id: 'cat-def-3', name: 'Servicios Básicos (Luz, Agua, Gas, Net)', type: 'expense', icon: 'zap', color: '#FFF1C5', is_default: 1 },
  { id: 'cat-def-4', name: 'Transporte y Combustible', type: 'expense', icon: 'car', color: '#FFE6C7', is_default: 1 },
  { id: 'cat-def-5', name: 'Salud y Farmacia', type: 'expense', icon: 'heart', color: '#FFB7B2', is_default: 1 },
  { id: 'cat-def-6', name: 'Entretenimiento y Ocio', type: 'expense', icon: 'film', color: '#D1F2E2', is_default: 1 },
  { id: 'cat-def-7', name: 'Educación y Cursos', type: 'expense', icon: 'book', color: '#D0F4DE', is_default: 1 },
  // Ingresos
  { id: 'cat-def-8', name: 'Sueldo / Salario', type: 'income', icon: 'wallet', color: '#D1F2E2', is_default: 1 },
  { id: 'cat-def-9', name: 'Freelance / Honorarios', type: 'income', icon: 'laptop', color: '#FFF1C5', is_default: 1 },
  { id: 'cat-def-10', name: 'Ventas y Comercio', type: 'income', icon: 'store', color: '#FFE6C7', is_default: 1 },
  { id: 'cat-def-11', name: 'Inversiones y Retornos', type: 'income', icon: 'trending-up', color: '#E3D5FF', is_default: 1 },
  { id: 'cat-def-12', name: 'Otros Ingresos', type: 'income', icon: 'dollar-sign', color: '#D0F4DE', is_default: 1 },
];

export const getDefaultLocalDB = () => ({
  users: [{ id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app' }],
  categories: defaultCategories,
  bank_accounts: [],
  incomes: [],
  expenses: [],
  expense_installments: [],
  income_installments: [],
  transfers: [],
  account_balance_history: [],
  savings: [],
  credit_cards: []
});

export const getLocalDB = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultLocalDB();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const db = JSON.parse(raw);
    if (!db.categories || db.categories.length === 0) {
      db.categories = defaultCategories;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    }
    return db;
  } catch (e) {
    console.error('Error leyendo LocalDB:', e);
    return getDefaultLocalDB();
  }
};

export const saveLocalDB = (dbData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbData));
  } catch (e) {
    console.error('Error guardando en LocalDB:', e);
  }
};

/**
 * Exporta toda la base de datos local en un archivo .json descargable.
 */
export const exportBackupJSON = (filenamePrefix = 'finanzas_kawaii_backup') => {
  try {
    const data = getLocalDB();
    const dateStr = new Date().toISOString().split('T')[0];
    const fullFilename = `${filenamePrefix}_${dateStr}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, filename: fullFilename };
  } catch (err) {
    console.error('Error exportando respaldo JSON:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Importa y restaura una copia de seguridad JSON.
 * @param {string} jsonString Contenido del archivo .json
 */
export const importBackupJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('El archivo de respaldo no tiene un formato válido.');
    }

    const currentDB = getLocalDB();
    const updatedDB = {
      users: Array.isArray(parsed.users) ? parsed.users : currentDB.users,
      categories: Array.isArray(parsed.categories) ? parsed.categories : currentDB.categories,
      bank_accounts: Array.isArray(parsed.bank_accounts) ? parsed.bank_accounts : currentDB.bank_accounts,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : currentDB.incomes,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : currentDB.expenses,
      expense_installments: Array.isArray(parsed.expense_installments) ? parsed.expense_installments : currentDB.expense_installments,
      income_installments: Array.isArray(parsed.income_installments) ? parsed.income_installments : currentDB.income_installments,
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : currentDB.transfers,
      account_balance_history: Array.isArray(parsed.account_balance_history) ? parsed.account_balance_history : currentDB.account_balance_history,
      savings: Array.isArray(parsed.savings) ? parsed.savings : (currentDB.savings || []),
      credit_cards: Array.isArray(parsed.credit_cards) ? parsed.credit_cards : (currentDB.credit_cards || [])
    };

    saveLocalDB(updatedDB);
    return { success: true };
  } catch (err) {
    console.error('Error al importar respaldo JSON:', err);
    return { success: false, error: err.message || 'No se pudo leer el archivo de respaldo.' };
  }
};

/**
 * Interceptor API Local Autónomo (Offline Engine).
 * Procesa peticiones HTTP /api/* directamente en localStorage.
 */
export const handleLocalApiRequest = async (urlStr, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(urlStr, 'http://localhost');
  const path = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      body = {};
    }
  }

  const db = getLocalDB();
  const todayStr = new Date().toISOString().split('T')[0];

  const makeResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const parseYMD = (str) => {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return { year: parts[0], month: parts[1], day: parts[2] };
  };

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // --- AUTH ENDPOINTS ---
  if (path === '/api/auth/me') {
    const user = db.users[0] || { id: 'local-user', name: 'Usuario Kawaii', email: 'usuario@kawaii.app', avatar: 'bunny' };
    return makeResponse({ user });
  }
  if (path === '/api/auth/login' || path === '/api/auth/register') {
    const email = body.email || 'usuario@kawaii.app';
    let name = body.name;
    if (!name) {
      if (db.users[0] && db.users[0].email === email && db.users[0].name) {
        name = db.users[0].name;
      } else {
        const handle = email.split('@')[0];
        name = handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : 'Usuario Kawaii';
      }
    }
    const avatar = body.avatar || (db.users[0] && db.users[0].avatar) || 'bunny';
    const user = { id: 'local-user', name, email, avatar };
    db.users = [user];
    saveLocalDB(db);
    return makeResponse({ token: 'local-token-kawaii', user });
  }

  // --- CATEGORIES ENDPOINTS ---
  if (path === '/api/categories') {
    if (method === 'GET') {
      return makeResponse(db.categories);
    }
    if (method === 'POST') {
      const newCat = {
        id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: 'local-user',
        name: (body.name || '').trim(),
        type: body.type || 'expense',
        icon: body.icon || 'tag',
        color: body.color || '#FFD6E8',
        is_default: 0
      };
      db.categories.push(newCat);
      saveLocalDB(db);
      return makeResponse(newCat, 201);
    }
  }

  if (path.startsWith('/api/categories/')) {
    const catId = path.split('/')[3];
    if (method === 'PUT') {
      const index = db.categories.findIndex(c => c.id === catId);
      if (index !== -1) {
        db.categories[index] = {
          ...db.categories[index],
          name: (body.name || db.categories[index].name).trim(),
          type: body.type || db.categories[index].type,
          icon: body.icon || db.categories[index].icon,
          color: body.color || db.categories[index].color
        };
        saveLocalDB(db);
        return makeResponse(db.categories[index]);
      }
      return makeResponse({ error: 'Categoría no encontrada' }, 404);
    }
    if (method === 'DELETE') {
      db.categories = db.categories.filter(c => c.id !== catId);
      saveLocalDB(db);
      return makeResponse({ message: 'Categoría eliminada' });
    }
  }

  // --- BANK ACCOUNTS ENDPOINTS ---
  if (path === '/api/bank-accounts') {
    if (method === 'GET') {
      const totalBalance = db.bank_accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
      const totalCreditLimit = db.bank_accounts.reduce((sum, a) => sum + (Number(a.credit_limit) || 0), 0);
      const projectedReturns = {
        daily: Math.round(totalBalance * 0.05 / 365),
        monthly: Math.round(totalBalance * 0.05 / 12),
        annual: Math.round(totalBalance * 0.05)
      };
      return makeResponse({
        accounts: db.bank_accounts,
        total_balance: totalBalance,
        total_credit_limit: totalCreditLimit,
        projected_returns: projectedReturns
      });
    }
    if (method === 'POST') {
      const newAcc = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: 'local-user',
        institution_name: (body.institution_name || '').trim(),
        account_name: (body.account_name || '').trim(),
        account_number: (body.account_number || '').trim(),
        balance: Number(body.balance) || 0,
        color: body.color || '#E3D5FF',
        icon: body.icon || 'landmark',
        has_credit_card: body.has_credit_card ? 1 : 0,
        credit_limit: Number(body.credit_limit) || 0,
        is_savings: body.is_savings ? 1 : 0,
        interest_rate: Number(body.interest_rate) || 0
      };
      db.bank_accounts.push(newAcc);
      saveLocalDB(db);
      return makeResponse(newAcc, 201);
    }
  }

  if (path.startsWith('/api/bank-accounts/')) {
    const parts = path.split('/');
    const accId = parts[3];

    if (parts.length === 4) {
      if (method === 'PUT') {
        const index = db.bank_accounts.findIndex(a => a.id === accId);
        if (index !== -1) {
          db.bank_accounts[index] = {
            ...db.bank_accounts[index],
            institution_name: (body.institution_name || db.bank_accounts[index].institution_name).trim(),
            account_name: (body.account_name || db.bank_accounts[index].account_name).trim(),
            account_number: (body.account_number || db.bank_accounts[index].account_number).trim(),
            balance: Number(body.balance) !== undefined ? Number(body.balance) : db.bank_accounts[index].balance,
            color: body.color || db.bank_accounts[index].color,
            icon: body.icon || db.bank_accounts[index].icon,
            has_credit_card: body.has_credit_card !== undefined ? (body.has_credit_card ? 1 : 0) : db.bank_accounts[index].has_credit_card,
            credit_limit: Number(body.credit_limit) || 0,
            is_savings: body.is_savings !== undefined ? (body.is_savings ? 1 : 0) : db.bank_accounts[index].is_savings,
            interest_rate: Number(body.interest_rate) || 0
          };
          saveLocalDB(db);
          return makeResponse(db.bank_accounts[index]);
        }
        return makeResponse({ error: 'Cuenta no encontrada' }, 404);
      }
      if (method === 'DELETE') {
        db.bank_accounts = db.bank_accounts.filter(a => a.id !== accId);
        saveLocalDB(db);
        return makeResponse({ message: 'Cuenta eliminada' });
      }
    }

    if (parts[4] === 'balance-history') {
      const history = (db.account_balance_history || []).filter(h => h.account_id === accId);
      return makeResponse(history);
    }
  }

  // --- TRANSFERS ENDPOINT ---
  if (path === '/api/transfers' && method === 'POST') {
    const { origin_account_id, destination_account_id, amount, date, notes } = body;
    const numAmount = Number(amount) || 0;

    if (origin_account_id) {
      const orig = db.bank_accounts.find(a => a.id === origin_account_id);
      if (orig) orig.balance = (Number(orig.balance) || 0) - numAmount;
    }
    if (destination_account_id) {
      const dest = db.bank_accounts.find(a => a.id === destination_account_id);
      if (dest) dest.balance = (Number(dest.balance) || 0) + numAmount;
    }

    const transfer = {
      id: `tr-${Date.now()}`,
      user_id: 'local-user',
      origin_account_id: origin_account_id || null,
      destination_account_id: destination_account_id || null,
      amount: numAmount,
      date: date || todayStr,
      notes: notes || ''
    };
    db.transfers.push(transfer);
    saveLocalDB(db);
    return makeResponse(transfer, 201);
  }

  // --- INCOMES ENDPOINTS ---
  if (path === '/api/incomes') {
    if (method === 'GET') {
      const list = db.incomes.map(inc => {
        const cat = db.categories.find(c => c.id === inc.category_id);
        const ba = db.bank_accounts.find(a => a.id === inc.bank_account_id);
        return {
          ...inc,
          category_name: cat ? cat.name : null,
          category_icon: cat ? cat.icon : 'wallet',
          category_color: cat ? cat.color : '#D1F2E2',
          institution_name: ba ? ba.institution_name : null
        };
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return makeResponse(list);
    }

    if (method === 'POST') {
      const newInc = {
        id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: 'local-user',
        title: (body.title || '').trim(),
        amount: Number(body.amount) || 0,
        date: body.date || todayStr,
        category_id: body.category_id || null,
        bank_account_id: body.bank_account_id || null,
        status: body.status || 'pagado',
        notes: body.notes || '',
        is_recurring: body.is_recurring ? 1 : 0,
        recurrence_period: body.recurrence_period || 'monthly'
      };

      if (newInc.bank_account_id && newInc.status === 'pagado') {
        const ba = db.bank_accounts.find(a => a.id === newInc.bank_account_id);
        if (ba) ba.balance = (Number(ba.balance) || 0) + newInc.amount;
      }

      db.incomes.push(newInc);
      saveLocalDB(db);
      return makeResponse(newInc, 201);
    }
  }

  if (path.startsWith('/api/incomes/')) {
    const parts = path.split('/');
    const incId = parts[3];

    if (parts.length === 4) {
      if (method === 'PUT') {
        const index = db.incomes.findIndex(i => i.id === incId);
        if (index !== -1) {
          db.incomes[index] = {
            ...db.incomes[index],
            title: (body.title || db.incomes[index].title).trim(),
            amount: Number(body.amount) || db.incomes[index].amount,
            date: body.date || db.incomes[index].date,
            category_id: body.category_id || db.incomes[index].category_id,
            bank_account_id: body.bank_account_id || db.incomes[index].bank_account_id,
            status: body.status || db.incomes[index].status,
            notes: body.notes !== undefined ? body.notes : db.incomes[index].notes,
            is_recurring: body.is_recurring !== undefined ? (body.is_recurring ? 1 : 0) : db.incomes[index].is_recurring,
            recurrence_period: body.recurrence_period || db.incomes[index].recurrence_period
          };
          saveLocalDB(db);
          return makeResponse(db.incomes[index]);
        }
        return makeResponse({ error: 'Ingreso no encontrado' }, 404);
      }

      if (method === 'DELETE') {
        db.incomes = db.incomes.filter(i => i.id !== incId);
        db.income_installments = (db.income_installments || []).filter(ii => ii.income_id !== incId);
        saveLocalDB(db);
        return makeResponse({ message: 'Ingreso eliminado' });
      }
    }

    if (parts[4] === 'status' && method === 'PATCH') {
      const inc = db.incomes.find(i => i.id === incId);
      const nextStatus = body.status || 'pagado';
      if (inc) {
        inc.status = nextStatus;
        saveLocalDB(db);
        return makeResponse({ message: 'Estado actualizado', status: nextStatus });
      }
      const inst = (db.income_installments || []).find(ii => ii.id === incId);
      if (inst) {
        inst.status = nextStatus;
        saveLocalDB(db);
        return makeResponse({ message: 'Estado actualizado', status: nextStatus });
      }
      return makeResponse({ error: 'Registro no encontrado' }, 404);
    }
  }

  // --- EXPENSES ENDPOINTS ---
  if (path === '/api/expenses') {
    if (method === 'GET') {
      const list = db.expenses.map(exp => {
        const cat = db.categories.find(c => c.id === exp.category_id);
        const ba = db.bank_accounts.find(a => a.id === exp.bank_account_id);
        const installments = (db.expense_installments || [])
          .filter(ei => ei.expense_id === exp.id)
          .sort((a, b) => a.installment_number - b.installment_number);
        return {
          ...exp,
          category_name: cat ? cat.name : null,
          category_icon: cat ? cat.icon : 'shopping-bag',
          category_color: cat ? cat.color : '#FFD6E8',
          institution_name: ba ? ba.institution_name : null,
          installments
        };
      }).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
      return makeResponse(list);
    }

    if (method === 'POST') {
      const expId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const numInstallments = Math.max(1, parseInt(body.total_installments) || 1);
      const amount = Number(body.total_amount) || 0;
      const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;
      const recurring = body.is_recurring ? 1 : 0;
      const startDate = body.start_date || todayStr;

      const newExp = {
        id: expId,
        user_id: 'local-user',
        title: (body.title || '').trim(),
        total_amount: amount,
        payment_method: body.payment_method || 'contado',
        bank_account_id: body.bank_account_id || null,
        category_id: body.category_id || null,
        total_installments: numInstallments,
        start_date: startDate,
        notes: body.notes || '',
        is_recurring: recurring,
        recurrence_period: body.recurrence_period || 'monthly'
      };

      db.expenses.push(newExp);
      if (!db.expense_installments) db.expense_installments = [];

      if (!recurring) {
        const parsed = parseYMD(startDate);
        for (let i = 1; i <= numInstallments; i++) {
          const instId = `inst-${expId}-${i}`;
          const dueYear = parsed.year + Math.floor((parsed.month - 1 + i - 1) / 12);
          const dueMonth = ((parsed.month - 1 + i - 1) % 12) + 1;
          const daysInDueMonth = new Date(dueYear, dueMonth, 0).getDate();
          const dueDay = Math.min(parsed.day, daysInDueMonth);
          const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

          let status = 'por_pagar';
          let paidDate = null;
          if (dueDateStr < todayStr) {
            status = 'pagado';
            paidDate = dueDateStr;
          } else if (dueDateStr === todayStr && body.initial_status) {
            status = body.initial_status;
            if (status === 'pagado') paidDate = todayStr;
          }

          db.expense_installments.push({
            id: instId,
            expense_id: expId,
            installment_number: i,
            total_installments: numInstallments,
            amount: installmentAmount,
            due_date: dueDateStr,
            status,
            paid_date: paidDate
          });
        }
      } else {
        const instId = `inst-${expId}-1`;
        const isPast = startDate < todayStr;
        const status = isPast ? 'pagado' : (startDate === todayStr ? (body.initial_status || 'por_pagar') : 'por_pagar');
        db.expense_installments.push({
          id: instId,
          expense_id: expId,
          installment_number: 1,
          total_installments: 1,
          amount,
          due_date: startDate,
          status,
          paid_date: status === 'pagado' ? startDate : null
        });
      }

      saveLocalDB(db);
      return makeResponse(newExp, 201);
    }
  }

  if (path.startsWith('/api/expenses/')) {
    const parts = path.split('/');

    if (parts[3] === 'installments' && parts[5] === 'status' && method === 'PATCH') {
      const instId = parts[4];
      const nextStatus = body.status || 'pagado';
      const paidDate = nextStatus === 'pagado' ? todayStr : null;

      let inst = (db.expense_installments || []).find(ei => ei.id === instId);
      if (!inst) {
        const exp = db.expenses.find(e => e.id === instId);
        if (exp) {
          const targetDueDate = body.due_date || body.date || exp.start_date;
          inst = (db.expense_installments || []).find(ei => ei.expense_id === exp.id && ei.due_date === targetDueDate);
          if (!inst) {
            inst = {
              id: `inst-${exp.id}-${Date.now()}`,
              expense_id: exp.id,
              installment_number: 1,
              total_installments: 1,
              amount: exp.total_amount,
              due_date: targetDueDate,
              status: nextStatus,
              paid_date: paidDate
            };
            db.expense_installments.push(inst);
          }
        }
      }

      if (inst) {
        inst.status = nextStatus;
        inst.paid_date = paidDate;
        saveLocalDB(db);
        return makeResponse({ message: 'Estado actualizado', status: nextStatus, paidDate });
      }
      return makeResponse({ error: 'Cuota no encontrada' }, 404);
    }

    const expId = parts[3];

    if (parts.length === 4) {
      if (method === 'PUT') {
        const index = db.expenses.findIndex(e => e.id === expId);
        if (index !== -1) {
          const numInstallments = Math.max(1, parseInt(body.total_installments) || 1);
          const amount = Number(body.total_amount) || db.expenses[index].total_amount;
          const recurring = body.is_recurring ? 1 : 0;
          const startDate = body.start_date || db.expenses[index].start_date;

          db.expenses[index] = {
            ...db.expenses[index],
            title: (body.title || db.expenses[index].title).trim(),
            total_amount: amount,
            payment_method: body.payment_method || db.expenses[index].payment_method,
            bank_account_id: body.bank_account_id || db.expenses[index].bank_account_id,
            category_id: body.category_id || db.expenses[index].category_id,
            total_installments: numInstallments,
            start_date: startDate,
            notes: body.notes !== undefined ? body.notes : db.expenses[index].notes,
            is_recurring: recurring,
            recurrence_period: body.recurrence_period || db.expenses[index].recurrence_period
          };

          db.expense_installments = (db.expense_installments || []).filter(ei => ei.expense_id !== expId);
          const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;

          if (!recurring) {
            const parsed = parseYMD(startDate);
            for (let i = 1; i <= numInstallments; i++) {
              const instId = `inst-${expId}-${i}`;
              const dueYear = parsed.year + Math.floor((parsed.month - 1 + i - 1) / 12);
              const dueMonth = ((parsed.month - 1 + i - 1) % 12) + 1;
              const daysInDueMonth = new Date(dueYear, dueMonth, 0).getDate();
              const dueDay = Math.min(parsed.day, daysInDueMonth);
              const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

              db.expense_installments.push({
                id: instId,
                expense_id: expId,
                installment_number: i,
                total_installments: numInstallments,
                amount: installmentAmount,
                due_date: dueDateStr,
                status: dueDateStr < todayStr ? 'pagado' : 'por_pagar',
                paid_date: dueDateStr < todayStr ? dueDateStr : null
              });
            }
          } else {
            db.expense_installments.push({
              id: `inst-${expId}-1`,
              expense_id: expId,
              installment_number: 1,
              total_installments: 1,
              amount,
              due_date: startDate,
              status: startDate < todayStr ? 'pagado' : 'por_pagar',
              paid_date: startDate < todayStr ? startDate : null
            });
          }

          saveLocalDB(db);
          return makeResponse(db.expenses[index]);
        }
        return makeResponse({ error: 'Gasto no encontrado' }, 404);
      }

      if (method === 'DELETE') {
        db.expenses = db.expenses.filter(e => e.id !== expId);
        db.expense_installments = (db.expense_installments || []).filter(ei => ei.expense_id !== expId);
        saveLocalDB(db);
        return makeResponse({ message: 'Gasto y cuotas eliminadas' });
      }
    }

    if (parts[4] === 'move' && method === 'PATCH') {
      const { new_date, mode, original_date } = body;
      let exp = db.expenses.find(e => e.id === expId);
      let inst = (db.expense_installments || []).find(ei => ei.id === expId);
      if (!exp && inst) {
        exp = db.expenses.find(e => e.id === inst.expense_id);
      }

      if (exp) {
        if (exp.is_recurring === 1) {
          if (mode === 'cycle') {
            const newDay = new_date.split('-')[2];
            const [y, m] = exp.start_date.split('-');
            exp.start_date = `${y}-${m}-${newDay}`;
          }
          const origMonthPrefix = (original_date || new_date).slice(0, 7);
          const existingInst = (db.expense_installments || []).find(ei => ei.expense_id === exp.id && ei.due_date.startsWith(origMonthPrefix));
          if (existingInst) {
            existingInst.due_date = new_date;
          } else {
            db.expense_installments.push({
              id: `inst-${exp.id}-${Date.now()}`,
              expense_id: exp.id,
              installment_number: 1,
              total_installments: 1,
              amount: exp.total_amount,
              due_date: new_date,
              status: new_date < todayStr ? 'pagado' : 'por_pagar',
              paid_date: new_date < todayStr ? new_date : null
            });
          }
        } else {
          if (inst) {
            inst.due_date = new_date;
          } else {
            exp.start_date = new_date;
            (db.expense_installments || []).filter(ei => ei.expense_id === exp.id).forEach(ei => ei.due_date = new_date);
          }
        }
        saveLocalDB(db);
        return makeResponse({ message: 'Fecha actualizada' });
      }
      return makeResponse({ error: 'Gasto no encontrado' }, 404);
    }
  }

  // --- CALENDAR ENDPOINT ---
  if (path === '/api/calendar') {
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(searchParams.get('month')) || (new Date().getMonth() + 1);
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;
    const daysInCurrentMonth = new Date(year, month, 0).getDate();

    const monthStartObj = new Date(year, month - 1, 1);
    const monthEndObj = new Date(year, month - 1, daysInCurrentMonth);
    const monthEndStr = `${datePrefix}-${String(daysInCurrentMonth).padStart(2, '0')}`;

    const events = [];

    // 1. One-time Incomes
    db.incomes.filter(i => (!i.is_recurring) && i.date.startsWith(datePrefix)).forEach(inc => {
      const cat = db.categories.find(c => c.id === inc.category_id);
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
        category_name: cat ? cat.name : 'Ingreso',
        category_icon: cat ? cat.icon : 'wallet',
        category_color: cat ? cat.color : '#D1F2E2',
        notes: inc.notes,
        is_recurring: false
      });
    });

    // 2. Cyclic Incomes
    db.incomes.filter(i => i.is_recurring === 1 && i.date <= monthEndStr).forEach(inc => {
      const cat = db.categories.find(c => c.id === inc.category_id);
      const parsedStart = parseYMD(inc.date);
      const period = inc.recurrence_period || 'monthly';

      if (period === 'monthly') {
        const targetDay = Math.min(parsedStart.day, daysInCurrentMonth);
        const projectedDateStr = `${year}-${monthStr}-${String(targetDay).padStart(2, '0')}`;
        if (projectedDateStr >= inc.date) {
          const matchedInst = (db.income_installments || []).find(ii => ii.income_id === inc.id && ii.due_date.startsWith(datePrefix));
          const effectiveDateStr = matchedInst ? matchedInst.due_date : projectedDateStr;
          const rawId = matchedInst ? matchedInst.id : inc.id;
          const status = matchedInst ? matchedInst.status : (effectiveDateStr < todayStr ? 'pagado' : (effectiveDateStr === todayStr ? (inc.status || 'pagado') : 'por_pagar'));

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
            category_name: cat ? cat.name : 'Ingreso Cíclico',
            category_icon: cat ? cat.icon : 'wallet',
            category_color: cat ? cat.color : '#D1F2E2',
            notes: inc.notes,
            is_recurring: true,
            recurrence_period: period
          });
        }
      } else if (period === 'weekly' || period === 'biweekly') {
        const stepDays = period === 'weekly' ? 7 : 14;
        let curr = new Date(parsedStart.year, parsedStart.month - 1, parsedStart.day);
        while (curr <= monthEndObj) {
          if (curr >= monthStartObj) {
            const projectedDateStr = getLocalDateStr(curr);
            const status = projectedDateStr < todayStr ? 'pagado' : (projectedDateStr === todayStr ? (inc.status || 'pagado') : 'por_pagar');
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
              category_name: cat ? cat.name : 'Ingreso Cíclico',
              category_icon: cat ? cat.icon : 'wallet',
              category_color: cat ? cat.color : '#D1F2E2',
              notes: inc.notes,
              is_recurring: true,
              recurrence_period: period
            });
          }
          curr.setDate(curr.getDate() + stepDays);
        }
      }
    });

    // 3. One-time Expenses / Installments
    (db.expense_installments || []).forEach(inst => {
      const exp = db.expenses.find(e => e.id === inst.expense_id);
      if (exp && (!exp.is_recurring) && inst.due_date.startsWith(datePrefix)) {
        const cat = db.categories.find(c => c.id === exp.category_id);
        const isCuotas = exp.total_installments > 1;
        const subtitle = isCuotas ? ` (Cuota ${inst.installment_number}/${exp.total_installments})` : ' (Contado)';

        events.push({
          id: `inst-${inst.id}`,
          raw_id: inst.id,
          expense_id: exp.id,
          type: 'expense',
          title: `${exp.title}${subtitle}`,
          expense_title: exp.title,
          amount: inst.amount,
          total_amount: exp.total_amount,
          date: inst.due_date,
          start_date: exp.start_date,
          status: inst.status,
          installment_number: inst.installment_number,
          total_installments: exp.total_installments,
          payment_method: exp.payment_method,
          category_id: exp.category_id,
          bank_account_id: exp.bank_account_id,
          category_name: cat ? cat.name : 'Gasto',
          category_icon: cat ? cat.icon : 'shopping-bag',
          category_color: cat ? cat.color : '#FFD6E8',
          notes: exp.notes,
          is_recurring: false
        });
      }
    });

    // 4. Cyclic Expenses
    db.expenses.filter(e => e.is_recurring === 1 && e.start_date <= monthEndStr).forEach(exp => {
      const cat = db.categories.find(c => c.id === exp.category_id);
      const parsedStart = parseYMD(exp.start_date);
      const period = exp.recurrence_period || 'monthly';

      if (period === 'monthly') {
        const targetDay = Math.min(parsedStart.day, daysInCurrentMonth);
        const projectedDateStr = `${year}-${monthStr}-${String(targetDay).padStart(2, '0')}`;
        if (projectedDateStr >= exp.start_date) {
          const matchedInst = (db.expense_installments || []).find(ei => ei.expense_id === exp.id && ei.due_date.startsWith(datePrefix));
          const effectiveDateStr = matchedInst ? matchedInst.due_date : projectedDateStr;
          const status = matchedInst ? matchedInst.status : (effectiveDateStr < todayStr ? 'pagado' : 'por_pagar');
          const rawId = matchedInst ? matchedInst.id : exp.id;

          events.push({
            id: `exp-rec-${exp.id}-${effectiveDateStr}`,
            raw_id: rawId,
            expense_id: exp.id,
            type: 'expense',
            title: `🔄 ${exp.title} (Cíclico)`,
            expense_title: exp.title,
            amount: exp.total_amount,
            total_amount: exp.total_amount,
            date: effectiveDateStr,
            start_date: exp.start_date,
            status,
            category_id: exp.category_id,
            bank_account_id: exp.bank_account_id,
            payment_method: exp.payment_method,
            category_name: cat ? cat.name : 'Gasto Cíclico',
            category_icon: cat ? cat.icon : 'shopping-bag',
            category_color: cat ? cat.color : '#FFD6E8',
            notes: exp.notes,
            is_recurring: true,
            recurrence_period: period
          });
        }
      } else if (period === 'weekly' || period === 'biweekly') {
        const stepDays = period === 'weekly' ? 7 : 14;
        let curr = new Date(parsedStart.year, parsedStart.month - 1, parsedStart.day);
        while (curr <= monthEndObj) {
          if (curr >= monthStartObj) {
            const projectedDateStr = getLocalDateStr(curr);
            const matchedInst = (db.expense_installments || []).find(ei => ei.expense_id === exp.id && ei.due_date === projectedDateStr);
            const status = matchedInst ? matchedInst.status : (projectedDateStr < todayStr ? 'pagado' : 'por_pagar');
            const rawId = matchedInst ? matchedInst.id : exp.id;

            events.push({
              id: `exp-rec-${exp.id}-${projectedDateStr}`,
              raw_id: rawId,
              expense_id: exp.id,
              type: 'expense',
              title: `🔄 ${exp.title} (${period === 'weekly' ? 'Semanal' : 'Quincenal'})`,
              expense_title: exp.title,
              amount: exp.total_amount,
              total_amount: exp.total_amount,
              date: projectedDateStr,
              start_date: exp.start_date,
              status,
              category_id: exp.category_id,
              bank_account_id: exp.bank_account_id,
              payment_method: exp.payment_method,
              category_name: cat ? cat.name : 'Gasto Cíclico',
              category_icon: cat ? cat.icon : 'shopping-bag',
              category_color: cat ? cat.color : '#FFD6E8',
              notes: exp.notes,
              is_recurring: true,
              recurrence_period: period
            });
          }
          curr.setDate(curr.getDate() + stepDays);
        }
      }
    });

    return makeResponse({ year, month, events });
  }

  // --- ANALYTICS ENDPOINTS ---
  if (path === '/api/analytics/monthly') {
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(searchParams.get('month')) || (new Date().getMonth() + 1);
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const calRes = await handleLocalApiRequest(`/api/calendar?year=${year}&month=${month}`, { method: 'GET' });
    const calData = await calRes.json();
    const events = calData.events || [];

    let totalIncomes = 0;
    let totalExpenses = 0;
    const catMap = {};

    events.forEach(ev => {
      if (ev.type === 'income') {
        totalIncomes += Number(ev.amount) || 0;
      } else if (ev.type === 'expense') {
        const amt = Number(ev.amount) || 0;
        totalExpenses += amt;
        const catId = ev.category_id || 'sin-cat';
        if (!catMap[catId]) {
          catMap[catId] = {
            category_id: ev.category_id,
            category_name: ev.category_name || 'Sin categoría',
            color: ev.category_color || '#FFD6E8',
            icon: ev.category_icon || 'tag',
            total_amount: 0
          };
        }
        catMap[catId].total_amount += amt;
      }
    });

    const expensesByCategory = Object.values(catMap).sort((a, b) => b.total_amount - a.total_amount);

    const savingsAllocated = (db.transfers || [])
      .filter(t => t.date && t.date.startsWith(datePrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const topExpenses = events
      .filter(ev => ev.type === 'expense')
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5)
      .map(ev => ({
        expense_id: ev.expense_id,
        title: ev.expense_title || ev.title,
        amount: ev.amount,
        due_date: ev.date,
        category_name: ev.category_name,
        color: ev.category_color,
        icon: ev.category_icon
      }));

    return makeResponse({
      year,
      month,
      total_incomes: totalIncomes,
      total_expenses: totalExpenses,
      total_savings_allocated: savingsAllocated,
      net_balance: totalIncomes - totalExpenses - savingsAllocated,
      expenses_by_category: expensesByCategory,
      top_expenses: topExpenses
    });
  }

  if (path === '/api/analytics/annual') {
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyTrend = [];

    for (let m = 1; m <= 12; m++) {
      const calRes = await handleLocalApiRequest(`/api/calendar?year=${year}&month=${m}`, { method: 'GET' });
      const calData = await calRes.json();
      const events = calData.events || [];

      let inc = 0;
      let exp = 0;
      let cyclic = 0;
      let variable = 0;

      events.forEach(ev => {
        if (ev.type === 'income') inc += Number(ev.amount) || 0;
        if (ev.type === 'expense') {
          const amt = Number(ev.amount) || 0;
          exp += amt;
          if (ev.is_recurring) cyclic += amt;
          else variable += amt;
        }
      });

      const mStr = String(m).padStart(2, '0');
      const sav = (db.transfers || [])
        .filter(t => t.date && t.date.startsWith(`${year}-${mStr}`))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      monthlyTrend.push({
        month_number: m,
        month_name: monthsNames[m - 1],
        incomes: inc,
        expenses: exp,
        savings: sav,
        cyclic_expenses: cyclic,
        variable_expenses: variable,
        net_balance: inc - exp,
        savings_rate: inc > 0 ? parseFloat((((inc - exp) / inc) * 100).toFixed(1)) : 0
      });
    }

    const bankMap = {};
    db.bank_accounts.forEach(ba => {
      const name = ba.institution_name || 'Efectivo / Sin Banco';
      if (!bankMap[name]) {
        bankMap[name] = { institution_name: name, total_amount: 0, color: ba.color || '#E3D5FF' };
      }
      bankMap[name].total_amount += Number(ba.balance) || 0;
    });

    const savingsByBank = Object.values(bankMap).sort((a, b) => b.total_amount - a.total_amount);
    const totalSavings = savingsByBank.reduce((s, b) => s + b.total_amount, 0);

    return makeResponse({
      year,
      expenses_by_category: [],
      monthly_trend: monthlyTrend,
      future_commitments: [],
      savings_by_bank: savingsByBank,
      total_savings: totalSavings
    });
  }

  // --- BULK IMPORT ENDPOINT ---
  if (path === '/api/import/bulk' && method === 'POST') {
    const { items } = body;
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item.type === 'income') {
          db.incomes.push({
            id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            user_id: 'local-user',
            title: item.title || 'Ingreso importado',
            amount: Number(item.amount) || 0,
            date: item.date || todayStr,
            category_id: null,
            bank_account_id: null,
            status: item.status || 'pagado',
            notes: item.notes || 'Importado vía Excel/CSV',
            is_recurring: 0,
            recurrence_period: 'monthly'
          });
        } else {
          const expId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const amount = Number(item.amount) || 0;
          db.expenses.push({
            id: expId,
            user_id: 'local-user',
            title: item.title || 'Gasto importado',
            total_amount: amount,
            payment_method: 'contado',
            bank_account_id: null,
            category_id: null,
            total_installments: 1,
            start_date: item.date || todayStr,
            notes: item.notes || 'Importado vía Excel/CSV',
            is_recurring: 0,
            recurrence_period: 'monthly'
          });
          if (!db.expense_installments) db.expense_installments = [];
          db.expense_installments.push({
            id: `inst-${expId}-1`,
            expense_id: expId,
            installment_number: 1,
            total_installments: 1,
            amount,
            due_date: item.date || todayStr,
            status: item.status || 'pagado',
            paid_date: item.status === 'pagado' ? (item.date || todayStr) : null
          });
        }
      });
      saveLocalDB(db);
      return makeResponse({ message: `${items.length} registros importados exitosamente` });
    }
    return makeResponse({ error: 'Formato no válido' }, 400);
  }

  return makeResponse({ message: 'OK local' });
};
