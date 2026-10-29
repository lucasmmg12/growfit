import { getState, addWorkout, deleteWorkout, saveGymSession, calculate1RM, getArgentinaDate, getLatestMeasurement, calculateBodyIndices } from '../state';
import { analyzeWorkoutWithAI } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

let activeWorkoutTab = 'ai'; // 'ai' | 'gym'
let restTimerInterval = null;
let restSecondsRemaining = 0;
let lastAiWorkoutResult = null;
let lastAiQuery = '';

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
    const latestMeas = getLatestMeasurement();
    const indices = calculateBodyIndices(latestMeas || {}, state.profile);

    const currentMonthKey = getArgentinaDate().slice(0, 7);
    const thisMonthWorkouts = workouts.filter(w => (w.date || '').startsWith(currentMonthKey));
    const totalBurnedMonth = thisMonthWorkouts.reduce((s, w) => s + (w.calories || 0), 0);
    const daysTrainedMonth = new Set(thisMonthWorkouts.map(w => w.date)).size;

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-sans text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('workouts')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Entrenamientos IA')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- HERO AI WORKOUT ANALYZER: "¿Qué ejercicio has hecho hoy?" -->
                    <div class="white-card card-glow-emerald p-6 md:p-7 shadow-2xl relative overflow-hidden">
                        <div class="pointer-events-none select-none absolute -right-4 -top-6 text-[#10E775] opacity-[0.09] -rotate-12">
                            <span class="material-symbols-outlined text-[140px]">fitness_center</span>
                        </div>
                        <div class="pointer-events-none select-none absolute right-52 -bottom-8 text-[#84CC16] opacity-[0.08] rotate-12">
                            <span class="material-symbols-outlined text-[110px]">bolt</span>
                        </div>

                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-emerald-500/15 relative z-10">
                            <div>
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <span class="badge-emerald">
                                        <span class="material-symbols-outlined text-xs">auto_awesome</span>
                                        Fisiología del Ejercicio con IA
                                    </span>
                                    <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/25">
                                        Perfil Activo: ${indices.weight} kg · ${indices.height} cm · Masa Magra ${indices.leanMass} kg · ${indices.bodyFat}% Grasa
                                    </span>
                                </div>
                                <h2 class="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                                    ¿Qué ejercicio has hecho hoy?
                                </h2>
                                <p class="text-xs text-emerald-300/75 mt-1">
                                    Escribe tu actividad (ej. <em>"1 hora de funcional"</em>) y la IA calculará tus calorías quemadas, endorfinas liberadas, grasa oxidada e impacto metabólico según tu cuerpo.
                                </p>
                            </div>

                            <div class="flex items-center gap-3 shrink-0">
                                <div class="p-3 bg-[#040B08]/80 rounded-2xl border border-emerald-500/25 text-center">
                                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Quemado Mes</span>
                                    <p class="text-lg font-mono font-extrabold text-[#10E775]">${totalBurnedMonth} <span class="text-xs font-normal text-emerald-300/60">kcal</span></p>
                                </div>
                                <div class="p-3 bg-[#040B08]/80 rounded-2xl border border-emerald-500/25 text-center">
                                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Días Activos</span>
                                    <p class="text-lg font-mono font-extrabold text-emerald-300">${daysTrainedMonth} <span class="text-xs font-normal text-emerald-300/60">días</span></p>
                                </div>
                            </div>
                        </div>

                        <!-- AI Prompt Input Bar -->
                        <div class="mt-5 flex flex-col gap-3 relative z-10">
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                <div class="flex-1 flex items-center bg-[#040B08]/90 border border-emerald-500/30 rounded-2xl px-4 py-3.5 focus-within:border-[#10E775] transition-all shadow-inner">
                                    <span class="material-symbols-outlined text-[#10E775] text-2xl mr-3">psychology</span>
                                    <input id="ai-workout-input" type="text" value="${lastAiQuery}" placeholder="Ej: 1 hora de funcional, 45 min de pesas de pecho y espalda, jugué 1 hora de fútbol..." class="w-full bg-transparent border-none outline-none text-sm font-semibold text-white placeholder:text-emerald-300/40" />
                                </div>
                                <button id="analyze-workout-ai-btn" class="btn-emerald px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider shrink-0 cursor-pointer">
                                    <span class="material-symbols-outlined text-lg">auto_awesome</span>
                                    <span>Calcular con IA</span>
                                </button>
                            </div>

                            <!-- 1-Click Example Workout Chips -->
                            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/75 shrink-0">Ejemplos rápidos:</span>
                                ${[
                                    '⚡ 1 hora de funcional intenso',
                                    '🏋️ 50 min de musculación y pesas',
                                    '⚽ 1 hora de fútbol',
                                    '🚴 45 min de ciclismo / bici fija',
                                    '🚶 45 min de caminata rápida',
                                    '🏃 30 min de trote y cardio HIIT'
                                ].map(sample => `
                                    <button type="button" class="ai-workout-sample-chip px-3 py-1 rounded-full bg-emerald-950/60 hover:bg-[#10E775]/20 border border-emerald-500/20 hover:border-[#10E775]/45 text-[11px] font-semibold text-emerald-100/85 hover:text-white transition-all shrink-0 cursor-pointer" data-query="${sample.replace(/^[^\s]+\s/, '')}">
                                        ${sample}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Dynamic AI Result Container -->
                        <div id="ai-workout-result-container" class="${lastAiWorkoutResult ? 'mt-6' : 'hidden'} relative z-10">
                            ${lastAiWorkoutResult ? renderAiWorkoutAnalysisCard(lastAiWorkoutResult, indices) : ''}
                        </div>
                    </div>

                    <!-- Mode Switcher: Historial IA vs Bitácora de Series Gym -->
                    <div class="flex gap-2 p-1.5 bg-[#040B08]/80 border border-emerald-500/20 rounded-2xl text-xs font-bold">
                        <button id="tab-ai-btn" class="flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                            activeWorkoutTab === 'ai' ? 'btn-emerald shadow-sm' : 'text-emerald-300/70 hover:text-white'
                        }">
                            <span class="material-symbols-outlined text-base align-middle mr-1">auto_awesome</span> Historial de Entrenamientos & Métricas IA
                        </button>
                        <button id="tab-gym-btn" class="flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                            activeWorkoutTab === 'gym' ? 'btn-emerald shadow-sm' : 'text-emerald-300/70 hover:text-white'
                        }">
                            <span class="material-symbols-outlined text-base align-middle mr-1">fitness_center</span> Bitácora de Series & Calculadora 1RM
                        </button>
                    </div>

                    <!-- TAB 1: WORKOUT HISTORY WITH AI BIO-METRICS -->
                    <div id="ai-history-view" class="${activeWorkoutTab === 'ai' ? 'flex' : 'hidden'} flex-col gap-6">
                        <div class="white-card p-6 border border-emerald-500/20">
                            <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                                <div>
                                    <h3 class="text-base font-display font-extrabold text-white uppercase">
                                        Mis Entrenamientos Registrados
                                    </h3>
                                    <p class="text-xs text-emerald-300/70">Desglose de calorías, endorfinas, oxidación de grasa e impacto metabólico</p>
                                </div>
                                <span class="badge-emerald font-mono">${workouts.length} sesiones</span>
                            </div>
                            <div class="flex flex-col gap-3">
                                ${renderWorkoutHistory(workouts)}
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: GYM LOGBOOK & 1RM -->
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

                </div>
            </div>

            ${renderBottomNav('workouts')}
        </main>

        <!-- Add Exercise / Workout Modal -->
        <div id="workout-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"></div>
    </div>
    `;
};

export const renderAiWorkoutAnalysisCard = (ai, indices) => {
    return `
        <div class="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-[#06291B]/95 via-[#04140D]/95 to-[#051F15]/95 border-2 border-[#10E775]/45 shadow-[0_0_35px_rgba(16,231,117,0.18)] animate-scale-up">
            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-emerald-500/20">
                <div class="flex items-center gap-3">
                    <div class="size-12 rounded-2xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,231,117,0.25)]">
                        <span class="material-symbols-outlined text-2xl">${ai.icon || 'bolt'}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35">
                                Análisis Biológico IA
                            </span>
                            <span class="text-xs font-mono text-emerald-300/80">${ai.duration} min · ${ai.met_value || 7} METs</span>
                        </div>
                        <h3 class="text-xl font-display font-extrabold text-white mt-0.5">${ai.name}</h3>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button id="save-ai-workout-btn" class="btn-emerald px-5 py-3 text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-lg">
                        <span class="material-symbols-outlined text-lg">check_circle</span>
                        Guardar en mi Historial (+50 XP)
                    </button>
                </div>
            </div>

            <!-- 6 Physiological & Neurochemical KPIs -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <!-- 1. Calorías Directas -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-[#10E775]/35">
                    <span class="text-[10px] font-extrabold uppercase text-emerald-300/75 flex items-center justify-between">
                        Calorías Sesión
                        <span class="material-symbols-outlined text-sm text-[#10E775]">local_fire_department</span>
                    </span>
                    <p class="text-2xl font-mono font-extrabold text-[#10E775] mt-1">${ai.calories} <small class="text-xs font-normal">kcal</small></p>
                    <span class="text-[10px] text-emerald-300/70">Para tus ${indices.weight} kg</span>
                </div>

                <!-- 2. Efecto Afterburn (EPOC) -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-lime-500/30">
                    <span class="text-[10px] font-extrabold uppercase text-lime-300/80 flex items-center justify-between">
                        Afterburn EPOC
                        <span class="material-symbols-outlined text-sm text-lime-400">bolt</span>
                    </span>
                    <p class="text-2xl font-mono font-extrabold text-lime-400 mt-1">+${ai.epoc_calories || Math.round(ai.calories * 0.14)} <small class="text-xs font-normal">kcal</small></p>
                    <span class="text-[10px] text-emerald-300/70">Total: ${ai.total_metabolic_burn || (ai.calories + (ai.epoc_calories || 0))} kcal</span>
                </div>

                <!-- 3. Endorfinas & Dopamina -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-teal-500/35 col-span-2 sm:col-span-1 lg:col-span-2">
                    <span class="text-[10px] font-extrabold uppercase text-teal-300 flex items-center justify-between">
                        Endorfinas & Neuroquímica
                        <span class="material-symbols-outlined text-sm text-teal-300">mood</span>
                    </span>
                    <p class="text-sm font-mono font-extrabold text-teal-200 mt-1.5 leading-snug">${ai.endorphins_score}</p>
                    <span class="text-[10px] text-emerald-300/70 block mt-0.5">β-Endorfinas · Serotonina · ↓ Cortisol</span>
                </div>

                <!-- 4. Grasa Oxidada & Glucógeno -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-emerald-500/25">
                    <span class="text-[10px] font-extrabold uppercase text-emerald-300/75 flex items-center justify-between">
                        Grasa Oxidada
                        <span class="material-symbols-outlined text-sm text-[#34D399]">water_drop</span>
                    </span>
                    <p class="text-xl font-mono font-extrabold text-[#34D399] mt-1">${ai.fat_oxidized_g}g <small class="text-[10px] font-normal text-emerald-300/70">grasa</small></p>
                    <span class="text-[10px] text-emerald-300/70">Glucógeno: ${ai.glycogen_used_g}g</span>
                </div>

                <!-- 5. Sudoración & Recuperación -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-emerald-500/25">
                    <span class="text-[10px] font-extrabold uppercase text-emerald-300/75 flex items-center justify-between">
                        Rehidratación
                        <span class="material-symbols-outlined text-sm text-teal-300">water_full</span>
                    </span>
                    <p class="text-xl font-mono font-extrabold text-white mt-1">${ai.hydration_loss_ml} <small class="text-xs font-normal">ml</small></p>
                    <span class="text-[10px] text-emerald-300/70">Recup: ${ai.recovery_hours}</span>
                </div>
            </div>

            <!-- Detailed Neuro-Endocrine & Metabolic Insights -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div class="p-4 rounded-2xl bg-[#040B08]/70 border border-teal-500/25">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-base">🧠</span>
                        <h4 class="text-xs font-extrabold uppercase tracking-wider text-teal-300">Liberación de Endorfinas y Bienestar</h4>
                    </div>
                    <p class="text-xs text-emerald-100/90 leading-relaxed">${ai.endorphins_detail}</p>
                    <div class="mt-2.5 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px]">
                        <span class="text-emerald-300/75 font-semibold">Zona Cardíaca Estimada:</span>
                        <span class="font-mono font-bold text-[#10E775]">${ai.heart_rate_zone}</span>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-[#040B08]/70 border border-emerald-500/25">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-base">🧬</span>
                        <h4 class="text-xs font-extrabold uppercase tracking-wider text-[#10E775]">Impacto en tu Composición Corporal y Nutrición</h4>
                    </div>
                    <p class="text-xs text-emerald-100/90 leading-relaxed">${ai.metabolic_impact}</p>
                    <p class="text-[11px] text-lime-300 font-semibold mt-2 pt-2 border-t border-emerald-500/15">
                        🥗 Post-Entreno: ${ai.post_workout_nutrition}
                    </p>
                </div>
            </div>

            <!-- Activated Muscle Groups -->
            ${Array.isArray(ai.muscle_groups) && ai.muscle_groups.length ? `
                <div class="mt-3.5 pt-3 border-t border-emerald-500/15 flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Músculos y Sistemas Activados:</span>
                    ${ai.muscle_groups.map(m => `
                        <span class="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/25 text-[11px] font-semibold text-emerald-200">
                            💪 ${m}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
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

const getWorkoutIcon = (workout) => {
    if (workout.icon) return workout.icon;
    const name = (workout.name || workout.type || '').toLowerCase();
    if (name.includes('bici') || name.includes('cicl')) return 'directions_bike';
    if (name.includes('futbol') || name.includes('fútbol') || name.includes('soccer') || name.includes('pelota')) return 'sports_soccer';
    if (name.includes('run') || name.includes('trote') || name.includes('correr') || name.includes('caminata')) return 'sprint';
    if (name.includes('funcional') || name.includes('hiit') || name.includes('quema')) return 'bolt';
    return 'fitness_center';
};

const renderWorkoutHistory = (workouts) => {
    if (!workouts.length) return `<p class="text-xs text-emerald-300/50 italic py-6 text-center">Sin entrenamientos recientes. Escribe arriba qué ejercicio hiciste hoy (ej. "1 hora de funcional") para calcularlo con IA.</p>`;

    return workouts.slice(-12).reverse().map(w => {
        const details = w.details || {};
        return `
        <div class="p-4 bg-[#040B08]/75 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="size-11 rounded-2xl bg-[#10E775]/15 text-[#10E775] flex items-center justify-center border border-[#10E775]/30 shrink-0">
                        <span class="material-symbols-outlined text-xl">${getWorkoutIcon(w)}</span>
                    </div>
                    <div>
                        <h5 class="text-sm font-bold text-white capitalize">${w.name || w.type}</h5>
                        <p class="text-[11px] font-mono text-emerald-300/70">${w.date || 'Hoy'} · ${w.duration || 30} min</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <span class="text-sm font-mono font-extrabold text-[#10E775] block">-${w.calories} kcal</span>
                        ${details.epoc_calories ? `<span class="text-[10px] font-mono text-lime-400">+${details.epoc_calories} kcal EPOC</span>` : ''}
                    </div>
                    <button class="delete-workout-btn text-emerald-300/50 hover:text-lime-300 transition-colors p-1 cursor-pointer" data-id="${w.id}" title="Eliminar registro">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            </div>

            ${details.endorphins_score || details.fat_oxidized_g ? `
                <div class="pt-2 border-t border-emerald-500/15 flex flex-wrap items-center gap-2 text-[11px]">
                    ${details.endorphins_score ? `
                        <span class="px-2.5 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold">
                            🧠 Endorfinas: ${details.endorphins_score}
                        </span>
                    ` : ''}
                    ${details.fat_oxidized_g ? `
                        <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
                            🔥 ${details.fat_oxidized_g}g grasa oxidada
                        </span>
                    ` : ''}
                    ${details.hydration_loss_ml ? `
                        <span class="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/20 text-emerald-200 font-mono">
                            💧 Sudoración: ${details.hydration_loss_ml} ml
                        </span>
                    ` : ''}
                    ${details.heart_rate_zone ? `
                        <span class="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/20 text-emerald-300/80 font-mono">
                            ❤️ ${details.heart_rate_zone}
                        </span>
                    ` : ''}
                </div>
            ` : ''}
        </div>
        `;
    }).join('');
};

export const openAddWorkoutModal = (modalContainer, onSavedCallback) => {
    const state = getState();
    const latestM = getLatestMeasurement();
    const indices = calculateBodyIndices(latestM || {}, state.profile);
    let modalAiResult = null;

    modalContainer.innerHTML = `
        <div class="white-card card-glow-emerald p-6 w-full max-w-2xl relative animate-scale-up shadow-2xl border border-emerald-500/35 my-6 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                <div class="flex items-center gap-2.5">
                    <div class="size-10 rounded-2xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35 flex items-center justify-center">
                        <span class="material-symbols-outlined text-xl">psychology</span>
                    </div>
                    <div>
                        <h3 class="text-base font-display font-extrabold text-white uppercase">¿Qué ejercicio has hecho hoy?</h3>
                        <p class="text-[11px] text-emerald-300/70">IA personalizada a tu peso (${indices.weight} kg), masa magra (${indices.leanMass} kg) y metabolismo</p>
                    </div>
                </div>
                <button id="close-workout-modal" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <!-- AI Input inside Modal -->
            <div class="flex flex-col gap-3">
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="modal-ai-wo-input" type="text" placeholder="Ej: 1 hora de funcional, 45 min de pesas, 1 hora de fútbol..." class="flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none">
                    <button id="modal-analyze-wo-btn" class="btn-emerald px-5 py-3 text-xs font-extrabold uppercase tracking-wider shrink-0 cursor-pointer">
                        <span class="material-symbols-outlined text-base">auto_awesome</span>
                        Calcular con IA
                    </button>
                </div>

                <div class="flex flex-wrap gap-1.5">
                    ${[
                        '1 hora de funcional',
                        '45 min de musculación y pesas',
                        '1 hora de fútbol',
                        '45 min de ciclismo',
                        '40 min de caminata rápida'
                    ].map(q => `
                        <button type="button" class="modal-wo-sample-chip px-2.5 py-1 rounded-xl bg-emerald-950/70 hover:bg-[#10E775]/20 border border-emerald-500/25 text-[11px] font-semibold text-emerald-100 cursor-pointer" data-query="${q}">
                            ⚡ ${q}
                        </button>
                    `).join('')}
                </div>

                <div id="modal-ai-wo-result" class="hidden mt-2"></div>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    const inputEl = document.getElementById('modal-ai-wo-input');
    const analyzeBtn = document.getElementById('modal-analyze-wo-btn');
    const resultBox = document.getElementById('modal-ai-wo-result');

    const runModalAnalysis = async (queryText) => {
        const text = (queryText || inputEl?.value || '').trim();
        if (!text) return;

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">refresh</span> Calculando...`;

        try {
            modalAiResult = await analyzeWorkoutWithAI(text, state);
            resultBox.innerHTML = renderAiWorkoutAnalysisCard(modalAiResult, indices);
            resultBox.classList.remove('hidden');

            resultBox.querySelector('#save-ai-workout-btn')?.addEventListener('click', async () => {
                const saved = await addWorkout({
                    name: modalAiResult.name,
                    duration: modalAiResult.duration,
                    calories: modalAiResult.calories,
                    icon: modalAiResult.icon || 'bolt',
                    type: 'ai_workout',
                    details: modalAiResult
                });
                modalContainer.classList.add('hidden');
                window.showAlert?.(
                    '¡Entrenamiento IA Guardado!',
                    `${modalAiResult.name}: -${modalAiResult.calories} kcal (+${modalAiResult.epoc_calories} EPOC) · ${modalAiResult.endorphins_score}`,
                    'success'
                );
                if (onSavedCallback) onSavedCallback(saved);
            });
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span> Calcular con IA`;
        }
    };

    analyzeBtn?.addEventListener('click', () => runModalAnalysis());
    inputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') runModalAnalysis();
    });

    modalContainer.querySelectorAll('.modal-wo-sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (inputEl) inputEl.value = chip.dataset.query;
            runModalAnalysis(chip.dataset.query);
        });
    });

    document.getElementById('close-workout-modal').onclick = () => modalContainer.classList.add('hidden');
};

export const attachWorkoutsEvents = () => {
    const state = getState();
    const modal = document.getElementById('workout-modal');
    const aiInput = document.getElementById('ai-workout-input');
    const analyzeBtn = document.getElementById('analyze-workout-ai-btn');
    const resultContainer = document.getElementById('ai-workout-result-container');

    const latestMeas = getLatestMeasurement();
    const indices = calculateBodyIndices(latestMeas || {}, state.profile);

    const bindSaveAiResult = () => {
        document.getElementById('save-ai-workout-btn')?.addEventListener('click', async () => {
            if (!lastAiWorkoutResult) return;
            await addWorkout({
                name: lastAiWorkoutResult.name,
                duration: lastAiWorkoutResult.duration,
                calories: lastAiWorkoutResult.calories,
                icon: lastAiWorkoutResult.icon || 'bolt',
                type: 'ai_workout',
                details: lastAiWorkoutResult
            });
            const savedCopy = lastAiWorkoutResult;
            lastAiWorkoutResult = null;
            lastAiQuery = '';
            window.showAlert?.(
                '¡Entrenamiento Registrado!',
                `${savedCopy.name} (-${savedCopy.calories} kcal · ${savedCopy.endorphins_score}) guardado en tu historial.`,
                'success'
            );
            window.router.navigate('workouts');
        });
    };

    if (lastAiWorkoutResult) {
        bindSaveAiResult();
    }

    const triggerAiWorkoutAnalysis = async (customText) => {
        const query = (customText !== undefined ? customText : aiInput?.value || '').trim();
        if (!query) return;
        lastAiQuery = query;

        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">refresh</span><span>Calculando...</span>`;
        }

        try {
            const analysis = await analyzeWorkoutWithAI(query, state);
            lastAiWorkoutResult = analysis;
            if (resultContainer) {
                resultContainer.innerHTML = renderAiWorkoutAnalysisCard(analysis, indices);
                resultContainer.classList.remove('hidden');
                bindSaveAiResult();
            }
        } catch (err) {
            window.showAlert?.('Error de Análisis', err.message || 'No se pudo analizar el entrenamiento.', 'error');
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<span class="material-symbols-outlined text-lg">auto_awesome</span><span>Calcular con IA</span>`;
            }
        }
    };

    analyzeBtn?.addEventListener('click', () => triggerAiWorkoutAnalysis());
    aiInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerAiWorkoutAnalysis();
    });

    document.querySelectorAll('.ai-workout-sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const q = chip.dataset.query;
            if (aiInput) aiInput.value = q;
            triggerAiWorkoutAnalysis(q);
        });
    });

    document.getElementById('tab-ai-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'ai';
        window.router.navigate('workouts');
    });

    document.getElementById('tab-gym-btn')?.addEventListener('click', () => {
        activeWorkoutTab = 'gym';
        window.router.navigate('workouts');
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
