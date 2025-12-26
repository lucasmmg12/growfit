import { getState, getDailyStats, addMeal, checkMeasurementStatus, setDailyTip, updateDayStat, getDailyBurn, addWorkout, deleteMeal, updateMeal, toggleHabit, setDailyHabits } from '../state';
import { analyzeFood, generateDailyTip, generateSmartHabits } from '../services/openai';

export const renderDashboard = () => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];

    // SMART HABITS AUTO-GENERATION
    if (state.lastHabitGenerationDate !== today && !window.hasTriggeredHabits) {
        window.hasTriggeredHabits = true;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const yLog = state.dailyLog?.filter(m => m.date === yesterday) || [];
        const yCals = yLog.reduce((s, m) => s + (m.calories || 0), 0);
        const lastW = state.measurements?.slice(-1)[0]?.weight || 'N/A';

        generateSmartHabits(state.profile, `Ayer: ${yCals}kcal. Peso: ${lastW}`).then(habits => {
            setDailyHabits(habits);
        });
    }
    const dayStats = state.days?.[today] || {};
    const sleepHours = dayStats.sleep || '--';

    const stats = getDailyStats();
    const measurementStatus = checkMeasurementStatus();

    // Tip Logic
    const tipData = state.dailyTip || { date: null, content: null };
    const displayTip = (tipData.date === today && tipData.content)
        ? tipData.content
        : "Analizando tu progreso para darte el mejor consejo...";

    // Calculate Progress
    const calProgress = Math.min((stats.calories / state.profile.calorieGoal) * 100, 100);
    const remainingCals = Math.max(0, state.profile.calorieGoal - stats.calories);

    // Macro calculations with zero checks
    const pGoal = state.profile.proteinGoal || 150;
    const cGoal = state.profile.carbsGoal || 200;
    const fGoal = state.profile.fatGoal || 70;

    const pProgress = Math.min((stats.protein / pGoal) * 100, 100);
    const cProgress = Math.min((stats.carbs / cGoal) * 100, 100);
    const fProgress = Math.min((stats.fat / fGoal) * 100, 100);

    return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
        <!-- Side Navigation (Desktop) -->
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
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 border border-primary/20 group transition-colors cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined text-primary group-hover:text-white">dashboard</span>
                        <p class="text-white text-sm font-medium">Inicio</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined">straighten</span>
                        <p class="text-sm font-medium">Progreso</p>
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
            <!-- Mobile Header -->
            <div class="md:hidden flex items-center justify-between p-4 bg-surface-dark backdrop-blur-md border-b border-[#28392a]">
                <img src="/logogrow.png" alt="GrowFit" class="h-8 object-contain">
                <button class="text-white"><span class="material-symbols-outlined">menu</span></button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto">
                <div class="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-8">
                    
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div class="flex flex-col gap-1">
                            <h2 class="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">Buenos días, ${state.profile.name}</h2>
                            <p class="text-text-secondary text-base">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <!-- Ayuno Tracker Removed -->
                    </div>
                    
                    <!-- Measurements Notification -->
                    ${measurementStatus.isDue ? `
                    <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-bounce-soft">
                        <div class="flex items-center gap-4">
                            <div class="bg-yellow-500/20 p-2 rounded-full">
                                <span class="material-symbols-outlined text-yellow-500">notification_important</span>
                            </div>
                            <div>
                                <h3 class="text-white font-bold text-sm">¡Es hora de medirte!</h3>
                                <p class="text-text-secondary text-xs">Han pasado ${measurementStatus.daysSince || 'varios'} días desde tu último control.</p>
                            </div>
                        </div>
                        <button onclick="window.router.navigate('measurements')" class="bg-yellow-500 hover:bg-yellow-400 text-[#102212] px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Registrar Ahora
                        </button>
                    </div>
                    ` : ''}

                    <!-- Quick Log -->
                    <div class="w-full flex flex-col gap-2">
                         <!-- Image Preview Container -->
                        <div id="image-preview-container" class="hidden w-full flex justify-start px-2">
                            <div class="relative bg-[#1A261C] border border-[#28392a] p-1 rounded-xl">
                                <img id="image-preview" src="" class="h-16 w-auto rounded-lg object-cover opacity-80" />
                                <button id="clear-image-btn" class="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0.5 shadow-lg transition-colors">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>

                        <div class="bg-[#1A261C] p-1.5 rounded-2xl border border-[#28392a] shadow-lg flex items-center gap-2">
                            <input id="quick-log-input" class="flex-1 bg-transparent border-none text-white placeholder-text-secondary focus:ring-0 px-4 py-3 text-lg outline-none" placeholder="¿Qué comiste hoy? (ej. 2 Huevos...)" type="text"/>
                            <div class="flex items-center gap-1 pr-1 border-l border-[#28392a] pl-2 h-full">
                                <label for="quick-log-file" class="p-2 text-text-secondary hover:text-white hover:bg-[#28392a] rounded-lg transition-colors cursor-pointer" title="Subir Foto">
                                    <span class="material-symbols-outlined">image</span>
                                </label>
                                <input type="file" id="quick-log-file" accept="image/*" class="hidden">
                                
                                <button id="quick-log-mic" class="p-2 text-text-secondary hover:text-white hover:bg-[#28392a] rounded-lg transition-colors" title="Voz">
                                    <span class="material-symbols-outlined">mic</span>
                                </button>
                                <button id="quick-log-btn" class="hidden sm:flex bg-primary hover:bg-green-400 text-[#102212] px-6 py-2 rounded-xl font-bold items-center gap-2 transition-colors ml-2">
                                    <span class="material-symbols-outlined text-[20px]">add</span>
                                    Registrar
                                </button>
                            </div>
                        </div>
                        <div id="loading-indicator" class="hidden text-center mt-2 text-primary text-sm font-medium flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined animate-spin text-lg">sync</span>
                            Analizando con IA...
                        </div>
                    </div>

                    <!-- Recommendations Section -->
                    <div id="recommendation-card" class="hidden bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
                        <div class="flex items-center gap-4">
                            <div class="bg-emerald-500/20 p-2 rounded-full">
                                <span class="material-symbols-outlined text-emerald-400">savings</span>
                            </div>
                            <div>
                                <h3 class="text-white font-bold text-sm">Sugerencia Económica</h3>
                                <p id="recommendation-text" class="text-text-secondary text-xs">Analizando historial...</p>
                            </div>
                        </div>
                        <button id="refresh-recommendation" class="text-emerald-400 hover:text-white transition-colors">
                             <span class="material-symbols-outlined">refresh</span>
                        </button>
                    </div>

                    <!-- Energy Expenditure Section -->
                    <div class="grid grid-cols-2 gap-4">
                         <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-4 flex flex-col gap-1">
                            <p class="text-text-secondary text-xs uppercase font-bold tracking-wider">Metabolismo Basal (BMR)</p>
                            <p class="text-white text-xl font-bold">${getState().profile.age ? getDailyBurn(today).bmr : '--'} <span class="text-xs font-normal text-text-secondary">kcal</span></p>
                         </div>
                         <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-4 flex flex-col gap-1">
                            <p class="text-text-secondary text-xs uppercase font-bold tracking-wider">Actividad (+Workouts)</p>
                            <p class="text-primary text-xl font-bold">+${getDailyBurn(today).activity} <span class="text-xs font-normal text-text-secondary">kcal</span></p>
                         </div>
                    </div>

                    <!-- Dashboard Grid (Focus Feed Layout) -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <!-- Left Column (Wide Main Feed) -->
                        <div class="lg:col-span-3 flex flex-col gap-6">
                            
                            <!-- Calories -->
                            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6 relative overflow-hidden group">
                                <div class="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span class="material-symbols-outlined text-[120px] text-white">local_fire_department</span>
                                </div>
                                <div class="flex flex-col gap-6 relative z-10">
                                    <div class="flex justify-between items-end">
                                        <div>
                                            <p class="text-text-secondary text-sm font-medium uppercase tracking-wider mb-1">Resumen Diario</p>
                                            <h3 class="text-white text-3xl font-bold">${Math.round(stats.calories)} <span class="text-text-secondary text-xl font-normal">/ ${state.profile.calorieGoal} kcal</span></h3>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-primary font-bold text-lg">${remainingCals} kcal</p>
                                            <p class="text-text-secondary text-xs">Restantes</p>
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div class="h-4 w-full bg-[#28392a] rounded-full overflow-hidden">
                                            <div class="h-full bg-primary rounded-full transition-all duration-1000" style="width: ${calProgress}%;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Weight Journey (The Journey) -->
                            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6 relative overflow-visible group mt-4 mb-2">
                                <button onclick="window.router.navigate('profile')" class="absolute top-4 right-4 z-20 text-text-secondary hover:text-white transition-colors bg-black/40 p-1.5 rounded-lg backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-primary/50">
                                    <span class="material-symbols-outlined text-sm">edit</span>
                                </button>
                                
                                <div class="flex justify-between items-end mb-8 relative z-10">
                                    <div>
                                        <h3 class="text-white font-bold text-lg flex items-center gap-2">
                                            Mi Viaje
                                            <span class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">Fase 1</span>
                                        </h3>
                                        <p class="text-xs text-text-secondary mt-1">
                                            ${(() => {
            const s = state.profile.startingWeight || 80;
            const c = state.measurements && state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : s;
            const diff = s - c;
            return diff >= 0
                ? `Has perdido <span class="text-white font-bold">${diff.toFixed(1)} kg</span>`
                : `Ajuste: <span class="text-orange-400 font-bold">${diff.toFixed(1)} kg</span> (Actualiza Inicio)`;
        })()}
                                        </p>
                                    </div>
                                    <div class="text-right mr-10 opacity-80">
                                        <p class="text-xs text-text-secondary uppercase font-bold">Meta</p>
                                        <p class="text-xl font-black text-white">${state.profile.targetWeight || 70}<span class="text-sm font-normal text-text-secondary">kg</span></p>
                                    </div>
                                </div>

                                <!-- Progress Bar Visual -->
                                <div class="relative h-2 w-full bg-[#111812] rounded-full my-2 border border-white/5">
                                    ${(() => {
            const s = state.profile.startingWeight || 80;
            const c = state.measurements && state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : s;
            const g = state.profile.targetWeight || 70;

            // Calculate percentage assuming Weight Loss focus
            let pct = 0;
            if (s !== g) {
                pct = ((s - c) / (s - g)) * 100;
            }
            // Clamp
            pct = Math.max(0, Math.min(100, pct));

            return `
                                            <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-primary rounded-full opacity-30" style="width: ${pct}%"></div>
                                            
                                            <!-- LUCAS AVATAR MARKER -->
                                            <div class="absolute top-1/2 transition-all duration-1000 ease-out z-20 flex flex-col items-center group/marker" style="left: ${pct}%; transform: translate(-50%, -50%);">
                                                <div class="relative">
                                                    <div class="size-11 rounded-full border-[3px] border-primary shadow-[0_0_20px_rgba(19,236,37,0.6)] overflow-hidden bg-black relative z-10 transition-transform group-hover/marker:scale-110">
                                                        <img src="/lucas.jpeg" class="w-full h-full object-cover">
                                                    </div>
                                                    <!-- Glow behind -->
                                                    <div class="absolute inset-0 bg-primary/50 blur-md rounded-full -z-10 animate-pulse"></div>
                                                </div>
                                                <!-- Pin/Needle -->
                                                <div class="w-0.5 h-3 bg-primary mb-[-6px]"></div> 
                                            </div>
                                        `;
        })()}
                                </div>

                                <div class="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-wider relative z-10 pt-4">
                                    <span>Inicio: ${state.profile.startingWeight || 80}</span>
                                    <span>${state.profile.targetWeight || 70}</span>
                                </div>
                            </div>
                            
                              <!-- Macro Line Chart -->
                              <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6">
                                <h3 class="text-white font-bold text-lg mb-4">Distribución de Macronutrientes (Gramos)</h3>
                                <div class="w-full h-48">
                                    <canvas id="macro-line-chart"></canvas>
                                </div>
                              </div>
                            
                              <!-- Recent Meals List -->
                              <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6">
                                <h3 class="text-white font-bold text-lg mb-4">Comidas de Hoy</h3>
                                <div class="flex flex-col gap-3">
                                    ${renderMealsList(state)}
                                </div>
                              </div>

                        </div>

                        <!-- Right Column -->
                        <div class="flex flex-col gap-6">
                            <div class="bg-gradient-to-br from-[#1A261C] to-[#132015] border border-primary/30 rounded-2xl p-6 relative">
                                <div class="flex items-center gap-2 mb-4">
                                    <span class="material-symbols-outlined text-primary text-xl">temp_preferences_custom</span>
                                    <p class="text-primary font-bold uppercase text-[10px] tracking-widest">Grow Labs Tip</p>
                                </div>
                                <p id="daily-tip-text" class="text-white text-sm leading-relaxed mb-1 font-medium italic opacity-90">
                                    "${displayTip}"
                                </p>
                            </div>

                            <!-- Sleep Card -->
                            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6 flex flex-col items-center justify-between gap-6 relative overflow-hidden">
                                <div class="absolute top-0 right-0 p-4 opacity-5">
                                    <span class="material-symbols-outlined text-8xl text-indigo-400">bedtime</span>
                                </div>
                                <div class="flex items-center gap-4 w-full relative z-10">
                                    <div class="bg-indigo-500/10 p-3 rounded-full">
                                        <span class="material-symbols-outlined text-indigo-400 text-3xl">bedtime</span>
                                    </div>
                                    <div>
                                        <p class="text-white font-bold text-lg">Sueño / Descanso</p>
                                        <p class="text-text-secondary text-sm">Objetivo: 8 horas</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 w-full justify-between relative z-10">
                                    <div class="text-right">
                                        <p class="text-3xl font-black text-white">${sleepHours}</p>
                                        <p class="text-xs text-text-secondary">horas hoy</p>
                                    </div>
                                    <button class="text-indigo-400 hover:text-white text-xs font-bold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500 px-3 py-2 rounded-lg transition-colors">
                                        Editar
                                    </button>
                                </div>
                            </div>

                            <!-- Water Tracker Row -->
                            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6 flex flex-col items-center justify-between gap-6">
                                <div class="flex items-center gap-4 w-full">
                                    <div class="bg-blue-500/10 p-3 rounded-full">
                                        <span class="material-symbols-outlined text-blue-400 text-3xl">water_full</span>
                                    </div>
                                    <div>
                                        <p class="text-white font-bold text-lg">Hidratación</p>
                                        <p class="text-text-secondary text-sm">Meta: 2,500 ml</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-6 w-full justify-between">
                                    <div class="text-right">
                                        <p id="water-amount" class="text-2xl font-bold text-white">${dayStats.water || 0} ml</p>
                                        <p id="water-glasses" class="text-xs text-text-secondary">${Math.round((dayStats.water || 0) / 250)} vasos</p>
                                    </div>
                                    <button id="add-water-btn" class="bg-[#28392a] hover:bg-[#3b543d] text-white size-10 rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95 transform">
                                        <span class="material-symbols-outlined">add</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Habits Widget -->
                            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl p-6 flex flex-col gap-4 shadow-lg group hover:border-[#3b543d] transition-colors">
                                <div class="flex justify-between items-center mb-1">
                                    <div>
                                        <h3 class="text-white font-bold text-lg">Hábitos Diarios</h3>
                                        <p class="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Atomic Habits</p>
                                    </div>
                                    <div class="flex flex-col items-center">
                                       <span class="material-symbols-outlined text-orange-500 text-3xl animate-pulse dropshadow-glow">local_fire_department</span>
                                       <span class="text-[10px] text-orange-400 font-bold">Racha: 3</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-3">
                                    ${state.habits.map(h => {
            const isDone = state.habitLog?.[today]?.includes(h.id);
            return `
                                        <button class="habit-btn w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group/btn ${isDone ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}" data-id="${h.id}">
                                            <div class="flex items-center gap-3">
                                                <div class="p-2 rounded-lg ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400 group-hover/btn:text-white transition-colors'}">
                                                    <span class="material-symbols-outlined text-lg">${h.icon}</span>
                                                </div>
                                                <span class="text-sm font-medium ${isDone ? 'text-white line-through decoration-green-500/50 opacity-60' : 'text-slate-200'}">${h.name}</span>
                                            </div>
                                            <div class="size-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-600 group-hover/btn:border-primary'}">
                                                ${isDone ? '<span class="material-symbols-outlined text-[#1A261C] text-sm font-bold">check</span>' : ''}
                                            </div>
                                        </button>
                                        `;
        }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        
        <!-- Modal Container (Hidden by default) -->
        <div id="meal-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
            <!-- Content Injected via JS -->
        </div>

        <!-- Edit Meal Modal -->
        <div id="edit-meal-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
            <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <h3 class="text-white text-xl font-bold mb-4">Editar Comida</h3>

                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-text-secondary uppercase font-bold">Nombre</label>
                        <input type="text" id="edit-meal-name" class="bg-background-dark border border-[#28392a] rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-text-secondary uppercase font-bold">Calorías</label>
                        <input type="number" id="edit-meal-cals" class="bg-background-dark border border-[#28392a] rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                    </div>

                    <p class="text-[10px] text-text-secondary italic">Nota: Editar las calorías no recalcula automáticamente los macros.</p>

                    <div class="flex gap-3 mt-2">
                        <button id="close-edit-modal" class="flex-1 py-3 rounded-xl border border-[#28392a] text-text-secondary font-bold hover:text-white transition-colors">Cancelar</button>
                        <button id="save-edit-modal" class="flex-1 py-3 rounded-xl bg-primary text-[#102212] font-bold hover:bg-green-400 transition-colors">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

    </div>
    `;
};

const renderMealsList = (state) => {
    const today = new Date().toISOString().split('T')[0];
    const meals = state.dailyLog.filter(m => m.date === today);

    if (meals.length === 0) {
        return `<div class="text-text-secondary text-sm">No hay comidas registradas hoy.</div>`;
    }

    const categories = ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Media Tarde", "Cena"];
    const grouped = categories.reduce((acc, cat) => {
        acc[cat] = meals.filter(m => m.category === cat || (!m.category && cat === "Otros")); // Handle legacy/missing category
        return acc;
    }, {});

    // Catch-all for meals with unknown categories (legacy)
    const unknown = meals.filter(m => !categories.includes(m.category));
    if (unknown.length > 0) grouped["Otros"] = unknown;
    if (grouped["Otros"]) categories.push("Otros");

    return categories.map(cat => {
        const catMeals = grouped[cat];
        if (!catMeals || catMeals.length === 0) return '';

        return `
            <div class="flex flex-col gap-2 mb-2">
                <h4 class="text-xs font-bold text-primary uppercase tracking-wider pl-1 opacity-80">${cat}</h4>
                <div class="flex flex-col gap-2">
                    ${catMeals.map(meal => `
                        <div class="flex justify-between items-center p-3 bg-background-dark/50 rounded-xl border border-[#28392a] group">
                            <div>
                                <p class="text-white font-medium text-sm">${meal.name}</p>
                                <p class="text-text-secondary text-xs">${Math.round(meal.macros.protein)}g P • ${Math.round(meal.macros.carbs)}g C • ${Math.round(meal.macros.fat)}g F</p>
                            </div>
                            <div class="flex items-center gap-4">
                                <p class="text-primary font-bold text-sm">${meal.calories} kcal</p>
                                
                                <div class="flex items-center gap-1">
                                    <button class="edit-meal-btn p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors" data-id="${meal.id}" data-meal='${JSON.stringify(meal).replace(/'/g, "&#39;")}'>
                                        <span class="material-symbols-outlined text-base">edit</span>
                                    </button>
                                    <button class="delete-meal-btn p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors" data-id="${meal.id}">
                                        <span class="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div >
    `;
    }).join('');
};

export const attachDashboardEvents = () => {
    const state = getState();
    // Quick Log Logic
    const input = document.getElementById('quick-log-input');
    const btn = document.getElementById('quick-log-btn');
    const fileInput = document.getElementById('quick-log-file');
    const micBtn = document.getElementById('quick-log-mic');
    const loader = document.getElementById('loading-indicator');
    const modal = document.getElementById('meal-modal');

    // Chart Logic
    const ctx = document.getElementById('macro-line-chart');
    if (ctx && typeof Chart !== 'undefined') {
        const stats = getDailyStats();
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Proteínas', 'Carbohidratos', 'Grasas'],
                datasets: [{
                    label: 'Gramos Consumidos',
                    data: [stats.protein, stats.carbs, stats.fat],
                    backgroundColor: [
                        'rgba(96, 165, 250, 0.8)', // Blue
                        'rgba(234, 179, 8, 0.8)',  // Yellow
                        'rgba(248, 113, 113, 0.8)' // Red
                    ],
                    borderColor: [
                        'rgba(96, 165, 250, 1)',
                        'rgba(234, 179, 8, 1)',
                        'rgba(248, 113, 113, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 5,
                    barThickness: 40 // Make bars thinner or consistent
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart feels more "list like" and compact
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.toFixed(1)}g`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9db99f' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#ffffff', font: { weight: 'bold' } }
                    }
                }
            }
        });
    }

    // Previous logic...
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const clearImgBtn = document.getElementById('clear-image-btn');

    let stagedFile = null;

    // Logic to close modal
    const closeModal = () => {
        if (modal) {
            modal.classList.add('hidden');
            modal.innerHTML = '';
        }
    }

    const clearPreview = () => {
        stagedFile = null;
        if (fileInput) fileInput.value = ''; // Reset input
        if (previewImg) previewImg.src = '';
        if (previewContainer) previewContainer.classList.add('hidden');
    }

    const handleAnalysis = async (text, file) => {
        try {
            loader.classList.remove('hidden');
            let result;
            if (file) {
                const base64 = await toBase64(file);
                // Pass text as context
                result = await analyzeFood(base64, 'image', text);
            } else {
                result = await analyzeFood(text, 'text');
            }

            // Handle Sleep
            if (result.sleep) {
                const today = new Date().toISOString().split('T')[0];
                updateDayStat(today, 'sleep', result.sleep);
            }

            // Handle Workouts (AI Detected)
            if (result.workouts && result.workouts.length > 0) {
                result.workouts.forEach(w => {
                    addWorkout({
                        type: 'mixed',
                        name: w.name,
                        duration: w.duration_minutes,
                        calories: w.calories, // AI estimated calories
                        date: new Date().toISOString().split('T')[0]
                    });
                });
            }

            // Flow Control
            if (result.meals && result.meals.length > 0) {
                // Show Custom Modal for the first meal
                showMealConfirmation(result.meals[0]);
            } else {
                // Determine if we should reload (Sleep or Workout was added)
                if (result.sleep || (result.workouts && result.workouts.length > 0)) {
                    window.location.reload();
                    return;
                }
            }

            // Clear inputs
            if (input) input.value = '';
            clearPreview();

        } catch (e) {
            alert(e.message);
        } finally {
            loader.classList.add('hidden');
        }
    };

    const showMealConfirmation = (mealData) => {
        if (!modal) return;

        // Date check
        const today = new Date().toISOString().split('T')[0];
        let dateWarning = '';

        if (mealData.date && mealData.date !== today) {
            const dateObj = new Date(mealData.date + 'T12:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

            dateWarning = `
    < div class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-xl text-center text-sm font-bold mb-4" >
        <span class="material-symbols-outlined text-base align-middle mr-1">event</span>
                    Se registrará para: <span class="uppercase">${formattedDate}</span>
                </div >
    `;
        }

        // Calculate Percentages for Pie Chart
        const totalMacros = mealData.macros.protein + mealData.macros.carbs + mealData.macros.fat;
        const pPct = ((mealData.macros.protein / totalMacros) * 100) || 0;
        const cPct = ((mealData.macros.carbs / totalMacros) * 100) || 0;

        // Define colors
        const colorProtein = '#10b981'; // emerald-500
        const colorCarbs = '#6ee7b7';   // emerald-300
        const colorFat = '#065f46';     // emerald-800

        const conicStyle = `background: conic - gradient(
        ${colorProtein} 0 % ${pPct} %,
        ${colorCarbs} ${pPct} % ${pPct + cPct}%,
        ${colorFat} ${pPct + cPct}% 100 %
      )`;

        modal.innerHTML = `
    < div class="bg-[#1A261C]/90 backdrop-blur-xl border border-[#28392a] rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col gap-6 relative" >
            <button id="modal-close-btn" class="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
            
            <div class="text-center mt-2">
                ${dateWarning}
                <h3 class="text-white text-2xl font-bold mb-1 tracking-tight">${mealData.name}</h3>
                <div class="inline-flex items-baseline gap-1 bg-[#28392a] px-3 py-1 rounded-full border border-[#3b543d]">
                    <span class="text-primary text-xl font-black">${mealData.calories}</span>
                    <span class="text-xs font-medium text-text-secondary uppercase">kcal</span>
                </div>
            </div>

            <!--Pie Chart Container-- >
            <div class="flex items-center justify-center py-2">
                <div class="relative size-48 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-transform hover:scale-105 duration-500" style="${conicStyle}">
                    <div class="size-36 bg-[#1A261C] rounded-full flex items-center justify-center shadow-inner relative z-10">
                         <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-4xl text-[#9db99f] mb-1">restaurant</span>
                            <span class="text-[10px] text-text-secondary uppercase tracking-widest">Macro Split</span>
                         </div>
                    </div>
                </div>
            </div>

            <!--Legend with Glass cards-- >
            <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <span class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Proteína</span>
                    <div class="flex items-center gap-1.5 text-emerald-500 font-bold text-lg">
                        <div class="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                        ${Math.round(mealData.macros.protein)}g
                    </div>
                </div>
                 <div class="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <span class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Carbos</span>
                    <div class="flex items-center gap-1.5 text-emerald-300 font-bold text-lg">
                         <div class="size-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.6)]"></div>
                        ${Math.round(mealData.macros.carbs)}g
                    </div>
                </div>
                 <div class="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <span class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Grasas</span>
                    <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-lg">
                         <div class="size-2 rounded-full bg-emerald-800 shadow-[0_0_8px_rgba(6,95,70,0.6)]"></div>
                        ${Math.round(mealData.macros.fat)}g
                    </div>
                </div>
            </div>

            <div class="flex gap-4 mt-2">
                <button id="modal-cancel-btn" class="flex-1 py-3.5 rounded-xl border border-[#28392a] text-text-secondary font-bold hover:bg-[#28392a] hover:text-white transition-all text-sm uppercase tracking-wide">
                    Cancelar
                </button>
                <button id="modal-confirm-btn" class="flex-1 py-3.5 rounded-xl bg-primary text-[#102212] font-black hover:bg-[#10d420] transition-all shadow-[0_0_20px_rgba(19,236,37,0.3)] hover:shadow-[0_0_25px_rgba(19,236,37,0.5)] transform hover:-translate-y-0.5 text-sm uppercase tracking-wide">
                    Confirmar
                </button>
            </div>
        </div >
    `;

        modal.classList.remove('hidden');

        // Attach Modal Events
        document.getElementById('modal-close-btn').onclick = closeModal;
        document.getElementById('modal-cancel-btn').onclick = closeModal;
        document.getElementById('modal-confirm-btn').onclick = () => {
            addMeal(mealData);
            closeModal();
            window.location.reload();
        };
    }

    btn?.addEventListener('click', () => {
        if (!input.value && !stagedFile) return;
        handleAnalysis(input.value, stagedFile);
    });

    // Allow 'Enter' key
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btn.click();
    });

    // File input trigger - NOW STAGES FILE, DOESNT AUTO SUBMIT
    fileInput?.addEventListener('change', () => {
        if (fileInput.files.length) {
            const file = fileInput.files[0];
            stagedFile = file;

            // Show Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg) previewImg.src = e.target.result;
                if (previewContainer) previewContainer.classList.remove('hidden');
                // Optional: Auto focus input
                if (input) input.focus();
            };
            reader.readAsDataURL(file);
        }
    });

    // Clear image
    clearImgBtn?.addEventListener('click', clearPreview);

    // Mic logic reuse
    if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';

        micBtn.addEventListener('click', () => {
            micBtn.classList.add('text-red-500');
            recognition.start();
        });

        recognition.onresult = (e) => {
            input.value = e.results[0][0].transcript;
            micBtn.classList.remove('text-red-500');
        };
        recognition.onend = () => micBtn.classList.remove('text-red-500');
    }
    // --- HABIT TRACKER LOGIC ---
    document.querySelectorAll('.habit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Optimistic UI toggle could be done here, but reload is safer for sync
            toggleHabit(id);
            window.location.reload();
        });
    });

    // --- MEAL MANAGEMENT LOGIC ---
    let currentEditId = null;
    const editModal = document.getElementById('edit-meal-modal');
    const editName = document.getElementById('edit-meal-name');
    const editCals = document.getElementById('edit-meal-cals');
    const saveEditBtn = document.getElementById('save-edit-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');

    // Delete Handlers
    document.querySelectorAll('.delete-meal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('¿Estás seguro de eliminar esta comida?')) {
                const id = parseInt(e.currentTarget.dataset.id);
                deleteMeal(id);
                window.location.reload();
            }
        });
    });

    // Edit Handlers
    document.querySelectorAll('.edit-meal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const raw = e.currentTarget.dataset.meal;
            if (!raw) return;
            const meal = JSON.parse(raw);

            currentEditId = meal.id;
            if (editName) editName.value = meal.name;
            if (editCals) editCals.value = meal.calories;

            editModal?.classList.remove('hidden');
        });
    });

    // Save Edit
    saveEditBtn?.addEventListener('click', () => {
        if (!currentEditId) return;
        const name = editName.value;
        const cals = parseInt(editCals.value);

        if (name && cals) {
            updateMeal(currentEditId, { name, calories: cals });
            window.location.reload();
        } else {
            alert('Por favor completa los campos.');
        }
    });

    // Close Edit
    closeEditBtn?.addEventListener('click', () => {
        editModal?.classList.add('hidden');
    });

    // Recommendation Logic (Budget Friendly)
    const recCard = document.getElementById('recommendation-card');
    const recText = document.getElementById('recommendation-text');
    const refreshRec = document.getElementById('refresh-recommendation');

    const showRecommendation = () => {
        if (!state.dailyLog || state.dailyLog.length === 0) return;

        // Find distinct meals from history (roughly)
        const candidates = state.dailyLog.filter(m => m.calories > 200 && m.date !== today);
        if (candidates.length === 0) {
            if (recText) recText.textContent = "Registra más comidas para recibir sugerencias.";
            recCard?.classList.remove('hidden');
            return;
        }

        const randomMeal = candidates[Math.floor(Math.random() * candidates.length)];
        // Calculate "days ago"
        const mDate = new Date(randomMeal.date);
        const diff = Math.ceil(Math.abs(new Date() - mDate) / (1000 * 60 * 60 * 24));

        if (recText) {
            recText.innerHTML = `¿Por qué no repites <b>"${randomMeal.name}"</b>? <br>Lo comiste hace ${diff} días.`;
        }
        recCard?.classList.remove('hidden');
    };

    // Show on load
    showRecommendation();

    refreshRec?.addEventListener('click', showRecommendation);

    // Tip Generation Logic
    // ... existing tip logic ...
    const today = new Date().toISOString().split('T')[0];
    const currentTip = state.dailyTip || {};

    if (currentTip.date !== today) {
        // Trigger generation in background
        const stats = getDailyStats();
        generateDailyTip(state.profile, stats, state.measurements).then(tip => {
            setDailyTip(tip);
            const tipEl = document.getElementById('daily-tip-text');
            if (tipEl) {
                tipEl.textContent = `"${tip}"`;
                tipEl.classList.add('animate-pulse'); // Visual feedback
                setTimeout(() => tipEl.classList.remove('animate-pulse'), 1000);
            }
        });
    }


    // Water Tracker Logic
    const waterBtn = document.getElementById('add-water-btn');
    if (waterBtn) {
        waterBtn.addEventListener('click', () => {
            // Re-fetch state to get latest daily stats freshly
            const currentState = getState();
            const today = new Date().toISOString().split('T')[0];
            const currentWater = currentState.days?.[today]?.water || 0;
            const newWater = currentWater + 250;

            updateDayStat(today, 'water', newWater);

            // Update UI directly
            const amountEl = document.getElementById('water-amount');
            const glassesEl = document.getElementById('water-glasses');

            if (amountEl) amountEl.textContent = `${newWater} ml`;
            if (glassesEl) glassesEl.textContent = `${Math.round(newWater / 250)} vasos`;
        });
    }
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
