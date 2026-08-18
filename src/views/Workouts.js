import { getState, addWorkout, saveGymSession, calculate1RM, getArgentinaDate } from '../state';
import { HOME_ROUTINES } from '../data/routines';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

let activeWorkoutTab = 'gym'; // 'gym' | 'routines'
let restTimerInterval = null;
let restSecondsRemaining = 0;

let currentSession = {
    name: 'Rutina de Fuerza (A)',
    exercises: [
        {
            name: 'Press de Banca Plano',
            sets: [
                { reps: 10, weight: 60, rpe: 8, completed: true },
                { reps: 8, weight: 70, rpe: 9, completed: false },
                { reps: 6, weight: 75, rpe: 9.5, completed: false }
            ]
        },
        {
            name: 'Sentadilla con Barra',
            sets: [
                { reps: 8, weight: 80, rpe: 8, completed: false },
                { reps: 8, weight: 80, rpe: 8.5, completed: false },
                { reps: 8, weight: 80, rpe: 9, completed: false }
            ]
        }
    ]
};

export const renderWorkouts = () => {
    const state = getState();
    const workouts = state.workouts || [];
    const gymSessions = state.gymSessions || [];

    // Calculate this month stats
    const currentMonthKey = getArgentinaDate().slice(0, 7);
    const thisMonthWorkouts = workouts.filter(w => (w.date || '').startsWith(currentMonthKey));
    const totalBurnedMonth = thisMonthWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
    const daysTrainedMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('workouts')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Entrenamientos')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-5xl mx-auto flex flex-col gap-6">

                    <!-- Top KPI Banner -->
                    <div class="white-card p-6 bg-gradient-to-r from-white via-emerald-50/40 to-white border-emerald-200">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="badge-emerald mb-1">Módulo de Rendimiento</span>
                                <h2 class="text-3xl font-display font-black text-text-emerald uppercase tracking-tight">Registro de Ejercicio</h2>
                                <p class="text-xs text-text-muted mt-0.5">Controla tu sobrecarga progresiva y gasto calórico.</p>
                            </div>

                            <div class="flex items-center gap-4">
                                <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Este Mes</span>
                                    <p class="text-xl font-display font-black text-text-emerald">${totalBurnedMonth} <span class="text-xs font-normal text-text-muted">kcal</span></p>
                                </div>
                                <div class="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Sesiones</span>
                                    <p class="text-xl font-display font-black text-text-emerald">${daysTrainedMonth} <span class="text-xs font-normal text-text-muted">días</span></p>
                                </div>
                            </div>
                        </div>

                        <!-- Tab Switcher (Gym Logbook vs Quick Routines) -->
                        <div class="flex gap-2 p-1 bg-slate-100 rounded-2xl mt-5 text-xs font-bold">
                            <button id="tab-gym-btn" class="flex-1 py-2.5 rounded-xl transition-all ${
                                activeWorkoutTab === 'gym' ? 'bg-white text-text-emerald shadow-xs' : 'text-text-muted hover:text-text-primary'
                            }">
                                <span class="material-symbols-outlined text-base align-middle mr-1">fitness_center</span> Bitácora Gym & 1RM
                            </button>
                            <button id="tab-routines-btn" class="flex-1 py-2.5 rounded-xl transition-all ${
                                activeWorkoutTab === 'routines' ? 'bg-white text-text-emerald shadow-xs' : 'text-text-muted hover:text-text-primary'
                            }">
                                <span class="material-symbols-outlined text-base align-middle mr-1">timer</span> Rutinas & Cardio
                            </button>
                        </div>
                    </div>

                    <!-- TAB 1: GYM LOGBOOK & 1RM -->
                    <div id="gym-logbook-view" class="${activeWorkoutTab === 'gym' ? 'flex' : 'hidden'} flex-col gap-6">
                        
                        <!-- Rest Timer Widget Card -->
                        <div class="white-card p-5 bg-gradient-to-r from-emerald-50/70 to-white border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="size-11 rounded-2xl bg-white text-primary border border-border-emerald flex items-center justify-center shadow-xs">
                                    <span class="material-symbols-outlined text-2xl">hourglass_empty</span>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-text-emerald uppercase">Temporizador de Descanso</h4>
                                    <p id="rest-timer-display" class="text-2xl font-mono font-black text-text-primary">
                                        ${restSecondsRemaining > 0 ? `${restSecondsRemaining}s` : 'Listo para la serie'}
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="45">45s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="60">60s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="90">90s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="120">120s</button>
                                ${restSecondsRemaining > 0 ? `<button id="stop-rest-btn" class="btn-ghost-light px-3 py-1.5 text-xs font-bold text-red-500">Parar</button>` : ''}
                            </div>
                        </div>

                        <!-- Active Exercises in Session -->
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-xl font-display font-black text-text-emerald uppercase">Ejercicios de la Sesión</h3>
                                <button id="add-exercise-btn" class="btn-emerald-soft text-xs px-3.5 py-1.5 font-bold">
                                    <span class="material-symbols-outlined text-sm">add</span> Añadir Ejercicio
                                </button>
                            </div>

                            <div id="exercises-container" class="flex flex-col gap-4">
                                ${renderExercises(currentSession.exercises)}
                            </div>

                            <div class="flex justify-end gap-3 pt-2">
                                <button id="finish-gym-session-btn" class="btn-emerald px-6 py-3 text-sm font-bold shadow-emerald-sm">
                                    <span class="material-symbols-outlined text-lg">check_circle</span> Finalizar y Guardar Sesión
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: ROUTINES & CARDIO -->
                    <div id="routines-view" class="${activeWorkoutTab === 'routines' ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderRoutinesCards()}
                    </div>

                    <!-- History / Recent Sessions -->
                    <div class="white-card p-6">
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase mb-4 pb-2 border-b border-border-soft">
                            Historial de Entrenamientos
                        </h3>
                        <div class="flex flex-col gap-3">
                            ${renderWorkoutHistory(workouts)}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('workouts')}
        </main>
    </div>
    `;
};

const renderExercises = (exercises) => {
    if (!exercises.length) return `<p class="text-xs text-text-muted italic py-4 text-center">No hay ejercicios agregados.</p>`;

    return exercises.map((ex, exIdx) => `
        <div class="white-card p-5 border border-slate-200">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <input class="exercise-name-input bg-transparent border-none font-display font-black text-base md:text-lg text-text-emerald uppercase outline-none focus:bg-emerald-50 rounded px-1" value="${ex.name}" data-exidx="${exIdx}">
                <button class="remove-exercise-btn text-xs text-slate-400 hover:text-red-500 font-semibold" data-exidx="${exIdx}">
                    Quitar
                </button>
            </div>

            <!-- Sets Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                            <th class="pb-2">Set</th>
                            <th class="pb-2">Peso (kg)</th>
                            <th class="pb-2">Reps</th>
                            <th class="pb-2">1RM Est.</th>
                            <th class="pb-2 text-center">Listo</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${ex.sets.map((set, sIdx) => {
                            const oneRM = calculate1RM(set.weight, set.reps);
                            return `
                            <tr class="font-medium">
                                <td class="py-2.5 font-bold text-text-muted">#${sIdx + 1}</td>
                                <td class="py-2.5">
                                    <input type="number" value="${set.weight}" class="set-weight-input w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold outline-none focus:border-primary" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                                <td class="py-2.5">
                                    <input type="number" value="${set.reps}" class="set-reps-input w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold outline-none focus:border-primary" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                                <td class="py-2.5 font-mono font-bold text-text-emerald">
                                    ${oneRM > 0 ? oneRM + ' kg' : '--'}
                                </td>
                                <td class="py-2.5 text-center">
                                    <input type="checkbox" ${set.completed ? 'checked' : ''} class="set-completed-check size-4 accent-primary cursor-pointer" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <button class="add-set-btn btn-emerald-soft text-[11px] px-3 py-1 mt-3 font-bold" data-exidx="${exIdx}">
                + Agregar Serie
            </button>
        </div>
    `).join('');
};

const renderRoutinesCards = () => {
    const routines = [
        { name: 'HIIT Quema Grasa', duration: 20, calories: 220, category: 'Cardio Intenso', icon: 'bolt' },
        { name: 'Running & Trote Mixto', duration: 30, calories: 310, category: 'Resistencia', icon: 'sprint' },
        { name: 'Full Body Peso Corporal', duration: 25, calories: 190, category: 'Fuerza Calistenia', icon: 'accessibility_new' },
        { name: 'Salsa & Baile Cardio', duration: 30, calories: 240, category: 'Cardio Ritmo', icon: 'music_note' },
        { name: 'Movilidad & Flexibilidad', duration: 15, calories: 75, category: 'Recuperación', icon: 'self_improvement' }
    ];

    return routines.map(r => `
        <div class="white-card p-5 flex flex-col justify-between hover:border-emerald-300">
            <div>
                <div class="size-10 rounded-xl bg-emerald-50 text-text-emerald flex items-center justify-center mb-3">
                    <span class="material-symbols-outlined text-xl">${r.icon}</span>
                </div>
                <span class="text-[10px] font-bold uppercase text-text-muted">${r.category}</span>
                <h4 class="text-base font-display font-black text-text-primary uppercase tracking-tight mt-0.5">${r.name}</h4>
                <p class="text-xs font-mono text-text-emerald mt-1 font-bold">~${r.calories} kcal · ${r.duration} min</p>
            </div>

            <button class="log-quick-routine-btn btn-emerald w-full py-2 text-xs font-bold mt-4" data-name="${r.name}" data-duration="${r.duration}" data-calories="${r.calories}">
                Registrar Realizado
            </button>
        </div>
    `).join('');
};

const renderWorkoutHistory = (workouts) => {
    if (!workouts.length) return `<p class="text-xs text-text-muted italic py-3 text-center">Sin entrenamientos recientes.</p>`;

    return workouts.slice(-5).reverse().map(w => `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div class="flex items-center gap-3">
                <div class="size-9 rounded-xl bg-emerald-100 text-text-emerald flex items-center justify-center">
                    <span class="material-symbols-outlined text-base">fitness_center</span>
                </div>
                <div>
                    <h5 class="text-xs font-bold text-text-primary capitalize">${w.name || w.type}</h5>
                    <p class="text-[10px] font-mono text-text-muted">${w.date} · ${w.duration || 30} min</p>
                </div>
            </div>
            <span class="text-xs font-mono font-black text-text-emerald">-${w.calories} kcal</span>
        </div>
    `).join('');
};

export const attachWorkoutsEvents = () => {
    // Tabs
    document.getElementById('tab-gym-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'gym';
        window.router.navigate('workouts');
    });

    document.getElementById('tab-routines-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'routines';
        window.router.navigate('workouts');
    });

    // Exercise updates
    document.querySelectorAll('.exercise-name-input').forEach(inp => {
        inp.onchange = (e) => {
            const idx = parseInt(e.target.dataset.exidx);
            currentSession.exercises[idx].name = e.target.value;
        };
    });

    document.querySelectorAll('.set-weight-input').forEach(inp => {
        inp.onchange = (e) => {
            const exIdx = parseInt(e.target.dataset.exidx);
            const sIdx = parseInt(e.target.dataset.sidx);
            currentSession.exercises[exIdx].sets[sIdx].weight = Number(e.target.value) || 0;
            window.router.navigate('workouts');
        };
    });

    document.querySelectorAll('.set-reps-input').forEach(inp => {
        inp.onchange = (e) => {
            const exIdx = parseInt(e.target.dataset.exidx);
            const sIdx = parseInt(e.target.dataset.sidx);
            currentSession.exercises[exIdx].sets[sIdx].reps = Number(e.target.value) || 0;
            window.router.navigate('workouts');
        };
    });

    document.querySelectorAll('.set-completed-check').forEach(chk => {
        chk.onchange = (e) => {
            const exIdx = parseInt(e.target.dataset.exidx);
            const sIdx = parseInt(e.target.dataset.sidx);
            currentSession.exercises[exIdx].sets[sIdx].completed = e.target.checked;
            
            // Auto start 60s rest timer if completed
            if (e.target.checked) {
                startRestTimer(60);
            }
        };
    });

    document.querySelectorAll('.add-set-btn').forEach(btn => {
        btn.onclick = (e) => {
            const exIdx = parseInt(e.currentTarget.dataset.exidx);
            const lastSet = currentSession.exercises[exIdx].sets.slice(-1)[0] || { weight: 50, reps: 10, rpe: 8 };
            currentSession.exercises[exIdx].sets.push({
                weight: lastSet.weight,
                reps: lastSet.reps,
                rpe: 8,
                completed: false
            });
            window.router.navigate('workouts');
        };
    });

    document.querySelectorAll('.remove-exercise-btn').forEach(btn => {
        btn.onclick = (e) => {
            const exIdx = parseInt(e.currentTarget.dataset.exidx);
            currentSession.exercises.splice(exIdx, 1);
            window.router.navigate('workouts');
        };
    });

    document.getElementById('add-exercise-btn')?.addEventListener('click', () => {
        const name = prompt('Nombre del ejercicio (ej. Dominadas, Prensa, Remo):');
        if (name) {
            currentSession.exercises.push({
                name,
                sets: [{ reps: 10, weight: 40, rpe: 8, completed: false }]
            });
            window.router.navigate('workouts');
        }
    });

    // Save session
    document.getElementById('finish-gym-session-btn')?.addEventListener('click', async () => {
        await saveGymSession(currentSession);
        window.showAlert?.('¡Entrenamiento Guardado!', 'Se calculó tu volumen levantado y calorías quemadas.', 'success');
        window.router.navigate('workouts');
    });

    // Quick routines
    document.querySelectorAll('.log-quick-routine-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.dataset.name;
            const duration = parseInt(e.currentTarget.dataset.duration);
            const calories = parseInt(e.currentTarget.dataset.calories);

            await addWorkout({
                name,
                duration,
                calories,
                type: 'routine'
            });

            window.showAlert?.('Entrenamiento Registrado', `${name} (+${calories} kcal quemadas)`, 'success');
            window.router.navigate('workouts');
        };
    });

    // Rest Timers
    document.querySelectorAll('.start-rest-btn').forEach(btn => {
        btn.onclick = (e) => {
            const sec = parseInt(e.currentTarget.dataset.sec) || 60;
            startRestTimer(sec);
        };
    });

    document.getElementById('stop-rest-btn')?.addEventListener('click', () => {
        if (restTimerInterval) clearInterval(restTimerInterval);
        restSecondsRemaining = 0;
        window.router.navigate('workouts');
    });
};

const startRestTimer = (seconds) => {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restSecondsRemaining = seconds;

    const display = document.getElementById('rest-timer-display');
    if (display) display.textContent = `${restSecondsRemaining}s`;

    restTimerInterval = setInterval(() => {
        restSecondsRemaining--;
        if (display) display.textContent = `${restSecondsRemaining}s`;

        if (restSecondsRemaining <= 0) {
            clearInterval(restTimerInterval);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            if (display) display.textContent = '¡Listo!';
        }
    }, 1000);
};
