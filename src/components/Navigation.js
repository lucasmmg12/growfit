import { getState } from '../state';
import { getCurrentUser } from '../services/auth';

export const renderSidebar = (activeRoute = 'dashboard') => {
    const state = getState();
    const { profile } = state;
    const currentUser = getCurrentUser();
    const level = profile.level || 1;
    const xp = profile.xp || 0;

    const navItems = [
        { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
        { id: 'obetide', label: 'Tratamiento Obetide', icon: 'vaccines', highlight: true },
        { id: 'tracker', label: 'Diario de Comidas', icon: 'restaurant' },
        { id: 'wallet', label: 'Mi Billetera', icon: 'account_balance_wallet', highlight: true },
        { id: 'mealplan', label: 'Plan Nutricional IA', icon: 'auto_stories' },
        { id: 'measurements', label: 'Progreso y Medidas', icon: 'straighten' },
        { id: 'workouts', label: 'Entrenamientos', icon: 'fitness_center' },
        { id: 'insights', label: 'Estadísticas & Métricas', icon: 'insights' },
        { id: 'profile', label: 'Ajustes y Cuenta', icon: 'settings' }
    ];

    return `
    <aside class="hidden lg:flex w-72 flex-col justify-between border-r border-slate-700/80 bg-[#131D2E] p-6 relative z-30 shadow-xl">
        <div class="flex flex-col gap-6">
            <!-- Brand & User Profile -->
            <div class="flex items-center gap-3.5 px-2">
                <div class="size-11 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-bold text-lg shadow-sm">
                    ${(profile.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="flex flex-col overflow-hidden">
                    <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-emerald-400 text-base">eco</span>
                        <h1 class="text-white font-display text-xl font-bold tracking-tight">GrowFit</h1>
                    </div>
                    <p class="text-slate-400 text-xs font-medium truncate">${profile.name || currentUser?.displayName || 'Mi Perfil'}</p>
                </div>
            </div>
            
            <!-- Navigation Links -->
            <nav class="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar pr-1">
                ${navItems.map(item => {
                    const isActive = activeRoute === item.id;
                    return `
                        <a onclick="window.router.navigate('${item.id}')" class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                            isActive 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-xs' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium'
                        }">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-xl ${isActive ? 'text-emerald-400' : 'text-slate-400'}">${item.icon}</span>
                                <p class="text-xs tracking-wide">${item.label}</p>
                            </div>
                            ${item.highlight ? `<span class="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>` : ''}
                        </a>
                    `;
                }).join('')}
            </nav>
        </div>

        <div class="flex flex-col gap-3">
            <!-- Level & XP Widget -->
            <div class="white-card p-4 bg-gradient-to-br from-[#1E293B] to-[#162032] border border-slate-700">
                <div class="flex justify-between items-center mb-2">
                    <span class="badge-emerald text-[10px]">Nivel ${level}</span>
                    <span class="text-xs font-mono font-bold text-emerald-400">${xp} XP</span>
                </div>
                <div class="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-emerald-sm" style="width: ${Math.min(100, (xp % 100))}%"></div>
                </div>
                <p class="text-[10px] text-slate-400 mt-1.5 text-center font-medium">${100 - (xp % 100)} XP para siguiente nivel</p>
            </div>

            <!-- User Session & Logout Widget -->
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                        <span class="size-2 rounded-full bg-emerald-400"></span>
                        <span class="text-[11px] font-mono font-bold text-white truncate">@${currentUser?.username || 'lmarinero'}</span>
                    </div>
                    <span class="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md uppercase">Sesión</span>
                </div>
                <button onclick="window.handleGlobalLogout()" class="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 transition-all text-xs font-bold cursor-pointer active:scale-95">
                    <span class="material-symbols-outlined text-sm">logout</span>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    </aside>
    `;
};

export const renderMobileHeader = (title = 'GrowFit') => {
    const state = getState();
    const currentUser = getCurrentUser();
    return `
    <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-700/80 sticky top-0 z-30 shadow-md">
        <div class="flex items-center gap-2.5" onclick="window.router.navigate('dashboard')">
            <div class="size-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <span class="material-symbols-outlined text-lg">eco</span>
            </div>
            <div>
                <h1 class="text-white font-display text-base font-bold tracking-tight leading-none">${title}</h1>
                <p class="text-[10px] text-slate-400 font-medium">@${currentUser?.username || 'lmarinero'} · ${state.profile.name || 'GrowFit'}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.openQuickActionsModal()" class="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-emerald-sm active:scale-95 transition-transform" title="Acción Rápida">
                <span class="material-symbols-outlined text-lg">add</span>
            </button>
            <button onclick="window.handleGlobalLogout()" class="size-8 rounded-full border border-rose-500/30 bg-rose-500/15 flex items-center justify-center text-rose-300 font-bold text-xs cursor-pointer active:scale-95" title="Cerrar Sesión">
                <span class="material-symbols-outlined text-sm">logout</span>
            </button>
        </div>
    </header>
    `;
};

export const renderBottomNav = (activeRoute = 'dashboard') => {
    return `
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav-light px-2 py-1.5 pb-safe border-t border-slate-700/80">
        <div class="flex items-center justify-around max-w-lg mx-auto">
            <!-- 1. Inicio -->
            <button onclick="window.router.navigate('dashboard')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">dashboard</span>
                <span class="text-[9px] tracking-tight">Inicio</span>
            </button>

            <!-- 2. Comidas -->
            <button onclick="window.router.navigate('tracker')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'tracker' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">restaurant</span>
                <span class="text-[9px] tracking-tight">Comidas</span>
            </button>

            <!-- 3. Center Quick Add Button -->
            <div class="-mt-5">
                <button onclick="window.openQuickActionsModal()" class="size-12 rounded-full btn-emerald flex items-center justify-center shadow-emerald-lg border-2 border-slate-800 active:scale-90 transition-transform">
                    <span class="material-symbols-outlined text-2xl font-black">add</span>
                </button>
            </div>

            <!-- 4. Obetide -->
            <button onclick="window.router.navigate('obetide')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'obetide' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">vaccines</span>
                <span class="text-[9px] tracking-tight">Obetide</span>
            </button>

            <!-- 5. Billetera -->
            <button onclick="window.router.navigate('wallet')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'wallet' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                <span class="text-[9px] tracking-tight">Billetera</span>
            </button>
        </div>
    </nav>
    `;
};
