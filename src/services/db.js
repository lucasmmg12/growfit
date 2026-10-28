import { supabase } from '../supabase-client';

let currentCachedUserId = null;

export const getCurrentUserId = async () => {
    try {
        const sessionRaw = localStorage.getItem('growfit_active_session');
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            if (session) {
                if (session.username?.toLowerCase() === 'lmarinero' || session.userId === 'lucas-admin-v1') {
                    currentCachedUserId = 'lmarinero';
                    return 'lmarinero';
                }
                const uid = session.userId || (session.username ? `user-${session.username.toLowerCase()}` : null);
                if (uid) {
                    currentCachedUserId = uid;
                    return uid;
                }
            }
        }
    } catch (e) {
        console.warn("Error reading active session for user_id:", e);
    }

    const localId = localStorage.getItem('growfit_user_id');
    if (localId) {
        const normalized = localId === 'lucas-admin-v1' ? 'lmarinero' : localId;
        currentCachedUserId = normalized;
        return normalized;
    }

    if (currentCachedUserId) return currentCachedUserId;

    return 'lmarinero';
};

export const setLocalUserId = (userId) => {
    const normalized = userId === 'lucas-admin-v1' ? 'lmarinero' : userId;
    currentCachedUserId = normalized;
    if (normalized) {
        localStorage.setItem('growfit_user_id', normalized);
    } else {
        localStorage.removeItem('growfit_user_id');
    }
};

// --- LOAD ALL DATA MULTI-TENANT ---
export const loadFullState = async () => {
    try {
        const userId = await getCurrentUserId();
        const userIds = userId === 'lmarinero' ? ['lmarinero', 'lucas-admin-v1'] : [userId];
        console.log(`[GrowFit DB] Sincronizando datos en la nube para usuario: ${userId}`);

        // 1. Perfil y Estado Completo (growfit_profiles)
        const { data: profileData, error: pError } = await supabase
            .from('growfit_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (pError && pError.code !== 'PGRST116') console.warn("Error growfit_profiles:", pError);

        // 2. Comidas
        const { data: meals, error: mError } = await supabase
            .from('meals')
            .select('*')
            .in('user_id', userIds)
            .order('date', { ascending: false });

        if (mError) console.warn("Error meals:", mError);

        // 3. Mediciones
        const { data: measurements, error: measError } = await supabase
            .from('measurements')
            .select('*')
            .in('user_id', userIds)
            .order('date', { ascending: false });

        if (measError) console.warn("Error measurements:", measError);

        // 4. Entrenamientos
        const { data: workouts, error: wError } = await supabase
            .from('workouts')
            .select('*')
            .in('user_id', userIds)
            .order('date', { ascending: false });

        if (wError) console.warn("Error workouts:", wError);

        // 5. Tratamiento Obetide (GLP-1)
        const { data: obetide, error: oError } = await supabase
            .from('obetide_treatments')
            .select('*')
            .in('user_id', userIds)
            .order('date', { ascending: false });

        if (oError) console.warn("Error obetide_treatments:", oError);

        // 6. Mi Billetera: Categorías y Presupuestos
        const { data: categories, error: cError } = await supabase
            .from('expense_categories')
            .select('*')
            .in('user_id', userIds);

        if (cError) console.warn("Error expense_categories:", cError);

        // 7. Mi Billetera: Gastos
        const { data: expenses, error: expError } = await supabase
            .from('expenses')
            .select('*')
            .in('user_id', userIds)
            .order('date', { ascending: false });

        if (expError) console.warn("Error expenses:", expError);

        // 8. Planes de Alimentación IA
        const { data: mealPlans, error: mpError } = await supabase
            .from('ai_meal_plans')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: false });

        if (mpError) console.warn("Error ai_meal_plans:", mpError);

        const mappedMeals = (meals || []).map(m => ({
            id: m.id,
            date: m.date,
            name: m.name,
            calories: Number(m.calories || 0),
            category: m.category || m.time || m.meal_type || 'Almuerzo',
            time: m.time || m.category || m.meal_type || 'Almuerzo',
            meal_type: m.meal_type || m.category || 'Almuerzo',
            macros: m.macros || { protein: 0, carbs: 0, fat: 0 },
            photo_url: m.photo_url || null,
            ai_analysis: m.ai_analysis || null,
            icon: m.icon || 'restaurant',
            satiety_score: m.satiety_score ? Number(m.satiety_score) : null,
            sensations: Array.isArray(m.sensations) ? m.sensations : [],
            opinion: m.opinion || null
        }));

        const mappedMeasurements = (measurements || []).map(m => ({
            id: m.id,
            date: m.date,
            weight: Number(m.weight),
            neck: Number(m.neck || 0),
            waist: Number(m.waist || 0),
            hip: Number(m.hip || 0),
            bodyFat: Number(m.body_fat || 0),
            leanMass: Number(m.lean_mass || 0),
            fatMass: Number(m.fat_mass || 0),
            notes: m.notes || ''
        }));

        const mappedWorkouts = (workouts || []).map(w => ({
            id: w.id,
            date: w.date,
            name: w.type || w.name || 'Entrenamiento',
            type: w.type || 'strength',
            duration: Number(w.duration || 30),
            calories: Number(w.calories || 0),
            details: w.details || {}
        }));

        const mappedObetide = (obetide || []).map(o => ({
            id: o.id,
            date: o.date,
            dose_ml: Number(o.dose_ml || 0.25),
            injection_site: o.injection_site || 'abdomen_der',
            satiety_level: Number(o.satiety_level || 7),
            side_effects: Array.isArray(o.side_effects) ? o.side_effects : [],
            notes: o.notes || '',
            created_at: o.created_at
        }));

        const mappedCategories = (categories || []).map(c => ({
            id: c.slug || c.id,
            db_id: c.id,
            name: c.name,
            icon: c.icon || '💰',
            color: c.color || '#3b82f6',
            monthly_budget: Number(c.monthly_budget || 0),
            items: Array.isArray(c.items) ? c.items : []
        }));

        const mappedExpenses = (expenses || []).map(e => ({
            id: e.id,
            name: e.name || e.description || e.category_name || 'Gasto',
            description: e.description || e.name || '',
            amount: Number(e.amount || 0),
            category_id: e.category_key || e.category_id || null,
            category_name: e.category_name || 'General',
            date: e.date ? String(e.date).substring(0, 10) : '',
            payment_method: e.payment_method || 'tarjeta_debito',
            is_recurring: Boolean(e.is_recurring),
            is_paid: e.is_paid !== false,
            created_at: e.created_at
        }));

        return {
            fullState: (profileData?.data && Object.keys(profileData.data).length > 0) ? profileData.data : null,
            updatedAt: profileData?.updated_at || null,
            profile: profileData?.data?.profile || (profileData ? {
                name: profileData.full_name || profileData.display_name,
                height: Number(profileData.height || 175),
                startingWeight: Number(profileData.starting_weight || 80),
                targetWeight: Number(profileData.target_weight || 70),
                calorieGoal: Number(profileData.daily_calorie_target || 2000),
                currency: profileData.currency || 'ARS'
            } : null),
            dailyLog: mappedMeals,
            measurements: mappedMeasurements,
            workouts: mappedWorkouts,
            obetideTreatments: mappedObetide,
            expenseCategories: mappedCategories,
            expenses: mappedExpenses,
            aiMealPlans: mealPlans || []
        };
    } catch (e) {
        console.error("Error loading DB (Offline or Missing Tables):", e);
        return null;
    }
};

// --- GRANULAR SAVES ---

// Perfil y Estado Completo en growfit_profiles
export const saveProfileDB = async (stateOrProfile) => {
    try {
        const userId = await getCurrentUserId();
        const profile = stateOrProfile?.profile || stateOrProfile || {};
        const { error } = await supabase
            .from('growfit_profiles')
            .upsert({
                user_id: userId,
                full_name: profile.name || '',
                display_name: profile.name || '',
                height: Number(profile.height) || 175,
                target_weight: Number(profile.targetWeight) || 70,
                starting_weight: Number(profile.startingWeight) || 75,
                daily_calorie_target: Number(profile.calorieGoal) || 2000,
                currency: profile.currency || 'ARS',
                data: stateOrProfile,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        if (error) console.error("Error saving profile to growfit_profiles:", error);
    } catch (err) {
        console.error("Exception saving profile to growfit_profiles:", err);
    }
};

// Comidas
export const addMealDB = async (meal) => {
    const userId = await getCurrentUserId();
    const categoryVal = meal.category || meal.time || meal.meal_type || 'Almuerzo';
    const row = {
        user_id: userId,
        date: meal.date,
        meal_type: categoryVal,
        category: categoryVal,
        name: meal.name,
        calories: Math.max(0, Math.round(Number(meal.calories) || 0)),
        macros: meal.macros || { protein: 0, carbs: 0, fat: 0 },
        photo_url: meal.photo_url || null,
        ai_analysis: meal.ai_analysis || null,
        icon: meal.icon || categoryVal || 'restaurant',
        time: meal.time || categoryVal,
        satiety_score: meal.satiety_score ? Number(meal.satiety_score) : null,
        sensations: Array.isArray(meal.sensations) ? meal.sensations : [],
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
    const categoryVal = meal.category || meal.time || meal.meal_type || 'Almuerzo';
    const row = {
        date: meal.date,
        meal_type: categoryVal,
        category: categoryVal,
        name: meal.name,
        calories: Math.max(0, Math.round(Number(meal.calories) || 0)),
        macros: meal.macros || { protein: 0, carbs: 0, fat: 0 },
        icon: meal.icon || categoryVal,
        time: meal.time || categoryVal,
        satiety_score: meal.satiety_score ? Number(meal.satiety_score) : null,
        sensations: Array.isArray(meal.sensations) ? meal.sensations : [],
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
        weight: Number(m.weight),
        neck: m.neck && Number(m.neck) > 0 ? Number(m.neck) : null,
        waist: m.waist && Number(m.waist) > 0 ? Number(m.waist) : null,
        hip: m.hip && Number(m.hip) > 0 ? Number(m.hip) : null,
        body_fat: m.bodyFat !== undefined && m.bodyFat !== null ? Number(m.bodyFat) : null,
        lean_mass: m.leanMass !== undefined && m.leanMass !== null ? Number(m.leanMass) : null,
        fat_mass: m.fatMass !== undefined && m.fatMass !== null ? Number(m.fatMass) : null,
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
        type: w.name || w.type || 'Entrenamiento',
        duration: Math.max(1, Math.round(Number(w.duration) || 30)),
        calories: Math.max(0, Math.round(Number(w.calories) || 0)),
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
    const rawSatiety = Number(item.satiety_level || item.satietyLevel || 7);
    const row = {
        user_id: userId,
        date: item.date,
        dose_ml: Number(item.dose_ml || item.dose || 0.25),
        injection_site: item.injection_site || item.injectionSite || 'abdomen_der',
        satiety_level: Math.min(10, Math.max(1, rawSatiety)),
        side_effects: Array.isArray(item.side_effects || item.sideEffects) ? (item.side_effects || item.sideEffects) : [],
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
    const isNumericId = typeof cat.id === 'number' || (/^\d+$/.test(String(cat.id || '')) && Number(cat.id) < 1000000000000);
    const slugVal = !isNumericId && cat.id ? String(cat.id) : (cat.slug || null);
    const row = {
        user_id: userId,
        slug: slugVal,
        name: cat.name,
        icon: cat.icon || '💰',
        color: cat.color || '#3b82f6',
        monthly_budget: Number(cat.monthly_budget || cat.monthlyBudget || 0),
        items: Array.isArray(cat.items) ? cat.items : []
    };

    if (cat.db_id && !isNaN(Number(cat.db_id))) {
        row.id = Number(cat.db_id);
    } else if (isNumericId) {
        row.id = Number(cat.id);
    } else if (slugVal) {
        const { data: existing } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('user_id', userId)
            .eq('slug', slugVal)
            .maybeSingle();
        if (existing?.id) {
            row.id = existing.id;
        }
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
    const userId = await getCurrentUserId();
    const isNumericId = typeof id === 'number' || (/^\d+$/.test(String(id || '')) && Number(id) < 1000000000000);
    if (isNumericId) {
        const { error } = await supabase.from('expense_categories').delete().eq('user_id', userId).eq('id', Number(id));
        if (error) console.error("Error deleting expense category by id:", error);
    } else {
        const { error } = await supabase.from('expense_categories').delete().eq('user_id', userId).eq('slug', String(id));
        if (error) console.error("Error deleting expense category by slug:", error);
    }
};

export const addExpenseDB = async (expense) => {
    const userId = await getCurrentUserId();
    const rawCatId = expense.category_id || expense.categoryId || null;
    const isNumericCatId = typeof rawCatId === 'number' || (/^\d+$/.test(String(rawCatId || '')) && Number(rawCatId) < 1000000000000);

    const row = {
        user_id: userId,
        category_id: isNumericCatId ? Number(rawCatId) : null,
        category_key: !isNumericCatId && rawCatId ? String(rawCatId) : null,
        category_name: expense.category_name || expense.categoryName || 'General',
        name: expense.name || expense.description || expense.category_name || 'Gasto',
        amount: Number(expense.amount || 0),
        date: expense.date,
        description: expense.description || expense.name || '',
        payment_method: expense.payment_method || expense.paymentMethod || 'tarjeta_debito',
        is_recurring: Boolean(expense.is_recurring),
        is_paid: expense.is_paid !== false
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

export const updateExpenseDB = async (id, patch) => {
    const isNumericId = typeof id === 'number' || (/^\d+$/.test(String(id || '')) && Number(id) < 1000000000000);
    if (!isNumericId) return;
    const { error } = await supabase
        .from('expenses')
        .update(patch)
        .eq('id', Number(id));
    if (error) console.error("Error updating expense:", error);
};

export const deleteExpenseDB = async (id) => {
    const isNumericId = typeof id === 'number' || (/^\d+$/.test(String(id || '')) && Number(id) < 1000000000000);
    if (!isNumericId) return;
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', Number(id));
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
