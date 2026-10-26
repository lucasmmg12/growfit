import { supabase } from '../supabase-client';

// Cache for current user id
let currentCachedUserId = null;

export const getCurrentUserId = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id) {
            currentCachedUserId = user.id;
            return user.id;
        }
    } catch (e) {
        console.warn("Could not fetch Supabase auth user:", e);
    }

    if (currentCachedUserId) return currentCachedUserId;

    // Check localStorage fallback for multi-tenant guest / offline
    const localId = localStorage.getItem('growfit_user_id');
    if (localId) {
        currentCachedUserId = localId;
        return localId;
    }

    // Default admin id fallback
    return 'lucas-admin-v1';
};

export const setLocalUserId = (userId) => {
    currentCachedUserId = userId;
    if (userId) {
        localStorage.setItem('growfit_user_id', userId);
    } else {
        localStorage.removeItem('growfit_user_id');
    }
};

// --- LOAD ALL DATA MULTI-TENANT ---
export const loadFullState = async () => {
    try {
        const userId = await getCurrentUserId();
        console.log(`[GrowFit DB] Sincronizando datos para usuario: ${userId}`);

        // 1. Perfil
        const { data: profileData, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (pError && pError.code !== 'PGRST116') console.warn("Error profile:", pError);

        // 2. Comidas
        const { data: meals, error: mError } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (mError) console.warn("Error meals:", mError);

        // 3. Mediciones
        const { data: measurements, error: measError } = await supabase
            .from('measurements')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (measError) console.warn("Error measurements:", measError);

        // 4. Entrenamientos
        const { data: workouts, error: wError } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (wError) console.warn("Error workouts:", wError);

        // 5. Tratamiento Obetide (GLP-1)
        const { data: obetide, error: oError } = await supabase
            .from('obetide_treatments')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (oError) console.warn("Error obetide_treatments:", oError);

        // 6. Mi Billetera: Categorías y Presupuestos
        const { data: categories, error: cError } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('user_id', userId);

        if (cError) console.warn("Error expense_categories:", cError);

        // 7. Mi Billetera: Gastos
        const { data: expenses, error: expError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (expError) console.warn("Error expenses:", expError);

        // 8. Planes de Alimentación IA
        const { data: mealPlans, error: mpError } = await supabase
            .from('ai_meal_plans')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (mpError) console.warn("Error ai_meal_plans:", mpError);

        return {
            profile: profileData?.data || (profileData ? {
                name: profileData.full_name,
                height: profileData.height,
                startingWeight: profileData.starting_weight,
                targetWeight: profileData.target_weight,
                calorieGoal: profileData.daily_calorie_target,
                currency: profileData.currency
            } : null),
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
            workouts: workouts || [],
            obetideTreatments: obetide || [],
            expenseCategories: categories || [],
            expenses: expenses || [],
            aiMealPlans: mealPlans || []
        };
    } catch (e) {
        console.error("Error loading DB (Offline or Missing Tables):", e);
        return null;
    }
};

// --- GRANULAR SAVES ---

// Perfil
export const saveProfileDB = async (stateOrProfile) => {
    const userId = await getCurrentUserId();
    const profile = stateOrProfile?.profile || stateOrProfile;
    const { error } = await supabase
        .from('profiles')
        .upsert({
            user_id: userId,
            full_name: profile.name || '',
            height: profile.height || 175,
            target_weight: profile.targetWeight || 70,
            starting_weight: profile.startingWeight || 75,
            daily_calorie_target: profile.calorieGoal || 2000,
            currency: profile.currency || 'ARS',
            data: stateOrProfile,
            updated_at: new Date().toISOString()
        });
    if (error) console.error("Error saving profile:", error);
};

// Comidas
export const addMealDB = async (meal) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        date: meal.date,
        meal_type: meal.category || meal.meal_type || 'almuerzo',
        name: meal.name,
        calories: meal.calories || 0,
        macros: meal.macros || { protein: 0, carbs: 0, fat: 0 },
        photo_url: meal.photo_url || null,
        ai_analysis: meal.ai_analysis || null,
        icon: meal.category || meal.icon || 'restaurant',
        time: meal.time || '',
        satiety_score: meal.satiety_score || null,
        sensations: meal.sensations || [],
        opinion: meal.opinion || null
    };
    const { data, error } = await supabase
        .from('meals')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error("Error adding meal:", error);
        return null;
    }
    return data;
};

export const updateMealDB = async (id, meal) => {
    const row = {
        date: meal.date,
        meal_type: meal.category || meal.meal_type || 'almuerzo',
        name: meal.name,
        calories: meal.calories,
        macros: meal.macros,
        icon: meal.category || meal.icon,
        time: meal.time,
        satiety_score: meal.satiety_score || null,
        sensations: meal.sensations || [],
        opinion: meal.opinion || null
    };
    const { error } = await supabase
        .from('meals')
        .update(row)
        .eq('id', id);

    if (error) console.error("Error updating meal:", error);
};

export const deleteMealByIdDB = async (id) => {
    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);
    if (error) console.error("Error deleting meal by ID:", error);
};

export const deleteMealByAttributesDB = async (name, date, calories) => {
    const userId = await getCurrentUserId();
    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('user_id', userId)
        .eq('date', date)
        .eq('name', name)
        .eq('calories', calories);
    if (error) console.error("Error deleting meal by attr:", error);
};

// Mediciones
export const addMeasurementDB = async (m) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        date: m.date,
        weight: m.weight,
        neck: m.neck,
        waist: m.waist,
        hip: m.hip,
        body_fat: m.bodyFat,
        lean_mass: m.leanMass,
        fat_mass: m.fatMass,
        notes: m.notes || ''
    };
    const { data, error } = await supabase.from('measurements').insert(row).select().single();
    if (error) {
        console.error("Error adding measurement:", error);
        return null;
    }
    return data;
};

// Entrenamientos
export const addWorkoutDB = async (w) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        date: w.date,
        type: w.name || w.type,
        duration: w.duration,
        calories: w.calories,
        details: w.details || {}
    };
    const { data, error } = await supabase.from('workouts').insert(row).select().single();
    if (error) {
        console.error("Error adding workout:", error);
        return null;
    }
    return data;
};

export const deleteWorkoutDB = async (id) => {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) console.error("Error deleting workout from DB:", error);
};


// --- TRATAMIENTO OBETIDE (GLP-1) ---
export const addObetideTreatmentDB = async (item) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        date: item.date,
        dose_ml: Number(item.dose_ml || item.dose || 0.25),
        injection_site: item.injection_site || item.injectionSite || 'abdomen_der',
        satiety_level: Number(item.satiety_level || item.satietyLevel || 7),
        side_effects: item.side_effects || item.sideEffects || [],
        notes: item.notes || ''
    };
    const { data, error } = await supabase
        .from('obetide_treatments')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error("Error adding Obetide treatment:", error);
        return null;
    }
    return data;
};

export const deleteObetideTreatmentDB = async (id) => {
    const { error } = await supabase
        .from('obetide_treatments')
        .delete()
        .eq('id', id);
    if (error) console.error("Error deleting Obetide treatment:", error);
};

// --- MI BILLETERA: CATEGORÍAS & GASTOS ---
export const saveExpenseCategoryDB = async (cat) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        name: cat.name,
        icon: cat.icon || '💰',
        color: cat.color || '#3b82f6',
        monthly_budget: Number(cat.monthly_budget || cat.monthlyBudget || 0)
    };

    if (cat.id && !String(cat.id).startsWith('temp-')) {
        row.id = cat.id;
    }

    const { data, error } = await supabase
        .from('expense_categories')
        .upsert(row)
        .select()
        .single();

    if (error) {
        console.error("Error saving expense category:", error);
        return null;
    }
    return data;
};

export const deleteExpenseCategoryDB = async (id) => {
    const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
    if (error) console.error("Error deleting expense category:", error);
};

export const addExpenseDB = async (expense) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        category_id: expense.category_id || expense.categoryId || null,
        category_name: expense.category_name || expense.categoryName || 'General',
        amount: Number(expense.amount),
        date: expense.date,
        description: expense.description || '',
        payment_method: expense.payment_method || expense.paymentMethod || 'tarjeta_debito'
    };
    const { data, error } = await supabase
        .from('expenses')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error("Error adding expense:", error);
        return null;
    }
    return data;
};

export const deleteExpenseDB = async (id) => {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
    if (error) console.error("Error deleting expense:", error);
};

// --- PLANES DE ALIMENTACIÓN IA ---
export const saveAiMealPlanDB = async (plan) => {
    const userId = await getCurrentUserId();
    const row = {
        user_id: userId,
        target_calories: plan.target_calories || plan.targetCalories || 1800,
        plan_data: plan.plan_data || plan.planData || plan
    };
    const { data, error } = await supabase
        .from('ai_meal_plans')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error("Error saving AI meal plan:", error);
        return null;
    }
    return data;
};
