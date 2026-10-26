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
    <div class="flex h-screen w-full bg-[#0F172A] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('measurements')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0F172A]">
            ${renderMobileHeader('Progreso Corporal')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Card -->
                    <div class="white-card p-6 border border-emerald-500/30 shadow-2xl">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-1">Composición Corporal</span>
                                <h2 class="text-3xl font-display font-black text-white uppercase tracking-tight">Progreso & Biometría</h2>
                                <p class="text-xs text-slate-400 mt-0.5">Seguimiento antropométrico con el método Navy Seal.</p>
                            </div>
                            <button id="open-measurement-form-btn" class="btn-emerald px-4 py-2.5 text-xs font-bold shadow-emerald-sm">
                                <span class="material-symbols-outlined text-base">add</span> Nueva Medición
                            </button>
                        </div>

                        <!-- 4 Stat Badges Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-700/60 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-slate-400">Peso Actual</span>
                                <p class="text-2xl font-display font-black text-emerald-400">${currentWeight} <span class="text-xs font-normal text-slate-400">kg</span></p>
                            </div>
                            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-700/60 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-slate-400">% Grasa</span>
                                <p class="text-2xl font-display font-black text-emerald-400">${bodyFat} <span class="text-xs font-normal text-slate-400">%</span></p>
                            </div>
                            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-700/60 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-slate-400">Masa Magra</span>
                                <p class="text-2xl font-display font-black text-blue-400">${leanMass} <span class="text-xs font-normal text-slate-400">kg</span></p>
                            </div>
                            <div class="p-3 bg-slate-900 rounded-2xl border border-slate-700/60 text-center shadow-xs">
                                <span class="text-[10px] font-bold uppercase text-slate-400">Masa Grasa</span>
                                <p class="text-2xl font-display font-black text-amber-400">${fatMass} <span class="text-xs font-normal text-slate-400">kg</span></p>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Card -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-display font-black text-white uppercase">Evolución de Peso y Grasa</h3>
                            <span class="text-xs text-slate-400 font-mono font-bold">${history.length} registros</span>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="measurementsChart" class="w-full h-full"></canvas>
                        </div>
                    </div>

                    <!-- History Table -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <h3 class="text-lg font-display font-black text-white uppercase mb-4 pb-2 border-b border-slate-700/60">
                            Historial Antropométrico
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-700/60">
                                        <th class="pb-2">Fecha</th>
                                        <th class="pb-2">Peso</th>
                                        <th class="pb-2">% Grasa</th>
                                        <th class="pb-2">Cintura</th>
                                        <th class="pb-2">Cuello</th>
                                        <th class="pb-2">Masa Magra</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800 font-medium">
                                    ${history.length ? history.map(m => `
                                        <tr>
                                            <td class="py-3 font-bold text-white">${m.date}</td>
                                            <td class="py-3 font-mono font-bold text-emerald-400">${m.weight} kg</td>
                                            <td class="py-3 font-mono font-bold text-slate-200">${m.bodyFat}%</td>
                                            <td class="py-3 font-mono text-slate-400">${m.waist || '--'} cm</td>
                                            <td class="py-3 font-mono text-slate-400">${m.neck || '--'} cm</td>
                                            <td class="py-3 font-mono text-blue-400 font-bold">${m.leanMass || '--'} kg</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="6" class="py-4 text-center text-slate-500 italic">Sin mediciones registradas</td></tr>
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
        <div id="measurement-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"></div>
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
                        borderColor: '#34d399',
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '% Grasa',
                        data: history.map(m => m.bodyFat),
                        borderColor: '#fbbf24',
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
                    legend: {
                        position: 'top',
                        labels: { color: '#f1f5f9', font: { size: 11, weight: 'bold' } }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    document.getElementById('open-measurement-form-btn')?.addEventListener('click', () => {
        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-slate-700/80">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                    <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Método Navy Seal</span>
                    <button id="close-meas-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase">Peso (kg)</label>
                            <input id="input-weight" type="number" step="0.1" placeholder="75.5" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500 mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase">Fecha</label>
                            <input id="input-date" type="date" value="${getArgentinaDate()}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 mt-1">
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Cintura (cm)</label>
                            <input id="input-waist" type="number" placeholder="85" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Cuello (cm)</label>
                            <input id="input-neck" type="number" placeholder="38" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Cadera (cm)</label>
                            <input id="input-hip" type="number" placeholder="95" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 mt-1">
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
