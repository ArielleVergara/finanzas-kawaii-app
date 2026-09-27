import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/kawaii_finances.db';
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

sqlite3.verbose();
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite database:', err.message);
  } else {
    console.log('🌸 Conectado exitosamente a la base de datos SQLite en:', dbPath);
  }
});

// Activar claves foráneas
db.run('PRAGMA foreign_keys = ON;');

export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const getAllRows = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDatabase = async () => {
  try {
    // Tabla Usuarios
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT 'bunny',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla Categorías
    await runQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        icon TEXT DEFAULT 'tag',
        color TEXT DEFAULT '#FFD6E8',
        is_default INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Tabla Cuentas Bancarias e Instituciones Financieras
    await runQuery(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        institution_name TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_type TEXT DEFAULT 'corriente',
        is_savings INTEGER DEFAULT 0,
        balance REAL DEFAULT 0,
        annual_return_rate REAL DEFAULT 0,
        return_frequency TEXT DEFAULT 'diario',
        has_debit_card INTEGER DEFAULT 0,
        has_credit_card INTEGER DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        closing_day INTEGER DEFAULT 25,
        due_day INTEGER DEFAULT 5,
        last_four TEXT DEFAULT '',
        color TEXT DEFAULT '#E3D5FF',
        icon TEXT DEFAULT 'landmark',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Tabla Historial de Saldo y Rendimiento Mensual de Inversiones (Fintual, Fondos, etc)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS account_balance_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bank_account_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        ending_balance REAL NOT NULL,
        net_transfers REAL DEFAULT 0,
        calculated_yield REAL DEFAULT 0,
        yield_percentage REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
      );
    `);

    // Tabla Ingresos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        category_id TEXT,
        bank_account_id TEXT,
        status TEXT CHECK(status IN ('pagado', 'por_pagar')) DEFAULT 'pagado',
        notes TEXT,
        is_recurring INTEGER DEFAULT 0,
        recurrence_period TEXT DEFAULT 'monthly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
      );
    `);

    // Tabla Gastos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('contado', 'tarjeta', 'debito')) NOT NULL,
        bank_account_id TEXT,
        category_id TEXT,
        total_installments INTEGER DEFAULT 1,
        start_date DATE NOT NULL,
        notes TEXT,
        is_recurring INTEGER DEFAULT 0,
        recurrence_period TEXT DEFAULT 'monthly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    // Tabla Cuotas de Gastos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS expense_installments (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        installment_number INTEGER NOT NULL,
        total_installments INTEGER NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT CHECK(status IN ('pagado', 'por_pagar')) DEFAULT 'por_pagar',
        paid_date DATE,
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
      );
    `);

    // Tabla Ocurrencias / Excepciones de Ingresos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS income_installments (
        id TEXT PRIMARY KEY,
        income_id TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT CHECK(status IN ('pagado', 'por_pagar')) DEFAULT 'por_pagar',
        paid_date DATE,
        FOREIGN KEY (income_id) REFERENCES incomes(id) ON DELETE CASCADE
      );
    `);

    // Tabla Transferencias / Aportes a Ahorros entre Cuentas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_account_id TEXT NOT NULL,
        destination_account_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (destination_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
      );
    `);

    // Migraciones seguras si la BD ya existía anteriormente
    try { await runQuery(`ALTER TABLE bank_accounts ADD COLUMN is_savings INTEGER DEFAULT 0;`); } catch (e) {}
    try { await runQuery(`ALTER TABLE bank_accounts ADD COLUMN annual_return_rate REAL DEFAULT 0;`); } catch (e) {}
    try { await runQuery(`ALTER TABLE bank_accounts ADD COLUMN return_frequency TEXT DEFAULT 'diario';`); } catch (e) {}
    try { await runQuery(`ALTER TABLE incomes ADD COLUMN bank_account_id TEXT;`); } catch (e) {}
    try { await runQuery(`ALTER TABLE expenses ADD COLUMN bank_account_id TEXT;`); } catch (e) {}
    try { await runQuery(`ALTER TABLE incomes ADD COLUMN is_recurring INTEGER DEFAULT 0;`); } catch (e) {}
    try { await runQuery(`ALTER TABLE incomes ADD COLUMN recurrence_period TEXT DEFAULT 'monthly';`); } catch (e) {}
    try { await runQuery(`ALTER TABLE expenses ADD COLUMN is_recurring INTEGER DEFAULT 0;`); } catch (e) {}
    // Auto-clasificar elementos con fecha pasada como 'pagado' y futuros como 'por_pagar'
    try {
      await runQuery(`UPDATE expense_installments SET status = 'pagado', paid_date = due_date WHERE due_date < DATE('now') AND status = 'por_pagar'`);
      await runQuery(`UPDATE expense_installments SET status = 'por_pagar', paid_date = NULL WHERE due_date > DATE('now') AND status = 'pagado'`);
      await runQuery(`UPDATE incomes SET status = 'pagado' WHERE date < DATE('now') AND status = 'por_pagar'`);
      await runQuery(`UPDATE incomes SET status = 'por_pagar' WHERE date > DATE('now') AND status = 'pagado'`);
    } catch (e) {}

    console.log('✨ Base de datos estructurada con Cuentas Bancarias, Rentabilidad de Ahorros e Historial de Inversiones.');
  } catch (err) {
    console.error('Error al inicializar las tablas:', err);
  }
};

export default db;
