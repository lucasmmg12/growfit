import { getState, setSelectedDate } from '../state';

export const renderCalendar = () => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = state.selectedDate || today;

    // Default to the month of the selected date or today
    const displayDate = new Date(selectedDate + 'T12:00:00');
    const month = displayDate.getMonth();
    const year = displayDate.getFullYear();

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Calendar logic
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust for Monday start: (d + 6) % 7
    const startOffset = (firstDay + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev Month padding
    for (let i = startOffset; i > 0; i--) {
        days.push({ day: prevMonthDays - i + 1, currentMonth: false, month: month - 1, year });
    }

    // Current Month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ day: i, currentMonth: true, month, year });
    }

    // Next Month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, currentMonth: false, month: month + 1, year });
    }

    // Prepare data for indicators
    const mealDates = new Set(state.dailyLog?.map(m => m.date) || []);
    const workoutDates = new Set(state.workouts?.map(w => w.date) || []);
    const measurementDates = new Set(state.measurements?.map(m => m.date) || []);

    return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
        <!-- Side Navigation (Desktop) - Reusing common layout piece -->
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

            <div class="flex-1 overflow-y-auto">
                <div class="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-8">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col">
                            <h2 class="text-white text-3xl font-black tracking-tight">Calendario</h2>
                            <p class="text-text-secondary text-sm">Explora tu progreso histórico</p>
                        </div>
                        <button onclick="window.router.navigate('dashboard')" class="p-2 px-4 rounded-xl bg-[#28392a] text-white hover:bg-primary/20 transition-all flex items-center gap-2 font-bold text-sm">
                            <span class="material-symbols-outlined text-sm">arrow_back</span>
                            Volver
                        </button>
                    </div>

                    <!-- Calendar Card -->
                    <div class="bg-[#1A261C] border border-[#28392a] rounded-3xl overflow-hidden shadow-2xl">
                        <!-- Calendar Controls -->
                        <div class="p-6 border-b border-[#28392a] flex items-center justify-between bg-black/20">
                            <h3 class="text-white text-xl font-bold flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">calendar_today</span>
                                ${monthNames[month]} <span class="text-text-secondary font-normal">${year}</span>
                            </h3>
                            <div class="flex items-center gap-2">
                                <button id="cal-prev-month" class="p-2 rounded-xl bg-surface-dark hover:bg-[#28392a] text-white transition-colors">
                                    <span class="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button id="cal-today" class="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-[#102212] font-bold text-xs transition-colors uppercase tracking-widest">
                                    Hoy
                                </button>
                                <button id="cal-next-month" class="p-2 rounded-xl bg-surface-dark hover:bg-[#28392a] text-white transition-colors">
                                    <span class="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <!-- Calendar Grid -->
                        <div class="p-4 md:p-6 bg-black/10">
                            <!-- Weekdays -->
                            <div class="grid grid-cols-7 mb-4">
                                ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="text-center text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">${d}</div>`).join('')}
                            </div>

                            <!-- Days -->
                            <div class="grid grid-cols-7 gap-2">
                                ${days.map(d => {
        const dateStr = new Date(d.year, d.month, d.day).toISOString().split('T')[0];
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === today;
        const hasMeals = mealDates.has(dateStr);
        const hasWorkouts = workoutDates.has(dateStr);
        const hasMeas = measurementDates.has(dateStr);

        return `
                                        <button 
                                            class="calendar-day-btn relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border ${d.currentMonth ? (isSelected ? 'bg-primary/20 border-primary scale-105 shadow-[0_0_15px_rgba(19,236,37,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10') : 'opacity-20 pointer-events-none'}"
                                            data-date="${dateStr}"
                                        >
                                            <span class="text-sm font-bold ${isSelected ? 'text-primary' : (isToday ? 'text-white underline decoration-primary decoration-2' : 'text-slate-300')}">${d.day}</span>
                                            
                                            <!-- Indicators -->
                                            <div class="absolute bottom-2 flex gap-1">
                                                ${hasMeals ? '<div class="size-1 rounded-full bg-orange-400"></div>' : ''}
                                                ${hasWorkouts ? '<div class="size-1 rounded-full bg-blue-400"></div>' : ''}
                                                ${hasMeas ? '<div class="size-1 rounded-full bg-purple-400"></div>' : ''}
                                            </div>
                                        </button>
                                    `;
    }).join('')}
                            </div>
                        </div>

                        <!-- Legend -->
                        <div class="p-6 border-t border-[#28392a] bg-black/20 flex flex-wrap gap-6 items-center justify-center">
                            <div class="flex items-center gap-2">
                                <div class="size-2 rounded-full bg-orange-400"></div>
                                <span class="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Comidas</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="size-2 rounded-full bg-blue-400"></div>
                                <span class="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Entrenamiento</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="size-2 rounded-full bg-purple-400"></div>
                                <span class="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Mediciones</span>
                            </div>
                        </div>
                    </div>

                    <!-- Selected Day Summary -->
                    <div id="day-summary-card" class="bg-[#1A261C] border border-[#28392a] rounded-3xl p-6 hidden animate-fade-in">
                        <div class="flex flex-col gap-6">
                            <div class="flex items-center justify-between">
                                <h4 id="summary-date" class="text-white text-xl font-bold uppercase tracking-tight">31 de Diciembre</h4>
                                <button id="navigate-to-day" class="bg-primary text-[#102212] px-6 py-2 rounded-xl font-bold text-sm hover:bg-green-400 transition-all shadow-lg active:scale-95">
                                    Ir al Registro
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col gap-3">
                                    <h5 class="text-primary text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Comidas</h5>
                                    <div id="summary-meals" class="flex flex-col gap-2">
                                        <!-- Meals injected here -->
                                    </div>
                                </div>
                                <div class="flex flex-col gap-3">
                                    <h5 class="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Entrenamiento</h5>
                                    <div id="summary-workouts" class="flex flex-col gap-2">
                                        <!-- Workouts injected here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    </div>
    `;
};

export const attachCalendarEvents = () => {
    const state = getState();
    const currentSelected = state.selectedDate || new Date().toISOString().split('T')[0];

    const updateSummary = (dateStr) => {
        const card = document.getElementById('day-summary-card');
        const dateEl = document.getElementById('summary-date');
        const mealsEl = document.getElementById('summary-meals');
        const workoutsEl = document.getElementById('summary-workouts');
        const navBtn = document.getElementById('navigate-to-day');

        if (!card || !dateStr) return;

        const dateObj = new Date(dateStr + 'T12:00:00');
        dateEl.textContent = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        const meals = state.dailyLog?.filter(m => m.date === dateStr) || [];
        const workouts = state.workouts?.filter(w => w.date === dateStr) || [];

        mealsEl.innerHTML = meals.length > 0
            ? meals.map(m => `
                <div class="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span class="text-white text-sm font-medium">${m.name}</span>
                    <span class="text-primary text-xs font-bold">${m.calories} kcal</span>
                </div>
            `).join('')
            : '<p class="text-text-secondary text-xs italic">Sin registros</p>';

        workoutsEl.innerHTML = workouts.length > 0
            ? workouts.map(w => `
                <div class="flex flex-col p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <span class="text-white text-sm font-medium">${w.name || w.type}</span>
                    <span class="text-blue-400 text-[10px] font-bold uppercase tracking-wider">${w.duration} min • ${w.calories} kcal</span>
                </div>
            `).join('')
            : '<p class="text-text-secondary text-xs italic">Sin registros</p>';

        card.classList.remove('hidden');
        navBtn.onclick = () => {
            setSelectedDate(dateStr);
            window.router.navigate('dashboard');
        };
    };

    // Show current selected on load
    updateSummary(currentSelected);

    document.querySelectorAll('.calendar-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.dataset.date;
            // Highlight selected
            document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('border-primary', 'bg-primary/20'));
            e.currentTarget.classList.add('border-primary', 'bg-primary/20');

            updateSummary(date);
        });
    });

    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
        const d = new Date(currentSelected + 'T12:00:00');
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
        window.router.navigate('calendar');
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
        const d = new Date(currentSelected + 'T12:00:00');
        d.setMonth(d.getMonth() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
        window.router.navigate('calendar');
    });

    document.getElementById('cal-today')?.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        window.router.navigate('calendar');
    });
};
