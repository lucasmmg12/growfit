import { getState, getDailyStats, addMeal, checkMeasurementStatus, setDailyTip, updateDayStat, getDailyBurn, addWorkout, deleteMeal, updateMeal, toggleHabit, setDailyHabits, setSelectedDate } from '../state';
import { analyzeFood, generateDailyTip, generateSmartHabits } from '../services/openai';

export const renderDashboard = () => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = state.selectedDate || today;
    const isToday = selectedDate === today;

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
    const dayStats = state.days?.[selectedDate] || {};
    const sleepHours = dayStats.sleep || '--';

    const stats = getDailyStats(selectedDate);
    const measurementStatus = checkMeasurementStatus();

    // Tip Logic
    const tipData = state.dailyTip || { date: null, content: null };
    const displayTip = (tipData.date === selectedDate && tipData.content)
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
    <div class="flex h-screen w-full bg-black text-white font-display overflow-hidden fade-in">
        <!-- Side Navigation (Desktop) -->
        <aside class="hidden md:flex w-72 flex-col justify-between border-r border-white/5 bg-black/40 backdrop-blur-2xl p-6">
            <div class="flex flex-col gap-10">
                <div class="flex items-center gap-4 px-2">
                    <div class="relative">
                        <img src="/lucas.jpeg" alt="Profile" class="w-14 h-14 rounded-full border-2 border-primary object-cover shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                        <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-black animate-pulse"></div>
                    </div>
                    <div class="flex flex-col">
                        <p class="text-white font-black text-lg leading-none mb-1">Lucas</p>
                        <p class="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">Alpha Member</p>
                    </div>
                </div>
                
                <nav class="flex flex-col gap-3">
                    <a class="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary group transition-all cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">dashboard</span>
                        <p class="text-sm font-bold tracking-tight">Comando Central</p>
                    </a>
                    <a class="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-text-dim hover:text-white cursor-pointer group" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined text-xl">straighten</span>
                        <p class="text-sm font-bold tracking-tight">Biometría</p>
                    </a>
                    <a class="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-text-dim hover:text-white cursor-pointer group" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined text-xl">insights</span>
                        <p class="text-sm font-bold tracking-tight">Análisis IA</p>
                    </a>
                    <a class="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-text-dim hover:text-white cursor-pointer group" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined text-xl">fitness_center</span>
                        <p class="text-sm font-bold tracking-tight">Entrenamientos</p>
                    </a>
                     <a class="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-text-dim hover:text-white cursor-pointer group" onclick="window.router.navigate('profile')">
                        <span class="material-symbols-outlined text-xl">settings</span>
                        <p class="text-sm font-bold tracking-tight">Protocolos</p>
                    </a>
                </nav>
            </div>

            <!-- Level Card Short -->
            <div class="bg-white/5 border border-white/10 rounded-3xl p-5 mb-4">
                <div class="flex justify-between items-center mb-3">
                    <p class="text-xs font-bold uppercase tracking-widest text-text-dim">Nivel ${state.profile.level || 1}</p>
                    <p class="text-[10px] font-mono text-primary">${state.profile.xp || 0} XP</p>
                </div>
                <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                    <div class="h-full bg-gradient-to-r from-primary to-green-300 shadow-[0_0_10px_rgba(0,255,136,0.3)] transition-all duration-1000" style="width: ${Math.min(100, ((state.profile.xp || 0) % 100))}%"></div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-black">
            <!-- Mobile Header -->
            <div class="md:hidden flex items-center justify-between p-5 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <h1 class="text-primary font-black text-xl tracking-tighter italic">GROWFIT</h1>
                <button class="text-white bg-white/5 p-2 rounded-xl border border-white/10"><span class="material-symbols-outlined">menu</span></button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto px-4 md:px-10 py-8 custom-scrollbar">
                <div class="w-full max-w-7xl mx-auto flex flex-col gap-10">
                    
                    <!-- Top Section: Welcome & Quick Log (The Focal Point) -->
                    <div class="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between mt-2">
                        <div class="flex flex-col gap-1">
                             <p class="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-1">Status: Operational</p>
                             <h2 class="text-white text-4xl md:text-5xl font-black leading-none tracking-tighter">
                                ${isToday ? 'HOLA,' : 'REGISTRO DE'}, <span class="bg-gradient-to-r from-white to-text-dim bg-clip-text text-transparent uppercase">${state.profile.name}</span>
                             </h2>
                             <div class="flex items-center gap-4 mt-3">
                                <button id="prev-day-btn" class="size-8 rounded-full border border-white/10 hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                                    <span class="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <p class="text-text-dim text-sm font-bold uppercase tracking-widest min-w-[160px] text-center">
                                    ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                <button id="next-day-btn" class="size-8 rounded-full border border-white/10 hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                                    <span class="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                                <button id="open-calendar-btn" class="ml-2 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                </button>
                             </div>
                        </div>

                        <!-- Quick Log (Impact Version) -->
                        <div class="w-full lg:max-w-xl group">
                            <div class="relative bg-white/5 rounded-[28px] border border-white/10 p-2 focus-within:border-primary/50 focus-within:shadow-[0_0_30px_rgba(0,255,136,0.1)] transition-all flex items-center gap-2">
                                <div id="image-preview-container" class="hidden absolute -top-16 left-0 animate-scale-up">
                                    <div class="relative bg-black border border-primary/30 p-1.5 rounded-2xl shadow-2xl">
                                        <img id="image-preview" src="" class="h-12 w-12 rounded-xl object-cover" />
                                        <button id="clear-image-btn" class="absolute -top-2 -right-2 bg-red-500 rounded-full size-5 flex items-center justify-center text-white"><span class="material-symbols-outlined text-xs">close</span></button>
                                    </div>
                                </div>
                                <input id="quick-log-input" class="flex-1 bg-transparent border-none text-white placeholder-text-dim/50 focus:ring-0 px-5 py-4 text-lg font-bold outline-none" placeholder="${isToday ? '¿Qué comiste hoy?' : 'Registrar comida...'}"/>
                                <div class="flex items-center gap-1 pr-2">
                                    <label for="quick-log-file" class="p-3 text-text-dim hover:text-white transition-colors cursor-pointer rounded-2xl hover:bg-white/5">
                                        <span class="material-symbols-outlined">add_a_photo</span>
                                    </label>
                                    <input type="file" id="quick-log-file" accept="image/*" class="hidden">
                                     <button id="quick-log-btn" class="bg-primary text-black size-14 rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95">
                                        <span class="material-symbols-outlined font-black">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                            <div id="loading-indicator" class="hidden absolute mt-2 text-primary font-mono text-[10px] animate-pulse flex items-center gap-2">
                                <span class="material-symbols-outlined text-xs">sync</span> PROCESANDO DATOS IA...
                            </div>
                        </div>
                    </div>

                    <!-- BENTO GRID (Main Stats) -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        
                        <!-- Main Fuel Card (2x2) -->
                        <div class="lg:col-span-2 lg:row-span-2 glass-card p-10 relative overflow-hidden flex flex-col justify-between min-h-[440px]">
                            <div class="absolute -top-24 -right-24 size-64 bg-primary/10 blur-[100px] rounded-full"></div>
                            
                            <div class="relative z-10 flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-xl">bolt</span>
                                    <p class="text-primary font-black uppercase text-xs tracking-widest">Consumo Total</p>
                                </div>
                                <h3 class="text-7xl md:text-8xl font-black tracking-tighter font-mono">
                                    ${Math.round(stats.calories)}
                                </h3>
                                <p class="text-text-dim font-bold text-sm">DE ${state.profile.calorieGoal} KCAL <span class="text-primary/50 mx-2">•</span> ${Math.round(calProgress)}%</p>
                            </div>

                            <div class="relative z-10 flex flex-col gap-6 w-full">
                                <div class="flex justify-between items-end">
                                    <div class="flex flex-col gap-1">
                                        <p class="text-text-dim font-bold text-[10px] uppercase tracking-wider">Restantes</p>
                                        <p class="text-3xl font-mono font-bold">${remainingCals}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-text-dim font-bold text-[10px] uppercase tracking-wider">Metabolismo</p>
                                        <p class="text-xl font-mono text-white/80">${getDailyBurn(selectedDate).bmr + getDailyBurn(selectedDate).activity} kcal</p>
                                    </div>
                                </div>
                                <div class="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(0,255,136,0.5)] transition-all duration-1000" style="width: ${calProgress}%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Macro Bento Slots -->
                        <div class="glass-card p-6 flex flex-col justify-between group hover:border-primary/40 transition-all">
                             <div class="flex justify-between items-start">
                                <div class="p-2 bg-emerald-500/10 rounded-xl"><span class="material-symbols-outlined text-emerald-400">protein</span></div>
                                <p class="font-mono text-xl font-black">${Math.round(stats.protein)}<span class="text-[10px] text-text-dim ml-1">g</span></p>
                             </div>
                             <div>
                                <p class="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2">Proteína</p>
                                <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" style="width: ${pProgress}%"></div>
                                </div>
                             </div>
                        </div>

                        <div class="glass-card p-6 flex flex-col justify-between group hover:border-blue-400/40 transition-all">
                             <div class="flex justify-between items-start">
                                <div class="p-2 bg-blue-500/10 rounded-xl"><span class="material-symbols-outlined text-blue-400">grain</span></div>
                                <p class="font-mono text-xl font-black">${Math.round(stats.carbs)}<span class="text-[10px] text-text-dim ml-1">g</span></p>
                             </div>
                             <div>
                                <p class="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2">Carbohidratos</p>
                                <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-blue-400 rounded-full transition-all duration-700" style="width: ${cProgress}%"></div>
                                </div>
                             </div>
                        </div>

                        <div class="glass-card p-6 flex flex-col justify-between group hover:border-orange-400/40 transition-all">
                             <div class="flex justify-between items-start">
                                <div class="p-2 bg-orange-500/10 rounded-xl"><span class="material-symbols-outlined text-orange-400">oil_barrel</span></div>
                                <p class="font-mono text-xl font-black">${Math.round(stats.fat)}<span class="text-[10px] text-text-dim ml-1">g</span></p>
                             </div>
                             <div>
                                <p class="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2">Grasas</p>
                                <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-orange-400 rounded-full transition-all duration-700" style="width: ${fProgress}%"></div>
                                </div>
                             </div>
                        </div>

                        <div class="glass-card p-6 flex flex-col justify-between group hover:border-blue-500/40 transition-all">
                            <div class="flex justify-between items-center mb-4">
                                <div class="p-2 bg-blue-600/10 rounded-xl"><span class="material-symbols-outlined text-blue-500">water_drop</span></div>
                                <button id="add-water-btn" class="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500 transition-all">
                                    <span class="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                            <div>
                                <p class="text-2xl font-mono font-black mb-1">${dayStats.water || 0}<span class="text-[10px] text-text-dim ml-1">ml</span></p>
                                <p class="text-[10px] font-bold uppercase tracking-wider text-text-dim">Hidratación</p>
                            </div>
                        </div>

                        <!-- Second Row Content: Journey & AI Assistant -->
                         <div class="lg:col-span-3 glass-card p-8 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-black to-[#050505]">
                            <div class="flex flex-col gap-4 flex-1">
                                <h3 class="text-2xl font-black tracking-tight">MI VIAJE <span class="text-primary text-sm font-bold uppercase tracking-widest ml-4">Fase I</span></h3>
                                <div class="relative h-2.5 w-full bg-white/5 rounded-full overflow-visible">
                                    ${(() => {
            const s = state.profile.startingWeight || 80;
            const c = state.measurements && state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : s;
            const g = state.profile.targetWeight || 70;
            let pct = s !== g ? Math.max(0, Math.min(100, ((s - c) / (s - g)) * 100)) : 0;

            return `
                                        <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/20 to-primary rounded-full" style="width: ${pct}%"></div>
                                        <div class="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 flex flex-col items-center" style="left: ${pct}%">
                                            <div class="size-10 rounded-full border-2 border-primary overflow-hidden bg-black shadow-[0_0_20px_rgba(0,255,136,0.4)]">
                                                <img src="/lucas.jpeg" class="w-full h-full object-cover">
                                            </div>
                                        </div>
                                    `;
        })()}
                                </div>
                                <div class="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">
                                    <span>START: ${state.profile.startingWeight || 80} KG</span>
                                    <span class="text-white">${state.measurements?.slice(-1)[0]?.weight || '--'} KG</span>
                                    <span>TARGET: ${state.profile.targetWeight || 70} KG</span>
                                </div>
                            </div>
                            <div class="w-full md:w-px h-px md:h-20 bg-white/5"></div>
                            <div class="flex flex-col gap-1 items-center md:items-start">
                                <p class="text-text-dim text-[10px] font-bold uppercase tracking-[0.2em]">Asistente IA</p>
                                <p id="daily-tip-text" class="text-sm font-medium leading-relaxed italic text-white/90 text-center md:text-left max-w-[280px]">
                                    "${displayTip}"
                                </p>
                            </div>
                        </div>

                        <!-- Quick Actions Bento Column -->
                        <div class="flex flex-col gap-4">
                            <button id="btn-shopping-list" class="flex-1 glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all group">
                                <div class="size-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                    <span class="material-symbols-outlined">shopping_cart</span>
                                </div>
                                <div class="text-left">
                                    <p class="text-xs font-black uppercase tracking-widest">Lista Compra</p>
                                    <p class="text-[10px] text-text-dim">IA Optimized</p>
                                </div>
                            </button>
                             <button id="btn-weekly-report" class="flex-1 glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all group">
                                <div class="size-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                    <span class="material-symbols-outlined">assessment</span>
                                </div>
                                <div class="text-left">
                                    <p class="text-xs font-black uppercase tracking-widest">Reporte Semanal</p>
                                    <p class="text-[10px] text-text-dim">Biometric Data</p>
                                </div>
                            </button>
                        </div>

                        <!-- Third Row: Meals Feed & Detailed Sleep/Habits -->
                        <div class="lg:col-span-3 flex flex-col gap-6">
                            <div class="glass-card p-8">
                                <div class="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                     <h3 class="text-2xl font-black italic tracking-tighter">REGISTRO ALIMENTARIO</h3>
                                     <span class="font-mono text-xs text-primary">${state.dailyLog.filter(m => m.date === selectedDate).length} REGISTROS</span>
                                </div>
                                <div class="flex flex-col gap-4">
                                    ${renderMealsList(state, selectedDate)}
                                </div>
                            </div>
                            
                            <!-- Detailed Macro Chart Slot -->
                             <div class="glass-card p-8">
                                <h3 class="text-lg font-black uppercase tracking-widest mb-6">Progresión por Ingesta</h3>
                                <div class="w-full h-56">
                                    <canvas id="macro-line-chart"></canvas>
                                </div>
                             </div>
                        </div>

                        <div class="flex flex-col gap-6">
                            <!-- Sleep Info -->
                            <div class="glass-card p-8 bg-gradient-to-b from-indigo-950/20 to-transparent">
                                <div class="flex items-center gap-4 mb-6">
                                    <div class="p-3 bg-indigo-500/10 rounded-2xl"><span class="material-symbols-outlined text-indigo-400">bedtime</span></div>
                                    <div class="flex-1">
                                        <p class="text-sm font-black uppercase tracking-widest">Descanso</p>
                                        <p class="text-[10px] text-indigo-200/50">8H OBJETIVO</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between">
                                    <h4 class="text-5xl font-mono font-black">${sleepHours}</h4>
                                    <button class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 group flex items-center gap-1">EDITAR <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span></button>
                                </div>
                            </div>

                            <!-- Atomic Habits -->
                            <div class="glass-card p-8 group">
                                <div class="flex justify-between items-center mb-8">
                                    <h3 class="text-sm font-black uppercase tracking-[0.2em]">Hábitos</h3>
                                    <div class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-orange-500 text-lg animate-glow rounded-full">local_fire_department</span>
                                        <span class="text-[10px] font-mono text-orange-400">3d</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-3">
                                    ${state.habits.map(h => {
            const isDone = state.habitLog?.[selectedDate]?.includes(h.id);
            return `
                                        <button class="habit-btn w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${isDone ? 'bg-primary/10 border-primary/40' : 'bg-white/5 border-white/5 hover:border-white/20'}" data-id="${h.id}">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-lg ${isDone ? 'text-primary' : 'text-text-dim'}">${h.icon}</span>
                                                <span class="text-xs font-bold uppercase tracking-wide ${isDone ? 'text-white line-through opacity-50' : 'text-text-dim'}">${h.name}</span>
                                            </div>
                                            <div class="size-5 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-primary border-primary' : 'border-white/10'}">
                                                ${isDone ? '<span class="material-symbols-outlined text-black text-xs font-black">check</span>' : ''}
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

            <!-- Overlays & Modals -->
            <div id="mobile-menu-overlay" class="fixed inset-0 z-40 bg-black/90 backdrop-blur-md hidden transition-all duration-300"></div>
            <div id="mobile-menu" class="fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/10 transform -translate-x-full transition-transform duration-500 ease-out flex flex-col p-8">
                 <div class="flex items-center justify-between mb-12">
                     <h1 class="text-primary font-black text-2xl tracking-tighter italic">GROWFIT</h1>
                     <button id="close-mobile-menu" class="text-text-dim"><span class="material-symbols-outlined">close</span></button>
                </div>
                <!-- Menu Links -->
                <nav class="flex flex-col gap-6">
                    <button class="mobile-nav-link text-left text-2xl font-black uppercase tracking-tighter flex items-center gap-4 text-primary" data-target="dashboard">
                        <span class="material-symbols-outlined">dashboard</span> INICIO
                    </button>
                    <!-- ... rest of mobile menu -->
                </nav>
            </div>
        </main>
        
        <!-- Modal Containers -->
        <div id="meal-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 fade-in"></div>
        <div id="edit-meal-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"></div>
    </div>
    `;
};

const renderMealsList = (state, selectedDate) => {
    const activeDate = selectedDate || state.selectedDate || new Date().toISOString().split('T')[0];
    const meals = state.dailyLog.filter(m => m.date === activeDate);

    if (meals.length === 0) {
        return `<div class="text-text-dim/50 text-xs italic p-4">En espera de datos nutricionales...</div>`;
    }

    const categories = ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Media Tarde", "Cena", "Otros"];
    const grouped = categories.reduce((acc, cat) => {
        acc[cat] = meals.filter(m => m.category === cat || (!m.category && cat === "Otros" && !categories.includes(m.category)));
        return acc;
    }, {});

    return categories.map(cat => {
        const catMeals = grouped[cat];
        if (!catMeals || catMeals.length === 0) return '';

        return `
            <div class="flex flex-col gap-3 mb-4">
                <h4 class="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] pl-1">${cat}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${catMeals.map(meal => `
                        <div class="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="relative z-10">
                                <p class="text-white font-bold text-sm leading-tight mb-1">${meal.name}</p>
                                <p class="text-[10px] font-mono text-text-dim uppercase tracking-wider">${Math.round(meal.macros.protein)}P • ${Math.round(meal.macros.carbs)}C • ${Math.round(meal.macros.fat)}F</p>
                            </div>
                            <div class="flex items-center gap-4 relative z-10">
                                <div class="text-right">
                                    <p class="text-primary font-mono font-bold text-sm">${meal.calories}</p>
                                    <p class="text-[8px] text-text-dim uppercase font-bold tracking-tighter">KCAL</p>
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button class="edit-meal-btn size-8 rounded-lg text-text-dim hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center" data-meal='${JSON.stringify(meal).replace(/'/g, "&#39;")}'>
                                        <span class="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button class="delete-meal-btn size-8 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors flex items-center justify-center" data-id="${meal.id}">
                                        <span class="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
};

export const attachDashboardEvents = () => {
    console.log("Attaching Dashboard Events...");
    const state = getState();

    // --- AI BUTTONS (Event Listeners) ---
    const btnShop = document.getElementById('btn-shopping-list');
    const btnReport = document.getElementById('btn-weekly-report');

    if (btnShop) {
        btnShop.addEventListener('click', async () => {
            console.log("Button Click: Shopping List");
            const loader = document.getElementById('loading-indicator');
            const modal = document.getElementById('meal-modal');
            if (loader) loader.classList.remove('hidden');

            try {
                const { generateShoppingList } = await import('../services/openai');
                const currentState = getState();
                const rawList = await generateShoppingList(currentState.profile, currentState.dailyLog);

                // --- PARSE MARKDOWN TO HTML (Robust Chunking) ---
                // Split by headers (###) to separate categories reliably
                const chunks = rawList.split('### ').filter(c => c.trim().length > 0);

                let styledList = chunks.map(chunk => {
                    const lines = chunk.split('\n').filter(l => l.trim() !== '');
                    const title = lines[0].trim();

                    // Special case for Tip
                    if (title.includes('Tip') || title.includes('Ahorro')) {
                        const tipText = lines.slice(1).join(' ').replace(/"/g, '').trim();
                        // Sometimes the title itself has the text if no newline, handle that if needed, but usually OpenAI puts newline
                        /* If lines length is 1, maybe content is in title line? usually not with ### header */
                        return `<div class="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl animate-pulse" ><h4 class="text-yellow-500 font-bold uppercase text-xs tracking-wider mb-2 flex items-center gap-2"><span class="material-symbols-outlined">savings</span>Tip Sanjuanino</h4><p class="text-sm text-yellow-100/90 italic">"${tipText || title.replace('Tip de Ahorro Sanjuanino', '')}"</p></div> `;
                    }

                    // Normal Category
                    const items = lines.slice(1)
                        .filter(l => l.trim().startsWith('- [ ]'))
                        .map(l => `<li class="flex items-start gap-3 text-sm text-slate-300" ><span class="material-symbols-outlined text-white/20 text-lg mt-[-2px]">check_box_outline_blank</span><span>${l.replace('- [ ] ', '')}</span></li> `)
                        .join('');

                    if (!items) return ''; // Skip empty sections

                    return `<div class="mb-4 p-4 bg-white/5 border border-white/5 rounded-2xl" ><h4 class="text-primary font-bold uppercase text-xs tracking-wider mb-3 border-b border-white/10 pb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm">label</span>${title}</h4><ul class="space-y-2">${items}</ul></div> `;
                }).join('');

                if (modal) {
                    modal.innerHTML = `
    <div class="bg-[#101611] border border-[#28392a] rounded-3xl w-full max-w-md p-0 shadow-2xl relative max-h-[85vh] overflow-hidden flex flex-col" >
                            <!--Header -->
                            <div class="p-6 pb-4 border-b border-white/5 bg-[#1A261C]">
                                <button id="close-ai-modal" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><span class="material-symbols-outlined">close</span></button>
                                <h3 class="text-white text-xl font-black flex items-center gap-2">
                                    <span class="bg-primary/20 text-primary p-2 rounded-xl material-symbols-outlined">shopping_cart</span> 
                                    Lista Inteligente
                                </h3>
                                <p class="text-xs text-text-secondary mt-1 ml-12">Optimizada para tu bolsillo y tus macros.</p>
                            </div>

                            <!--Content -->
                            <div class="p-6 overflow-y-auto custom-scrollbar">
                                ${styledList}
                            </div>

                            <!--Footer -->
    <div class="p-4 border-t border-white/5 bg-[#1A261C]">
        <button onclick="window.copyToClipboard('${rawList.replace(/\n/g, '\\n').replace(/'/g, "\\'")}')" class="w-full bg-primary text-[#102212] py-3.5 rounded-xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
        <span class="material-symbols-outlined text-lg">content_copy</span>
        Copiar al Portapapeles
    </button>
                            </div>
                        </div>
    `;
                    const closeBtn = modal.querySelector('#close-ai-modal');
                    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
                    modal.classList.remove('hidden');
                }
            } catch (e) {
                console.error(e);
                window.showAlert('Error', 'No se pudo generar la lista.', 'error');
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        });
    }

    if (btnReport) {
        btnReport.addEventListener('click', async () => {
            console.log("Button Click: Weekly Report PDF");
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.classList.remove('hidden');

            try {
                // 1. Get Data
                const { generateWeeklyReport } = await import('../services/openai');
                const currentState = getState();
                const reportData = await generateWeeklyReport(currentState);
                console.log("Report Data:", reportData);

                // 2. UI Setup (Modal)

                // 2. Create Modal Structure
                const reportModal = document.createElement('div');
                reportModal.id = 'weekly-report-modal';
                reportModal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 opacity-0 transition-opacity duration-300';

                // Content Container
                const contentDiv = document.createElement('div');
                contentDiv.className = 'bg-[#0f1711] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#28392a] relative shadow-2xl transform scale-95 transition-transform duration-300 custom-scrollbar';

                // Close Button
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '<span class="material-symbols-outlined text-3xl">close</span>';
                closeBtn.className = 'absolute top-4 right-4 text-white hover:text-red-500 z-10 p-2 bg-black/20 rounded-full transition-colors';

                // HTML Template
                const reportHtml = `
    <div style = "padding: 40px;" >
                        <!--Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #28392a; padding-bottom: 20px; margin-bottom: 30px;">
                            <div>
                                <h1 style="font-size: 32px; font-weight: 900; color: #4ade80; margin: 0; text-transform: uppercase; letter-spacing: -1px;">GrowFit</h1>
                                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Reporte de Rendimiento Semanal</p>
                            </div>
                            
                            <!-- Profile Photo -->
                            <div style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #4ade80; overflow: hidden; box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);">
                                <img src="/lucas.jpeg" alt="Lucas" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
                            </div>

                            <div style="text-align: right;">
                                <p style="margin: 0; font-weight: bold; font-size: 18px;">${currentState.profile.name}</p>
                                <p style="margin: 0; color: #64748b; font-size: 12px;">${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <!--KPIs Grid-- >
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px;">
                            <div style="background: #1A261C; padding: 20px; border-radius: 12px; border: 1px solid #28392a;">
                                <p style="margin: 0; color: #4ade80; font-size: 12px; text-transform: uppercase; font-weight: bold;">Promedio Cals</p>
                                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800;">${reportData.kpis.avg_calories}</p>
                            </div>
                            <div style="background: #1A261C; padding: 20px; border-radius: 12px; border: 1px solid #28392a;">
                                <p style="margin: 0; color: #4ade80; font-size: 12px; text-transform: uppercase; font-weight: bold;">Entrenamientos</p>
                                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800;">${reportData.kpis.total_workouts}</p>
                            </div>
                            <div style="background: #1A261C; padding: 20px; border-radius: 12px; border: 1px solid #28392a;">
                                <p style="margin: 0; color: #4ade80; font-size: 12px; text-transform: uppercase; font-weight: bold;">Consistencia</p>
                                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800;">${reportData.kpis.consistency_score}/10</p>
                            </div>
                             <div style="background: #1A261C; padding: 20px; border-radius: 12px; border: 1px solid #28392a;">
                                <p style="margin: 0; color: #4ade80; font-size: 12px; text-transform: uppercase; font-weight: bold;">Mejor Día</p>
                                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 800;">${reportData.kpis.best_day}</p>
                            </div>
                        </div>

                        <!--Summary Section-- >
                        <div style="margin-bottom: 40px;">
                            <h3 style="color: #4ade80; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #28392a; padding-bottom: 10px;">📊 Análisis del Coach</h3>
                            <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px;">${reportData.summary}</p>
                        </div>

                        <!--Chart Section(Canvas)-- >
                        <div style="margin-bottom: 40px; background: #1A261C; padding: 20px; border-radius: 16px; border: 1px solid #28392a;">
                            <h4 style="margin: 0 0 20px 0; font-size: 14px; text-transform: uppercase; color: #94a3b8;">Progreso Calórico (Últimos 7 Días)</h4>
                            <div style="height: 200px; display: flex; align-items: stretch; gap: 10px; padding-bottom: 20px; border-bottom: 1px solid #334155;">
                                ${reportData.calories_chart_data.map(val => {
                    const safeVal = Number(val) || 0;
                    const height = Math.min((safeVal / 3500) * 100, 100);
                    return `
                                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 5px;">
                                            <span style="font-size: 10px; color: #64748b;">${safeVal}</span>
                                            <div style="width: 100%; height: ${height}%; background: #4ade80; border-radius: 4px; opacity: 0.9;"></div>
                                        </div>
                                    `;
                }).join('')}
                            </div>
                        </div>

                        <!--Strengths & Weaknesses-- >
                        <div style="display: flex; gap: 30px; margin-bottom: 40px;">
                            <div style="flex: 1;">
                                <h3 style="color: #4ade80; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #28392a; padding-bottom: 10px;">🔥 Puntos Fuertes</h3>
                                <ul style="list-style: none; padding: 0;">
                                    ${reportData.strengths.map(s => `<li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #cbd5e1;"><span style="color: #4ade80;">✔</span> ${s}</li>`).join('')}
                                </ul>
                            </div>
                            <div style="flex: 1;">
                                <h3 style="color: #fbbf24; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #28392a; padding-bottom: 10px;">⚠️ A Mejorar</h3>
                                <ul style="list-style: none; padding: 0;">
                                    ${reportData.weaknesses.map(w => `<li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #cbd5e1;"><span style="color: #fbbf24;">●</span> ${w}</li>`).join('')}
                                </ul>
                            </div>
                        </div>

                        <!--Mission -->
                        <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); padding: 25px; border-radius: 16px; text-align: center;">
                            <h3 style="color: #4ade80; margin: 0 0 10px 0; font-size: 20px;">🎯 Misión Semanal</h3>
                            <p style="margin: 0; font-size: 16px; font-style: italic; color: #fff;">"${reportData.mission}"</p>
                        </div>
                        
                        <!--Footer -->
    <div style="margin-top: 50px; text-align: center; border-top: 1px solid #28392a; padding-top: 20px; color: #475569; font-size: 10px;">
        Generado por GrowFit AI • San Juan, Argentina
    </div>
                    </div>
    `;

                contentDiv.innerHTML = reportHtml;
                contentDiv.appendChild(closeBtn);
                reportModal.appendChild(contentDiv);
                document.body.appendChild(reportModal);

                // Animation In
                requestAnimationFrame(() => {
                    reportModal.classList.remove('opacity-0');
                    contentDiv.classList.remove('scale-95');
                    contentDiv.classList.add('scale-100');
                });

                // Close Handler
                const closeModal = () => {
                    reportModal.classList.add('opacity-0');
                    contentDiv.classList.remove('scale-100');
                    contentDiv.classList.add('scale-95');
                    setTimeout(() => {
                        if (document.body.contains(reportModal)) {
                            document.body.removeChild(reportModal);
                        }
                    }, 300);
                };

                closeBtn.onclick = closeModal;
                reportModal.onclick = (e) => {
                    if (e.target === reportModal) closeModal();
                };

            } catch (e) {
                console.error(e);
                window.showAlert('Error', 'No se pudo generar el reporte.', 'error');
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        });
    }

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        window.showAlert('Copiado', 'Lista copiada al portapapeles', 'success');
    };

    const input = document.getElementById('quick-log-input');
    const btn = document.getElementById('quick-log-btn');
    const fileInput = document.getElementById('quick-log-file');
    const micBtn = document.getElementById('quick-log-mic');
    const loader = document.getElementById('loading-indicator');
    const modal = document.getElementById('meal-modal');

    // --- MOBILE MENU LOGIC ---
    try {
        const mobileMenuBtn = document.querySelector('.md\\:hidden button'); // The burger button. Note double slash for JS string escape
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
        const mobileLinks = document.querySelectorAll('.mobile-nav-link');

        const toggleMenu = (show) => {
            if (show) {
                mobileMenuOverlay?.classList.remove('hidden');
                setTimeout(() => mobileMenuOverlay?.classList.remove('opacity-0'), 10);
                mobileMenu?.classList.remove('-translate-x-full');
            } else {
                mobileMenuOverlay?.classList.add('opacity-0');
                mobileMenu?.classList.add('-translate-x-full');
                setTimeout(() => mobileMenuOverlay?.classList.add('hidden'), 300);
            }
        };

        mobileMenuBtn?.addEventListener('click', () => toggleMenu(true));
        closeMobileMenuBtn?.addEventListener('click', () => toggleMenu(false));
        mobileMenuOverlay?.addEventListener('click', () => toggleMenu(false));

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                const target = link.dataset.target;
                toggleMenu(false);
                window.router.navigate(target);
            });
        });
    } catch (e) {
        console.warn("Mobile menu init error", e);
    }

    // --- WATER TRACKER LOGIC (Robust) ---
    const waterBtn = document.getElementById('add-water-btn');
    if (waterBtn) {
        waterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const date = state.selectedDate || new Date().toISOString().split('T')[0];
            const currentState = getState();
            const currentWater = (currentState.days?.[date]?.water) || 0;
            const newWater = currentWater + 250;

            console.log(`Adding water: ${currentWater} -> ${newWater} on ${date} `);

            updateDayStat(date, 'water', newWater);

            // Visual Feedback: immediate direct DOM update
            const amountEl = document.getElementById('water-amount');
            const glassesEl = document.getElementById('water-glasses');
            if (amountEl) amountEl.textContent = `${newWater} ml`;
            if (glassesEl) glassesEl.textContent = `${Math.round(newWater / 250)} vasos`;

            // Sync rest of UI
            setTimeout(() => {
                window.router.navigate('dashboard');
            }, 100);
        });
    }

    // Chart Logic
    const ctx = document.getElementById('macro-line-chart');
    if (ctx && typeof Chart !== 'undefined') {
        const stats = getDailyStats(state.selectedDate);
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
                            label: (ctx) => `${ctx.raw.toFixed(1)} g`
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

    // --- AI FEATURES ---
    window.generateShoppingList = async () => {
        console.log("Generating Shopping List...");
        const loader = document.getElementById('loading-indicator');
        const modal = document.getElementById('meal-modal');
        if (loader) loader.classList.remove('hidden');

        try {
            // Lazy load the service
            const { generateShoppingList } = await import('../services/openai');
            const state = getState();

            // Generate list
            const list = await generateShoppingList(state.profile, state.dailyLog); // Pass history for preference detection

            if (modal) {
                modal.innerHTML = `
    <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto" >
                        <button onclick="document.getElementById('meal-modal').classList.add('hidden')" class="absolute top-4 right-4 text-text-secondary hover:text-white"><span class="material-symbols-outlined">close</span></button>
                        <h3 class="text-white text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">shopping_cart</span> Lista Inteligente</h3>
                        <div class="prose prose-invert text-sm text-slate-300">
                            ${list.replace(/\n/g, '<br>')}
                        </div>
                        <button onclick="window.copyToClipboard('${list.replace(/\n/g, '\\n').replace(/'/g, "\\'")}') " class="mt - 4 w - full bg - primary / 10 hover: bg - primary / 20 text - primary py - 3 rounded - xl font - bold transition - colors">Copiar al Portapapeles</button>
                    </div>
    `;
                modal.classList.remove('hidden');
            }
        } catch (e) {
            console.error(e);
            window.showAlert('Error', 'No se pudo generar la lista.', 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    };

    window.generateWeeklyReport = async () => {
        console.log("Generating Weekly Report...");
        const loader = document.getElementById('loading-indicator');
        const modal = document.getElementById('meal-modal');
        if (loader) loader.classList.remove('hidden');

        try {
            const { generateWeeklyReport } = await import('../services/openai');
            const state = getState();
            const report = await generateWeeklyReport(state);

            if (modal) {
                modal.innerHTML = `
    <div class="bg-[#1A261C] border border-[#28392a] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto" >
                       <button onclick="document.getElementById('meal-modal').classList.add('hidden')" class="absolute top-4 right-4 text-text-secondary hover:text-white"><span class="material-symbols-outlined">close</span></button>
                       <h3 class="text-white text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">assessment</span> Reporte Semanal</h3>
                       <div class="prose prose-invert text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                           ${report}
                       </div>
                   </div>
    `;
                modal.classList.remove('hidden');
            }
        } catch (e) {
            console.error(e);
            window.showAlert('Error', 'No se pudo generar el reporte.', 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    };

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        window.showAlert('Copiado', 'Lista copiada al portapapeles', 'success');
    };

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
                const date = state.selectedDate || new Date().toISOString().split('T')[0];
                updateDayStat(date, 'sleep', result.sleep);
            }

            // Handle Workouts (AI Detected)
            if (result.workouts && result.workouts.length > 0) {
                const date = state.selectedDate || new Date().toISOString().split('T')[0];
                result.workouts.forEach(w => {
                    addWorkout({
                        type: 'mixed',
                        name: w.name,
                        duration: w.duration_minutes,
                        calories: w.calories, // AI estimated calories
                        date: date
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
                    window.router.navigate('dashboard');
                    return;
                }
            }

            // Clear inputs
            if (input) input.value = '';
            clearPreview();

        } catch (e) {
            window.showAlert('Error', e.message, 'error');
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
    <div class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-xl text-center text-sm font-bold mb-4" >
        <span class="material-symbols-outlined text-base align-middle mr-1">event</span>
                    Se registrará para: <span class="uppercase">${formattedDate}</span>
                </div>
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
            <div class="glass-card p-10 w-full max-w-md flex flex-col gap-8 relative overflow-hidden">
                <div class="absolute -top-24 -right-24 size-48 bg-primary/10 blur-[80px] rounded-full"></div>
                <button id="modal-close-btn" class="absolute top-6 right-6 text-text-dim hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
                
                <div class="text-center relative z-10">
                    ${dateWarning}
                    <h3 class="text-white text-3xl font-black mb-2 tracking-tighter uppercase italic">${mealData.name}</h3>
                    <div class="inline-flex items-baseline gap-2 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                        <span class="text-primary text-2xl font-black font-mono">${mealData.calories}</span>
                        <span class="text-[10px] font-black text-primary/60 uppercase tracking-widest">Kcal Detected</span>
                    </div>
                </div>

                <div class="flex items-center justify-center py-4 relative z-10">
                    <div class="relative size-56 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,255,136,0.1)] transition-transform hover:scale-105 duration-700" style="${conicStyle}">
                        <div class="size-44 bg-black rounded-full flex items-center justify-center shadow-inner relative z-10 border border-white/5">
                             <div class="flex flex-col items-center">
                                <span class="material-symbols-outlined text-5xl text-primary mb-2">analytics</span>
                                <p class="text-[8px] text-text-dim uppercase font-black tracking-[0.3em]">Neural Split</p>
                             </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4 relative z-10">
                    <div class="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-emerald-500/30 transition-all">
                        <span class="text-[8px] text-text-dim uppercase font-black tracking-widest mb-2">Protein</span>
                        <p class="font-mono text-emerald-400 font-bold text-xl">${Math.round(mealData.macros.protein)}<span class="text-[10px] ml-1">g</span></p>
                    </div>
                     <div class="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-400/30 transition-all">
                        <span class="text-[8px] text-text-dim uppercase font-black tracking-widest mb-2">Carbs</span>
                        <p class="font-mono text-blue-400 font-bold text-xl">${Math.round(mealData.macros.carbs)}<span class="text-[10px] ml-1">g</span></p>
                    </div>
                     <div class="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-orange-500/30 transition-all">
                        <span class="text-[8px] text-text-dim uppercase font-black tracking-widest mb-2">Fats</span>
                        <p class="font-mono text-orange-400 font-bold text-xl">${Math.round(mealData.macros.fat)}<span class="text-[10px] ml-1">g</span></p>
                    </div>
                </div>

                <div class="flex gap-4 mt-2 relative z-10">
                    <button id="modal-cancel-btn" class="flex-1 py-4 btn-ghost text-xs font-black uppercase tracking-widest">
                        Discard
                    </button>
                    <button id="modal-confirm-btn" class="flex-1 py-4 btn-primary text-xs font-black uppercase tracking-widest glow-primary">
                        Confirm Protocol
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Attach Modal Events
        document.getElementById('modal-close-btn').onclick = closeModal;
        document.getElementById('modal-cancel-btn').onclick = closeModal;
        document.getElementById('modal-confirm-btn').onclick = () => {
            addMeal(mealData);
            closeModal();
            window.router.navigate('dashboard');
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
    // --- DATE NAVIGATION LOGIC ---
    const prevBtn = document.getElementById('prev-day-btn');
    const nextBtn = document.getElementById('next-day-btn');
    const calendarBtn = document.getElementById('open-calendar-btn');

    prevBtn?.addEventListener('click', () => {
        const current = new Date(state.selectedDate + 'T12:00:00');
        current.setDate(current.getDate() - 1);
        setSelectedDate(current.toISOString().split('T')[0]);
        window.router.navigate('dashboard');
    });

    nextBtn?.addEventListener('click', () => {
        const current = new Date(state.selectedDate + 'T12:00:00');
        current.setDate(current.getDate() + 1);
        setSelectedDate(current.toISOString().split('T')[0]);
        window.router.navigate('dashboard');
    });

    calendarBtn?.addEventListener('click', () => {
        window.router.navigate('calendar');
    });

    // --- HABIT TRACKER LOGIC ---
    document.querySelectorAll('.habit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            toggleHabit(id, state.selectedDate);
            window.router.navigate('dashboard');
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
            const id = parseInt(e.currentTarget.dataset.id);
            window.showConfirm(
                '¿Eliminar comida?',
                'Esta acción no se puede deshacer y afectará a tus estadísticas diarias.',
                () => {
                    deleteMeal(id);
                    window.router.navigate('dashboard');
                }
            );
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
            window.router.navigate('dashboard');
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
            recText.innerHTML = `¿Por qué no repites < b > "${randomMeal.name}"</b >? <br>Lo comiste hace ${diff} días.`;
        }
        recCard?.classList.remove('hidden');
    };

    // Show on load
    showRecommendation();
    refreshRec?.addEventListener('click', showRecommendation);

    // Tip Generation Logic
    const activeDate = state.selectedDate || new Date().toISOString().split('T')[0];
    const currentTip = state.dailyTip || {};

    if (currentTip.date !== activeDate) {
        // Trigger generation in background
        const stats = getDailyStats(activeDate);
        generateDailyTip(state.profile, stats, state.measurements).then(tip => {
            setDailyTip(tip);
            const tipEl = document.getElementById('daily-tip-text');
            if (tipEl) {
                tipEl.textContent = `"${tip}"`;
                tipEl.classList.add('animate-pulse');
                setTimeout(() => tipEl.classList.remove('animate-pulse'), 1000);
            }
        });
    }
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
