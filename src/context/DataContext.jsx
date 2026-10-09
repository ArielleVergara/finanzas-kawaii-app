import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { token, user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [bankAccountsData, setBankAccountsData] = useState({ accounts: [], total_balance: 0, total_credit_limit: 0 });
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [calendarData, setCalendarData] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, events: [] });
  const [monthlyAnalytics, setMonthlyAnalytics] = useState(null);
  const [annualAnalytics, setAnnualAnalytics] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }), [token]);

  const loadCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/categories', { headers: authHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  }, [token, authHeaders]);

  const loadBankAccounts = useCallback(async (year = selectedYear, month = selectedMonth) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/bank-accounts?year=${year}&month=${month}`, { headers: authHeaders() });
      if (res.ok) setBankAccountsData(await res.json());
    } catch (e) { console.error(e); }
  }, [token, selectedYear, selectedMonth, authHeaders]);

  const loadIncomes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/incomes', { headers: authHeaders() });
      if (res.ok) setIncomes(await res.json());
    } catch (e) { console.error(e); }
  }, [token, authHeaders]);

  const loadExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/expenses', { headers: authHeaders() });
      if (res.ok) setExpenses(await res.json());
    } catch (e) { console.error(e); }
  }, [token, authHeaders]);

  const loadCalendar = useCallback(async (year = selectedYear, month = selectedMonth) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`, { headers: authHeaders() });
      if (res.ok) setCalendarData(await res.json());
    } catch (e) { console.error(e); }
  }, [token, selectedYear, selectedMonth, authHeaders]);

  const loadAnalytics = useCallback(async (year = selectedYear, month = selectedMonth) => {
    if (!token) return;
    try {
      const resM = await fetch(`/api/analytics/monthly?year=${year}&month=${month}`, { headers: authHeaders() });
      if (resM.ok) setMonthlyAnalytics(await resM.json());

      const resA = await fetch(`/api/analytics/annual?year=${year}`, { headers: authHeaders() });
      if (resA.ok) setAnnualAnalytics(await resA.json());
    } catch (e) { console.error(e); }
  }, [token, selectedYear, selectedMonth, authHeaders]);

  const refreshAllData = useCallback(() => {
    if (token && user) {
      loadCategories();
      loadBankAccounts();
      loadIncomes();
      loadExpenses();
      loadCalendar(selectedYear, selectedMonth);
      loadAnalytics(selectedYear, selectedMonth);
    }
  }, [token, user, loadCategories, loadBankAccounts, loadIncomes, loadExpenses, loadCalendar, loadAnalytics, selectedYear, selectedMonth]);

  useEffect(() => {
    refreshAllData();
  }, [token, user, selectedMonth, selectedYear, refreshAllData]);

  return (
    <DataContext.Provider value={{
      categories,
      bankAccountsData,
      incomes,
      expenses,
      calendarData,
      monthlyAnalytics,
      annualAnalytics,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      refreshAllData,
      loadCalendar,
      loadAnalytics,
      authHeaders
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
