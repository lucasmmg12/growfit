import { getState, addExpense, deleteExpense, saveExpenseCategory, deleteExpenseCategory, getFinancialSummary, setMonthlyIncome, getArgentinaDate } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let walletChartInstance = null;
let expandedCategories = new Set(['vivienda-servicios', 'compromisos-cuotas', 'operativos-vida', 'salud-obetide']);

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

    const monthlyIncome = summary.monthlyIncome || 2975000;
    const totalSpent = summary.totalSpent || 0;
    const netBalance = summary.netBalance;
    const coveragePercent = totalSpent > 0 ? Math.min(100, Math.round((monthlyIncome / totalSpent) * 100)) : 100;
    const isDeficit = netBalance < 0;

    return `
    <div class="flex h-screen w-full bg-[#0D1117] font-sans text-[#F5F5F7] overflow-hidden fade-in">
        ${renderSidebar('wallet')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0D1117]">
            ${renderMobileHeader('Mi Billetera')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-5 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Apple Health / iOS 18 Hero Cashflow Card -->
                    <div class="white-card p-6 md:p-8 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-2xl relative overflow-hidden">
                        <!-- Top Metadata -->
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <div class="flex items-center gap-2">
                                <span class="badge-emerald py-1 px-3 text-xs font-semibold">
                                    <span class="size-1.5 rounded-full bg-[#10E775] animate-pulse"></span>
                                    Flujo de Caja · Octubre 2026
                                </span>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[#0A84FF] font-medium flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm">domain</span>
                                    ${summary.incomeSource}
                                </span>
                            </div>

                            <button id="open-income-modal-btn" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-medium py-1 px-2.5 rounded-xl hover:bg-white/5">
                                <span class="material-symbols-outlined text-sm">edit</span>
                                Ajustar Sueldo
                            </button>
                        </div>

                        <!-- 3 Hero KPIs (Apple Rings Grid) -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            <!-- Income -->
                            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
                                <span class="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                                    Ingresos Cobrados
                                    <span class="material-symbols-outlined text-base text-[#10E775]">trending_up</span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight text-[#10E775]">
                                        ${formatMoney(monthlyIncome)}
                                    </h3>
                                    <p class="text-[10px] text-slate-400 mt-0.5">Sueldo neto percibido</p>
                                </div>
                            </div>

                            <!-- Expenses -->
                            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
                                <span class="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                                    Gastos del Mes
                                    <span class="material-symbols-outlined text-base text-slate-300">receipt_long</span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight text-white">
                                        ${formatMoney(totalSpent)}
                                    </h3>
                                    <p class="text-[10px] text-slate-400 mt-0.5">${(state.expenses || []).filter(e => e.date?.startsWith(currentMonth)).length} conceptos activos</p>
                                </div>
                            </div>

                            <!-- Net Cash Balance / Gap -->
                            <div class="p-4 rounded-2xl ${isDeficit ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-emerald-500/[0.06] border-emerald-500/20'} border flex flex-col justify-between">
                                <span class="text-[11px] font-medium ${isDeficit ? 'text-red-300' : 'text-emerald-300'} flex items-center justify-between">
                                    ${isDeficit ? 'Brecha / Déficit' : 'Saldo Disponible'}
                                    <span class="material-symbols-outlined text-base ${isDeficit ? 'text-[#FF453A]' : 'text-[#10E775]'}">
                                        ${isDeficit ? 'error' : 'check_circle'}
                                    </span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight ${isDeficit ? 'text-[#FF453A]' : 'text-[#10E775]'}">
                                        ${formatMoney(netBalance)}
                                    </h3>
                                    <p class="text-[10px] ${isDeficit ? 'text-red-300/80' : 'text-emerald-300/80'} mt-0.5">
                                        ${isDeficit ? 'Obligaciones superan el sueldo' : 'Superávit positivo'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Cashflow Coverage Meter (Apple iOS Bar) -->
                        <div class="mt-5 pt-4 border-t border-white/[0.06]">
                            <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
                                <span class="text-slate-400">Cobertura con Ingreso Sanatorio</span>
                                <span class="${isDeficit ? 'text-red-300' : 'text-[#10E775]'} font-mono font-semibold">
                                    ${coveragePercent}% cubierto
                                </span>
                            </div>
                            <div class="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-700 ${isDeficit ? 'bg-gradient-to-r from-[#10E775] via-[#FF9F0A] to-[#FF453A]' : 'bg-[#10E775]'}" style="width: ${Math.min(100, coveragePercent)}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="flex flex-wrap sm:flex-nowrap gap-3 items-center justify-between">
                        <button id="open-expense-modal-btn" class="flex-1 btn-emerald py-3 px-5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs tracking-wide cursor-pointer shadow-md">
                            <span class="material-symbols-outlined text-lg">add_card</span>
                            Registrar Gasto Extra
                        </button>
                        <button id="open-categories-modal-btn" class="btn-ghost-light py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                            <span class="material-symbols-outlined text-base">tune</span>
                            Gestionar Categorías
                        </button>
                    </div>

                    <!-- Chart & Health Impact (Bento 2.0) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <!-- Chart -->
                        <div class="white-card p-5 border border-white/[0.07] shadow-xl flex flex-col">
                            <div class="flex items-center justify-between mb-3">
                                <div>
                                    <h3 class="text-sm font-semibold text-white">Distribución de Gastos</h3>
                                    <p class="text-[11px] text-slate-400">Desglose porcentual mensual</p>
                                </div>
                                <span class="text-xs font-mono font-semibold text-[#10E775] bg-[#10E775]/10 px-2.5 py-0.5 rounded-full border border-[#10E775]/20">
                                    ${formatMoney(totalSpent)}
                                </span>
                            </div>
                            <div class="flex-1 min-h-[220px] relative flex items-center justify-center">
                                <canvas id="wallet-breakdown-chart"></canvas>
                            </div>
                        </div>

                        <!-- Obetide & Health Financial Ratio -->
                        <div class="white-card p-5 border border-white/[0.07] shadow-xl flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-400/20 text-[#BF5AF2] font-semibold">
                                        Tratamiento & Salud
                                    </span>
                                    <span class="text-xs text-slate-400 font-mono font-medium">GLP-1</span>
                                </div>
                                <h3 class="text-sm font-semibold text-white">Inversión en Bienestar</h3>
                                <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                                    Control de compras de Obetide, consultas médicas y nutricionales en Sanatorio Argentino.
                                </p>
                            </div>

                            <div class="my-4 p-4 rounded-2xl bg-purple-500/[0.05] border border-purple-500/20 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-purple-500/20 text-[#BF5AF2] flex items-center justify-center text-xl">
                                        💉
                                    </div>
                                    <div>
                                        <p class="text-xs font-semibold text-white">Tratamiento Dutide & Tiroides</p>
                                        <span class="text-[10px] text-purple-300">Dutide ($100.000) + Levotiroxina ($15.000)</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="font-mono font-bold text-[#BF5AF2] text-lg">
                                        ${formatMoney(
                                            (state.expenses || [])
                                                .filter(e => e.date?.startsWith(currentMonth) && (e.category_id === 'salud-obetide' || e.category_name?.toLowerCase().includes('salud') || e.name?.toLowerCase().includes('dutide') || e.name?.toLowerCase().includes('levotiroxina') || e.category_name?.toLowerCase().includes('obetide')))
                                                .reduce((sum, e) => sum + Number(e.amount), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            <p class="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-purple-400 text-sm">verified_user</span>
                                Inversión prioritaria: control metabólico, saciedad temprana y soporte endocrino.
                            </p>
                        </div>
                    </div>

                    <!-- Real October Categories Breakdown with Detailed Concepts Accordion -->
                    <div class="white-card p-5 md:p-6 border border-white/[0.07] shadow-xl">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                            <div>
                                <h3 class="text-base font-semibold text-white">Presupuesto por Categoría</h3>
                                <p class="text-xs text-slate-400 mt-0.5">Toca una categoría para ver los conceptos detallados</p>
                            </div>
                            <span class="text-xs font-mono font-medium text-slate-400">
                                ${summary.byCategory.length} grupos
                            </span>
                        </div>

                        <div class="flex flex-col gap-3">
                            ${summary.byCategory.map(item => {
                                const cat = item.category;
                                const spentFormatted = formatMoney(item.spent);
                                const isExpanded = expandedCategories.has(cat.id);
                                const catExpenses = (state.expenses || []).filter(e => 
                                    (e.date?.startsWith(currentMonth)) && 
                                    (String(e.category_id) === String(cat.id) || e.category_name === cat.name)
                                );

                                return `
                                <div class="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden transition-all hover:border-white/[0.12]">
                                    <!-- Category Header (Click to expand) -->
                                    <button class="toggle-cat-accordion-btn w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors" data-catid="${cat.id}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="size-10 rounded-2xl flex items-center justify-center text-xl shrink-0" style="background-color: ${cat.color || '#0A84FF'}15; border: 1px solid ${cat.color || '#0A84FF'}30;">
                                                ${cat.icon || '🏷️'}
                                            </div>
                                            <div class="min-w-0">
                                                <h4 class="text-sm font-semibold text-white truncate">${cat.name}</h4>
                                                <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    ${catExpenses.length} ${catExpenses.length === 1 ? 'concepto' : 'conceptos'}
                                                </p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 shrink-0">
                                            <div class="text-right">
                                                <span class="text-sm font-bold font-mono text-white block">
                                                    ${spentFormatted}
                                                </span>
                                                <span class="text-[10px] text-slate-400 font-medium">
                                                    ${item.percentOfTotal || 0}% del total
                                                </span>
                                            </div>
                                            <span class="material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}">
                                                expand_more
                                            </span>
                                        </div>
                                    </button>

                                    <!-- Detailed Concepts List -->
                                    <div class="${isExpanded ? 'block' : 'hidden'} px-4 pb-3 pt-1 border-t border-white/[0.04]">
                                        <div class="divide-y divide-white/[0.04]">
                                            ${catExpenses.length ? catExpenses.map(exp => `
                                                <div class="py-2.5 flex items-center justify-between text-xs">
                                                    <div class="flex items-center gap-2">
                                                        <span class="size-1.5 rounded-full" style="background-color: ${cat.color || '#0A84FF'};"></span>
                                                        <span class="text-slate-200 font-medium">${exp.name || exp.description}</span>
                                                        ${exp.is_recurring ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">Fijo</span>' : ''}
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <span class="font-mono font-semibold text-slate-100">${formatMoney(exp.amount)}</span>
                                                        <button class="delete-expense-btn size-6 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${exp.id}" title="Eliminar registro">
                                                            <span class="material-symbols-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            `).join('') : `
                                                <p class="py-3 text-xs text-slate-500 italic text-center">No hay gastos cargados en esta categoría para este mes.</p>
                                            `}
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Recent Expenses Timeline -->
                    <div class="white-card p-5 border border-white/[0.07] shadow-xl">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                            <h3 class="text-base font-semibold text-white">Movimientos Recientes</h3>
                            <span class="text-xs text-slate-400 font-mono">${(state.expenses || []).length} totales</span>
                        </div>

                        <div class="flex flex-col gap-2">
                            ${(state.expenses || []).length ? (state.expenses || []).slice(0, 10).map(e => `
                                <div class="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="size-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-base">
                                            ${categories.find(c => String(c.id) === String(e.category_id) || c.name === e.category_name)?.icon || '💳'}
                                        </div>
                                        <div>
                                            <h4 class="text-xs font-semibold text-white">${e.description || e.name || e.category_name || 'Gasto'}</h4>
                                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">${e.date} · ${e.category_name || 'General'}</p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <span class="font-mono font-semibold text-xs text-slate-200">-${formatMoney(e.amount)}</span>
                                        <button class="delete-expense-btn size-6 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${e.id}">
                                            <span class="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-8 text-slate-500">
                                    <span class="material-symbols-outlined text-3xl mb-1">payments</span>
                                    <p class="text-xs">Sin gastos registrados este mes</p>
                                </div>
                            `}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('wallet')}
        </main>

        <!-- Income Edit Modal -->
        <div id="income-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div class="white-card p-6 w-full max-w-sm relative animate-scale-up shadow-2xl border border-white/[0.1]">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#10E775] text-xl">account_balance</span>
                        <h3 class="text-sm font-semibold text-white">Ingresos Mensuales</h3>
                    </div>
                    <button id="close-income-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form id="income-form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Sueldo / Ingreso Neto ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400">$</span>
                            <input type="number" id="income-amount-input" value="${monthlyIncome}" required class="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-7 pr-3 py-2.5 text-lg font-mono font-bold text-white outline-none focus:border-[#10E775]">
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Fuente / Empleador</label>
                        <input type="text" id="income-source-input" value="${summary.incomeSource}" required class="w-full mt-1 bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#10E775]">
                    </div>

                    <button type="submit" class="btn-emerald py-2.5 text-xs font-semibold rounded-xl mt-2 cursor-pointer shadow-md">
                        Guardar Ingreso
                    </button>
                </form>
            </div>
        </div>

        <!-- New Expense Modal -->
        <div id="expense-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-white/[0.1] my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <div class="size-8 rounded-xl bg-[#10E775]/10 text-[#10E775] border border-[#10E775]/20 flex items-center justify-center">
                            <span class="material-symbols-outlined text-lg">add_card</span>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-white">Nuevo Gasto</h3>
                            <p class="text-[11px] text-slate-400">Registro rápido para tu billetera</p>
                        </div>
                    </div>
                    <button id="close-expense-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form id="expense-form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Monto ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-base text-slate-400">$</span>
                            <input type="number" id="expense-amount" placeholder="0" required autofocus step="any" class="w-full bg-black/40 border border-white/[0.1] rounded-2xl pl-8 pr-4 py-3 text-2xl font-mono font-bold text-white outline-none focus:border-[#10E775]">
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400 mb-1 block">Categoría</label>
                        <select id="expense-category" class="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-[#10E775] cursor-pointer">
                            ${categories.map(c => `
                                <option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Concepto / Comercio</label>
                        <input type="text" id="expense-description" placeholder="ej. Supermercado, Farmacia, Combustible" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-[#10E775]">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Fecha</label>
                            <input type="date" id="expense-date" value="${getArgentinaDate()}" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#10E775]">
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Método de Pago</label>
                            <select id="expense-payment-method" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#10E775] cursor-pointer">
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta_debito">Débito</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="tarjeta_credito">Crédito</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="btn-emerald py-3 rounded-xl font-semibold text-xs tracking-wide mt-2 shadow-md cursor-pointer">
                        Guardar Gasto
                    </button>
                </form>
            </div>
        </div>

        <!-- Categories Configuration Modal -->
        <div id="categories-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-white/[0.1] my-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#10E775] text-lg">tune</span>
                        <h3 class="text-sm font-semibold text-white">Gestión de Categorías</h3>
                    </div>
                    <button id="close-categories-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <button id="open-new-cat-from-modal-btn" class="w-full mb-3 btn-emerald-soft py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-sm">add_circle</span>
                    + Crear Nueva Categoría
                </button>

                <div class="flex flex-col gap-2.5">
                    ${categories.map(c => `
                        <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="size-8 rounded-lg flex items-center justify-center text-lg shrink-0" style="background-color: ${c.color || '#0A84FF'}20;">
                                    ${c.icon}
                                </div>
                                <span class="text-xs font-medium text-white truncate">${c.name}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="text-xs text-slate-400 font-mono">$</span>
                                <input type="number" class="cat-budget-input w-28 bg-black/40 border border-white/[0.1] text-white rounded-lg px-2 py-1 text-xs font-mono font-semibold text-right outline-none focus:border-[#10E775]" data-id="${c.id}" value="${c.monthly_budget || 0}">
                                <button type="button" class="delete-cat-btn size-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${c.id}" data-name="${c.name}" title="Eliminar categoría">
                                    <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button id="save-budgets-btn" class="w-full mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer">
                    Guardar Cambios de Presupuesto
                </button>
            </div>
        </div>

        <!-- Create Category Modal -->
        <div id="new-category-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-sm relative animate-scale-up shadow-2xl border border-white/[0.1] my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#10E775] text-lg">new_label</span>
                        <h3 class="text-sm font-semibold text-white">Nueva Categoría</h3>
                    </div>
                    <button id="close-new-cat-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form id="new-category-form" class="flex flex-col gap-3.5">
                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Nombre de la Categoría</label>
                        <input type="text" id="new-cat-name" placeholder="ej. Ocio, Vehículo, Salud..." required class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#10E775]">
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400 mb-1 block">Ícono / Emoji</label>
                        <div class="flex items-center gap-2 mb-2">
                            <div id="new-cat-icon-preview" class="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                                🛒
                            </div>
                            <input type="text" id="new-cat-icon" value="🛒" maxlength="4" class="w-16 bg-black/40 border border-white/[0.1] text-white text-center rounded-xl px-2 py-1.5 text-sm font-bold outline-none focus:border-[#10E775]">
                        </div>
                        <div class="grid grid-cols-6 gap-1 p-2 bg-black/30 border border-white/5 rounded-xl">
                            ${['🏠', '💳', '🛒', '💉', '🚗', '💡', '🎉', '🏋️', '👶', '💻', '🍕', '🧾'].map(emoji => `
                                <button type="button" class="preset-emoji-btn size-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm transition-transform active:scale-90 cursor-pointer" data-emoji="${emoji}">
                                    ${emoji}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Presupuesto Mensual ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">$</span>
                            <input type="number" id="new-cat-budget" placeholder="0" step="any" class="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[#10E775]">
                        </div>
                    </div>

                    <button type="submit" class="btn-emerald py-2.5 text-xs font-semibold rounded-xl mt-1 cursor-pointer shadow-md">
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
    const incomeModal = document.getElementById('income-modal');

    const openExpenseBtn = document.getElementById('open-expense-modal-btn');
    const closeExpenseBtn = document.getElementById('close-expense-modal');
    const openCategoriesBtn = document.getElementById('open-categories-modal-btn');
    const closeCategoriesBtn = document.getElementById('close-categories-modal');
    const openIncomeBtn = document.getElementById('open-income-modal-btn');
    const closeIncomeBtn = document.getElementById('close-income-modal');

    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');

    openExpenseBtn?.addEventListener('click', () => expenseModal?.classList.remove('hidden'));
    closeExpenseBtn?.addEventListener('click', () => expenseModal?.classList.add('hidden'));

    openCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.remove('hidden'));
    closeCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.add('hidden'));

    openIncomeBtn?.addEventListener('click', () => incomeModal?.classList.remove('hidden'));
    closeIncomeBtn?.addEventListener('click', () => incomeModal?.classList.add('hidden'));

    // Accordion Toggle for Category Detailed Concepts
    document.querySelectorAll('.toggle-cat-accordion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = btn.dataset.catid;
            if (expandedCategories.has(catId)) {
                expandedCategories.delete(catId);
            } else {
                expandedCategories.add(catId);
            }
            window.router.navigate('wallet');
        });
    });

    // Handle Income Form Submit
    incomeForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('income-amount-input').value) || 0;
        const source = document.getElementById('income-source-input').value.trim() || 'Sanatorio Argentino';
        setMonthlyIncome(amount, source);
        incomeModal?.classList.add('hidden');
        window.showAlert?.('¡Ingreso Actualizado!', `Sueldo fijado en $${amount.toLocaleString('es-AR')}.`, 'success');
        window.router.navigate('wallet');
    });

    // Handle Add Expense Submit
    expenseForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('expense-amount').value);
        const sel = document.getElementById('expense-category');
        const rawVal = sel.value;
        const category_id = rawVal || 'operativos-vida';
        const category_name = sel.options[sel.selectedIndex]?.dataset.name || 'General';
        const description = document.getElementById('expense-description').value.trim() || category_name;
        const date = document.getElementById('expense-date').value;
        const payment_method = document.getElementById('expense-payment-method').value;

        await addExpense({
            name: description,
            amount,
            category_id,
            category_name,
            description,
            date,
            payment_method
        });

        expenseModal?.classList.add('hidden');
        window.showAlert?.('¡Gasto Registrado!', `Se guardó $${amount.toLocaleString('es-AR')} en ${category_name}.`, 'success');
        window.router.navigate('wallet');
    });

    // Delete Expense
    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = isNaN(Number(btn.dataset.id)) ? btn.dataset.id : Number(btn.dataset.id);
            window.showConfirm?.('¿Eliminar gasto?', 'Se eliminará este concepto de la lista.', async () => {
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
        window.showAlert?.('¡Presupuestos Guardados!', 'Se actualizaron las metas por categoría.', 'success');
        window.router.navigate('wallet');
    });

    // New Category Modal Controls
    const newCategoryModal = document.getElementById('new-category-modal');
    const openNewCatBtn = document.getElementById('open-new-cat-from-modal-btn');
    const closeNewCatBtn = document.getElementById('close-new-cat-modal');
    const newCategoryForm = document.getElementById('new-category-form');

    openNewCatBtn?.addEventListener('click', () => {
        newCategoryModal?.classList.remove('hidden');
        document.getElementById('new-cat-name')?.focus();
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

    // New Category Submit
    newCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-cat-name').value.trim();
        const icon = document.getElementById('new-cat-icon').value.trim() || '🏷️';
        const monthly_budget = Number(document.getElementById('new-cat-budget').value) || 0;

        if (!name) return;

        await saveExpenseCategory({
            name,
            icon,
            color: '#0A84FF',
            monthly_budget
        });

        newCategoryModal?.classList.add('hidden');
        newCategoryForm.reset();
        window.showAlert?.('¡Categoría Creada!', `Se agregó "${name}".`, 'success');
        window.router.navigate('wallet');
    });

    // Delete Category
    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = isNaN(Number(btn.dataset.id)) ? btn.dataset.id : Number(btn.dataset.id);
            const name = btn.dataset.name || 'esta categoría';
            window.showConfirm?.(
                '¿Eliminar categoría?',
                `¿Deseas eliminar "${name}"?`,
                async () => {
                    await deleteExpenseCategory(id);
                    window.showAlert?.('Categoría Eliminada', `Se eliminó "${name}".`, 'info');
                    window.router.navigate('wallet');
                }
            );
        });
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
    const colors = categoriesWithSpend.length ? categoriesWithSpend.map(c => c.category.color || '#0A84FF') : ['rgba(255,255,255,0.1)'];

    walletChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#0D1117',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#86868B',
                        font: { 
                            size: 11,
                            family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                        },
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 20, 24, 0.95)',
                    titleColor: '#F5F5F7',
                    bodyColor: '#10E775',
                    bodyFont: {
                        family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        weight: 'bold'
                    },
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` $ ${Number(ctx.raw || 0).toLocaleString('es-AR')}`
                    }
                }
            },
            cutout: '72%'
        }
    });
};
