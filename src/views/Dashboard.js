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
    startFasting,
    stopFasting,
    getFastingProgress 
} from '../state';
import { analyzeFood, generateDailyTip, generateSmartHabits } from '../services/openai';
import { getProductByBarcode } from '../services/openfoodfacts';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

let barcodeScannerInstance = null;

export const renderDashboard = () => {
    const state = getState();
    const today = getArgentinaDate();
    const selectedDate = state.selectedDate || today;
    const isToday = selectedDate === today;

    // Daily Stats & Burn
    const stats = getDailyStats(selectedDate);
    const dailyBurn = getDailyBurn(selectedDate);
    const dayStats = state.days?.[selectedDate] || {};
    const fasting = getFastingProgress();

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

    const calProgress = Math.min(100, Math.round((stats.calories / calGoal) * 100));
    const remainingCals = Math.max(0, calGoal - stats.calories);

    const pPct = Math.min(100, Math.round((stats.protein / pGoal) * 100));
    const cPct = Math.min(100, Math.round((stats.carbs / cGoal) * 100));
    const fPct = Math.min(100, Math.round((stats.fat / fGoal) * 100));

    const displayTip = (state.dailyTip?.date === selectedDate && state.dailyTip?.content)
        ? state.dailyTip.content
        : "Prioriza fuentes de proteína limpia e hidratación constante hoy.";

    const waterAmount = dayStats.water || 0;
    const waterGoal = 2500;
    const waterPct = Math.min(100, Math.round((waterAmount / waterGoal) * 100));

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('dashboard')}

        <!-- Main Workspace -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('GrowFit')}

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-5xl mx-auto flex flex-col gap-6">

                    <!-- Top Welcome & Date Bar -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-white p-5 rounded-3xl border border-border-soft shadow-xs">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="badge-emerald">Tracker Diario</span>
                                <span class="text-xs text-text-muted font-bold flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm text-amber-500">local_fire_department</span> Racha Activa
                                </span>
                            </div>
                            <h2 class="text-2xl md:text-3xl font-display font-black text-text-emerald uppercase tracking-tight">
                                ¡Hola, ${state.profile.name || 'Atleta'}!
                            </h2>
                        </div>

                        <!-- Date Navigation Buttons -->
                        <div class="flex items-center gap-2">
                            <div class="flex items-center bg-slate-100 p-1 rounded-2xl border border-border-soft">
                                <button id="prev-day-btn" class="size-8 rounded-xl bg-white hover:bg-emerald-50 text-text-emerald transition-all flex items-center justify-center shadow-xs">
                                    <span class="material-symbols-outlined text-base">chevron_left</span>
                                </button>
                                <span class="px-3 text-xs font-bold text-text-primary font-mono">
                                    ${isToday ? 'HOY' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                                </span>
                                <button id="next-day-btn" class="size-8 rounded-xl bg-white hover:bg-emerald-50 text-text-emerald transition-all flex items-center justify-center shadow-xs">
                                    <span class="material-symbols-outlined text-base">chevron_right</span>
                                </button>
                            </div>
                            <button id="open-calendar-btn" class="size-10 rounded-2xl bg-white border border-border-soft text-text-emerald flex items-center justify-center hover:bg-emerald-50 transition-all shadow-xs">
                                <span class="material-symbols-outlined text-lg">calendar_month</span>
                            </button>
                        </div>
                    </div>

                    <!-- Quick Input Bar (Food, Voice, Photo & Barcode) -->
                    <div class="white-card p-3 md:p-4 bg-gradient-to-r from-white via-emerald-50/30 to-white border-2 border-emerald-200 shadow-sm">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                <span class="material-symbols-outlined text-slate-400 text-xl mr-2">search</span>
                                <input id="quick-log-input" type="text" placeholder="¿Qué comiste? ej. 2 huevos con tostada y café..." class="w-full bg-transparent border-none outline-none text-sm font-medium text-text-primary placeholder:text-slate-400" />
                            </div>

                            <!-- Camera AI Button -->
                            <input type="file" id="quick-log-file" accept="image/*" class="hidden">
                            <label for="quick-log-file" title="Subir foto de comida (IA)" class="size-11 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-text-emerald border border-emerald-200 flex items-center justify-center cursor-pointer transition-all active:scale-95">
                                <span class="material-symbols-outlined text-xl">photo_camera</span>
                            </label>

                            <!-- Barcode Scanner Button -->
                            <button id="open-barcode-modal-btn" title="Escanear código de barras" class="size-11 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-text-emerald border border-emerald-200 flex items-center justify-center transition-all active:scale-95">
                                <span class="material-symbols-outlined text-xl">barcode_scanner</span>
                            </button>

                            <!-- Submit / Add Button -->
                            <button id="quick-log-btn" class="btn-emerald px-4 py-2.5 h-11 text-sm font-bold shadow-emerald-sm">
                                <span class="material-symbols-outlined text-xl">add</span>
                                <span class="hidden sm:inline">Registrar</span>
                            </button>
                        </div>
                    </div>

                    <!-- Main Metric Bento Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
                        
                        <!-- Calorie Summary Card (7 Cols) -->
                        <div class="md:col-span-7 white-card p-6 flex flex-col justify-between">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Balance Calórico Diario</span>
                                    <h3 class="text-3xl font-display font-black text-text-emerald mt-0.5">
                                        ${Math.round(stats.calories)} <span class="text-base font-normal text-text-muted">/ ${calGoal} kcal</span>
                                    </h3>
                                </div>
                                <span class="badge-emerald">${calProgress}% Meta</span>
                            </div>

                            <!-- Progress Bar -->
                            <div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 mb-4">
                                <div class="h-full bg-gradient-to-r from-emerald-400 to-primary rounded-full transition-all duration-500 shadow-emerald-sm" style="width: ${calProgress}%"></div>
                            </div>

                            <!-- Metrics Row -->
                            <div class="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                                <div class="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Consumidas</span>
                                    <p class="text-lg font-display font-black text-text-emerald">${Math.round(stats.calories)}</p>
                                </div>
                                <div class="p-2.5 rounded-2xl bg-orange-50/60 border border-orange-100">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Quemadas</span>
                                    <p class="text-lg font-display font-black text-orange-600">${Math.round(dailyBurn.activity)}</p>
                                </div>
                                <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Restantes</span>
                                    <p class="text-lg font-display font-black text-slate-800">${remainingCals}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Intermittent Fasting Card (5 Cols) -->
                        <div class="md:col-span-5 white-card p-6 flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/40 border-emerald-200">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="flex items-center gap-1.5 mb-1">
                                        <span class="material-symbols-outlined text-primary text-base">timer</span>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-text-emerald">Ayuno Intermitente</span>
                                    </div>
                                    <h4 class="text-xl font-display font-black text-text-primary">Protocolo ${fasting.protocol}</h4>
                                </div>
                                <span class="badge-emerald">${fasting.isActive ? 'En Curso' : 'En Pausa'}</span>
                            </div>

                            <div class="my-4 flex items-center justify-between gap-4">
                                <div>
                                    <p class="text-3xl font-display font-black text-text-emerald">${fasting.isActive ? fasting.elapsedFormatted : '0h 0m'}</p>
                                    <p class="text-xs text-text-muted font-medium">${fasting.isActive ? fasting.stage : 'Meta: ' + fasting.targetHours + ' hrs'}</p>
                                </div>
                                <div class="size-16 rounded-full border-4 border-slate-100 relative flex items-center justify-center ${fasting.isActive ? 'border-primary' : ''}">
                                    <span class="material-symbols-outlined text-2xl ${fasting.isActive ? 'text-primary animate-pulse' : 'text-slate-300'}">local_fire_department</span>
                                </div>
                            </div>

                            <button id="toggle-fasting-btn" class="w-full ${fasting.isActive ? 'btn-emerald-soft' : 'btn-emerald'} py-2.5 text-xs font-bold">
                                ${fasting.isActive ? 'Finalizar Ayuno' : 'Iniciar Ayuno (' + fasting.protocol + ')'}
                            </button>
                        </div>
                    </div>

                    <!-- Macronutrient Split Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <!-- Protein -->
                        <div class="white-card p-5 border-l-4 border-l-emerald-500">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-bold text-text-muted uppercase">Proteína</span>
                                <span class="text-xs font-mono font-bold text-emerald-600">${Math.round(stats.protein)} / ${pGoal}g</span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div class="h-full bg-emerald-500 rounded-full" style="width: ${pPct}%"></div>
                            </div>
                            <span class="text-[10px] text-text-muted font-medium">${pPct}% completado</span>
                        </div>

                        <!-- Carbs -->
                        <div class="white-card p-5 border-l-4 border-l-blue-500">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-bold text-text-muted uppercase">Carbohidratos</span>
                                <span class="text-xs font-mono font-bold text-blue-600">${Math.round(stats.carbs)} / ${cGoal}g</span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div class="h-full bg-blue-500 rounded-full" style="width: ${cPct}%"></div>
                            </div>
                            <span class="text-[10px] text-text-muted font-medium">${cPct}% completado</span>
                        </div>

                        <!-- Fats -->
                        <div class="white-card p-5 border-l-4 border-l-amber-500">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-bold text-text-muted uppercase">Grasas</span>
                                <span class="text-xs font-mono font-bold text-amber-600">${Math.round(stats.fat)} / ${fGoal}g</span>
                            </div>
                            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div class="h-full bg-amber-500 rounded-full" style="width: ${fPct}%"></div>
                            </div>
                            <span class="text-[10px] text-text-muted font-medium">${fPct}% completado</span>
                        </div>
                    </div>

                    <!-- Hydration & AI Coach Row -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        <!-- Hydration Card -->
                        <div class="white-card p-5 flex items-center justify-between">
                            <div class="flex items-center gap-3.5">
                                <div class="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <span class="material-symbols-outlined text-2xl">water_drop</span>
                                </div>
                                <div>
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Hidratación</span>
                                    <h4 class="text-xl font-display font-black text-text-primary">${waterAmount} <span class="text-xs font-normal text-text-muted">/ ${waterGoal} ml</span></h4>
                                    <div class="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden mt-1">
                                        <div class="h-full bg-blue-500 rounded-full" style="width: ${waterPct}%"></div>
                                    </div>
                                </div>
                            </div>
                            <button id="add-water-btn" class="btn-emerald-soft px-3.5 py-2 text-xs font-bold">
                                <span class="material-symbols-outlined text-base">add</span> +250 ml
                            </button>
                        </div>

                        <!-- AI Coach Tip Card -->
                        <div class="white-card p-5 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200 flex flex-col justify-between">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="material-symbols-outlined text-primary text-base">auto_awesome</span>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-text-emerald">AI Coach Insight</span>
                            </div>
                            <p class="text-xs text-text-primary/90 font-medium italic leading-relaxed">"${displayTip}"</p>
                        </div>
                    </div>

                    <!-- Daily Meal Timeline -->
                    <div class="white-card p-6">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary text-xl">restaurant_menu</span>
                                <h3 class="text-lg font-display font-black text-text-emerald uppercase tracking-tight">Comidas Registradas</h3>
                            </div>
                            <button onclick="window.router.navigate('tracker')" class="btn-emerald-soft text-xs px-3 py-1.5 font-bold">
                                Ver Diario Completo →
                            </button>
                        </div>

                        <div class="flex flex-col gap-3">
                            ${renderMealsList(state, selectedDate)}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('dashboard')}
        </main>

        <!-- Global Modals Container -->
        <div id="meal-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"></div>
        <div id="barcode-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"></div>
    </div>
    `;
};

const renderMealsList = (state, selectedDate) => {
    const activeDate = selectedDate || state.selectedDate || getArgentinaDate();
    const meals = (state.dailyLog || []).filter(m => m.date === activeDate);

    if (!meals.length) {
        return `
            <div class="py-10 text-center flex flex-col items-center gap-2">
                <div class="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <span class="material-symbols-outlined text-2xl">restaurant</span>
                </div>
                <p class="text-sm font-semibold text-text-muted">No has registrado comidas para este día</p>
                <p class="text-xs text-slate-400">Escribe lo que comiste o escanea un código de barras arriba.</p>
            </div>
        `;
    }

    return meals.map(m => `
        <div class="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 hover:border-emerald-200 transition-all">
            <div class="flex items-center gap-3.5">
                <div class="size-10 rounded-xl bg-primary-light flex items-center justify-center text-primary border border-border-emerald">
                    <span class="material-symbols-outlined text-lg">${m.type === 'workout' ? 'fitness_center' : 'restaurant'}</span>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h4 class="text-sm font-bold text-text-primary capitalize">${m.name}</h4>
                        <span class="px-2 py-0.5 rounded-full bg-white text-[9px] font-bold text-text-emerald border border-slate-200">
                            ${m.time || m.category || 'Comida'}
                        </span>
                    </div>
                    <p class="text-xs font-mono text-text-muted mt-0.5">
                        <strong class="text-text-emerald">${m.calories} kcal</strong> · P:${Math.round(m.macros?.protein || 0)}g C:${Math.round(m.macros?.carbs || 0)}g G:${Math.round(m.macros?.fat || 0)}g
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-1">
                <button class="delete-meal-btn size-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center" data-id="${m.id}">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
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
    const fastingBtn = document.getElementById('toggle-fasting-btn');
    const modal = document.getElementById('meal-modal');
    const barcodeModal = document.getElementById('barcode-modal');

    // Analysis Logic (OpenAI)
    const handleAnalysis = async (text, file) => {
        if (!text && !file) return;

        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-white">refresh</span>`;
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
            btn.innerHTML = `<span class="material-symbols-outlined text-xl">add</span><span class="hidden sm:inline">Registrar</span>`;
            btn.disabled = false;
        }
    };

    // Fasting Toggle
    fastingBtn?.addEventListener('click', () => {
        const f = getFastingProgress();
        if (f.isActive) {
            stopFasting();
            window.showAlert?.('¡Ayuno Completado!', `Completaste tu ciclo de ayuno con éxito.`, 'success');
        } else {
            startFasting('16:8', 16);
            window.showAlert?.('Ayuno Iniciado', 'Cronómetro de ayuno 16:8 activo.', 'success');
        }
        window.router.navigate('dashboard');
    });

    // Barcode Scanner Modal Logic
    barcodeBtn?.addEventListener('click', () => {
        showBarcodeScannerModal();
    });

    const showBarcodeScannerModal = () => {
        barcodeModal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-xl">barcode_scanner</span>
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase">Escanear Código de Barras</h3>
                    </div>
                    <button id="close-barcode-btn" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Camera viewport for HTML5 QRCode -->
                <div id="qr-reader-container" class="w-full h-64 bg-slate-950 rounded-2xl overflow-hidden mb-4 relative flex items-center justify-center">
                    <div id="qr-reader" class="w-full h-full"></div>
                </div>

                <div class="flex flex-col gap-3">
                    <p class="text-xs text-text-muted text-center">O ingresa el número de código de barras:</p>
                    <div class="flex gap-2">
                        <input id="manual-barcode-input" type="number" placeholder="ej. 7790070412059" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-primary">
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
                        fat: product.per100g.fat
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
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up shadow-emerald-md">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                    <span class="badge-emerald text-xs">Confirmar Registro</span>
                    <button id="close-meal-modal-btn" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="flex flex-col gap-4">
                    <div>
                        <label class="text-xs font-bold text-text-muted uppercase">Nombre del Alimento</label>
                        <input id="confirm-meal-name" value="${mealData.name || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold text-text-primary outline-none focus:border-primary mt-1" />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Calorías (kcal)</label>
                            <input id="confirm-meal-cals" type="number" value="${mealData.calories || 0}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-lg font-mono font-bold text-text-emerald outline-none focus:border-primary mt-1" />
                        </div>
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Momento</label>
                            <select id="confirm-meal-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary mt-1">
                                ${categories.map(c => `<option value="${c}" ${mealData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <div>
                            <span class="text-[10px] font-bold uppercase text-emerald-600">Proteína</span>
                            <input id="confirm-meal-p" type="number" value="${Math.round(mealData.macros?.protein || 0)}" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase text-blue-600">Carbos</span>
                            <input id="confirm-meal-c" type="number" value="${Math.round(mealData.macros?.carbs || 0)}" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase text-amber-600">Grasas</span>
                            <input id="confirm-meal-f" type="number" value="${Math.round(mealData.macros?.fat || 0)}" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1" />
                        </div>
                    </div>

                    <div class="flex gap-2 mt-2">
                        <button id="cancel-meal-btn" class="flex-1 btn-ghost-light py-3 text-xs font-bold">Cancelar</button>
                        <button id="save-meal-btn" class="flex-1 btn-emerald py-3 text-xs font-bold">Guardar en Diario</button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('close-meal-modal-btn').onclick = () => modal.classList.add('hidden');
        document.getElementById('cancel-meal-btn').onclick = () => modal.classList.add('hidden');

        document.getElementById('save-meal-btn').onclick = () => {
            const name = document.getElementById('confirm-meal-name').value;
            const calories = parseInt(document.getElementById('confirm-meal-cals').value) || 0;
            const category = document.getElementById('confirm-meal-category').value;
            const protein = parseInt(document.getElementById('confirm-meal-p').value) || 0;
            const carbs = parseInt(document.getElementById('confirm-meal-c').value) || 0;
            const fat = parseInt(document.getElementById('confirm-meal-f').value) || 0;

            addMeal({
                name,
                calories,
                category,
                time: category,
                date: state.selectedDate || todayDate,
                macros: { protein, carbs, fat }
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
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
