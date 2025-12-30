import { supabase } from '../supabase-client';

const USER_ID = 'lucas-admin-v1';

// --- LOAD ALL DATA ---
export const loadFullState = async () => {
    try {
        console.log("Sincronizando tablas...");

        // 1. Perfil
        const { data: profileData, error: pError } = await supabase
            .from('profiles')
            .select('data')
            .eq('user_id', USER_ID)
            .single();

        if (pError && pError.code !== 'PGRST116') throw pError;

        // 2. Comidas
        const { data: meals, error: mError } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', USER_ID);

        if (mError) throw mError;

        // 3. Mediciones
        const { data: measurements, error: measError } = await supabase
            .from('measurements')
            .select('*')
            .eq('user_id', USER_ID);

        if (measError) throw measError;

        // 4. Entrenamientos
        const { data: workouts, error: wError } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', USER_ID);

        if (wError) throw wError;

        return {
            profile: profileData?.data || null,
            dailyLog: meals || [],
            measurements: (measurements || []).map(m => ({
                id: m.id,
                date: m.date,
                weight: Number(m.weight),
                neck: Number(m.neck),
                waist: Number(m.waist),
                hip: Number(m.hip),
                bodyFat: Number(m.body_fat),
                leanMass: Number(m.lean_mass),
                fatMass: Number(m.fat_mass)
            })),
            workouts: workouts || []
        };
    } catch (e) {
        console.error("Error loading DB (Offline or Missing Tables):", e);
        return null; // Return null so initializeState keeps LocalStorage
    }
};

// --- GRANULAR SAVES ---

// Perfil (JSON completo)
export const saveProfileDB = async (profile) => {
    const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: USER_ID, data: profile });
    if (error) console.error("Error saving profile:", error);
};

// Comidas
export const addMealDB = async (meal) => {
    const row = {
        user_id: USER_ID,
        date: meal.date,
        name: meal.name,
        calories: meal.calories,
        macros: meal.macros,
        icon: meal.category // Mapping category to icon column from schema
    };
    const { error } = await supabase.from('meals').insert(row);
    if (error) {
        console.error("Error adding meal:", error);
    }
};

export const deleteMealDB = async (name, date, calories) => {
    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('user_id', USER_ID)
        .eq('date', date)
        .eq('name', name)
        .eq('calories', calories);

    if (error) console.error("Error deleting meal:", error);
};

// Mediciones
export const addMeasurementDB = async (m) => {
    const row = {
        user_id: USER_ID,
        date: m.date,
        weight: m.weight,
        neck: m.neck,
        waist: m.waist,
        hip: m.hip,
        body_fat: m.bodyFat,
        lean_mass: m.leanMass,
        fat_mass: m.fatMass
    };
    const { error } = await supabase.from('measurements').insert(row);
    if (error) {
        console.error("Error adding measurement:", error);
    }
};

// Entrenamientos
export const addWorkoutDB = async (w) => {
    const row = {
        user_id: USER_ID,
        date: w.date,
        type: w.name || w.type, // Map name/type to type column
        duration: w.duration,
        calories: w.calories,
        details: w.details || {}
    };
    const { error } = await supabase.from('workouts').insert(row);
    if (error) {
        console.error("Error adding workout:", error);
    }
};
