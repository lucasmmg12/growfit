import { getState, saveState } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderProfile = () => {
    const state = getState();
    const { profile } = state;
    const workouts = state.workouts || [];

    const totalCalsBurned = workouts.reduce((s, w) => s + (w.calories || 0), 0);

    const badges = [
        { id: 'streak', label: 'Guerrero Diario', desc: 'Registros constantes', icon: 'local_fire_department', unlocked: (state.dailyLog || []).length >= 5 },
        { id: 'burn', label: 'Club 1000 kcal', desc: '+1000 kcal quemadas', icon: 'bolt', unlocked: totalCalsBurned >= 1000 },
        { id: 'fasting', label: 'Master del Ayuno', desc: 'Protocolo completado', icon: 'timer', unlocked: !!state.fasting?.lastFinishedTime },
        { id: 'strength', label: 'Sobrecarga Progresiva', desc: 'Sesión de fuerza registrada', icon: 'fitness_center', unlocked: (state.gymSessions || []).length > 0 }
    ];

    return `
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('profile')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Ajustes y Perfil')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-3xl mx-auto flex flex-col gap-6">

                    <!-- Profile Header Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-white via-emerald-50/40 to-white border-emerald-200">
                        <div class="flex items-center gap-4">
                            <img src="/lucas.jpeg" class="size-16 rounded-2xl border-2 border-primary object-cover shadow-emerald-sm">
                            <div>
                                <h2 class="text-2xl font-display font-black text-text-emerald uppercase tracking-tight">${profile.name || 'Mi Perfil'}</h2>
                                <p class="text-xs text-text-muted">Nivel ${profile.level || 1} · ${profile.xp || 0} XP acumulados</p>
                            </div>
                        </div>
                    </div>

                    <!-- Macro & Calorie Targets Form -->
                    <div class="white-card p-6">
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase mb-4 pb-2 border-b border-border-soft">
                            Objetivos Nutricionales
                        </h3>

                        <div class="flex flex-col gap-4">
                            <div>
                                <label class="text-xs font-bold text-text-muted uppercase">Meta Calórica Diaria (kcal)</label>
                                <input id="profile-cal-goal" type="number" value="${profile.calorieGoal || 2000}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-mono font-bold text-text-emerald outline-none focus:border-primary mt-1">
                            </div>

                            <div class="grid grid-cols-3 gap-3">
                                <div>
                                    <label class="text-[10px] font-bold text-emerald-700 uppercase">Proteína (g)</label>
                                    <input id="profile-p-goal" type="number" value="${profile.proteinGoal || 150}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-primary mt-1">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-blue-700 uppercase">Carbos (g)</label>
                                    <input id="profile-c-goal" type="number" value="${profile.carbsGoal || 200}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-primary mt-1">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-amber-700 uppercase">Grasas (g)</label>
                                    <input id="profile-f-goal" type="number" value="${profile.fatGoal || 65}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-primary mt-1">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Personal Metrics & Fasting Protocol -->
                    <div class="white-card p-6">
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase mb-4 pb-2 border-b border-border-soft">
                            Datos Personales & Ayuno
                        </h3>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-text-muted uppercase">Nombre</label>
                                <input id="profile-name" type="text" value="${profile.name || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-text-primary outline-none focus:border-primary mt-1">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-text-muted uppercase">Altura (cm)</label>
                                <input id="profile-height" type="number" value="${profile.height || 175}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary mt-1">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-text-muted uppercase">Edad</label>
                                <input id="profile-age" type="number" value="${profile.age || 30}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary mt-1">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-text-muted uppercase">Protocolo de Ayuno Predeterminado</label>
                                <select id="profile-fasting-protocol" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary mt-1">
                                    <option value="16:8" ${(state.fasting?.protocol === '16:8') ? 'selected' : ''}>16:8 (Clásico - 16h ayuno)</option>
                                    <option value="18:6" ${(state.fasting?.protocol === '18:6') ? 'selected' : ''}>18:6 (Intermedio - 18h ayuno)</option>
                                    <option value="20:4" ${(state.fasting?.protocol === '20:4') ? 'selected' : ''}>20:4 (Warrior - 20h ayuno)</option>
                                    <option value="OMAD" ${(state.fasting?.protocol === 'OMAD') ? 'selected' : ''}>OMAD (1 comida al día)</option>
                                </select>
                            </div>
                        </div>

                        <button id="save-profile-btn" class="w-full btn-emerald py-3 text-xs font-bold mt-5 shadow-emerald-sm">
                            Guardar Ajustes
                        </button>
                    </div>

                    <!-- Achievements & Badges Grid -->
                    <div class="white-card p-6">
                        <h3 class="text-lg font-display font-black text-text-emerald uppercase mb-4 pb-2 border-b border-border-soft">
                            Logros & Medallas
                        </h3>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            ${badges.map(b => `
                                <div class="p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 ${
                                    b.unlocked ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-50'
                                }">
                                    <div class="size-11 rounded-full ${b.unlocked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} flex items-center justify-center shadow-xs">
                                        <span class="material-symbols-outlined text-xl">${b.icon}</span>
                                    </div>
                                    <h5 class="text-xs font-bold text-text-primary mt-1">${b.label}</h5>
                                    <p class="text-[10px] text-text-muted">${b.desc}</p>
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
        state.profile.calorieGoal = parseInt(document.getElementById('profile-cal-goal').value) || 2000;
        state.profile.proteinGoal = parseInt(document.getElementById('profile-p-goal').value) || 150;
        state.profile.carbsGoal = parseInt(document.getElementById('profile-c-goal').value) || 200;
        state.profile.fatGoal = parseInt(document.getElementById('profile-f-goal').value) || 65;
        state.profile.height = parseInt(document.getElementById('profile-height').value) || 175;
        state.profile.age = parseInt(document.getElementById('profile-age').value) || 30;

        const protocol = document.getElementById('profile-fasting-protocol').value;
        const targetHours = protocol === 'OMAD' ? 23 : parseInt(protocol.split(':')[0]) || 16;
        state.fasting.protocol = protocol;
        state.fasting.targetHours = targetHours;

        saveState(state);
        window.showAlert?.('Ajustes Guardados', 'Tus metas calóricas y protocolo de ayuno se actualizaron.', 'success');
        window.router.navigate('profile');
    });
};
