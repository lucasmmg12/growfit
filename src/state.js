import {
    loadFullState,
    saveProfileDB,
    addMealDB,
    deleteMealByIdDB,
    deleteMealByAttributesDB,
    addMeasurementDB,
    addWorkoutDB,
    updateMealDB
} from './services/db';

// Helper to get today's date in Argentina Timezone (Y-m-d)
export const getArgentinaDate = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
};

const defaultState = {
    profile: {
        name: '',
        age: 30,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 200,
        fatGoal: 65,
        height: 175,
        gender: 'male',
        checkinFrequency: 15,
        startingWeight: null,
        targetWeight: null,
        health: {
            conditions: '',
            medications: '',
            metabolism: 'normal'
        },
        aiSummary: null,
        xp: 0,
        level: 1
    },
    dailyLog: [],
    days: {},
    measurements: [],
    workouts: [],
    habits: [
        { id: 'h2', name: 'Sin Azúcar', icon: 'block' },
        { id: 'h3', name: 'Caminar 30 min', icon: 'directions_walk' },
        { id: 'h4', name: 'Leer 10 min', icon: 'menu_book' }
    ],
    habitLog: {},
    dailyTip: { date: null, content: null },
    currentView: 'dashboard',
    selectedDate: getArgentinaDate()
};

const calculateLevel = (xp) => {
    // Level 1: 0-100, Level 2: 101-300, etc. (Simple exponential curve)
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const addXP = (state, amount) => {
    if (!state.profile.xp) state.profile.xp = 0;
    const oldLevel = state.profile.level || 1;

    state.profile.xp += amount;
    const newLevel = calculateLevel(state.profile.xp);

    state.profile.level = newLevel;

    if (newLevel > oldLevel) {
        window.showAlert('¡Nivel Subido!', `Ahora eres Nivel ${newLevel}`, 'success');
    }
};

// --- CORE STATE ---

export const getState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const state = stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState;
    if (state.habits) {
        state.habits = state.habits.filter(h => !h.name.includes('Ayuno'));
    }
    return state;
};

// GLOBAL SAVE (Primarily for Profile & UI State)
export const saveState = (newState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // Persist everything to the cloud data JSON
    saveProfileDB(newState);

    window.dispatchEvent(new CustomEvent('state-changed', { detail: newState }));
};

export const setSelectedDate = (date) => {
    const state = getState();
    state.selectedDate = date;
    saveState(state);
};

export const initializeState = async () => {
    try {
        const cloudData = await loadFullState();
        if (cloudData) {
            const localRaw = localStorage.getItem(STORAGE_KEY);
            const local = localRaw ? JSON.parse(localRaw) : {};
            const cloudState = cloudData.profile || {};

            const newState = {
                ...defaultState,
                ...cloudState,
                ...local,
                selectedDate: getArgentinaDate(), // ALWAYS START ON TODAY
                dailyLog: cloudData.dailyLog || [],
                measurements: cloudData.measurements || [],
                workouts: cloudData.workouts || []
            };

            // Ensure dailyLog correctly reflects the specialized tables if they are not empty
            if (cloudData.dailyLog?.length > 0) newState.dailyLog = cloudData.dailyLog;
            if (cloudData.measurements?.length > 0) newState.measurements = cloudData.measurements;
            if (cloudData.workouts?.length > 0) newState.workouts = cloudData.workouts;

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            return newState;
        }
    } catch (e) {
        console.warn("Offline, using local.", e);
    }
    return getState();
};

// --- ACTIONS (Now Connected to Granular DB) ---

export const addWorkout = async (data) => {
    const state = getState();
    const weight = state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : (state.profile.startingWeight || 70);

    let caloriesBurned = data.calories;
    if (!caloriesBurned) {
        const durationHours = data.duration / 60;
        const met = 5;
        caloriesBurned = Math.round(met * weight * durationHours);
    }

    // Temporary ID for immediate UI update
    const tempId = Date.now();
    const newWorkout = {
        id: tempId,
        date: data.date || state.selectedDate || new Date().toISOString().split('T')[0],
        ...data,
        calories: caloriesBurned
    };

    if (!state.workouts) state.workouts = [];
    state.workouts.push(newWorkout);

    addXP(state, 50); // XP for Workout

    saveState(state);

    // DB Sync
    const dbData = await addWorkoutDB(newWorkout);
    if (dbData && dbData.id) {
        // Update local ID with real DB ID
        const currentState = getState();
        const workoutIndex = currentState.workouts.findIndex(w => w.id === tempId);
        if (workoutIndex !== -1) {
            currentState.workouts[workoutIndex].id = dbData.id;
            saveState(currentState);
        }
    }

    return newWorkout;
};

export const addMeal = async (meal) => {
    const state = getState();
    const fallback = state.selectedDate || getArgentinaDate();
    const mealDate = meal.date || fallback;
    const mealTime = meal.time || meal.category || 'Desayuno';
    const tempId = Date.now();

    // Check if it's "healthy" (simple logic: protein > fat) to give bonus XP
    const isHealthy = (meal.macros?.protein || 0) > (meal.macros?.fat || 0);
    const xp = isHealthy ? 20 : 10;

    const finalMeal = { ...meal, date: mealDate, time: mealTime, id: tempId };

    state.dailyLog.push(finalMeal);
    addXP(state, xp); // XP for Meal

    saveState(state);

    const dbData = await addMealDB(finalMeal); // DB Sync
    if (dbData && dbData.id) {
        // Update local ID with real DB ID
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
        if (mealId > 0 && mealId < 1000000000000) { // Safely check if it's a DB ID (usually small numbers)
            deleteMealByIdDB(mealId);
        } else {
            // Fallback for unsynced or legacy items (timestamp-based IDs or string IDs)
            deleteMealByAttributesDB(meal.name, meal.date, meal.calories);
        }
    }
};

export const updateMeal = (id, updates) => {
    // Updates are tricky in granular DB without ID.
    // For MVP, we skip complex update sync or assume Add/Delete flow.
    // If user edits, we update local. DB drift risk implies reload needed.
    const state = getState();
    const index = state.dailyLog.findIndex(m => m.id === id);
    if (index !== -1) {
        state.dailyLog[index] = { ...state.dailyLog[index], ...updates };
        saveState(state);

        // Persist to DB if it's a valid ID
        if (id > 0 && id < 1000000000000) { // IDs from DB are small, Date.now() is >= 13 digits
            updateMealDB(id, state.dailyLog[index]);
        }
    }
};

export const addMeasurement = async (data) => {
    const state = getState();
    const { weight, neck, waist, hip } = data;
    const profile = state.profile;
    const height = profile.height || 175;
    const gender = profile.gender || 'male';

    // BF Calc (Navy Seal Method)
    let bodyFat = 0;
    if (gender === 'male') {
        const logWaistNeck = Math.log10(waist - neck);
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight)) - 450;
    } else {
        const finalHip = hip || waist;
        const logWaistHipNeck = Math.log10(waist + finalHip - neck);
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.29579 - 0.35004 * logWaistHipNeck + 0.22100 * logHeight)) - 450;
    }
    bodyFat = Math.max(2, Math.min(60, bodyFat));

    const fatMass = (weight * bodyFat) / 100;
    const leanMass = weight - fatMass;

    const newEntry = {
        id: Date.now(),
        date: data.date || new Date().toISOString().split('T')[0],
        weight: Number(weight),
        neck, waist, hip,
        bodyFat: Number(bodyFat.toFixed(1)),
        fatMass: Number(fatMass.toFixed(1)),
        leanMass: Number(leanMass.toFixed(1))
    };

    if (!state.measurements) state.measurements = [];
    state.measurements.push(newEntry);

    saveState(state);
    await addMeasurementDB(newEntry);

    return newEntry;
};

// ... Read-Only Getters ...
export const getDailyStats = (dateStr) => {
    const state = getState();
    const targetDate = dateStr || state.selectedDate || new Date().toISOString().split('T')[0];
    const todaysMeals = state.dailyLog.filter(m => m.date === targetDate);

    return todaysMeals.reduce((acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += (meal.macros?.protein || 0);
        acc.carbs += (meal.macros?.carbs || 0);
        acc.fat += (meal.macros?.fat || 0);
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
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
    state.lastHabitGenerationDate = new Date().toISOString().split('T')[0];
    saveState(state); // Saves to Profile JSON in DB
};

export const toggleHabit = (habitId, dateStr) => {
    const state = getState();
    const targetDate = dateStr || state.selectedDate || new Date().toISOString().split('T')[0];
    if (!state.habitLog) state.habitLog = {};
    if (!state.habitLog[targetDate]) state.habitLog[targetDate] = [];

    const index = state.habitLog[targetDate].indexOf(habitId);
    if (index > -1) state.habitLog[targetDate].splice(index, 1);
    else state.habitLog[targetDate].push(habitId);

    saveState(state);
};

export const getBMR = () => {
    const state = getState();
    const p = state.profile;
    const lastM = getLatestMeasurement();
    const weight = lastM ? lastM.weight : (p.startingWeight || 70);
    const height = p.height || 175;
    const age = p.age || 30;
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5); // Simple calculation
};

export const getDailyBurn = (dateStr) => {
    const state = getState();
    const bmr = getBMR();
    const date = dateStr || state.selectedDate || new Date().toISOString().split('T')[0];

    const workouts = state.workouts || [];
    const dailyWorkouts = workouts.filter(w => w.date === date);

    const activityBurn = dailyWorkouts.reduce((sum, w) => sum + w.calories, 0);

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
    const today = new Date().toISOString().split('T')[0];
    state.dailyTip = { date: today, content };
    saveState(state);
};
