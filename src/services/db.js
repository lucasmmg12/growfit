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
            measurements: measurements || [],
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
    // Adapter: Frontend 'meal' object -> DB columns
    // Frontend uses 'id' (timestamp), we can ignore it or let DB generate
    // But for sync, let's just insert.
    const row = {
        user_id: USER_ID,
        date: meal.date,
        name: meal.name,
        calories: meal.calories,
        macros: meal.macros,
        icon: meal.icon || 'restaurant',
        time: meal.time || null
    };
    const { error } = await supabase.from('meals').insert(row);
    if (error) console.error("Error adding meal:", error);
};

export const deleteMealDB = async (name, date, calories) => {
    // Since we don't have the DB ID in frontend state (unless we reload),
    // we delete by matching fields. Ideally frontend should store DB ID.
    // For MVP, we delete purely by matching props (Risky but works for single user)
    // UPDATE: We should reload state after adding to get IDs. 
    // OR: We delete local and try to delete best match remotely.

    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('user_id', USER_ID)
        .eq('date', date)
        .eq('name', name)
        .eq('calories', calories); // Match specific meal

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
        fat_mass: m.fatMass,
        lean_mass: m.leanMass
    };
    const { error } = await supabase.from('measurements').insert(row);
    if (error) console.error("Error adding measurement:", error);
};

// Entrenamientos
export const addWorkoutDB = async (w) => {
    const row = {
        user_id: USER_ID,
        date: w.date,
        type: w.type,
        duration: w.duration,
        calories: w.calories,
        details: w
    };
    const { error } = await supabase.from('workouts').insert(row);
    if (error) console.error("Error adding workout:", error);
};
