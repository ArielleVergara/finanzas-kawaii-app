import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import KawaiiIcon from './KawaiiIcon';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  ArrowRight, RefreshCw, Sparkles, Filter, CheckSquare, Square,
  Download, HelpCircle, Save, Trash2, Edit3, ChevronDown, Layers, CopyX, Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SpreadsheetImporter({ setActiveTab }) {
  const { categories, bankAccountsData, incomes, expenses, authHeaders, refreshAllData } = useData();

  // Pasos de la importación: 1: Subir archivo, 2: Mapear columnas, 3: Revisar y completar datos, 4: Resultado
  const [step, setStep] = useState(1);

  // Archivo y hojas
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  // Configuración de Mapeo de Columnas
  const [mappingStrategy, setMappingStrategy] = useState('separate_columns'); // 'separate_columns', 'single_amount', 'type_column'
  const [colDate, setColDate] = useState('');
  const [colTitle, setColTitle] = useState('');
  const [colAmount, setColAmount] = useState('');
  const [colType, setColType] = useState('');
  const [colCategory, setColCategory] = useState('');
  const [colAccount, setColAccount] = useState('');
  const [colNotes, setColNotes] = useState('');

  // Arreglos dinámicos para soportar múltiples columnas opcionales de ingresos y gastos
  const [incomeCols, setIncomeCols] = useState(['']);
  const [expenseCols, setExpenseCols] = useState(['']);

  // Filas procesadas e interactivas
  const [processedRows, setProcessedRows] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'warnings', 'duplicates', 'incomes', 'expenses'
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Cuentas y categorías disponibles
  const accountsList = bankAccountsData?.accounts || [];
  const incomeCategories = useMemo(() => categories?.filter(c => c.type === 'income') || [], [categories]);
  const expenseCategories = useMemo(() => categories?.filter(c => c.type === 'expense') || [], [categories]);

  // Palabras clave de clasificación frecuente
  const INCOME_KEYWORDS = [
    'sueldo', 'nomina', 'nómina', 'honorario', 'honorarios', 'deposito', 'depósito',
    'transferencia recibida', 'reembolso', 'devolucion', 'devolución', 'abono', 'pago de cliente',
    'venta', 'ingreso', 'renta', 'dividendo', 'freelance', 'cashback', 'intereses', 'aguinaldo'
  ];

  const EXPENSE_KEYWORDS = [
    'super', 'supermercado', 'compra', 'cuota', 'tarjeta', 'farmacia', 'restaurante',
    'comida', 'uber', 'didi', 'cabify', 'bencina', 'combustible', 'arriendo', 'alquiler',
    'luz', 'agua', 'gas', 'internet', 'netflix', 'spotify', 'gasto', 'cargo', 'pago',
    'debito', 'débito', 'tienda', 'retail', 'seguro', 'medico', 'médico'
  ];

  // Métodos para gestionar dinámicamente múltiples columnas de Ingresos
  const addIncomeCol = () => setIncomeCols(prev => [...prev, '']);
  const updateIncomeCol = (idx, val) => setIncomeCols(prev => { const n = [...prev]; n[idx] = val; return n; });
  const removeIncomeCol = (idx) => setIncomeCols(prev => prev.filter((_, i) => i !== idx));

  // Métodos para gestionar dinámicamente múltiples columnas de Gastos
  const addExpenseCol = () => setExpenseCols(prev => [...prev, '']);
  const updateExpenseCol = (idx, val) => setExpenseCols(prev => { const n = [...prev]; n[idx] = val; return n; });
  const removeExpenseCol = (idx) => setExpenseCols(prev => prev.filter((_, i) => i !== idx));

  // Algoritmo de Detección de Duplicados en base a Fecha, Monto y Concepto/Título
  const checkIsDuplicate = (date, amount, title, type) => {
    if (!date || !amount || !title.trim()) return false;

    const normTitle = title.trim().toLowerCase();
    const targetAmount = Number(amount);

    if (type === 'income') {
      return (incomes || []).some(inc => {
        const sameDate = inc.date === date;
        if (!sameDate) return false;

        const sameAmount = Number(inc.amount) === targetAmount;
        if (!sameAmount) return false;

        const sameTitle = (inc.title || '').trim().toLowerCase() === normTitle;
        return sameTitle;
      });
    } else {
      return (expenses || []).some(exp => {
        const sameDate = exp.start_date === date;
        if (!sameDate) return false;

        const sameAmount = Number(exp.total_amount) === targetAmount;
        if (!sameAmount) return false;

        const sameTitle = (exp.title || '').trim().toLowerCase() === normTitle;
        return sameTitle;
      });
    }
  };

  // Helper para descargar plantilla CSV de ejemplo con aclaración de Notas (Opcional)
  const downloadSampleCSV = () => {
    const csvContent = `Fecha,Descripción,Ingreso Base,Ingreso Extra,Gasto Fijo,Gasto Variable,Notas (Opcional)
2026-09-01,Sueldo y Honorarios,1500000,200000,0,0,Nómina mensual
2026-09-02,Compras del hogar,0,0,85400,15000,Supermercado Jumbo
2026-09-05,Servicios Básicos,0,0,45000,12000,Luz y agua
2026-09-10,Venta Extra,0,35000,0,0,Venta de mueble usado`;

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Finanzas_Kawaii.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Procesar archivo Excel/CSV subido
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);
        parseSheet(wb, firstSheet);
      } catch (err) {
        console.error(err);
        alert('Error al leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Leer filas y encabezados de la hoja seleccionada
  const parseSheet = (wb, sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length === 0) {
      alert('La hoja seleccionada está vacía.');
      return;
    }

    let headerIdx = 0;
    while (headerIdx < jsonData.length && jsonData[headerIdx].every(val => !val)) {
      headerIdx++;
    }

    if (headerIdx >= jsonData.length) {
      alert('No se encontraron datos en la hoja.');
      return;
    }

    const headers = jsonData[headerIdx].map(h => String(h).trim());
    const dataRows = jsonData.slice(headerIdx + 1).filter(row => row.some(val => val !== ''));

    setRawHeaders(headers);
    setRawRows(dataRows);

    autoDetectColumns(headers);
    setStep(2);
  };

  // Detección automática inteligente de columnas seguras (incluyendo múltiples de ingreso/gasto)
  const autoDetectColumns = (headers) => {
    let dCol = '', tCol = '', aCol = '', typeCol = '', catCol = '', accCol = '', nCol = '';
    const detectedIncCols = [];
    const detectedExpCols = [];

    headers.forEach((h) => {
      const hLower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (!dCol && (hLower.includes('fecha') || hLower.includes('date') || hLower.includes('dia'))) dCol = h;
      if (!tCol && (hLower.includes('descrip') || hLower.includes('concepto') || hLower.includes('detalle') || hLower.includes('nombre') || hLower.includes('titulo') || hLower.includes('memo'))) tCol = h;

      if (hLower.includes('ingreso') || hLower.includes('abono') || hLower.includes('entrada') || hLower.includes('renta')) {
        detectedIncCols.push(h);
      }
      if (hLower.includes('gasto') || hLower.includes('cargo') || hLower.includes('salida') || hLower.includes('egreso') || hLower.includes('imprevisto')) {
        detectedExpCols.push(h);
      }

      if (!typeCol && (hLower === 'tipo' || hLower.includes('tipo de') || hLower.includes('clase') || hLower.includes('movimiento'))) typeCol = h;
      if (!aCol && (hLower.includes('monto') || hLower.includes('valor') || hLower.includes('importe') || hLower.includes('cantidad'))) aCol = h;

      if (!catCol && (hLower.includes('categor') || hLower.includes('rubro') || hLower.includes('grupo'))) catCol = h;
      if (!accCol && (hLower.includes('cuenta') || hLower.includes('banco') || hLower.includes('metodo') || hLower.includes('pago'))) accCol = h;
      if (!nCol && (hLower.includes('nota') || hLower.includes('observacion') || hLower.includes('comentario'))) nCol = h;
    });

    setColDate(dCol || headers[0] || '');
    setColTitle(tCol || headers[1] || headers[0] || '');
    setColCategory(catCol || '');
    setColAccount(accCol || '');
    setColNotes(nCol || '');

    setIncomeCols(detectedIncCols.length > 0 ? detectedIncCols : ['']);
    setExpenseCols(detectedExpCols.length > 0 ? detectedExpCols : ['']);

    if (detectedIncCols.length > 0 || detectedExpCols.length > 0) {
      setMappingStrategy('separate_columns');
    } else if (typeCol && aCol) {
      setMappingStrategy('type_column');
      setColType(typeCol);
      setColAmount(aCol);
    } else {
      setMappingStrategy('single_amount');
      setColAmount(aCol || headers[2] || '');
    }
  };

  // Convertir fecha de Excel/String a formato YYYY-MM-DD
  const formatExcelDate = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    const str = String(val).trim();
    const partsSlash = str.split('/');
    if (partsSlash.length === 3) {
      if (partsSlash[0].length === 4) return `${partsSlash[0]}-${partsSlash[1].padStart(2, '0')}-${partsSlash[2].padStart(2, '0')}`;
      return `${partsSlash[2]}-${partsSlash[1].padStart(2, '0')}-${partsSlash[0].padStart(2, '0')}`;
    }
    const partsDash = str.split('-');
    if (partsDash.length === 3) {
      if (partsDash[0].length === 4) return `${partsDash[0]}-${partsDash[1].padStart(2, '0')}-${partsDash[2].padStart(2, '0')}`;
      return `${partsDash[2]}-${partsDash[1].padStart(2, '0')}-${partsDash[0].padStart(2, '0')}`;
    }

    return new Date().toISOString().split('T')[0];
  };

  // 2. Procesar filas mapeadas al paso 3 (Soporta múltiples columnas opcionales)
  const handleApplyMapping = () => {
    if (!colDate || !colTitle) {
      alert('Por favor selecciona al menos las columnas para Fecha y Descripción.');
      return;
    }

    const formattedRows = [];

    rawRows.forEach((row, idx) => {
      const getVal = (colName) => {
        if (!colName) return '';
        const cIdx = rawHeaders.indexOf(colName);
        return cIdx !== -1 ? row[cIdx] : '';
      };

      const dateVal = formatExcelDate(getVal(colDate));
      const baseTitleVal = String(getVal(colTitle) || `Movimiento ${idx + 1}`).trim();

      const rawNotesVal = String(getVal(colNotes)).trim();

      const rawCatStr = String(getVal(colCategory)).toLowerCase();
      let matchedCatId = '';

      const rawAccStr = String(getVal(colAccount)).toLowerCase();
      let matchedAccId = '';
      if (rawAccStr) {
        const found = accountsList.find(a =>
          a.account_name.toLowerCase().includes(rawAccStr) ||
          a.institution_name.toLowerCase().includes(rawAccStr)
        );
        if (found) matchedAccId = found.id;
      }

      if (mappingStrategy === 'separate_columns') {
        const validIncCols = incomeCols.filter(c => c && c.trim() !== '');
        const validExpCols = expenseCols.filter(c => c && c.trim() !== '');

        // 1. Procesar columnas de Ingreso
        validIncCols.forEach((colName) => {
          const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
          const incAmt = parseFloat(rawAmtStr) || 0;
          if (incAmt > 0) {
            const showSuffix = validIncCols.length > 1 || validExpCols.length > 0;
            const itemTitle = showSuffix ? `${baseTitleVal} (${colName})` : baseTitleVal;

            let catId = matchedCatId;
            if (!catId && rawCatStr) {
              const found = incomeCategories.find(c => c.name.toLowerCase().includes(rawCatStr) || rawCatStr.includes(c.name.toLowerCase()));
              if (found) catId = found.id;
            }

            const isDup = checkIsDuplicate(dateVal, incAmt, itemTitle, 'income');

            formattedRows.push({
              id: `row_${idx}_inc_${colName}_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: itemTitle,
              amount: incAmt,
              type: 'income',
              category_id: catId,
              bank_account_id: matchedAccId,
              payment_method: '',
              total_installments: 1,
              notes: rawNotesVal || (validIncCols.length > 1 ? `Importado desde columna "${colName}" 📊` : 'Importado desde planilla 📊')
            });
          }
        });

        // 2. Procesar columnas de Gasto
        validExpCols.forEach((colName) => {
          const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
          const expAmt = parseFloat(rawAmtStr) || 0;
          if (expAmt > 0) {
            const showSuffix = validExpCols.length > 1 || validIncCols.length > 0;
            const itemTitle = showSuffix ? `${baseTitleVal} (${colName})` : baseTitleVal;

            let catId = matchedCatId;
            if (!catId && rawCatStr) {
              const found = expenseCategories.find(c => c.name.toLowerCase().includes(rawCatStr) || rawCatStr.includes(c.name.toLowerCase()));
              if (found) catId = found.id;
            }

            const isDup = checkIsDuplicate(dateVal, expAmt, itemTitle, 'expense');

            formattedRows.push({
              id: `row_${idx}_exp_${colName}_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: itemTitle,
              amount: expAmt,
              type: 'expense',
              category_id: catId,
              bank_account_id: matchedAccId,
              payment_method: 'contado',
              total_installments: 1,
              notes: rawNotesVal || (validExpCols.length > 1 ? `Importado desde columna "${colName}" 📊` : 'Importado desde planilla 📊')
            });
          }
        });
      } else if (mappingStrategy === 'type_column') {
        const validIncCols = incomeCols.filter(c => c && c.trim() !== '');
        const validExpCols = expenseCols.filter(c => c && c.trim() !== '');

        // Procesar columnas adicionales si el usuario las configuró
        validIncCols.forEach((colName) => {
          const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
          const incAmt = parseFloat(rawAmtStr) || 0;
          if (incAmt > 0) {
            const itemTitle = `${baseTitleVal} (${colName})`;
            const isDup = checkIsDuplicate(dateVal, incAmt, itemTitle, 'income');
            formattedRows.push({
              id: `row_${idx}_inc_${colName}_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: itemTitle,
              amount: incAmt,
              type: 'income',
              category_id: matchedCatId,
              bank_account_id: matchedAccId,
              payment_method: '',
              total_installments: 1,
              notes: rawNotesVal || `Importado desde columna "${colName}" 📊`
            });
          }
        });

        validExpCols.forEach((colName) => {
          const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
          const expAmt = parseFloat(rawAmtStr) || 0;
          if (expAmt > 0) {
            const itemTitle = `${baseTitleVal} (${colName})`;
            const isDup = checkIsDuplicate(dateVal, expAmt, itemTitle, 'expense');
            formattedRows.push({
              id: `row_${idx}_exp_${colName}_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: itemTitle,
              amount: expAmt,
              type: 'expense',
              category_id: matchedCatId,
              bank_account_id: matchedAccId,
              payment_method: 'contado',
              total_installments: 1,
              notes: rawNotesVal || `Importado desde columna "${colName}" 📊`
            });
          }
        });

        // Fila principal por Columna de Tipo
        if (colAmount) {
          const rawType = String(getVal(colType)).toLowerCase();
          const rawAmt = parseFloat(String(getVal(colAmount)).replace(/[^0-9.-]/g, '')) || 0;
          const amountVal = Math.abs(rawAmt);

          if (amountVal > 0) {
            let typeVal = 'expense';
            if (rawType.includes('ingreso') || rawType.includes('abono') || rawType.includes('entrada') || rawType.includes('cobro')) {
              typeVal = 'income';
            } else if (rawType.includes('gasto') || rawType.includes('cargo') || rawType.includes('salida') || rawType.includes('egreso')) {
              typeVal = 'expense';
            } else {
              const titleLower = baseTitleVal.toLowerCase();
              if (INCOME_KEYWORDS.some(k => titleLower.includes(k))) typeVal = 'income';
              else typeVal = 'expense';
            }

            let catId = matchedCatId;
            if (!catId && rawCatStr) {
              const targetCats = typeVal === 'income' ? incomeCategories : expenseCategories;
              const found = targetCats.find(c => c.name.toLowerCase().includes(rawCatStr) || rawCatStr.includes(c.name.toLowerCase()));
              if (found) catId = found.id;
            }

            const isDup = checkIsDuplicate(dateVal, amountVal, baseTitleVal, typeVal);
            formattedRows.push({
              id: `row_${idx}_type_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: baseTitleVal,
              amount: amountVal,
              type: typeVal,
              category_id: catId,
              bank_account_id: matchedAccId,
              payment_method: typeVal === 'expense' ? 'contado' : '',
              total_installments: 1,
              notes: rawNotesVal || 'Importado desde planilla 📊'
            });
          }
        }
      } else {
        // Strategy: single_amount
        const validIncCols = incomeCols.filter(c => c && c.trim() !== '');
        const validExpCols = expenseCols.filter(c => c && c.trim() !== '');

        if (validIncCols.length > 0 || validExpCols.length > 0) {
          validIncCols.forEach((colName) => {
            const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
            const incAmt = parseFloat(rawAmtStr) || 0;
            if (incAmt > 0) {
              const itemTitle = `${baseTitleVal} (${colName})`;
              const isDup = checkIsDuplicate(dateVal, incAmt, itemTitle, 'income');
              formattedRows.push({
                id: `row_${idx}_inc_${colName}_${Date.now()}_${Math.random()}`,
                selected: !isDup,
                isDuplicate: isDup,
                date: dateVal,
                title: itemTitle,
                amount: incAmt,
                type: 'income',
                category_id: matchedCatId,
                bank_account_id: matchedAccId,
                payment_method: '',
                total_installments: 1,
                notes: rawNotesVal || `Importado desde columna "${colName}" 📊`
              });
            }
          });

          validExpCols.forEach((colName) => {
            const rawAmtStr = String(getVal(colName)).replace(/[^0-9.-]/g, '');
            const expAmt = parseFloat(rawAmtStr) || 0;
            if (expAmt > 0) {
              const itemTitle = `${baseTitleVal} (${colName})`;
              const isDup = checkIsDuplicate(dateVal, expAmt, itemTitle, 'expense');
              formattedRows.push({
                id: `row_${idx}_exp_${colName}_${Date.now()}_${Math.random()}`,
                selected: !isDup,
                isDuplicate: isDup,
                date: dateVal,
                title: itemTitle,
                amount: expAmt,
                type: 'expense',
                category_id: matchedCatId,
                bank_account_id: matchedAccId,
                payment_method: 'contado',
                total_installments: 1,
                notes: rawNotesVal || `Importado desde columna "${colName}" 📊`
              });
            }
          });
        }

        if (colAmount) {
          const rawAmtStr = String(getVal(colAmount)).replace(/[^0-9.-]/g, '');
          const rawAmt = parseFloat(rawAmtStr) || 0;

          if (rawAmt !== 0) {
            let typeVal = 'expense';
            let amountVal = Math.abs(rawAmt);

            if (rawAmt < 0) {
              typeVal = 'expense';
            } else {
              const titleLower = baseTitleVal.toLowerCase();
              if (INCOME_KEYWORDS.some(k => titleLower.includes(k))) {
                typeVal = 'income';
              } else if (EXPENSE_KEYWORDS.some(k => titleLower.includes(k))) {
                typeVal = 'expense';
              } else {
                typeVal = 'expense';
              }
            }

            let catId = matchedCatId;
            if (!catId && rawCatStr) {
              const targetCats = typeVal === 'income' ? incomeCategories : expenseCategories;
              const found = targetCats.find(c => c.name.toLowerCase().includes(rawCatStr) || rawCatStr.includes(c.name.toLowerCase()));
              if (found) catId = found.id;
            }

            const isDup = checkIsDuplicate(dateVal, amountVal, baseTitleVal, typeVal);
            formattedRows.push({
              id: `row_${idx}_std_${Date.now()}_${Math.random()}`,
              selected: !isDup,
              isDuplicate: isDup,
              date: dateVal,
              title: baseTitleVal,
              amount: amountVal,
              type: typeVal,
              category_id: catId,
              bank_account_id: matchedAccId,
              payment_method: typeVal === 'expense' ? 'contado' : '',
              total_installments: 1,
              notes: rawNotesVal || 'Importado desde planilla 📊'
            });
          }
        }
      }
    });

    if (formattedRows.length === 0) {
      alert('No se encontraron montos válidos en las columnas seleccionadas.');
      return;
    }

    setProcessedRows(formattedRows);
    setStep(3);
  };

  // Acciones en masa (Bulk actions)
  const handleBulkSetAccount = (accId) => {
    if (!accId) return;
    setProcessedRows(prev => prev.map(r => r.selected ? { ...r, bank_account_id: accId } : r));
  };

  const handleBulkSetCategory = (catId, catType) => {
    if (!catId) return;
    setProcessedRows(prev => prev.map(r => (r.selected && r.type === catType) ? { ...r, category_id: catId } : r));
  };

  const handleBulkSetType = (newType) => {
    setProcessedRows(prev => prev.map(r => {
      if (!r.selected) return r;
      const updatedType = newType;
      const isDup = checkIsDuplicate(r.date, r.amount, r.title, updatedType);
      return {
        ...r,
        type: updatedType,
        isDuplicate: isDup,
        category_id: '',
        payment_method: updatedType === 'expense' ? 'contado' : ''
      };
    }));
  };

  const handleToggleAll = (selectState) => {
    setProcessedRows(prev => prev.map(r => ({ ...r, selected: selectState })));
  };

  // Actualizar campo de fila con re-evaluación dinámica de duplicados
  const updateRowField = (id, field, value) => {
    setProcessedRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'type') {
          updated.category_id = '';
          updated.payment_method = value === 'expense' ? 'contado' : '';
        }
        updated.isDuplicate = checkIsDuplicate(updated.date, updated.amount, updated.title, updated.type);
        return updated;
      }
      return r;
    }));
  };

  // Filtrar filas para la tabla interactiva
  const filteredRows = useMemo(() => {
    return processedRows.filter(r => {
      if (filterMode === 'warnings') {
        const hasWarning = !r.date || !r.title || !r.amount || (r.type === 'expense' && !r.payment_method);
        return hasWarning;
      }
      if (filterMode === 'duplicates') return r.isDuplicate;
      if (filterMode === 'incomes') return r.type === 'income';
      if (filterMode === 'expenses') return r.type === 'expense';
      return true;
    });
  }, [processedRows, filterMode]);

  // Contadores de filas
  const selectedCount = processedRows.filter(r => r.selected).length;
  const duplicateCount = processedRows.filter(r => r.isDuplicate).length;
  const warningCount = processedRows.filter(r => !r.date || !r.title || !r.amount || (r.type === 'expense' && !r.payment_method)).length;
  const incomesCount = processedRows.filter(r => r.type === 'income').length;
  const expensesCount = processedRows.filter(r => r.type === 'expense').length;

  // 3. Ejecutar Importación Final a la Base de Datos
  const handleFinalImport = async () => {
    const selectedRows = processedRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un registro para importar.');
      return;
    }

    const invalidRows = selectedRows.filter(r => !r.title.trim() || !r.amount || r.amount <= 0 || !r.date);
    if (invalidRows.length > 0) {
      alert(`Hay ${invalidRows.length} registros seleccionados con campos incompletos (Título, Monto o Fecha vacía). Por favor corrígelos antes de guardar.`);
      return;
    }

    setIsImporting(true);

    const payloadIncomes = selectedRows
      .filter(r => r.type === 'income')
      .map(r => ({
        title: r.title,
        amount: r.amount,
        date: r.date,
        category_id: r.category_id || null,
        bank_account_id: r.bank_account_id || null,
        status: 'pagado',
        notes: r.notes
      }));

    const payloadExpenses = selectedRows
      .filter(r => r.type === 'expense')
      .map(r => ({
        title: r.title,
        total_amount: r.amount,
        payment_method: r.payment_method || 'contado',
        bank_account_id: r.bank_account_id || null,
        category_id: r.category_id || null,
        total_installments: r.total_installments || 1,
        start_date: r.date,
        initial_status: 'pagado',
        notes: r.notes
      }));

    try {
      const res = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          incomes: payloadIncomes,
          expenses: payloadExpenses
        })
      });

      if (res.ok) {
        const data = await res.json();
        setImportSummary(data);
        setStep(4);
        refreshAllData();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      } else {
        const errData = await res.json();
        alert(`Error al guardar en el servidor: ${errData.error || 'Inténtalo de nuevo'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al realizar la importación masiva.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header del Módulo */}
      <div className="kawaii-card bg-gradient-to-r from-[#FFE6C7] via-[#FFF1C5] to-[#E3D5FF] dark:from-[#3E2D23] dark:via-[#3B341E] dark:to-[#2B233E]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD6E8] dark:bg-[#5E476B] border-3 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Importador de Planillas (Excel / CSV)
              </h2>
              <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/70 font-medium">
                Carga tus finanzas familiares desde archivos Excel o CSV con clasificación inteligente.
              </p>
            </div>
          </div>

          <button
            onClick={downloadSampleCSV}
            className="kawaii-btn bg-white dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB] px-3.5 py-2 text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <Download size={15} className="text-amber-500" />
            <span>Descargar Plantilla de Ejemplo</span>
          </button>
        </div>

        {/* Indicador de Pasos */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t-2 border-[#4A3E3D]/20 dark:border-[#8A7398]/30 text-center">
          {[
            { stepNum: 1, label: '1. Archivo', icon: UploadCloud },
            { stepNum: 2, label: '2. Mapeo', icon: Layers },
            { stepNum: 3, label: '3. Revisión & Completar', icon: Filter },
            { stepNum: 4, label: '4. Listo ✨', icon: CheckCircle2 }
          ].map(item => {
            const Icon = item.icon;
            const isActive = step === item.stepNum;
            const isDone = step > item.stepNum;
            return (
              <div
                key={item.stepNum}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-2xl border-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#FFD6E8] text-[#4A3E3D] border-[#4A3E3D] shadow-kawaii-sm'
                    : isDone
                    ? 'bg-[#D1F2E2] text-emerald-900 border-[#4A3E3D]'
                    : 'bg-white/50 dark:bg-[#1C1724]/50 text-[#4A3E3D]/60 dark:text-[#F5E8FB]/60 border-gray-300 dark:border-gray-700'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PASO 1: SELECCIONAR Y SUBIR ARCHIVO */}
      {step === 1 && (
        <div className="kawaii-card bg-white dark:bg-[#2A2335] text-center py-10 px-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FFF1C5] dark:bg-[#3D3523] border-3 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii flex items-center justify-center text-4xl animate-bounce">
              📂
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
                Arrastra o Selecciona tu Planilla de Cálculo
              </h3>
              <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70 mt-1">
                Soporta archivos de Microsoft Excel (<strong>.xlsx, .xls</strong>) y archivos delimitados por comas (<strong>.csv</strong>).
              </p>
            </div>

            <label className="kawaii-btn bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] px-6 py-3 text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-kawaii">
              <UploadCloud size={20} />
              <span>Seleccionar Archivo desde tu Equipo</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-left text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 space-y-1.5 bg-[#FFFDF0] dark:bg-[#1C1724] p-4 rounded-2xl border-2 border-[#4A3E3D]">
              <div className="font-bold flex items-center gap-1 text-[#4A3E3D] dark:text-[#F5E8FB]">
                <HelpCircle size={14} className="text-purple-600" />
                <span>¿Múltiples columnas de Ingresos o Gastos en tu presupuesto?</span>
              </div>
              <p>• Ahora puedes seleccionar <strong>múltiples columnas opcionales</strong> de Ingresos (ej. Sueldo, Extras) y de Gastos (ej. Fijos, Variables, Imprevistos).</p>
              <p>• Cada columna con un monto mayor a $0 se convertirá en su respectivo ingreso o gasto detallado.</p>
              <p>• Además, el control de duplicados protegerá tus datos comparando por Fecha, Monto y Concepto.</p>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: MAPEO DE COLUMNAS */}
      {step === 2 && (
        <div className="kawaii-card bg-white dark:bg-[#2A2335] space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-2">
                <Layers size={20} className="text-purple-600" />
                <span>Mapeo de Columnas de tu Planilla</span>
              </h3>
              <p className="text-xs text-[#4A3E3D]/70 dark:text-[#F5E8FB]/70">
                Archivo: <strong>{fileName}</strong> ({rawRows.length} filas detectadas)
              </p>
            </div>

            {sheetNames.length > 1 && (
              <div className="flex items-center gap-2 bg-[#FFFDF0] dark:bg-[#1C1724] p-1.5 rounded-xl border border-[#4A3E3D]">
                <span className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">Hoja:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    parseSheet(workbook, e.target.value);
                  }}
                  className="bg-transparent text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] focus:outline-none"
                >
                  {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Estrategia de Clasificación de Montos */}
          <div className="bg-[#FFFDF0] dark:bg-[#1C1724] p-4 rounded-2xl border-2 border-[#4A3E3D] space-y-3">
            <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
              ¿Cómo están organizados los Ingresos y Gastos en tu planilla?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMappingStrategy('separate_columns')}
                className={`p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all ${
                  mappingStrategy === 'separate_columns'
                    ? 'bg-[#FFD6E8] text-[#4A3E3D] border-[#4A3E3D] shadow-kawaii-sm'
                    : 'bg-white dark:bg-[#2A2335] text-[#4A3E3D] dark:text-[#F5E8FB] border-gray-300 dark:border-gray-700'
                }`}
              >
                <div>Columnas Separadas (Múltiples Opcionales)</div>
                <div className={`text-[10px] font-medium mt-1 ${
                  mappingStrategy === 'separate_columns'
                    ? 'text-[#4A3E3D]/85'
                    : 'text-gray-600 dark:text-[#F5E8FB]/80'
                }`}>
                  Soporta 1 o más columnas de Ingresos (Base, Extras) y Gastos (Fijos, Imprevistos).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMappingStrategy('single_amount')}
                className={`p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all ${
                  mappingStrategy === 'single_amount'
                    ? 'bg-[#FFD6E8] text-[#4A3E3D] border-[#4A3E3D] shadow-kawaii-sm'
                    : 'bg-white dark:bg-[#2A2335] text-[#4A3E3D] dark:text-[#F5E8FB] border-gray-300 dark:border-gray-700'
                }`}
              >
                <div>Columna Única de Monto</div>
                <div className={`text-[10px] font-medium mt-1 ${
                  mappingStrategy === 'single_amount'
                    ? 'text-[#4A3E3D]/85'
                    : 'text-gray-600 dark:text-[#F5E8FB]/80'
                }`}>
                  Montos positivos / negativos o clasificados por descripción.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMappingStrategy('type_column')}
                className={`p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all ${
                  mappingStrategy === 'type_column'
                    ? 'bg-[#FFD6E8] text-[#4A3E3D] border-[#4A3E3D] shadow-kawaii-sm'
                    : 'bg-white dark:bg-[#2A2335] text-[#4A3E3D] dark:text-[#F5E8FB] border-gray-300 dark:border-gray-700'
                }`}
              >
                <div>Columna de Tipo</div>
                <div className={`text-[10px] font-medium mt-1 ${
                  mappingStrategy === 'type_column'
                    ? 'text-[#4A3E3D]/85'
                    : 'text-gray-600 dark:text-[#F5E8FB]/80'
                }`}>
                  Una columna específica que indica "Ingreso" o "Gasto".
                </div>
              </button>
            </div>
          </div>

          {/* Selectores de Mapeo */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de FECHA <span className="text-rose-500">*</span>
                </label>
                <select
                  value={colDate}
                  onChange={(e) => setColDate(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Seleccionar columna --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de DESCRIPCIÓN / CONCEPTO <span className="text-rose-500">*</span>
                </label>
                <select
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Seleccionar columna --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* SECCIÓN DINÁMICA DE INGRESOS (SOPORTA MÚLTIPLES COLUMNAS) */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>💰 Columnas de INGRESOS / ABONOS</span>
                    <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300 bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                      {incomeCols.filter(Boolean).length} seleccionada(s)
                    </span>
                  </label>
                  <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                    Selecciona 1 o varias columnas si tu planilla desglosa los ingresos (ej. Sueldo Base, Ingresos Extras, Honorarios).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addIncomeCol}
                  className="text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-white dark:bg-[#1C1724] px-3 py-1.5 rounded-xl border border-emerald-400 hover:bg-emerald-100 flex items-center gap-1 shadow-kawaii-sm transition-transform active:scale-95"
                >
                  <Plus size={14} className="text-emerald-600" />
                  <span>+ Agregar columna de Ingreso</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {incomeCols.map((colVal, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2 bg-white dark:bg-[#1C1724] p-1.5 rounded-xl border border-emerald-300">
                    <select
                      value={colVal}
                      onChange={(e) => updateIncomeCol(iIdx, e.target.value)}
                      className="kawaii-input w-full text-xs border-none bg-transparent"
                    >
                      <option value="">-- Columna de Ingreso {iIdx + 1} --</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {incomeCols.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIncomeCol(iIdx)}
                        className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition-colors"
                        title="Quitar esta columna"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN DINÁMICA DE GASTOS (SOPORTA MÚLTIPLES COLUMNAS) */}
            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border-2 border-rose-300 dark:border-rose-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <span>💸 Columnas de GASTOS / CARGOS</span>
                    <span className="text-[10px] font-normal text-rose-700 dark:text-rose-300 bg-rose-200 dark:bg-rose-900 px-2 py-0.5 rounded-full">
                      {expenseCols.filter(Boolean).length} seleccionada(s)
                    </span>
                  </label>
                  <p className="text-[10px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                    Selecciona 1 o varias columnas si desglosas tus gastos (ej. Gastos Fijos, Gastos Variables, Imprevistos, Cuotas).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExpenseCol}
                  className="text-xs font-bold text-rose-900 dark:text-rose-100 bg-white dark:bg-[#1C1724] px-3 py-1.5 rounded-xl border border-rose-400 hover:bg-rose-100 flex items-center gap-1 shadow-kawaii-sm transition-transform active:scale-95"
                >
                  <Plus size={14} className="text-rose-600" />
                  <span>+ Agregar columna de Gasto</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {expenseCols.map((colVal, eIdx) => (
                  <div key={eIdx} className="flex items-center gap-2 bg-white dark:bg-[#1C1724] p-1.5 rounded-xl border border-rose-300">
                    <select
                      value={colVal}
                      onChange={(e) => updateExpenseCol(eIdx, e.target.value)}
                      className="kawaii-input w-full text-xs border-none bg-transparent"
                    >
                      <option value="">-- Columna de Gasto {eIdx + 1} --</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {expenseCols.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExpenseCol(eIdx)}
                        className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition-colors"
                        title="Quitar esta columna"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones Específicas para otras Estrategias */}
            {mappingStrategy === 'type_column' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                    Columna de TIPO DE MOVIMIENTO (Ingreso/Gasto)
                  </label>
                  <select
                    value={colType}
                    onChange={(e) => setColType(e.target.value)}
                    className="kawaii-input w-full text-xs"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                    Columna de MONTO PRINCIPAL ($)
                  </label>
                  <select
                    value={colAmount}
                    onChange={(e) => setColAmount(e.target.value)}
                    className="kawaii-input w-full text-xs"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            {mappingStrategy === 'single_amount' && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de MONTO PRINCIPAL ($) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={colAmount}
                  onChange={(e) => setColAmount(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Seleccionar columna --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            )}

            {/* Campos Opcionales Globales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de CATEGORÍA (Opcional)
                </label>
                <select
                  value={colCategory}
                  onChange={(e) => setColCategory(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Ninguna / Asignar manualmente --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de CUENTA / BANCO (Opcional)
                </label>
                <select
                  value={colAccount}
                  onChange={(e) => setColAccount(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Ninguna / Asignar manualmente --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] mb-1">
                  Columna de NOTAS / OBSERVACIONES (Opcional)
                </label>
                <select
                  value={colNotes}
                  onChange={(e) => setColNotes(e.target.value)}
                  className="kawaii-input w-full text-xs"
                >
                  <option value="">-- Ninguna / Opcional --</option>
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setStep(1)}
              className="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-[#4A3E3D] dark:text-[#F5E8FB] rounded-xl font-bold text-xs border-2 border-[#4A3E3D]"
            >
              ← Volver
            </button>

            <button
              onClick={handleApplyMapping}
              className="kawaii-btn bg-[#FFD6E8] hover:bg-[#FFB7B2] text-[#4A3E3D] px-6 py-2.5 text-xs flex items-center gap-2"
            >
              <span>Procesar Filas y Revisar</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: REVISIÓN Y RELLENO DE INFORMACIÓN FALTANTE */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Barra Superior con Botón Volver al Mapeo y Contador */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setStep(2)}
              className="py-2 px-4 bg-white dark:bg-[#2A2335] text-[#4A3E3D] dark:text-[#F5E8FB] rounded-2xl font-bold text-xs border-2 border-[#4A3E3D] dark:border-[#8A7398] shadow-kawaii-sm hover:scale-[1.02] transition-transform cursor-pointer flex items-center gap-1.5"
            >
              <span>← Volver al Mapeo</span>
            </button>

            <div className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB]/80 bg-white/70 dark:bg-[#2A2335]/70 px-3 py-1.5 rounded-xl border border-[#4A3E3D]/30 dark:border-[#8A7398]/30">
              <span>{selectedCount} de {processedRows.length} registros seleccionados</span>
            </div>
          </div>

          {/* Banner Informativo si se detectaron duplicados */}
          {duplicateCount > 0 && (
            <div className="p-3 bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-500 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 font-bold shadow-kawaii-sm">
              <CopyX size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>Se detectaron {duplicateCount} movimiento(s) que ya existen en tu aplicación (coinciden en fecha, monto y concepto).</span>
                <span className="block text-[11px] font-normal mt-0.5 opacity-90">
                  Fueron desmarcados automáticamente para evitar registros duplicados. Si de todas formas deseas agregarlos, puedes marcarlos manualmente en la lista.
                </span>
              </div>
            </div>
          )}

          {/* Barra de Herramientas de Edición Masiva y Filtros */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filtros por pestaña */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#FFFDF0] dark:bg-[#1C1724] p-1.5 rounded-2xl border-2 border-[#4A3E3D]">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'all' ? 'bg-[#FFD6E8] text-[#4A3E3D] border border-[#4A3E3D]' : 'text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80'
                  }`}
                >
                  Todos ({processedRows.length})
                </button>

                {duplicateCount > 0 && (
                  <button
                    onClick={() => setFilterMode('duplicates')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      filterMode === 'duplicates' ? 'bg-amber-300 text-amber-950 border border-[#4A3E3D]' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <CopyX size={13} />
                    <span>Duplicados ({duplicateCount})</span>
                  </button>
                )}

                {warningCount > 0 && (
                  <button
                    onClick={() => setFilterMode('warnings')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      filterMode === 'warnings' ? 'bg-[#FFB7B2] text-[#4A3E3D] border border-[#4A3E3D]' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    <span>Incompletos ({warningCount})</span>
                  </button>
                )}

                <button
                  onClick={() => setFilterMode('incomes')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'incomes' ? 'bg-[#D1F2E2] text-emerald-900 border border-[#4A3E3D]' : 'text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80'
                  }`}
                >
                  💰 Ingresos ({incomesCount})
                </button>

                <button
                  onClick={() => setFilterMode('expenses')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'expenses' ? 'bg-[#E3D5FF] text-purple-900 border border-[#4A3E3D]' : 'text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80'
                  }`}
                >
                  💸 Gastos ({expensesCount})
                </button>
              </div>

              {/* Botones Seleccionar Todos / Deseleccionar */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 bg-white dark:bg-[#1C1724] border border-[#4A3E3D] rounded-xl text-[#4A3E3D] dark:text-[#F5E8FB] hover:bg-gray-100"
                >
                  ✓ Seleccionar Todos
                </button>
                <button
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 bg-white dark:bg-[#1C1724] border border-[#4A3E3D] rounded-xl text-[#4A3E3D] dark:text-[#F5E8FB] hover:bg-gray-100"
                >
                  ✕ Deseleccionar Todos
                </button>
              </div>
            </div>

            {/* Acciones Rápida Masivas (Bulk Actions) */}
            <div className="p-3 bg-[#FFFDF0] dark:bg-[#1C1724] rounded-2xl border-2 border-[#4A3E3D] space-y-2">
              <div className="text-xs font-bold text-[#4A3E3D] dark:text-[#F5E8FB] flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Relleno Masivo de Datos Faltantes (para {selectedCount} filas seleccionadas)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Asignar Cuenta Bancaria Masiva */}
                <select
                  onChange={(e) => {
                    handleBulkSetAccount(e.target.value);
                    e.target.value = '';
                  }}
                  className="kawaii-input text-xs cursor-pointer"
                >
                  <option value="">🏦 Asignar Cuenta a Seleccionados...</option>
                  {accountsList.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name} ({a.institution_name})</option>
                  ))}
                </select>

                {/* Asignar Tipo Masivo */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkSetType(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="kawaii-input text-xs cursor-pointer"
                >
                  <option value="">🔄 Marcar Tipo a Seleccionados...</option>
                  <option value="income">💰 Todos como Ingreso</option>
                  <option value="expense">💸 Todos como Gasto</option>
                </select>

                {/* Asignar Categoría Masiva de Gasto */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkSetCategory(e.target.value, 'expense');
                      e.target.value = '';
                    }
                  }}
                  className="kawaii-input text-xs cursor-pointer"
                >
                  <option value="">🏷️ Asignar Categoría a Gastos...</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Interactiva de Filas Procesadas */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335] p-2 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b-2 border-[#4A3E3D] bg-[#FFFDF0] dark:bg-[#1C1724] text-[#4A3E3D] dark:text-[#F5E8FB]">
                  <th className="p-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCount === processedRows.length && processedRows.length > 0}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="rounded border-[#4A3E3D]"
                    />
                  </th>
                  <th className="p-2 w-32">Fecha</th>
                  <th className="p-2">Descripción / Título</th>
                  <th className="p-2 w-28">Monto ($)</th>
                  <th className="p-2 w-28">Tipo</th>
                  <th className="p-2 w-44">Categoría</th>
                  <th className="p-2 w-44">Cuenta / Método</th>
                  <th className="p-2 w-10 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRows.map((row) => {
                  const isMissingData = !row.date || !row.title.trim() || !row.amount || (row.type === 'expense' && !row.payment_method);
                  const isIncome = row.type === 'income';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#FFFDF0]/50 dark:hover:bg-[#1C1724]/50 transition-colors ${
                        !row.selected ? 'opacity-50 bg-gray-50 dark:bg-gray-900' : isMissingData ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateRowField(row.id, 'selected', e.target.checked)}
                          className="rounded border-[#4A3E3D]"
                        />
                      </td>

                      {/* Fecha */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRowField(row.id, 'date', e.target.value)}
                          className={`kawaii-input text-xs w-full py-1 px-1.5 ${!row.date ? 'border-rose-500 bg-rose-50' : ''}`}
                        />
                      </td>

                      {/* Título & Badge de Duplicado */}
                      <td className="p-2">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateRowField(row.id, 'title', e.target.value)}
                            placeholder="Descripción del movimiento..."
                            className={`kawaii-input text-xs w-full py-1 px-1.5 ${!row.title.trim() ? 'border-rose-500 bg-rose-50' : ''}`}
                          />
                          {row.isDuplicate && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-400" title="Ya existe en la app con misma fecha, monto y concepto">
                              <CopyX size={11} />
                              <span>Ya existe en la app (Duplicado)</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Monto */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={row.amount}
                          onChange={(e) => updateRowField(row.id, 'amount', Number(e.target.value))}
                          className={`kawaii-input text-xs w-full py-1 px-1.5 font-bold ${isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
                        />
                      </td>

                      {/* Tipo Toggle */}
                      <td className="p-2">
                        <select
                          value={row.type}
                          onChange={(e) => updateRowField(row.id, 'type', e.target.value)}
                          className={`text-xs font-bold rounded-xl px-2 py-1 border border-[#4A3E3D] cursor-pointer ${
                            isIncome ? 'bg-[#D1F2E2] text-emerald-950' : 'bg-[#FFD6E8] text-rose-950'
                          }`}
                        >
                          <option value="income">💰 Ingreso</option>
                          <option value="expense">💸 Gasto</option>
                        </select>
                      </td>

                      {/* Categoría */}
                      <td className="p-2">
                        <select
                          value={row.category_id}
                          onChange={(e) => updateRowField(row.id, 'category_id', e.target.value)}
                          className="kawaii-input text-xs w-full py-1 px-1 cursor-pointer"
                        >
                          <option value="">-- Sin Categoría --</option>
                          {(isIncome ? incomeCategories : expenseCategories).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Cuenta / Método de Pago */}
                      <td className="p-2 space-y-1">
                        <select
                          value={row.bank_account_id}
                          onChange={(e) => updateRowField(row.id, 'bank_account_id', e.target.value)}
                          className="kawaii-input text-xs w-full py-1 px-1 cursor-pointer"
                        >
                          <option value="">🏛️ Efectivo / Sin cuenta</option>
                          {accountsList.map(a => (
                            <option key={a.id} value={a.id}>{a.account_name}</option>
                          ))}
                        </select>

                        {!isIncome && (
                          <select
                            value={row.payment_method}
                            onChange={(e) => updateRowField(row.id, 'payment_method', e.target.value)}
                            className="text-[11px] font-bold rounded-lg px-1.5 py-0.5 border border-[#4A3E3D] bg-white dark:bg-[#1C1724]"
                          >
                            <option value="contado">💵 Contado</option>
                            <option value="debito">💳 Débito</option>
                            <option value="tarjeta">💳 Crédito</option>
                          </select>
                        )}
                      </td>

                      {/* Eliminar Fila */}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setProcessedRows(prev => prev.filter(r => r.id !== row.id))}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Eliminar fila"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botones Inferiores de Acción */}
          <div className="kawaii-card bg-white dark:bg-[#2A2335] flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-[#4A3E3D] dark:text-[#F5E8FB] rounded-xl font-bold text-xs border-2 border-[#4A3E3D]"
            >
              ← Volver al Mapeo
            </button>

            <button
              onClick={handleFinalImport}
              disabled={isImporting || selectedCount === 0}
              className="kawaii-btn bg-[#D1F2E2] hover:bg-emerald-300 text-[#4A3E3D] px-6 py-3 text-xs flex items-center gap-2 shadow-kawaii font-bold"
            >
              <Sparkles size={16} />
              <span>{isImporting ? 'Guardando en la Base de Datos...' : `¡Importar ${selectedCount} Registros Seleccionados! 🌸`}</span>
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: RESULTADO Y RESUMEN */}
      {step === 4 && importSummary && (
        <div className="kawaii-card bg-white dark:bg-[#2A2335] text-center py-10 px-4 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#D1F2E2] border-3 border-[#4A3E3D] shadow-kawaii flex items-center justify-center text-4xl animate-bounce">
            🎉
          </div>

          <div>
            <h3 className="text-2xl font-bold text-[#4A3E3D] dark:text-[#F5E8FB]">
              ¡Importación Exitosa! ✨
            </h3>
            <p className="text-xs text-[#4A3E3D]/80 dark:text-[#F5E8FB]/80 mt-1">
              Tus registros han sido guardados y sincronizados correctamente en la aplicación.
            </p>
          </div>

          <div className="grid grid-cols-2 max-w-sm mx-auto gap-4">
            <div className="p-4 bg-[#D1F2E2]/60 rounded-2xl border-2 border-[#4A3E3D] text-[#4A3E3D]">
              <span className="text-2xl font-bold block">{importSummary.insertedIncomes}</span>
              <span className="text-xs font-bold">Ingresos Agregados 💰</span>
            </div>

            <div className="p-4 bg-[#FFD6E8]/60 rounded-2xl border-2 border-[#4A3E3D] text-[#4A3E3D]">
              <span className="text-2xl font-bold block">{importSummary.insertedExpenses}</span>
              <span className="text-xs font-bold">Gastos Agregados 💸</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="kawaii-btn bg-[#FFD6E8] text-[#4A3E3D] px-6 py-2.5 text-xs flex items-center gap-2"
            >
              <span>Ir al Inicio 🏠</span>
            </button>

            <button
              onClick={() => {
                setStep(1);
                setProcessedRows([]);
                setFileName('');
              }}
              className="py-2.5 px-4 bg-gray-200 dark:bg-gray-700 text-[#4A3E3D] dark:text-[#F5E8FB] rounded-xl font-bold text-xs border-2 border-[#4A3E3D]"
            >
              Importar Otra Planilla 📊
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
