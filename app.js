/* ============================================================
   Expense & Budget Visualizer — app.js
   Vanilla JS | LocalStorage | No frameworks
   ============================================================ */

'use strict';

// ─── Constants ──────────────────────────────────────────────
const STORAGE_EXPENSES  = 'ebv_expenses';
const STORAGE_BUDGETS   = 'ebv_budgets';
const STORAGE_DARK_MODE = 'ebv_dark';

const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Health',
  'Entertainment', 'Shopping', 'Education', 'Other'
];

const CAT_COLORS = {
  Food:          '#f97316',
  Transport:     '#3b82f6',
  Housing:       '#8b5cf6',
  Health:        '#22c55e',
  Entertainment: '#ec4899',
  Shopping:      '#f59e0b',
  Education:     '#06b6d4',
  Other:         '#94a3b8',
};

const CAT_EMOJI = {
  Food:          '🍔',
  Transport:     '🚌',
  Housing:       '🏠',
  Health:        '💊',
  Entertainment: '🎬',
  Shopping:      '🛍️',
  Education:     '📚',
  Other:         '📦',
};

// ─── State ──────────────────────────────────────────────────
let expenses = [];
let budgets  = {};

// ─── LocalStorage Helpers ───────────────────────────────────
function load() {
  try {
    expenses = JSON.parse(localStorage.getItem(STORAGE_EXPENSES)) || [];
    budgets  = JSON.parse(localStorage.getItem(STORAGE_BUDGETS))  || {};
  } catch {
    expenses = [];
    budgets  = {};
  }
}

function save() {
  localStorage.setItem(STORAGE_EXPENSES, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_BUDGETS,  JSON.stringify(budgets));
}

// ─── Utility ────────────────────────────────────────────────
function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoStr) {
  const [year, month, day] = isoStr.split('-');
  const d = new Date(+year, +month - 1, +day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function slugify(cat) {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Toast ──────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ─── Confirm Modal ──────────────────────────────────────────
function showModal(msg) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = msg;
    overlay.classList.remove('hidden');

    function onConfirm() { cleanup(); resolve(true); }
    function onCancel()  { cleanup(); resolve(false); }
    function onKey(e)    { if (e.key === 'Escape') { cleanup(); resolve(false); } }

    function cleanup() {
      overlay.classList.add('hidden');
      document.getElementById('modal-confirm').removeEventListener('click', onConfirm);
      document.getElementById('modal-cancel').removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    }

    document.getElementById('modal-confirm').addEventListener('click', onConfirm);
    document.getElementById('modal-cancel').addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

// ─── Edit Modal ─────────────────────────────────────────────
function openEditModal(expense) {
  document.getElementById('edit-expense-id').value       = expense.id;
  document.getElementById('edit-expense-desc').value     = expense.description;
  document.getElementById('edit-expense-amount').value   = expense.amount;
  document.getElementById('edit-expense-category').value = expense.category;
  document.getElementById('edit-expense-date').value     = expense.date;
  document.getElementById('edit-modal-overlay').classList.remove('hidden');
  document.getElementById('edit-expense-desc').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.add('hidden');
  document.getElementById('edit-expense-form').reset();
}

document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal);

document.getElementById('edit-modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeEditModal();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeEditModal();
});

document.getElementById('edit-expense-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const id       = document.getElementById('edit-expense-id').value;
  const descEl   = document.getElementById('edit-expense-desc');
  const amountEl = document.getElementById('edit-expense-amount');
  const catEl    = document.getElementById('edit-expense-category');
  const dateEl   = document.getElementById('edit-expense-date');
  let valid = true;

  [descEl, amountEl, catEl, dateEl].forEach(el => el.classList.remove('invalid'));

  if (!descEl.value.trim())                    { descEl.classList.add('invalid');   valid = false; }
  if (!amountEl.value || +amountEl.value <= 0) { amountEl.classList.add('invalid'); valid = false; }
  if (!catEl.value)                            { catEl.classList.add('invalid');    valid = false; }
  if (!dateEl.value)                           { dateEl.classList.add('invalid');   valid = false; }

  if (!valid) { showToast('Please fill in all fields correctly.', 'error'); return; }

  const idx = expenses.findIndex(ex => ex.id === id);
  if (idx === -1) return;

  expenses[idx] = {
    ...expenses[idx],
    description: descEl.value.trim(),
    amount:      parseFloat(amountEl.value),
    category:    catEl.value,
    date:        dateEl.value,
  };

  save();
  renderAll();
  closeEditModal();
  showToast('Expense updated.', 'success');
});

// ─── Summary Cards ──────────────────────────────────────────
function renderSummary() {
  const totalBudget    = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalSpent     = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = totalBudget - totalSpent;

  document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
  document.getElementById('total-spent').textContent  = formatCurrency(totalSpent);
  document.getElementById('total-count').textContent  = expenses.length;

  const remEl = document.getElementById('total-remaining');
  remEl.textContent = formatCurrency(totalRemaining);
  remEl.className   = 'card-value ' + (totalRemaining < 0 ? 'spent' : totalRemaining < totalBudget * 0.2 ? 'warning' : 'safe');
}

// ─── Budget Progress Bars ───────────────────────────────────
function renderBudgetCharts() {
  const container = document.getElementById('budget-chart-container');

  if (!Object.keys(budgets).length) {
    container.innerHTML = '<p class="empty-state">No budgets set yet. Add a category budget to get started.</p>';
    return;
  }

  container.innerHTML = '';

  for (const [cat, budget] of Object.entries(budgets)) {
    const spent = expenses
      .filter(e => e.category === cat)
      .reduce((s, e) => s + e.amount, 0);

    const pct         = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const overBudget  = spent > budget;
    const nearLimit   = !overBudget && pct >= 80;
    const statusClass = overBudget ? 'over' : nearLimit ? 'warn' : 'safe';
    const remaining   = budget - spent;
    const statusText  = overBudget
      ? `Over by ${formatCurrency(Math.abs(remaining))}`
      : nearLimit
        ? `${formatCurrency(remaining)} left — nearing limit`
        : `${formatCurrency(remaining)} remaining`;

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-row">
        <span class="budget-cat-name">
          <span class="cat-dot" style="background:${CAT_COLORS[cat] || CAT_COLORS.Other}"></span>
          ${CAT_EMOJI[cat] || '📦'} ${cat}
        </span>
        <span class="budget-amounts"><strong>${formatCurrency(spent)}</strong> / ${formatCurrency(budget)}</span>
      </div>
      <div class="progress-track" title="${pct.toFixed(1)}% used">
        <div class="progress-bar ${statusClass}" style="width:${pct}%"></div>
      </div>
      <p class="budget-status ${statusClass}">${statusText}</p>
    `;
    container.appendChild(item);
  }
}

// ─── Monthly Bar Chart ───────────────────────────────────────
function renderMonthlyChart() {
  const container = document.getElementById('monthly-bar-container');
  const labelEl   = document.getElementById('monthly-chart-label');

  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  labelEl.textContent = monthName;

  // Gather daily totals for current month
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daily  = new Array(daysInMonth).fill(0);

  for (const e of expenses) {
    if (e.date.startsWith(prefix)) {
      const day = parseInt(e.date.split('-')[2], 10) - 1;
      daily[day] += e.amount;
    }
  }

  const hasData = daily.some(v => v > 0);
  if (!hasData) {
    container.innerHTML = '<p class="empty-state">No expenses this month yet.</p>';
    return;
  }

  const maxVal = Math.max(...daily);
  const CHART_HEIGHT = 72; // px — usable bar area

  container.innerHTML = '';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', `Daily spending for ${monthName}`);

  for (let i = 0; i < daysInMonth; i++) {
    const val    = daily[i];
    const height = maxVal > 0 ? Math.round((val / maxVal) * CHART_HEIGHT) : 0;
    const dayNum = i + 1;

    // Only show day labels for 1, 5, 10, 15, 20, 25, last day to avoid crowding
    const showLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === daysInMonth;

    const wrap = document.createElement('div');
    wrap.className = 'bar-chart-wrap';

    if (val > 0) {
      wrap.innerHTML = `
        <div class="bar-col" style="height:${height}px" aria-label="Day ${dayNum}: ${formatCurrency(val)}">
          <span class="bar-tooltip">Day ${dayNum}: ${formatCurrency(val)}</span>
        </div>
        <span class="bar-day-label">${showLabel ? dayNum : ''}</span>
      `;
    } else {
      wrap.innerHTML = `
        <div class="bar-col" style="height:2px;opacity:0.15"></div>
        <span class="bar-day-label">${showLabel ? dayNum : ''}</span>
      `;
    }

    chart.appendChild(wrap);
  }

  container.appendChild(chart);
}

// ─── Donut Chart (SVG) ──────────────────────────────────────
function renderDonut() {
  const wrap   = document.getElementById('donut-chart-wrap');
  const legend = document.getElementById('breakdown-legend');

  const totals = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const grand   = entries.reduce((s, [, v]) => s + v, 0);

  legend.innerHTML = '';

  if (!entries.length) {
    wrap.innerHTML = '<p class="empty-state">No expenses yet.</p>';
    return;
  }

  const size = 140;
  const cx   = size / 2;
  const cy   = size / 2;
  const R    = 52;
  const r    = 30;
  const gap  = 0.02;

  let startAngle = -Math.PI / 2;
  let pathsHTML  = '';

  for (const [cat, total] of entries) {
    const fraction = total / grand;
    const angle    = fraction * 2 * Math.PI - gap;
    const endAngle = startAngle + angle;
    const color    = CAT_COLORS[cat] || CAT_COLORS.Other;

    if (fraction < 0.001) { startAngle += fraction * 2 * Math.PI; continue; }

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy + r * Math.sin(endAngle);
    const x4 = cx + r * Math.cos(startAngle);
    const y4 = cy + r * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    pathsHTML += `<path
      d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z"
      fill="${color}" opacity="0.92">
      <title>${cat}: ${formatCurrency(total)} (${(fraction * 100).toFixed(1)}%)</title>
    </path>`;

    startAngle += fraction * 2 * Math.PI;
  }

  const centerHTML = `
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="9" fill="#64748b" font-family="inherit">Total</text>
    <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="700" font-family="inherit">${formatCurrency(grand)}</text>
  `;

  wrap.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending breakdown donut chart">
      ${pathsHTML}${centerHTML}
    </svg>
  `;

  for (const [cat, total] of entries) {
    const pct = (total / grand * 100).toFixed(1);
    const li  = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-swatch" style="background:${CAT_COLORS[cat] || CAT_COLORS.Other}"></span>
      <span class="legend-label">${cat}</span>
      <span class="legend-pct">${pct}%</span>
    `;
    legend.appendChild(li);
  }
}

// ─── Expense List ───────────────────────────────────────────
function getFilteredSorted() {
  const filterCat = document.getElementById('filter-category').value;
  const sortBy    = document.getElementById('sort-expenses').value;

  let list = filterCat ? expenses.filter(e => e.category === filterCat) : [...expenses];

  switch (sortBy) {
    case 'date-desc':   list.sort((a, b) => b.date.localeCompare(a.date)); break;
    case 'date-asc':    list.sort((a, b) => a.date.localeCompare(b.date)); break;
    case 'amount-desc': list.sort((a, b) => b.amount - a.amount); break;
    case 'amount-asc':  list.sort((a, b) => a.amount - b.amount); break;
  }

  return list;
}

function renderExpenseList() {
  const container = document.getElementById('expense-list');
  const list      = getFilteredSorted();

  if (!list.length) {
    container.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
    return;
  }

  container.innerHTML = '';

  for (const expense of list) {
    const catKey = slugify(expense.category);
    const color  = CAT_COLORS[expense.category] || CAT_COLORS.Other;
    const emoji  = CAT_EMOJI[expense.category]  || '📦';

    const item = document.createElement('div');
    item.className  = 'expense-item';
    item.dataset.id = expense.id;

    item.innerHTML = `
      <div class="expense-cat-badge bg-cat-${catKey}" style="color:${color}" title="${expense.category}">
        ${emoji}
      </div>
      <div class="expense-info">
        <div class="expense-desc" title="${expense.description}">${expense.description}</div>
        <div class="expense-meta">${expense.category} · ${formatDate(expense.date)}</div>
      </div>
      <span class="expense-amount">${formatCurrency(expense.amount)}</span>
      <button class="btn-icon-edit edit-btn" data-id="${expense.id}" aria-label="Edit ${expense.description}" title="Edit">✏️</button>
      <button class="btn-icon delete-btn" data-id="${expense.id}" aria-label="Delete ${expense.description}" title="Delete">🗑</button>
    `;

    container.appendChild(item);
  }
}

// ─── Full Re-render ──────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderBudgetCharts();
  renderMonthlyChart();
  renderDonut();
  renderExpenseList();
}

// ─── Budget Form ─────────────────────────────────────────────
document.getElementById('budget-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const catEl    = document.getElementById('budget-category');
  const amountEl = document.getElementById('budget-amount');
  let valid = true;

  catEl.classList.remove('invalid');
  amountEl.classList.remove('invalid');

  if (!catEl.value)                            { catEl.classList.add('invalid');    valid = false; }
  if (!amountEl.value || +amountEl.value < 0)  { amountEl.classList.add('invalid'); valid = false; }

  if (!valid) { showToast('Please fill in all fields correctly.', 'error'); return; }

  budgets[catEl.value] = parseFloat(amountEl.value);
  save();
  renderAll();
  showToast(`Budget set for ${catEl.value}.`, 'success');
  this.reset();
});

// ─── Expense Form ────────────────────────────────────────────
document.getElementById('expense-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const descEl   = document.getElementById('expense-desc');
  const amountEl = document.getElementById('expense-amount');
  const catEl    = document.getElementById('expense-category');
  const dateEl   = document.getElementById('expense-date');
  let valid = true;

  [descEl, amountEl, catEl, dateEl].forEach(el => el.classList.remove('invalid'));

  if (!descEl.value.trim())                    { descEl.classList.add('invalid');   valid = false; }
  if (!amountEl.value || +amountEl.value <= 0) { amountEl.classList.add('invalid'); valid = false; }
  if (!catEl.value)                            { catEl.classList.add('invalid');    valid = false; }
  if (!dateEl.value)                           { dateEl.classList.add('invalid');   valid = false; }

  if (!valid) { showToast('Please fill in all fields correctly.', 'error'); return; }

  const expense = {
    id:          uid(),
    description: descEl.value.trim(),
    amount:      parseFloat(amountEl.value),
    category:    catEl.value,
    date:        dateEl.value,
  };

  expenses.unshift(expense);
  save();
  renderAll();
  showToast(`Added ${formatCurrency(expense.amount)} — ${expense.category}.`, 'success');
  this.reset();
  setDefaultDate();
});

// ─── Expense List: Edit + Delete (delegated) ─────────────────
document.getElementById('expense-list').addEventListener('click', async function (e) {
  // Edit
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    const expense = expenses.find(ex => ex.id === editBtn.dataset.id);
    if (expense) openEditModal(expense);
    return;
  }

  // Delete
  const deleteBtn = e.target.closest('.delete-btn');
  if (!deleteBtn) return;

  const id      = deleteBtn.dataset.id;
  const expense = expenses.find(ex => ex.id === id);
  if (!expense) return;

  const confirmed = await showModal(`Delete "${expense.description}" (${formatCurrency(expense.amount)})?`);
  if (!confirmed) return;

  expenses = expenses.filter(ex => ex.id !== id);
  save();
  renderAll();
  showToast('Expense deleted.', 'info');
});

// ─── Clear All ───────────────────────────────────────────────
document.getElementById('btn-clear-all').addEventListener('click', async function () {
  const confirmed = await showModal('Clear all expenses and budgets? This cannot be undone.');
  if (!confirmed) return;

  expenses = [];
  budgets  = {};
  save();
  renderAll();
  showToast('All data cleared.', 'info');
});

// ─── Export CSV ──────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', function () {
  if (!expenses.length) {
    showToast('No expenses to export.', 'error');
    return;
  }

  const headers = ['Date', 'Description', 'Category', 'Amount'];
  const rows = expenses
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.amount.toFixed(2),
    ]);

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const now  = new Date().toISOString().split('T')[0];

  a.href     = url;
  a.download = `expenses-${now}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}.`, 'success');
});

// ─── Dark Mode ───────────────────────────────────────────────
const darkBtn = document.getElementById('btn-dark-mode');

function applyDark(on) {
  document.body.classList.toggle('dark', on);
  darkBtn.textContent = on ? '☀️' : '🌙';
  darkBtn.title       = on ? 'Switch to light mode' : 'Switch to dark mode';
}

darkBtn.addEventListener('click', function () {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem(STORAGE_DARK_MODE, isDark ? '1' : '0');
  applyDark(isDark);
});

// ─── Filter & Sort ───────────────────────────────────────────
document.getElementById('filter-category').addEventListener('change', renderExpenseList);
document.getElementById('sort-expenses').addEventListener('change', renderExpenseList);

// ─── Keyboard Shortcut: N = focus Add Expense description ────
document.addEventListener('keydown', function (e) {
  // Skip if user is typing in an input, select, or textarea
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  // Skip if any modal is open
  if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;
  if (!document.getElementById('edit-modal-overlay').classList.contains('hidden')) return;

  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    const descInput = document.getElementById('expense-desc');
    descInput.focus();
    descInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// ─── Month Label ─────────────────────────────────────────────
function setMonthLabel() {
  const now   = new Date();
  const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('current-month-label').textContent = label;
}

// ─── Set default date to today ───────────────────────────────
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('expense-date').value = today;
}

// ─── Init ────────────────────────────────────────────────────
(function init() {
  load();

  // Restore dark mode preference
  const savedDark = localStorage.getItem(STORAGE_DARK_MODE);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDark(savedDark !== null ? savedDark === '1' : prefersDark);

  setMonthLabel();
  setDefaultDate();
  renderAll();
})();
