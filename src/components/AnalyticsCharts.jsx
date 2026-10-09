import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  ComposedChart, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  BarChart3, PieChart as PieIcon, TrendingUp, PiggyBank,
  Trophy, Repeat, CalendarClock, Percent, Sparkles, Receipt
} from 'lucide-react';
import KawaiiIcon from './KawaiiIcon';

const KAWAII_CHART_COLORS = [
  '#FF6B8B', // Rosa Chicle Vibrante
  '#2EC4B6', // Turquesa Menta
  '#9D4EDD', // Púrpura Violeta
  '#FF9F1C', // Naranja Dorado
  '#3A86FF', // Azul Celeste
  '#FF477E', // Frambuesa Intenso
  '#06D6A0', // Verde Menta
  '#FFB703', // Amarillo Sol
  '#8338EC', // Orquídea Púrpura
  '#E76F51'  // Coral Cálido
];

export default function AnalyticsCharts() {
  const {
    monthlyAnalytics,
    annualAnalytics,
    selectedMonth,
    selectedYear,
  } = useData();

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'annual'

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Datos de gastos por categoría para el mes seleccionado
  const monthlyCategoryData = (monthlyAnalytics?.expenses_by_category || []).map((item, index) => ({
    name: item.category_name,
    value: item.total_amount || 0,
    color: KAWAII_CHART_COLORS[index % KAWAII_CHART_COLORS.length]
  }));

  // Top 5 gastos del mes
  const topExpenses = monthlyAnalytics?.top_expenses || [];

  // Datos para gráficos anuales
  const annualCategoryData = (annualAnalytics?.expenses_by_category || []).map((item, index) => ({
    name: item.category_name,
    value: item.total_amount || 0,
    color: KAWAII_CHART_COLORS[index % KAWAII_CHART_COLORS.length]
  }));

  const trendData = annualAnalytics?.monthly_trend || [];
  const futureCommitmentData = annualAnalytics?.future_commitments || [];

  // Datos para gráfico de Ahorros por Institución Financiera
  const savingsBankData = (annualAnalytics?.savings_by_bank || []).map((item, index) => ({
    name: item.institution_name,
    value: item.total_amount || 0,
    color: KAWAII_CHART_COLORS[index % KAWAII_CHART_COLORS.length]
  }));

  // Label en porcentaje dentro de los trozos de gráfico de torta
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: '11px',
          fontWeight: '800',
          filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.9))'
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom Tooltip para Dinero en CLP
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] p-3 rounded-2xl shadow-kawaii text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] z-50">
          {label && <p className="mb-1.5 text-xs font-black text-[#4A3E3D] dark:text-[#F5E8FB] border-b border-gray-300 dark:border-gray-700 pb-1">{label}</p>}
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 my-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block border border-[#4A3E3D] shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-extrabold">{formatMoney(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip para Porcentajes (%)
  const PercentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#FFFDF0] dark:bg-[#1C1724] border-2 border-[#4A3E3D] dark:border-[#8A7398] p-3 rounded-2xl shadow-kawaii text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] z-50">
          {label && <p className="mb-1.5 text-xs font-black text-[#4A3E3D] dark:text-[#F5E8FB] border-b border-gray-300 dark:border-gray-700 pb-1">{label}</p>}
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 my-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block border border-[#4A3E3D] shadow-sm" style={{ backgroundColor: entry.color || entry.stroke }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getRankBadge = (idx) => {
    const badges = [
      { bg: 'bg-[#FFD6E8] text-[#4A3E3D]', emoji: '🥇' },
      { bg: 'bg-[#E3D5FF] text-[#4A3E3D]', emoji: '🥈' },
      { bg: 'bg-[#FFF1C5] text-[#4A3E3D]', emoji: '🥉' },
      { bg: 'bg-[#D1F2E2] text-[#4A3E3D]', emoji: '4º' },
      { bg: 'bg-gray-200 dark:bg-[#3D354A] text-[#4A3E3D] dark:text-[#F5E8FB]', emoji: '5º' }
    ];
    return badges[idx] || badges[4];
  };

  return (
    <div className="space-y-6">
      {/* Header y Selector de Vista */}
      <div className="kawaii-card bg-white dark:bg-[#2A2335] p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <BarChart3 className="text-pink-600 dark:text-pink-400" size={28} />
              <span>Gráficos y Analíticas Financieras</span>
            </h2>
            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80">
              Visualiza tus tendencias de ingresos, gastos, tasa de ahorro y cuotas futuras comprometidas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-[#FFD6E8] text-[#4A3E3D] shadow-kawaii dark:shadow-kawaii-dark'
                  : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB] hover:bg-gray-100 dark:hover:bg-[#2A2335]'
              }`}
            >
              Mensual ({monthsList[selectedMonth - 1]})
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold border-2 border-[#4A3E3D] dark:border-[#8A7398] transition-all cursor-pointer ${
                viewMode === 'annual'
                  ? 'bg-[#E3D5FF] text-[#4A3E3D] shadow-kawaii dark:shadow-kawaii-dark'
                  : 'bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB] hover:bg-gray-100 dark:hover:bg-[#2A2335]'
              }`}
            >
              Anual ({selectedYear})
            </button>
          </div>
        </div>
      </div>

      {/* GRÁFICO ANCLA DEL DASHBOARD: Ingresos vs. Gastos en el tiempo + Balance Neto superpuesto */}
      <div className="kawaii-card bg-white dark:bg-[#2A2335]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <TrendingUp size={22} className="text-[#9D4EDD]" />
              <span>Gráfico Ancla: Ingresos vs. Gastos y Balance Neto ({selectedYear})</span>
            </h3>
            <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70">
              Comparativa mes a mes con barras de Ingresos (verde) y Gastos (rosa) junto a la línea de Balance Neto (púrpura)
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E3D5FF] dark:bg-[#5E476B] text-[#4A3E3D] dark:text-[#F5E8FB] border border-[#4A3E3D] self-start sm:self-auto">
            <Sparkles size={12} /> Principal Dashboard
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8A7398" opacity={0.25} />
              <XAxis dataKey="month_name" stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} />
              <YAxis stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Bar dataKey="incomes" name="Ingresos" fill="#06D6A0" stroke="#4A3E3D" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#FF477E" stroke="#4A3E3D" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="net_balance" name="Balance Neto" stroke="#9D4EDD" strokeWidth={3.5} dot={{ r: 5, fill: '#9D4EDD', stroke: '#4A3E3D', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        /* VISTA MENSUAL */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Torta de Gastos por Categoría */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335]">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4 flex items-center gap-2">
              <PieIcon size={20} className="text-[#FF6B8B]" />
              <span>Distribución de Gastos por Clasificación</span>
            </h3>

            {monthlyCategoryData.length === 0 ? (
              <div className="text-center py-16 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
                <span className="text-4xl">📊</span>
                <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No hay gastos registrados en {monthsList[selectedMonth - 1]}</p>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyCategoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {monthlyCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#4A3E3D" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* LISTA TOP 5 GASTOS MÁS ALTOS DEL MES (Reemplaza la barra por clasificación) */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
                <Trophy size={20} className="text-[#FF9F1C]" />
                <span>Top 5 Gastos Más Altos del Mes</span>
              </h3>
              <span className="text-[10px] font-bold text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 bg-[#FFF1C5] dark:bg-[#4A3E2A] px-2 py-0.5 rounded-full border border-[#4A3E3D]">
                {monthsList[selectedMonth - 1]}
              </span>
            </div>

            {topExpenses.length === 0 ? (
              <div className="text-center py-16 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
                <span className="text-4xl">🏆</span>
                <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">Sin gastos registrados en este período</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenses.map((exp, idx) => {
                  const badge = getRankBadge(idx);
                  return (
                    <div
                      key={exp.expense_id || idx}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 border-[#4A3E3D] dark:border-[#8A7398] bg-[#FFFDF0] dark:bg-[#1C1724] shadow-kawaii-sm hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl border-2 border-[#4A3E3D] flex items-center justify-center text-xs font-extrabold shadow-sm ${badge.bg}`}>
                          {badge.emoji}
                        </span>
                        <KawaiiIcon
                          name={exp.icon || 'tag'}
                          color={exp.color || '#FFD6E8'}
                          size="sm"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">{exp.title}</h4>
                          <p className="text-[10px] text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 font-medium">
                            🏷️ {exp.category_name} • 📅 {exp.due_date}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-[#4A3E3D] dark:text-[#F5E8FB] block">
                          {formatMoney(exp.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* NUEVOS GRÁFICOS ADICIONALES (Visibles en Vista Anual o General) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tasa de Ahorro Mensual (%) */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335]">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1 flex items-center gap-2">
            <Percent size={20} className="text-[#3A86FF]" />
            <span>Tasa de Ahorro Mensual (%)</span>
          </h3>
          <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mb-4">
            Porcentaje de ingresos destinados a ahorro: (Ahorros Destinados / Ingresos)
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8A7398" opacity={0.25} />
                <XAxis dataKey="month_name" stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<PercentTooltip />} />
                <Line type="monotone" dataKey="savings_rate" name="Tasa de Ahorro (%)" stroke="#3A86FF" strokeWidth={3} dot={{ r: 5, fill: '#3A86FF', stroke: '#4A3E3D', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Gastos Cíclicos / Fijos vs. Variables */}
        <div className="kawaii-card bg-white dark:bg-[#2A2335]">
          <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1 flex items-center gap-2">
            <Repeat size={20} className="text-[#FF9F1C]" />
            <span>Gastos Cíclicos vs. Variables</span>
          </h3>
          <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mb-4">
            Comparativa de gastos fijos/recurrentes vs. discrecionales/variables por mes
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8A7398" opacity={0.25} />
                <XAxis dataKey="month_name" stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="cyclic_expenses" name="Fijo / Recurrente" fill="#FF9F1C" stroke="#4A3E3D" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
                <Bar dataKey="variable_expenses" name="Variable / Discrecional" fill="#2EC4B6" stroke="#4A3E3D" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE CUOTAS COMPROMETIDAS A FUTURO */}
      <div className="kawaii-card bg-white dark:bg-[#2A2335]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
              <CalendarClock size={22} className="text-[#8338EC]" />
              <span>Cuotas Comprometidas a Futuro (Próximos Meses)</span>
            </h3>
            <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70">
              Anticipación de gastos ya pactados en cuotas y compromisos futuros pendientes
            </p>
          </div>
        </div>

        {futureCommitmentData.length === 0 ? (
          <div className="text-center py-12 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
            <span className="text-3xl">🗓️</span>
            <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No tienes cuotas futuras registradas</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={futureCommitmentData} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8A7398" opacity={0.25} />
                <XAxis dataKey="month_label" stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis stroke="#8A7398" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="committed_amount" name="Monto Comprometido" fill="#8338EC" stroke="#4A3E3D" strokeWidth={1.5} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {viewMode === 'annual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Ahorros por Institución Financiera */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335]">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4 flex items-center gap-2">
              <PiggyBank size={20} className="text-[#3A86FF]" />
              <span>Distribución de Ahorros por Banco / Entidad</span>
            </h3>

            {savingsBankData.length === 0 ? (
              <div className="text-center py-16 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
                <span className="text-4xl">🏦</span>
                <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">No tienes fuentes de ahorro registradas</p>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={savingsBankData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {savingsBankData.map((entry, index) => (
                        <Cell key={`cell-bank-${index}`} fill={entry.color} stroke="#4A3E3D" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Gastos Anuales por Categoría */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335]">
            <h3 className="text-base font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-4 flex items-center gap-2">
              <PieIcon size={20} className="text-[#FF9F1C]" />
              <span>Gastos Anuales por Clasificación</span>
            </h3>

            {annualCategoryData.length === 0 ? (
              <div className="text-center py-16 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-dashed border-[#4A3E3D]/30 dark:border-[#8A7398]">
                <span className="text-4xl">🌸</span>
                <p className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mt-2">Sin gastos en este año</p>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={annualCategoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {annualCategoryData.map((entry, index) => (
                        <Cell key={`cell-annual-${index}`} fill={entry.color} stroke="#4A3E3D" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
