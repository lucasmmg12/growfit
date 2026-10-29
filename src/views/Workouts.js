import { getState, addWorkout, deleteWorkout, saveGymSession, calculate1RM, getArgentinaDate, getLatestMeasurement } from '../state';
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

    const currentMonthKey = getArgentinaDate().slice(0, 7);
    const thisMonthWorkouts = workouts.filter(w => (w.date || '').startsWith(currentMonthKey));
    const totalBurnedMonth = thisMonthWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
    const daysTrainedMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-sans text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('workouts')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Entrenamientos')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- Top KPI & Quick Add Exercise Banner -->
                    <div class="white-card card-glow-emerald p-6 shadow-2xl relative overflow-hidden">
                        <div class="pointer-events-none select-none absolute -right-4 -top-6 text-[#10E775] opacity-[0.09] -rotate-12">
                            <span class="material-symbols-outlined text-[130px]">fitness_center</span>
                        </div>

                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                            <div>
                                <span class="badge-emerald mb-1.5">
                                    <span class="size-1.5 rounded-full bg-[#10E775] animate-pulse"></span>
                                    Módulo de Rendimiento & Fuerza
                                </span>
                                <h2 class="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                                    Entrenamientos & Ejercicio
                                </h2>
                                <p class="text-xs text-emerald-300/75 mt-0.5">
                                    Registra ejercicios de pesas, deportes o cardio con cálculo automático de calorías y 1RM.
                                </p>
                            </div>

                            <div class="flex flex-wrap items-center gap-3">
                                <div class="p-3 bg-[#040B08]/75 rounded-2xl border border-emerald-500/25 text-center">
                                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Este Mes</span>
                                    <p class="text-lg font-mono font-extrabold text-[#10E775]">${totalBurnedMonth} <span class="text-xs font-normal text-emerald-300/60">kcal</span></p>
                                </div>
                                <div class="p-3 bg-[#040B08]/75 rounded-2xl border border-emerald-500/25 text-center">
                                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Días Activos</span>
                                    <p class="text-lg font-mono font-extrabold text-emerald-300">${daysTrainedMonth} <span class="text-xs font-normal text-emerald-300/60">días</span></p>
                                </div>
                                <button id="open-add-workout-modal-btn" class="btn-emerald px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                                    <span class="material-symbols-outlined text-lg">add_circle</span>
                                    + Agregar Ejercicio
                                </button>
                            </div>
                        </div>

                        <!-- Tab Switcher (Gym Logbook vs Quick Routines) -->
                        <div class="flex gap-2 p-1.5 bg-[#040B08]/80 border border-emerald-500/20 rounded-2xl mt-5 text-xs font-bold relative z-10">
                            <button id="tab-gym-btn" class="flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                                activeWorkoutTab === 'gym' ? 'btn-emerald shadow-sm' : 'text-emerald-300/70 hover:text-white'
                            }">
                                <span class="material-symbols-outlined text-base align-middle mr-1">fitness_center</span> Bitácora de Pesas & 1RM
                            </button>
                            <button id="tab-routines-btn" class="flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                                activeWorkoutTab === 'routines' ? 'btn-emerald shadow-sm' : 'text-emerald-300/70 hover:text-white'
                            }">
                                <span class="material-symbols-outlined text-base align-middle mr-1">sprint</span> Cardio, Deportes & Rutinas
                            </button>
                        </div>
                    </div>

                    <!-- TAB 1: GYM LOGBOOK & 1RM -->
                    <div id="gym-logbook-view" class="${activeWorkoutTab === 'gym' ? 'flex' : 'hidden'} flex-col gap-6">
                        
                        <!-- Rest Timer Widget Card -->
                        <div class="white-card card-glow-mint p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="size-11 rounded-2xl bg-emerald-500/20 text-[#10E775] border border-emerald-500/35 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-2xl">timer</span>
                                </div>
                                <div>
                                    <h4 class="text-xs font-extrabold text-[#10E775] uppercase tracking-wider">Temporizador de Descanso</h4>
                                    <p id="rest-timer-display" class="text-2xl font-mono font-extrabold text-white">
                                        ${restSecondsRemaining > 0 ? `${restSecondsRemaining}s` : 'Listo para la serie'}
                                    </p>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="45">45s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="60">60s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="90">90s</button>
                                <button class="start-rest-btn btn-emerald-soft px-3 py-1.5 text-xs font-bold" data-sec="120">120s</button>
                                ${restSecondsRemaining > 0 ? `<button id="stop-rest-btn" class="btn-ghost-light px-3 py-1.5 text-xs font-bold text-lime-300">Parar</button>` : ''}
                            </div>
                        </div>

                        <!-- Active Exercises in Session -->
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 class="text-lg font-display font-extrabold text-white uppercase">Ejercicios de Pesas en la Sesión</h3>
                                    <p class="text-xs text-emerald-300/70">Calcula tu fuerza máxima (1RM) automáticamente al cargar peso y repeticiones</p>
                                </div>
                                <button id="add-exercise-btn" class="btn-emerald-soft text-xs px-4 py-2 font-extrabold cursor-pointer">
                                    <span class="material-symbols-outlined text-sm">add_circle</span> + Añadir Ejercicio de Pesas
                                </button>
                            </div>

                            <div id="exercises-container" class="flex flex-col gap-4">
                                ${renderExercises(currentSession.exercises)}
                            </div>

                            <div class="flex justify-end gap-3 pt-2">
                                <button id="finish-gym-session-btn" class="btn-emerald px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                                    <span class="material-symbols-outlined text-lg">check_circle</span> Finalizar y Guardar Sesión de Pesas
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: ROUTINES & CARDIO -->
                    <div id="routines-view" class="${activeWorkoutTab === 'routines' ? 'flex' : 'hidden'} flex-col gap-5">
                        <div class="white-card card-glow-mint p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 class="text-base font-display font-extrabold text-white uppercase tracking-tight">Deportes, Cardio & Rutinas Rápidas</h3>
                                <p class="text-xs text-emerald-300/70">Registra tu actividad favorita con 1 toque o carga un ejercicio personalizado.</p>
                            </div>
                            <button id="custom-cardio-btn" class="btn-emerald text-xs px-4 py-2.5 font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
                                <span class="material-symbols-outlined text-base">add_circle</span> + Ejercicio Personalizado
                            </button>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${renderRoutinesCards()}
                        </div>
                    </div>

                    <!-- History / Recent Sessions -->
                    <div class="white-card p-6 border border-emerald-500/20">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                            <h3 class="text-base font-display font-extrabold text-white uppercase">
                                Historial de Ejercicios y Entrenamientos
                            </h3>
                            <span class="badge-emerald font-mono">${workouts.length} sesiones</span>
                        </div>
                        <div class="flex flex-col gap-3">
                            ${renderWorkoutHistory(workouts)}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('workouts')}
        </main>

        <!-- Add Exercise / Workout Modal -->
        <div id="workout-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"></div>
    </div>
    `;
};

const renderExercises = (exercises) => {
    if (!exercises.length) return `<p class="text-xs text-emerald-300/60 italic py-4 text-center">No hay ejercicios agregados en la sesión actual.</p>`;

    return exercises.map((ex, exIdx) => `
        <div class="white-card p-5 border border-emerald-500/20">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/15">
                <div class="flex items-center gap-2 flex-1">
                    <span class="material-symbols-outlined text-[#10E775] text-lg">fitness_center</span>
                    <input class="exercise-name-input bg-transparent border-none font-display font-extrabold text-base text-white uppercase outline-none rounded px-2 py-0.5 w-full max-w-xs" value="${ex.name}" data-exidx="${exIdx}">
                </div>
                <button class="remove-exercise-btn text-xs text-emerald-300/60 hover:text-lime-300 font-semibold cursor-pointer" data-exidx="${exIdx}">
                    Quitar
                </button>
            </div>

            <!-- Sets Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="text-emerald-300/70 font-bold uppercase text-[10px] border-b border-emerald-500/15">
                            <th class="pb-2">Serie</th>
                            <th class="pb-2">Peso (kg)</th>
                            <th class="pb-2">Reps</th>
                            <th class="pb-2">1RM Estimado</th>
                            <th class="pb-2 text-center">Completado</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-emerald-500/10">
                        ${ex.sets.map((set, sIdx) => {
                            const oneRM = calculate1RM(set.weight, set.reps);
                            return `
                            <tr class="font-medium">
                                <td class="py-2.5 font-mono font-bold text-emerald-300/80">#${sIdx + 1}</td>
                                <td class="py-2.5">
                                    <input type="number" value="${set.weight}" class="set-weight-input w-20 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white outline-none" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                                <td class="py-2.5">
                                    <input type="number" value="${set.reps}" class="set-reps-input w-16 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white outline-none" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                                <td class="py-2.5 font-mono font-extrabold text-[#10E775]">
                                    ${oneRM > 0 ? oneRM + ' kg' : '--'}
                                </td>
                                <td class="py-2.5 text-center">
                                    <input type="checkbox" ${set.completed ? 'checked' : ''} class="set-completed-check size-4 accent-[#10E775] cursor-pointer" data-exidx="${exIdx}" data-sidx="${sIdx}">
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <button class="add-set-btn btn-emerald-soft text-[11px] px-3.5 py-1.5 mt-3 font-bold cursor-pointer" data-exidx="${exIdx}">
                + Agregar Serie
            </button>
        </div>
    `).join('');
};

const renderRoutinesCards = () => {
    const routines = [
        { name: 'Entrenamiento de Pesas / Gym', duration: 45, calories: 340, category: 'Fuerza & Hipertrofia', icon: 'fitness_center', badge: 'Popular' },
        { name: 'Ciclismo / Bicicleta', duration: 45, calories: 420, category: 'Cardio & Resistencia', icon: 'directions_bike', badge: 'Favorito' },
        { name: 'Fútbol (Partido / Picado)', duration: 60, calories: 550, category: 'Deporte & Resistencia', icon: 'sports_soccer', badge: 'Favorito' },
        { name: 'Caminata Rápida / Cinta', duration: 40, calories: 230, category: 'Quema Grasa Zona 2', icon: 'directions_walk' },
        { name: 'Running & Trote Mixto', duration: 30, calories: 310, category: 'Resistencia', icon: 'sprint' },
        { name: 'HIIT Circuito Funcional', duration: 25, calories: 260, category: 'Cardio Intenso', icon: 'bolt' }
    ];

    return routines.map(r => `
        <div class="white-card card-glow-emerald p-5 flex flex-col justify-between transition-all">
            <div>
                <div class="flex items-center justify-between mb-3">
                    <div class="size-10 rounded-xl bg-[#10E775]/15 text-[#10E775] flex items-center justify-center border border-[#10E775]/30">
                        <span class="material-symbols-outlined text-xl">${r.icon}</span>
                    </div>
                    ${r.badge ? `<span class="badge-emerald text-[10px] py-0.5 px-2 font-bold">${r.badge}</span>` : ''}
                </div>
                <span class="text-[10px] font-bold uppercase text-emerald-300/70">${r.category}</span>
                <h4 class="text-base font-display font-extrabold text-white tracking-tight mt-0.5">${r.name}</h4>
                <p class="text-xs font-mono text-[#10E775] mt-1 font-bold">~${r.calories} kcal · ${r.duration} min</p>
            </div>

            <button class="log-quick-routine-btn btn-emerald w-full py-2.5 text-xs font-extrabold mt-4 cursor-pointer" data-name="${r.name}" data-duration="${r.duration}" data-calories="${r.calories}" data-icon="${r.icon}">
                Registrar Realizado
            </button>
        </div>
    `).join('');
};

const getWorkoutIcon = (workout) => {
    if (workout.icon) return workout.icon;
    const name = (workout.name || workout.type || '').toLowerCase();
    if (name.includes('bici') || name.includes('cicl')) return 'directions_bike';
    if (name.includes('futbol') || name.includes('fútbol') || name.includes('soccer') || name.includes('pelota')) return 'sports_soccer';
    if (name.includes('run') || name.includes('trote') || name.includes('correr') || name.includes('caminata')) return 'sprint';
    if (name.includes('hiit') || name.includes('quema')) return 'bolt';
    return 'fitness_center';
};

const renderWorkoutHistory = (workouts) => {
    if (!workouts.length) return `<p class="text-xs text-emerald-300/50 italic py-4 text-center">Sin entrenamientos recientes. Usa el botón "+ Agregar Ejercicio" para registrar hoy.</p>`;

    return workouts.slice(-10).reverse().map(w => `
        <div class="flex items-center justify-between p-3.5 bg-[#040B08]/70 rounded-2xl border border-emerald-500/15 hover:border-emerald-500/35 transition-all">
            <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-[#10E775]/15 text-[#10E775] flex items-center justify-center border border-[#10E775]/30">
                    <span class="material-symbols-outlined text-lg">${getWorkoutIcon(w)}</span>
                </div>
                <div>
                    <h5 class="text-xs font-bold text-white capitalize">${w.name || w.type}</h5>
                    <p class="text-[10px] font-mono text-emerald-300/70">${w.date || 'Hoy'} · ${w.duration || 30} min</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-extrabold text-[#10E775]">-${w.calories} kcal</span>
                <button class="delete-workout-btn text-emerald-300/50 hover:text-lime-300 transition-colors p-1 cursor-pointer" data-id="${w.id}" title="Eliminar registro">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
        </div>
    `).join('');
};

export const openAddWorkoutModal = (modalContainer, onSavedCallback) => {
    const state = getState();
    const latestM = getLatestMeasurement();
    const currentWeight = latestM ? latestM.weight : (state.profile?.startingWeight || 80);

    modalContainer.innerHTML = `
        <div class="white-card card-glow-emerald p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-emerald-500/35 my-6">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[#10E775] text-xl">fitness_center</span>
                    <div>
                        <h3 class="text-base font-display font-extrabold text-white uppercase">Agregar Ejercicio / Entreno</h3>
                        <p class="text-[11px] text-emerald-300/70">Cálculo automático de calorías según tu peso (${currentWeight} kg)</p>
                    </div>
                </div>
                <button id="close-workout-modal" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <!-- Preset Exercise Chips -->
            <div class="mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 block mb-1.5">Selección rápida:</span>
                <div class="flex flex-wrap gap-1.5">
                    ${[
                        { name: 'Musculación / Pesas', met: 5.5, min: 45, icon: 'fitness_center' },
                        { name: 'Caminata Rápida', met: 4.3, min: 40, icon: 'directions_walk' },
                        { name: 'Ciclismo / Bici', met: 7.5, min: 45, icon: 'directions_bike' },
                        { name: 'Fútbol', met: 8.0, min: 60, icon: 'sports_soccer' },
                        { name: 'Running / Trote', met: 9.0, min: 30, icon: 'sprint' },
                        { name: 'Funcional / HIIT', met: 8.5, min: 30, icon: 'bolt' }
                    ].map(p => `
                        <button type="button" class="workout-preset-chip px-2.5 py-1 rounded-xl bg-emerald-950/70 hover:bg-[#10E775]/20 border border-emerald-500/25 text-[11px] font-semibold text-emerald-100 cursor-pointer transition-all" data-name="${p.name}" data-met="${p.met}" data-min="${p.min}" data-icon="${p.icon}">
                            ${p.name}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="flex flex-col gap-3.5">
                <div>
                    <label class="text-[10px] font-bold text-[#10E775] uppercase">Ejercicio o Actividad *</label>
                    <input id="wo-name-input" type="text" value="Musculación / Pesas" placeholder="Ej: Pesas, Cinta, Fútbol, Pádel..." class="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none mt-1">
                </div>

                <div class="grid grid-cols-3 gap-2.5">
                    <div>
                        <label class="text-[10px] font-bold text-emerald-300/80 uppercase">Duración (min)</label>
                        <input id="wo-duration-input" type="number" value="45" min="5" max="300" class="w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-emerald-300/80 uppercase">Intensidad</label>
                        <select id="wo-intensity-select" class="w-full rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none mt-1 cursor-pointer">
                            <option value="4.0">Moderada</option>
                            <option value="6.0" selected>Media / Fuerte</option>
                            <option value="8.5">Intensa / Alta</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[#10E775] uppercase">Calorías (kcal)</label>
                        <input id="wo-calories-input" type="number" value="${Math.round(6.0 * currentWeight * (45 / 60))}" class="w-full rounded-xl px-3 py-2 text-sm font-mono font-extrabold text-[#10E775] outline-none mt-1">
                    </div>
                </div>

                <button id="save-wo-modal-btn" class="btn-emerald py-3.5 text-xs font-extrabold uppercase tracking-wider mt-1 cursor-pointer">
                    <span class="material-symbols-outlined text-lg">check_circle</span>
                    Guardar Ejercicio Realizado
                </button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    let selectedIcon = 'fitness_center';

    const recalcCalories = () => {
        const mins = Number(document.getElementById('wo-duration-input')?.value) || 30;
        const met = Number(document.getElementById('wo-intensity-select')?.value) || 6.0;
        const est = Math.round(met * currentWeight * (mins / 60));
        const calInp = document.getElementById('wo-calories-input');
        if (calInp) calInp.value = est;
    };

    document.getElementById('wo-duration-input')?.addEventListener('input', recalcCalories);
    document.getElementById('wo-intensity-select')?.addEventListener('change', recalcCalories);

    modalContainer.querySelectorAll('.workout-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const name = chip.dataset.name;
            const met = Number(chip.dataset.met) || 6.0;
            const min = Number(chip.dataset.min) || 45;
            selectedIcon = chip.dataset.icon || 'fitness_center';
            document.getElementById('wo-name-input').value = name;
            document.getElementById('wo-duration-input').value = min;
            document.getElementById('wo-calories-input').value = Math.round(met * currentWeight * (min / 60));
        });
    });

    document.getElementById('close-workout-modal').onclick = () => modalContainer.classList.add('hidden');

    document.getElementById('save-wo-modal-btn').onclick = async () => {
        const name = document.getElementById('wo-name-input').value.trim() || 'Entrenamiento';
        const duration = Number(document.getElementById('wo-duration-input').value) || 30;
        const calories = Number(document.getElementById('wo-calories-input').value) || 200;

        const saved = await addWorkout({
            name,
            duration,
            calories,
            icon: selectedIcon,
            type: 'workout'
        });

        modalContainer.classList.add('hidden');
        window.showAlert?.('¡Ejercicio Registrado!', `${name} · ${duration} min (-${calories} kcal quemadas)`, 'success');
        if (onSavedCallback) onSavedCallback(saved);
    };
};

export const attachWorkoutsEvents = () => {
    const modal = document.getElementById('workout-modal');

    document.getElementById('tab-gym-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'gym';
        window.router.navigate('workouts');
    });

    document.getElementById('tab-routines-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'routines';
        window.router.navigate('workouts');
    });

    document.getElementById('open-add-workout-modal-btn')?.addEventListener('click', () => {
        openAddWorkoutModal(modal, () => window.router.navigate('workouts'));
    });

    document.getElementById('custom-cardio-btn')?.addEventListener('click', () => {
        openAddWorkoutModal(modal, () => window.router.navigate('workouts'));
    });

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
            if (e.target.checked) startRestTimer(60);
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
        modal.innerHTML = `
            <div class="white-card card-glow-emerald p-6 w-full max-w-sm relative animate-scale-up shadow-2xl border border-emerald-500/35">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                    <h3 class="text-sm font-display font-extrabold text-white uppercase">Nuevo Ejercicio de Pesas</h3>
                    <button id="close-new-ex-modal" class="size-7 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center cursor-pointer">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-[#10E775] uppercase">Nombre del Ejercicio</label>
                        <input id="new-ex-name" type="text" placeholder="Ej: Dominadas, Prensa 45°, Remo con Barra" class="w-full rounded-xl px-3 py-2 text-sm font-bold text-white outline-none mt-1">
                    </div>
                    <div class="grid grid-cols-2 gap-2.5">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Peso Inicial (kg)</label>
                            <input id="new-ex-weight" type="number" value="50" class="w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Repeticiones</label>
                            <input id="new-ex-reps" type="number" value="10" class="w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                        </div>
                    </div>
                    <button id="confirm-new-ex-btn" class="btn-emerald py-3 text-xs font-extrabold uppercase mt-1 cursor-pointer">
                        Añadir a la Sesión
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('close-new-ex-modal').onclick = () => modal.classList.add('hidden');
        document.getElementById('confirm-new-ex-btn').onclick = () => {
            const name = document.getElementById('new-ex-name').value.trim();
            const weight = Number(document.getElementById('new-ex-weight').value) || 40;
            const reps = Number(document.getElementById('new-ex-reps').value) || 10;
            if (!name) return;
            currentSession.exercises.push({
                name,
                sets: [{ reps, weight, rpe: 8, completed: false }]
            });
            modal.classList.add('hidden');
            window.router.navigate('workouts');
        };
    });

    document.getElementById('finish-gym-session-btn')?.addEventListener('click', async () => {
        await saveGymSession(currentSession);
        window.showAlert?.('¡Entrenamiento Guardado!', 'Se calculó tu volumen levantado y calorías quemadas.', 'success');
        window.router.navigate('workouts');
    });

    document.querySelectorAll('.log-quick-routine-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.dataset.name;
            const duration = parseInt(e.currentTarget.dataset.duration);
            const calories = parseInt(e.currentTarget.dataset.calories);
            const icon = e.currentTarget.dataset.icon;

            await addWorkout({
                name,
                duration,
                calories,
                icon,
                type: 'routine'
            });

            window.showAlert?.('¡Entrenamiento Registrado!', `${name} (-${calories} kcal quemadas)`, 'success');
            window.router.navigate('workouts');
        };
    });

    document.querySelectorAll('.delete-workout-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            window.showConfirm?.(
                '¿Eliminar ejercicio?',
                'Se restará del gasto calórico de entrenamiento.',
                async () => {
                    await deleteWorkout(id);
                    window.router.navigate('workouts');
                }
            );
        };
    });

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
