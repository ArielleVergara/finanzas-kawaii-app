import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAllRows } from './database.js';

export const defaultCategoriesList = [
  { name: 'Comida', type: 'expense', icon: 'utensils', color: '#FFB7B2' },
  { name: 'Gastos Comunes (Agua, Luz, Gas, Net)', type: 'expense', icon: 'home', color: '#FFF1C5' },
  { name: 'Ropa', type: 'expense', icon: 'shirt', color: '#FFD6E8' },
  { name: 'Entretenimiento', type: 'expense', icon: 'gamepad', color: '#E3D5FF' },
  { name: 'Salud', type: 'expense', icon: 'heart-pulse', color: '#D0F4DE' },
  { name: 'Sueldo / Salario', type: 'income', icon: 'wallet', color: '#D1F2E2' },
  { name: 'Ventas / Extra', type: 'income', icon: 'sparkles', color: '#FFE6C7' },
];

export const seedDefaultCategories = async (userId) => {
  const existing = await getAllRows('SELECT id FROM categories WHERE user_id = ?', [userId]);
  if (existing.length > 0) return;

  for (const cat of defaultCategoriesList) {
    await runQuery(
      `INSERT INTO categories (id, user_id, name, type, icon, color, is_default)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [uuidv4(), userId, cat.name, cat.type, cat.icon, cat.color]
    );
  }
};
