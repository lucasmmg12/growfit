import { getState, addExpense, deleteExpense, saveExpenseCategory, getFinancialSummary, getArgentinaDate } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let walletChartInstance = null;

export const renderWallet = () => {
    const state = getState();
    const currentMonth = getArgentinaDate().substring(0, 7);
    const summary = getFinancialSummary(currentMonth);
    const currency = state.profile.currency || 'ARS';
    const categories = state.expenseCategories || [];

    const formatMoney = (val) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency === 'USD' ? 'USD' : 'ARS',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const percentUsed = summary.totalBudget > 0 
        ? Math.min(100, Math.round((summary.totalSpent / summary.totalBudget) * 100)) 
        : 0;

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('wallet')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Mi Billetera')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-5 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Header Balance & Budget Card (Mi Billetera Style) -->
                    <div class="white-card p-6 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white border-0 shadow-emerald-lg relative overflow-hidden">
                        <div class="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                            <span class="material-symbols-outlined text-[170px]">account_balance_wallet</span>
                        </div>

                        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-2">
                                    <span class="material-symbols-outlined text-sm">savings</span>
                                    Presupuesto Mensual · ${currentMonth}
                                </div>
                                <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Gastado este Mes</span>
                                <h2 class="text-3xl md:text-4xl font-display font-black tracking-tight text-white">${formatMoney(summary.totalSpent)}</h2>
                            </div>

                            <div class="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-300">Presupuesto</span>
                                    <p class="text-base md:text-lg font-mono font-black text-white">${formatMoney(summary.totalBudget)}</p>
                                </div>
                                <div class="h-8 w-px bg-white/20"></div>
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-300">Disponible</span>
                                    <p class="text-base md:text-lg font-mono font-black ${summary.remainingBudget > 0 ? 'text-emerald-400' : 'text-red-400'}">
                                        ${formatMoney(summary.remainingBudget)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar with Alert Color -->
                        <div class="mt-5 pt-3 border-t border-white/10">
                            <div class="flex justify-between items-center text-xs mb-1.5 font-bold">
                                <span class="text-slate-300">Consumo del Presupuesto</span>
                                <span class="${percentUsed > 90 ? 'text-red-300' : percentUsed > 70 ? 'text-amber-300' : 'text-emerald-300'}">
                                    ${percentUsed}% utilizado
                                </span>
                            </div>
                            <div class="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500 ${
                                    percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                                }" style="width: ${percentUsed}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="flex gap-3 items-center justify-between">
                        <button id="open-expense-modal-btn" class="flex-1 btn-emerald py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 font-display font-black text-sm uppercase tracking-wide shadow-emerald-md">
                            <span class="material-symbols-outlined text-xl">add_card</span>
                            Registrar Gasto
                        </button>
                        <button id="open-categories-modal-btn" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition-all active:scale-95">
                            <span class="material-symbols-outlined text-lg">tune</span>
                            Presupuestos
                        </button>
                    </div>

                    <!-- Chart & Distribution -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <!-- Chart -->
                        <div class="white-card p-5 flex flex-col">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-sm font-display font-black uppercase text-text-primary">Distribución de Gastos</h3>
                                <span class="badge-emerald text-[10px]">${currentMonth}</span>
                            </div>
                            <div class="flex-1 min-h-[220px] relative flex items-center justify-center">
                                <canvas id="wallet-breakdown-chart"></canvas>
                            </div>
                        </div>

                        <!-- Obetide & Health Financial Ratio -->
                        <div class="white-card p-5 flex flex-col justify-between">
                            <div>
                                <span class="badge-emerald mb-1">Impacto en Salud</span>
                                <h3 class="text-sm font-display font-black uppercase text-text-primary">Tratamiento & Bienestar</h3>
                                <p class="text-xs text-text-muted mt-1">
                                    Control específico de inversión en salud, medicación Obetide, consultas y suplementos.
                                </p>
                            </div>

                            <div class="my-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl">
                                        💉
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-emerald-950">Salud & Obetide</p>
                                        <span class="text-[10px] text-emerald-700">Gasto mensual acumulado</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="font-mono font-black text-emerald-900 text-lg">
                                        ${formatMoney(
                                            (state.expenses || [])
                                                .filter(e => e.date?.startsWith(currentMonth) && (e.category_name?.toLowerCase().includes('obetide') || e.category_name?.toLowerCase().includes('salud')))
                                                .reduce((sum, e) => sum + Number(e.amount), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            <p class="text-[11px] text-slate-500">
                                💡 Tip: Considera el tratamiento con Obetide como una inversión preventiva en longevidad y salud cardiovascular.
                            </p>
                        </div>
                    </div>

                    <!-- Category Budgets List -->
                    <div class="white-card p-5">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                            <h3 class="text-base font-display font-black text-text-primary uppercase tracking-tight">Presupuesto por Categoría</h3>
                            <span class="text-xs text-text-muted font-mono font-bold">${categories.length} categorías</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${summary.byCategory.map(item => {
                                const cat = item.category;
                                const spentFormatted = formatMoney(item.spent);
                                const budgetFormatted = formatMoney(item.budget);
                                const isOver = item.spent > item.budget && item.budget > 0;

                                return `
                                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-xl">${cat.icon || '🏷️'}</span>
                                            <div>
                                                <h4 class="text-xs font-bold text-text-primary">${cat.name}</h4>
                                                <span class="text-[10px] text-slate-500 font-mono">${spentFormatted} de ${budgetFormatted}</span>
                                            </div>
                                        </div>
                                        <span class="text-xs font-mono font-bold ${isOver ? 'text-red-500' : 'text-slate-700'}">
                                            ${item.percent}%
                                        </span>
                                    </div>
                                    <div class="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-300 ${
                                            isOver ? 'bg-red-500' : item.percent > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                                        }" style="width: ${Math.min(100, item.percent)}%"></div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Recent Expenses List -->
                    <div class="white-card p-5">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                            <h3 class="text-base font-display font-black text-text-primary uppercase tracking-tight">Movimientos Recientes</h3>
                            <span class="text-xs text-text-muted font-mono font-bold">${(state.expenses || []).length} totales</span>
                        </div>

                        <div class="flex flex-col gap-2">
                            ${(state.expenses || []).length ? (state.expenses || []).slice(0, 15).map(e => `
                                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-2xs">
                                            ${categories.find(c => c.id === e.category_id || c.name === e.category_name)?.icon || '💳'}
                                        </div>
                                        <div>
                                            <h4 class="text-xs font-bold text-text-primary">${e.description || e.category_name || 'Gasto'}</h4>
                                            <p class="text-[10px] text-slate-500 font-mono mt-0.5">${e.date} · ${e.category_name || 'General'} · <span class="capitalize">${(e.payment_method || '').replace('_', ' ')}</span></p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <span class="font-mono font-black text-sm text-slate-900">-${formatMoney(e.amount)}</span>
                                        <button class="delete-expense-btn size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors" data-id="${e.id}">
                                            <span class="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-8 text-slate-400">
                                    <span class="material-symbols-outlined text-4xl mb-1">payments</span>
                                    <p class="text-xs font-bold">Sin gastos registrados este mes</p>
                                </div>
                            `}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('wallet')}
        </main>

        <!-- New Expense Modal -->
        <div id="expense-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-emerald-xl my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-border-soft">
                    <div class="flex items-center gap-2">
                        <div class="size-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">add_card</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-display font-black text-text-primary uppercase">Nuevo Gasto</h3>
                            <p class="text-[11px] text-text-muted">Registro rápido para Mi Billetera</p>
                        </div>
                    </div>
                    <button id="close-expense-modal" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <form id="expense-form" class="flex flex-col gap-4">
                    <!-- Amount (Big input for mobile thumb) -->
                    <div>
                        <label class="text-[11px] font-bold text-text-muted uppercase">Monto ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-slate-400">$</span>
                            <input type="number" id="expense-amount" placeholder="0" required autofocus step="any" class="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-2xl font-mono font-black text-slate-900 outline-none focus:border-blue-500">
                        </div>
                    </div>

                    <!-- Category Selector -->
                    <div>
                        <label class="text-[11px] font-bold text-text-muted uppercase mb-1 block">Categoría</label>
                        <select id="expense-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                            ${categories.map(c => `
                                <option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="text-[11px] font-bold text-text-muted uppercase">Descripción / Comercio</label>
                        <input type="text" id="expense-description" placeholder="ej. Farmacia (Obetide), Supermercado Vea, etc." class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-blue-500">
                    </div>

                    <!-- Date & Payment Method -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[11px] font-bold text-text-muted uppercase">Fecha</label>
                            <input type="date" id="expense-date" value="${getArgentinaDate()}" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="text-[11px] font-bold text-text-muted uppercase">Método</label>
                            <select id="expense-payment-method" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500">
                                <option value="tarjeta_debito">Débito</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta_credito">Crédito</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wide mt-2 shadow-sm active:scale-98 transition-all">
                        Guardar Gasto
                    </button>
                </form>
            </div>
        </div>

        <!-- Budget Configuration Modal -->
        <div id="categories-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-emerald-xl my-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-border-soft">
                    <h3 class="text-base font-display font-black text-text-primary uppercase">Presupuestos Mensuales</h3>
                    <button id="close-categories-modal" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="flex flex-col gap-3">
                    ${categories.map(c => `
                        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 gap-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">${c.icon}</span>
                                <span class="text-xs font-bold">${c.name}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400 font-mono">$</span>
                                <input type="number" class="cat-budget-input w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right outline-none focus:border-blue-500" data-id="${c.id}" value="${c.monthly_budget || 0}">
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button id="save-budgets-btn" class="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-display font-black text-xs uppercase tracking-wide">
                    Guardar Cambios de Presupuesto
                </button>
            </div>
        </div>

    </div>
    `;
};

export const attachWalletEvents = () => {
    const expenseModal = document.getElementById('expense-modal');
    const categoriesModal = document.getElementById('categories-modal');
    const openExpenseBtn = document.getElementById('open-expense-modal-btn');
    const closeExpenseBtn = document.getElementById('close-expense-modal');
    const openCategoriesBtn = document.getElementById('open-categories-modal-btn');
    const closeCategoriesBtn = document.getElementById('close-categories-modal');
    const expenseForm = document.getElementById('expense-form');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');

    openExpenseBtn?.addEventListener('click', () => expenseModal?.classList.remove('hidden'));
    closeExpenseBtn?.addEventListener('click', () => expenseModal?.classList.add('hidden'));

    openCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.remove('hidden'));
    closeCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.add('hidden'));

    // Handle Add Expense Submit
    expenseForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('expense-amount').value);
        const catSelect = document.getElementById('expense-category');
        const category_id = Number(catSelect.value) || null;
        const category_name = catSelect.options[catSelect.selectedIndex]?.dataset.name || 'General';
        const description = document.getElementById('expense-description').value;
        const date = document.getElementById('expense-date').value;
        const payment_method = document.getElementById('expense-payment-method').value;

        await addExpense({
            amount,
            category_id,
            category_name,
            description,
            date,
            payment_method
        });

        expenseModal?.classList.add('hidden');
        window.showAlert?.('¡Gasto Registrado!', `Se guardó $${amount} en ${category_name}.`, 'success');
        window.router.navigate('wallet');
    });

    // Delete Expense
    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.dataset.id);
            window.showConfirm?.('¿Eliminar gasto?', 'Se reintegrará al saldo del presupuesto.', async () => {
                await deleteExpense(id);
                window.router.navigate('wallet');
            });
        });
    });

    // Save Budgets
    saveBudgetsBtn?.addEventListener('click', async () => {
        const state = getState();
        const inputs = document.querySelectorAll('.cat-budget-input');
        for (const input of inputs) {
            const id = Number(input.dataset.id);
            const budget = Number(input.value);
            const found = (state.expenseCategories || []).find(c => c.id === id);
            if (found) {
                await saveExpenseCategory({ ...found, monthly_budget: budget });
            }
        }
        categoriesModal?.classList.add('hidden');
        window.showAlert?.('¡Presupuestos Actualizados!', 'Se han guardado las nuevas metas por categoría.', 'success');
        window.router.navigate('wallet');
    });

    initWalletChart();
};

const initWalletChart = () => {
    const canvas = document.getElementById('wallet-breakdown-chart');
    if (!canvas) return;

    if (walletChartInstance) {
        walletChartInstance.destroy();
    }

    const state = getState();
    const currentMonth = getArgentinaDate().substring(0, 7);
    const summary = getFinancialSummary(currentMonth);

    const categoriesWithSpend = summary.byCategory.filter(c => c.spent > 0);
    const labels = categoriesWithSpend.length ? categoriesWithSpend.map(c => c.category.name) : ['Sin gastos'];
    const dataValues = categoriesWithSpend.length ? categoriesWithSpend.map(c => c.spent) : [1];
    const colors = [
        '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
    ];

    walletChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dataValues,
                backgroundColor: categoriesWithSpend.length ? colors.slice(0, labels.length) : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10 }
                    }
                }
            },
            cutout: '65%'
        }
    });
};
