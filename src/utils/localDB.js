/**
 * Antigravity - Local Database & Offline Backup System
 * Permite el funcionamiento 100% autónomo, privado y offline en dispositivos móviles/tablets.
 * Incluye funciones para Exportar e Importar Copias de Seguridad (Backup JSON).
 */

const LOCAL_STORAGE_KEY = 'kawaii_app_local_db_v1';

export const getDefaultLocalDB = () => ({
  users: [],
  categories: [],
  bank_accounts: [],
  incomes: [],
  expenses: [],
  expense_installments: [],
  income_installments: [],
  transfers: [],
  account_balance_history: [],
});

export const getLocalDB = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultLocalDB();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
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
    };

    saveLocalDB(updatedDB);
    return { success: true };
  } catch (err) {
    console.error('Error al importar respaldo JSON:', err);
    return { success: false, error: err.message || 'No se pudo leer el archivo de respaldo.' };
  }
};
