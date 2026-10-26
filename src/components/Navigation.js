import { getState } from '../state';

export const renderSidebar = (activeRoute = 'dashboard') => {
    const state = getState();
    const { profile } = state;
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
    <aside class="hidden lg:flex w-72 flex-col justify-between border-r border-border-soft bg-surface-white p-6 relative z-30 shadow-sm">
        <div class="flex flex-col gap-6">
            <!-- Brand & User Profile -->
            <div class="flex items-center gap-3.5 px-2">
                <div class="size-11 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 font-bold text-lg shadow-sm">
                    ${(profile.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="flex flex-col overflow-hidden">
                    <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-primary text-base">eco</span>
                        <h1 class="text-text-emerald font-display text-xl font-black uppercase tracking-tight">GrowFit</h1>
                    </div>
                    <p class="text-text-muted text-xs font-semibold truncate">${profile.name || 'Mi Perfil'}</p>
                </div>
            </div>
            
            <!-- Navigation Links -->
            <nav class="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar pr-1">
                ${navItems.map(item => {
                    const isActive = activeRoute === item.id;
                    return `
                        <a onclick="window.router.navigate('${item.id}')" class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                            isActive 
                                ? 'bg-primary-light text-text-emerald border border-border-emerald font-bold shadow-xs' 
                                : 'text-text-muted hover:text-text-emerald hover:bg-slate-50 font-medium'
                        }">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-slate-400'}">${item.icon}</span>
                                <p class="text-xs tracking-wide">${item.label}</p>
                            </div>
                            ${item.highlight ? `<span class="size-2 rounded-full bg-emerald-500"></span>` : ''}
                        </a>
                    `;
                }).join('')}
            </nav>
        </div>

        <!-- Level & XP Widget -->
        <div class="white-card p-4 bg-gradient-to-br from-primary-light to-white border border-border-emerald">
            <div class="flex justify-between items-center mb-2">
                <span class="badge-emerald text-[10px]">Nivel ${level}</span>
                <span class="text-xs font-mono font-bold text-text-emerald">${xp} XP</span>
            </div>
            <div class="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all duration-500 shadow-emerald-sm" style="width: ${Math.min(100, (xp % 100))}%"></div>
            </div>
            <p class="text-[10px] text-text-muted mt-1.5 text-center font-medium">${100 - (xp % 100)} XP para siguiente nivel</p>
        </div>
    </aside>
    `;
};

export const renderMobileHeader = (title = 'GrowFit') => {
    const state = getState();
    return `
    <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-border-soft sticky top-0 z-30 shadow-xs">
        <div class="flex items-center gap-2.5" onclick="window.router.navigate('dashboard')">
            <div class="size-8 rounded-xl bg-primary-light flex items-center justify-center text-primary border border-border-emerald">
                <span class="material-symbols-outlined text-lg">eco</span>
            </div>
            <div>
                <h1 class="text-text-emerald font-display text-base font-black uppercase tracking-tight leading-none">${title}</h1>
                <p class="text-[10px] text-text-muted font-bold">${state.profile.name || 'GrowFit'}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.openQuickActionsModal()" class="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-emerald-sm active:scale-95 transition-transform">
                <span class="material-symbols-outlined text-lg">add</span>
            </button>
            <button onclick="window.router.navigate('profile')" class="size-8 rounded-full border border-border-soft bg-slate-100 flex items-center justify-center text-text-emerald font-bold text-xs">
                ${(state.profile.name || 'U').charAt(0).toUpperCase()}
            </button>
        </div>
    </header>
    `;
};

export const renderBottomNav = (activeRoute = 'dashboard') => {
    return `
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav-light px-2 py-1.5 pb-safe border-t border-slate-200/80">
        <div class="flex items-center justify-around max-w-lg mx-auto">
            <!-- 1. Inicio -->
            <button onclick="window.router.navigate('dashboard')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'dashboard' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
            }">
                <span class="material-symbols-outlined text-2xl">dashboard</span>
                <span class="text-[9px] tracking-tight">Inicio</span>
            </button>

            <!-- 2. Comidas -->
            <button onclick="window.router.navigate('tracker')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'tracker' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
            }">
                <span class="material-symbols-outlined text-2xl">restaurant</span>
                <span class="text-[9px] tracking-tight">Comidas</span>
            </button>

            <!-- 3. Center Quick Add Button -->
            <div class="-mt-5">
                <button onclick="window.openQuickActionsModal()" class="size-12 rounded-full btn-emerald flex items-center justify-center shadow-emerald-lg border-2 border-white active:scale-90 transition-transform">
                    <span class="material-symbols-outlined text-2xl font-black">add</span>
                </button>
            </div>

            <!-- 4. Obetide -->
            <button onclick="window.router.navigate('obetide')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'obetide' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
            }">
                <span class="material-symbols-outlined text-2xl">vaccines</span>
                <span class="text-[9px] tracking-tight">Obetide</span>
            </button>

            <!-- 5. Billetera -->
            <button onclick="window.router.navigate('wallet')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'wallet' ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
            }">
                <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                <span class="text-[9px] tracking-tight">Billetera</span>
            </button>
        </div>
    </nav>
    `;
};
