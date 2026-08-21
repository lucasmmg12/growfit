import {
    loadFullState,
    saveProfileDB,
    addMealDB,
    deleteMealByIdDB,
    deleteMealByAttributesDB,
    addMeasurementDB,
    addWorkoutDB,
    deleteWorkoutDB,
    updateMealDB
} from './services/db';

const STORAGE_KEY = 'growfit_state_v1';

// Helper to get today's date in Argentina Timezone (Y-m-d)
export const getArgentinaDate = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
};

const defaultState = {
    profile: {
        name: 'Usuario',
        age: 30,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 200,
        fatGoal: 65,
        height: 175,
        gender: 'male',
        checkinFrequency: 15,
        startingWeight: 75,
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
    dailyLog: [],
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
    const stored = localStorage.getItem(STORAGE_KEY);
    const state = stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState;
    if (!state.fasting) {
        state.fasting = defaultState.fasting;
    }
    if (!state.gymSessions) {
        state.gymSessions = [];
    }
    return state;
};

// GLOBAL SAVE (Primarily for Profile & UI State)
export const saveState = (newState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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
            const cloudProfile = cloudData.profile || {};

            const newState = {
                ...defaultState,
                ...local,
                profile: {
                    ...defaultState.profile,
                    ...(cloudProfile.profile || cloudProfile),
                    ...(local.profile || {})
                },
                // Cloud DB is the authoritative source of truth
                dailyLog: (cloudData.dailyLog && cloudData.dailyLog.length > 0) ? cloudData.dailyLog : (local.dailyLog || []),
                measurements: (cloudData.measurements && cloudData.measurements.length > 0) ? cloudData.measurements : (local.measurements || []),
                workouts: (cloudData.workouts && cloudData.workouts.length > 0) ? cloudData.workouts : (local.workouts || [])
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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

    const finalMeal = { ...meal, date: mealDate, time: mealTime, id: tempId };

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
    const index = state.dailyLog.findIndex(m => m.id === id);
    if (index !== -1) {
        state.dailyLog[index] = { ...state.dailyLog[index], ...updates };
        saveState(state);

        if (id > 0 && id < 1000000000000) {
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
    await addMeasurementDB(newEntry);

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
