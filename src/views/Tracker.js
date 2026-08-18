import { getState, addMeal, deleteMeal, getArgentinaDate, setSelectedDate } from '../state';
import { analyzeFood } from '../services/openai';
import { getProductByBarcode, searchOpenFood } from '../services/openfoodfacts';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

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

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('tracker')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Diario de Comidas')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Top Header Summary Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-white via-emerald-50/40 to-white border-emerald-200">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="badge-emerald mb-1">Diario Nutricional</span>
                                <h2 class="text-3xl font-display font-black text-text-emerald uppercase tracking-tight">Registro de Alimentos</h2>
                                <p class="text-xs text-text-muted mt-0.5">Control preciso de cada momento del día.</p>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <span class="text-[10px] font-bold uppercase text-text-muted">Total Diario</span>
                                    <p class="text-2xl font-display font-black text-text-emerald">${totalCals} <span class="text-xs font-normal text-text-muted">kcal</span></p>
                                </div>
                                <div class="h-10 w-px bg-slate-200"></div>
                                <div class="text-xs font-mono font-bold text-text-muted space-y-0.5">
                                    <p class="text-emerald-700">P: ${Math.round(totalP)}g</p>
                                    <p class="text-blue-700">C: ${Math.round(totalC)}g</p>
                                    <p class="text-amber-700">G: ${Math.round(totalF)}g</p>
                                </div>
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

                            return `
                            <div class="white-card p-5">
                                <div class="flex items-center justify-between pb-3 border-b border-border-soft">
                                    <div class="flex items-center gap-3">
                                        <div class="size-10 rounded-2xl bg-emerald-50 text-text-emerald flex items-center justify-center border border-emerald-100">
                                            <span class="material-symbols-outlined text-xl">${cat.icon}</span>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-display font-black text-text-primary uppercase tracking-tight">${cat.label}</h3>
                                            <p class="text-xs font-mono font-semibold text-text-emerald">${catCals} kcal ${catMeals.length ? `· P:${Math.round(catP)}g C:${Math.round(catC)}g G:${Math.round(catF)}g` : ''}</p>
                                        </div>
                                    </div>

                                    <button class="add-meal-cat-btn btn-emerald-soft text-xs px-3 py-1.5 font-bold" data-category="${cat.id}">
                                        <span class="material-symbols-outlined text-sm">add</span> Agregar
                                    </button>
                                </div>

                                <!-- Meals List inside Category -->
                                <div class="mt-3 flex flex-col gap-2">
                                    ${catMeals.length ? catMeals.map(m => `
                                        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-200 transition-all">
                                            <div>
                                                <h4 class="text-sm font-bold text-text-primary capitalize">${m.name}</h4>
                                                <p class="text-xs font-mono text-text-muted mt-0.5">
                                                    <strong class="text-text-emerald">${m.calories} kcal</strong> · P:${Math.round(m.macros?.protein || 0)}g C:${Math.round(m.macros?.carbs || 0)}g G:${Math.round(m.macros?.fat || 0)}g
                                                </p>
                                            </div>
                                            <button class="delete-tracker-meal-btn size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors" data-id="${m.id}">
                                                <span class="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>
                                    `).join('') : `
                                        <p class="text-xs text-text-muted italic py-2 text-center">Sin registros en ${cat.label}</p>
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
        <div id="tracker-add-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"></div>
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
            const id = parseInt(e.currentTarget.dataset.id);
            window.showConfirm?.('¿Eliminar alimento?', 'Se restará del total de calorías del día.', () => {
                deleteMeal(id);
                window.router.navigate('tracker');
            });
        });
    });

    const openAddMealModal = (category) => {
        modal.innerHTML = `
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-emerald-md">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-border-soft">
                    <div class="flex items-center gap-2">
                        <span class="badge-emerald">${category}</span>
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase">Añadir Alimento</h3>
                    </div>
                    <button id="close-tracker-modal" class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Tabs: Manual / Barcode / Search -->
                <div class="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
                    <button id="tab-search" class="flex-1 py-2 rounded-lg bg-white shadow-xs text-text-emerald">Buscar Base de Datos</button>
                    <button id="tab-manual" class="flex-1 py-2 rounded-lg text-text-muted hover:text-text-primary">Manual</button>
                </div>

                <!-- Search Container -->
                <div id="search-container" class="flex flex-col gap-3">
                    <div class="flex gap-2">
                        <input id="food-search-input" type="text" placeholder="Buscar alimento (ej. Avena, Pollo, Yogur...)" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
                        <button id="do-food-search-btn" class="btn-emerald px-4 py-2 text-xs font-bold">Buscar</button>
                    </div>

                    <div id="search-results" class="max-h-48 overflow-y-auto flex flex-col gap-2"></div>
                </div>

                <!-- Manual Input Container (Hidden by default or toggled) -->
                <div id="manual-container" class="hidden flex-col gap-3">
                    <div>
                        <label class="text-xs font-bold text-text-muted uppercase">Nombre</label>
                        <input id="manual-food-name" type="text" placeholder="ej. Pechuga de pollo con arroz" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-text-primary outline-none focus:border-primary mt-1">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Calorías (kcal)</label>
                            <input id="manual-food-cals" type="number" placeholder="350" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-text-emerald outline-none focus:border-primary mt-1">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-text-muted uppercase">Porción / Gramos</label>
                            <input id="manual-food-serving" type="text" placeholder="150g" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary mt-1">
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <span class="text-[10px] font-bold text-emerald-600 uppercase">Proteína</span>
                            <input id="manual-food-p" type="number" placeholder="25" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-blue-600 uppercase">Carbos</span>
                            <input id="manual-food-c" type="number" placeholder="40" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-amber-600 uppercase">Grasas</span>
                            <input id="manual-food-f" type="number" placeholder="10" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1">
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
            tabSearch.className = 'flex-1 py-2 rounded-lg bg-white shadow-xs text-text-emerald';
            tabManual.className = 'flex-1 py-2 rounded-lg text-text-muted hover:text-text-primary';
            searchCont.classList.remove('hidden');
            manualCont.classList.add('hidden');
        };

        tabManual.onclick = () => {
            tabManual.className = 'flex-1 py-2 rounded-lg bg-white shadow-xs text-text-emerald';
            tabSearch.className = 'flex-1 py-2 rounded-lg text-text-muted hover:text-text-primary';
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
                    <div class="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 transition-all flex items-center justify-between">
                        <div>
                            <h5 class="text-xs font-bold text-text-primary">${item.name}</h5>
                            <p class="text-[10px] font-mono text-text-muted">${item.calories} kcal/100g · P:${item.protein}g C:${item.carbs}g G:${item.fat}g</p>
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
                            macros: { protein: itm.protein, carbs: itm.carbs, fat: itm.fat }
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
                macros: { protein, carbs, fat }
            });

            modal.classList.add('hidden');
            window.router.navigate('tracker');
        };
    };
};
