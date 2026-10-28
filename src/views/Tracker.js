import { getState, addMeal, deleteMeal, getArgentinaDate, setSelectedDate, getSensationsMetrics, getMealSodium } from '../state';
import { analyzeFood } from '../services/openai';
import { getProductByBarcode, searchOpenFood } from '../services/openfoodfacts';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import { renderMealSensationsModalContainer, renderSatietyBadge, attachSensationsModalEvents } from '../components/MealSensationsModal';

let activeCategoryForAdd = 'Almuerzo';
let barcodeScannerTrackerInstance = null;

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
    <div class="flex h-screen w-full bg-[#0F172A] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('tracker')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0F172A]">
            ${renderMobileHeader('Diario de Comidas')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Summary Card -->
                    <div class="white-card p-6 border border-emerald-500/30 shadow-xl bg-gradient-to-b from-[#1E293B] to-[#151E2E]">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Diario Nutricional</span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dayMetrics.statusBg} ${dayMetrics.statusColor} border border-white/5">
                                        ${dayMetrics.statusLabel}
                                    </span>
                                </div>
                                <h2 class="text-3xl font-display font-black text-white uppercase tracking-tight">Registro de Alimentos</h2>
                                <p class="text-xs text-slate-400 mt-0.5">Control de calorías, macros y sensaciones de plenitud.</p>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <span class="text-[10px] font-bold uppercase text-slate-400">Total Diario</span>
                                    <p class="text-2xl font-display font-black text-emerald-400">${totalCals} <span class="text-xs font-normal text-slate-400">kcal</span></p>
                                </div>
                                <div class="h-10 w-px bg-slate-700"></div>
                                <div class="text-xs font-mono font-bold space-y-0.5">
                                    <p class="text-emerald-400">P: ${Math.round(totalP)}g</p>
                                    <p class="text-blue-400">C: ${Math.round(totalC)}g</p>
                                    <p class="text-amber-400">G: ${Math.round(totalF)}g</p>
                                    <p class="text-cyan-400">Sodio: ${Math.round(totalSodium)}mg</p>
                                </div>
                            </div>
                        </div>

                        <!-- Mini Satiety Day Strip -->
                        <div class="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">🧠</span>
                                <span class="text-slate-300 font-semibold">Saciedad del Día:</span>
                                <span class="font-mono font-bold text-white">${dayMetrics.avgScore ? `${dayMetrics.avgScore} / 5.0` : 'Sin registrar'}</span>
                                <span class="text-[11px] ${dayMetrics.statusColor}">(${dayMetrics.statusLabel})</span>
                            </div>
                            <button onclick="window.router.navigate('insights')" class="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer">
                                <span>Ver Métricas & Estadísticas</span>
                                <span class="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
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
                            <div class="white-card p-5 border border-slate-700/60">
                                <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                            <span class="material-symbols-outlined text-xl">${cat.icon}</span>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-display font-black text-white uppercase tracking-tight">${cat.label}</h3>
                                            <p class="text-xs font-mono font-semibold text-emerald-400">${catCals} kcal ${catMeals.length ? `· P:${Math.round(catP)}g C:${Math.round(catC)}g G:${Math.round(catF)}g · <span class="text-cyan-400">Sodio:${Math.round(catSodium)}mg</span>` : ''}</p>
                                        </div>
                                    </div>

                                    <button class="add-meal-cat-btn btn-emerald-soft text-xs px-3 py-1.5 font-bold" data-category="${cat.id}">
                                        <span class="material-symbols-outlined text-sm">add</span> Agregar
                                    </button>
                                </div>

                                <!-- Meals List inside Category -->
                                <div class="mt-3 flex flex-col gap-2">
                                    ${catMeals.length ? catMeals.map(m => `
                                        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col gap-1.5">
                                            <div class="flex items-center justify-between">
                                                <div>
                                                    <h4 class="text-sm font-bold text-white capitalize">${m.name}</h4>
                                                    <p class="text-xs font-mono text-slate-400 mt-0.5">
                                                        <strong class="text-emerald-400">${m.calories} kcal</strong> · P:${Math.round(m.macros?.protein || 0)}g C:${Math.round(m.macros?.carbs || 0)}g G:${Math.round(m.macros?.fat || 0)}g · <span class="text-cyan-400 font-semibold">Sodio: ${getMealSodium(m)}mg</span>
                                                    </p>
                                                </div>
                                                <button class="delete-tracker-meal-btn size-7 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer" data-id="${m.id}" title="Eliminar alimento">
                                                    <span class="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                            <!-- Satiety & Sensations Badge -->
                                            ${renderSatietyBadge(m)}
                                        </div>
                                    `).join('') : `
                                        <p class="text-xs text-slate-500 italic py-2 text-center">Sin registros en ${cat.label}</p>
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

        <!-- Add Meal & Barcode Modal -->
        <div id="tracker-add-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"></div>
        ${renderMealSensationsModalContainer()}
    </div>
    `;
};

export const attachTrackerEvents = () => {
    const state = getState();
    const modal = document.getElementById('tracker-add-modal');

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

    const openAddMealModal = (category) => {
        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-slate-700/80">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                    <div class="flex items-center gap-2">
                        <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30">${category}</span>
                        <h3 class="text-lg font-display font-black text-white uppercase">Añadir Alimento</h3>
                    </div>
                    <button id="close-tracker-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Tabs: Manual / Barcode / Search -->
                <div class="flex gap-2 p-1 bg-slate-900 rounded-xl mb-4 text-xs font-bold border border-slate-700/60">
                    <button id="tab-search" class="flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400">Buscar Base de Datos</button>
                    <button id="tab-manual" class="flex-1 py-2 rounded-lg text-slate-400 hover:text-white">Manual</button>
                </div>

                <!-- Search Container -->
                <div id="search-container" class="flex flex-col gap-3">
                    <div class="flex gap-2">
                        <input id="food-search-input" type="text" placeholder="Buscar alimento (ej. Avena, Pollo, Yogur...)" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                        <button id="do-food-search-btn" class="btn-emerald px-4 py-2 text-xs font-bold">Buscar</button>
                    </div>

                    <div id="search-results" class="max-h-48 overflow-y-auto flex flex-col gap-2"></div>
                </div>

                <!-- Manual Input Container (Hidden by default or toggled) -->
                <div id="manual-container" class="hidden flex-col gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase">Nombre</label>
                        <input id="manual-food-name" type="text" placeholder="ej. Pechuga de pollo con arroz" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 mt-1">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase">Calorías (kcal)</label>
                            <input id="manual-food-cals" type="number" placeholder="350" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500 mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase">Porción / Gramos</label>
                            <input id="manual-food-serving" type="text" placeholder="150g" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 mt-1">
                        </div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                        <div>
                            <span class="text-[10px] font-bold text-emerald-400 uppercase">Proteína</span>
                            <input id="manual-food-p" type="number" placeholder="25" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-blue-400 uppercase">Carbos</span>
                            <input id="manual-food-c" type="number" placeholder="40" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-amber-400 uppercase">Grasas</span>
                            <input id="manual-food-f" type="number" placeholder="10" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-cyan-400 uppercase">Sodio (mg)</span>
                            <input id="manual-food-na" type="number" placeholder="350" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                    </div>
                    <button id="save-manual-food-btn" class="w-full btn-emerald py-3 text-xs font-bold mt-2">Guardar Alimento</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('close-tracker-modal').onclick = () => modal.classList.add('hidden');

        // Tab Switching
        const tabSearch = document.getElementById('tab-search');
        const tabManual = document.getElementById('tab-manual');
        const searchCont = document.getElementById('search-container');
        const manualCont = document.getElementById('manual-container');

        tabSearch.onclick = () => {
            tabSearch.className = 'flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400';
            tabManual.className = 'flex-1 py-2 rounded-lg text-slate-400 hover:text-white';
            searchCont.classList.remove('hidden');
            manualCont.classList.add('hidden');
        };

        tabManual.onclick = () => {
            tabManual.className = 'flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400';
            tabSearch.className = 'flex-1 py-2 rounded-lg text-slate-400 hover:text-white';
            manualCont.classList.remove('hidden');
            manualCont.classList.add('flex');
            searchCont.classList.add('hidden');
        };

        // Search action
        const searchInput = document.getElementById('food-search-input');
        const resultsCont = document.getElementById('search-results');
        const doSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;
            resultsCont.innerHTML = `<p class="text-xs text-center py-4 text-slate-400">Buscando en Open Food Facts...</p>`;
            
            try {
                const results = await searchOpenFood(query);
                if (!results.length) {
                    resultsCont.innerHTML = `<p class="text-xs text-center py-4 text-slate-400">No se encontraron productos. Prueba ingresarlo manualmente.</p>`;
                    return;
                }

                resultsCont.innerHTML = results.map(item => `
                    <div class="p-3 bg-slate-900 border border-slate-700/80 rounded-xl hover:border-emerald-500/50 transition-all flex items-center justify-between">
                        <div>
                            <h5 class="text-xs font-bold text-white">${item.name}</h5>
                            <p class="text-[10px] font-mono text-slate-400">${item.calories} kcal/100g · P:${item.protein}g C:${item.carbs}g G:${item.fat}g · Sodio:${item.sodium || 0}mg</p>
                        </div>
                        <button class="select-search-item btn-emerald px-3 py-1.5 text-xs font-bold" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
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
                resultsCont.innerHTML = `<p class="text-xs text-center text-red-500 py-4">Error en búsqueda.</p>`;
            }
        };

        document.getElementById('do-food-search-btn').onclick = doSearch;
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') doSearch(); };

        // Save manual food
        document.getElementById('save-manual-food-btn').onclick = () => {
            const name = document.getElementById('manual-food-name').value;
            const calories = parseInt(document.getElementById('manual-food-cals').value) || 0;
            const protein = parseInt(document.getElementById('manual-food-p').value) || 0;
            const carbs = parseInt(document.getElementById('manual-food-c').value) || 0;
            const fat = parseInt(document.getElementById('manual-food-f').value) || 0;
            const sodiumVal = document.getElementById('manual-food-na')?.value;
            const sodium = sodiumVal !== '' && sodiumVal !== undefined ? parseInt(sodiumVal) : undefined;

            if (!name || calories <= 0) {
                alert('Por favor ingresa un nombre y calorías válidas.');
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
