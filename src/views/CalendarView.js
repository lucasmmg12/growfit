import { getState, setSelectedDate, getArgentinaDate } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderCalendar = () => {
    const state = getState();
    const today = getArgentinaDate();
    const selectedDate = state.selectedDate || today;

    const displayDate = new Date(selectedDate + 'T12:00:00');
    const month = displayDate.getMonth();
    const year = displayDate.getFullYear();

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const firstDay = new Date(year, month, 1).getDay();
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

    const mealDates = new Set((state.dailyLog || []).map(m => m.date));
    const workoutDates = new Set((state.workouts || []).map(w => w.date));
    const measurementDates = new Set((state.measurements || []).map(m => m.date));

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('calendar')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Calendario')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="badge-emerald mb-1">Histórico</span>
                            <h2 class="text-3xl font-display font-black text-text-emerald uppercase tracking-tight">Calendario de Registros</h2>
                        </div>
                        <button onclick="window.router.navigate('dashboard')" class="btn-emerald-soft px-4 py-2 text-xs font-bold">
                            <span class="material-symbols-outlined text-sm">arrow_back</span> Volver a Inicio
                        </button>
                    </div>

                    <!-- Calendar Card -->
                    <div class="white-card overflow-hidden">
                        <!-- Controls -->
                        <div class="p-6 border-b border-border-soft flex items-center justify-between bg-slate-50/50">
                            <h3 class="text-xl font-display font-black text-text-emerald flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">calendar_today</span>
                                ${monthNames[month]} <span class="text-text-muted font-normal">${year}</span>
                            </h3>
                            <div class="flex items-center gap-2">
                                <button id="cal-prev-month" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-text-emerald transition-colors shadow-xs">
                                    <span class="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <button id="cal-today" class="btn-emerald-soft px-3 py-1.5 text-xs font-bold">
                                    Hoy
                                </button>
                                <button id="cal-next-month" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-text-emerald transition-colors shadow-xs">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <!-- Calendar Grid -->
                        <div class="p-4 md:p-6">
                            <!-- Weekdays -->
                            <div class="grid grid-cols-7 mb-3 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
                            </div>

                            <!-- Days -->
                            <div class="grid grid-cols-7 gap-2">
                                ${days.map(d => {
                                    const dateObj = new Date(d.year, d.month, d.day);
                                    const dateStr = dateObj.toISOString().split('T')[0];
                                    const isSelected = dateStr === selectedDate;
                                    const isCurrentDay = dateStr === today;
                                    const hasMeals = mealDates.has(dateStr);
                                    const hasWorkouts = workoutDates.has(dateStr);
                                    const hasMeas = measurementDates.has(dateStr);

                                    return `
                                        <button 
                                            class="calendar-day-btn relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border ${
                                                d.currentMonth 
                                                    ? (isSelected ? 'bg-primary-light border-primary text-text-emerald font-black shadow-xs' : 'bg-slate-50/70 border-slate-200 hover:bg-emerald-50/50')
                                                    : 'opacity-20 pointer-events-none'
                                            }"
                                            data-date="${dateStr}"
                                        >
                                            <span class="text-xs ${isCurrentDay ? 'font-bold underline decoration-primary decoration-2' : ''}">${d.day}</span>
                                            
                                            <!-- Indicators -->
                                            <div class="absolute bottom-1.5 flex gap-1">
                                                ${hasMeals ? '<div class="size-1.5 rounded-full bg-emerald-500"></div>' : ''}
                                                ${hasWorkouts ? '<div class="size-1.5 rounded-full bg-blue-500"></div>' : ''}
                                                ${hasMeas ? '<div class="size-1.5 rounded-full bg-amber-500"></div>' : ''}
                                            </div>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Legend -->
                        <div class="p-4 border-t border-border-soft bg-slate-50 flex flex-wrap gap-6 items-center justify-center text-xs text-text-muted">
                            <div class="flex items-center gap-1.5">
                                <div class="size-2 rounded-full bg-emerald-500"></div>
                                <span class="font-semibold">Comidas</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <div class="size-2 rounded-full bg-blue-500"></div>
                                <span class="font-semibold">Entrenamientos</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <div class="size-2 rounded-full bg-amber-500"></div>
                                <span class="font-semibold">Mediciones</span>
                            </div>
                        </div>
                    </div>

                    <!-- Selected Day Summary -->
                    <div id="day-summary-card" class="white-card p-6 hidden">
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between pb-3 border-b border-border-soft">
                                <h4 id="summary-date" class="text-xl font-display font-black text-text-emerald uppercase"></h4>
                                <button id="navigate-to-day" class="btn-emerald px-4 py-2 text-xs font-bold">
                                    Ir a este día en Inicio
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="flex flex-col gap-2">
                                    <h5 class="text-[10px] font-bold text-emerald-700 uppercase">Comidas</h5>
                                    <div id="summary-meals" class="flex flex-col gap-2"></div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <h5 class="text-[10px] font-bold text-blue-700 uppercase">Entrenamientos</h5>
                                    <div id="summary-workouts" class="flex flex-col gap-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('calendar')}
        </main>
    </div>
    `;
};

export const attachCalendarEvents = () => {
    const state = getState();
    const currentSelected = state.selectedDate || getArgentinaDate();

    const updateSummary = (dateStr) => {
        const card = document.getElementById('day-summary-card');
        const dateEl = document.getElementById('summary-date');
        const mealsEl = document.getElementById('summary-meals');
        const workoutsEl = document.getElementById('summary-workouts');
        const navBtn = document.getElementById('navigate-to-day');

        if (!card || !dateStr) return;

        const dateObj = new Date(dateStr + 'T12:00:00');
        dateEl.textContent = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        const meals = (state.dailyLog || []).filter(m => m.date === dateStr);
        const workouts = (state.workouts || []).filter(w => w.date === dateStr);

        mealsEl.innerHTML = meals.length > 0
            ? meals.map(m => `
                <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-text-primary text-xs font-bold">${m.name}</span>
                    <span class="text-emerald-700 text-xs font-mono font-bold">${m.calories} kcal</span>
                </div>
            `).join('')
            : '<p class="text-text-muted text-xs italic">Sin registros de comidas</p>';

        workoutsEl.innerHTML = workouts.length > 0
            ? workouts.map(w => `
                <div class="flex flex-col p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span class="text-text-primary text-xs font-bold">${w.name || w.type}</span>
                    <span class="text-blue-600 text-[10px] font-bold uppercase tracking-wider">${w.duration} min • ${w.calories} kcal</span>
                </div>
            `).join('')
            : '<p class="text-text-muted text-xs italic">Sin registros de entrenamientos</p>';

        card.classList.remove('hidden');
        navBtn.onclick = () => {
            setSelectedDate(dateStr);
            window.router.navigate('dashboard');
        };
    };

    updateSummary(currentSelected);

    document.querySelectorAll('.calendar-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.dataset.date;
            document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('border-primary', 'bg-primary-light'));
            e.currentTarget.classList.add('border-primary', 'bg-primary-light');
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
        const today = getArgentinaDate();
        setSelectedDate(today);
        window.router.navigate('calendar');
    });
};
