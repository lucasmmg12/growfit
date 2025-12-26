import { getState, addMeasurement, getLatestMeasurement } from '../state';

export const renderMeasurements = () => {
    const state = getState();
    const history = state.measurements ? [...state.measurements].reverse() : [];
    const latest = getLatestMeasurement();

    // Default values
    const currentWeight = latest ? latest.weight : (state.profile.startingWeight || 70);
    const bodyFat = latest ? latest.bodyFat : '--';
    const leanMass = latest ? latest.leanMass : '--';

    return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
        <!-- Side Navigation (Desktop) - SAME AS DASHBOARD -->
        <aside class="hidden md:flex w-64 flex-col justify-between border-r border-[#28392a] bg-surface-dark backdrop-blur-md p-4">
            <div class="flex flex-col gap-8">
                <div class="flex items-center gap-3 px-2">
                     <img src="/lucas.jpeg" alt="Profile" class="w-12 h-12 rounded-full border-2 border-primary object-cover">
                    <div class="flex flex-col">
                        <img src="/logogrow.png" alt="GrowFit" class="h-6 object-contain self-start">
                        <p class="text-primary text-xs font-medium uppercase tracking-wide">Plan Personal</p>
                    </div>
                </div>
                <nav class="flex flex-col gap-2">
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined">dashboard</span>
                        <p class="text-sm font-medium">Inicio</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 border border-primary/20 group transition-colors cursor-pointer">
                        <span class="material-symbols-outlined text-primary group-hover:text-white">straighten</span>
                        <p class="text-white text-sm font-medium">Progreso</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined">insights</span>
                        <p class="text-sm font-medium">Estadísticas</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined">fitness_center</span>
                        <p class="text-sm font-medium">Entrenamientos</p>
                    </a>
                     <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('profile')">
                        <span class="material-symbols-outlined">settings</span>
                        <p class="text-sm font-medium">Ajustes</p>
                    </a>
                </nav>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative">
            <div class="flex-1 overflow-y-auto">
                <div class="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-8">

                    <!-- Header -->
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-white text-3xl font-black">Progreso Corporal</h2>
                            <p class="text-text-secondary">Monitorea tu evolución con el método Navy Seal</p>
                        </div>
                        <button id="toggle-form-btn" class="bg-primary text-[#102212] px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-400 transition-colors">
                            <span class="material-symbols-outlined">add</span>
                            Nuevo Registro
                        </button>
                    </div>

                    <!-- Input Form (Hidden by default) -->
                    <div id="measurement-form" class="hidden bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 animate-slide-in">
                        <h3 class="text-white font-bold mb-4">Nueva Medición</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-text-secondary uppercase">Fecha</label>
                                <input id="m-date" type="date" class="bg-[#1A261C] border border-[#28392a] rounded-lg p-3 text-white focus:border-primary outline-none" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-text-secondary uppercase">Peso (kg)</label>
                                <input id="m-weight" type="number" step="0.1" class="bg-[#1A261C] border border-[#28392a] rounded-lg p-3 text-white focus:border-primary outline-none" placeholder="Ej. 75.5" value="${currentWeight}">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-text-secondary uppercase">Cuello (cm)</label>
                                <input id="m-neck" type="number" step="0.5" class="bg-[#1A261C] border border-[#28392a] rounded-lg p-3 text-white focus:border-primary outline-none" placeholder="Ej. 38">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-text-secondary uppercase">Cintura (cm)</label> <!-- Al ombligo -->
                                <input id="m-waist" type="number" step="0.5" class="bg-[#1A261C] border border-[#28392a] rounded-lg p-3 text-white focus:border-primary outline-none" placeholder="Altura ombligo. Ej. 85">
                            </div>
                            <div class="flex flex-col gap-1 ${state.profile.gender === 'female' ? '' : 'hidden'}">
                                <label class="text-xs text-text-secondary uppercase">Cadera (cm)</label>
                                <input id="m-hip" type="number" step="0.5" class="bg-[#1A261C] border border-[#28392a] rounded-lg p-3 text-white focus:border-primary outline-none" placeholder="Parte más ancha">
                            </div>
                        </div>
                        <button id="save-measurement-btn" class="w-full bg-[#28392a] text-white py-3 rounded-xl font-bold hover:bg-primary hover:text-[#102212] transition-colors border border-primary/20">
                            Calcular y Guardar
                        </button>
                    </div>

                    <!-- Stats Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Body Fat -->
                        <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-5 relative overflow-hidden">
                            <div class="absolute -right-4 -top-4 text-[#28392a] opacity-50">
                                <span class="material-symbols-outlined text-[100px]">body_fat</span>
                            </div>
                            <p class="text-text-secondary text-xs uppercase font-bold tracking-wider mb-1">Grasa Corporal</p>
                            <h3 class="text-3xl font-black text-white relative z-10">${bodyFat}<span class="text-lg text-primary font-medium">%</span></h3>
                            <p class="text-xs text-text-secondary mt-2">Estimación Navy Seal</p>
                        </div>
                        <!-- Lean Mass -->
                        <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-5 relative overflow-hidden">
                            <div class="absolute -right-4 -top-4 text-[#28392a] opacity-50">
                                <span class="material-symbols-outlined text-[100px]">fitness_center</span>
                            </div>
                            <p class="text-text-secondary text-xs uppercase font-bold tracking-wider mb-1">Masa Magra</p>
                            <h3 class="text-3xl font-black text-white relative z-10">${leanMass}<span class="text-lg text-text-secondary font-medium">kg</span></h3>
                            <p class="text-xs text-text-secondary mt-2">Músculo, huesos, agua</p>
                        </div>
                        <!-- Weight -->
                        <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-5 relative overflow-hidden">
                            <div class="absolute -right-4 -top-4 text-[#28392a] opacity-50">
                                <span class="material-symbols-outlined text-[100px]">monitor_weight</span>
                            </div>
                            <p class="text-text-secondary text-xs uppercase font-bold tracking-wider mb-1">Peso Actual</p>
                            <h3 class="text-3xl font-black text-white relative z-10">${currentWeight}<span class="text-lg text-text-secondary font-medium">kg</span></h3>
                            <p class="text-xs text-text-secondary mt-2">Último registro</p>
                        </div>
                    </div>

                    <!-- Progress Chart -->
                    <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 h-72 w-full flex flex-col">
                        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">trending_down</span>
                            Tendencia de Grasa Corporal
                        </h3>
                        <div class="flex-1 relative w-full h-full">
                            <canvas id="progressChart"></canvas>
                        </div>
                    </div>

                    <!-- History Table -->
                    <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl overflow-hidden">
                        <div class="p-4 border-b border-[#28392a]">
                            <h3 class="text-white font-bold">Historial</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-[#132015] text-text-secondary text-xs uppercase">
                                    <tr>
                                        <th class="p-4 font-medium">Fecha</th>
                                        <th class="p-4 font-medium">Peso</th>
                                        <th class="p-4 font-medium">Grasa %</th>
                                        <th class="p-4 font-medium">M. Magra</th>
                                        <th class="p-4 font-medium hidden sm:table-cell">Cintura</th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm">
                                    ${history.length > 0 ? history.map(item => `
                                        <tr class="border-b border-[#28392a] last:border-none hover:bg-white/5 transition-colors">
                                            <td class="p-4 text-white font-mono">${new Date(item.date).toLocaleDateString()}</td>
                                            <td class="p-4 text-white font-bold">${item.weight} kg</td>
                                            <td class="p-4">
                                                <span class="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-bold border border-primary/20">
                                                    ${item.bodyFat}%
                                                </span>
                                            </td>
                                            <td class="p-4 text-text-secondary">${item.leanMass} kg</td>
                                            <td class="p-4 text-text-secondary hidden sm:table-cell">${item.waist} cm</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="5" class="p-8 text-center text-text-secondary">
                                                No hay registros aún. ¡Añade tu primera medición!
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    </div>
    `;
};

export const attachMeasurementsEvents = () => {
    const toggleBtn = document.getElementById('toggle-form-btn');
    const form = document.getElementById('measurement-form');
    const saveBtn = document.getElementById('save-measurement-btn');

    toggleBtn?.addEventListener('click', () => {
        form.classList.toggle('hidden');
    });

    saveBtn?.addEventListener('click', async () => {
        const date = document.getElementById('m-date').value;
        const weight = parseFloat(document.getElementById('m-weight').value);
        const neck = parseFloat(document.getElementById('m-neck').value);
        const waist = parseFloat(document.getElementById('m-waist').value);
        const hip = parseFloat(document.getElementById('m-hip')?.value) || 0;

        if (!weight || !neck || !waist) {
            alert("Por favor completa los campos requeridos (Peso, Cuello, Cintura)");
            return;
        }

        saveBtn.textContent = 'Guardando...';
        await addMeasurement({ date, weight, neck, waist, hip });
        window.location.reload();
    });

    // --- Chart Logic --- //
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    const state = getState();
    const history = state.measurements ? [...state.measurements].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    if (ctx && history.length > 0) {

        // Data prep
        const labels = history.map(h => new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const dataBodyFat = history.map(h => h.bodyFat);

        // Linear Regression for Trend Line
        // X = time in days from start
        if (history.length >= 2) {
            const startDate = new Date(history[0].date).getTime();
            const xValues = history.map(h => (new Date(h.date).getTime() - startDate) / (1000 * 3600 * 24)); // Days
            const yValues = dataBodyFat;

            const n = xValues.length;
            const sumX = xValues.reduce((a, b) => a + b, 0);
            const sumY = yValues.reduce((a, b) => a + b, 0);
            const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
            const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            // Generate trend points
            const trendData = xValues.map(x => slope * x + intercept);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Grasa Corporal (%)',
                            data: dataBodyFat,
                            borderColor: '#13ec25',
                            backgroundColor: 'rgba(19, 236, 37, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Tendencia',
                            data: trendData,
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            tension: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#9db99f', font: { family: 'Manrope' } }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(16, 34, 18, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#13ec25',
                            borderColor: '#28392a',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: '#28392a' },
                            ticks: { color: '#9db99f' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#9db99f' }
                        }
                    }
                }
            });
        } else {
            // Not enough data for trend, just show line
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Grasa Corporal (%)',
                        data: dataBodyFat,
                        borderColor: '#13ec25',
                        borderWidth: 3,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: '#28392a' }, ticks: { color: '#9db99f' } },
                        x: { display: false }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
};
