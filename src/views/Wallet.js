import { getState, addExpense, deleteExpense, saveExpenseCategory, deleteExpenseCategory, addIncome, deleteIncome, toggleIncomeReceived, saveIncomeCategory, deleteIncomeCategory, getFinancialSummary, setMonthlyIncome, getArgentinaDate, toggleExpensePaid, setAllExpensesPaid } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let walletChartInstance = null;
let expandedCategories = new Set(['vivienda-servicios', 'compromisos-cuotas', 'operativos-vida', 'salud-obetide']);
let expandedIncomeCategories = new Set(['inc-cat-sueldo', 'inc-cat-growlabs', 'inc-cat-otros']);

export const renderWallet = () => {
    const state = getState();
    const currentMonth = getArgentinaDate().substring(0, 7);
    const summary = getFinancialSummary(currentMonth);
    const currency = state.profile.currency || 'ARS';
    const categories = state.expenseCategories || [];
    const incomeCategories = state.incomeCategories || [];
    const incomesByCategory = summary.incomesByCategory || [];

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
    <div class="flex h-screen w-full bg-[#050C09] font-sans text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('wallet')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative">
            ${renderMobileHeader('Mi Billetera')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- Whoop / Oura Performance Hero Cashflow Card -->
                    <div class="white-card card-glow-emerald p-6 md:p-8 shadow-2xl relative overflow-hidden">
                        <!-- Top Metadata -->
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <div class="flex items-center gap-2">
                                <span class="badge-emerald py-1 px-3 text-xs font-semibold">
                                    <span class="size-1.5 rounded-full bg-[#10E775] animate-pulse"></span>
                                    Flujo de Caja · Octubre 2026
                                </span>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-400/20 text-[#2DD4BF] font-medium flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm">account_balance_wallet</span>
                                    Ingresos: ${summary.incomeSource}
                                </span>
                            </div>

                            <div class="flex items-center gap-2">
                                <button id="mark-all-paid-btn" class="text-xs text-[#10E775] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-medium py-1 px-2.5 rounded-xl hover:bg-[#10E775]/10 border border-[#10E775]/20">
                                    <span class="material-symbols-outlined text-sm">done_all</span>
                                    ${summary.isAllPaid ? 'Todo Pagado' : 'Marcar todo pagado'}
                                </button>
                                <button id="open-income-modal-btn" class="text-xs text-[#10E775] hover:text-white flex items-center gap-1 transition-colors cursor-pointer font-semibold py-1 px-2.5 rounded-xl bg-[#10E775]/10 hover:bg-[#10E775]/20 border border-[#10E775]/25">
                                    <span class="material-symbols-outlined text-sm">add_circle</span>
                                    + Registrar Ingreso
                                </button>
                            </div>
                        </div>

                        ${summary.isAllPaid ? `
                        <!-- 100% Paid & Fulfilled Celebration Banner -->
                        <div class="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-[#10E775]/15 via-[#10E775]/10 to-transparent border border-[#10E775]/30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                            <div class="flex items-center gap-3.5">
                                <div class="size-11 rounded-2xl bg-[#10E775]/20 border border-[#10E775]/40 flex items-center justify-center text-[#10E775] shrink-0 shadow-lg shadow-[#10E775]/10">
                                    <span class="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-sm md:text-base font-bold text-white tracking-tight">¡Octubre 100% Pagado y Cumplido!</h4>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10E775] text-[#04120B] uppercase tracking-wider">Al día</span>
                                    </div>
                                    <p class="text-xs text-emerald-200/80 mt-1">Has cancelado y cumplido todos tus compromisos del mes (${summary.paidCount} conceptos por ${formatMoney(summary.totalPaid)}). Sin deudas pendientes.</p>
                                </div>
                            </div>
                            <div class="hidden sm:flex flex-col items-end shrink-0">
                                <span class="text-[10px] uppercase tracking-wider font-semibold text-emerald-400/70 font-mono">Pendiente</span>
                                <span class="text-lg font-mono font-bold text-[#10E775]">$0</span>
                            </div>
                        </div>
                        ` : ''}

                        <!-- 3 Hero KPIs (Apple Rings Grid) -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            <!-- Income -->
                            <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/15 flex flex-col justify-between">
                                <span class="text-[11px] font-medium text-emerald-300/75 flex items-center justify-between">
                                    Ingresos Totales
                                    <span class="material-symbols-outlined text-base text-[#10E775]">trending_up</span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight text-[#10E775]">
                                        ${formatMoney(monthlyIncome)}
                                    </h3>
                                    <p class="text-[10px] text-emerald-300/70 mt-0.5 truncate" title="${summary.incomeSource}">
                                        ${summary.incomeCount || 1} ${(summary.incomeCount || 1) === 1 ? 'ingreso' : 'ingresos'} · ${summary.incomeSource}
                                    </p>
                                </div>
                            </div>

                            <!-- Expenses / Paid -->
                            <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/15 flex flex-col justify-between">
                                <span class="text-[11px] font-medium text-emerald-300/75 flex items-center justify-between">
                                    Total Pagado y Cumplido
                                    <span class="material-symbols-outlined text-base text-[#34D399]">task_alt</span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight text-white">
                                        ${formatMoney(summary.totalPaid)}
                                    </h3>
                                    <p class="text-[10px] ${summary.isAllPaid ? 'text-[#10E775]' : 'text-emerald-300/70'} font-medium mt-0.5 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-xs">check</span>
                                        ${summary.paidCount} de ${summary.paidCount + summary.pendingCount} pagados (${summary.isAllPaid ? '100% al día' : `${formatMoney(summary.totalPending)} pendiente`})
                                    </p>
                                </div>
                            </div>

                            <!-- Net Cash Balance / Status -->
                            <div class="p-4 rounded-2xl ${summary.isAllPaid ? 'bg-[#10E775]/[0.08] border-[#10E775]/25' : isDeficit ? 'bg-lime-500/[0.08] border-lime-500/25' : 'bg-emerald-500/[0.08] border-emerald-500/25'} border flex flex-col justify-between">
                                <span class="text-[11px] font-medium ${summary.isAllPaid ? 'text-emerald-300' : isDeficit ? 'text-lime-300' : 'text-emerald-300'} flex items-center justify-between">
                                    ${summary.isAllPaid ? 'Estado de Compromisos' : isDeficit ? 'Brecha / Déficit' : 'Saldo Disponible'}
                                    <span class="material-symbols-outlined text-base ${summary.isAllPaid ? 'text-[#10E775]' : isDeficit ? 'text-[#84CC16]' : 'text-[#10E775]'}">
                                        ${summary.isAllPaid ? 'verified' : isDeficit ? 'info' : 'check_circle'}
                                    </span>
                                </span>
                                <div class="mt-2">
                                    <h3 class="text-2xl md:text-2xl font-bold font-mono tracking-tight ${summary.isAllPaid ? 'text-[#10E775]' : isDeficit ? 'text-[#A3E635]' : 'text-[#10E775]'}">
                                        ${summary.isAllPaid ? '100% Cubierto' : formatMoney(netBalance)}
                                    </h3>
                                    <p class="text-[10px] ${summary.isAllPaid ? 'text-emerald-300/80' : isDeficit ? 'text-lime-300/80' : 'text-emerald-300/80'} mt-0.5">
                                        ${summary.isAllPaid ? 'Ingresos + Fondos Propios integrados' : isDeficit ? 'Obligaciones superan los ingresos' : 'Superávit positivo'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Cashflow Coverage Meter (Apple iOS Bar) -->
                        <div class="mt-5 pt-4 border-t border-emerald-500/15">
                            <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
                                <span class="text-emerald-300/75">Estado de Liquidación y Cumplimiento</span>
                                <span class="text-[#10E775] font-mono font-semibold flex items-center gap-1">
                                    <span class="material-symbols-outlined text-xs">task_alt</span>
                                    ${summary.isAllPaid ? `100% Abonado (${summary.paidCount} de ${summary.paidCount} conceptos)` : `${coveragePercent}% cubierto con ingresos`}
                                </span>
                            </div>
                            <div class="h-2 w-full bg-emerald-950/60 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-700 bg-[#10E775]" style="width: ${summary.isAllPaid ? '100' : Math.min(100, coveragePercent)}%"></div>
                            </div>
                            <p class="text-[11px] text-emerald-300/70 mt-2 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-[#34D399]">info</span>
                                Ingresos registrados (${summary.incomeSource}) suman ${formatMoney(monthlyIncome)} (${coveragePercent}%)${isDeficit ? ` · El saldo complementario de ${formatMoney(Math.abs(netBalance))} fue cubierto con fondos personales.` : ' · Superávit disponible a favor.'}
                            </p>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="grid grid-cols-2 sm:flex sm:flex-nowrap gap-2.5 items-center justify-between">
                        <button id="open-income-modal-top-btn" class="flex-1 py-3 px-4 rounded-2xl bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/35 text-[#10E775] flex items-center justify-center gap-2 font-semibold text-xs tracking-wide cursor-pointer transition-colors">
                            <span class="material-symbols-outlined text-lg">payments</span>
                            Agregar Ingreso
                        </button>
                        <button id="open-expense-modal-btn" class="flex-1 btn-emerald py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs tracking-wide cursor-pointer shadow-md">
                            <span class="material-symbols-outlined text-lg">add_card</span>
                            Agregar Gasto
                        </button>
                        <button id="open-new-cat-direct-btn" class="py-3 px-4 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-[#2DD4BF] flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-colors">
                            <span class="material-symbols-outlined text-base">create_new_folder</span>
                            Nueva Categoría
                        </button>
                        <button id="open-categories-modal-btn" class="btn-ghost-light py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                            <span class="material-symbols-outlined text-base">tune</span>
                            Presupuestos
                        </button>
                    </div>

                    <!-- Chart & Health Impact (Bento 2.0) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <!-- Chart -->
                        <div class="white-card card-glow-mint p-5 shadow-xl flex flex-col">
                            <div class="flex items-center justify-between mb-3">
                                <div>
                                    <h3 class="text-sm font-semibold text-white">Distribución de Gastos</h3>
                                    <p class="text-[11px] text-emerald-300/70">Desglose porcentual mensual</p>
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
                        <div class="white-card card-glow-jade p-5 shadow-xl flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-400/20 text-[#2DD4BF] font-semibold">
                                        Tratamiento & Salud
                                    </span>
                                    <span class="text-xs text-emerald-400/70 font-mono font-medium">GLP-1</span>
                                </div>
                                <h3 class="text-sm font-semibold text-white">Inversión en Bienestar</h3>
                                <p class="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                                    Control de compras de Obetide, consultas médicas y nutricionales en Sanatorio Argentino.
                                </p>
                            </div>

                            <div class="my-4 p-4 rounded-2xl bg-teal-500/[0.06] border border-teal-500/20 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-teal-500/20 text-[#2DD4BF] flex items-center justify-center text-xl">
                                        💉
                                    </div>
                                    <div>
                                        <p class="text-xs font-semibold text-white">Tratamiento Dutide & Tiroides</p>
                                        <span class="text-[10px] text-teal-300">Dutide ($100.000) + Levotiroxina ($15.000)</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="font-mono font-bold text-[#2DD4BF] text-lg">
                                        ${formatMoney(
                                            (state.expenses || [])
                                                .filter(e => e.date?.startsWith(currentMonth) && (e.category_id === 'salud-obetide' || e.category_name?.toLowerCase().includes('salud') || e.name?.toLowerCase().includes('dutide') || e.name?.toLowerCase().includes('levotiroxina') || e.category_name?.toLowerCase().includes('obetide')))
                                                .reduce((sum, e) => sum + Number(e.amount), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            <p class="text-[11px] text-emerald-300/70 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[#2DD4BF] text-sm">verified_user</span>
                                Inversión prioritaria: control metabólico, saciedad temprana y soporte endocrino.
                            </p>
                        </div>
                    </div>

                    <!-- Ingresos por Categoría (Sueldo, Grow Labs, Otros Ingresos) -->
                    <div class="white-card card-glow-emerald p-5 md:p-6 shadow-xl">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-emerald-500/15">
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-base font-semibold text-white">Ingresos por Categoría</h3>
                                    <span class="text-xs font-mono font-bold text-[#10E775] bg-[#10E775]/10 px-2.5 py-0.5 rounded-full border border-[#10E775]/25">
                                        ${formatMoney(monthlyIncome)}
                                    </span>
                                </div>
                                <p class="text-xs text-emerald-300/70 mt-0.5">Sueldo, Grow Labs y otras fuentes de ingreso del mes</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="open-new-income-cat-btn" class="px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/25 text-[#2DD4BF] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors">
                                    <span class="material-symbols-outlined text-xs">create_new_folder</span>
                                    + Categoría Ingreso
                                </button>
                                <button id="open-income-modal-section-btn" class="px-2.5 py-1.5 rounded-xl bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/30 text-[#10E775] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors">
                                    <span class="material-symbols-outlined text-xs">add</span>
                                    + Nuevo Ingreso
                                </button>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            ${incomesByCategory.map(item => {
                                const cat = item.category;
                                const totalFormatted = formatMoney(item.total);
                                const isExpanded = expandedIncomeCategories.has(String(cat.id));
                                const catIncomes = item.items || [];
                                const allReceived = catIncomes.length > 0 && catIncomes.every(i => i.is_received !== false);
                                const isCustomIncomeCat = !['inc-cat-sueldo', 'inc-cat-growlabs', 'inc-cat-otros'].includes(String(cat.id));

                                return `
                                <div class="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden transition-all hover:border-white/[0.12]">
                                    <button class="toggle-inc-cat-accordion-btn w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors" data-catid="${cat.id}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="size-10 rounded-2xl flex items-center justify-center text-xl shrink-0" style="background-color: ${cat.color || '#10E775'}15; border: 1px solid ${cat.color || '#10E775'}30;">
                                                ${cat.icon || '💵'}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <h4 class="text-sm font-semibold text-white truncate">${cat.name}</h4>
                                                    ${allReceived ? `
                                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10E775]/15 border border-[#10E775]/30 text-[#10E775] flex items-center gap-1">
                                                            <span class="material-symbols-outlined text-[10px]">check</span>
                                                            Cobrado
                                                        </span>
                                                    ` : ''}
                                                </div>
                                                <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    ${catIncomes.length} ${catIncomes.length === 1 ? 'ingreso' : 'ingresos'} · ${item.percentOfIncome || 0}% del total de ingresos
                                                </p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 shrink-0">
                                            <div class="text-right">
                                                <span class="text-sm font-bold font-mono ${item.total > 0 ? 'text-[#10E775]' : 'text-slate-400'} block">
                                                    +${totalFormatted}
                                                </span>
                                            </div>
                                            ${isCustomIncomeCat ? `
                                                <span class="delete-income-cat-btn size-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors" data-id="${cat.id}" data-name="${cat.name}" title="Eliminar categoría de ingreso">
                                                    <span class="material-symbols-outlined text-sm">delete</span>
                                                </span>
                                            ` : ''}
                                            <span class="material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}">
                                                expand_more
                                            </span>
                                        </div>
                                    </button>

                                    <div class="${isExpanded ? 'block' : 'hidden'} px-4 pb-3 pt-1 border-t border-white/[0.04]">
                                        <div class="divide-y divide-white/[0.04]">
                                            ${catIncomes.length ? catIncomes.map(inc => {
                                                const isReceived = inc.is_received !== false;
                                                return `
                                                <div class="py-2.5 flex items-center justify-between text-xs gap-2">
                                                    <div class="flex items-center gap-2 min-w-0">
                                                        <span class="size-1.5 rounded-full shrink-0" style="background-color: ${cat.color || '#10E775'};"></span>
                                                        <span class="text-slate-200 font-medium truncate">${inc.name || inc.description}</span>
                                                        ${inc.is_recurring ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono shrink-0">Fijo</span>' : ''}
                                                    </div>
                                                    <div class="flex items-center gap-2.5 shrink-0">
                                                        <button class="toggle-income-received-btn flex items-center gap-1 px-2 py-0.5 rounded-lg ${isReceived ? 'bg-[#10E775]/15 border border-[#10E775]/30 text-[#10E775] hover:bg-[#10E775]/25' : 'bg-lime-500/15 border border-lime-500/30 text-lime-300 hover:bg-lime-500/25'} text-[10px] font-semibold transition-all cursor-pointer" data-id="${inc.id}" title="${isReceived ? 'Marcar como pendiente de cobro' : 'Marcar como cobrado'}">
                                                            <span class="material-symbols-outlined text-xs">${isReceived ? 'check_circle' : 'schedule'}</span>
                                                            ${isReceived ? 'Cobrado' : 'Pendiente'}
                                                        </button>
                                                        <span class="font-mono font-semibold text-[#10E775]">+${formatMoney(inc.amount)}</span>
                                                        <button class="delete-income-btn size-6 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${inc.id}" title="Eliminar ingreso">
                                                            <span class="material-symbols-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                `;
                                            }).join('') : `
                                                <p class="py-3 text-xs text-slate-500 italic text-center">No hay ingresos cargados en "${cat.name}" este mes.</p>
                                            `}
                                        </div>
                                        <div class="pt-2 mt-1 border-t border-white/[0.04] flex justify-end">
                                            <button type="button" class="quick-add-cat-income-btn px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#10E775]/15 border border-white/[0.08] hover:border-[#10E775]/30 text-slate-300 hover:text-[#10E775] text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer" data-catid="${cat.id}">
                                                <span class="material-symbols-outlined text-xs">add_circle</span>
                                                Agregar ingreso en ${cat.name}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Real October Categories Breakdown with Detailed Concepts Accordion -->
                    <div class="white-card p-5 md:p-6 border border-white/[0.07] shadow-xl">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                            <div>
                                <h3 class="text-base font-semibold text-white">Presupuesto por Categoría</h3>
                                <p class="text-xs text-slate-400 mt-0.5">Toca una categoría para ver los conceptos o agregar un gasto</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-mono font-medium text-slate-400">
                                    ${summary.byCategory.length} grupos
                                </span>
                                <button id="open-new-cat-header-btn" class="px-2.5 py-1 rounded-xl bg-[#10E775]/10 hover:bg-[#10E775]/20 border border-[#10E775]/25 text-[#10E775] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors">
                                    <span class="material-symbols-outlined text-xs">add</span>
                                    Crear Categoría
                                </button>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            ${summary.byCategory.map(item => {
                                const cat = item.category;
                                const spentFormatted = formatMoney(item.spent);
                                const isExpanded = expandedCategories.has(String(cat.id));
                                const catExpenses = (state.expenses || []).filter(e => {
                                    if (!e.date?.startsWith(currentMonth)) return false;
                                    const rawId = e.category_id !== undefined && e.category_id !== null ? String(e.category_id) : '';
                                    const rawName = (e.category_name || '').trim().toLowerCase();
                                    if (rawId && (String(cat.id) === rawId || String(cat.db_id) === rawId || String(cat.slug) === rawId)) return true;
                                    if (rawName && cat.name?.trim().toLowerCase() === rawName) return true;
                                    if (rawName && (rawName.includes('obetide') || rawName.includes('salud')) && String(cat.id) === 'salud-obetide') return true;
                                    return false;
                                });
                                const allCatPaid = catExpenses.length > 0 && catExpenses.every(e => e.is_paid !== false);

                                return `
                                <div class="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden transition-all hover:border-white/[0.12]">
                                    <!-- Category Header (Click to expand) -->
                                    <button class="toggle-cat-accordion-btn w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors" data-catid="${cat.id}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="size-10 rounded-2xl flex items-center justify-center text-xl shrink-0" style="background-color: ${cat.color || '#10E775'}15; border: 1px solid ${cat.color || '#10E775'}30;">
                                                ${cat.icon || '🏷️'}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <h4 class="text-sm font-semibold text-white truncate">${cat.name}</h4>
                                                    ${allCatPaid ? `
                                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10E775]/15 border border-[#10E775]/30 text-[#10E775] flex items-center gap-1">
                                                            <span class="material-symbols-outlined text-[10px]">check</span>
                                                            Abonado
                                                        </span>
                                                    ` : ''}
                                                </div>
                                                <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    ${catExpenses.length} ${catExpenses.length === 1 ? 'concepto' : 'conceptos'} · ${catExpenses.filter(e => e.is_paid !== false).length}/${catExpenses.length} al día
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
                                            ${catExpenses.length ? catExpenses.map(exp => {
                                                const isPaid = exp.is_paid !== false;
                                                return `
                                                <div class="py-2.5 flex items-center justify-between text-xs gap-2">
                                                    <div class="flex items-center gap-2 min-w-0">
                                                        <span class="size-1.5 rounded-full shrink-0" style="background-color: ${cat.color || '#10E775'};"></span>
                                                        <span class="text-slate-200 font-medium truncate">${exp.name || exp.description}</span>
                                                        ${exp.is_recurring ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono shrink-0">Fijo</span>' : ''}
                                                    </div>
                                                    <div class="flex items-center gap-2.5 shrink-0">
                                                        <button class="toggle-expense-paid-btn flex items-center gap-1 px-2 py-0.5 rounded-lg ${isPaid ? 'bg-[#10E775]/15 border border-[#10E775]/30 text-[#10E775] hover:bg-[#10E775]/25' : 'bg-lime-500/15 border border-lime-500/30 text-lime-300 hover:bg-lime-500/25'} text-[10px] font-semibold transition-all cursor-pointer" data-id="${exp.id}" title="${isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}">
                                                            <span class="material-symbols-outlined text-xs">${isPaid ? 'check_circle' : 'schedule'}</span>
                                                            ${isPaid ? 'Pagado' : 'Pendiente'}
                                                        </button>
                                                        <span class="font-mono font-semibold text-slate-100">${formatMoney(exp.amount)}</span>
                                                        <button class="delete-expense-btn size-6 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${exp.id}" title="Eliminar registro">
                                                            <span class="material-symbols-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                `;
                                            }).join('') : `
                                                <p class="py-3 text-xs text-slate-500 italic text-center">No hay gastos cargados en esta categoría para este mes.</p>
                                            `}
                                        </div>
                                        <div class="pt-2 mt-1 border-t border-white/[0.04] flex justify-end">
                                            <button type="button" class="quick-add-cat-expense-btn px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#10E775]/15 border border-white/[0.08] hover:border-[#10E775]/30 text-slate-300 hover:text-[#10E775] text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer" data-catid="${cat.id}">
                                                <span class="material-symbols-outlined text-xs">add_circle</span>
                                                Agregar gasto en ${cat.name}
                                            </button>
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
                            ${(state.expenses || []).length ? (state.expenses || []).slice(0, 10).map(e => {
                                const isPaid = e.is_paid !== false;
                                return `
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

                                    <div class="flex items-center gap-2.5 shrink-0">
                                        <span class="px-2 py-0.5 rounded-md ${isPaid ? 'bg-[#10E775]/10 text-[#10E775] border border-[#10E775]/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'} text-[10px] font-mono">
                                            ${isPaid ? '✓ Pagado' : 'Pendiente'}
                                        </span>
                                        <span class="font-mono font-semibold text-xs text-slate-200">-${formatMoney(e.amount)}</span>
                                        <button class="delete-expense-btn size-6 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${e.id}">
                                            <span class="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('') : `
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

        <!-- New Income Modal -->
        <div id="income-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-white/[0.1] my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <div class="size-8 rounded-xl bg-[#10E775]/10 text-[#10E775] border border-[#10E775]/20 flex items-center justify-center">
                            <span class="material-symbols-outlined text-lg">payments</span>
                        </div>
                        <div>
                            <h3 class="text-sm font-semibold text-white">Registrar Ingreso</h3>
                            <p class="text-[11px] text-slate-400">Sueldo, Grow Labs u otros ingresos</p>
                        </div>
                    </div>
                    <button id="close-income-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form id="income-form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Monto del Ingreso ($)</label>
                        <div class="relative mt-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-base text-slate-400">$</span>
                            <input type="number" id="income-amount-input" placeholder="0" required step="any" class="w-full bg-black/40 border border-white/[0.1] rounded-2xl pl-8 pr-4 py-3 text-2xl font-mono font-bold text-white outline-none focus:border-[#10E775]">
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[11px] font-medium text-slate-400">Categoría de Ingreso</label>
                            <button type="button" id="open-new-inc-cat-from-income-btn" class="text-[11px] font-semibold text-[#10E775] hover:underline flex items-center gap-0.5 cursor-pointer">
                                <span class="material-symbols-outlined text-xs">add</span>
                                Nueva Categoría
                            </button>
                        </div>
                        <select id="income-category" class="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-[#10E775] cursor-pointer">
                            ${incomeCategories.map(c => `
                                <option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Concepto / Origen</label>
                        <input type="text" id="income-source-input" placeholder="ej. Sueldo Sanatorio Argentino, Proyecto Grow Labs..." required class="w-full mt-1 bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-[#10E775]">
                    </div>

                    <div class="grid grid-cols-3 gap-2.5">
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Fecha</label>
                            <input type="date" id="income-date" value="${getArgentinaDate()}" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:border-[#10E775]">
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Estado</label>
                            <select id="income-received-status" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:border-[#10E775] cursor-pointer">
                                <option value="received">✓ Cobrado</option>
                                <option value="pending">⏳ Pendiente</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Frecuencia</label>
                            <select id="income-recurring" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:border-[#10E775] cursor-pointer">
                                <option value="once">Del mes</option>
                                <option value="recurring">Fijo mensual</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="btn-emerald py-3 text-xs font-semibold rounded-xl mt-2 cursor-pointer shadow-md">
                        Guardar Ingreso
                    </button>
                </form>
            </div>
        </div>

        <!-- Create Income Category Modal -->
        <div id="new-income-category-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-sm relative animate-scale-up shadow-2xl border border-white/[0.1] my-6">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#10E775] text-lg">create_new_folder</span>
                        <h3 class="text-sm font-semibold text-white">Nueva Categoría de Ingreso</h3>
                    </div>
                    <button id="close-new-inc-cat-modal" class="size-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form id="new-income-category-form" class="flex flex-col gap-3.5">
                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Nombre de la Categoría</label>
                        <input type="text" id="new-inc-cat-name" placeholder="ej. Grow Labs, Honorarios, Inversiones..." required class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#10E775]">
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400 mb-1 block">Ícono / Emoji</label>
                        <div class="flex items-center gap-2 mb-2">
                            <div id="new-inc-cat-icon-preview" class="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                                🚀
                            </div>
                            <input type="text" id="new-inc-cat-icon" value="🚀" maxlength="4" class="w-16 bg-black/40 border border-white/[0.1] text-white text-center rounded-xl px-2 py-1.5 text-sm font-bold outline-none focus:border-[#10E775]">
                        </div>
                        <div class="grid grid-cols-6 gap-1 p-2 bg-black/30 border border-white/5 rounded-xl">
                            ${['🏦', '🚀', '💼', '💵', '📈', '🏥', '💻', '🤝', '🪙', '⚡', '🏆', '💎'].map(emoji => `
                                <button type="button" class="preset-inc-emoji-btn size-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm transition-transform active:scale-90 cursor-pointer" data-emoji="${emoji}">
                                    ${emoji}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400 mb-1 block">Color Identificador (Gama Verde)</label>
                        <input type="hidden" id="new-inc-cat-color" value="#10E775">
                        <div class="flex items-center gap-2">
                            ${['#10E775', '#10B981', '#34D399', '#2DD4BF', '#84CC16', '#059669'].map((color, idx) => `
                                <button type="button" class="preset-inc-color-btn size-7 rounded-full border-2 ${idx === 0 ? 'border-white scale-110' : 'border-transparent'} transition-transform cursor-pointer" style="background-color: ${color};" data-color="${color}"></button>
                            `).join('')}
                        </div>
                    </div>

                    <button type="submit" class="btn-emerald py-2.5 text-xs font-semibold rounded-xl mt-1 cursor-pointer shadow-md">
                        Guardar Categoría de Ingreso
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
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[11px] font-medium text-slate-400">Categoría</label>
                            <button type="button" id="open-new-cat-from-expense-btn" class="text-[11px] font-semibold text-[#10E775] hover:underline flex items-center gap-0.5 cursor-pointer">
                                <span class="material-symbols-outlined text-xs">add</span>
                                Nueva Categoría
                            </button>
                        </div>
                        <select id="expense-category" class="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-[#10E775] cursor-pointer">
                            ${categories.map(c => `
                                <option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Concepto / Comercio</label>
                        <input type="text" id="expense-description" placeholder="ej. Supermercado, Farmacia, Combustible" required class="w-full mt-1 bg-black/40 border border-white/[0.1] text-white rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-[#10E775]">
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

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Estado</label>
                            <select id="expense-paid-status" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#10E775] cursor-pointer">
                                <option value="paid">✓ Pagado</option>
                                <option value="pending">⏳ Pendiente</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-slate-400">Frecuencia</label>
                            <select id="expense-recurring" class="w-full mt-1 bg-black/40 border border-white/[0.1] text-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#10E775] cursor-pointer">
                                <option value="once">Gasto del mes</option>
                                <option value="recurring">Fijo mensual</option>
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
                        <label class="text-[11px] font-medium text-slate-400 mb-1 block">Color Identificador (Gama Verde)</label>
                        <input type="hidden" id="new-cat-color" value="#10E775">
                        <div class="flex items-center gap-2">
                            ${['#10E775', '#10B981', '#34D399', '#2DD4BF', '#84CC16', '#059669'].map((color, idx) => `
                                <button type="button" class="preset-color-btn size-7 rounded-full border-2 ${idx === 0 ? 'border-white scale-110' : 'border-transparent'} transition-transform cursor-pointer" style="background-color: ${color};" data-color="${color}"></button>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-slate-400">Presupuesto Mensual Estimado ($, opcional)</label>
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
    const openIncomeTopBtn = document.getElementById('open-income-modal-top-btn');
    const openIncomeSectionBtn = document.getElementById('open-income-modal-section-btn');
    const closeIncomeBtn = document.getElementById('close-income-modal');

    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');

    const openIncomeModal = () => {
        incomeModal?.classList.remove('hidden');
        setTimeout(() => document.getElementById('income-amount-input')?.focus(), 50);
    };

    openExpenseBtn?.addEventListener('click', () => {
        expenseModal?.classList.remove('hidden');
        setTimeout(() => document.getElementById('expense-amount')?.focus(), 50);
    });
    closeExpenseBtn?.addEventListener('click', () => expenseModal?.classList.add('hidden'));

    openCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.remove('hidden'));
    closeCategoriesBtn?.addEventListener('click', () => categoriesModal?.classList.add('hidden'));

    openIncomeBtn?.addEventListener('click', openIncomeModal);
    openIncomeTopBtn?.addEventListener('click', openIncomeModal);
    openIncomeSectionBtn?.addEventListener('click', openIncomeModal);
    closeIncomeBtn?.addEventListener('click', () => incomeModal?.classList.add('hidden'));

    // Quick Add Income in a specific income category
    document.querySelectorAll('.quick-add-cat-income-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const catId = btn.dataset.catid;
            const sel = document.getElementById('income-category');
            if (sel && catId) {
                sel.value = catId;
            }
            openIncomeModal();
        });
    });

    // Accordion Toggle for Income Category Detailed Concepts
    document.querySelectorAll('.toggle-inc-cat-accordion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = String(btn.dataset.catid);
            if (expandedIncomeCategories.has(catId)) {
                expandedIncomeCategories.delete(catId);
            } else {
                expandedIncomeCategories.add(catId);
            }
            window.router.navigate('wallet');
        });
    });

    // Quick Add Expense in a specific category
    document.querySelectorAll('.quick-add-cat-expense-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const catId = btn.dataset.catid;
            const sel = document.getElementById('expense-category');
            if (sel && catId) {
                sel.value = catId;
            }
            expenseModal?.classList.remove('hidden');
            setTimeout(() => document.getElementById('expense-amount')?.focus(), 50);
        });
    });

    // Accordion Toggle for Category Detailed Concepts
    document.querySelectorAll('.toggle-cat-accordion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = String(btn.dataset.catid);
            if (expandedCategories.has(catId)) {
                expandedCategories.delete(catId);
            } else {
                expandedCategories.add(catId);
            }
            window.router.navigate('wallet');
        });
    });

    // Handle Income Form Submit
    incomeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('income-amount-input').value);
        if (!amount || amount <= 0) {
            window.showAlert?.('Monto inválido', 'Ingresa un monto de ingreso mayor a 0.', 'error');
            return;
        }
        const sel = document.getElementById('income-category');
        const category_id = sel?.value || 'inc-cat-sueldo';
        const category_name = sel?.options[sel.selectedIndex]?.dataset.name || 'Sueldo';
        const description = document.getElementById('income-source-input').value.trim() || category_name;
        const date = document.getElementById('income-date')?.value || getArgentinaDate();
        const receivedStatus = document.getElementById('income-received-status')?.value || 'received';
        const recurringVal = document.getElementById('income-recurring')?.value || 'once';

        expandedIncomeCategories.add(String(category_id));

        await addIncome({
            name: description,
            description,
            amount,
            category_id,
            category_name,
            date,
            is_received: receivedStatus !== 'pending',
            is_recurring: recurringVal === 'recurring'
        });

        incomeModal?.classList.add('hidden');
        window.showAlert?.('¡Ingreso Registrado!', `Se agregó +$${amount.toLocaleString('es-AR')} en ${category_name}.`, 'success');
        window.router.navigate('wallet');
    });

    // Delete Income
    document.querySelectorAll('.delete-income-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = isNaN(Number(btn.dataset.id)) ? btn.dataset.id : Number(btn.dataset.id);
            window.showConfirm?.('¿Eliminar ingreso?', 'Se eliminará este registro de ingreso de tu billetera.', async () => {
                await deleteIncome(id);
                window.router.navigate('wallet');
            });
        });
    });

    // Toggle Received Status on individual income
    document.querySelectorAll('.toggle-income-received-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            toggleIncomeReceived(id);
            window.router.navigate('wallet');
        });
    });

    // New Income Category Modal Controls
    const newIncomeCategoryModal = document.getElementById('new-income-category-modal');
    const openNewIncomeCatBtn = document.getElementById('open-new-income-cat-btn');
    const openNewIncCatFromIncomeBtn = document.getElementById('open-new-inc-cat-from-income-btn');
    const closeNewIncCatBtn = document.getElementById('close-new-inc-cat-modal');
    const newIncomeCategoryForm = document.getElementById('new-income-category-form');

    const openNewIncomeCategoryModal = () => {
        newIncomeCategoryModal?.classList.remove('hidden');
        setTimeout(() => document.getElementById('new-inc-cat-name')?.focus(), 50);
    };

    openNewIncomeCatBtn?.addEventListener('click', openNewIncomeCategoryModal);
    openNewIncCatFromIncomeBtn?.addEventListener('click', openNewIncomeCategoryModal);
    closeNewIncCatBtn?.addEventListener('click', () => newIncomeCategoryModal?.classList.add('hidden'));

    // Preset Income Emojis
    document.querySelectorAll('.preset-inc-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            const iconInput = document.getElementById('new-inc-cat-icon');
            const iconPreview = document.getElementById('new-inc-cat-icon-preview');
            if (iconInput) iconInput.value = emoji;
            if (iconPreview) iconPreview.textContent = emoji;
        });
    });

    // Preset Income Colors
    document.querySelectorAll('.preset-inc-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            const colorInput = document.getElementById('new-inc-cat-color');
            if (colorInput) colorInput.value = color;
            document.querySelectorAll('.preset-inc-color-btn').forEach(b => {
                b.classList.remove('border-white', 'scale-110');
                b.classList.add('border-transparent');
            });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-white', 'scale-110');
        });
    });

    // New Income Category Submit
    newIncomeCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-inc-cat-name').value.trim();
        const icon = document.getElementById('new-inc-cat-icon').value.trim() || '💵';
        const color = document.getElementById('new-inc-cat-color')?.value || '#10E775';

        if (!name) return;

        const createdCat = await saveIncomeCategory({
            name,
            icon,
            color
        });

        if (createdCat?.id) {
            expandedIncomeCategories.add(String(createdCat.id));
        }

        newIncomeCategoryModal?.classList.add('hidden');
        newIncomeCategoryForm.reset();

        const isIncomeModalOpen = incomeModal && !incomeModal.classList.contains('hidden');
        if (isIncomeModalOpen && createdCat) {
            const sel = document.getElementById('income-category');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = createdCat.id;
                opt.dataset.name = createdCat.name;
                opt.textContent = `${createdCat.icon} ${createdCat.name}`;
                sel.appendChild(opt);
                sel.value = createdCat.id;
            }
            window.showAlert?.('¡Categoría de Ingreso Creada!', `Se seleccionó "${name}" para tu ingreso.`, 'success');
        } else {
            window.showAlert?.('¡Categoría de Ingreso Creada!', `Se agregó "${name}" a tus fuentes de ingreso.`, 'success');
            window.router.navigate('wallet');
        }
    });

    // Delete Income Category
    document.querySelectorAll('.delete-income-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = isNaN(Number(btn.dataset.id)) ? btn.dataset.id : Number(btn.dataset.id);
            const name = btn.dataset.name || 'esta categoría';
            window.showConfirm?.(
                '¿Eliminar categoría de ingreso?',
                `¿Deseas eliminar "${name}"?`,
                async () => {
                    await deleteIncomeCategory(id);
                    window.showAlert?.('Categoría Eliminada', `Se eliminó "${name}".`, 'info');
                    window.router.navigate('wallet');
                }
            );
        });
    });

    // Handle Add Expense Submit
    expenseForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('expense-amount').value);
        if (!amount || amount <= 0) {
            window.showAlert?.('Monto inválido', 'Ingresa un monto mayor a 0.', 'error');
            return;
        }
        const sel = document.getElementById('expense-category');
        const rawVal = sel?.value;
        const category_id = rawVal || 'operativos-vida';
        const category_name = sel?.options[sel.selectedIndex]?.dataset.name || 'General';
        const description = document.getElementById('expense-description').value.trim() || category_name;
        const date = document.getElementById('expense-date').value || getArgentinaDate();
        const payment_method = document.getElementById('expense-payment-method').value;
        const paidStatus = document.getElementById('expense-paid-status')?.value || 'paid';
        const recurringVal = document.getElementById('expense-recurring')?.value || 'once';

        expandedCategories.add(String(category_id));

        await addExpense({
            name: description,
            amount,
            category_id,
            category_name,
            description,
            date,
            payment_method,
            is_paid: paidStatus !== 'pending',
            is_recurring: recurringVal === 'recurring'
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

    // Toggle Paid Status on individual concept
    document.querySelectorAll('.toggle-expense-paid-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            toggleExpensePaid(id);
            window.router.navigate('wallet');
        });
    });

    // Mark All Expenses as Paid for Current Month
    const markAllBtn = document.getElementById('mark-all-paid-btn');
    markAllBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentMonth = getArgentinaDate().substring(0, 7);
        setAllExpensesPaid(currentMonth, true);
        window.showAlert?.('¡Mes 100% al día!', 'Todos los gastos de Octubre han sido marcados como abonados y cumplidos.', 'success');
        window.router.navigate('wallet');
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
    const openNewCatDirectBtn = document.getElementById('open-new-cat-direct-btn');
    const openNewCatHeaderBtn = document.getElementById('open-new-cat-header-btn');
    const openNewCatFromExpenseBtn = document.getElementById('open-new-cat-from-expense-btn');
    const closeNewCatBtn = document.getElementById('close-new-cat-modal');
    const newCategoryForm = document.getElementById('new-category-form');

    const openNewCategoryModal = () => {
        newCategoryModal?.classList.remove('hidden');
        setTimeout(() => document.getElementById('new-cat-name')?.focus(), 50);
    };

    openNewCatBtn?.addEventListener('click', openNewCategoryModal);
    openNewCatDirectBtn?.addEventListener('click', openNewCategoryModal);
    openNewCatHeaderBtn?.addEventListener('click', openNewCategoryModal);
    openNewCatFromExpenseBtn?.addEventListener('click', openNewCategoryModal);

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

    // Preset Colors
    document.querySelectorAll('.preset-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            const colorInput = document.getElementById('new-cat-color');
            if (colorInput) colorInput.value = color;
            document.querySelectorAll('.preset-color-btn').forEach(b => {
                b.classList.remove('border-white', 'scale-110');
                b.classList.add('border-transparent');
            });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-white', 'scale-110');
        });
    });

    // New Category Submit
    newCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-cat-name').value.trim();
        const icon = document.getElementById('new-cat-icon').value.trim() || '🏷️';
        const color = document.getElementById('new-cat-color')?.value || '#10E775';
        const monthly_budget = Number(document.getElementById('new-cat-budget').value) || 0;

        if (!name) return;

        const createdCat = await saveExpenseCategory({
            name,
            icon,
            color,
            monthly_budget
        });

        if (createdCat?.id) {
            expandedCategories.add(String(createdCat.id));
        }

        newCategoryModal?.classList.add('hidden');
        newCategoryForm.reset();

        const isExpenseModalOpen = expenseModal && !expenseModal.classList.contains('hidden');
        if (isExpenseModalOpen && createdCat) {
            const sel = document.getElementById('expense-category');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = createdCat.id;
                opt.dataset.name = createdCat.name;
                opt.textContent = `${createdCat.icon} ${createdCat.name}`;
                sel.appendChild(opt);
                sel.value = createdCat.id;
            }
            window.showAlert?.('¡Categoría Creada!', `Se seleccionó "${name}" para tu gasto.`, 'success');
        } else {
            window.showAlert?.('¡Categoría Creada!', `Se agregó "${name}" a tu billetera.`, 'success');
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
    const greenChartPalette = ['#10E775', '#34D399', '#84CC16', '#2DD4BF', '#10B981', '#059669'];
    const colors = categoriesWithSpend.length
        ? categoriesWithSpend.map((c, idx) => greenChartPalette[idx % greenChartPalette.length])
        : ['rgba(16, 231, 117, 0.15)'];

    walletChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#050C09',
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
