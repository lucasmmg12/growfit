import { getState } from '../state';

export const renderInsights = () => {
    const state = getState();
    const profile = state.profile;

    return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
        <!-- Sidebar -->
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
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined">straighten</span>
                        <p class="text-sm font-medium">Progreso</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 border border-primary/20 group transition-colors cursor-pointer" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined text-primary group-hover:text-white">insights</span>
                        <p class="text-white text-sm font-medium">Estadísticas</p>
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

        <!--Main Content-->
        <main class="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
            <!-- Mobile Header -->
            <div class="md:hidden flex items-center justify-between w-full p-4 border-b border-[#28392a] bg-surface-dark backdrop-blur-md">
                <img src="/logogrow.png" alt="GrowFit" class="h-6 object-contain">
                    <button class="text-white" onclick="window.router.navigate('dashboard')"><span class="material-symbols-outlined">dashboard</span></button>
            </div>

            <div class="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6">
                <!-- Header & Date Filter -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div class="flex flex-col gap-1">
                        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">Análisis Avanzado</h2>
                        <p class="text-[#9db99f] text-base">Analiza tus tendencias nutricionales y biometría.</p>
                    </div>
                    <div class="flex gap-2 p-1 bg-surface-dark/90 backdrop-blur-md rounded-xl border border-[#28392a] overflow-x-auto max-w-full">
                        <button class="flex px-4 py-2 shrink-0 items-center justify-center rounded-lg bg-primary text-black text-sm font-bold shadow-sm">
                            Últ. 7 Días
                        </button>
                        <button class="flex px-4 py-2 shrink-0 items-center justify-center rounded-lg hover:bg-[#28392a] text-gray-300 text-sm font-medium transition-colors">
                            Este Mes
                        </button>
                        <button class="flex px-4 py-2 shrink-0 items-center justify-center rounded-lg hover:bg-[#28392a] text-gray-300 text-sm font-medium transition-colors">
                            Últ. 3 Meses
                        </button>
                        <button class="flex px-4 py-2 shrink-0 items-center justify-center rounded-lg hover:bg-[#28392a] text-gray-300 text-sm font-medium transition-colors">
                            Personalizado
                        </button>
                    </div>
                </div>

                <!-- Stats Overview -->
                ${(() => {
            const today = new Date();
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(today.getDate() - i);
                return d.toISOString().split('T')[0];
            });

            // BMR Estimate
            const lastM = state.measurements && state.measurements.length > 0 ? state.measurements[state.measurements.length - 1] : null;
            const weight = lastM ? lastM.weight : (profile.startingWeight || 70);
            const height = profile.height || 175;
            const age = profile.age || 30;
            const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (profile.gender === 'male' ? 5 : -161));

            const periodData = last7Days.map(date => {
                const consumed = state.dailyLog?.filter(m => m.date === date).reduce((s, m) => s + (m.calories || 0), 0) || 0;
                const activity = state.workouts?.filter(w => w.date === date).reduce((s, w) => s + (w.calories || 0), 0) || 0;
                return { consumed, burned: bmr + activity };
            });

            const avgConsumed = Math.round(periodData.reduce((s, d) => s + d.consumed, 0) / 7);
            const totalBurned = Math.round(periodData.reduce((s, d) => s + d.burned, 0));
            const avgBurned = Math.round(totalBurned / 7);
            const netBalance = avgConsumed - avgBurned;

            return `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Avg Daily Intake -->
                    <div class="flex flex-col gap-2 rounded-xl p-6 bg-surface-dark/90 backdrop-blur-md border border-[#28392a] shadow-sm">
                        <div class="flex justify-between items-start">
                            <p class="text-gray-400 text-sm font-medium uppercase tracking-wider">Promedio Ingesta</p>
                            <span class="material-symbols-outlined text-primary">local_fire_department</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-2">
                            <p class="text-3xl font-bold text-white">${avgConsumed.toLocaleString()}</p>
                            <p class="text-sm font-medium text-slate-500">kcal / día</p>
                        </div>
                         <p class="text-slate-400 text-xs mt-1 italic">Basado en los últimos 7 días</p>
                    </div>

                    <!-- Total Burned -->
                    <div class="flex flex-col gap-2 rounded-xl p-6 bg-surface-dark/90 backdrop-blur-md border border-[#28392a] shadow-sm">
                        <div class="flex justify-between items-start">
                            <p class="text-gray-400 text-sm font-medium uppercase tracking-wider">Gasto Promedio</p>
                            <span class="material-symbols-outlined text-blue-400">fitness_center</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-2">
                            <p class="text-3xl font-bold text-white">${avgBurned.toLocaleString()}</p>
                            <p class="text-sm font-medium text-slate-500">kcal / día</p>
                        </div>
                        <p class="text-slate-400 text-xs mt-1 italic">BMR: ${bmr} + Ejercicio</p>
                    </div>

                    <!-- Net Balance -->
                    <div class="flex flex-col gap-2 rounded-xl p-6 bg-surface-dark/90 backdrop-blur-md border border-[#28392a] shadow-sm">
                        <div class="flex justify-between items-start">
                            <p class="text-gray-400 text-sm font-medium uppercase tracking-wider">Balance Diario</p>
                            <span class="material-symbols-outlined text-orange-400">balance</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-2">
                            <p class="text-3xl font-bold ${netBalance > 0 ? 'text-red-400' : 'text-primary'}">${(netBalance > 0 ? '+' : '') + netBalance.toLocaleString()}</p>
                            <p class="text-sm font-medium text-slate-500">kcal</p>
                        </div>
                        <p class="text-slate-400 text-xs mt-1 italic">${netBalance < 0 ? 'Estás en déficit calórico' : 'Estás en superávit calórico'}</p>
                    </div>
                </div>
            `;
        })()}

                <!-- Main Chart Section -->
                <!-- Main Chart Section (Premium Tableau Style) -->
                <div class="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                    <!-- Background Glow -->
                    <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>

                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
                        <div>
                            <h3 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                Balance Energético
                                <span class="material-symbols-outlined text-slate-500 text-sm" title="Calorías consumidas vs quemadas">info</span>
                            </h3>
                            <p class="text-slate-400 text-sm mt-1">Comparativa de ingesta vs. gasto de los últimos 7 días</p>
                        </div>
                        
                        <!-- Legend -->
                        <div class="flex items-center gap-6 bg-black/20 px-4 py-2 rounded-lg border border-white/5 mt-4 md:mt-0">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-gradient-to-tr from-primary to-green-300 shadow-[0_0_8px_rgba(74,222,128,0.4)]"></div>
                                <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ingesta</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-gradient-to-tr from-orange-500 to-orange-300 shadow-[0_0_8px_rgba(251,146,60,0.4)]"></div>
                                <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Gasto</span>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Surface -->
                    <div class="relative h-72 w-full flex items-end justify-between gap-2 md:gap-4 px-2 md:px-4 pb-8 border-b border-white/10 z-10">
                        <!-- Subtle Grid Lines -->
                        <div class="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-4">
                             <div class="w-full border-t border-white/5 h-0 flex items-center pl-1"><span class="text-[10px] text-slate-600 bg-[#111812]/50 px-1 rounded -mt-5">High Activity</span></div>
                             <div class="w-full border-t border-white/5 h-0"></div>
                             <div class="w-full border-t border-white/5 h-0 text-right"><span class="text-[10px] text-slate-600 bg-[#111812]/50 px-1 rounded -mt-5">Basal</span></div>
                             <div class="w-full border-t border-white/5 h-0"></div>
                        </div>

                        <!-- Bar Groups (Real Data) -->
                        ${renderChartBars(state)}
                    </div>
                </div>

                <!-- Bottom Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Left Column: AI & Micros -->
                    <div class="lg:col-span-1 flex flex-col gap-6">
                        <!-- AI Card -->
                        <div class="relative overflow-hidden rounded-xl bg-surface-dark/90 backdrop-blur-md border border-[#28392a] group">
                            <div class="absolute inset-0 z-0">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-[#182c1a]/80 to-transparent z-10"></div>
                                <div class="w-full h-full bg-cover bg-center" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuD_Y3QmiMDMhyef3kltpTXQ2V6FgBNwwh68e61C5luVRVNx7y3ludAzE_XqHqnS2mlYh01x0lQL6ETtyfXo-TJ7azFIYuK3WdUR5ap4iJh4cCWbz1mu6_G87RmQadbtuBYXa6P0cYg2D9y_dw9Y3Fw7kB9ZlI6NYe3vICNjwKUe9hNOS3kU581b9fdnCyUKOpdbDmuZGZrLQoWynfK9WF-6q92ZJj5UN7u9vh72ZwvSQGMytzIVet1nLgLNVc4dW-vurEaduPyNEya0");'></div>
                            </div>
                            <div class="relative z-20 p-5 pt-32 flex flex-col gap-3">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="material-symbols-outlined text-primary animate-pulse">smart_toy</span>
                                    <span class="text-xs font-bold uppercase tracking-widest text-primary">IA Insight</span>
                                </div>
                                <h4 class="text-xl font-bold text-white leading-tight">Déficit de Hierro Detectado</h4>
                                <p class="text-gray-200 text-sm leading-relaxed">
                                    Tu consumo de hierro está bajo esta semana comparado con tu promedio. Considera añadir lentejas o espinacas a tu próxima comida.
                                </p>
                                <button class="mt-2 w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-[#10d420] transition-colors text-[#111812] text-sm font-bold">
                                    <span class="material-symbols-outlined text-lg">restaurant_menu</span>
                                    Ver Sugerencias
                                </button>
                            </div>
                        </div>

                        <!-- Micronutrients Mini-Grid -->
                        <div class="bg-surface-dark/90 backdrop-blur-md rounded-xl border border-[#28392a] p-5 shadow-sm">
                            <h4 class="text-lg font-bold mb-4 text-white">Micronutrientes</h4>
                            <div class="flex flex-col gap-4">
                                ${renderMicroItem("Vitamina C", "110%", "primary")}
                                ${renderMicroItem("Hierro", "45%", "orange-400")}
                                ${renderMicroItem("Calcio", "92%", "primary")}
                                ${renderMicroItem("Proteína", "102%", "primary")}
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Biometrics Table -->
                    <div class="lg:col-span-2 bg-surface-dark/90 backdrop-blur-md rounded-xl border border-[#28392a] shadow-sm flex flex-col">
                        <div class="p-6 border-b border-[#28392a] flex flex-wrap gap-4 justify-between items-center">
                            <div>
                                <h3 class="text-lg font-bold text-white">Historial Biométrico</h3>
                                <p class="text-slate-500 text-sm">Sigue tu peso y composición corporal</p>
                            </div>
                            <button class="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3b543d] hover:bg-[#28392a] text-sm font-medium transition-colors text-white">
                                <span class="material-symbols-outlined text-lg">download</span>
                                Exportar
                            </button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-[#111812] text-gray-400 uppercase tracking-wider text-xs">
                                    <tr>
                                        <th class="px-6 py-4 font-semibold">Fecha</th>
                                        <th class="px-6 py-4 font-semibold">Peso (kg)</th>
                                        <th class="px-6 py-4 font-semibold">Grasa %</th>
                                        <th class="px-6 py-4 font-semibold hidden sm:table-cell">Masa Musc.</th>
                                        <th class="px-6 py-4 font-semibold text-right">Tendencia</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-[#28392a]">
                                    ${state.measurements && state.measurements.length > 0
            ? [...state.measurements].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, i, arr) => {
                const prev = arr[i + 1];
                let trend = "0.0";
                let color = "neutral";
                if (prev) {
                    const diff = m.weight - prev.weight;
                    trend = (diff > 0 ? "+" : "") + diff.toFixed(1) + " kg";
                    color = diff < 0 ? "green" : (diff > 0 ? "red" : "neutral");
                }

                // Format date
                const dateObj = new Date(m.date);
                const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

                return renderBiometricRow(dateStr, m.weight, m.bodyFat + "%", m.leanMass + " kg", trend, color);
            }).join('')
            : '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-500">No hay registros aún. Ve a Progreso para añadir uno.</td></tr>'
        }
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

const renderChartBars = (state) => {
    // Generate Last 7 Days (ending today)
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); // -6 to 0 to get the last 7 days ending today
        return d.toISOString().split('T')[0];
    });

    // BMR Estimate
    const lastM = state.measurements && state.measurements.length > 0 ? state.measurements[state.measurements.length - 1] : null;
    const weight = lastM ? lastM.weight : (state.profile.startingWeight || 70);
    const height = state.profile.height || 175;
    const age = state.profile.age || 30;
    const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (state.profile.gender === 'male' ? 5 : -161));

    const chartData = dates.map(date => {
        // Consumed
        const consumed = state.dailyLog
            .filter(m => m.date === date)
            .reduce((s, m) => s + (m.calories || 0), 0);

        // Burned (BMR + Workouts)
        const workouts = state.workouts ? state.workouts.filter(w => w.date === date) : [];
        const activity = workouts.reduce((s, w) => s + (w.calories || 0), 0);
        const burned = Math.round(bmr + activity);

        const dayLabel = new Date(date).toLocaleDateString('es-ES', { weekday: 'short' });
        return { day: dayLabel, consumed, burned };
    });

    const maxVal = Math.max(...chartData.map(d => Math.max(d.consumed, d.burned)), 2500);

    return chartData.map(d => `
        <div class="flex flex-col justify-end items-center gap-1 h-full w-full group relative">
            <!-- Tooltip -->
            <div class="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] p-2 rounded pointer-events-none whitespace-nowrap z-10 border border-white/10">
                In: ${d.consumed} | Out: ${d.burned}
            </div>

            <div class="flex items-end gap-1.5 h-full w-full justify-center px-1">
                <!-- Consumed Bar (Green Gradient) -->
                <div class="w-3 md:w-5 bg-gradient-to-t from-green-600 to-primary rounded-t-[4px] shadow-[0_0_15px_rgba(74,222,128,0.15)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] hover:scale-y-105 origin-bottom relative group backdrop-blur-sm" 
                     style="height: ${Math.max(5, (d.consumed / maxVal) * 90)}%">
                </div>
                <!-- Burned Bar (Orange Gradient) -->
                <div class="w-3 md:w-5 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-[4px] shadow-[0_0_15px_rgba(251,146,60,0.15)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:scale-y-105 origin-bottom relative group backdrop-blur-sm" 
                     style="height: ${Math.max(5, (d.burned / maxVal) * 90)}%">
                </div>
            </div>
            <span class="text-[10px] text-slate-500 font-semibold tracking-wider mt-2">${d.day}</span>
        </div>
    `).join('');
};

const renderMicroItem = (name, val, colorClass) => {
    // Handling color class mapping manually since template literals can be tricky with tailwind JIT if not explicit
    let barColor = 'bg-primary';
    if (colorClass === 'orange-400') barColor = 'bg-orange-400';

    return `
    <div class="flex flex-col gap-1">
        <div class="flex justify-between text-sm">
            <span class="text-gray-300">${name}</span>
            <span class="text-white font-bold">${val}</span>
        </div>
        <div class="w-full h-2 bg-black/40 rounded-full overflow-hidden">
            <div class="h-full ${barColor} rounded-full" style="width: ${val.replace('%', '')}%"></div>
        </div>
    </div>
    `;
};

const renderBiometricRow = (date, weight, fat, muscle, trend, trendColor) => {
    let trendBadge = '';
    if (trendColor === 'red') trendBadge = `<span class="inline-flex items-center px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs font-bold"> ${trend}</span>`;
    else if (trendColor === 'green') trendBadge = `<span class="inline-flex items-center px-2 py-1 rounded bg-emerald-900/30 text-primary text-xs font-bold"> ${trend}</span>`;
    else trendBadge = `<span class="text-slate-400 text-xs"> ${trend}</span>`;

    return `
    <tr class="hover:bg-[#28392a]/50 transition-colors">
        <td class="px-6 py-4 font-medium text-white">${date}</td>
        <td class="px-6 py-4 text-gray-300">${weight}</td>
        <td class="px-6 py-4 text-gray-300">${fat}</td>
        <td class="px-6 py-4 hidden sm:table-cell text-gray-300">${muscle}</td>
        <td class="px-6 py-4 text-right">${trendBadge}</td>
    </tr>
    `;
};
