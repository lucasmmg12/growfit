import { getState, saveState } from '../state';
import { supabase } from '../supabase-client';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderProfile = () => {
    const state = getState();
    const { profile } = state;
    const workouts = state.workouts || [];
    const totalCalsBurned = workouts.reduce((s, w) => s + (w.calories || 0), 0);

    const badges = [
        { id: 'streak', label: 'Guerrero Diario', desc: 'Registros constantes', icon: 'local_fire_department', unlocked: (state.dailyLog || []).length >= 5 },
        { id: 'obetide', label: 'Protocolo GLP-1', desc: 'Tratamiento Obetide activo', icon: 'vaccines', unlocked: (state.obetideTreatments || []).length > 0 },
        { id: 'wallet', label: 'Finanzas Claras', desc: 'Presupuestos bajo control', icon: 'account_balance_wallet', unlocked: (state.expenses || []).length > 0 },
        { id: 'burn', label: 'Club 1000 kcal', desc: '+1000 kcal quemadas', icon: 'bolt', unlocked: totalCalsBurned >= 1000 }
    ];

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('profile')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Ajustes y Perfil')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-3xl mx-auto flex flex-col gap-6">

                    <!-- Profile Header Card -->
                    <div class="white-card p-6 border border-emerald-500/30 shadow-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="size-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-emerald-sm">
                                    ${(profile.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 class="text-2xl font-display font-black text-white uppercase tracking-tight">${profile.name || 'Mi Perfil'}</h2>
                                    <p class="text-xs text-slate-400">Nivel ${profile.level || 1} · ${profile.xp || 0} XP acumulados</p>
                                </div>
                            </div>

                            <button id="logout-btn" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
                                <span class="material-symbols-outlined text-base">logout</span>
                                <span class="hidden sm:inline">Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>

                    <!-- Medical & Treatment Goals (Obetide Focus) -->
                    <div class="white-card p-6 border-l-4 border-l-emerald-500 border border-slate-700/60 shadow-xl">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-symbols-outlined text-emerald-400">medical_services</span>
                            <h3 class="text-base font-display font-black text-white uppercase">
                                Tratamiento Obetide & Descenso de Peso
                            </h3>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Peso Inicial (kg)</label>
                                <input id="profile-starting-weight" type="number" step="0.1" value="${profile.startingWeight || 75}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-emerald-400 uppercase">Peso Meta (kg)</label>
                                <input id="profile-target-weight" type="number" step="0.1" value="${profile.targetWeight || 70}" class="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-blue-400 uppercase">Moneda Presupuesto</label>
                                <select id="profile-currency" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 mt-1">
                                    <option value="ARS" ${(profile.currency === 'ARS' || !profile.currency) ? 'selected' : ''}>ARS ($ Pesos)</option>
                                    <option value="USD" ${(profile.currency === 'USD') ? 'selected' : ''}>USD ($ Dólares)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Macro & Calorie Targets Form -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <h3 class="text-base font-display font-black text-white uppercase mb-4 pb-2 border-b border-slate-700/60">
                            Objetivos Nutricionales Diarios
                        </h3>

                        <div class="flex flex-col gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase">Meta Calórica Diaria (kcal)</label>
                                <input id="profile-cal-goal" type="number" value="${profile.calorieGoal || 2000}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500 mt-1">
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label class="text-[10px] font-bold text-emerald-400 uppercase">Proteína (g)</label>
                                    <input id="profile-p-goal" type="number" value="${profile.proteinGoal || 150}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-blue-400 uppercase">Carbos (g)</label>
                                    <input id="profile-c-goal" type="number" value="${profile.carbsGoal || 200}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-amber-400 uppercase">Grasas (g)</label>
                                    <input id="profile-f-goal" type="number" value="${profile.fatGoal || 65}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-cyan-400 uppercase">Sodio Máx (mg)</label>
                                    <input id="profile-sodium-goal" type="number" value="${profile.sodiumGoal || 2000}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500 mt-1">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Personal Metrics -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <h3 class="text-base font-display font-black text-white uppercase mb-4 pb-2 border-b border-slate-700/60">
                            Datos Personales
                        </h3>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase">Nombre</label>
                                <input id="profile-name" type="text" value="${profile.name || ''}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 mt-1">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase">Altura (cm)</label>
                                <input id="profile-height" type="number" value="${profile.height || 175}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 mt-1">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase">Edad</label>
                                <input id="profile-age" type="number" value="${profile.age || 30}" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 mt-1">
                            </div>
                            
                        </div>

                        <button id="save-profile-btn" class="w-full btn-emerald py-3 text-xs font-bold mt-5 shadow-emerald-sm">
                            Guardar Ajustes
                        </button>
                    </div>

                    <!-- Achievements & Badges Grid -->
                    <div class="white-card p-6 border border-slate-700/60 shadow-xl">
                        <h3 class="text-base font-display font-black text-white uppercase mb-4 pb-2 border-b border-slate-700/60">
                            Logros & Progreso
                        </h3>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            ${badges.map(b => `
                                <div class="p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 ${
                                    b.unlocked ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-slate-900/60 border-slate-700/60 text-slate-400 opacity-60'
                                }">
                                    <div class="size-11 rounded-full ${b.unlocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'} flex items-center justify-center shadow-xs">
                                        <span class="material-symbols-outlined text-xl">${b.icon}</span>
                                    </div>
                                    <h5 class="text-xs font-bold text-white mt-1">${b.label}</h5>
                                    <p class="text-[10px] text-slate-400">${b.desc}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('profile')}
        </main>
    </div>
    `;
};

export const attachProfileEvents = () => {
    document.getElementById('save-profile-btn')?.addEventListener('click', () => {
        const state = getState();
        state.profile.name = document.getElementById('profile-name').value;
        state.profile.startingWeight = Number(document.getElementById('profile-starting-weight').value) || 75;
        state.profile.targetWeight = Number(document.getElementById('profile-target-weight').value) || 70;
        state.profile.currency = document.getElementById('profile-currency').value || 'ARS';
        state.profile.calorieGoal = parseInt(document.getElementById('profile-cal-goal').value) || 2000;
        state.profile.proteinGoal = parseInt(document.getElementById('profile-p-goal').value) || 150;
        state.profile.carbsGoal = parseInt(document.getElementById('profile-c-goal').value) || 200;
        state.profile.fatGoal = parseInt(document.getElementById('profile-f-goal').value) || 65;
        state.profile.sodiumGoal = parseInt(document.getElementById('profile-sodium-goal')?.value) || 2000;
        state.profile.height = parseInt(document.getElementById('profile-height').value) || 175;
        state.profile.age = parseInt(document.getElementById('profile-age').value) || 30;

        saveState(state);
        window.showAlert?.('Ajustes Guardados', 'Tu perfil y metas se actualizaron correctamente.', 'success');
        window.router.navigate('profile');
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        window.handleGlobalLogout?.();
    });
};
