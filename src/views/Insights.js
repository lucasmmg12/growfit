import { getState, calculateAdaptiveTDEE, getFinancialSummary, getArgentinaDate, getLatestMeasurement } from '../state';
import { generateWeeklyReport } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let caloricChartInstance = null;
let healthFinanceChartInstance = null;

export const renderInsights = () => {
    const state = getState();
    const tdeeData = calculateAdaptiveTDEE(state);
    const today = getArgentinaDate();
    const currentMonth = today.substring(0, 7);
    const finSummary = getFinancialSummary(currentMonth);

    const latestObetide = state.obetideTreatments?.[0] || null;
    const latestWeight = getLatestMeasurement()?.weight || state.profile.startingWeight || 75;
    const startingWeight = state.profile.startingWeight || 75;
    const targetWeight = state.profile.targetWeight || 70;
    const weightLoss = (startingWeight - latestWeight).toFixed(1);
    const weightRemaining = Math.max(0, latestWeight - targetWeight).toFixed(1);

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('insights')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Métricas & Estadísticas')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Executive Summary Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <!-- Obetide Dose -->
                        <div class="white-card p-4 border-l-4 border-l-blue-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Dosis Obetide</span>
                            <p class="text-xl font-mono font-black text-blue-600 mt-0.5">
                                ${latestObetide ? `${latestObetide.dose_ml} ml` : '0.25 ml'}
                            </p>
                            <span class="text-[10px] text-slate-500">${(state.obetideTreatments || []).length} aplicaciones</span>
                        </div>

                        <!-- Weight Loss -->
                        <div class="white-card p-4 border-l-4 border-l-emerald-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Descenso Total</span>
                            <p class="text-xl font-mono font-black text-emerald-600 mt-0.5">
                                -${Math.max(0, weightLoss)} kg
                            </p>
                            <span class="text-[10px] text-slate-500">Faltan ${weightRemaining} kg a meta</span>
                        </div>

                        <!-- TDEE Deficit -->
                        <div class="white-card p-4 border-l-4 border-l-amber-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Déficit Diario</span>
                            <p class="text-xl font-mono font-black text-amber-600 mt-0.5">
                                ${tdeeData.recommendedDeficit} <span class="text-xs font-normal">kcal</span>
                            </p>
                            <span class="text-[10px] text-slate-500">TDEE: ${tdeeData.maintenance} kcal</span>
                        </div>

                        <!-- Financial Health Ratio -->
                        <div class="white-card p-4 border-l-4 border-l-purple-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Gasto Mensual</span>
                            <p class="text-xl font-mono font-black text-purple-600 mt-0.5 truncate">
                                $${finSummary.totalSpent.toLocaleString('es-AR')}
                            </p>
                            <span class="text-[10px] text-slate-500">${finSummary.byCategory.length} categorías</span>
                        </div>
                    </div>

                    <!-- AI Executive Performance Report Button & Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-emerald-900 to-teal-950 text-white border-0 shadow-emerald-lg">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-2">
                                    <span class="material-symbols-outlined text-sm">psychology</span>
                                    Analítica Integral con Inteligencia Artificial
                                </span>
                                <h3 class="text-2xl font-display font-black uppercase text-white">Auditoría Semanal de Salud & Hábitos</h3>
                                <p class="text-xs text-emerald-200 mt-1 max-w-lg">
                                    Analiza la correlación entre tu adherencia nutricional, el tratamiento con Obetide y tu rendimiento general.
                                </p>
                            </div>
                            <button id="generate-ai-report-btn" class="btn-emerald py-3.5 px-6 text-xs font-display font-black uppercase tracking-wide shadow-emerald-sm active:scale-95 transition-transform">
                                <span class="material-symbols-outlined text-lg">auto_awesome</span>
                                Generar Reporte IA
                            </button>
                        </div>

                        <!-- AI Report Results Container -->
                        <div id="ai-report-container" class="hidden mt-5 pt-4 border-t border-white/10 text-slate-100 text-xs leading-relaxed space-y-3">
                            <div id="ai-report-content"></div>
                        </div>
                    </div>

                    <!-- Caloric Intake Chart Card -->
                    <div class="white-card p-6">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <span class="badge-emerald mb-1">Nutrición Diaria</span>
                                <h3 class="text-base font-display font-black text-text-primary uppercase">Ingesta Calórica (Últimos 7 Días)</h3>
                            </div>
                            <span class="text-xs text-text-muted font-mono font-bold">kcal / día</span>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="caloricTrendChart"></canvas>
                        </div>
                    </div>

                    <!-- Financial & Treatment Analytics -->
                    <div class="white-card p-6">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <span class="badge-emerald mb-1">Mi Billetera</span>
                                <h3 class="text-base font-display font-black text-text-primary uppercase">Presupuesto vs Consumo Real (${currentMonth})</h3>
                            </div>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="healthFinanceChart"></canvas>
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('insights')}
        </main>
    </div>
    `;
};

export const attachInsightsEvents = () => {
    const state = getState();

    // 1. Caloric trend chart (Last 7 Days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayMeals = (state.dailyLog || []).filter(m => m.date === dStr);
        const sum = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
        last7Days.push({
            label: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase(),
            calories: sum
        });
    }

    const caloricCanvas = document.getElementById('caloricTrendChart');
    if (caloricCanvas) {
        if (caloricChartInstance) caloricChartInstance.destroy();
        caloricChartInstance = new Chart(caloricCanvas, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d.label),
                datasets: [{
                    label: 'Calorías Ingeridas',
                    data: last7Days.map(d => d.calories),
                    backgroundColor: '#10B981',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' } }
                }
            }
        });
    }

    // 2. Financial Chart: Budgets vs Spend
    const finCanvas = document.getElementById('healthFinanceChart');
    if (finCanvas) {
        if (healthFinanceChartInstance) healthFinanceChartInstance.destroy();
        const currentMonth = getArgentinaDate().substring(0, 7);
        const finSummary = getFinancialSummary(currentMonth);

        const labels = finSummary.byCategory.map(c => c.category.name);
        const budgets = finSummary.byCategory.map(c => c.budget);
        const spents = finSummary.byCategory.map(c => c.spent);

        healthFinanceChartInstance = new Chart(finCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Presupuesto Asignado',
                        data: budgets,
                        backgroundColor: '#94a3b8',
                        borderRadius: 6
                    },
                    {
                        label: 'Gasto Real',
                        data: spents,
                        backgroundColor: '#3b82f6',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.04)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 10, font: { size: 11, weight: 'bold' } }
                    }
                }
            }
        });
    }

    // 3. AI Report Generation
    document.getElementById('generate-ai-report-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('generate-ai-report-btn');
        const cont = document.getElementById('ai-report-container');
        const content = document.getElementById('ai-report-content');

        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Analizando con GPT-4o...`;

        try {
            const report = await generateWeeklyReport(state);
            cont.classList.remove('hidden');
            content.innerHTML = `
                <div class="p-4 bg-emerald-800/40 rounded-2xl border border-emerald-500/30 mb-3">
                    <p class="text-sm font-bold text-emerald-200">"${report.summary}"</p>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div class="p-3 bg-white/10 rounded-xl">
                        <span class="text-[10px] font-bold text-emerald-300 uppercase">Consistencia</span>
                        <p class="text-xl font-display font-black text-white">${report.kpis?.consistency_score || 8}/10</p>
                    </div>
                    <div class="p-3 bg-white/10 rounded-xl">
                        <span class="text-[10px] font-bold text-emerald-300 uppercase">Sesiones Registradas</span>
                        <p class="text-xl font-display font-black text-white">${report.kpis?.total_workouts || 0}</p>
                    </div>
                </div>
                <p><strong class="text-emerald-300">Misión Estratégica:</strong> ${report.mission || 'Mantener déficit constante, asegurar 150g de proteína y seguir la titulación progresiva de Obetide.'}</p>
            `;
        } catch (e) {
            window.showAlert?.('Error', e.message || 'No se pudo generar el reporte de IA.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span> Generar Reporte IA`;
        }
    });
};
