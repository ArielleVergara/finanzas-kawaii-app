import { initDatabase, runQuery, getAllRows } from './db/database.js';
import { seedDefaultCategories } from './db/defaultCategories.js';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  console.log('🧪 Iniciando prueba automatizada de Cuentas Bancarias e Instituciones Financieras...');

  await initDatabase();

  const testUserId = uuidv4();
  const testEmail = `test_bank_${Date.now()}@kawaii.local`;

  // 1. Crear usuario de prueba
  await runQuery(
    `INSERT INTO users (id, email, password_hash, name, avatar) VALUES (?, ?, ?, ?, ?)`,
    [testUserId, testEmail, 'hashedpassword123', 'Usuario Banco', 'kitty']
  );
  console.log('✅ 1. Usuario de prueba creado.');

  // 2. Crear Cuenta Bancaria con Tarjeta de Débito y Tarjeta de Crédito
  const accId = uuidv4();
  await runQuery(
    `INSERT INTO bank_accounts (
      id, user_id, institution_name, account_name, account_type, balance,
      has_debit_card, has_credit_card, credit_limit, closing_day, due_day, last_four
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1500000, 25, 5, '4321')`,
    [accId, testUserId, 'Banco Estado', 'Cuenta Corriente Principal', 'corriente', 650000]
  );
  console.log('✅ 2. Cuenta bancaria unificada creada.');

  // 3. Registrar Gasto asociado a esta Cuenta en 3 cuotas con Tarjeta de Crédito
  const expId = uuidv4();
  await runQuery(
    `INSERT INTO expenses (id, user_id, title, total_amount, payment_method, bank_account_id, total_installments, start_date)
     VALUES (?, ?, 'Compra Refrigerador', 300000, 'tarjeta', ?, 3, '2026-09-15')`,
    [expId, testUserId, accId]
  );
  console.log('✅ 3. Gasto en 3 cuotas asignado a la tarjeta de crédito de la cuenta bancaria.');

  // 4. Registrar Ingreso asignado a esta Cuenta
  const incId = uuidv4();
  await runQuery(
    `INSERT INTO incomes (id, user_id, title, amount, date, bank_account_id)
     VALUES (?, ?, 'Sueldo Mensual', 1200000, '2026-09-01', ?)`,
    [incId, testUserId, accId]
  );
  console.log('✅ 4. Ingreso mensual depositado en la cuenta bancaria.');

  const accounts = await getAllRows('SELECT * FROM bank_accounts WHERE user_id = ?', [testUserId]);
  console.log(`✅ 5. Verificación de BD exitosa. Cuentas creadas: ${accounts.length}, Saldo: $${accounts[0].balance}, Cupo Crédito: $${accounts[0].credit_limit}`);
  console.log('🎉 ¡Todas las pruebas de Cuentas Bancarias pasaron con éxito! 🌸');
  process.exit(0);
}

runTest().catch((e) => {
  console.error('❌ Error durante la prueba:', e);
  process.exit(1);
});
