import {
    loadFullState,
    saveProfileDB,
    addMealDB,
    deleteMealDB,
    addMeasurementDB,
    addWorkoutDB
} from './services/db';

const STORAGE_KEY = 'growfit_data';

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
        aiSummary: null
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
    currentView: 'dashboard'
};

// --- CORE STATE ---

export const getState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const state = stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState;
    // Fix Dates if DB returned strings (should be fine as strings)
    return state;
};

// GLOBAL SAVE (Primarily for Profile & UI State)
export const saveState = (newState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // Sync Profile on every save (Safe/Low Cost)
    saveProfileDB(newState.profile);

    window.dispatchEvent(new CustomEvent('state-changed', { detail: newState }));
};

export const initializeState = async () => {
    try {
        const cloudData = await loadFullState();
        if (cloudData) {
            // Merge Clouds Arrays with Local defaults?
            // Actually replace lists entirely with DB source of truth
            const newState = {
                ...defaultState,
                profile: cloudData.profile || defaultState.profile,
                dailyLog: cloudData.dailyLog || [],
                measurements: cloudData.measurements || [],
                workouts: cloudData.workouts || []
            };

            // Persist locally
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            return newState;
        }
    } catch (e) {
        console.warn("Offline, using local.", e);
    }
    return getState();
};

// --- ACTIONS (Now Connected to Granular DB) ---

export const addWorkout = (data) => {
    const state = getState();
    const weight = state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : (state.profile.startingWeight || 70);

    let caloriesBurned = data.calories;
    if (!caloriesBurned) {
        // MET Calc Logic inline or imported
        const durationHours = data.duration / 60;
        const met = 5; // Simplified default
        caloriesBurned = Math.round(met * weight * durationHours);
    }

    const newWorkout = {
        id: Date.now(), // Temp ID
        date: data.date || new Date().toISOString().split('T')[0],
        ...data,
        calories: caloriesBurned
    };

    if (!state.workouts) state.workouts = [];
    state.workouts.push(newWorkout);

    // 1. Save Local
    saveState(state);
    // 2. Save DB
    addWorkoutDB(newWorkout);

    return newWorkout;
};

export const addMeal = (meal) => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    const mealDate = meal.date || today;
    const finalMeal = { ...meal, date: mealDate, id: Date.now() };

    state.dailyLog.push(finalMeal);
    saveState(state);
    addMealDB(finalMeal); // DB Sync
};

export const deleteMeal = (id) => {
    const state = getState();
    const meal = state.dailyLog.find(m => m.id === id);

    state.dailyLog = state.dailyLog.filter(m => m.id !== id);
    saveState(state);

    if (meal) deleteMealDB(meal.name, meal.date, meal.calories);
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
        // Note: DB update not implemented for simplicity, recommend Delete+Add
    }
};

export const addMeasurement = (data) => {
    const state = getState();
    const { weight, neck, waist, hip } = data;
    const profile = state.profile;
    const height = profile.height || 175;

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
    addMeasurementDB(newEntry);

    return newEntry;
};

// ... Read-Only Getters ...
export const getDailyStats = () => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    const todaysMeals = state.dailyLog.filter(m => m.date === today);

    return todaysMeals.reduce((acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.macros.protein || 0;
        acc.carbs += meal.macros.carbs || 0;
        acc.fat += meal.macros.fat || 0;
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

export const toggleHabit = (habitId) => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    if (!state.habitLog) state.habitLog = {};
    if (!state.habitLog[today]) state.habitLog[today] = [];

    const index = state.habitLog[today].indexOf(habitId);
    if (index > -1) state.habitLog[today].splice(index, 1);
    else state.habitLog[today].push(habitId);

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
