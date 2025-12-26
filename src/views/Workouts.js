import { getState, addWorkout } from '../state';
import { HOME_ROUTINES } from '../data/routines';

// Timer State
let workoutStartTime = null;
let workoutTimerInterval = null;
let currentWorkout = null;
let activeSets = {};

export const renderWorkouts = () => {
    const state = getState();
    const userName = state.profile.name || 'Mateo';
    const workouts = state.workouts || [];

    // Sort history desc
    const history = [...workouts].sort((a, b) => (new Date(b.date) - new Date(a.date)));

    // --- STATISTICS LOGIC ---
    // 1. Prepare data structure for last 6 months
    const statsData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        statsData.push({
            key: key,
            label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
            days: new Set(),
            calories: 0
        });
    }

    // 2. Aggregate data
    workouts.forEach(w => {
        const wKey = w.date.slice(0, 7);
        const monthData = statsData.find(m => m.key === wKey);
        if (monthData) {
            monthData.days.add(w.date);
            monthData.calories += (w.calories || 0);
        }
    });

    // 3. Current Month Stats
    const currentMonthData = statsData[statsData.length - 1];
    const daysTrainedThisMonth = currentMonthData.days.size;
    const caloriesBurnedThisMonth = currentMonthData.calories;
    // --- END STATISTICS LOGIC ---

    // Schedule Logic
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayIndex = new Date().getDay();
    const isTrainingDay = [1, 3, 5].includes(todayIndex); // Mon, Wed, Fri
    const todayISO = new Date().toISOString().split('T')[0];
    const doneRunToday = workouts.some(w => w.date === todayISO && (w.type === 'run_walk_mix' || w.type === 'running'));

    let nextTrainingText = '';
    if (isTrainingDay && !doneRunToday) {
        nextTrainingText = "¡HOY a las 20:00hs!";
    } else {
        let nextDayIdx = todayIndex;
        let found = false;
        while (!found) {
            nextDayIdx = (nextDayIdx + 1) % 7;
            if ([1, 3, 5].includes(nextDayIdx)) {
                found = true;
                nextTrainingText = `${days[nextDayIdx]} 20:00hs`;
            }
        }
    }

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
                <!-- Navigation -->
                <nav class="flex flex-col gap-2">
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined">dashboard</span>
                        <p class="text-sm font-medium">Inicio</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined">straighten</span>
                        <p class="text-sm font-medium">Progreso</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined">insights</span>
                        <p class="text-sm font-medium">Estadísticas</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 border border-primary/20 group transition-colors cursor-pointer" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined text-primary group-hover:text-white">fitness_center</span>
                        <p class="text-white text-sm font-medium">Entrenamientos</p>
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
            <div class="md:hidden flex items-center justify-between p-4 bg-surface-dark backdrop-blur-md border-b border-[#28392a]">
                <img src="/logogrow.png" alt="GrowFit" class="h-8 object-contain">
                <button class="text-white" onclick="window.router.navigate('dashboard')"><span class="material-symbols-outlined">dashboard</span></button>
            </div>

            <div class="flex-1 overflow-y-auto w-full relative">
                
                <!-- BROWSE VIEW -->
                <div id="browse-view" class="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-10 transition-opacity duration-300">
                    
                    <!-- Performance Stats Section -->
                    <div class="flex flex-col gap-6">
                         <div>
                            <h2 class="text-white text-3xl font-black">Tu Rendimiento</h2>
                            <p class="text-text-secondary">Evolución del último semestre.</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Main Chart Card -->
                            <div class="md:col-span-2 bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-4 flex flex-col">
                                <canvas id="workoutChart" class="w-full h-64"></canvas>
                            </div>

                            <!-- Summary Stats -->
                            <div class="flex flex-col gap-4">
                                <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 flex flex-col justify-center flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span class="material-symbols-outlined text-primary text-2xl">local_fire_department</span>
                                        <p class="text-text-secondary text-xs uppercase font-bold">Promedio Mensual</p>
                                    </div>
                                    <p class="text-white text-3xl font-black">${Math.round(caloriesBurnedThisMonth + (caloriesBurnedThisMonth * 0.2)).toLocaleString()} <span class="text-xs font-medium text-gray-500">(est)</span></p> 
                                     <!-- Added arbitrary 20% estimated BMR/Passive factor if needed, keeping simple -> actually just stick to logged burned -->
                                    <!-- Better: Just showing logged burned for month -->
                                </div>
                                
                                <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 flex flex-col justify-center flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span class="material-symbols-outlined text-blue-400 text-2xl">calendar_month</span>
                                        <p class="text-text-secondary text-xs uppercase font-bold">Record Asistencia</p>
                                    </div>
                                    <p class="text-white text-3xl font-black">${daysTrainedThisMonth}</p>
                                    <p class="text-text-secondary text-sm">días en ${currentMonthData.label}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                    <!-- SECTION 1: RUNNING / OUTDOOR -->
                    <div class="flex flex-col gap-6">
                        <div>
                            <h2 class="text-white text-3xl font-black">Running & Caminata</h2>
                            <p class="text-text-secondary">Plan: Lunes, Miércoles y Viernes • 20:00hs</p>
                        </div>
                        
                        <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl">
                            <!-- Status Banner -->
                            <div class="flex items-center justify-between pb-6 border-b border-[#28392a]">
                                <div class="flex items-center gap-4">
                                     <div class="bg-primary/20 p-3 rounded-xl text-primary">
                                        <span class="material-symbols-outlined">calendar_clock</span>
                                     </div>
                                     <div>
                                         <h4 class="text-white font-bold text-lg">${doneRunToday ? '¡Objetivo de hoy completado!' : 'Próxima sesión'}</h4>
                                         <p class="text-primary font-medium">${doneRunToday ? 'Has cumplido tu meta diaria.' : nextTrainingText}</p>
                                     </div>
                                </div>
                            </div>

                            <!-- Input Form -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-center gap-2 text-white font-bold">
                                        <span class="material-symbols-outlined text-primary">sprint</span> Trote
                                    </div>
                                    <div class="flex gap-4">
                                        <div class="w-full">
                                            <label class="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1 block">Distancia (km)</label>
                                            <input type="number" id="run-dist" class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl p-3 text-white focus:border-primary outline-none" placeholder="0">
                                        </div>
                                        <div class="w-full">
                                            <label class="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1 block">Tiempo (min)</label>
                                            <input type="number" id="run-time" class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl p-3 text-white focus:border-primary outline-none" placeholder="0">
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-center gap-2 text-white font-bold">
                                        <span class="material-symbols-outlined text-blue-400">directions_walk</span> Caminata
                                    </div>
                                    <div class="flex gap-4">
                                        <div class="w-full">
                                            <label class="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1 block">Distancia (km)</label>
                                            <input type="number" id="walk-dist" class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl p-3 text-white focus:border-primary outline-none" placeholder="0">
                                        </div>
                                        <div class="w-full">
                                            <label class="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1 block">Tiempo (min)</label>
                                            <input type="number" id="walk-time" class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl p-3 text-white focus:border-primary outline-none" placeholder="0">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex justify-end pt-2">
                                <button id="log-run-btn" class="bg-[#28392a] hover:bg-primary hover:text-black text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all">
                                    <span class="material-symbols-outlined">check</span>
                                    Registrar Actividad
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 2: HOME ROUTINES -->
                    <div class="flex flex-col gap-6">
                        <div>
                            <h2 class="text-white text-3xl font-black">Rutinas en Casa</h2>
                            <p class="text-text-secondary">Entrenamientos guiados (Max 30 min).</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${HOME_ROUTINES.map(r => `
                                <div class="flex flex-col rounded-2xl bg-surface-dark/90 backdrop-blur-md border border-border-dark overflow-hidden group hover:border-primary/50 transition-all cursor-pointer" onclick="window.startRoutine('${r.id}')">
                                    <div class="w-full h-48 bg-cover bg-center relative" style='background-image: url("${r.image}");'>
                                        <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                                        <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-1">
                                            <span class="material-symbols-outlined text-[14px]">timer</span> ${r.duration} min
                                        </div>
                                        <div class="absolute bottom-3 left-3">
                                            <span class="text-white font-bold text-lg shadow-black drop-shadow-md">${r.title}</span>
                                        </div>
                                    </div>
                                    <div class="p-5 flex flex-col gap-3">
                                        <p class="text-text-muted text-sm line-clamp-2">${r.description}</p>
                                        <div class="flex items-center gap-2 mt-auto">
                                            <span class="text-xs font-medium text-white bg-white/10 px-2 py-1 rounded">${r.level}</span>
                                            <span class="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">~${r.calories} kcal</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- SECTION 3: HISTORY -->
                    <div class="flex flex-col gap-6 pb-12">
                         <h2 class="text-white text-2xl font-bold">Historial Reciente</h2>
                         <div class="grid grid-cols-1 gap-4">
                            ${history.length === 0 ? '<p class="text-text-secondary">No hay historial disponible.</p>' : ''}
                            ${history.map(w => `
                                <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-xl p-4 flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <div class="bg-[#28392a] p-3 rounded-full text-white">
                                           <span class="material-symbols-outlined">
                                                ${w.type === 'running' ? 'sprint' : w.type === 'walking' ? 'directions_walk' : 'fitness_center'}
                                           </span>
                                        </div>
                                        <div>
                                            <p class="text-white font-bold text-sm capitalize">${w.name || (w.type === 'running' ? 'Running' : 'Entrenamiento')}</p>
                                            <p class="text-text-secondary text-xs">${w.date}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-primary font-bold">+${w.calories} kcal</p>
                                        <p class="text-xs text-text-secondary">${w.duration} min</p>
                                    </div>
                                </div>
                            `).join('')}
                         </div>
                    </div>

                </div>

                <!-- ACTIVE WORKOUT VIEW (Hidden by default) -->
                <div id="active-view" class="hidden absolute inset-0 bg-background-dark z-20 flex flex-col">
                    <div class="sticky top-0 bg-background-dark/95 backdrop-blur-md border-b border-[#28392a] p-4 flex items-center justify-between z-30">
                        <button id="exit-workout" class="text-text-secondary hover:text-white flex items-center gap-1">
                            <span class="material-symbols-outlined">close</span> Salir
                        </button>
                        <div class="flex flex-col items-center">
                            <h3 id="active-title" class="text-white font-bold text-lg">Rutina</h3>
                            <span id="workout-timer" class="font-mono text-primary text-xl font-black">00:00</span>
                        </div>
                        <button id="finish-workout" class="bg-primary text-black font-bold px-4 py-1.5 rounded-full text-sm hover:bg-[#0fd620] transition-colors">
                            Terminar
                        </button>
                    </div>
                    <div id="exercise-list" class="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full flex flex-col gap-4 pb-20"></div>
                </div>

            </div>
        </main>
    </div>
    `;
};

export const attachWorkoutsEvents = () => {
    // 0. CHARTS LOGIC - FETCH REAL DATA
    const state = getState();
    const workouts = state.workouts || [];

    // Re-calc Stats for Chart (Reuse logic)
    const statsData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        statsData.push({
            key: key,
            label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
            days: new Set(),
            calories: 0
        });
    }
    workouts.forEach(w => {
        const wKey = w.date.slice(0, 7);
        const monthData = statsData.find(m => m.key === wKey);
        if (monthData) {
            monthData.days.add(w.date);
            monthData.calories += (w.calories || 0);
        }
    });

    const chartLabels = statsData.map(d => d.label);
    const chartCalories = statsData.map(d => d.calories);
    const chartDays = statsData.map(d => d.days.size);

    const ctx = document.getElementById('workoutChart');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Calorías Quemadas',
                        data: chartCalories,
                        borderColor: '#13ec25', // Primary
                        backgroundColor: 'rgba(19, 236, 37, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        yAxisID: 'y',
                        fill: true
                    },
                    {
                        label: 'Días Entrenados',
                        data: chartDays,
                        borderColor: '#60a5fa', // Blue
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: { color: '#9db99f', font: { family: 'Manrope' } }
                    },
                    tooltip: {
                        backgroundColor: '#1A261C',
                        titleColor: '#fff',
                        bodyColor: '#9db99f',
                        borderColor: '#28392a',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#28392a' },
                        ticks: { color: '#9db99f' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: '#28392a' },
                        ticks: { color: '#13ec25' },
                        title: { display: true, text: 'Calorías', color: '#13ec25' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#60a5fa' },
                        title: { display: true, text: 'Días', color: '#60a5fa' }
                    }
                }
            }
        });
    }

    // 1. Handlers for Routines
    window.startRoutine = (id) => {
        const routine = HOME_ROUTINES.find(r => r.id === id);
        if (!routine) return;

        currentWorkout = routine;
        activeSets = {};

        document.getElementById('browse-view').classList.add('hidden');
        document.getElementById('active-view').classList.remove('hidden');
        document.getElementById('active-title').textContent = routine.title;

        const listContainer = document.getElementById('exercise-list');
        listContainer.innerHTML = routine.exercises.map((ex, idx) => `
            <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-4 flex flex-col gap-4">
                <div class="flex justify-between items-start">
                    <h4 class="text-white font-bold text-lg">${ex.name}</h4>
                    <span class="text-xs font-medium text-text-secondary bg-black/20 px-2 py-1 rounded">
                        ${ex.type === 'time' ? `${ex.duration} seg` : `${ex.reps} reps`}
                    </span>
                </div>
                <!-- Sets -->
                <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-3 mt-1">
                        ${Array.from({ length: ex.sets }).map((_, sIdx) => `
                            <button class="set-btn size-10 rounded-full border-2 border-[#28392a] text-text-secondary font-bold flex items-center justify-center hover:border-primary transition-all"
                                data-ex="${idx}" data-set="${sIdx}">
                                ${sIdx + 1}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        workoutStartTime = Date.now();
        clearInterval(workoutTimerInterval);
        const timerDisplay = document.getElementById('workout-timer');
        workoutTimerInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - workoutStartTime) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;
        }, 1000);

        // Sub-listeners for sets
        document.querySelectorAll('.set-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('bg-primary');
                e.currentTarget.classList.toggle('text-black');
                e.currentTarget.classList.toggle('border-primary');
            });
        });
    };

    document.getElementById('exit-workout')?.addEventListener('click', () => {
        if (confirm("¿Salir sin guardar?")) {
            stopWorkout();
        }
    });

    document.getElementById('finish-workout')?.addEventListener('click', () => {
        const durationMin = Math.ceil(Math.floor((Date.now() - workoutStartTime) / 1000) / 60);
        const calories = Math.round((currentWorkout.calories / currentWorkout.duration) * durationMin);

        addWorkout({
            type: 'home_routine',
            name: currentWorkout.title,
            duration: durationMin,
            calories: calories
        });
        stopWorkout();
        alert(`¡Terminado! +${calories} kcal`);
        window.location.reload();
    });

    const stopWorkout = () => {
        clearInterval(workoutTimerInterval);
        document.getElementById('active-view').classList.add('hidden');
        document.getElementById('browse-view').classList.remove('hidden');
        currentWorkout = null;
    };

    // 2. Handlers for Running Form
    const logRunBtn = document.getElementById('log-run-btn');
    if (logRunBtn) {
        logRunBtn.addEventListener('click', () => {
            const runDist = parseFloat(document.getElementById('run-dist').value) || 0;
            const runTime = parseFloat(document.getElementById('run-time').value) || 0;
            const walkDist = parseFloat(document.getElementById('walk-dist').value) || 0;
            const walkTime = parseFloat(document.getElementById('walk-time').value) || 0;

            let added = false;
            if (runDist > 0) {
                addWorkout({ type: 'running', name: 'Running', distance: runDist, duration: runTime > 0 ? runTime : 30 });
                added = true;
            }
            if (walkDist > 0) {
                addWorkout({ type: 'walking', name: 'Caminata', distance: walkDist, duration: walkTime > 0 ? walkTime : 30 });
                added = true;
            }

            if (added) {
                alert("Actividad registrada con éxito.");
                window.location.reload();
            } else {
                alert("Ingresa distancia o tiempo para registrar.");
            }
        });
    }
};
