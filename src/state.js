import {
    loadFullState,
    saveProfileDB,
    addMealDB,
    deleteMealByIdDB,
    deleteMealByAttributesDB,
    addMeasurementDB,
    addWorkoutDB,
    deleteWorkoutDB,
    updateMealDB,
    addObetideTreatmentDB,
    deleteObetideTreatmentDB,
    saveExpenseCategoryDB,
    deleteExpenseCategoryDB,
    addExpenseDB,
    updateExpenseDB,
    deleteExpenseDB,
    saveAiMealPlanDB
} from './services/db';
import { getActiveStorageKey, getCurrentUser } from './services/auth';

const STORAGE_KEY = 'growfit_state_v1';

// Helper to get today's date in Argentina Timezone (Y-m-d)
export const getArgentinaDate = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
};

// Helper to get or estimate sodium (mg) for any meal
export const getMealSodium = (meal) => {
    if (!meal) return 0;
    if (meal.macros?.sodium !== undefined && meal.macros?.sodium !== null && !Number.isNaN(Number(meal.macros.sodium))) {
        return Math.round(Number(meal.macros.sodium));
    }
    if (meal.sodium !== undefined && meal.sodium !== null && !Number.isNaN(Number(meal.sodium))) {
        return Math.round(Number(meal.sodium));
    }
    const name = (meal.name || '').toLowerCase();
    const cals = Number(meal.calories) || 200;
    const highSodium = /jam[oó]n|queso|pizza|empanada|taco|hamburguesa|salchicha|fiambre|salsa|soja|caldo|sopa|pancho|milanesa|s[aá]ndwich|lomito|chorip[aá]n|asado|factura|medialuna|snack|papas fritas|picada|aceituna|at[uú]n/.test(name);
    const lowSodium = /fruta|banana|manzana|naranja|pera|avena|yogur|leche|caf[eé]|t[eé]|mate|helado|banasplit|licuado|nuez|almendra|agua/.test(name);
    if (highSodium) return Math.round(cals * 1.75);
    if (lowSodium) return Math.round(cals * 0.45);
    return Math.round(cals * 1.05);
};

const defaultState = {
    profile: {
        name: 'Usuario',
        age: 30,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 200,
        fatGoal: 65,
        sodiumGoal: 2000,
        height: 175,
        gender: 'male',
        checkinFrequency: 15,
        startingWeight: 104,
        targetWeight: 70,
        health: {
            conditions: '',
            medications: '',
            metabolism: 'normal'
        },
        aiSummary: null,
        xp: 0,
        level: 1
    },
    dailyLog: [
        {
            id: 'meal-init-1',
            name: 'Pechuga a la plancha con puré de calabaza',
            calories: 460,
            category: 'Almuerzo',
            time: 'Almuerzo',
            date: '2026-10-26',
            macros: { protein: 42, carbs: 30, fat: 12, sodium: 480 },
            satiety_score: 3,
            sensations: ['Saciedad temprana', 'Digestión ligera'],
            opinion: 'Sentí saciedad en la mitad del plato por efecto de Dutide. Cómodo y sin pesadez.'
        },
        {
            id: 'meal-init-2',
            name: 'Omelette de 2 huevos con queso magro y café',
            calories: 320,
            category: 'Desayuno',
            time: 'Desayuno',
            date: '2026-10-26',
            macros: { protein: 22, carbs: 4, fat: 18, sodium: 390 },
            satiety_score: 3,
            sensations: ['Energía óptima', 'Digestión ligera'],
            opinion: 'Excelente saciedad para arrancar la mañana.'
        },
        {
            id: 'meal-init-3',
            name: 'Filet de merluza con vegetales al vapor',
            calories: 310,
            category: 'Cena',
            time: 'Cena',
            date: '2026-10-25',
            macros: { protein: 36, carbs: 12, fat: 8, sodium: 320 },
            satiety_score: 2,
            sensations: ['Digestión ligera'],
            opinion: 'Muy liviano, ideal para descansar bien sin reflujo.'
        }
    ],
    days: {},
    measurements: [],
    workouts: [],
    gymSessions: [],
    fasting: {
        isActive: false,
        startTime: null,
        protocol: '16:8',
        targetHours: 16
    },
    habits: [
        { id: 'h2', name: 'Sin Azúcar refinada', icon: 'block' },
        { id: 'h3', name: 'Caminar 30 min', icon: 'directions_walk' },
        { id: 'h4', name: 'Lectura o Relax', icon: 'menu_book' }
    ],
    habitLog: {},
    dailyTip: { date: null, content: null },
    obetideTreatments: [],
    monthlyIncome: 2975000,
    incomeSource: 'Sanatorio Argentino',
    expenseCategories: [
        {
            id: 'vivienda-servicios',
            name: 'Vivienda y Servicios',
            icon: '🏠',
            color: '#0A84FF',
            monthly_budget: 1401000,
            items: [
                { name: 'Alquiler casa actual', amount: 1056000 },
                { name: 'Luz', amount: 120000 },
                { name: 'Gas', amount: 80000 },
                { name: 'Conectividad / Internet', amount: 75000 },
                { name: 'Agua', amount: 40000 },
                { name: 'Municipalidad', amount: 30000 }
            ]
        },
        {
            id: 'compromisos-cuotas',
            name: 'Compromisos y Cuotas',
            icon: '💳',
            color: '#FF9F0A',
            monthly_budget: 1855000,
            items: [
                { name: 'Cuota Florencia', amount: 500000 },
                { name: 'Cuota Auto', amount: 500000 },
                { name: 'Préstamo Ángel', amount: 350000 },
                { name: 'Refinanciación Banco Nación', amount: 350000 },
                { name: 'Cuota Majo', amount: 155000 }
            ]
        },
        {
            id: 'operativos-vida',
            name: 'Operativos y Vida Diaria',
            icon: '🛒',
            color: '#10E775',
            monthly_budget: 605000,
            items: [
                { name: 'Niñera', amount: 200000 },
                { name: 'Combustible', amount: 150000 },
                { name: 'Almuerzos', amount: 125000 },
                { name: 'Transporte de los niños', amount: 90000 },
                { name: 'Gimnasio', amount: 40000 }
            ]
        },
        {
            id: 'salud-obetide',
            name: 'Salud & Medicación',
            icon: '💉',
            color: '#BF5AF2',
            monthly_budget: 115000,
            items: [
                { name: 'Dutide', amount: 100000 },
                { name: 'Levotiroxina', amount: 15000 }
            ]
        }
    ],
    expenses: [
        { id: 'exp-1', name: 'Alquiler casa actual', amount: 1056000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-05', is_recurring: true, is_paid: true },
        { id: 'exp-2', name: 'Luz', amount: 120000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-10', is_recurring: true, is_paid: true },
        { id: 'exp-3', name: 'Gas', amount: 80000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-12', is_recurring: true, is_paid: true },
        { id: 'exp-4', name: 'Conectividad / Internet', amount: 75000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-08', is_recurring: true, is_paid: true },
        { id: 'exp-5', name: 'Agua', amount: 40000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-14', is_recurring: true, is_paid: true },
        { id: 'exp-6', name: 'Municipalidad', amount: 30000, category_id: 'vivienda-servicios', category_name: 'Vivienda y Servicios', date: '2026-10-15', is_recurring: true, is_paid: true },
        { id: 'exp-7', name: 'Cuota Florencia', amount: 500000, category_id: 'compromisos-cuotas', category_name: 'Compromisos y Cuotas', date: '2026-10-06', is_recurring: true, is_paid: true },
        { id: 'exp-8', name: 'Cuota Auto', amount: 500000, category_id: 'compromisos-cuotas', category_name: 'Compromisos y Cuotas', date: '2026-10-07', is_recurring: true, is_paid: true },
        { id: 'exp-9', name: 'Préstamo Ángel', amount: 350000, category_id: 'compromisos-cuotas', category_name: 'Compromisos y Cuotas', date: '2026-10-08', is_recurring: true, is_paid: true },
        { id: 'exp-10', name: 'Refinanciación Banco Nación', amount: 350000, category_id: 'compromisos-cuotas', category_name: 'Compromisos y Cuotas', date: '2026-10-09', is_recurring: true, is_paid: true },
        { id: 'exp-11', name: 'Cuota Majo', amount: 155000, category_id: 'compromisos-cuotas', category_name: 'Compromisos y Cuotas', date: '2026-10-11', is_recurring: true, is_paid: true },
        { id: 'exp-12', name: 'Niñera', amount: 200000, category_id: 'operativos-vida', category_name: 'Operativos y Vida Diaria', date: '2026-10-01', is_recurring: true, is_paid: true },
        { id: 'exp-13', name: 'Combustible', amount: 150000, category_id: 'operativos-vida', category_name: 'Operativos y Vida Diaria', date: '2026-10-16', is_recurring: true, is_paid: true },
        { id: 'exp-14', name: 'Almuerzos', amount: 125000, category_id: 'operativos-vida', category_name: 'Operativos y Vida Diaria', date: '2026-10-18', is_recurring: false, is_paid: true },
        { id: 'exp-15', name: 'Transporte de los niños', amount: 90000, category_id: 'operativos-vida', category_name: 'Operativos y Vida Diaria', date: '2026-10-02', is_recurring: true, is_paid: true },
        { id: 'exp-16', name: 'Gimnasio', amount: 40000, category_id: 'operativos-vida', category_name: 'Operativos y Vida Diaria', date: '2026-10-03', is_recurring: true, is_paid: true },
        { id: 'exp-17', name: 'Dutide', amount: 100000, category_id: 'salud-obetide', category_name: 'Salud & Medicación', date: '2026-10-20', is_recurring: true, is_paid: true },
        { id: 'exp-18', name: 'Levotiroxina', amount: 15000, category_id: 'salud-obetide', category_name: 'Salud & Medicación', date: '2026-10-21', is_recurring: true, is_paid: true }
    ],
    aiMealPlans: [],
    currentView: 'dashboard',
    selectedDate: getArgentinaDate()
};

const calculateLevel = (xp) => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const addXP = (state, amount) => {
    if (!state.profile.xp) state.profile.xp = 0;
    const oldLevel = state.profile.level || 1;

    state.profile.xp += amount;
    const newLevel = calculateLevel(state.profile.xp);
    state.profile.level = newLevel;

    if (newLevel > oldLevel) {
        window.showAlert?.('¡Nivel Subido!', `Ahora eres Nivel ${newLevel}`, 'success');
    }
};

// --- CORE STATE ---

export const getState = () => {
    const key = getActiveStorageKey();
    const stored = localStorage.getItem(key);
    const currentUser = getCurrentUser();
    const isLmarinero = !currentUser || currentUser.username.toLowerCase() === 'lmarinero';

    let state;
    if (stored) {
        state = { ...defaultState, ...JSON.parse(stored) };
    } else if (isLmarinero) {
        // Fallback to legacy or defaultState for lmarinero
        const legacy = localStorage.getItem(STORAGE_KEY);
        state = legacy ? { ...defaultState, ...JSON.parse(legacy) } : { ...defaultState };
        localStorage.setItem(key, JSON.stringify(state));
    } else {
        // Return fresh clean isolated state for any new user
        state = {
            profile: {
                name: currentUser?.displayName || currentUser?.username || 'Usuario',
                age: 30,
                calorieGoal: 2000,
                proteinGoal: 150,
                carbsGoal: 200,
                fatGoal: 65,
                height: 175,
                gender: 'male',
                startingWeight: 80,
                targetWeight: 72,
                currency: 'ARS',
                health: { conditions: '', medications: '', metabolism: 'normal' },
                aiSummary: null,
                xp: 0,
                level: 1
            },
            monthlyIncome: 0,
            incomeSource: 'Ingreso Principal',
            expenseCategories: [
                { id: 'vivienda-servicios', name: 'Vivienda y Servicios', icon: 'home', color: '#0A84FF', monthly_budget: 0, items: [] },
                { id: 'compromisos-cuotas', name: 'Compromisos y Cuotas', icon: 'credit_card', color: '#FF9F0A', monthly_budget: 0, items: [] },
                { id: 'operativos-vida', name: 'Operativos y Vida Diaria', icon: 'shopping_bag', color: '#30D158', monthly_budget: 0, items: [] },
                { id: 'salud-meds', name: 'Salud & Medicación', icon: 'health_and_safety', color: '#BF5AF2', monthly_budget: 0, items: [] }
            ],
            expenses: [],
            dailyLog: [],
            days: {},
            measurements: [],
            workouts: [],
            gymSessions: [],
            fasting: { isActive: false, startTime: null, protocol: '16:8', targetHours: 16 },
            habits: [
                { id: 'water', name: '2L de Agua', icon: 'water_drop', target: 2000, current: 0, unit: 'ml', completed: false },
                { id: 'sleep', name: '7-8h Sueño', icon: 'bedtime', target: 8, current: 0, unit: 'horas', completed: false },
                { id: 'steps', name: '8k Pasos', icon: 'directions_walk', target: 8000, current: 0, unit: 'pasos', completed: false }
            ],
            obetideTreatments: [],
            aiMealPlans: []
        };
        localStorage.setItem(key, JSON.stringify(state));
    }

    if (!state.fasting) state.fasting = defaultState.fasting;
    if (!state.gymSessions) state.gymSessions = [];
    if (!state.expenseCategories) state.expenseCategories = [];
    if (!state.expenses) state.expenses = [];
    if (!state.dailyLog) state.dailyLog = [];

    // Specific preset maintenance exclusively for lmarinero
    if (isLmarinero) {
        if (!state.monthlyIncome) {
            state.monthlyIncome = defaultState.monthlyIncome;
            state.incomeSource = defaultState.incomeSource;
        }
        if (!state.expenseCategories || state.expenseCategories.length === 0) {
            state.expenseCategories = JSON.parse(JSON.stringify(defaultState.expenseCategories));
            localStorage.setItem(key, JSON.stringify(state));
        }
        if (!state.expenses || state.expenses.length === 0) {
            state.expenses = JSON.parse(JSON.stringify(defaultState.expenses));
            localStorage.setItem(key, JSON.stringify(state));
        }

        const saludCat = state.expenseCategories?.find(c => c.id === 'salud-obetide');
        if (saludCat && (saludCat.monthly_budget !== 115000 || !saludCat.items?.some(i => i.name === 'Dutide'))) {
            saludCat.name = 'Salud & Medicación';
            saludCat.monthly_budget = 115000;
            saludCat.items = [
                { name: 'Dutide', amount: 100000 },
                { name: 'Levotiroxina', amount: 15000 }
            ];
            if (!state.expenses.some(e => e.name === 'Dutide')) {
                state.expenses.push(
                    { id: 'exp-17', name: 'Dutide', amount: 100000, category_id: 'salud-obetide', category_name: 'Salud & Medicación', date: '2026-10-20', is_recurring: true, is_paid: true }
                );
            }
            if (!state.expenses.some(e => e.name === 'Levotiroxina')) {
                state.expenses.push(
                    { id: 'exp-18', name: 'Levotiroxina', amount: 15000, category_id: 'salud-obetide', category_name: 'Salud & Medicación', date: '2026-10-21', is_recurring: true, is_paid: true }
                );
            }
            localStorage.setItem(key, JSON.stringify(state));
        }

        if (state.dailyLog.length === 0) {
            state.dailyLog = defaultState.dailyLog;
            localStorage.setItem(key, JSON.stringify(state));
        }
    }

    return state;
};

// GLOBAL SAVE (Isolated by active user)
export const saveState = (newState) => {
    const key = getActiveStorageKey();
    newState.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(newState));
    saveProfileDB(newState);
    window.dispatchEvent(new CustomEvent('state-changed', { detail: newState }));
};

export const setSelectedDate = (date) => {
    const state = getState();
    state.selectedDate = date;
    const key = getActiveStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('state-changed', { detail: state }));
};

const isUnsyncedLocalId = (id) => {
    const num = Number(id);
    return !Number.isNaN(num) && num > 1000000000000;
};

export const initializeState = async () => {
    try {
        const key = getActiveStorageKey();
        const currentUser = getCurrentUser();
        const isLmarinero = !currentUser || currentUser.username?.toLowerCase() === 'lmarinero';

        // Read existing local state for this user (or legacy key fallback for lmarinero)
        let localRaw = localStorage.getItem(key);
        if (!localRaw && isLmarinero) {
            localRaw = localStorage.getItem(STORAGE_KEY);
        }
        const local = localRaw ? JSON.parse(localRaw) : getState();

        const cloudData = await loadFullState();
        if (cloudData) {
            let needsCloudProfilePush = false;

            // 1. Upload any local unsynced meals (created while offline or before schema fix)
            const cloudMeals = [...(cloudData.dailyLog || [])];
            for (const m of (local.dailyLog || [])) {
                if (isUnsyncedLocalId(m.id)) {
                    const alreadyInCloud = cloudMeals.some(
                        cm => cm.date === m.date && cm.name === m.name && Number(cm.calories) === Number(m.calories)
                    );
                    if (!alreadyInCloud) {
                        const saved = await addMealDB(m);
                        if (saved && saved.id) {
                            cloudMeals.unshift({ ...m, id: saved.id });
                            needsCloudProfilePush = true;
                        } else {
                            cloudMeals.unshift(m);
                        }
                    }
                }
            }

            // 2. Upload any local unsynced measurements
            const cloudMeasurements = [...(cloudData.measurements || [])];
            for (const meas of (local.measurements || [])) {
                if (isUnsyncedLocalId(meas.id)) {
                    const alreadyInCloud = cloudMeasurements.some(
                        cm => cm.date === meas.date && Number(cm.weight) === Number(meas.weight)
                    );
                    if (!alreadyInCloud) {
                        const saved = await addMeasurementDB(meas);
                        if (saved && saved.id) {
                            cloudMeasurements.unshift({ ...meas, id: saved.id });
                            needsCloudProfilePush = true;
                        } else {
                            cloudMeasurements.unshift(meas);
                        }
                    }
                }
            }

            // 3. Upload any local unsynced workouts
            const cloudWorkouts = [...(cloudData.workouts || [])];
            for (const w of (local.workouts || [])) {
                if (isUnsyncedLocalId(w.id)) {
                    const alreadyInCloud = cloudWorkouts.some(
                        cw => cw.date === w.date && (cw.name === w.name || cw.type === w.name) && Number(cw.calories) === Number(w.calories)
                    );
                    if (!alreadyInCloud) {
                        const saved = await addWorkoutDB(w);
                        if (saved && saved.id) {
                            cloudWorkouts.unshift({ ...w, id: saved.id });
                            needsCloudProfilePush = true;
                        } else {
                            cloudWorkouts.unshift(w);
                        }
                    }
                }
            }

            // 4. Upload any local unsynced Obetide treatments
            const cloudObetide = [...(cloudData.obetideTreatments || [])];
            for (const ob of (local.obetideTreatments || [])) {
                if (isUnsyncedLocalId(ob.id)) {
                    const alreadyInCloud = cloudObetide.some(
                        co => co.date === ob.date && Number(co.dose_ml) === Number(ob.dose_ml)
                    );
                    if (!alreadyInCloud) {
                        const saved = await addObetideTreatmentDB(ob);
                        if (saved && saved.id) {
                            cloudObetide.unshift({ ...ob, id: saved.id });
                            needsCloudProfilePush = true;
                        } else {
                            cloudObetide.unshift(ob);
                        }
                    }
                }
            }

            // 5. Upload any local unsynced expenses
            const cloudExpenses = [...(cloudData.expenses || [])];
            for (const exp of (local.expenses || [])) {
                if (isUnsyncedLocalId(exp.id)) {
                    const alreadyInCloud = cloudExpenses.some(
                        ce => ce.date === exp.date && Number(ce.amount) === Number(exp.amount) && (ce.name === exp.name || ce.description === exp.description)
                    );
                    if (!alreadyInCloud) {
                        const saved = await addExpenseDB(exp);
                        if (saved && saved.id) {
                            cloudExpenses.unshift({ ...exp, id: saved.id });
                            needsCloudProfilePush = true;
                        } else {
                            cloudExpenses.unshift(exp);
                        }
                    }
                }
            }

            // Determine authoritative base state (cloud fullState vs local)
            const cloudFull = cloudData.fullState || {};
            const cloudTime = new Date(cloudData.updatedAt || cloudFull.updatedAt || 0).getTime();
            const localTime = new Date(local.updatedAt || 0).getTime();
            const cloudIsNewerOrEqual = Boolean(cloudData.fullState) && (cloudTime >= localTime || !local.updatedAt);

            const baseState = cloudIsNewerOrEqual
                ? { ...defaultState, ...local, ...cloudFull }
                : { ...defaultState, ...cloudFull, ...local };

            if (!cloudData.fullState || localTime > cloudTime) {
                needsCloudProfilePush = true;
            }

            const cloudProfile = cloudData.profile || {};
            const mergedProfile = cloudIsNewerOrEqual
                ? { ...defaultState.profile, ...(local.profile || {}), ...(cloudProfile.profile || cloudProfile) }
                : { ...defaultState.profile, ...(cloudProfile.profile || cloudProfile), ...(local.profile || {}) };

            // Combine recurring/preset expenses from baseState with DB expenses without duplicating
            let finalExpenses = baseState.expenses || local.expenses || [];
            if (cloudExpenses.length > 0) {
                const dbExpenseMap = new Map();
                cloudExpenses.forEach(ce => {
                    const sig = `${ce.date}|${(ce.name || ce.description || '').toLowerCase()}|${ce.amount}`;
                    dbExpenseMap.set(sig, ce);
                });
                const mergedExp = [...cloudExpenses];
                for (const le of finalExpenses) {
                    const sig = `${le.date}|${(le.name || le.description || '').toLowerCase()}|${le.amount}`;
                    if (!dbExpenseMap.has(sig)) {
                        mergedExp.push(le);
                        dbExpenseMap.set(sig, le);
                    }
                }
                finalExpenses = mergedExp;
            }

            // Merge preset + cloudfull + DB expenseCategories without losing preset or custom categories
            const mergedCategoriesMap = new Map();
            const seedCategories = [
                ...(isLmarinero ? defaultState.expenseCategories : []),
                ...(baseState.expenseCategories || []),
                ...(local.expenseCategories || []),
                ...(cloudData.expenseCategories || [])
            ];
            for (const cat of seedCategories) {
                if (!cat || !cat.name) continue;
                const keyId = String(cat.slug || cat.id || cat.name).toLowerCase();
                const existing = mergedCategoriesMap.get(keyId) ||
                    Array.from(mergedCategoriesMap.values()).find(c => c.name?.toLowerCase() === cat.name?.toLowerCase());
                if (existing) {
                    const existingKey = String(existing.slug || existing.id || existing.name).toLowerCase();
                    mergedCategoriesMap.set(existingKey, {
                        ...existing,
                        ...cat,
                        id: existing.id && !String(existing.id).startsWith('temp-') && isNaN(Number(existing.id))
                            ? existing.id
                            : (cat.slug || cat.id || existing.id),
                        db_id: cat.db_id || existing.db_id || (typeof cat.id === 'number' ? cat.id : undefined),
                        items: (cat.items && cat.items.length > 0) ? cat.items : (existing.items || [])
                    });
                } else {
                    const stableId = (typeof cat.id === 'number' && cat.slug) ? cat.slug : (cat.id || `cat-${Date.now()}`);
                    mergedCategoriesMap.set(String(stableId).toLowerCase(), {
                        ...cat,
                        id: stableId,
                        db_id: cat.db_id || (typeof cat.id === 'number' ? cat.id : undefined)
                    });
                }
            }
            const finalCategories = Array.from(mergedCategoriesMap.values());

            const newState = {
                ...baseState,
                profile: mergedProfile,
                dailyLog: cloudMeals.length > 0 ? cloudMeals : (baseState.dailyLog || []),
                measurements: cloudMeasurements.length > 0 ? cloudMeasurements : (baseState.measurements || []),
                workouts: cloudWorkouts.length > 0 ? cloudWorkouts : (baseState.workouts || []),
                obetideTreatments: cloudObetide.length > 0 ? cloudObetide : (baseState.obetideTreatments || []),
                expenseCategories: finalCategories.length > 0 ? finalCategories : defaultState.expenseCategories,
                expenses: finalExpenses,
                aiMealPlans: (cloudData.aiMealPlans && cloudData.aiMealPlans.length > 0)
                    ? cloudData.aiMealPlans
                    : (baseState.aiMealPlans || []),
                selectedDate: local.selectedDate || getArgentinaDate(),
                updatedAt: cloudData.updatedAt || new Date().toISOString()
            };

            localStorage.setItem(key, JSON.stringify(newState));
            if (isLmarinero) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            }

            if (needsCloudProfilePush) {
                await saveProfileDB(newState);
            }

            window.dispatchEvent(new CustomEvent('state-changed', { detail: newState }));
            return newState;
        }
    } catch (e) {
        console.warn("Offline, using local state.", e);
    }
    return getState();
};

// --- FASTING ENGINE ---

export const startFasting = (protocol = '16:8', targetHours = 16, customStartTime = null) => {
    const state = getState();
    state.fasting = {
        isActive: true,
        startTime: customStartTime || new Date().toISOString(),
        protocol: protocol || `${targetHours}:${24 - targetHours}`,
        targetHours: Number(targetHours) || 16
    };
    saveState(state);
};

export const updateActiveFasting = ({ protocol, targetHours, startTime }) => {
    const state = getState();
    if (!state.fasting) state.fasting = {};
    if (protocol) state.fasting.protocol = protocol;
    if (targetHours) state.fasting.targetHours = Number(targetHours);
    if (startTime) state.fasting.startTime = startTime;
    saveState(state);
};

export const stopFasting = () => {
    const state = getState();
    state.fasting = {
        ...state.fasting,
        isActive: false,
        lastFinishedTime: new Date().toISOString()
    };
    addXP(state, 40); // XP for completing fast
    saveState(state);
};

export const getFastingProgress = () => {
    const state = getState();
    const f = state.fasting || defaultState.fasting;
    if (!f.isActive || !f.startTime) {
        return {
            isActive: false,
            elapsedHours: 0,
            elapsedMinutes: 0,
            elapsedFormatted: '0h 0m',
            remainingFormatted: `${f.targetHours || 16}h 0m`,
            percent: 0,
            stage: 'Inactivo',
            stageDesc: 'Configura tus horas y horario de inicio',
            protocol: f.protocol || '16:8',
            targetHours: f.targetHours || 16,
            startTimeFormatted: '--:--',
            endTimeFormatted: '--:--',
            isCompleted: false
        };
    }

    const start = new Date(f.startTime);
    const now = new Date();
    const diffMs = Math.max(0, now - start);
    const elapsedMinutesTotal = Math.floor(diffMs / (1000 * 60));
    const elapsedHours = Math.floor(elapsedMinutesTotal / 60);
    const elapsedMinutes = elapsedMinutesTotal % 60;
    const targetMinutes = (f.targetHours || 16) * 60;
    const remainingMinutesTotal = Math.max(0, targetMinutes - elapsedMinutesTotal);
    const remainingHours = Math.floor(remainingMinutesTotal / 60);
    const remainingMinutes = remainingMinutesTotal % 60;
    const percent = Math.min(100, Math.round((elapsedMinutesTotal / targetMinutes) * 100));

    const targetEndTime = new Date(start.getTime() + (targetMinutes * 60 * 1000));

    // Biological Fasting Stage
    let stage = 'Digestión & Nivelación';
    let stageDesc = 'Los niveles de glucosa en sangre se estabilizan.';
    if (elapsedHours >= 16) {
        stage = 'Autofagia y Renovación';
        stageDesc = 'Reciclaje celular profundo y máxima sensibilidad insulínica.';
    } else if (elapsedHours >= 12) {
        stage = 'Cetosis y Quema de Grasa';
        stageDesc = 'El cuerpo utiliza ácidos grasos como combustible principal.';
    } else if (elapsedHours >= 8) {
        stage = 'Caída de Insulina';
        stageDesc = 'Se agota el glucógeno hepático y comienza la lipólisis.';
    }

    const formatTime = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d) => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

    return {
        isActive: true,
        startTime: f.startTime,
        startTimeFormatted: `${formatDate(start)}, ${formatTime(start)}`,
        endTimeFormatted: `${formatDate(targetEndTime)}, ${formatTime(targetEndTime)}`,
        elapsedHours,
        elapsedMinutes,
        elapsedFormatted: `${elapsedHours}h ${elapsedMinutes}m`,
        remainingFormatted: `${remainingHours}h ${remainingMinutes}m`,
        percent,
        stage,
        stageDesc,
        protocol: f.protocol || `${f.targetHours}:${Math.max(0, 24 - f.targetHours)}`,
        targetHours: f.targetHours || 16,
        isCompleted: elapsedMinutesTotal >= targetMinutes
    };
};

// --- GYM LOGBOOK & 1RM CALCULATOR ---

export const calculate1RM = (weight, reps) => {
    const w = Number(weight) || 0;
    const r = Number(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return w;
    // Epley Formula: w * (1 + r/30)
    const epley = w * (1 + r / 30);
    // Brzycki Formula: w * (36 / (37 - r))
    const brzycki = r < 37 ? w * (36 / (37 - r)) : epley;
    return Math.round((epley + brzycki) / 2);
};

export const saveGymSession = async (sessionData) => {
    const state = getState();
    const tempId = Date.now();
    
    // Calculate total volume tonnage
    let totalVolumeKg = 0;
    let totalReps = 0;
    (sessionData.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
            if (s.completed) {
                totalVolumeKg += (Number(s.weight) || 0) * (Number(s.reps) || 0);
                totalReps += (Number(s.reps) || 0);
            }
        });
    });

    const newSession = {
        id: tempId,
        date: sessionData.date || state.selectedDate || getArgentinaDate(),
        name: sessionData.name || 'Sesión de Fuerza',
        duration: sessionData.duration || 45,
        calories: sessionData.calories || Math.round(totalVolumeKg * 0.05 + 150),
        exercises: sessionData.exercises || [],
        totalVolumeKg,
        totalReps
    };

    if (!state.gymSessions) state.gymSessions = [];
    state.gymSessions.push(newSession);

    // Also add to generic workouts table for unified calorie burns
    await addWorkout({
        name: newSession.name,
        type: 'strength',
        duration: newSession.duration,
        calories: newSession.calories,
        details: { volumeKg: totalVolumeKg, reps: totalReps }
    });

    addXP(state, 60);
    saveState(state);
    return newSession;
};

// --- ADAPTATIVE TDEE ENGINE (MacroFactor Style) ---

export const calculateAdaptiveTDEE = (state = getState()) => {
    const measurements = [...(state.measurements || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const dailyLog = state.dailyLog || [];
    
    // Default fallback to Mifflin-St Jeor formula
    const bmr = getBMR();
    const standardTDEE = Math.round(bmr * 1.4); // Moderately active default

    if (measurements.length < 2 || dailyLog.length < 5) {
        return {
            adaptiveTDEE: standardTDEE,
            confidence: 'Baja (Registra al menos 2 pesajes y 5 días de comidas)',
            recommendedDeficit: standardTDEE - 400,
            recommendedSurplus: standardTDEE + 300,
            maintenance: standardTDEE,
            weightDeltaKg: 0,
            avgIntake: standardTDEE
        };
    }

    const firstM = measurements[0];
    const lastM = measurements[measurements.length - 1];
    const daysBetween = Math.max(1, Math.round((new Date(lastM.date) - new Date(firstM.date)) / (1000 * 60 * 60 * 24)));
    
    // Average daily intake across the log
    const totalLoggedCalories = dailyLog.reduce((sum, m) => sum + (m.calories || 0), 0);
    // Group by date to find unique days logged
    const loggedDates = new Set(dailyLog.map(m => m.date));
    const daysWithLogs = Math.max(1, loggedDates.size);
    const avgIntake = Math.round(totalLoggedCalories / daysWithLogs);

    // 1 kg of fat ~= 7700 kcal
    const weightDeltaKg = Number(lastM.weight) - Number(firstM.weight);
    const dailyCaloricBalanceFromWeight = (weightDeltaKg * 7700) / daysBetween;

    // Real TDEE = Average intake - daily weight calorie delta
    let calculatedTDEE = Math.round(avgIntake - dailyCaloricBalanceFromWeight);
    // Sanity boundary: between 1200 and 4500 kcal
    calculatedTDEE = Math.max(1200, Math.min(4500, calculatedTDEE));

    return {
        adaptiveTDEE: calculatedTDEE,
        confidence: daysBetween >= 14 && daysWithLogs >= 10 ? 'Alta' : 'Media',
        recommendedDeficit: Math.round(calculatedTDEE - 450),
        recommendedSurplus: Math.round(calculatedTDEE + 300),
        maintenance: calculatedTDEE,
        weightDeltaKg: Math.round(weightDeltaKg * 10) / 10,
        avgIntake,
        daysEvaluated: daysBetween
    };
};

// --- ACTIONS ---

export const addWorkout = async (data) => {
    const state = getState();
    const weight = state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : (state.profile.startingWeight || 70);

    let caloriesBurned = data.calories;
    if (!caloriesBurned) {
        const durationHours = (data.duration || 30) / 60;
        const met = 5;
        caloriesBurned = Math.round(met * weight * durationHours);
    }

    const tempId = Date.now();
    const newWorkout = {
        id: tempId,
        date: data.date || state.selectedDate || getArgentinaDate(),
        ...data,
        calories: caloriesBurned
    };

    if (!state.workouts) state.workouts = [];
    state.workouts.push(newWorkout);

    addXP(state, 50);
    saveState(state);

    const dbData = await addWorkoutDB(newWorkout);
    if (dbData && dbData.id) {
        const currentState = getState();
        const workoutIndex = currentState.workouts.findIndex(w => w.id === tempId);
        if (workoutIndex !== -1) {
            currentState.workouts[workoutIndex].id = dbData.id;
            saveState(currentState);
        }
    }

    return newWorkout;
};

export const deleteWorkout = async (id) => {
    const state = getState();
    const idx = (state.workouts || []).findIndex(w => w.id === id || String(w.id) === String(id));
    if (idx !== -1) {
        state.workouts.splice(idx, 1);
        saveState(state);
        await deleteWorkoutDB(id);
    }
};

export const addMeal = async (meal) => {
    const state = getState();
    const fallback = state.selectedDate || getArgentinaDate();
    const mealDate = meal.date || fallback;
    const mealTime = meal.time || meal.category || 'Desayuno';
    const tempId = Date.now();

    const isHealthy = (meal.macros?.protein || 0) > (meal.macros?.fat || 0);
    const xp = isHealthy ? 25 : 15;

    const finalSodium = getMealSodium(meal);
    const finalMacros = {
        protein: Number(meal.macros?.protein || 0),
        carbs: Number(meal.macros?.carbs || 0),
        fat: Number(meal.macros?.fat || 0),
        sodium: finalSodium
    };

    const finalMeal = { 
        ...meal, 
        macros: finalMacros,
        date: mealDate, 
        time: mealTime, 
        id: tempId,
        satiety_score: meal.satiety_score ? Number(meal.satiety_score) : null,
        sensations: Array.isArray(meal.sensations) ? meal.sensations : [],
        opinion: meal.opinion || null
    };

    if (!state.dailyLog) state.dailyLog = [];
    state.dailyLog.push(finalMeal);
    addXP(state, xp);

    saveState(state);

    const dbData = await addMealDB(finalMeal);
    if (dbData && dbData.id) {
        const currentState = getState();
        const mealIndex = currentState.dailyLog.findIndex(m => m.id === tempId);
        if (mealIndex !== -1) {
            currentState.dailyLog[mealIndex].id = dbData.id;
            saveState(currentState);
        }
    }
};

export const deleteMeal = (id) => {
    const state = getState();
    const meal = state.dailyLog.find(m => String(m.id) === String(id));

    state.dailyLog = state.dailyLog.filter(m => String(m.id) !== String(id));
    saveState(state);

    if (meal) {
        const mealId = Number(id);
        if (mealId > 0 && mealId < 1000000000000) {
            deleteMealByIdDB(mealId);
        } else {
            deleteMealByAttributesDB(meal.name, meal.date, meal.calories);
        }
    }
};

export const updateMeal = (id, updates) => {
    const state = getState();
    const index = state.dailyLog.findIndex(m => String(m.id) === String(id));
    if (index !== -1) {
        state.dailyLog[index] = { ...state.dailyLog[index], ...updates };
        saveState(state);

        const numId = Number(id);
        if (numId > 0 && numId < 1000000000000) {
            updateMealDB(numId, state.dailyLog[index]);
        }
    }
};

export const updateMealSensations = (id, { satiety_score, sensations, opinion }) => {
    const state = getState();
    const index = (state.dailyLog || []).findIndex(m => String(m.id) === String(id));
    if (index !== -1) {
        state.dailyLog[index] = {
            ...state.dailyLog[index],
            satiety_score: satiety_score !== undefined ? (satiety_score ? Number(satiety_score) : null) : state.dailyLog[index].satiety_score,
            sensations: sensations !== undefined ? sensations : (state.dailyLog[index].sensations || []),
            opinion: opinion !== undefined ? opinion : (state.dailyLog[index].opinion || ''),
            sensation_updated_at: new Date().toISOString()
        };
        saveState(state);

        const numId = Number(id);
        if (numId > 0 && numId < 1000000000000) {
            updateMealDB(numId, state.dailyLog[index]);
        }
        return state.dailyLog[index];
    }
    return null;
};

export const getSensationsMetrics = (targetDate = null) => {
    const state = getState();
    const allMeals = state.dailyLog || [];
    const meals = targetDate ? allMeals.filter(m => m.date === targetDate) : allMeals;

    const ratedMeals = meals.filter(m => m.satiety_score || (m.sensations && m.sensations.length > 0) || m.opinion);
    const scores = ratedMeals.filter(m => m.satiety_score > 0).map(m => Number(m.satiety_score));

    const avgScore = scores.length > 0 
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) 
        : 0;

    // Distribution (1: Con Hambre, 2: Ligero, 3: En su punto, 4: Muy lleno, 5: Pesado)
    const counts = {
        hungry: scores.filter(s => s === 1).length,
        light: scores.filter(s => s === 2).length,
        optimal: scores.filter(s => s === 3).length,
        full: scores.filter(s => s === 4).length,
        heavy: scores.filter(s => s === 5).length
    };

    const totalScores = scores.length || 1;
    const distribution = {
        hungry: { count: counts.hungry, pct: Math.round((counts.hungry / totalScores) * 100) },
        light: { count: counts.light, pct: Math.round((counts.light / totalScores) * 100) },
        optimal: { count: counts.optimal, pct: Math.round((counts.optimal / totalScores) * 100) },
        full: { count: counts.full, pct: Math.round((counts.full / totalScores) * 100) },
        heavy: { count: counts.heavy, pct: Math.round((counts.heavy / totalScores) * 100) },
        groupedOptimal: { count: counts.optimal + counts.light, pct: Math.round(((counts.optimal + counts.light) / totalScores) * 100) },
        groupedOverfull: { count: counts.full + counts.heavy, pct: Math.round(((counts.full + counts.heavy) / totalScores) * 100) },
        groupedHungry: { count: counts.hungry, pct: Math.round((counts.hungry / totalScores) * 100) }
    };

    // Sensations frequency counter
    const tagMap = {};
    ratedMeals.forEach(m => {
        if (Array.isArray(m.sensations)) {
            m.sensations.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });

    const topSensations = Object.entries(tagMap)
        .map(([tag, count]) => ({ tag, count, pct: Math.round((count / (ratedMeals.length || 1)) * 100) }))
        .sort((a, b) => b.count - a.count);

    // Status label based on avgScore
    let statusLabel = 'Sin registros de sensaciones';
    let statusColor = 'text-slate-400';
    let statusBg = 'bg-slate-800';
    let statusDesc = 'Registra cómo te sentiste al terminar tus comidas para ver tus patrones de saciedad.';
    if (avgScore > 0) {
        if (avgScore >= 2.5 && avgScore <= 3.3) {
            statusLabel = 'Saciedad Óptima (En su punto)';
            statusColor = 'text-[#10E775]';
            statusBg = 'bg-[#10E775]/20';
            statusDesc = 'Excelente autorregulación: alcanzas saciedad confortable sin llegar a plenitud excesiva.';
        } else if (avgScore > 3.3 && avgScore <= 4.0) {
            statusLabel = 'Tendencia a Plenitud Alta';
            statusColor = 'text-amber-400';
            statusBg = 'bg-amber-400/20';
            statusDesc = 'Se observa que con frecuencia terminas al límite de tu capacidad. Recomendado pausar a mitad de plato.';
        } else if (avgScore > 4.0) {
            statusLabel = 'Exceso / Pesadez Recurrente';
            statusColor = 'text-rose-400';
            statusBg = 'bg-rose-400/20';
            statusDesc = 'Frecuencia alta de empacho o pesadez. Importante reducir volumen de porción para evitar reflujo.';
        } else {
            statusLabel = 'Sensación de Hambre / Déficit Pronunciado';
            statusColor = 'text-blue-400';
            statusBg = 'bg-blue-400/20';
            statusDesc = 'Terminas con apetito residual. Podrías aumentar volumen con vegetales o fibra.';
        }
    }

    // Recent opinions log
    const recentOpinions = ratedMeals
        .filter(m => m.opinion || m.satiety_score)
        .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0));

    return {
        totalMeals: meals.length,
        ratedMealsCount: ratedMeals.length,
        hasData: ratedMeals.length > 0,
        avgScore,
        statusLabel,
        statusColor,
        statusBg,
        statusDesc,
        counts,
        distribution,
        topSensations,
        recentOpinions
    };
};

export const addMeasurement = async (data) => {
    const state = getState();
    const { weight, neck, waist, hip } = data;
    const profile = state.profile;
    const height = profile.height || 175;
    const gender = profile.gender || 'male';

    let bodyFat = 0;
    if (gender === 'male') {
        const logWaistNeck = Math.log10(Math.max(1, waist - neck));
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight)) - 450;
    } else {
        const finalHip = hip || waist;
        const logWaistHipNeck = Math.log10(Math.max(1, waist + finalHip - neck));
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.29579 - 0.35004 * logWaistHipNeck + 0.22100 * logHeight)) - 450;
    }
    bodyFat = Math.max(2, Math.min(60, bodyFat));

    const fatMass = (weight * bodyFat) / 100;
    const leanMass = weight - fatMass;

    const newEntry = {
        id: Date.now(),
        date: data.date || getArgentinaDate(),
        weight: Number(weight),
        neck: Number(neck) || 0,
        waist: Number(waist) || 0,
        hip: Number(hip) || 0,
        bodyFat: Number(bodyFat.toFixed(1)),
        fatMass: Number(fatMass.toFixed(1)),
        leanMass: Number(leanMass.toFixed(1))
    };

    if (!state.measurements) state.measurements = [];
    state.measurements.push(newEntry);

    addXP(state, 50);
    saveState(state);
    const saved = await addMeasurementDB(newEntry);
    if (saved && saved.id) {
        const currentState = getState();
        const idx = (currentState.measurements || []).findIndex(m => m.id === newEntry.id);
        if (idx !== -1) {
            currentState.measurements[idx].id = saved.id;
            saveState(currentState);
        }
    }

    return newEntry;
};

// ... Read-Only Getters ...

export const getDailyStats = (dateStr) => {
    const state = getState();
    const targetDate = dateStr || state.selectedDate || getArgentinaDate();
    const todaysMeals = (state.dailyLog || []).filter(m => m.date === targetDate);

    return todaysMeals.reduce((acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += (meal.macros?.protein || 0);
        acc.carbs += (meal.macros?.carbs || 0);
        acc.fat += (meal.macros?.fat || 0);
        acc.sodium += getMealSodium(meal);
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 });
};

export const getLatestMeasurement = () => {
    const state = getState();
    if (!state.measurements || state.measurements.length === 0) return null;
    return [...state.measurements].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};

export const checkMeasurementStatus = () => {
    const state = getState();
    const lastStr = getLatestMeasurement()?.date;
    if (!lastStr) return { isDue: true, daysSince: null };

    const lastDate = new Date(lastStr);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const freq = state.profile.checkinFrequency || 15;
    return { isDue: diffDays >= freq, daysSince: diffDays, daysRem: freq - diffDays };
};

export const setDailyHabits = (newHabits) => {
    const state = getState();
    state.habits = newHabits;
    state.lastHabitGenerationDate = getArgentinaDate();
    saveState(state);
};

export const toggleHabit = (habitId, dateStr) => {
    const state = getState();
    const targetDate = dateStr || state.selectedDate || getArgentinaDate();
    if (!state.habitLog) state.habitLog = {};
    if (!state.habitLog[targetDate]) state.habitLog[targetDate] = [];

    const index = state.habitLog[targetDate].indexOf(habitId);
    if (index > -1) state.habitLog[targetDate].splice(index, 1);
    else state.habitLog[targetDate].push(habitId);

    saveState(state);
};

export const getBMR = () => {
    const state = getState();
    const p = state.profile || {};
    const lastM = getLatestMeasurement();
    const weight = lastM ? lastM.weight : (p.startingWeight || 70);
    const height = p.height || 175;
    const age = p.age || 30;
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
};

export const getDailyBurn = (dateStr) => {
    const state = getState();
    const bmr = getBMR();
    const date = dateStr || state.selectedDate || getArgentinaDate();

    const workouts = state.workouts || [];
    const dailyWorkouts = workouts.filter(w => w.date === date);
    const activityBurn = dailyWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);

    return {
        bmr,
        activity: activityBurn,
        total: bmr + activityBurn,
        workouts: dailyWorkouts
    };
};

export const updateDayStat = (date, key, value) => {
    const state = getState();
    if (!state.days) state.days = {};
    if (!state.days[date]) state.days[date] = {};

    state.days[date][key] = value;
    saveState(state);
};

export const setDailyTip = (content) => {
    const state = getState();
    const today = getArgentinaDate();
    state.dailyTip = { date: today, content };
    saveState(state);
};

// --- OBETIDE (GLP-1) ACTIONS ---

export const addObetideTreatment = async (data) => {
    const state = getState();
    if (!state.obetideTreatments) state.obetideTreatments = [];

    const newEntry = {
        id: Date.now(),
        date: data.date || getArgentinaDate(),
        dose_ml: Number(data.dose_ml || data.dose || 0.25),
        injection_site: data.injection_site || 'abdomen_der',
        satiety_level: Number(data.satiety_level || 7),
        side_effects: data.side_effects || [],
        notes: data.notes || '',
        created_at: new Date().toISOString()
    };

    state.obetideTreatments.unshift(newEntry);
    addXP(state, 60);
    saveState(state);

    const saved = await addObetideTreatmentDB(newEntry);
    if (saved && saved.id) {
        newEntry.id = saved.id;
        saveState(state);
    }
    return newEntry;
};

export const deleteObetideTreatment = async (id) => {
    const state = getState();
    if (!state.obetideTreatments) return;
    state.obetideTreatments = state.obetideTreatments.filter(t => t.id !== id);
    saveState(state);
    await deleteObetideTreatmentDB(id);
};

export const getLatestObetideTreatment = () => {
    const state = getState();
    if (!state.obetideTreatments || state.obetideTreatments.length === 0) return null;
    return [...state.obetideTreatments].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};

// --- MI BILLETERA (FINANZAS & PRESUPUESTOS) ACTIONS ---

export const addExpense = async (data) => {
    const state = getState();
    if (!state.expenses) state.expenses = [];

    const tempId = Date.now();
    const conceptName = (data.name || data.description || data.category_name || 'Gasto').trim();
    const newExpense = {
        id: tempId,
        name: conceptName,
        category_id: data.category_id || null,
        category_name: data.category_name || 'General',
        amount: Number(data.amount || 0),
        date: data.date || getArgentinaDate(),
        description: data.description || conceptName,
        payment_method: data.payment_method || 'tarjeta_debito',
        is_recurring: Boolean(data.is_recurring),
        is_paid: data.is_paid !== undefined ? Boolean(data.is_paid) : true,
        created_at: new Date().toISOString()
    };

    state.expenses.unshift(newExpense);
    addXP(state, 20);
    saveState(state);

    const saved = await addExpenseDB(newExpense);
    if (saved && saved.id) {
        const currentState = getState();
        const target = (currentState.expenses || []).find(e => e.id === tempId);
        if (target) {
            target.id = saved.id;
            saveState(currentState);
        }
        newExpense.id = saved.id;
    }
    return newExpense;
};

export const deleteExpense = async (id) => {
    const state = getState();
    if (!state.expenses) return;
    state.expenses = state.expenses.filter(e => String(e.id) !== String(id));
    saveState(state);
    await deleteExpenseDB(id);
};

export const saveExpenseCategory = async (catData) => {
    const state = getState();
    if (!state.expenseCategories) state.expenseCategories = [];

    let updatedCat = null;
    const existingIndex = (catData.id !== undefined && catData.id !== null)
        ? state.expenseCategories.findIndex(c =>
            String(c.id) === String(catData.id) ||
            (c.db_id !== undefined && String(c.db_id) === String(catData.id))
        )
        : state.expenseCategories.findIndex(c => c.name?.toLowerCase() === catData.name?.trim().toLowerCase());

    if (existingIndex >= 0) {
        state.expenseCategories[existingIndex] = {
            ...state.expenseCategories[existingIndex],
            ...catData,
            id: state.expenseCategories[existingIndex].id,
            monthly_budget: Number(catData.monthly_budget ?? state.expenseCategories[existingIndex].monthly_budget ?? 0)
        };
        updatedCat = state.expenseCategories[existingIndex];
    } else {
        const slugBase = (catData.name || 'categoria')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const stableId = catData.id || `${slugBase || 'cat'}-${Date.now().toString().slice(-5)}`;
        updatedCat = {
            id: stableId,
            slug: stableId,
            name: catData.name.trim(),
            icon: catData.icon || '💰',
            color: catData.color || '#0A84FF',
            monthly_budget: Number(catData.monthly_budget || 0),
            items: Array.isArray(catData.items) ? catData.items : []
        };
        state.expenseCategories.push(updatedCat);
    }

    saveState(state);
    const dbResult = await saveExpenseCategoryDB(updatedCat);
    if (dbResult && dbResult.id) {
        const currentState = getState();
        const target = (currentState.expenseCategories || []).find(c => String(c.id) === String(updatedCat.id));
        if (target) {
            target.db_id = dbResult.id;
            saveState(currentState);
        }
        updatedCat.db_id = dbResult.id;
    }
    return updatedCat;
};

export const deleteExpenseCategory = async (id) => {
    const state = getState();
    if (!state.expenseCategories) return;
    const catToDelete = state.expenseCategories.find(c => String(c.id) === String(id) || String(c.db_id) === String(id));
    state.expenseCategories = state.expenseCategories.filter(
        c => String(c.id) !== String(id) && String(c.db_id) !== String(id)
    );
    saveState(state);
    await deleteExpenseCategoryDB(catToDelete?.db_id || id);
};

export const setMonthlyIncome = (amount, source = 'Sanatorio Argentino') => {
    const state = getState();
    state.monthlyIncome = Number(amount) || 0;
    state.incomeSource = source;
    saveState(state);
};

export const getFinancialSummary = (monthStr = null) => {
    const state = getState();
    const expenses = state.expenses || [];
    const categories = state.expenseCategories || [];
    const monthlyIncome = Number(state.monthlyIncome || 2975000);
    const incomeSource = state.incomeSource || 'Sanatorio Argentino';

    const targetMonth = monthStr || getArgentinaDate().substring(0, 7); // 'YYYY-MM'
    const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(targetMonth));

    const totalSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalBudget = categories.reduce((sum, c) => sum + Number(c.monthly_budget || 0), 0);
    const netBalance = monthlyIncome - totalSpent;

    // Spend by category
    const byCategory = {};
    categories.forEach(c => {
        const key = String(c.id || c.name);
        byCategory[key] = {
            category: c,
            spent: 0,
            budget: Number(c.monthly_budget || 0),
            items: c.items || [],
            percent: 0,
            percentOfTotal: 0
        };
    });

    const resolveCategoryKey = (exp) => {
        const rawId = exp.category_id !== undefined && exp.category_id !== null ? String(exp.category_id) : '';
        const rawName = (exp.category_name || '').trim().toLowerCase();

        if (rawId && byCategory[rawId]) return rawId;

        const matchedCat = categories.find(c =>
            (rawId && (String(c.id) === rawId || String(c.db_id) === rawId || String(c.slug) === rawId)) ||
            (rawName && c.name?.trim().toLowerCase() === rawName) ||
            (rawName && (rawName.includes('obetide') || rawName.includes('salud')) && String(c.id) === 'salud-obetide')
        );
        if (matchedCat) {
            return String(matchedCat.id || matchedCat.name);
        }

        const fallbackKey = rawId || exp.category_name || 'otros';
        if (!byCategory[fallbackKey]) {
            byCategory[fallbackKey] = {
                category: {
                    id: fallbackKey,
                    name: exp.category_name || 'Otros Gastos',
                    icon: '🏷️',
                    color: '#0A84FF',
                    monthly_budget: 0
                },
                spent: 0,
                budget: 0,
                items: [],
                percent: 0,
                percentOfTotal: 0
            };
        }
        return fallbackKey;
    };

    monthExpenses.forEach(e => {
        const key = resolveCategoryKey(e);
        byCategory[key].spent += Number(e.amount || 0);
    });

    Object.values(byCategory).forEach(item => {
        if (item.budget > 0) {
            item.percent = Math.min(200, Math.round((item.spent / item.budget) * 100));
        } else {
            item.percent = 0;
        }
        item.percentOfTotal = totalSpent > 0 ? Math.round((item.spent / totalSpent) * 100) : 0;
    });

    const paidExpenses = monthExpenses.filter(e => e.is_paid !== false);
    const pendingExpenses = monthExpenses.filter(e => e.is_paid === false);
    const totalPaid = paidExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalPending = pendingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const isAllPaid = monthExpenses.length > 0 && pendingExpenses.length === 0;

    return {
        month: targetMonth,
        monthlyIncome,
        incomeSource,
        totalSpent,
        totalBudget,
        totalPaid,
        totalPending,
        isAllPaid,
        paidCount: paidExpenses.length,
        pendingCount: pendingExpenses.length,
        netBalance,
        remainingBudget: Math.max(0, totalBudget - totalSpent),
        byCategory: Object.values(byCategory),
        recentExpenses: monthExpenses.slice(0, 10)
    };
};

export const toggleExpensePaid = (id) => {
    const state = getState();
    const exp = (state.expenses || []).find(e => String(e.id) === String(id));
    if (exp) {
        exp.is_paid = !(exp.is_paid !== false);
        saveState(state);
        updateExpenseDB(exp.id, { is_paid: exp.is_paid });
    }
};

export const setAllExpensesPaid = (monthStr = null, paid = true) => {
    const state = getState();
    const targetMonth = monthStr || getArgentinaDate().substring(0, 7);
    (state.expenses || []).forEach(e => {
        if (e.date && e.date.startsWith(targetMonth)) {
            e.is_paid = paid;
            updateExpenseDB(e.id, { is_paid: paid });
        }
    });
    saveState(state);
};

// --- PLANES DE ALIMENTACIÓN IA ---

export const saveAiMealPlan = async (plan) => {
    const state = getState();
    if (!state.aiMealPlans) state.aiMealPlans = [];

    const entry = {
        id: Date.now(),
        target_calories: plan.target_calories || 1800,
        plan_data: plan.plan_data || plan,
        created_at: new Date().toISOString()
    };

    state.aiMealPlans.unshift(entry);
    saveState(state);
    const saved = await saveAiMealPlanDB(entry);
    if (saved && saved.id) {
        entry.id = saved.id;
        saveState(state);
    }
    return entry;
};

