import { setLocalUserId } from './db';
import { supabase } from '../supabase-client';

const USERS_DIR_KEY = 'growfit_users_directory';
const SESSION_KEY = 'growfit_active_session';
const LEGACY_STORAGE_KEY = 'growfit_state_v1';

// Seed default master account (lmarinero / 123456)
const seedDefaultUsers = () => {
    let users = [];
    try {
        const raw = localStorage.getItem(USERS_DIR_KEY);
        if (raw) users = JSON.parse(raw);
    } catch (e) {
        users = [];
    }

    if (!Array.isArray(users) || users.length === 0) {
        users = [
            {
                username: 'lmarinero',
                password: '123456',
                displayName: 'Lucas Marinero',
                userId: 'lmarinero',
                role: 'owner',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));
    } else {
        const hasLmarinero = users.some(u => u.username.toLowerCase() === 'lmarinero');
        if (!hasLmarinero) {
            users.push({
                username: 'lmarinero',
                password: '123456',
                displayName: 'Lucas Marinero',
                userId: 'lmarinero',
                role: 'owner',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));
        }
    }

    // Migrate legacy growfit_state_v1 to growfit_state_user_lmarinero if not yet migrated
    const lmarineroStorageKey = 'growfit_state_user_lmarinero';
    if (!localStorage.getItem(lmarineroStorageKey)) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
            localStorage.setItem(lmarineroStorageKey, legacy);
        }
    }
};

// Run on module load
seedDefaultUsers();

export const getCurrentUser = () => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.username?.toLowerCase() === 'lmarinero') {
                parsed.userId = 'lmarinero';
            }
            return parsed;
        }
    } catch (e) {
        return null;
    }
    return null;
};

export const isLoggedIn = () => {
    return Boolean(getCurrentUser());
};

export const getUserStorageKey = (username) => {
    const clean = (username || '').trim().toLowerCase();
    return `growfit_state_user_${clean}`;
};

export const getActiveStorageKey = () => {
    const user = getCurrentUser();
    if (user && user.username) {
        return getUserStorageKey(user.username);
    }
    return getUserStorageKey('lmarinero');
};

export const login = async (username, password) => {
    seedDefaultUsers();
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
        return { success: false, error: 'Por favor ingresa usuario y contraseña.' };
    }

    let users = [];
    try {
        users = JSON.parse(localStorage.getItem(USERS_DIR_KEY) || '[]');
    } catch (e) {
        users = [];
    }

    let found = users.find(u => u.username.toLowerCase() === cleanUser);

    // Check cloud directory in growfit_profiles so users registered on another device can log in
    try {
        const targetUserId = cleanUser === 'lmarinero' ? 'lmarinero' : `user-${cleanUser}`;
        const { data: cloudUser } = await supabase
            .from('growfit_profiles')
            .select('user_id, username, password, display_name, full_name, role')
            .or(`user_id.eq.${targetUserId},username.ilike.${cleanUser}`)
            .maybeSingle();

        if (cloudUser) {
            const cloudEntry = {
                username: (cloudUser.username || cleanUser).toLowerCase(),
                password: cloudUser.password || (found ? found.password : cleanPass),
                displayName: cloudUser.display_name || cloudUser.full_name || cleanUser,
                userId: cloudUser.user_id || targetUserId,
                role: cloudUser.role || 'user',
                createdAt: new Date().toISOString()
            };
            if (!found) {
                found = cloudEntry;
                users.push(cloudEntry);
                localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));
            } else if (cloudUser.password) {
                found.password = cloudUser.password;
                found.displayName = cloudEntry.displayName;
                found.userId = cloudEntry.userId;
            }
        }
    } catch (e) {
        console.warn('[GrowFit Auth] Error consultando usuario en la nube:', e);
    }

    if (!found) {
        return { success: false, error: 'Usuario no registrado. Si eres nuevo, toca en "Crear Cuenta".' };
    }

    if (found.password !== cleanPass) {
        return { success: false, error: 'Contraseña incorrecta. Verifica tus datos.' };
    }

    const finalUserId = cleanUser === 'lmarinero' ? 'lmarinero' : (found.userId || `user-${cleanUser}`);

    // Ensure user exists in cloud directory for cross-device login
    try {
        await supabase.from('growfit_profiles').upsert({
            user_id: finalUserId,
            username: cleanUser,
            password: cleanPass,
            display_name: found.displayName || found.username,
            full_name: found.displayName || found.username,
            role: found.role || 'user',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
        console.warn('[GrowFit Auth] No se pudo sincronizar credencial en nube:', e);
    }

    const session = {
        username: found.username,
        displayName: found.displayName || found.username,
        userId: finalUserId,
        role: found.role || 'user',
        loginAt: new Date().toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLocalUserId(session.userId);

    if (cleanUser === 'lmarinero') {
        const targetKey = getUserStorageKey('lmarinero');
        if (!localStorage.getItem(targetKey)) {
            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacy) localStorage.setItem(targetKey, legacy);
        }
    }

    window.dispatchEvent(new CustomEvent('auth-changed', { detail: session }));

    return { success: true, user: session };
};

export const register = async ({ username, password, displayName }) => {
    seedDefaultUsers();
    const cleanUser = (username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanPass = (password || '').trim();
    const cleanName = (displayName || '').trim() || cleanUser;

    if (!cleanUser || cleanUser.length < 3) {
        return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres (letras, números o guiones).' };
    }

    if (!cleanPass || cleanPass.length < 4) {
        return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    let users = [];
    try {
        users = JSON.parse(localStorage.getItem(USERS_DIR_KEY) || '[]');
    } catch (e) {
        users = [];
    }

    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
        return { success: false, error: `El usuario "${cleanUser}" ya existe. Por favor elige otro o inicia sesión.` };
    }

    const newUserId = cleanUser === 'lmarinero' ? 'lmarinero' : `user-${cleanUser}`;

    // Check cloud directory as well
    try {
        const { data: existingCloud } = await supabase
            .from('growfit_profiles')
            .select('user_id')
            .or(`user_id.eq.${newUserId},username.ilike.${cleanUser}`)
            .maybeSingle();

        if (existingCloud) {
            return { success: false, error: `El usuario "${cleanUser}" ya está registrado en la nube. Inicia sesión con tu contraseña.` };
        }
    } catch (e) {
        console.warn('[GrowFit Auth] Aviso verificando usuario en nube:', e);
    }

    const newUser = {
        username: cleanUser,
        password: cleanPass,
        displayName: cleanName,
        userId: newUserId,
        role: 'user',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));

    const newUserKey = getUserStorageKey(cleanUser);
    const cleanInitialState = {
        profile: {
            name: cleanName,
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

    localStorage.setItem(newUserKey, JSON.stringify(cleanInitialState));

    // Persist user account and initial state to Supabase immediately
    try {
        await supabase.from('growfit_profiles').upsert({
            user_id: newUser.userId,
            username: newUser.username,
            password: cleanPass,
            display_name: newUser.displayName,
            full_name: newUser.displayName,
            role: newUser.role,
            height: 175,
            starting_weight: 80,
            target_weight: 72,
            daily_calorie_target: 2000,
            currency: 'ARS',
            data: cleanInitialState,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
        console.error('[GrowFit Auth] Error guardando nuevo usuario en Supabase:', e);
    }

    const session = {
        username: newUser.username,
        displayName: newUser.displayName,
        userId: newUser.userId,
        role: newUser.role,
        loginAt: new Date().toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLocalUserId(session.userId);

    window.dispatchEvent(new CustomEvent('auth-changed', { detail: session }));

    return { success: true, user: session };
};

export const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setLocalUserId(null);

    try {
        await supabase.auth.signOut();
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
    if (window.router) {
        window.router.navigate('auth');
    }
};
