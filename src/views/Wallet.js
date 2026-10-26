import { getState, addExpense, deleteExpense, saveExpenseCategory, deleteExpenseCategory, getFinancialSummary, getArgentinaDate } from '../state';
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
    <div class="flex h-screen w-full bg-[#0F172A] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('wallet')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0F172A]">
            ${renderMobileHeader('Mi Billetera')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-5 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Header Balance & Budget Card (Mi Billetera Style) -->
                    <div class="white-card p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white border border-blue-500/30 shadow-2xl relative overflow-hidden">
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
                        <button id="open-expense-modal-btn" class="flex-1 btn-emerald py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 font-display font-black text-sm uppercase tracking-wide shadow-emerald-md transition-all active:scale-98 cursor-pointer">
                            <span class="material-symbols-outlined text-xl">add_card</span>
                            Registrar Gasto
                        </button>
                        <button id="open-categories-modal-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer">
                            <span class="material-symbols-outlined text-lg">category</span>
                            Categorías & Metas
                        </button>
                    </div>

                    <!-- Chart & Distribution -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <!-- Chart -->
                        <div class="white-card p-5 border border-slate-700/60 shadow-xl flex flex-col">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-sm font-display font-black uppercase text-white">Distribución de Gastos</h3>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">${currentMonth}</span>
                            </div>
                            <div class="flex-1 min-h-[220px] relative flex items-center justify-center">
                                <canvas id="wallet-breakdown-chart"></canvas>
                            </div>
                        </div>

                        <!-- Obetide & Health Financial Ratio -->
                        <div class="white-card p-5 border border-slate-700/60 shadow-xl flex flex-col justify-between">
                            <div>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-1">Impacto en Salud</span>
                                <h3 class="text-sm font-display font-black uppercase text-white">Tratamiento & Bienestar</h3>
                                <p class="text-xs text-slate-400 mt-1">
                                    Control específico de inversión en salud, medicación Obetide, consultas y suplementos.
                                </p>
                            </div>

                            <div class="my-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                                        💉
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-white">Salud & Obetide</p>
                                        <span class="text-[10px] text-emerald-400">Gasto mensual acumulado</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="font-mono font-black text-emerald-400 text-lg">
                                        ${formatMoney(
                                            (state.expenses || [])
                                                .filter(e => e.date?.startsWith(currentMonth) && (e.category_name?.toLowerCase().includes('obetide') || e.category_name?.toLowerCase().includes('salud')))
                                                .reduce((sum, e) => sum + Number(e.amount), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            <p class="text-[11px] text-slate-400">
                                💡 Tip: Considera el tratamiento con Obetide como una inversión preventiva en longevidad y salud cardiovascular.
                            </p>
                        </div>
                    </div>

                    <!-- Category Budgets List -->
                    <div class="white-card p-5 border border-slate-700/60 shadow-xl">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-display font-black text-white uppercase tracking-tight">Presupuesto por Categoría</h3>
                                <span class="text-xs text-slate-400 font-mono font-bold">(${categories.length})</span>
                            </div>
                            <button id="open-new-cat-from-list-btn" class="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer">
                                <span class="material-symbols-outlined text-sm">add_circle</span>
                                Nueva Categoría
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${summary.byCategory.map(item => {
                                const cat = item.category;
                                const spentFormatted = formatMoney(item.spent);
                                const budgetFormatted = formatMoney(item.budget);
                                const isOver = item.spent > item.budget && item.budget > 0;

                                return `
                                <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex flex-col gap-2">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="text-xl">${cat.icon || '🏷️'}</span>
                                            <div>
                                                <h4 class="text-xs font-bold text-white">${cat.name}</h4>
                                                <span class="text-[10px] text-slate-400 font-mono">${spentFormatted} de ${budgetFormatted}</span>
                                            </div>
                                        </div>
                                        <span class="text-xs font-mono font-bold ${isOver ? 'text-red-400' : 'text-slate-300'}">
                                            ${item.percent}%
                                        </span>
                                    </div>
                                    <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-300 ${
                                            isOver ? 'bg-red-500' : item.percent > 80 ? 'bg-amber-400' : 'bg-emerald-400'
                                        }" style="width: ${Math.min(100, item.percent)}%"></div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Recent Expenses List -->
                    <div class="white-card p-5 border border-slate-700/60 shadow-xl">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                            <h3 class="text-base font-display font-black text-white uppercase tracking-tight">Movimientos Recientes</h3>
                            <span class="text-xs text-slate-400 font-mono font-bold">${(state.expenses || []).length} totales</span>
                        </div>

                        <div class="flex flex-col gap-2">
                            ${(state.expenses || []).length ? (state.expenses || []).slice(0, 15).map(e => `
                                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-slate-600 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shadow-2xs">
                                            ${categories.find(c => String(c.id) === String(e.category_id) || c.name === e.category_name)?.icon || '💳'}
                                        </div>
                                        <div>
                                            <h4 class="text-xs font-bold text-white">${e.description || e.category_name || 'Gasto'}</h4>
                                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">${e.date} · ${e.category_name || 'General'} · <span class="capitalize">${(e.payment_method || '').replace('_', ' ')}</span></p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <span class="font-mono font-black text-sm text-slate-200">-${formatMoney(e.amount)}</span>
                                        <button class="delete-expense-btn size-7 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${e.id}">
                                            <span class="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-8 text-slate-500">
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
        <div id="expense-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-slate-700/80 my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-2">
                        <div class="size-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">add_card</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-display font-black text-white uppercase">Nuevo Gasto</h3>
                            <p class="text-[11px] text-slate-400">Registro rápido para Mi Billetera</p>
                        </div>
                    </div>
                    <button id="close-expense-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <form id="expense-form" class="flex flex-col gap-4">
                    <!-- Amount (Big input for mobile thumb) -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase">Monto ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-slate-400">$</span>
                            <input type="number" id="expense-amount" placeholder="0" required autofocus step="any" class="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-8 pr-4 py-3 text-2xl font-mono font-black text-white outline-none focus:border-emerald-500">
                        </div>
                    </div>

                    <!-- Category Selector with Quick Add -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Categoría</label>
                            <button type="button" id="open-new-cat-from-expense-btn" class="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors cursor-pointer">
                                <span class="material-symbols-outlined text-sm">add_circle</span>
                                Nueva Categoría
                            </button>
                        </div>
                        <select id="expense-category" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                            ${categories.map(c => `
                                <option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>
                            `).join('')}
                            <option value="__create_new__" class="font-bold text-emerald-400 bg-slate-800">✨ + Crear nueva categoría...</option>
                        </select>
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase">Descripción / Comercio</label>
                        <input type="text" id="expense-description" placeholder="ej. Farmacia (Obetide), Supermercado Vea, etc." class="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-500">
                    </div>

                    <!-- Date & Payment Method -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Fecha</label>
                            <input type="date" id="expense-date" value="${getArgentinaDate()}" class="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500">
                        </div>
                        <div>
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Método</label>
                            <select id="expense-payment-method" class="w-full mt-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer">
                                <option value="tarjeta_debito">Débito</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta_credito">Crédito</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wide mt-2 shadow-emerald-md active:scale-98 transition-all cursor-pointer">
                        Guardar Gasto
                    </button>
                </form>
            </div>
        </div>

        <!-- Categories & Budgets Configuration Modal -->
        <div id="categories-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-slate-700/80 my-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-400 text-xl">tune</span>
                        <h3 class="text-base font-display font-black text-white uppercase">Categorías & Presupuestos</h3>
                    </div>
                    <button id="close-categories-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Add New Category CTA -->
                <button id="open-new-cat-from-modal-btn" class="w-full mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-emerald-md transition-all active:scale-98 cursor-pointer">
                    <span class="material-symbols-outlined text-base">add_circle</span>
                    Crear Nueva Categoría
                </button>

                <div class="flex flex-col gap-2.5">
                    ${categories.map(c => `
                        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700/80 gap-3 group hover:border-slate-600 transition-all">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="size-8 rounded-lg flex items-center justify-center text-lg shrink-0" style="background-color: ${c.color || '#3b82f6'}20; border: 1px solid ${c.color || '#3b82f6'}40;">
                                    ${c.icon}
                                </div>
                                <span class="text-xs font-bold text-white truncate">${c.name}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="text-xs text-slate-400 font-mono font-bold">$</span>
                                <input type="number" class="cat-budget-input w-28 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold text-right outline-none focus:border-emerald-500" data-id="${c.id}" value="${c.monthly_budget || 0}">
                                <button type="button" class="delete-cat-btn size-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${c.id}" data-name="${c.name}" title="Eliminar categoría">
                                    <span class="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button id="save-budgets-btn" class="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wide transition-all active:scale-98 cursor-pointer">
                    Guardar Cambios de Presupuesto
                </button>
            </div>
        </div>

        <!-- Dedicated Create Category Modal -->
        <div id="new-category-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-slate-700/80 my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-400 text-xl">new_label</span>
                        <h3 class="text-base font-display font-black text-white uppercase">Nueva Categoría</h3>
                    </div>
                    <button id="close-new-cat-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <form id="new-category-form" class="flex flex-col gap-4">
                    <!-- Name -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase">Nombre de la Categoría</label>
                        <input type="text" id="new-cat-name" placeholder="ej. Mascotas, Inversiones, Ropa..." required class="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-500">
                    </div>

                    <!-- Emoji / Icon Picker -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Ícono / Emoji</label>
                        <div class="flex items-center gap-2 mb-2">
                            <div id="new-cat-icon-preview" class="size-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                🛒
                            </div>
                            <input type="text" id="new-cat-icon" value="🛒" maxlength="4" class="w-20 bg-slate-900 border border-slate-700 text-white text-center rounded-xl px-2 py-2 text-base font-bold outline-none focus:border-emerald-500">
                            <span class="text-[11px] text-slate-400">Elegí uno rápido o escribí un emoji</span>
                        </div>
                        <div class="grid grid-cols-8 gap-1.5 p-2 bg-slate-900/60 border border-slate-800 rounded-xl">
                            ${['🛒', '💉', '🏋️', '🚗', '💡', '🎉', '🐾', '📚', '🎬', '💼', '⚡', '✈️', '🍕', '👕', '🏠', '💊', '👶', '💻', '☕', '🎁', '🎾', '🔧', '🍔', '🧾'].map(emoji => `
                                <button type="button" class="preset-emoji-btn size-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90 cursor-pointer" data-emoji="${emoji}">
                                    ${emoji}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Color Picker -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Color de Identificación</label>
                        <div class="flex items-center gap-2.5">
                            ${['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'].map((color, idx) => `
                                <button type="button" class="color-preset-btn size-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${idx === 0 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}" style="background-color: ${color};" data-color="${color}">
                                </button>
                            `).join('')}
                            <input type="hidden" id="new-cat-color" value="#10b981">
                        </div>
                    </div>

                    <!-- Monthly Budget -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase">Presupuesto Mensual Estimado ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-400">$</span>
                            <input type="number" id="new-cat-budget" placeholder="0" step="any" class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500">
                        </div>
                        <span class="text-[10px] text-slate-500 mt-1 block">Podés dejarlo en $0 si no querés un tope fijo.</span>
                    </div>

                    <button type="submit" class="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-display font-black text-xs uppercase tracking-wide shadow-emerald-md transition-all active:scale-98 cursor-pointer">
                        Guardar Categoría
                    </button>
                </form>
            </div>
        </div>

    </div>
    `;
};

export const attachWalletEvents = () => {
    const expenseModal = document.getElementById('expense-modal');
    const categoriesModal = document.getElementById('categories-modal');
    const newCategoryModal = document.getElementById('new-category-modal');
    const openExpenseBtn = document.getElementById('open-expense-modal-btn');
    const closeExpenseBtn = document.getElementById('close-expense-modal');
    const openCategoriesBtn = document.getElementById('open-categories-modal-btn');
    const closeCategoriesBtn = document.getElementById('close-categories-modal');
    const closeNewCatBtn = document.getElementById('close-new-cat-modal');
    const expenseForm = document.getElementById('expense-form');
    const newCategoryForm = document.getElementById('new-category-form');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');

    const openNewCatFromExpenseBtn = document.getElementById('open-new-cat-from-expense-btn');
    const openNewCatFromListBtn = document.getElementById('open-new-cat-from-list-btn');
    const openNewCatFromModalBtn = document.getElementById('open-new-cat-from-modal-btn');
    const catSelect = document.getElementById('expense-category');

    openExpenseBtn?.addEventListener('click', () => expenseModal?.classList.remove('hidden'));
    closeExpenseBtn?.addEventListener('click', () => expenseModal?.classList.add('hidden'));

    openCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.remove('hidden'));
    closeCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.add('hidden'));

    const openNewCategoryModal = () => {
        newCategoryModal?.classList.remove('hidden');
        setTimeout(() => document.getElementById('new-cat-name')?.focus(), 50);
    };

    openNewCatFromExpenseBtn?.addEventListener('click', openNewCategoryModal);
    openNewCatFromListBtn?.addEventListener('click', openNewCategoryModal);
    openNewCatFromModalBtn?.addEventListener('click', openNewCategoryModal);

    catSelect?.addEventListener('change', (e) => {
        if (e.target.value === '__create_new__') {
            const firstValidOption = e.target.querySelector('option:not([value="__create_new__"])');
            if (firstValidOption) e.target.value = firstValidOption.value;
            openNewCategoryModal();
        }
    });

    closeNewCatBtn?.addEventListener('click', () => {
        newCategoryModal?.classList.add('hidden');
    });

    // Preset Emojis
    document.querySelectorAll('.preset-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            const iconInput = document.getElementById('new-cat-icon');
            const iconPreview = document.getElementById('new-cat-icon-preview');
            if (iconInput) iconInput.value = emoji;
            if (iconPreview) iconPreview.textContent = emoji;
        });
    });

    document.getElementById('new-cat-icon')?.addEventListener('input', (e) => {
        const iconPreview = document.getElementById('new-cat-icon-preview');
        if (iconPreview) iconPreview.textContent = e.target.value || '🏷️';
    });

    // Color Presets
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-slate-900'));
            btn.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-slate-900');
            const colorInput = document.getElementById('new-cat-color');
            if (colorInput) colorInput.value = btn.dataset.color;
        });
    });

    // Handle Add Expense Submit
    expenseForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('expense-amount').value);
        const sel = document.getElementById('expense-category');
        const rawVal = sel.value;
        const category_id = (!rawVal || rawVal === '__create_new__') ? null : (isNaN(Number(rawVal)) ? rawVal : Number(rawVal));
        const category_name = sel.options[sel.selectedIndex]?.dataset.name || 'General';
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

    // New Category Form Submit
    newCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-cat-name').value.trim();
        const icon = document.getElementById('new-cat-icon').value.trim() || '🏷️';
        const color = document.getElementById('new-cat-color').value || '#10b981';
        const monthly_budget = Number(document.getElementById('new-cat-budget').value) || 0;

        if (!name) return;

        const newCat = await saveExpenseCategory({
            name,
            icon,
            color,
            monthly_budget
        });

        newCategoryModal?.classList.add('hidden');
        newCategoryForm.reset();
        const iconPreview = document.getElementById('new-cat-icon-preview');
        if (iconPreview) iconPreview.textContent = '🛒';
        const iconInput = document.getElementById('new-cat-icon');
        if (iconInput) iconInput.value = '🛒';

        window.showAlert?.('¡Categoría Creada!', `Se agregó "${name}" correctamente.`, 'success');

        // If the expense modal was open, dynamically add option and select it!
        const expSelect = document.getElementById('expense-category');
        if (expSelect && expenseModal && !expenseModal.classList.contains('hidden')) {
            const opt = document.createElement('option');
            opt.value = newCat.id;
            opt.dataset.name = newCat.name;
            opt.textContent = `${newCat.icon} ${newCat.name}`;
            const createOpt = expSelect.querySelector('option[value="__create_new__"]');
            if (createOpt) {
                expSelect.insertBefore(opt, createOpt);
            } else {
                expSelect.appendChild(opt);
            }
            expSelect.value = String(newCat.id);
        } else {
            window.router.navigate('wallet');
        }
    });

    // Delete Category
    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = isNaN(Number(btn.dataset.id)) ? btn.dataset.id : Number(btn.dataset.id);
            const name = btn.dataset.name || 'esta categoría';
            window.showConfirm?.(
                '¿Eliminar categoría?',
                `¿Deseas eliminar la categoría "${name}"? Los gastos históricos se mantendrán.`,
                async () => {
                    await deleteExpenseCategory(id);
                    window.showAlert?.('Categoría Eliminada', `Se eliminó "${name}".`, 'info');
                    window.router.navigate('wallet');
                }
            );
        });
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
            const rawId = input.dataset.id;
            const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
            const budget = Number(input.value);
            const found = (state.expenseCategories || []).find(c => String(c.id) === String(id));
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
                backgroundColor: categoriesWithSpend.length ? colors.slice(0, labels.length) : ['#334155'],
                borderWidth: 2,
                borderColor: '#1e293b'
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
                        color: '#cbd5e1',
                        font: { size: 10 }
                    }
                }
            },
            cutout: '65%'
        }
    });
};
