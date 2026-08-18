import { getState, calculateAdaptiveTDEE } from '../state';
import { generateWeeklyReport } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderInsights = () => {
    const state = getState();
    const tdeeData = calculateAdaptiveTDEE(state);

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('insights')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Estadísticas & TDEE')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-white via-emerald-50/40 to-white border-emerald-200">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="badge-emerald mb-1">Algoritmo Adaptativo</span>
                                <h2 class="text-3xl font-display font-black text-text-emerald uppercase tracking-tight">Gasto Metabólico (TDEE)</h2>
                                <p class="text-xs text-text-muted mt-0.5">Cálculo dinámico basado en ingesta real y variación de peso.</p>
                            </div>
                            <button id="generate-ai-report-btn" class="btn-emerald px-4 py-2.5 text-xs font-bold shadow-emerald-sm">
                                <span class="material-symbols-outlined text-base">auto_awesome</span> Generar Reporte IA
                            </button>
                        </div>

                        <!-- 3 TDEE Recommendations Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                            <div class="p-4 bg-white rounded-2xl border border-emerald-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-emerald-700">Déficit Sugerido</span>
                                <p class="text-2xl font-display font-black text-text-emerald">${tdeeData.recommendedDeficit} <span class="text-xs font-normal text-text-muted">kcal</span></p>
                                <span class="text-[10px] text-text-muted font-medium">-0.5 kg / semana</span>
                            </div>
                            <div class="p-4 bg-white rounded-2xl border border-blue-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-blue-700">TDEE Mantenimiento</span>
                                <p class="text-2xl font-display font-black text-blue-600">${tdeeData.maintenance} <span class="text-xs font-normal text-text-muted">kcal</span></p>
                                <span class="text-[10px] text-text-muted font-medium">Gasto Real Diario</span>
                            </div>
                            <div class="p-4 bg-white rounded-2xl border border-amber-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-amber-700">Superávit (Volumen)</span>
                                <p class="text-2xl font-display font-black text-amber-600">${tdeeData.recommendedSurplus} <span class="text-xs font-normal text-text-muted">kcal</span></p>
                                <span class="text-[10px] text-text-muted font-medium">+0.25 kg / semana</span>
                            </div>
                        </div>
                    </div>

                    <!-- Caloric Trend Chart Card -->
                    <div class="white-card p-6">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <h3 class="text-lg font-display font-black text-text-emerald uppercase">Tendencia Calórica (Últimos 7 Días)</h3>
                                <p class="text-xs text-text-muted">Calorías consumidas por jornada</p>
                            </div>
                        </div>
                        <div class="h-60 w-full relative">
                            <canvas id="caloricTrendChart" class="w-full h-full"></canvas>
                        </div>
                    </div>

                    <!-- AI Performance Report Container -->
                    <div id="ai-report-container" class="white-card p-6 border-emerald-200 hidden">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-symbols-outlined text-primary text-xl">psychology</span>
                            <h3 class="text-lg font-display font-black text-text-emerald uppercase">Análisis Neural Semanal</h3>
                        </div>
                        <div id="ai-report-content" class="text-xs text-text-primary leading-relaxed space-y-3 font-medium"></div>
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

    // Render 7-day intake chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayMeals = (state.dailyLog || []).filter(m => m.date === dStr);
        const sum = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
        last7Days.push({
            date: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase(),
            calories: sum
        });
    }

    const ctx = document.getElementById('caloricTrendChart')?.getContext('2d');
    if (ctx && window.Chart) {
        new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d.date),
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
                    y: { grid: { color: '#F1F5F9' } }
                }
            }
        });
    }

    // AI Report Button
    document.getElementById('generate-ai-report-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('generate-ai-report-btn');
        const cont = document.getElementById('ai-report-container');
        const content = document.getElementById('ai-report-content');

        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Analizando...`;

        try {
            const report = await generateWeeklyReport(state);
            cont.classList.remove('hidden');
            content.innerHTML = `
                <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-3">
                    <p class="text-sm font-bold text-text-emerald">"${report.summary}"</p>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div class="p-3 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Puntaje de Consistencia</span>
                        <p class="text-xl font-display font-black text-text-emerald">${report.kpis?.consistency_score || 8}/10</p>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Entrenamientos</span>
                        <p class="text-xl font-display font-black text-text-emerald">${report.kpis?.total_workouts || 0}</p>
                    </div>
                </div>
                <p><strong>Misión para la semana:</strong> ${report.mission || 'Mantener déficit constante e hidratación.'}</p>
            `;
        } catch (e) {
            window.showAlert?.('Error', 'No se pudo generar el reporte de IA.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span> Generar Reporte IA`;
        }
    });
};
