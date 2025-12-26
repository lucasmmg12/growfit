const STORAGE_KEY = 'growfit_data';

const defaultState = {
    profile: {
        name: 'User',
        age: 30, // Default age
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 200,
        fatGoal: 65,
        height: 175,
        gender: 'male',
        checkinFrequency: 15,
        startingWeight: 70,
        health: {
            conditions: '',
            medications: '',
            metabolism: 'normal' // slow, normal, fast
        },
        aiSummary: null // The AI analysis of their profile
    },
    dailyLog: [],
    days: {},
    measurements: [
        {
            id: 1, date: "2025-11-26", weight: 75, neck: 40, waist: 90, hip: 100, bodyFat: 22.0, fatMass: 16.5, leanMass: 58.5
        },
        {
            id: 2, date: "2025-12-10", weight: 73, neck: 39, waist: 88, hip: 99, bodyFat: 20.5, fatMass: 15.0, leanMass: 58.0
        },
        {
            id: 3, date: new Date().toISOString().split('T')[0], weight: 71.5, neck: 39, waist: 86, hip: 98, bodyFat: 18.5, fatMass: 13.2, leanMass: 58.3
        }
    ],
    workouts: [], // New: Store workout history
    habits: [
        { id: 'h2', name: 'Sin Azúcar', icon: 'block' },
        { id: 'h3', name: 'Caminar 30 min', icon: 'directions_walk' },
        { id: 'h4', name: 'Leer 10 min', icon: 'menu_book' }
    ],
    habitLog: {}, // Format: { "YYYY-MM-DD": ['h1', 'h2'] }
    dailyTip: { date: null, content: null },
    currentView: 'dashboard'
};



export const addWorkout = (data) => {
    // data: { type: 'running'|'walking'|'home_routine', distance: number, duration: number, date: string, calories?: number }
    const state = getState();
    const weight = state.measurements.length > 0 ? state.measurements[state.measurements.length - 1].weight : (state.profile.startingWeight || 70);

    let caloriesBurned = data.calories;

    if (!caloriesBurned) {
        // MET values defaults
        const METS = {
            'running': 9.0,
            'walking': 3.8
        };

        let met = METS[data.type] || 5; // Default moderate activity

        // Dynamic MET based on speed if distance provided
        if (data.distance && data.duration) {
            const speed = data.distance / (data.duration / 60); // km/h
            if (data.type === 'running') {
                if (speed < 8) met = 7;      // Jogging
                else if (speed < 10) met = 9; // Run
                else if (speed < 12) met = 11; // Fast Run
                else met = 12.5;              // Sprint
            } else if (data.type === 'walking') {
                if (speed < 4) met = 3;       // Slow
                else if (speed < 6) met = 4; // Moderate
                else met = 6;                // Very Brisk
            }
        }

        const durationHours = data.duration / 60;
        caloriesBurned = Math.round(met * weight * durationHours);
    }

    const newWorkout = {
        id: Date.now(),
        date: data.date || new Date().toISOString().split('T')[0],
        ...data,
        calories: caloriesBurned
    };

    if (!state.workouts) state.workouts = [];
    state.workouts.push(newWorkout);
    saveState(state);
    return newWorkout;
};

export const getDailyBurn = (dateStr) => {
    const state = getState();
    const bmr = getBMR();
    const date = dateStr || new Date().toISOString().split('T')[0];

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

export const getState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Merge default state with stored state to ensure new schema fields exist
    const state = stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState;

    // Migration: Remove Ayuno if present (User requested removal)
    if (state.habits) {
        state.habits = state.habits.filter(h => !h.name.includes('Ayuno'));
    }

    return state;
};

export const saveState = (newState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    // Dispatch event for reactivity
    window.dispatchEvent(new CustomEvent('state-changed', { detail: newState }));
};

export const updateDayStat = (date, key, value) => {
    const state = getState();
    if (!state.days) state.days = {};
    if (!state.days[date]) state.days[date] = {};

    state.days[date][key] = value;
    saveState(state);
};

export const getBMR = () => {
    const state = getState();
    const p = state.profile;
    // Use latest weight if available, else starting weight
    const lastM = state.measurements && state.measurements.length > 0
        ? state.measurements[state.measurements.length - 1]
        : null;
    const weight = lastM ? lastM.weight : (p.startingWeight || 70);
    const height = p.height || 175;
    const age = p.age || 30;

    // Mifflin-St Jeor
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (p.gender === 'male' ? 5 : -161);

    // Medical & Metabolic Adaptations
    const metabolism = p.health?.metabolism || 'normal';
    const conditions = p.health?.conditions || '';

    // Base Multipliers
    let multiplier = 1.0;
    if (metabolism === 'slow') multiplier = 0.9;
    if (metabolism === 'fast') multiplier = 1.1;

    // Specific Condition Logic (Professional Context)
    // Hypothyroidism: Even with meds, often slightly slower.
    if (conditions.toLowerCase().includes('hipotiroidismo') && metabolism !== 'fast') {
        multiplier *= 0.95;
    }

    return Math.round(bmr * multiplier);
};

export const setDailyTip = (content) => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    state.dailyTip = { date: today, content };
    saveState(state);
};

export const addMeal = (meal) => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    // Use provided date or default to today
    const mealDate = meal.date || today;
    state.dailyLog.push({ ...meal, date: mealDate, id: Date.now() });
    saveState(state);
    saveState(state);
};

export const deleteMeal = (id) => {
    const state = getState();
    state.dailyLog = state.dailyLog.filter(m => m.id !== id);
    saveState(state);
};

export const updateMeal = (id, updates) => {
    const state = getState();
    const index = state.dailyLog.findIndex(m => m.id === id);
    if (index !== -1) {
        state.dailyLog[index] = { ...state.dailyLog[index], ...updates };
        saveState(state);
    }
};

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

// --- Measurement Logic ---

export const addMeasurement = (data) => {
    // data: { weight (kg), neck (cm), waist (cm), hip (cm, optional), date (YYYY-MM-DD) }
    const state = getState();
    const profile = state.profile;
    const height = profile.height || 175; // Fallback height
    const gender = profile.gender || 'male';

    const { weight, neck, waist, hip } = data;

    // US Navy Method Formula
    // Log10 is Math.log10
    let bodyFat = 0;

    if (gender === 'male') {
        // 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
        const logWaistNeck = Math.log10(waist - neck);
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight)) - 450;
    } else {
        // Female
        // 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
        const logWaistHipNeck = Math.log10(waist + hip - neck);
        const logHeight = Math.log10(height);
        bodyFat = (495 / (1.29579 - 0.35004 * logWaistHipNeck + 0.22100 * logHeight)) - 450;
    }

    // Clamp value
    bodyFat = Math.max(2, Math.min(60, bodyFat));

    const fatMass = (weight * bodyFat) / 100;
    const leanMass = weight - fatMass;

    const newEntry = {
        id: Date.now(),
        date: data.date || new Date().toISOString().split('T')[0],
        weight,
        neck,
        waist,
        hip: hip || null,
        bodyFat: Number(bodyFat.toFixed(1)),
        fatMass: Number(fatMass.toFixed(1)),
        leanMass: Number(leanMass.toFixed(1))
    };

    if (!state.measurements) state.measurements = [];
    state.measurements.push(newEntry);

    // Update profile weight to be in sync? Optional, but good practice
    // state.profile.startingWeight = ... 

    saveState(state);
    return newEntry;
};

export const getLatestMeasurement = () => {
    const state = getState();
    if (!state.measurements || state.measurements.length === 0) return null;
    // Sort by date desc
    return [...state.measurements].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};

export const checkMeasurementStatus = () => {
    const state = getState();
    const lastStr = getLatestMeasurement()?.date;
    if (!lastStr) return { isDue: true, daysSince: null }; // Never measured

    const lastDate = new Date(lastStr);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const freq = state.profile.checkinFrequency || 15;

    return {
        isDue: diffDays >= freq,
        daysSince: diffDays,
        daysRem: freq - diffDays
    };
};

export const toggleHabit = (habitId) => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];

    if (!state.habitLog) state.habitLog = {};
    if (!state.habitLog[today]) state.habitLog[today] = [];

    const index = state.habitLog[today].indexOf(habitId);
    if (index > -1) {
        state.habitLog[today].splice(index, 1);
    } else {
        state.habitLog[today].push(habitId);
    }
    saveState(state);
};

export const setDailyHabits = (newHabits) => {
    const state = getState();
    state.habits = newHabits;
    state.lastHabitGenerationDate = new Date().toISOString().split('T')[0];
    saveState(state);
};
