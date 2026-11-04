import { getState, addMeal, deleteMeal, getArgentinaDate, setSelectedDate, getSensationsMetrics, getMealSodium, getFrequentMeals } from '../state';
import { analyzeFood } from '../services/openai';
import { searchOpenFood } from '../services/openfoodfacts';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import { renderMealSensationsModalContainer, renderSatietyBadge, attachSensationsModalEvents } from '../components/MealSensationsModal';
import { attachVoiceDictation, openFridgeAiModal } from '../components/UnifiedEcosystemModals';

let activeCategoryForAdd = 'Almuerzo';

const CATEGORY_QUICK_FOODS = {
    'Desayuno': [
        '☕ Café con leche y 2 tostadas con queso',
        '🍳 2 huevos revueltos con palta y tostada',
        '🥣 Yogur griego con avena y frutas',
        '🥐 Mate cocido con 2 medialunas'
    ],
    'Media Mañana': [
        '🧀 2 chipá medianos con mate',
        '🍎 1 manzana con puñado de almendras',
        '🥛 Yogur descremado con cereales',
        '🥪 Tostado de jamón y queso'
    ],
    'Almuerzo': [
        '🍗 Pechuga de pollo grillé con ensalada mixta',
        '🥩 Milanesa de carne con ensalada de zanahoria',
        '🥗 Ensalada César con pollo y crutones',
        '🍝 Plato de fideos con filetto y queso rallado'
    ],
    'Merienda': [
        '🧉 Mate con 2 tostadas de pan integral y queso untable',
        '☕ Café con leche y 2 chipá',
        '🥞 Tortita de avena y banana con miel',
        '🥤 Batido de proteína Whey con agua'
    ],
    'Media Tarde': [
        '🍌 1 banana con 1 cucharada de pasta de maní',
        '🥚 2 huevos duros con tomates cherry',
        '🧀 Rollitos de jamón cocido y queso tybo',
        '🥤 Batido proteico post-entreno'
    ],
    'Cena': [
        '🐟 Filet de merluza al horno con puré de calabaza',
        '🍗 Pollo al horno con verduras asadas',
        '🥟 2 empanadas de carne al horno',
        '🍳 Omelette de 3 huevos con queso y espinaca'
    ]
};

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

export const renderTracker = () => {
    const state = getState();
    const today = getArgentinaDate();
    const selectedDate = state.selectedDate || today;
    const meals = (state.dailyLog || []).filter(m => m.date === selectedDate);

    const categories = [
        { id: 'Desayuno', label: 'Desayuno', icon: 'wb_sunny', desc: 'Comienza el día con energía' },
        { id: 'Media Mañana', label: 'Media Mañana', icon: 'coffee', desc: 'Colación ligera' },
        { id: 'Almuerzo', label: 'Almuerzo', icon: 'lunch_dining', desc: 'Comida principal' },
        { id: 'Merienda', label: 'Merienda', icon: 'bakery_dining', desc: 'Snack de la tarde' },
        { id: 'Media Tarde', label: 'Media Tarde', icon: 'local_cafe', desc: 'Recarga pre/post entreno' },
        { id: 'Cena', label: 'Cena', icon: 'dinner_dining', desc: 'Cierre nutricional del día' }
    ];

    const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
    const totalP = meals.reduce((s, m) => s + (m.macros?.protein || 0), 0);
    const totalC = meals.reduce((s, m) => s + (m.macros?.carbs || 0), 0);
    const totalF = meals.reduce((s, m) => s + (m.macros?.fat || 0), 0);
    const totalSodium = meals.reduce((s, m) => s + getMealSodium(m), 0);
    const dayMetrics = getSensationsMetrics(selectedDate);

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('tracker')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Diario de Comidas')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Summary Card -->
                    <div class="white-card card-glow-emerald p-6 shadow-xl relative overflow-hidden">
                        <!-- Green Food & Dumbbell Watermarks -->
                        <div class="pointer-events-none select-none absolute -right-4 -top-6 text-[#10E775] opacity-[0.09] rotate-12">
                            <span class="material-symbols-outlined text-[130px]">nutrition</span>
                        </div>
                        <div class="pointer-events-none select-none absolute right-48 -bottom-6 text-[#84CC16] opacity-[0.08] -rotate-12">
                            <span class="material-symbols-outlined text-[110px]">fitness_center</span>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Diario Nutricional</span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dayMetrics.statusBg} ${dayMetrics.statusColor} border border-emerald-500/20">
                                        ${dayMetrics.statusLabel}
                                    </span>
                                </div>
                                <h2 class="text-3xl font-display font-black text-white uppercase tracking-tight">Registro de Alimentos</h2>
                                <p class="text-xs text-emerald-300/70 mt-0.5">Control de calorías, macros y sensaciones de plenitud con Inteligencia Artificial.</p>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <span class="text-[10px] font-bold uppercase text-emerald-400/70">Total Diario</span>
                                    <p class="text-2xl font-display font-black text-[#10E775]">${totalCals} <span class="text-xs font-normal text-emerald-300/70">kcal</span></p>
                                </div>
                                <div class="h-10 w-px bg-emerald-500/20"></div>
                                <div class="text-xs font-mono font-bold space-y-0.5">
                                    <p class="text-[#10E775]">P: ${Math.round(totalP)}g</p>
                                    <p class="text-[#34D399]">C: ${Math.round(totalC)}g</p>
                                    <p class="text-[#84CC16]">G: ${Math.round(totalF)}g</p>
                                    <p class="text-[#2DD4BF]">Sodio: ${Math.round(totalSodium)}mg</p>
                                </div>
                            </div>
                        </div>

                        <!-- Mini Satiety Day Strip -->
                        <div class="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">🧠</span>
                                <span class="text-emerald-200 font-semibold">Saciedad del Día:</span>
                                <span class="font-mono font-bold text-white">${dayMetrics.avgScore ? `${dayMetrics.avgScore} / 5.0` : 'Sin registrar'}</span>
                                <span class="text-[11px] ${dayMetrics.statusColor}">(${dayMetrics.statusLabel})</span>
                            </div>
                            <button onclick="window.router.navigate('insights')" class="text-[#10E775] hover:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer">
                                <span>Ver Métricas & Estadísticas</span>
                                <span class="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
                        </div>
                    </div>

                    <!-- Barra Directa de Carga de Alimentos con IA + Voz + Foto + Heladera IA -->
                    <div class="white-card p-4 md:p-5 border border-[#10E775]/35 shadow-xl relative overflow-hidden">
                        <div class="flex flex-col gap-3">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#10E775] text-lg">auto_awesome</span>
                                    <span class="text-xs font-display font-extrabold uppercase tracking-wider text-white">Cargar Alimento con IA, Voz o Foto</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <button id="tracker-open-fridge-btn" class="px-3 py-1 rounded-xl bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/35 text-[#10E775] text-xs font-extrabold flex items-center gap-1 cursor-pointer">
                                        <span class="material-symbols-outlined text-sm">kitchen</span>
                                        <span>¿Qué cocino con mi heladera?</span>
                                    </button>
                                    <span class="text-[10px] font-bold uppercase text-emerald-300/75">Momento:</span>
                                    <select id="tracker-top-ai-category" class="rounded-xl px-2.5 py-1 text-xs font-bold text-[#10E775] bg-[#040B08] border border-emerald-500/30 outline-none">
                                        ${categories.map(c => `<option value="${c.id}" ${c.id === 'Almuerzo' ? 'selected' : ''}>${c.label}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                <div class="flex items-center flex-1 gap-2 px-3.5 py-2 bg-[#040B08]/90 rounded-2xl border border-emerald-500/25 focus-within:border-[#10E775]">
                                    <span class="material-symbols-outlined text-[#10E775] text-xl">restaurant</span>
                                    <input id="tracker-top-ai-input" type="text" placeholder="¿Qué comiste? Ej: 2 huevos con tostada y café, o 2 chipá..." class="w-full bg-transparent border-none outline-none text-sm font-semibold text-white placeholder:text-emerald-300/40" />
                                    <button id="tracker-top-voice-btn" type="button" title="Dictar por voz" class="size-8 rounded-xl bg-emerald-950/90 hover:bg-[#10E775]/20 text-[#10E775] flex items-center justify-center cursor-pointer shrink-0">
                                        <span class="material-symbols-outlined text-base">mic</span>
                                    </button>
                                </div>

                                <div class="flex items-center gap-2">
                                    <label for="tracker-top-ai-photo" class="btn-ghost-light p-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold" title="Subir o tomar foto del plato">
                                        <span class="material-symbols-outlined text-xl text-[#10E775]">photo_camera</span>
                                        <span class="sm:hidden">Foto</span>
                                        <input id="tracker-top-ai-photo" type="file" accept="image/*" class="hidden" />
                                    </label>

                                    <button id="tracker-top-ai-btn" class="btn-emerald flex-1 sm:flex-initial px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                                        <span class="material-symbols-outlined text-lg">auto_awesome</span>
                                        <span>Analizar con IA</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Platos Frecuentes de 1 Toque -->
                            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/75 shrink-0">Frecuentes 1-Clic:</span>
                                ${getFrequentMeals(5).map(fav => `
                                    <button type="button" class="tracker-fav-meal-chip px-3 py-1 rounded-full bg-[#10E775]/15 hover:bg-[#10E775]/30 border border-[#10E775]/35 text-[11px] font-bold text-[#10E775] hover:text-white transition-all shrink-0 cursor-pointer" data-fav='${JSON.stringify(fav).replace(/'/g, "&apos;")}'>
                                        ⭐ ${fav.name} (${fav.calories} kcal)
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Category Sections -->
                    <div class="flex flex-col gap-4">
                        ${categories.map(cat => {
                            const catMeals = meals.filter(m => (m.category === cat.id || m.time === cat.id));
                            const catCals = catMeals.reduce((s, m) => s + (m.calories || 0), 0);
                            const catP = catMeals.reduce((s, m) => s + (m.macros?.protein || 0), 0);
                            const catC = catMeals.reduce((s, m) => s + (m.macros?.carbs || 0), 0);
                            const catF = catMeals.reduce((s, m) => s + (m.macros?.fat || 0), 0);
                            const catSodium = catMeals.reduce((s, m) => s + getMealSodium(m), 0);

                            return `
                            <div class="white-card p-5 border border-emerald-500/15">
                                <div class="flex items-center justify-between pb-3 border-b border-emerald-500/15">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-2xl bg-emerald-500/20 text-[#10E775] flex items-center justify-center border border-emerald-500/30">
                                            <span class="material-symbols-outlined text-xl">${cat.icon}</span>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-display font-black text-white uppercase tracking-tight">${cat.label}</h3>
                                            <p class="text-xs font-mono font-semibold text-[#10E775]">${catCals} kcal ${catMeals.length ? `· P:${Math.round(catP)}g C:${Math.round(catC)}g G:${Math.round(catF)}g · <span class="text-[#2DD4BF]">Sodio:${Math.round(catSodium)}mg</span>` : ''}</p>
                                        </div>
                                    </div>

                                    <button class="add-meal-cat-btn btn-emerald-soft text-xs px-3.5 py-1.5 font-bold cursor-pointer flex items-center gap-1" data-category="${cat.id}">
                                        <span class="material-symbols-outlined text-sm">auto_awesome</span> + Agregar
                                    </button>
                                </div>

                                <!-- Meals List inside Category -->
                                <div class="mt-3 flex flex-col gap-2">
                                    ${catMeals.length ? catMeals.map(m => `
                                        <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/15 hover:border-emerald-500/35 transition-all flex flex-col gap-1.5">
                                            <div class="flex items-center justify-between">
                                                <div>
                                                    <h4 class="text-sm font-bold text-white capitalize">${m.name}</h4>
                                                    <p class="text-xs font-mono text-emerald-300/75 mt-0.5">
                                                        <strong class="text-[#10E775]">${m.calories} kcal</strong> · P:${Math.round(m.macros?.protein || 0)}g C:${Math.round(m.macros?.carbs || 0)}g G:${Math.round(m.macros?.fat || 0)}g · <span class="text-[#2DD4BF] font-semibold">Sodio: ${getMealSodium(m)}mg</span>
                                                    </p>
                                                </div>
                                                <button class="delete-tracker-meal-btn size-7 rounded-lg text-emerald-400/50 hover:text-emerald-200 hover:bg-emerald-500/15 flex items-center justify-center transition-colors cursor-pointer" data-id="${m.id}" title="Eliminar alimento">
                                                    <span class="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                            <!-- Satiety & Sensations Badge -->
                                            ${renderSatietyBadge(m)}
                                        </div>
                                    `).join('') : `
                                        <p class="text-xs text-emerald-400/50 italic py-2 text-center">Sin registros en ${cat.label}</p>
                                    `}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>

                </div>
            </div>

            ${renderBottomNav('tracker')}
        </main>

        <!-- Add Meal & AI Modal -->
        <div id="tracker-add-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"></div>
        <div id="tracker-fridge-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"></div>
        ${renderMealSensationsModalContainer()}
    </div>
    `;
};

export const attachTrackerEvents = () => {
    const state = getState();
    const modal = document.getElementById('tracker-add-modal');
    const fridgeModal = document.getElementById('tracker-fridge-modal');

    document.querySelectorAll('.add-meal-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeCategoryForAdd = e.currentTarget.dataset.category || 'Almuerzo';
            openAddMealModal(activeCategoryForAdd);
        });
    });

    document.querySelectorAll('.delete-tracker-meal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            window.showConfirm?.('¿Eliminar alimento?', 'Se restará del total de calorías del día.', () => {
                deleteMeal(id);
                window.router.navigate('tracker');
            });
        });
    });

    // Attach sensations feedback modal events
    attachSensationsModalEvents(() => {
        window.router.navigate('tracker');
    });

    // Top AI Food Bar Events
    const topAiInput = document.getElementById('tracker-top-ai-input');
    const topAiCategory = document.getElementById('tracker-top-ai-category');
    const topAiPhoto = document.getElementById('tracker-top-ai-photo');
    const topAiBtn = document.getElementById('tracker-top-ai-btn');
    const topVoiceBtn = document.getElementById('tracker-top-voice-btn');

    const runTopAiAnalysis = (text, file) => {
        const chosenCat = topAiCategory?.value || 'Almuerzo';
        openAddMealModal(chosenCat, text, file);
    };

    if (topVoiceBtn && topAiInput) {
        attachVoiceDictation(topVoiceBtn, topAiInput, (transcript) => {
            runTopAiAnalysis(transcript, null);
        });
    }

    document.getElementById('tracker-open-fridge-btn')?.addEventListener('click', () => {
        if (fridgeModal) {
            openFridgeAiModal(fridgeModal, () => window.router.navigate('tracker'));
        }
    });

    document.querySelectorAll('.tracker-fav-meal-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            try {
                const fav = JSON.parse(chip.dataset.fav);
                const chosenCat = topAiCategory?.value || fav.category || 'Almuerzo';
                await addMeal({
                    name: fav.name,
                    calories: fav.calories,
                    category: chosenCat,
                    time: chosenCat,
                    date: state.selectedDate || getArgentinaDate(),
                    macros: fav.macros,
                    satiety_score: 3,
                    sensations: ['Saciedad temprana']
                });
                window.showAlert?.('¡Favorito Registrado!', `${fav.name} (${fav.calories} kcal) agregado en ${chosenCat}.`, 'success');
                window.router.navigate('tracker');
            } catch (e) {}
        });
    });

    topAiBtn?.addEventListener('click', () => {
        runTopAiAnalysis(topAiInput?.value || '', topAiPhoto?.files?.[0] || null);
    });

    topAiInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runTopAiAnalysis(topAiInput.value, topAiPhoto?.files?.[0] || null);
        }
    });

    topAiPhoto?.addEventListener('change', () => {
        if (topAiPhoto.files?.length) {
            runTopAiAnalysis(topAiInput?.value || '', topAiPhoto.files[0]);
        }
    });

    const openAddMealModal = (category, initialAiPrompt = '', initialAiFile = null) => {
        const quickPrompts = CATEGORY_QUICK_FOODS[category] || CATEGORY_QUICK_FOODS['Almuerzo'];

        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-[#10E775]/35 max-h-[90dvh] overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/20">
                    <div class="flex items-center gap-2">
                        <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30">${category}</span>
                        <h3 class="text-lg font-display font-black text-white uppercase">Añadir Alimento</h3>
                    </div>
                    <button id="close-tracker-modal" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- 3 Tabs: Con IA / Base de Datos / Manual -->
                <div class="grid grid-cols-3 gap-1.5 p-1 bg-[#040B08] rounded-xl mb-4 text-xs font-bold border border-emerald-500/25">
                    <button id="tab-ai" class="py-2 px-2 rounded-lg bg-[#10E775]/20 border border-[#10E775]/50 text-[#10E775] flex items-center justify-center gap-1 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>Con IA / Foto</span>
                    </button>
                    <button id="tab-search" class="py-2 px-2 rounded-lg text-emerald-300/70 hover:text-white cursor-pointer">Base de Datos</button>
                    <button id="tab-manual" class="py-2 px-2 rounded-lg text-emerald-300/70 hover:text-white cursor-pointer">Manual</button>
                </div>

                <!-- 1. AI Food Container (Default Active) -->
                <div id="ai-container" class="flex flex-col gap-3">
                    <div>
                        <label class="text-[11px] font-bold uppercase tracking-wider text-lime-400 block mb-1.5">
                            ¿Qué comiste en ${category}?
                        </label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <input id="modal-ai-food-input" type="text" value="${initialAiPrompt.replace(/"/g, '&quot;')}" placeholder="Ej: 2 chipá con café con leche, o milanesa con ensalada..." class="flex-1 bg-[#040B08] border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#10E775]">
                            <button id="modal-ai-food-btn" class="btn-emerald px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-base">auto_awesome</span>
                                Calcular IA
                            </button>
                        </div>
                    </div>

                    <!-- Photo Upload Option inside AI Tab -->
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#040B08]/70 border border-emerald-500/20">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[#10E775] text-lg">photo_camera</span>
                            <span class="text-xs text-emerald-200/80" id="modal-ai-photo-label">¿Tienes foto del plato? Súbela para análisis visual</span>
                        </div>
                        <label for="modal-ai-photo-input" class="px-3 py-1.5 rounded-lg bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/35 text-[11px] font-bold text-[#10E775] cursor-pointer shrink-0">
                            Elegir Foto
                            <input id="modal-ai-photo-input" type="file" accept="image/*" class="hidden" />
                        </label>
                    </div>

                    <!-- Quick Suggestions for this Category -->
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/75 block mb-1.5">Sugerencias rápidas para ${category}:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${quickPrompts.map(p => `
                                <button type="button" class="modal-ai-quick-chip px-2.5 py-1 rounded-xl bg-[#040B08]/85 hover:bg-[#10E775]/20 border border-emerald-500/25 hover:border-[#10E775]/50 text-[11px] font-semibold text-emerald-100 hover:text-white transition-all cursor-pointer" data-prompt="${p}">
                                    ${p}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- AI Result & Editable Confirmation Box -->
                    <div id="modal-ai-result-box" class="hidden flex-col gap-3 mt-2 pt-3 border-t border-emerald-500/25"></div>
                </div>

                <!-- 2. Search Database Container -->
                <div id="search-container" class="hidden flex-col gap-3">
                    <div class="flex gap-2">
                        <input id="food-search-input" type="text" placeholder="Buscar alimento (ej. Avena, Pollo, Yogur...)" class="flex-1 bg-[#040B08] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#10E775]">
                        <button id="do-food-search-btn" class="btn-emerald px-4 py-2 text-xs font-bold cursor-pointer">Buscar</button>
                    </div>

                    <div id="search-results" class="max-h-48 overflow-y-auto flex flex-col gap-2"></div>
                </div>

                <!-- 3. Manual Input Container -->
                <div id="manual-container" class="hidden flex-col gap-3">
                    <div>
                        <label class="text-xs font-bold text-emerald-300/70 uppercase">Nombre</label>
                        <input id="manual-food-name" type="text" placeholder="ej. Pechuga de pollo con arroz" class="w-full bg-[#040B08] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#10E775] mt-1">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-emerald-300/70 uppercase">Calorías (kcal)</label>
                            <input id="manual-food-cals" type="number" placeholder="350" class="w-full bg-[#040B08] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#10E775] outline-none focus:border-[#10E775] mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-emerald-300/70 uppercase">Porción / Gramos</label>
                            <input id="manual-food-serving" type="text" placeholder="150g" class="w-full bg-[#040B08] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#10E775] mt-1">
                        </div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 p-3 bg-[#040B08]/70 rounded-xl border border-emerald-500/20">
                        <div>
                            <span class="text-[10px] font-bold text-[#10E775] uppercase">Proteína</span>
                            <input id="manual-food-p" type="number" placeholder="25" class="w-full bg-emerald-950/60 border border-emerald-500/25 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-[#34D399] uppercase">Carbos</span>
                            <input id="manual-food-c" type="number" placeholder="40" class="w-full bg-emerald-950/60 border border-emerald-500/25 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-lime-400 uppercase">Grasas</span>
                            <input id="manual-food-f" type="number" placeholder="10" class="w-full bg-emerald-950/60 border border-emerald-500/25 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-teal-300 uppercase">Sodio (mg)</span>
                            <input id="manual-food-na" type="number" placeholder="350" class="w-full bg-emerald-950/60 border border-emerald-500/25 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                    </div>
                    <button id="save-manual-food-btn" class="w-full btn-emerald py-3 text-xs font-bold mt-2 cursor-pointer">Guardar Alimento</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('close-tracker-modal').onclick = () => modal.classList.add('hidden');

        // Tab Switching
        const tabAi = document.getElementById('tab-ai');
        const tabSearch = document.getElementById('tab-search');
        const tabManual = document.getElementById('tab-manual');
        const aiCont = document.getElementById('ai-container');
        const searchCont = document.getElementById('search-container');
        const manualCont = document.getElementById('manual-container');

        const activeTabClass = 'py-2 px-2 rounded-lg bg-[#10E775]/20 border border-[#10E775]/50 text-[#10E775] flex items-center justify-center gap-1 cursor-pointer';
        const inactiveTabClass = 'py-2 px-2 rounded-lg text-emerald-300/70 hover:text-white flex items-center justify-center gap-1 cursor-pointer';

        tabAi.onclick = () => {
            tabAi.className = activeTabClass;
            tabSearch.className = inactiveTabClass;
            tabManual.className = inactiveTabClass;
            aiCont.classList.remove('hidden');
            aiCont.classList.add('flex');
            searchCont.classList.add('hidden');
            manualCont.classList.add('hidden');
        };

        tabSearch.onclick = () => {
            tabSearch.className = activeTabClass;
            tabAi.className = inactiveTabClass;
            tabManual.className = inactiveTabClass;
            searchCont.classList.remove('hidden');
            searchCont.classList.add('flex');
            aiCont.classList.add('hidden');
            manualCont.classList.add('hidden');
        };

        tabManual.onclick = () => {
            tabManual.className = activeTabClass;
            tabAi.className = inactiveTabClass;
            tabSearch.className = inactiveTabClass;
            manualCont.classList.remove('hidden');
            manualCont.classList.add('flex');
            aiCont.classList.add('hidden');
            searchCont.classList.add('hidden');
        };

        // AI Calculation Logic inside Modal
        const modalAiInput = document.getElementById('modal-ai-food-input');
        const modalAiBtn = document.getElementById('modal-ai-food-btn');
        const modalAiPhotoInput = document.getElementById('modal-ai-photo-input');
        const modalAiPhotoLabel = document.getElementById('modal-ai-photo-label');
        const modalAiResultBox = document.getElementById('modal-ai-result-box');

        const renderAiMealEditor = (mealData) => {
            let selectedSatietyScore = mealData.satiety_score ? Number(mealData.satiety_score) : 3;
            const labelsMap = {
                1: '🥣 Con hambre (1/5)',
                2: '🥗 Ligero (2/5)',
                3: '⚖️ En su punto (3/5)',
                4: '🍕 Muy lleno (4/5)',
                5: '🫄 Pesado (5/5)'
            };

            modalAiResultBox.classList.remove('hidden');
            modalAiResultBox.classList.add('flex');
            modalAiResultBox.innerHTML = `
                <div class="p-4 rounded-2xl bg-[#040B08]/90 border border-[#10E775]/40 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="badge-emerald text-[10px]">✨ Nutrición Calculada por IA</span>
                        <span class="text-[11px] font-mono text-emerald-300/80">Editable antes de guardar</span>
                    </div>

                    <div>
                        <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Plato / Alimento</label>
                        <input id="ai-confirm-name" type="text" value="${(mealData.name || '').replace(/"/g, '&quot;')}" class="w-full rounded-xl px-3 py-2 text-sm font-bold text-white bg-emerald-950/50 border border-emerald-500/30 outline-none mt-1" />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Calorías (kcal)</label>
                            <input id="ai-confirm-cals" type="number" value="${Math.round(mealData.calories || 0)}" class="w-full rounded-xl px-3 py-2 text-base font-mono font-extrabold text-[#10E775] bg-emerald-950/50 border border-emerald-500/30 outline-none mt-1" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Momento del Día</label>
                            <select id="ai-confirm-category" class="w-full rounded-xl px-3 py-2 text-xs font-bold text-white bg-emerald-950/50 border border-emerald-500/30 outline-none mt-1">
                                ${['Desayuno', 'Media Mañana', 'Almuerzo', 'Merienda', 'Media Tarde', 'Cena'].map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-4 gap-2 p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
                        <div>
                            <span class="text-[9px] font-bold uppercase text-[#10E775]">Proteína (g)</span>
                            <input id="ai-confirm-p" type="number" value="${Math.round(mealData.macros?.protein || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold text-white bg-[#040B08] border border-emerald-500/25 mt-1" />
                        </div>
                        <div>
                            <span class="text-[9px] font-bold uppercase text-[#34D399]">Carbos (g)</span>
                            <input id="ai-confirm-c" type="number" value="${Math.round(mealData.macros?.carbs || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold text-white bg-[#040B08] border border-emerald-500/25 mt-1" />
                        </div>
                        <div>
                            <span class="text-[9px] font-bold uppercase text-lime-400">Grasas (g)</span>
                            <input id="ai-confirm-f" type="number" value="${Math.round(mealData.macros?.fat || 0)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold text-white bg-[#040B08] border border-emerald-500/25 mt-1" />
                        </div>
                        <div>
                            <span class="text-[9px] font-bold uppercase text-teal-300">Sodio (mg)</span>
                            <input id="ai-confirm-na" type="number" value="${getMealSodium(mealData)}" class="w-full rounded-lg px-2 py-1 text-xs font-mono font-bold text-white bg-[#040B08] border border-emerald-500/25 mt-1" />
                        </div>
                    </div>

                    <!-- Satiety Selector -->
                    <div class="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/20 flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] font-bold text-emerald-200 uppercase">Sensación de Saciedad</label>
                            <span class="text-[10px] text-[#10E775] font-mono" id="ai-confirm-satiety-label">${labelsMap[selectedSatietyScore]}</span>
                        </div>
                        <div class="grid grid-cols-5 gap-1">
                            ${[
                                { s: 1, icon: '🥣', lbl: 'Hambre' },
                                { s: 2, icon: '🥗', lbl: 'Ligero' },
                                { s: 3, icon: '⚖️', lbl: 'Óptimo' },
                                { s: 4, icon: '🍕', lbl: 'Lleno' },
                                { s: 5, icon: '🫄', lbl: 'Pesado' }
                            ].map(opt => `
                                <button type="button" class="ai-satiety-btn p-1.5 rounded-xl border ${opt.s === selectedSatietyScore ? 'border-2 border-[#10E775] bg-[#10E775]/20' : 'border-emerald-500/20 bg-emerald-950/50'} text-center cursor-pointer" data-score="${opt.s}">
                                    <span class="text-sm">${opt.icon}</span>
                                    <span class="text-[8px] font-bold block text-emerald-200 mt-0.5">${opt.lbl}</span>
                                </button>
                            `).join('')}
                        </div>
                        <input id="ai-confirm-opinion" type="text" placeholder="Nota opcional (ej. Me sentí satisfecho)..." value="${mealData.opinion || ''}" class="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#040B08] border border-emerald-500/25 text-white outline-none" />
                    </div>

                    <button id="ai-confirm-save-btn" class="w-full btn-emerald py-3 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                        <span class="material-symbols-outlined text-base">check_circle</span>
                        Guardar en Diario de Comidas
                    </button>
                </div>
            `;

            modalAiResultBox.querySelectorAll('.ai-satiety-btn').forEach(btn => {
                btn.onclick = () => {
                    selectedSatietyScore = Number(btn.dataset.score);
                    modalAiResultBox.querySelectorAll('.ai-satiety-btn').forEach(b => {
                        const s = Number(b.dataset.score);
                        b.className = `ai-satiety-btn p-1.5 rounded-xl border ${s === selectedSatietyScore ? 'border-2 border-[#10E775] bg-[#10E775]/20' : 'border-emerald-500/20 bg-emerald-950/50'} text-center cursor-pointer`;
                    });
                    const lbl = document.getElementById('ai-confirm-satiety-label');
                    if (lbl) lbl.textContent = labelsMap[selectedSatietyScore];
                };
            });

            document.getElementById('ai-confirm-save-btn').onclick = () => {
                const name = document.getElementById('ai-confirm-name').value.trim() || 'Alimento';
                const calories = parseInt(document.getElementById('ai-confirm-cals').value) || 0;
                const finalCat = document.getElementById('ai-confirm-category').value || category;
                const protein = parseInt(document.getElementById('ai-confirm-p').value) || 0;
                const carbs = parseInt(document.getElementById('ai-confirm-c').value) || 0;
                const fat = parseInt(document.getElementById('ai-confirm-f').value) || 0;
                const sodium = parseInt(document.getElementById('ai-confirm-na').value) || 0;
                const opinion = document.getElementById('ai-confirm-opinion').value.trim() || null;

                let sensations = mealData.sensations || [];
                if (selectedSatietyScore === 3 && sensations.length === 0) sensations = ['Saciedad temprana'];
                else if (selectedSatietyScore >= 4 && sensations.length === 0) sensations = ['Pesadez abdominal'];

                addMeal({
                    name,
                    calories,
                    category: finalCat,
                    time: finalCat,
                    date: state.selectedDate || getArgentinaDate(),
                    macros: { protein, carbs, fat, sodium },
                    satiety_score: selectedSatietyScore,
                    sensations,
                    opinion
                });

                modal.classList.add('hidden');
                window.router.navigate('tracker');
            };
        };

        const executeModalAiAnalysis = async (promptText, fileObj = null) => {
            const cleanText = (promptText || '').trim();
            if (!cleanText && !fileObj) {
                window.showAlert?.('Describe tu comida', 'Escribe qué comiste (ej: "2 huevos con tostada") o sube una foto.', 'info');
                return;
            }

            modalAiBtn.disabled = true;
            modalAiBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Analizando...`;

            try {
                let result;
                if (fileObj) {
                    const base64 = await toBase64(fileObj);
                    result = await analyzeFood(base64, 'image', cleanText || `Plato de ${category}`);
                } else {
                    result = await analyzeFood(cleanText, 'text');
                }

                const mealsArr = result?.meals || [];
                if (mealsArr.length > 0) {
                    // Combine if multiple items were returned separately
                    const combinedMeal = mealsArr.length === 1 ? mealsArr[0] : {
                        name: mealsArr.map(m => m.name).join(' + '),
                        calories: mealsArr.reduce((s, m) => s + (Number(m.calories) || 0), 0),
                        macros: {
                            protein: mealsArr.reduce((s, m) => s + (Number(m.macros?.protein) || 0), 0),
                            carbs: mealsArr.reduce((s, m) => s + (Number(m.macros?.carbs) || 0), 0),
                            fat: mealsArr.reduce((s, m) => s + (Number(m.macros?.fat) || 0), 0),
                            sodium: mealsArr.reduce((s, m) => s + (Number(m.macros?.sodium) || 0), 0)
                        },
                        category,
                        satiety_score: mealsArr[0].satiety_score || 3,
                        sensations: mealsArr[0].sensations || ['Saciedad temprana'],
                        opinion: mealsArr[0].opinion || null
                    };
                    renderAiMealEditor(combinedMeal);
                } else {
                    window.showAlert?.('Sin resultados', 'No se pudo identificar el alimento. Prueba describirlo con más detalle.', 'info');
                }
            } catch (err) {
                window.showAlert?.('Error de Análisis', err.message || 'No se pudo analizar el alimento.', 'error');
            } finally {
                modalAiBtn.disabled = false;
                modalAiBtn.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span> Calcular IA`;
            }
        };

        modalAiBtn.onclick = () => executeModalAiAnalysis(modalAiInput.value, modalAiPhotoInput?.files?.[0] || null);
        modalAiInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeModalAiAnalysis(modalAiInput.value, modalAiPhotoInput?.files?.[0] || null);
            }
        };

        modalAiPhotoInput.onchange = () => {
            if (modalAiPhotoInput.files?.length) {
                const file = modalAiPhotoInput.files[0];
                if (modalAiPhotoLabel) modalAiPhotoLabel.textContent = `📷 ${file.name}`;
                executeModalAiAnalysis(modalAiInput.value, file);
            }
        };

        modal.querySelectorAll('.modal-ai-quick-chip').forEach(chip => {
            chip.onclick = () => {
                const p = chip.dataset.prompt || '';
                modalAiInput.value = p.replace(/^[^\wÁÉÍÓÚáéíóúñÑ0-9]+\s*/, '');
                executeModalAiAnalysis(modalAiInput.value, null);
            };
        });

        // If opened from the top AI bar with text or photo, trigger immediately
        if (initialAiPrompt.trim() || initialAiFile) {
            executeModalAiAnalysis(initialAiPrompt, initialAiFile);
        }

        // 2. Database Search action
        const searchInput = document.getElementById('food-search-input');
        const resultsCont = document.getElementById('search-results');
        const doSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;
            resultsCont.innerHTML = `<p class="text-xs text-center py-4 text-emerald-300/70">Buscando en Open Food Facts...</p>`;

            try {
                const results = await searchOpenFood(query);
                if (!results.length) {
                    resultsCont.innerHTML = `<p class="text-xs text-center py-4 text-emerald-300/70">No se encontraron productos. Usa la pestaña <strong>"Con IA / Foto"</strong> para calcular cualquier plato.</p>`;
                    return;
                }

                resultsCont.innerHTML = results.map(item => `
                    <div class="p-3 bg-[#040B08] border border-emerald-500/25 rounded-xl hover:border-[#10E775]/50 transition-all flex items-center justify-between">
                        <div>
                            <h5 class="text-xs font-bold text-white">${item.name}</h5>
                            <p class="text-[10px] font-mono text-emerald-300/70">${item.calories} kcal/100g · P:${item.protein}g C:${item.carbs}g G:${item.fat}g · Sodio:${item.sodium || 0}mg</p>
                        </div>
                        <button class="select-search-item btn-emerald px-3 py-1.5 text-xs font-bold cursor-pointer" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                            Seleccionar
                        </button>
                    </div>
                `).join('');

                resultsCont.querySelectorAll('.select-search-item').forEach(b => {
                    b.onclick = (e) => {
                        const itm = JSON.parse(e.currentTarget.dataset.item);
                        addMeal({
                            name: itm.name,
                            calories: itm.calories,
                            category: category,
                            time: category,
                            date: state.selectedDate || getArgentinaDate(),
                            macros: { protein: itm.protein, carbs: itm.carbs, fat: itm.fat, sodium: itm.sodium || 0 }
                        });
                        modal.classList.add('hidden');
                        window.router.navigate('tracker');
                    };
                });
            } catch (err) {
                resultsCont.innerHTML = `<p class="text-xs text-center text-lime-300 py-4">Error en búsqueda. Usa la pestaña "Con IA / Foto".</p>`;
            }
        };

        document.getElementById('do-food-search-btn').onclick = doSearch;
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') doSearch(); };

        // 3. Save manual food
        document.getElementById('save-manual-food-btn').onclick = () => {
            const name = document.getElementById('manual-food-name').value;
            const calories = parseInt(document.getElementById('manual-food-cals').value) || 0;
            const protein = parseInt(document.getElementById('manual-food-p').value) || 0;
            const carbs = parseInt(document.getElementById('manual-food-c').value) || 0;
            const fat = parseInt(document.getElementById('manual-food-f').value) || 0;
            const sodiumVal = document.getElementById('manual-food-na')?.value;
            const sodium = sodiumVal !== '' && sodiumVal !== undefined ? parseInt(sodiumVal) : undefined;

            if (!name || calories <= 0) {
                window.showAlert?.('Datos incompletos', 'Por favor ingresa un nombre y calorías válidas.', 'info');
                return;
            }

            addMeal({
                name,
                calories,
                category,
                time: category,
                date: state.selectedDate || getArgentinaDate(),
                macros: { protein, carbs, fat, ...(sodium !== undefined ? { sodium } : {}) }
            });

            modal.classList.add('hidden');
            window.router.navigate('tracker');
        };
    };
};
