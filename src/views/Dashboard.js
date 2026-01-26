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
    const stats = getDailyStats(selectedDate);

    // Tip Logic
    const tipData = state.dailyTip || { date: null, content: null };
    const displayTip = (tipData.date === selectedDate && tipData.content)
        ? tipData.content
        : "Analizando tu progreso para darte el mejor consejo...";

    // Calculate Progress
    const calProgress = Math.min((stats.calories / state.profile.calorieGoal) * 100, 100);
    const remainingCals = Math.max(0, state.profile.calorieGoal - stats.calories);

    // Goal values
    const pGoal = state.profile.proteinGoal || 150;
    const cGoal = state.profile.carbsGoal || 200;
    const fGoal = state.profile.fatGoal || 70;

    return `
    <div class="flex h-screen w-full bg-black text-white font-body overflow-hidden">
        <!-- Sidebar (Desktop) -->
        <aside class="hidden lg:flex w-80 flex-col justify-between border-r border-white/5 bg-black/40 backdrop-blur-3xl p-8 relative z-30">
            <div class="flex flex-col gap-12">
                <div class="flex items-center gap-5">
                    <div class="relative group">
                        <div class="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-all rounded-full"></div>
                        <img src="/lucas.jpeg" alt="Profile" class="w-16 h-16 rounded-[24px] border border-white/10 object-cover relative z-10 shadow-2xl" fetchpriority="high">
                    </div>
                    <div>
                        <h1 class="text-white font-display text-2xl leading-none mb-1 uppercase italic tracking-tighter">Lucas</h1>
                        <p class="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Alpha Proto</p>
                    </div>
                </div>
                
                <nav class="flex flex-col gap-2">
                    <a class="flex items-center gap-4 px-5 py-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary group transition-all cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">dashboard</span>
                        <p class="text-[11px] font-black uppercase tracking-widest">Central</p>
                    </a>
                    <a class="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 text-text-dim hover:text-white transition-all cursor-pointer group" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined text-xl">straighten</span>
                        <p class="text-[11px] font-black uppercase tracking-widest">Biometry</p>
                    </a>
                    <a class="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 text-text-dim hover:text-white transition-all cursor-pointer group" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined text-xl">insights</span>
                        <p class="text-[11px] font-black uppercase tracking-widest">Neuralytics</p>
                    </a>
                    <a class="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 text-text-dim hover:text-white transition-all cursor-pointer group" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined text-xl">fitness_center</span>
                        <p class="text-[11px] font-black uppercase tracking-widest">Protocol</p>
                    </a>
                </nav>
            </div>

            <div class="glass-card p-6 bg-gradient-to-t from-primary/5 to-transparent">
                <div class="flex justify-between items-center mb-4">
                    <p class="text-[10px] font-black uppercase tracking-widest text-text-dim">Level ${state.profile.level || 1}</p>
                    <p class="text-[10px] font-mono text-primary font-bold">${state.profile.xp || 0} XP</p>
                </div>
                <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div class="h-full bg-primary shadow-[0_0_15px_rgba(0,255,136,0.5)]" style="width: ${Math.min(100, ((state.profile.xp || 0) % 100))}%"></div>
                </div>
            </div>
        </aside>

        <!-- Main Workspace -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-black">
            <div class="scanline absolute inset-0 z-0 opacity-20 pointer-events-none"></div>

            <!-- Mobile Custom Header -->
            <header class="lg:hidden flex items-center justify-between p-6 bg-black/60 backdrop-blur-2xl border-b border-white/5 relative z-20">
                <div class="flex items-center gap-3">
                    <img src="/lucas.jpeg" class="size-10 rounded-xl border border-white/10">
                    <h1 class="text-white font-display text-lg tracking-tighter italic uppercase">GrowFit</h1>
                </div>
            </header>

            <!-- Workspace Scrollable -->
            <div class="flex-1 overflow-y-auto px-6 md:px-12 py-10 custom-scrollbar relative z-10 pb-32 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-12">
                    
                    <!-- Header Section -->
                    <section class="flex flex-col lg:flex-row gap-8 lg:items-end justify-between stagger-1">
                        <div class="flex flex-col gap-2">
                             <div class="flex items-center gap-3 mb-1">
                                <span class="size-2 bg-primary rounded-full"></span>
                                <p class="text-primary text-[10px] font-black uppercase tracking-[0.4em]">System Active</p>
                             </div>
                             <h2 class="text-white text-5xl md:text-7xl font-display font-black leading-none tracking-tighter uppercase italic">
                                ${state.profile.name}<span class="text-text-dim text-3xl md:text-4xl block not-italic font-light">OPERATIVE STATUS</span>
                             </h2>
                             <div class="flex items-center gap-6 mt-6">
                                <div class="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                                    <button id="prev-day-btn" class="size-10 rounded-full bg-black hover:text-primary transition-all flex items-center justify-center">
                                        <span class="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <p class="text-xs font-black uppercase tracking-widest px-4 text-white">
                                        ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <button id="next-day-btn" class="size-10 rounded-full bg-black hover:text-primary transition-all flex items-center justify-center">
                                        <span class="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                                <button id="open-calendar-btn" class="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                </button>
                             </div>
                        </div>

                        <!-- Neural Input -->
                        <div class="w-full lg:max-w-lg">
                            <div class="relative group">
                                <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-[32px] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                <div class="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[30px] p-2 flex items-center gap-3">
                                    <input id="quick-log-input" class="flex-1 bg-transparent border-none text-white placeholder-text-dim/40 px-6 py-4 font-bold outline-none" placeholder="LOG NEURAL DATA..."/>
                                    <input type="file" id="quick-log-file" accept="image/*" class="hidden">
                                    <label for="quick-log-file" class="size-12 rounded-2xl flex items-center justify-center text-text-dim hover:text-white hover:bg-white/5 cursor-pointer">
                                        <span class="material-symbols-outlined">camera_alt</span>
                                    </label>
                                    <button id="quick-log-btn" class="bg-primary text-black size-14 rounded-[22px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all glow-primary">
                                        <span class="material-symbols-outlined font-black">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Core Bento Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        <!-- Primary Telemetry (Main KCAL) -->
                        <div class="md:col-span-12 lg:col-span-7 glass-card p-10 min-h-[460px] flex flex-col justify-between stagger-2">
                             <div class="relative z-10">
                                <p class="text-primary text-[10px] font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-3">
                                    <span class="size-2 bg-primary rounded-full"></span> Energy Capacitor
                                </p>
                                <h3 class="text-8xl md:text-[10rem] font-display font-black tracking-tighter leading-none italic mb-4">
                                    ${Math.round(stats.calories)}
                                </h3>
                                <div class="flex items-center gap-6">
                                    <div class="flex flex-col">
                                        <p class="text-[10px] font-black text-text-dim uppercase tracking-widest">LIMIT</p>
                                        <p class="text-2xl font-mono font-bold">${state.profile.calorieGoal}</p>
                                    </div>
                                    <div class="w-px h-10 bg-white/10"></div>
                                    <div class="flex flex-col">
                                        <p class="text-[10px] font-black text-text-dim uppercase tracking-widest">AVAILABLE</p>
                                        <p class="text-2xl font-mono font-bold ${remainingCals < 200 ? 'text-red-500' : 'text-primary'}">${remainingCals}</p>
                                    </div>
                                </div>
                             </div>

                             <div class="relative z-10 w-full pt-10">
                                <div class="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest">
                                    <span class="text-text-dim">Extraction Efficiency</span>
                                    <span class="text-primary">${Math.round(calProgress)}%</span>
                                </div>
                                <div class="h-4 w-full bg-white/5 rounded-full p-1 border border-white/10">
                                    <div class="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,255,136,0.3)]" style="width: ${calProgress}%"></div>
                                </div>
                             </div>
                        </div>

                        <!-- Secondary Metrics Column -->
                        <div class="md:col-span-12 lg:col-span-5 grid grid-cols-2 gap-6 stagger-3">
                            <!-- Macro Cards -->
                            <div class="glass-card p-6 flex flex-col justify-between hover:border-emerald-500/30 transition-all border-l-4 border-l-emerald-500/20">
                                <span class="material-symbols-outlined text-emerald-500 mb-4 opacity-50">catching_pokemon</span>
                                <h4 class="text-4xl font-display font-black">${Math.round(stats.protein)}g</h4>
                                <p class="text-[10px] font-black uppercase tracking-widest text-text-dim">Protein</p>
                            </div>
                            <div class="glass-card p-6 flex flex-col justify-between hover:border-blue-400/30 transition-all border-l-4 border-l-blue-400/20">
                                <span class="material-symbols-outlined text-blue-400 mb-4 opacity-50">grain</span>
                                <h4 class="text-4xl font-display font-black">${Math.round(stats.carbs)}g</h4>
                                <p class="text-[10px] font-black uppercase tracking-widest text-text-dim">Carbs</p>
                            </div>
                            <div class="glass-card p-6 flex flex-col justify-between hover:border-orange-500/30 transition-all border-l-4 border-l-orange-500/20">
                                <span class="material-symbols-outlined text-orange-500 mb-4 opacity-50">oil_barrel</span>
                                <h4 class="text-4xl font-display font-black">${Math.round(stats.fat)}g</h4>
                                <p class="text-[10px] font-black uppercase tracking-widest text-text-dim">Fats</p>
                            </div>
                            <div class="glass-card p-6 flex flex-col justify-between bg-blue-600/5 group">
                                <div class="flex justify-between items-start">
                                    <span class="material-symbols-outlined text-blue-500">water_drop</span>
                                    <button id="add-water-btn" class="size-8 rounded-lg bg-blue-500 text-black flex items-center justify-center hover:scale-110 transition-all">
                                        <span class="material-symbols-outlined text-sm font-black">add</span>
                                    </button>
                                </div>
                                <h4 class="text-4xl font-display font-black mt-4">${dayStats.water || 0}ml</h4>
                                <p class="text-[10px] font-black uppercase tracking-widest text-text-dim">Hydration</p>
                            </div>
                        </div>

                        <!-- AI Core & Habits -->
                        <div class="md:col-span-8 glass-card p-10 bg-gradient-to-br from-black to-[#050505] relative overflow-hidden stagger-4">
                            <div class="absolute -bottom-10 -right-10 size-40 bg-primary/5 blur-3xl rounded-full"></div>
                            <div class="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                                <div class="flex-1 w-full">
                                    <h3 class="text-xl font-display font-black italic mb-6">NEURAL BIOMETRICS</h3>
                                    <div class="flex flex-col gap-6">
                                        ${state.habits.slice(0, 3).map(h => {
        const isDone = state.habitLog?.[selectedDate]?.includes(h.id);
        return `
                                                <div class="flex items-center gap-4">
                                                    <button class="habit-btn size-10 rounded-xl border flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-white/40'}" data-id="${h.id}">
                                                        <span class="material-symbols-outlined text-sm font-black">${isDone ? 'check' : h.icon}</span>
                                                    </button>
                                                    <div class="flex-1">
                                                        <p class="text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-primary' : 'text-text-dim'}">${h.name}</p>
                                                        <div class="h-1 w-full bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                                            <div class="h-full bg-primary/40 transition-all ${isDone ? 'w-full' : 'w-0'}"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
    }).join('')}
                                    </div>
                                </div>
                                <div class="w-full md:w-px h-px md:h-32 bg-white/5"></div>
                                <div class="flex-1">
                                    <div class="p-5 rounded-3xl bg-primary/5 border border-primary/10">
                                        <p class="text-primary text-[8px] font-black uppercase tracking-[0.4em] mb-3">AI Intelligence</p>
                                        <p class="text-xs font-medium leading-relaxed italic text-white/80">
                                            "${displayTip}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Dock -->
                        <div class="md:col-span-4 flex flex-col gap-6 stagger-5">
                            <button id="btn-shopping-list" class="flex-1 glass-card p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                                <div class="flex items-center gap-4">
                                    <div class="size-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                        <span class="material-symbols-outlined">shopping_cart</span>
                                    </div>
                                    <p class="text-[11px] font-black uppercase tracking-widest">Sync Store</p>
                                </div>
                                <span class="material-symbols-outlined text-text-dim group-hover:text-primary transition-colors">navigate_next</span>
                            </button>
                            <button id="btn-weekly-report" class="flex-1 glass-card p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                                <div class="flex items-center gap-4">
                                    <div class="size-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                        <span class="material-symbols-outlined">receipt_long</span>
                                    </div>
                                    <p class="text-[11px] font-black uppercase tracking-widest">Datalink Report</p>
                                </div>
                                <span class="material-symbols-outlined text-text-dim group-hover:text-primary transition-colors">navigate_next</span>
                            </button>
                        </div>

                        <!-- Meal Logs (Full Width) -->
                        <div class="md:col-span-12 glass-card p-10 stagger-5">
                            <div class="flex justify-between items-center mb-10">
                                <h3 class="text-3xl font-display font-black italic tracking-tighter">DIETARY LOG</h3>
                                <div class="bg-primary/20 text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                    Protocol Active
                                </div>
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                ${renderMealsList(state, selectedDate)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Bottom Navigation -->
            <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent">
                <div class="glass-card bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[30px] p-2 flex justify-between items-center relative shadow-2xl">
                    <button class="flex-1 flex flex-col items-center gap-1 py-3 text-primary" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined">dashboard</span>
                        <span class="text-[8px] font-black uppercase tracking-widest">Base</span>
                    </button>
                    <button class="flex-1 flex flex-col items-center gap-1 py-3 text-text-dim hover:text-white transition-all" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined">speed</span>
                        <span class="text-[8px] font-black uppercase tracking-widest">Vitals</span>
                    </button>
                    <div class="flex-none -mt-12">
                         <button id="quick-log-btn-mobile" class="size-16 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.3)] border-4 border-black active:scale-90 transition-all">
                            <span class="material-symbols-outlined font-black text-3xl">add</span>
                         </button>
                    </div>
                    <button class="flex-1 flex flex-col items-center gap-1 py-3 text-text-dim hover:text-white transition-all" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined">fitness_center</span>
                        <span class="text-[8px] font-black uppercase tracking-widest">Force</span>
                    </button>
                    <button class="flex-1 flex flex-col items-center gap-1 py-3 text-text-dim hover:text-white transition-all" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined">bolt</span>
                        <span class="text-[8px] font-black uppercase tracking-widest">Neural</span>
                    </button>
                </div>
            </nav>
        </main>
        
        <div id="meal-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"></div>
    </div>
    `;
};

const renderMealsList = (state, selectedDate) => {
    const activeDate = selectedDate || state.selectedDate || new Date().toISOString().split('T')[0];
    const meals = state.dailyLog.filter(m => m.date === activeDate);
    if (!meals.length) return `<p class="text-text-dim text-xs font-bold italic py-10 text-center uppercase tracking-widest opacity-30">No biometric data recorded for this cycle</p>`;

    return meals.map((m, i) => `
        <div class="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all stagger-${(i % 5) + 1}">
            <div class="flex items-center gap-6">
                 <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-lg">${m.type === 'workout' ? 'fitness_center' : 'restaurant'}</span>
                 </div>
                 <div>
                    <h4 class="text-xs font-black uppercase tracking-tight">${m.name}</h4>
                    <p class="text-[10px] font-mono text-text-dim mt-1">${m.calories} KCAL <span class="mx-2 opacity-20">|</span> P:${Math.round(m.macros?.protein || 0)}g C:${Math.round(m.macros?.carbs || 0)}g F:${Math.round(m.macros?.fat || 0)}g</p>
                 </div>
            </div>
            <button class="delete-meal-btn text-text-dim/30 hover:text-red-500 transition-colors" data-id="${m.id}">
                <span class="material-symbols-outlined text-lg">delete</span>
            </button>
        </div>
    `).join('');
};

export const attachDashboardEvents = () => {
    const state = getState();
    const input = document.getElementById('quick-log-input');
    const btn = document.getElementById('quick-log-btn');
    const btnMobile = document.getElementById('quick-log-btn-mobile');
    const fileInput = document.getElementById('quick-log-file');
    const modal = document.getElementById('meal-modal');

    const handleAnalysis = async (text, file) => {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.classList.remove('hidden');

        // Visual Skeleton Feedback
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span>`;
        btn.disabled = true;

        try {
            let result;
            if (file) {
                const base64 = await toBase64(file);
                result = await analyzeFood(base64, 'image', text);
            } else {
                result = await analyzeFood(text, 'text');
            }

            if (result.meals && result.meals.length > 0) {
                showMealConfirmation(result.meals[0]);
            } else {
                window.router.navigate('dashboard');
            }
        } catch (e) {
            window.showAlert('Neural Error', e.message, 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
            btn.innerHTML = `<span class="material-symbols-outlined font-black">add</span>`;
            btn.disabled = false;
        }
    };

    const showMealConfirmation = (mealData) => {
        const total = mealData.macros.protein + mealData.macros.carbs + mealData.macros.fat;
        const pPct = ((mealData.macros.protein / total) * 100) || 0;
        const cPct = ((mealData.macros.carbs / total) * 100) || 0;

        modal.innerHTML = `
            <div class="glass-card p-10 w-full max-w-md relative overflow-hidden">
                 <div class="text-center mb-8">
                    <h3 class="text-white text-3xl font-display font-black italic tracking-tighter uppercase mb-2">${mealData.name}</h3>
                    <p class="text-primary font-mono text-2xl font-black">${mealData.calories} KCAL</p>
                 </div>
                 <div class="flex items-center justify-center p-6 bg-white/5 rounded-[40px] mb-8" style="background: conic-gradient(#10b981 0% ${pPct}%, #60a5fa ${pPct}% ${pPct + cPct}%, #f59e0b ${pPct + cPct}% 100%)">
                    <div class="size-40 bg-black rounded-full flex items-center justify-center border border-white/10">
                        <span class="material-symbols-outlined text-4xl text-primary">analytics</span>
                    </div>
                 </div>
                 <div class="grid grid-cols-3 gap-4 mb-10 text-center">
                    <div><p class="text-[8px] font-black uppercase text-text-dim opacity-50">Protein</p><p class="text-lg font-mono text-emerald-400">${Math.round(mealData.macros.protein)}g</p></div>
                    <div><p class="text-[8px] font-black uppercase text-text-dim opacity-50">Carbs</p><p class="text-lg font-mono text-blue-400">${Math.round(mealData.macros.carbs)}g</p></div>
                    <div><p class="text-[8px] font-black uppercase text-text-dim opacity-50">Fats</p><p class="text-lg font-mono text-orange-400">${Math.round(mealData.macros.fat)}g</p></div>
                 </div>
                 <div class="flex gap-4">
                    <button id="cancel-confirm" class="flex-1 py-4 btn-ghost text-[10px] font-black uppercase tracking-widest">Abort</button>
                    <button id="save-confirm" class="flex-1 py-4 btn-primary text-[10px] font-black uppercase tracking-widest glow-primary">Confirm</button>
                 </div>
            </div>
        `;
        modal.querySelector('#cancel-confirm').onclick = () => modal.classList.add('hidden');
        modal.querySelector('#save-confirm').onclick = () => {
            addMeal(mealData);
            modal.classList.add('hidden');
            window.router.navigate('dashboard');
        };
        modal.classList.remove('hidden');
    };

    // Events
    btn?.addEventListener('click', () => handleAnalysis(input.value, fileInput.files[0]));
    btnMobile?.addEventListener('click', () => input?.focus());
    input?.addEventListener('keypress', (e) => { e.key === 'Enter' && handleAnalysis(input.value, fileInput.files[0]); });

    document.getElementById('btn-shopping-list')?.addEventListener('click', async () => {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.classList.remove('hidden');
        try {
            const { generateShoppingList } = await import('../services/openai');
            const list = await generateShoppingList(state.profile, state.dailyLog);
            modal.innerHTML = `<div class="glass-card p-10 w-full max-w-md relative"><button id="close-modal" class="absolute top-6 right-6 text-text-dim hover:text-white"><span class="material-symbols-outlined">close</span></button><h3 class="text-white text-2xl font-display font-black italic mb-6 uppercase">Shopping protocol</h3><div class="prose prose-invert text-[10px] text-text-dim leading-relaxed max-h-[50vh] overflow-y-auto">${list.replace(/\n/g, '<br>')}</div></div>`;
            modal.querySelector('#close-modal').onclick = () => modal.classList.add('hidden');
            modal.classList.remove('hidden');
        } catch (e) { window.showAlert('Error', 'Sync failed.', 'error'); } finally { if (loader) loader.classList.add('hidden'); }
    });

    document.getElementById('btn-weekly-report')?.addEventListener('click', async () => {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.classList.remove('hidden');
        try {
            const { generateWeeklyReport } = await import('../services/openai');
            const r = await generateWeeklyReport(state);

            modal.innerHTML = `
                <div class="glass-card p-10 w-full max-w-2xl relative overflow-hidden stagger-1">
                    <div class="absolute -top-20 -right-20 size-60 bg-primary/10 blur-[100px] rounded-full"></div>
                    
                    <div class="flex justify-between items-start mb-10">
                        <div>
                            <p class="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                                <span class="size-2 bg-primary rounded-full animate-pulse"></span> Neuralytics Report
                            </p>
                            <h3 class="text-white text-4xl font-display font-black italic tracking-tighter uppercase whitespace-pre-line">Operational\nSummary</h3>
                        </div>
                        <button id="close-modal" class="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-dim hover:text-white transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div class="space-y-6">
                            <div class="p-6 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
                                <p class="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">Neural Analysis</p>
                                <p class="text-sm text-white/90 leading-relaxed italic">"${r.summary}"</p>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p class="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Efficiency</p>
                                    <p class="text-2xl font-display font-black text-primary">${r.kpis.consistency_score}/10</p>
                                </div>
                                <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p class="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Workouts</p>
                                    <p class="text-2xl font-display font-black text-white">${r.kpis.total_workouts}</p>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <h4 class="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Core Strengths</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${r.strengths.map(s => `<span class="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-tight">${s}</span>`).join('')}
                                </div>
                            </div>
                            <div>
                                <h4 class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Integrity Risks</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${r.weaknesses.map(w => `<span class="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-tight">${w}</span>`).join('')}
                                </div>
                            </div>
                            <div class="p-6 bg-primary/10 rounded-3xl border border-primary/20">
                                <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Next Mission</p>
                                <p class="text-white font-bold text-sm leading-tight">${r.mission}</p>
                            </div>
                        </div>
                    </div>

                    <button id="download-report-btn" class="w-full btn-primary py-5 text-[11px] font-black uppercase tracking-[0.2em] glow-primary">
                        Acknowledge Protocol
                    </button>
                </div>
            `;
            modal.querySelector('#close-modal').onclick = () => modal.classList.add('hidden');
            modal.querySelector('#download-report-btn').onclick = () => modal.classList.add('hidden');
            modal.classList.remove('hidden');
        } catch (e) {
            window.showAlert('Datalink Error', 'Failed to synchronize weekly neuralytics.', 'error');
            console.error(e);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    });

    document.getElementById('add-water-btn')?.addEventListener('click', () => {
        const date = state.selectedDate || new Date().toISOString().split('T')[0];
        updateDayStat(date, 'water', (state.days?.[date]?.water || 0) + 250);
        window.router.navigate('dashboard');
    });

    document.querySelectorAll('.habit-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            toggleHabit(e.currentTarget.dataset.id, state.selectedDate);
            window.router.navigate('dashboard');
        });
    });

    document.getElementById('prev-day-btn')?.addEventListener('click', () => {
        const d = new Date(state.selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
        window.router.navigate('dashboard');
    });

    document.getElementById('next-day-btn')?.addEventListener('click', () => {
        const d = new Date(state.selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
        window.router.navigate('dashboard');
    });

    document.querySelectorAll('.delete-meal-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            window.showConfirm('PURGE DATA?', 'Remove this record?', () => {
                deleteMeal(parseInt(e.currentTarget.dataset.id));
                window.router.navigate('dashboard');
            });
        });
    });
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
