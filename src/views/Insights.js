import { getState, calculateAdaptiveTDEE, getFinancialSummary, getArgentinaDate, getLatestMeasurement, getSensationsMetrics } from '../state';
import { generateWeeklyReport } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let caloricChartInstance = null;
let healthFinanceChartInstance = null;
let sensationsChartInstance = null;

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
    const sensationsMetrics = getSensationsMetrics();

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('insights')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Métricas & Estadísticas')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Executive Summary Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <!-- Obetide Dose -->
                        <div class="white-card p-4 border border-slate-700/60 border-l-4 border-l-blue-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Dosis Dutide / Obetide</span>
                            <p class="text-xl font-mono font-black text-blue-400 mt-0.5">
                                ${latestObetide ? `${latestObetide.dose_ml} ml` : '0.25 ml'}
                            </p>
                            <span class="text-[10px] text-slate-400">${(state.obetideTreatments || []).length} aplicaciones</span>
                        </div>

                        <!-- Weight Loss -->
                        <div class="white-card p-4 border border-slate-700/60 border-l-4 border-l-emerald-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Descenso Total</span>
                            <p class="text-xl font-mono font-black text-emerald-400 mt-0.5">
                                -${Math.max(0, weightLoss)} kg
                            </p>
                            <span class="text-[10px] text-slate-400">Faltan ${weightRemaining} kg a meta</span>
                        </div>

                        <!-- Satiety Score -->
                        <div class="white-card p-4 border border-slate-700/60 border-l-4 border-l-[#10E775]">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Saciedad Post-Comida</span>
                            <p class="text-xl font-mono font-black text-[#10E775] mt-0.5">
                                ${sensationsMetrics.avgScore ? `${sensationsMetrics.avgScore} <span class="text-xs font-normal text-slate-400">/ 5.0</span>` : 'Sin datos'}
                            </p>
                            <span class="text-[10px] ${sensationsMetrics.statusColor} font-medium">${sensationsMetrics.statusLabel}</span>
                        </div>

                        <!-- TDEE Deficit -->
                        <div class="white-card p-4 border border-slate-700/60 border-l-4 border-l-amber-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Déficit Diario</span>
                            <p class="text-xl font-mono font-black text-amber-400 mt-0.5">
                                ${tdeeData.recommendedDeficit} <span class="text-xs font-normal">kcal</span>
                            </p>
                            <span class="text-[10px] text-slate-400">TDEE: ${tdeeData.maintenance} kcal</span>
                        </div>
                    </div>

                        <!-- Financial Health Ratio -->
                        <div class="white-card p-4 border border-slate-700/60 border-l-4 border-l-purple-500">
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Gasto Mensual</span>
                            <p class="text-xl font-mono font-black text-purple-400 mt-0.5 truncate">
                                $${finSummary.totalSpent.toLocaleString('es-AR')}
                            </p>
                            <span class="text-[10px] text-slate-400">${finSummary.byCategory.length} categorías</span>
                        </div>
                    </div>

                    <!-- AI Executive Performance Report Button & Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/30 shadow-2xl">
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
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-1">Nutrición Diaria</span>
                                <h3 class="text-base font-display font-black text-white uppercase">Ingesta Calórica (Últimos 7 Días)</h3>
                            </div>
                            <span class="text-xs text-slate-400 font-mono font-bold">kcal / día</span>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="caloricTrendChart"></canvas>
                        </div>
                    </div>

                    <!-- Financial & Treatment Analytics -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-1">Mi Billetera</span>
                                <h3 class="text-base font-display font-black text-white uppercase">Presupuesto vs Consumo Real (${currentMonth})</h3>
                            </div>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="healthFinanceChart"></canvas>
                        </div>
                    </div>

                    <!-- Comprehensive Sensations & Satiety Metrics Section -->
                    <div class="white-card p-6 border border-slate-700/80 shadow-2xl bg-gradient-to-b from-[#1E293B] to-[#131D2E]">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
                            <div class="flex items-center gap-3">
                                <div class="size-12 rounded-2xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/30 flex items-center justify-center text-2xl shadow-xs">
                                    🧠
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-lg font-display font-black text-white uppercase tracking-tight">Métricas Clínicas de Sensaciones & Saciedad</h3>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sensationsMetrics.statusBg} ${sensationsMetrics.statusColor}">
                                            ${sensationsMetrics.statusLabel}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-400 mt-0.5">
                                        ${sensationsMetrics.statusDesc}
                                    </p>
                                </div>
                            </div>
                            <span class="text-xs font-mono font-bold text-slate-400">
                                ${sensationsMetrics.ratedMealsCount} comidas evaluadas
                            </span>
                        </div>

                        <!-- 2 Columns: Doughnut Chart & Top Tags -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
                            <!-- Doughnut Chart -->
                            <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
                                <span class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Distribución de Plenitud</span>
                                <div class="h-56 w-full relative flex items-center justify-center">
                                    <canvas id="sensationsDistributionChart"></canvas>
                                </div>
                            </div>

                            <!-- Sensations Frequency & Dutide Impact -->
                            <div class="flex flex-col gap-3">
                                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                                    <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Sensaciones & Síntomas Frecuentes</span>
                                    ${sensationsMetrics.topSensations.length ? `
                                        <div class="flex flex-wrap gap-2">
                                            ${sensationsMetrics.topSensations.map(s => `
                                                <div class="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center gap-2 text-xs font-medium text-slate-200">
                                                    <span>${s.tag}</span>
                                                    <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10E775]/20 text-[#10E775]">${s.count} (${s.pct}%)</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : `
                                        <p class="text-xs text-slate-500 italic py-2">Sin sensaciones registradas aún.</p>
                                    `}
                                </div>

                                <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 flex items-start gap-3">
                                    <span class="material-symbols-outlined text-emerald-400 text-xl mt-0.5">verified</span>
                                    <div>
                                        <h5 class="text-xs font-bold text-emerald-300 uppercase tracking-wider">Efecto Terapéutico Dutide (GLP-1)</h5>
                                        <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                                            El retraso en el vaciamiento gástrico promueve saciedad temprana. El objetivo clínico es alcanzar nivel <strong>3 ("En su punto")</strong> sin experimentar pesadez ni náuseas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Chronological Log of Opinions & Reflections -->
                        <div class="pt-4 border-t border-slate-700/60">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="text-sm font-bold uppercase tracking-wider text-slate-300">
                                    Historial de Opiniones y Sensaciones Post-Comida
                                </h4>
                                <span class="text-xs text-slate-400 font-mono">${sensationsMetrics.recentOpinions.length} registros</span>
                            </div>

                            <div class="flex flex-col gap-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                ${sensationsMetrics.recentOpinions.length ? sensationsMetrics.recentOpinions.map(m => `
                                    <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2">
                                                <h5 class="text-xs font-bold text-white capitalize">${m.name}</h5>
                                                <span class="text-[10px] font-mono text-slate-400">${m.date} · ${m.time || m.category || ''}</span>
                                            </div>
                                            ${m.opinion ? `
                                                <p class="text-xs text-slate-300 italic border-l-2 border-[#10E775]/60 pl-2 mt-1">
                                                    “${m.opinion}”
                                                </p>
                                            ` : ''}
                                            ${(m.sensations && m.sensations.length) ? `
                                                <div class="flex flex-wrap gap-1 mt-1.5">
                                                    ${m.sensations.map(s => `<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">${s}</span>`).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div>
                                            ${m.satiety_score ? `
                                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    m.satiety_score === 3 ? 'bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/40' :
                                                    m.satiety_score >= 4 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                                    'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                                }">
                                                    ${m.satiety_score === 1 ? '🥣 Hambre' : m.satiety_score === 2 ? '🥗 Ligero' : m.satiety_score === 3 ? '⚖️ En su punto' : m.satiety_score === 4 ? '🍕 Muy lleno' : '🫄 Pesado'} (${m.satiety_score}/5)
                                                </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('') : `
                                    <p class="text-xs text-slate-500 italic py-4 text-center">Aún no has registrado opiniones en tus comidas.</p>
                                `}
                            </div>
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
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8' }
                    }
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
                        backgroundColor: '#475569',
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
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 10, color: '#f1f5f9', font: { size: 11, weight: 'bold' } }
                    }
                }
            }
        });
    }

    // 2.5 Sensations & Satiety Distribution Chart
    const sensationsMetrics = getSensationsMetrics();
    const sensationsCanvas = document.getElementById('sensationsDistributionChart');
    if (sensationsCanvas) {
        if (sensationsChartInstance) sensationsChartInstance.destroy();
        sensationsChartInstance = new Chart(sensationsCanvas, {
            type: 'doughnut',
            data: {
                labels: ['🥣 Con Hambre', '🥗 Ligero', '⚖️ En su Punto', '🍕 Muy Lleno', '🫄 Pesado'],
                datasets: [{
                    data: [
                        sensationsMetrics.counts.hungry || 0,
                        sensationsMetrics.counts.light || 0,
                        sensationsMetrics.counts.optimal || 0,
                        sensationsMetrics.counts.full || 0,
                        sensationsMetrics.counts.heavy || 0
                    ],
                    backgroundColor: [
                        '#0A84FF',
                        '#06B6D4',
                        '#10E775',
                        '#FF9F0A',
                        '#FF453A'
                    ],
                    borderWidth: 2,
                    borderColor: '#0F172A'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 8,
                            color: '#94a3b8',
                            font: { size: 10, weight: 'bold' },
                            padding: 10
                        }
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
