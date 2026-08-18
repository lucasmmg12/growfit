import { getState, addMeasurement, getLatestMeasurement, getArgentinaDate } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderMeasurements = () => {
    const state = getState();
    const history = state.measurements ? [...state.measurements].reverse() : [];
    const latest = getLatestMeasurement();

    const currentWeight = latest ? latest.weight : (state.profile.startingWeight || 75);
    const bodyFat = latest ? latest.bodyFat : '--';
    const leanMass = latest ? latest.leanMass : '--';
    const fatMass = latest ? latest.fatMass : '--';

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('measurements')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Progreso Corporal')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-white via-emerald-50/40 to-white border-emerald-200">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="badge-emerald mb-1">Composición Corporal</span>
                                <h2 class="text-3xl font-display font-black text-text-emerald uppercase tracking-tight">Progreso & Biometría</h2>
                                <p class="text-xs text-text-muted mt-0.5">Seguimiento antropométrico con el método Navy Seal.</p>
                            </div>
                            <button id="open-measurement-form-btn" class="btn-emerald px-4 py-2.5 text-xs font-bold shadow-emerald-sm">
                                <span class="material-symbols-outlined text-base">add</span> Nueva Medición
                            </button>
                        </div>

                        <!-- 4 Stat Badges Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                            <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-text-muted">Peso Actual</span>
                                <p class="text-2xl font-display font-black text-text-emerald">${currentWeight} <span class="text-xs font-normal text-text-muted">kg</span></p>
                            </div>
                            <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-text-muted">% Grasa</span>
                                <p class="text-2xl font-display font-black text-text-emerald">${bodyFat} <span class="text-xs font-normal text-text-muted">%</span></p>
                            </div>
                            <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-text-muted">Masa Magra</span>
                                <p class="text-2xl font-display font-black text-blue-600">${leanMass} <span class="text-xs font-normal text-text-muted">kg</span></p>
                            </div>
                            <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-text-muted">Masa Grasa</span>
                                <p class="text-2xl font-display font-black text-amber-600">${fatMass} <span class="text-xs font-normal text-text-muted">kg</span></p>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Card -->
                    <div class="white-card p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-display font-black text-text-emerald uppercase">Evolución de Peso y Grasa</h3>
                            <span class="text-xs text-text-muted font-mono font-bold">${history.length} registros</span>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="measurementsChart" class="w-full h-full"></canvas>
                        </div>
                    </div>

                    <!-- History Table -->
                    <div class="white-card p-6">
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase mb-4 pb-2 border-b border-border-soft">
                            Historial Antropométrico
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                                        <th class="pb-2">Fecha</th>
                                        <th class="pb-2">Peso</th>
                                        <th class="pb-2">% Grasa</th>
                                        <th class="pb-2">Cintura</th>
                                        <th class="pb-2">Cuello</th>
                                        <th class="pb-2">Masa Magra</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium">
                                    ${history.length ? history.map(m => `
                                        <tr>
                                            <td class="py-3 font-bold text-text-primary">${m.date}</td>
                                            <td class="py-3 font-mono font-bold text-text-emerald">${m.weight} kg</td>
                                            <td class="py-3 font-mono font-bold">${m.bodyFat}%</td>
                                            <td class="py-3 font-mono text-slate-500">${m.waist || '--'} cm</td>
                                            <td class="py-3 font-mono text-slate-500">${m.neck || '--'} cm</td>
                                            <td class="py-3 font-mono text-blue-600 font-bold">${m.leanMass || '--'} kg</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="6" class="py-4 text-center text-text-muted italic">Sin mediciones registradas</td></tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('measurements')}
        </main>

        <!-- Measurement Form Modal -->
        <div id="measurement-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"></div>
    </div>
    `;
};

export const attachMeasurementsEvents = () => {
    const state = getState();
    const modal = document.getElementById('measurement-modal');

    // Render Chart
    const history = (state.measurements || []).slice(-10);
    const ctx = document.getElementById('measurementsChart')?.getContext('2d');
    if (ctx && history.length > 0 && window.Chart) {
        new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(m => m.date),
                datasets: [
                    {
                        label: 'Peso (kg)',
                        data: history.map(m => m.weight),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '% Grasa',
                        data: history.map(m => m.bodyFat),
                        borderColor: '#F59E0B',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: '#F1F5F9' } }
                }
            }
        });
    }

    document.getElementById('open-measurement-form-btn')?.addEventListener('click', () => {
        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-emerald-md">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                    <span class="badge-emerald">Método Navy Seal</span>
                    <button id="close-meas-modal" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Peso (kg)</label>
                            <input id="input-weight" type="number" step="0.1" placeholder="75.5" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-text-emerald outline-none focus:border-primary mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Fecha</label>
                            <input id="input-date" type="date" value="${getArgentinaDate()}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary mt-1">
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="text-[10px] font-bold text-text-muted uppercase">Cintura (cm)</label>
                            <input id="input-waist" type="number" placeholder="85" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-text-muted uppercase">Cuello (cm)</label>
                            <input id="input-neck" type="number" placeholder="38" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-text-muted uppercase">Cadera (cm)</label>
                            <input id="input-hip" type="number" placeholder="95" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary mt-1">
                        </div>
                    </div>

                    <button id="save-meas-btn" class="btn-emerald py-3 text-xs font-bold mt-3 shadow-emerald-sm">
                        Calcular y Guardar Medición
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('close-meas-modal').onclick = () => modal.classList.add('hidden');

        document.getElementById('save-meas-btn').onclick = async () => {
            const weight = parseFloat(document.getElementById('input-weight').value);
            const date = document.getElementById('input-date').value;
            const waist = parseFloat(document.getElementById('input-waist').value) || 80;
            const neck = parseFloat(document.getElementById('input-neck').value) || 38;
            const hip = parseFloat(document.getElementById('input-hip').value) || 90;

            if (!weight || weight <= 0) {
                alert('Ingresa un peso válido.');
                return;
            }

            await addMeasurement({ weight, date, waist, neck, hip });
            modal.classList.add('hidden');
            window.router.navigate('measurements');
        };
    });
};
