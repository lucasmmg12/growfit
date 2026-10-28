import { 
    getState, 
    getDailyStats, 
    addMeal, 
    setDailyTip, 
    updateDayStat, 
    getDailyBurn, 
    deleteMeal, 
    updateMeal, 
    toggleHabit, 
    setDailyHabits, 
    setSelectedDate, 
    getArgentinaDate,
    getSensationsMetrics,
    getMealSodium,
    getFinancialSummary
} from '../state';
import { analyzeFood, generateDailyTip, generateSmartHabits } from '../services/openai';
import { getProductByBarcode } from '../services/openfoodfacts';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import { renderMealSensationsModalContainer, renderSatietyBadge, attachSensationsModalEvents } from '../components/MealSensationsModal';

let barcodeScannerInstance = null;

// Helper to render SVG Circular Performance Ring (All Green Spectrum)
const renderPerformanceRing = ({ pct, size = 76, stroke = 7, color = '#10E775', glowClass = 'ring-glow-emerald', centerLabel = '', subLabel = '' }) => {
    const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
    const radius = (size - stroke * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safePct / 100) * circumference;
    const center = size / 2;

    return `
        <div class="relative flex items-center justify-center shrink-0" style="width:${size}px; height:${size}px;">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="-rotate-90">
                <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(16, 231, 117, 0.10)" stroke-width="${stroke}"></circle>
                <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}"
                    stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                    class="timer-ring-circle ${glowClass}"></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                <span class="font-mono font-extrabold text-white" style="font-size:${size >= 140 ? '26px' : '15px'};">${centerLabel}</span>
                ${subLabel ? `<span class="text-[9px] font-bold uppercase tracking-wider text-emerald-300/70 mt-1">${subLabel}</span>` : ''}
            </div>
        </div>
    `;
};

export const renderDashboard = () => {
    const state = getState();
    const today = getArgentinaDate();
    const selectedDate = state.selectedDate || today;
    const isToday = selectedDate === today;

    // Daily Stats & Burn
    const stats = getDailyStats(selectedDate);
    const dailyBurn = getDailyBurn(selectedDate);
    const dayStats = state.days?.[selectedDate] || {};
    const walletSummary = getFinancialSummary(today.substring(0, 7));

    // Auto habits generation once a day
    if (state.lastHabitGenerationDate !== today && !window.hasTriggeredHabits) {
        window.hasTriggeredHabits = true;
        const yesterday = new Date(new Date(today + 'T12:00:00').getTime() - 86400000).toISOString().split('T')[0];
        const yLog = (state.dailyLog || []).filter(m => m.date === yesterday);
        const yCals = yLog.reduce((s, m) => s + (m.calories || 0), 0);
        const lastW = state.measurements?.slice(-1)[0]?.weight || 'N/A';

        generateSmartHabits(state.profile, `Ayer: ${yCals}kcal. Peso: ${lastW}`).then(habits => {
            setDailyHabits(habits);
        }).catch(() => {});
    }

    const calGoal = state.profile.calorieGoal || 2000;
    const pGoal = state.profile.proteinGoal || 150;
    const cGoal = state.profile.carbsGoal || 200;
    const fGoal = state.profile.fatGoal || 65;
    const sGoal = state.profile.sodiumGoal || 2000;

    const calProgress = Math.min(100, Math.round((stats.calories / calGoal) * 100));
    const remainingCals = Math.max(0, calGoal - stats.calories);

    const pPct = Math.min(100, Math.round((stats.protein / pGoal) * 100));
    const cPct = Math.min(100, Math.round((stats.carbs / cGoal) * 100));
    const fPct = Math.min(100, Math.round((stats.fat / fGoal) * 100));
    const sPct = Math.min(100, Math.round(((stats.sodium || 0) / sGoal) * 100));
    const isHighSodiumDay = (stats.sodium || 0) > sGoal;

    const displayTip = (state.dailyTip?.date === selectedDate && state.dailyTip?.content)
        ? state.dailyTip.content
        : "Prioriza fuentes de proteína limpia, control de sodio e hidratación constante hoy.";

    const waterAmount = dayStats.water || 0;
    const waterGoal = 2500;
    const waterPct = Math.min(100, Math.round((waterAmount / waterGoal) * 100));

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('dashboard')}

        <!-- Main Workspace -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative">
            ${renderMobileHeader('GrowFit')}

            <!-- Scrollable Content Area (Full Width Green Bento) -->
            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- HERO BAR: Biometric Status, Date & Quick Command Bar -->
                    <div class="white-card card-glow-emerald p-5 md:p-6 shadow-2xl">
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-emerald-500/15">
                            <div>
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <span class="badge-emerald">
                                        <span class="size-1.5 rounded-full bg-[#10E775] animate-pulse"></span>
                                        Biometría Activa
                                    </span>
                                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-lime-500/15 text-lime-300 border border-lime-500/30 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-xs">local_fire_department</span>
                                        Racha Activa
                                    </span>
                                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-xs">vaccines</span>
                                        GLP-1 ${state.obetideTreatments?.[0] ? `${state.obetideTreatments[0].dose_ml} ml` : '0.25 ml'}
                                    </span>
                                </div>
                                <h2 class="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                                    ¡Hola, ${state.profile.name || 'Atleta'}!
                                </h2>
                            </div>

                            <!-- Date Navigation Buttons -->
                            <div class="flex items-center gap-2.5 self-start lg:self-center">
                                <div class="flex items-center bg-[#040B08]/90 p-1.5 rounded-2xl border border-emerald-500/20">
                                    <button id="prev-day-btn" class="size-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10E775] transition-all flex items-center justify-center cursor-pointer">
                                        <span class="material-symbols-outlined text-base">chevron_left</span>
                                    </button>
                                    <span class="px-4 text-xs font-extrabold text-white font-mono tracking-wider">
                                        ${isToday ? 'HOY · ' + selectedDate.slice(5) : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                                    </span>
                                    <button id="next-day-btn" class="size-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10E775] transition-all flex items-center justify-center cursor-pointer">
                                        <span class="material-symbols-outlined text-base">chevron_right</span>
                                    </button>
                                </div>
                                <button id="open-calendar-btn" class="size-11 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[#10E775] flex items-center justify-center transition-all cursor-pointer" title="Ver Calendario">
                                    <span class="material-symbols-outlined text-lg">calendar_month</span>
                                </button>
                            </div>
                        </div>

                        <!-- AI Command Bar + Quick Chips -->
                        <div class="mt-4 flex flex-col gap-3">
                            <div class="flex items-center gap-2.5">
                                <div class="flex-1 flex items-center bg-[#040B08]/90 border border-emerald-500/25 rounded-2xl px-4 py-2.5 focus-within:border-[#10E775] transition-all shadow-inner">
                                    <span class="material-symbols-outlined text-[#10E775] text-xl mr-2.5">auto_awesome</span>
                                    <input id="quick-log-input" type="text" placeholder="¿Qué comiste hoy? Ej: 2 huevos revueltos con tostada y café..." class="w-full bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-emerald-300/40" />
                                </div>

                                <!-- Camera AI Button -->
                                <input type="file" id="quick-log-file" accept="image/*" class="hidden">
                                <label for="quick-log-file" title="Analizar foto de comida con IA" class="size-11 rounded-2xl bg-emerald-500/15 hover:bg-[#10E775]/25 text-[#10E775] border border-emerald-500/30 hover:border-[#10E775]/50 flex items-center justify-center cursor-pointer transition-all active:scale-95">
                                    <span class="material-symbols-outlined text-xl">photo_camera</span>
                                </label>

                                <!-- Barcode Scanner Button -->
                                <button id="open-barcode-modal-btn" title="Escanear código de barras" class="size-11 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 hover:border-teal-400/50 flex items-center justify-center transition-all active:scale-95 cursor-pointer">
                                    <span class="material-symbols-outlined text-xl">barcode_scanner</span>
                                </button>

                                <!-- Submit / Add Button -->
                                <button id="quick-log-btn" class="btn-emerald px-5 h-11 text-xs font-extrabold uppercase tracking-wider">
                                    <span class="material-symbols-outlined text-lg">add_circle</span>
                                    <span class="hidden sm:inline">Registrar</span>
                                </button>
                            </div>

                            <!-- 1-Click Quick Food Chips -->
                            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 shrink-0">Carga rápida:</span>
                                ${[
                                    { label: '☕ Café con leche', query: 'Café con leche descremada' },
                                    { label: '🥚 2 Huevos y tostada', query: '2 huevos revueltos con 1 tostada integral' },
                                    { label: '🍗 Pollo con ensalada', query: '200g pechuga de pollo grillada con ensalada mixta' },
                                    { label: '🥩 Bife con huevo', query: '200g bife de carne magra con 1 huevo a la plancha' },
                                    { label: '🥣 Yogur con avena', query: 'Yogur griego natural con 30g de avena' }
                                ].map(chip => `
                                    <button type="button" class="quick-food-chip px-3 py-1 rounded-full bg-emerald-950/60 hover:bg-[#10E775]/20 border border-emerald-500/20 hover:border-[#10E775]/45 text-[11px] font-semibold text-emerald-100/80 hover:text-white transition-all shrink-0 cursor-pointer" data-food="${chip.query}">
                                        ${chip.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- CENTERPIECE: MONOCHROMATIC GREEN RINGS PERFORMANCE HUB (12-Column Bento) -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <!-- Master Calorie Ring Card (5 Cols - Verde Neón Principal) -->
                        <div class="lg:col-span-5 white-card card-glow-emerald p-6 flex flex-col justify-between">
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#10E775]">Anillo de Energía Diaria</span>
                                    <h3 class="text-lg font-display font-extrabold text-white mt-0.5">Balance Calórico</h3>
                                </div>
                                <span class="badge-emerald font-mono">${calProgress}% de Meta</span>
                            </div>

                            <div class="my-5 flex flex-col sm:flex-row items-center justify-around gap-6">
                                ${renderPerformanceRing({
                                    pct: calProgress,
                                    size: 158,
                                    stroke: 12,
                                    color: '#10E775',
                                    glowClass: 'ring-glow-emerald',
                                    centerLabel: `${Math.round(stats.calories)}`,
                                    subLabel: `de ${calGoal} kcal`
                                })}

                                <div class="flex flex-col gap-3 w-full sm:w-auto min-w-[155px]">
                                    <div class="p-3 rounded-2xl bg-[#040B08]/70 border border-[#10E775]/30 flex items-center justify-between gap-3">
                                        <div>
                                            <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Consumidas</span>
                                            <span class="text-lg font-mono font-extrabold text-[#10E775]">${Math.round(stats.calories)} <small class="text-[10px] font-normal text-emerald-300/60">kcal</small></span>
                                        </div>
                                        <span class="material-symbols-outlined text-[#10E775] text-xl">restaurant</span>
                                    </div>

                                    <div class="p-3 rounded-2xl bg-[#040B08]/70 border border-lime-500/30 flex items-center justify-between gap-3">
                                        <div>
                                            <span class="text-[10px] font-bold uppercase text-lime-300/70 block">Quemadas</span>
                                            <span class="text-lg font-mono font-extrabold text-lime-400">${Math.round(dailyBurn.activity)} <small class="text-[10px] font-normal text-lime-300/60">kcal</small></span>
                                        </div>
                                        <span class="material-symbols-outlined text-lime-400 text-xl">local_fire_department</span>
                                    </div>

                                    <div class="p-3 rounded-2xl bg-[#040B08]/70 border border-teal-500/30 flex items-center justify-between gap-3">
                                        <div>
                                            <span class="text-[10px] font-bold uppercase text-teal-300/70 block">Disponibles</span>
                                            <span class="text-lg font-mono font-extrabold text-teal-300">${remainingCals} <small class="text-[10px] font-normal text-teal-300/60">kcal</small></span>
                                        </div>
                                        <span class="material-symbols-outlined text-teal-300 text-xl">bolt</span>
                                    </div>
                                </div>
                            </div>

                            <div class="pt-3 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-200/80">
                                <span class="flex items-center gap-1.5">
                                    <span class="size-2 rounded-full bg-[#10E775]"></span>
                                    Déficit metabólico controlado
                                </span>
                                <span class="font-mono font-bold text-[#10E775]">${stats.mealsCount || (state.dailyLog || []).filter(m => m.date === selectedDate).length} comidas hoy</span>
                            </div>
                        </div>

                        <!-- 4 Circular Macro & Sodium Rings Grid (7 Cols - 4 Gamas de Verde) -->
                        <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- 1. Proteína Ring Card (Verde Neón #10E775) -->
                            <div class="white-card card-glow-emerald p-5 flex items-center justify-between gap-4">
                                <div class="flex flex-col justify-between h-full">
                                    <div>
                                        <span class="px-2 py-0.5 rounded-md bg-[#10E775]/15 text-[#10E775] text-[10px] font-extrabold uppercase tracking-wider">Masa Muscular</span>
                                        <h4 class="text-base font-display font-extrabold text-white mt-2">Proteína</h4>
                                        <p class="text-2xl font-mono font-extrabold text-[#10E775] mt-1">
                                            ${Math.round(stats.protein)}<span class="text-xs font-normal text-emerald-300/60"> / ${pGoal}g</span>
                                        </p>
                                    </div>
                                    <p class="text-[11px] text-emerald-200/70 mt-3">
                                        Restan <strong class="text-white font-mono">${Math.max(0, pGoal - Math.round(stats.protein))}g</strong> para tu meta
                                    </p>
                                </div>
                                ${renderPerformanceRing({
                                    pct: pPct,
                                    size: 84,
                                    stroke: 8,
                                    color: '#10E775',
                                    glowClass: 'ring-glow-emerald',
                                    centerLabel: `${pPct}%`,
                                    subLabel: 'PRO'
                                })}
                            </div>

                            <!-- 2. Carbohidratos Ring Card (Verde Esmeralda Medio #34D399) -->
                            <div class="white-card card-glow-mint p-5 flex items-center justify-between gap-4">
                                <div class="flex flex-col justify-between h-full">
                                    <div>
                                        <span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">Energía Glucógeno</span>
                                        <h4 class="text-base font-display font-extrabold text-white mt-2">Carbohidratos</h4>
                                        <p class="text-2xl font-mono font-extrabold text-emerald-300 mt-1">
                                            ${Math.round(stats.carbs)}<span class="text-xs font-normal text-emerald-300/60"> / ${cGoal}g</span>
                                        </p>
                                    </div>
                                    <p class="text-[11px] text-emerald-200/70 mt-3">
                                        Restan <strong class="text-white font-mono">${Math.max(0, cGoal - Math.round(stats.carbs))}g</strong> del límite
                                    </p>
                                </div>
                                ${renderPerformanceRing({
                                    pct: cPct,
                                    size: 84,
                                    stroke: 8,
                                    color: '#34D399',
                                    glowClass: 'ring-glow-mint',
                                    centerLabel: `${cPct}%`,
                                    subLabel: 'CARB'
                                })}
                            </div>

                            <!-- 3. Grasas Ring Card (Verde Lima / Primavera #84CC16) -->
                            <div class="white-card card-glow-lime p-5 flex items-center justify-between gap-4">
                                <div class="flex flex-col justify-between h-full">
                                    <div>
                                        <span class="px-2 py-0.5 rounded-md bg-lime-500/15 text-lime-300 text-[10px] font-extrabold uppercase tracking-wider">Soporte Hormonal</span>
                                        <h4 class="text-base font-display font-extrabold text-white mt-2">Grasas Saludables</h4>
                                        <p class="text-2xl font-mono font-extrabold text-lime-400 mt-1">
                                            ${Math.round(stats.fat)}<span class="text-xs font-normal text-emerald-300/60"> / ${fGoal}g</span>
                                        </p>
                                    </div>
                                    <p class="text-[11px] text-emerald-200/70 mt-3">
                                        Restan <strong class="text-white font-mono">${Math.max(0, fGoal - Math.round(stats.fat))}g</strong> para hoy
                                    </p>
                                </div>
                                ${renderPerformanceRing({
                                    pct: fPct,
                                    size: 84,
                                    stroke: 8,
                                    color: '#84CC16',
                                    glowClass: 'ring-glow-lime',
                                    centerLabel: `${fPct}%`,
                                    subLabel: 'FAT'
                                })}
                            </div>

                            <!-- 4. Sodio Ring Card (Verde Jade / Teal #2DD4BF) -->
                            <div class="white-card card-glow-jade p-5 flex items-center justify-between gap-4">
                                <div class="flex flex-col justify-between h-full">
                                    <div>
                                        <span class="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 text-[10px] font-extrabold uppercase tracking-wider">
                                            ${isHighSodiumDay ? '⚠️ Sodio Elevado' : 'Balance Electrolítico'}
                                        </span>
                                        <h4 class="text-base font-display font-extrabold text-white mt-2">Nivel de Sodio</h4>
                                        <p class="text-2xl font-mono font-extrabold text-teal-300 mt-1">
                                            ${Math.round(stats.sodium || 0)}<span class="text-xs font-normal text-emerald-300/60"> / ${sGoal}mg</span>
                                        </p>
                                    </div>
                                    <p class="text-[11px] text-emerald-200/70 mt-3">
                                        ${isHighSodiumDay ? 'Aumentar ingesta de agua hoy' : `Margen: ${Math.max(0, sGoal - Math.round(stats.sodium || 0))}mg disponibles`}
                                    </p>
                                </div>
                                ${renderPerformanceRing({
                                    pct: sPct,
                                    size: 84,
                                    stroke: 8,
                                    color: '#2DD4BF',
                                    glowClass: 'ring-glow-jade',
                                    centerLabel: `${sPct}%`,
                                    subLabel: 'SODIO'
                                })}
                            </div>
                        </div>
                    </div>

                    <!-- 3-COLUMN GREEN SPECTRUM CLINICAL, WALLET & HYDRATION ROW -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <!-- 1. Obetide GLP-1 Clinical Jade Green Card -->
                        <div class="white-card card-glow-jade p-5 flex flex-col justify-between cursor-pointer" onclick="window.router.navigate('obetide')">
                            <div class="flex items-start justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-300 border border-teal-400/35 shadow-[0_0_15px_rgba(20,184,166,0.25)]">
                                        <span class="material-symbols-outlined text-xl">vaccines</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-extrabold uppercase tracking-widest text-teal-300">Protocolo GLP-1</span>
                                        <h3 class="text-base font-display font-extrabold text-white">Control Obetide</h3>
                                    </div>
                                </div>
                                <span class="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-teal-500/20 text-teal-200 border border-teal-400/35">
                                    ${state.obetideTreatments?.[0] ? `${state.obetideTreatments[0].dose_ml} ml` : '0.25 ml'}
                                </span>
                            </div>

                            <div class="my-4 p-3.5 rounded-2xl bg-[#040B08]/60 border border-teal-500/25 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span class="text-[10px] text-teal-300/80 block uppercase font-bold">Última Dosis</span>
                                    <p class="font-mono font-extrabold text-white mt-0.5">${state.obetideTreatments?.[0]?.date || 'Pendiente'}</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] text-teal-300/80 block uppercase font-bold">Zona Aplicación</span>
                                    <p class="font-bold text-white capitalize mt-0.5">${(state.obetideTreatments?.[0]?.injection_site || 'Abdomen Der').replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div class="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-xs font-bold text-teal-300">
                                <span>Abrir seguimiento clínico</span>
                                <span class="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>

                        <!-- 2. Mi Billetera Cashflow Emerald Card -->
                        <div class="white-card card-glow-emerald p-5 flex flex-col justify-between cursor-pointer" onclick="window.router.navigate('wallet')">
                            <div class="flex items-start justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="size-11 rounded-2xl bg-[#10E775]/20 flex items-center justify-center text-[#10E775] border border-[#10E775]/35 shadow-[0_0_15px_rgba(16,231,117,0.25)]">
                                        <span class="material-symbols-outlined text-xl">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#10E775]">Flujo de Caja</span>
                                        <h3 class="text-base font-display font-extrabold text-white">Mi Billetera</h3>
                                    </div>
                                </div>
                                <span class="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/35">
                                    ${today.substring(0, 7)}
                                </span>
                            </div>

                            <div class="my-4 p-3.5 rounded-2xl bg-[#040B08]/60 border border-emerald-500/25 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span class="text-[10px] text-emerald-300/70 block uppercase font-bold">Ingresos Mes</span>
                                    <p class="font-mono font-extrabold text-[#10E775] text-sm mt-0.5">
                                        +$${Number(walletSummary.monthlyIncome || 0).toLocaleString('es-AR')}
                                    </p>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] text-emerald-300/70 block uppercase font-bold">Gastos Mes</span>
                                    <p class="font-mono font-extrabold text-emerald-100 text-sm mt-0.5">
                                        -$${Number(walletSummary.totalSpent || 0).toLocaleString('es-AR')}
                                    </p>
                                </div>
                            </div>

                            <div class="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-xs font-bold text-[#10E775]">
                                <span>Ingresos (Sueldo, Grow Labs) y Gastos</span>
                                <span class="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>

                        <!-- 3. Hidratación & AI Coach Sage Green Card -->
                        <div class="white-card card-glow-sage p-5 flex flex-col justify-between">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3">
                                    ${renderPerformanceRing({
                                        pct: waterPct,
                                        size: 62,
                                        stroke: 6,
                                        color: '#34D399',
                                        glowClass: 'ring-glow-mint',
                                        centerLabel: `${waterPct}%`
                                    })}
                                    <div>
                                        <span class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Hidratación</span>
                                        <h4 class="text-lg font-mono font-extrabold text-white">${waterAmount} <span class="text-xs font-normal text-emerald-300/60">/ ${waterGoal} ml</span></h4>
                                    </div>
                                </div>
                                <button id="add-water-btn" class="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[#10E775] border border-emerald-400/35 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all active:scale-95">
                                    <span class="material-symbols-outlined text-base">water_drop</span>
                                    +250 ml
                                </button>
                            </div>

                            <div class="mt-4 p-3.5 rounded-2xl bg-[#040B08]/60 border border-emerald-500/20">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <span class="material-symbols-outlined text-[#10E775] text-sm">auto_awesome</span>
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#10E775]">AI Coach Bio-Insight</span>
                                </div>
                                <p class="text-xs text-emerald-100/90 leading-relaxed line-clamp-2">"${displayTip}"</p>
                            </div>
                        </div>
                    </div>

                    <!-- BOTTOM 2-COLUMN BENTO: SENSATIONS & DAILY MEALS TIMELINE -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- Sensations & Satiety Metrics Card (5 Cols) -->
                        <div class="lg:col-span-5 white-card p-6 border border-emerald-500/20 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-emerald-500/15">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-2xl bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30 flex items-center justify-center text-lg">
                                            🧠
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-display font-extrabold text-white uppercase tracking-wide">Saciedad & Plenitud</h3>
                                            <p class="text-[11px] text-emerald-300/60">Respuesta gastrointestinal y GLP-1</p>
                                        </div>
                                    </div>
                                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30">
                                        ${getSensationsMetrics().statusLabel}
                                    </span>
                                </div>

                                <div class="grid grid-cols-3 gap-2.5 mb-5">
                                    <div class="p-3 rounded-2xl bg-[#040B08]/60 border border-emerald-500/15 text-center">
                                        <span class="text-[9px] font-bold uppercase text-emerald-300/60 block">Promedio</span>
                                        <p class="text-lg font-mono font-extrabold text-white mt-1">
                                            ${getSensationsMetrics().avgScore ? `${getSensationsMetrics().avgScore}/5` : '—'}
                                        </p>
                                    </div>
                                    <div class="p-3 rounded-2xl bg-[#040B08]/60 border border-[#10E775]/25 text-center">
                                        <span class="text-[9px] font-bold uppercase text-emerald-300/60 block">En su punto</span>
                                        <p class="text-lg font-mono font-extrabold text-[#10E775] mt-1">
                                            ${getSensationsMetrics().distribution.groupedOptimal.pct}%
                                        </p>
                                    </div>
                                    <div class="p-3 rounded-2xl bg-[#040B08]/60 border border-lime-500/25 text-center">
                                        <span class="text-[9px] font-bold uppercase text-emerald-300/60 block">Muy Lleno</span>
                                        <p class="text-lg font-mono font-extrabold text-lime-400 mt-1">
                                            ${getSensationsMetrics().distribution.groupedOverfull.pct}%
                                        </p>
                                    </div>
                                </div>

                                <!-- Distribution Bar (Shades of Green) -->
                                <div class="mb-4">
                                    <div class="flex items-center justify-between text-xs mb-1.5">
                                        <span class="font-bold text-emerald-100">Distribución Post-Comida</span>
                                        <span class="font-mono text-emerald-300/70">${getSensationsMetrics().ratedMealsCount} registros</span>
                                    </div>
                                    <div class="h-2.5 w-full bg-[#040B08] rounded-full overflow-hidden flex p-0.5 border border-emerald-500/20 gap-0.5">
                                        <div style="width: ${Math.max(4, getSensationsMetrics().distribution.groupedOptimal.pct)}%" class="h-full bg-[#10E775] rounded-l-full"></div>
                                        <div style="width: ${getSensationsMetrics().distribution.groupedOverfull.pct}%" class="h-full bg-lime-400"></div>
                                        <div style="width: ${getSensationsMetrics().distribution.groupedHungry.pct}%" class="h-full bg-teal-400 rounded-r-full"></div>
                                    </div>
                                </div>

                                ${getSensationsMetrics().topSensations.length > 0 ? `
                                    <div class="pt-3 border-t border-emerald-500/15">
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 block mb-2">Sensaciones Frecuentes</span>
                                        <div class="flex flex-wrap gap-1.5">
                                            ${getSensationsMetrics().topSensations.map(s => `
                                                <span class="px-2.5 py-1 rounded-xl bg-emerald-950/50 border border-emerald-500/20 text-[11px] font-semibold text-emerald-100 flex items-center gap-1.5">
                                                    <span>${s.tag}</span>
                                                    <span class="text-[10px] font-mono font-bold text-[#10E775]">${s.count}</span>
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>

                            <button onclick="window.router.navigate('insights')" class="w-full mt-4 btn-ghost-light py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                                <span>Ver Biometría & Historial Completo</span>
                                <span class="material-symbols-outlined text-sm">trending_up</span>
                            </button>
                        </div>

                        <!-- Daily Meal Timeline (7 Cols) -->
                        <div class="lg:col-span-7 white-card p-6 border border-emerald-500/20 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                                    <div class="flex items-center gap-2.5">
                                        <div class="size-10 rounded-2xl bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30 flex items-center justify-center">
                                            <span class="material-symbols-outlined text-xl">restaurant_menu</span>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-display font-extrabold text-white uppercase tracking-wide">Comidas Registradas</h3>
                                            <p class="text-[11px] text-emerald-300/60">Desglose de calorías, macros y sodio del día</p>
                                        </div>
                                    </div>
                                    <button onclick="window.router.navigate('tracker')" class="btn-emerald-soft text-xs px-3.5 py-1.5 font-bold cursor-pointer">
                                        Diario Completo →
                                    </button>
                                </div>

                                <div class="flex flex-col gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                    ${renderMealsList(state, selectedDate)}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('dashboard')}
        </main>

        <!-- Global Modals Container -->
        <div id="meal-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"></div>
        <div id="barcode-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"></div>
        ${renderMealSensationsModalContainer()}
    </div>
    `;
};

const renderMealsList = (state, selectedDate) => {
    const activeDate = selectedDate || state.selectedDate || getArgentinaDate();
    const meals = (state.dailyLog || []).filter(m => m.date === activeDate);

    if (!meals.length) {
        return `
            <div class="py-12 text-center flex flex-col items-center gap-2">
                <div class="size-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400/50">
                    <span class="material-symbols-outlined text-3xl">restaurant</span>
                </div>
                <p class="text-sm font-bold text-emerald-100 mt-1">Sin comidas registradas en esta fecha</p>
                <p class="text-xs text-emerald-300/60">Usa la barra superior o toca un chip de carga rápida para empezar.</p>
            </div>
        `;
    }

    return meals.map(m => `
        <div class="p-4 bg-[#040B08]/65 hover:bg-emerald-950/40 rounded-2xl border border-emerald-500/15 hover:border-emerald-500/35 transition-all flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="size-11 rounded-2xl bg-[#10E775]/15 flex items-center justify-center text-[#10E775] border border-[#10E775]/30 shrink-0">
                        <span class="material-symbols-outlined text-xl">${m.type === 'workout' ? 'fitness_center' : 'restaurant'}</span>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="text-sm font-bold text-white capitalize truncate">${m.name}</h4>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-[#10E775] border border-emerald-500/25">
                                ${m.time || m.category || 'Comida'}
                            </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-mono">
                            <span class="px-2 py-0.5 rounded-md bg-[#10E775]/15 text-[#10E775] font-bold">${m.calories} kcal</span>
                            <span class="text-emerald-200">P: <strong>${Math.round(m.macros?.protein || 0)}g</strong></span>
                            <span class="text-emerald-300">C: <strong>${Math.round(m.macros?.carbs || 0)}g</strong></span>
                            <span class="text-lime-300">G: <strong>${Math.round(m.macros?.fat || 0)}g</strong></span>
                            <span class="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/25 font-semibold">Na: ${getMealSodium(m)}mg</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                    <button class="delete-meal-btn size-8 rounded-xl text-emerald-300/50 hover:text-emerald-200 hover:bg-emerald-500/15 transition-colors flex items-center justify-center cursor-pointer" data-id="${m.id}" title="Eliminar comida">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>

            <!-- Satiety & Sensations Badge / Feedback -->
            ${renderSatietyBadge(m)}
        </div>
    `).join('');
};

export const attachDashboardEvents = () => {
    const state = getState();
    const input = document.getElementById('quick-log-input');
    const btn = document.getElementById('quick-log-btn');
    const mobileAddBtn = document.getElementById('mobile-central-add-btn');
    const fileInput = document.getElementById('quick-log-file');
    const barcodeBtn = document.getElementById('open-barcode-modal-btn');
    const modal = document.getElementById('meal-modal');
    const barcodeModal = document.getElementById('barcode-modal');

    // Analysis Logic (OpenAI)
    const handleAnalysis = async (text, file) => {
        if (!text && !file) return;

        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-slate-900">refresh</span>`;
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
                const meal = result.meals[0];
                const fallbackDate = state.selectedDate || getArgentinaDate();
                meal.date = fallbackDate;
                showMealConfirmation(meal);
            } else {
                window.router.navigate('dashboard');
            }
        } catch (e) {
            window.showAlert?.('Error en Análisis', e.message || 'No se pudo analizar el alimento', 'error');
        } finally {
            btn.innerHTML = `<span class="material-symbols-outlined text-lg">add_circle</span><span class="hidden sm:inline">Registrar</span>`;
            btn.disabled = false;
        }
    };

    // Quick Food Chips 1-Click
    document.querySelectorAll('.quick-food-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const foodText = chip.dataset.food;
            if (input && foodText) {
                input.value = foodText;
                handleAnalysis(foodText, null);
            }
        });
    });

    // Barcode Scanner Modal Logic
    barcodeBtn?.addEventListener('click', () => {
        showBarcodeScannerModal();
    });

    const showBarcodeScannerModal = () => {
        barcodeModal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up border border-emerald-500/30 shadow-2xl">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#10E775] text-xl">barcode_scanner</span>
                        <h3 class="text-lg font-display font-extrabold text-white uppercase">Escanear Código de Barras</h3>
                    </div>
                    <button id="close-barcode-btn" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Camera viewport for HTML5 QRCode -->
                <div id="qr-reader-container" class="w-full h-64 bg-black rounded-2xl overflow-hidden mb-4 relative flex items-center justify-center border border-emerald-500/20">
                    <div id="qr-reader" class="w-full h-full"></div>
                </div>

                <div class="flex flex-col gap-3">
                    <p class="text-xs text-emerald-300/70 text-center">O ingresa el número de código de barras:</p>
                    <div class="flex gap-2">
                        <input id="manual-barcode-input" type="number" placeholder="ej. 7790070412059" class="flex-1 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none">
                        <button id="manual-barcode-search-btn" class="btn-emerald px-4 py-2 text-xs font-bold">Buscar</button>
                    </div>
                </div>
            </div>
        `;
        barcodeModal.classList.remove('hidden');

        document.getElementById('close-barcode-btn').onclick = () => {
            stopBarcodeScanner();
            barcodeModal.classList.add('hidden');
        };

        const handleBarcodeFound = async (barcode) => {
            stopBarcodeScanner();
            barcodeModal.classList.add('hidden');

            try {
                const product = await getProductByBarcode(barcode);
                if (!product) {
                    window.showAlert?.('No encontrado', `El código ${barcode} no está en la base de datos de Open Food Facts.`, 'info');
                    return;
                }

                showMealConfirmation({
                    name: `${product.brand ? product.brand + ' - ' : ''}${product.name}`,
                    calories: product.per100g.calories,
                    category: 'Almuerzo',
                    macros: {
                        protein: product.per100g.protein,
                        carbs: product.per100g.carbs,
                        fat: product.per100g.fat,
                        sodium: product.per100g.sodium || 0
                    }
                });
            } catch (err) {
                window.showAlert?.('Error', 'No se pudo consultar el código de barras.', 'error');
            }
        };

        // Manual search
        document.getElementById('manual-barcode-search-btn').onclick = () => {
            const val = document.getElementById('manual-barcode-input').value;
            if (val) handleBarcodeFound(val);
        };

        // Start Camera Scanner if Html5Qrcode is available
        if (window.Html5Qrcode) {
            try {
                barcodeScannerInstance = new window.Html5Qrcode("qr-reader");
                barcodeScannerInstance.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 180 } },
                    (decodedText) => {
                        handleBarcodeFound(decodedText);
                    },
                    () => {}
                ).catch(e => {
                    console.warn("Camera start error (permission or device):", e);
                });
            } catch (e) {
                console.warn("Scanner init failed:", e);
            }
        }
    };

    const stopBarcodeScanner = () => {
        if (barcodeScannerInstance) {
            barcodeScannerInstance.stop().then(() => {
                barcodeScannerInstance.clear();
                barcodeScannerInstance = null;
            }).catch(() => {
                barcodeScannerInstance = null;
            });
        }
    };

    // Meal Confirmation / Add Modal
    const showMealConfirmation = (mealData) => {
        const categories = ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Media Tarde", "Cena"];
        const todayDate = getArgentinaDate();

        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-2xl border border-emerald-500/30">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                    <span class="badge-emerald text-xs">Confirmar Registro</span>
                    <button id="close-meal-modal-btn" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="flex flex-col gap-4">
                    <div>
                        <label class="text-xs font-bold text-emerald-300/70 uppercase">Nombre del Alimento</label>
                        <input id="confirm-meal-name" value="${mealData.name || ''}" class="w-full rounded-xl px-3 py-2 text-base font-bold text-white outline-none mt-1" />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-emerald-300/70 uppercase">Calorías (kcal)</label>
                            <input id="confirm-meal-cals" type="number" value="${mealData.calories || 0}" class="w-full rounded-xl px-3 py-2 text-lg font-mono font-bold text-[#10E775] outline-none mt-1" />
                        </div>
                        <div>
                            <label class="text-xs font-bold text-emerald-300/70 uppercase">Momento</label>
                            <select id="confirm-meal-category" class="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white outline-none mt-1">
                                ${categories.map(c => `<option value="${c}" ${mealData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-4 gap-2 p-3 bg-[#040B08]/70 rounded-2xl border border-emerald-500/20">
                        <div>
                            <span class="text-[10px] font-bold uppercase text-[#10E775]">Proteína</span>
                            <input id="confirm-meal-p" type="number" value="${Math.round(mealData.macros?.protein || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase text-emerald-300">Carbos</span>
                            <input id="confirm-meal-c" type="number" value="${Math.round(mealData.macros?.carbs || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase text-lime-400">Grasas</span>
                            <input id="confirm-meal-f" type="number" value="${Math.round(mealData.macros?.fat || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase text-teal-300">Sodio (mg)</span>
                            <input id="confirm-meal-na" type="number" value="${getMealSodium(mealData)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                    </div>

                    <!-- Sensations & Satiety Inputs -->
                    <div class="p-3 bg-[#040B08]/70 rounded-2xl border border-emerald-500/20 flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <label class="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Sensación & Plenitud</label>
                            <span class="text-[10px] text-[#10E775] font-mono" id="confirm-satiety-label">⚖️ En su punto (3/5)</span>
                        </div>
                        <div class="grid grid-cols-5 gap-1.5" id="quick-satiety-selector">
                            <button type="button" class="quick-satiety-btn p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/50 text-center transition-all cursor-pointer" data-score="1" title="Con hambre">
                                <span class="text-base">🥣</span>
                                <span class="text-[8px] font-bold block text-emerald-300/70 mt-0.5">Hambre</span>
                            </button>
                            <button type="button" class="quick-satiety-btn p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/50 text-center transition-all cursor-pointer" data-score="2" title="Ligero">
                                <span class="text-base">🥗</span>
                                <span class="text-[8px] font-bold block text-emerald-300/70 mt-0.5">Ligero</span>
                            </button>
                            <button type="button" class="quick-satiety-btn p-2 rounded-xl border-2 border-[#10E775] bg-[#10E775]/20 text-center shadow-xs transition-all cursor-pointer" data-score="3" title="En su punto">
                                <span class="text-base">⚖️</span>
                                <span class="text-[8px] font-bold block text-[#10E775] mt-0.5">Óptimo</span>
                            </button>
                            <button type="button" class="quick-satiety-btn p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/50 text-center transition-all cursor-pointer" data-score="4" title="Muy lleno">
                                <span class="text-base">🍕</span>
                                <span class="text-[8px] font-bold block text-emerald-300/70 mt-0.5">Lleno</span>
                            </button>
                            <button type="button" class="quick-satiety-btn p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/50 text-center transition-all cursor-pointer" data-score="5" title="Pesado">
                                <span class="text-base">🫄</span>
                                <span class="text-[8px] font-bold block text-emerald-300/70 mt-0.5">Pesado</span>
                            </button>
                        </div>
                        <input id="confirm-meal-opinion" type="text" placeholder="Opinión o sensación (ej: Dejé la mitad por Dutide)..." value="${mealData.opinion || ''}" class="w-full rounded-xl px-3 py-2 text-xs outline-none mt-1" />
                    </div>

                    <div class="flex gap-2 mt-2">
                        <button id="cancel-meal-btn" class="flex-1 btn-ghost-light py-3 text-xs font-bold cursor-pointer">Cancelar</button>
                        <button id="save-meal-btn" class="flex-1 btn-emerald py-3 text-xs font-bold cursor-pointer">Guardar en Diario</button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        let selectedSatietyScore = mealData.satiety_score ? Number(mealData.satiety_score) : 3;
        const labelsMap = {
            1: '🥣 Con hambre (1/5)',
            2: '🥗 Ligero (2/5)',
            3: '⚖️ En su punto (3/5)',
            4: '🍕 Muy lleno (4/5)',
            5: '🫄 Pesado (5/5)'
        };

        const updateQuickButtonsUI = () => {
            document.querySelectorAll('.quick-satiety-btn').forEach(btn => {
                const s = Number(btn.dataset.score);
                if (s === selectedSatietyScore) {
                    btn.className = 'quick-satiety-btn p-2 rounded-xl border-2 border-[#10E775] bg-[#10E775]/20 text-center shadow-xs transition-all cursor-pointer scale-105';
                } else {
                    btn.className = 'quick-satiety-btn p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/50 text-center hover:border-emerald-500/40 transition-all cursor-pointer';
                }
            });
            const lbl = document.getElementById('confirm-satiety-label');
            if (lbl) lbl.textContent = labelsMap[selectedSatietyScore] || 'En su punto';
        };

        document.querySelectorAll('.quick-satiety-btn').forEach(btn => {
            btn.onclick = () => {
                selectedSatietyScore = Number(btn.dataset.score);
                updateQuickButtonsUI();
            };
        });

        document.getElementById('close-meal-modal-btn').onclick = () => modal.classList.add('hidden');
        document.getElementById('cancel-meal-btn').onclick = () => modal.classList.add('hidden');

        document.getElementById('save-meal-btn').onclick = () => {
            const name = document.getElementById('confirm-meal-name').value;
            const calories = parseInt(document.getElementById('confirm-meal-cals').value) || 0;
            const category = document.getElementById('confirm-meal-category').value;
            const protein = parseInt(document.getElementById('confirm-meal-p').value) || 0;
            const carbs = parseInt(document.getElementById('confirm-meal-c').value) || 0;
            const fat = parseInt(document.getElementById('confirm-meal-f').value) || 0;
            const sodium = parseInt(document.getElementById('confirm-meal-na')?.value) || 0;
            const opinion = document.getElementById('confirm-meal-opinion')?.value?.trim() || null;

            let sensations = mealData.sensations || [];
            if (selectedSatietyScore === 3 && sensations.length === 0) {
                sensations = ['Saciedad temprana'];
            } else if (selectedSatietyScore >= 4 && sensations.length === 0) {
                sensations = ['Pesadez abdominal'];
            }

            addMeal({
                name,
                calories,
                category,
                time: category,
                date: state.selectedDate || todayDate,
                macros: { protein, carbs, fat, sodium },
                satiety_score: selectedSatietyScore,
                sensations: sensations,
                opinion: opinion
            });

            modal.classList.add('hidden');
            window.router.navigate('dashboard');
        };
    };

    // Events attachment
    btn?.addEventListener('click', () => handleAnalysis(input.value, fileInput.files[0]));
    mobileAddBtn?.addEventListener('click', () => {
        showMealConfirmation({ name: '', calories: 300, category: 'Almuerzo', macros: { protein: 20, carbs: 30, fat: 10 } });
    });

    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalysis(input.value, fileInput.files[0]);
    });

    fileInput?.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleAnalysis('', fileInput.files[0]);
        }
    });

    document.getElementById('add-water-btn')?.addEventListener('click', () => {
        const date = state.selectedDate || getArgentinaDate();
        const currentWater = state.days?.[date]?.water || 0;
        updateDayStat(date, 'water', currentWater + 250);
        window.router.navigate('dashboard');
    });

    document.getElementById('prev-day-btn')?.addEventListener('click', () => {
        const d = new Date((state.selectedDate || getArgentinaDate()) + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
        window.router.navigate('dashboard');
    });

    document.getElementById('next-day-btn')?.addEventListener('click', () => {
        const d = new Date((state.selectedDate || getArgentinaDate()) + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
        window.router.navigate('dashboard');
    });

    document.getElementById('open-calendar-btn')?.addEventListener('click', () => {
        window.router.navigate('calendar');
    });

    document.querySelectorAll('.delete-meal-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            window.showConfirm?.('¿Eliminar comida?', 'Esta comida se quitará de tus calorías diarias.', () => {
                deleteMeal(id);
                window.router.navigate('dashboard');
            });
        });
    });

    // Attach sensations modal feedback triggers
    attachSensationsModalEvents(() => {
        window.router.navigate('dashboard');
    });
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
