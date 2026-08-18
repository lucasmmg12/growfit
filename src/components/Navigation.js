import { getState } from '../state';

export const renderSidebar = (activeRoute = 'dashboard') => {
    const state = getState();
    const { profile } = state;
    const level = profile.level || 1;
    const xp = profile.xp || 0;

    const navItems = [
        { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
        { id: 'tracker', label: 'Diario de Comidas', icon: 'restaurant' },
        { id: 'workouts', label: 'Entrenamientos', icon: 'fitness_center' },
        { id: 'measurements', label: 'Progreso y Medidas', icon: 'straighten' },
        { id: 'insights', label: 'Estadísticas & TDEE', icon: 'insights' },
        { id: 'profile', label: 'Ajustes y Metas', icon: 'settings' }
    ];

    return `
    <aside class="hidden lg:flex w-72 flex-col justify-between border-r border-border-soft bg-surface-white p-6 relative z-30 shadow-sm">
        <div class="flex flex-col gap-8">
            <!-- Brand & User Profile -->
            <div class="flex items-center gap-4 px-2">
                <div class="relative">
                    <img src="/lucas.jpeg" alt="Profile" class="w-13 h-13 rounded-2xl border-2 border-primary object-cover shadow-emerald-sm">
                    <span class="absolute -bottom-1 -right-1 size-4 bg-primary rounded-full border-2 border-white"></span>
                </div>
                <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-primary text-base">eco</span>
                        <h1 class="text-text-emerald font-display text-2xl font-black uppercase tracking-tight">GrowFit</h1>
                    </div>
                    <p class="text-text-muted text-xs font-semibold">${profile.name || 'Personal Plan'}</p>
                </div>
            </div>
            
            <!-- Navigation Links -->
            <nav class="flex flex-col gap-1.5">
                ${navItems.map(item => {
                    const isActive = activeRoute === item.id;
                    return `
                        <a onclick="window.router.navigate('${item.id}')" class="flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                            isActive 
                                ? 'bg-primary-light text-text-emerald border border-border-emerald font-bold shadow-sm' 
                                : 'text-text-muted hover:text-text-emerald hover:bg-slate-50 font-medium'
                        }">
                            <span class="material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-slate-400'}">${item.icon}</span>
                            <p class="text-sm tracking-wide">${item.label}</p>
                        </a>
                    `;
                }).join('')}
            </nav>
        </div>

        <!-- Level & XP Widget -->
        <div class="white-card p-5 bg-gradient-to-br from-primary-light to-white border border-border-emerald">
            <div class="flex justify-between items-center mb-2.5">
                <span class="badge-emerald text-[10px]">Nivel ${level}</span>
                <span class="text-xs font-mono font-bold text-text-emerald">${xp} XP</span>
            </div>
            <div class="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all duration-500 shadow-emerald-sm" style="width: ${Math.min(100, (xp % 100))}%"></div>
            </div>
            <p class="text-[10px] text-text-muted mt-2 text-center font-medium">${100 - (xp % 100)} XP para el siguiente nivel</p>
        </div>
    </aside>
    `;
};

export const renderMobileHeader = (title = 'GrowFit') => {
    const state = getState();
    return `
    <header class="lg:hidden flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur-md border-b border-border-soft sticky top-0 z-30 shadow-xs">
        <div class="flex items-center gap-2.5" onclick="window.router.navigate('dashboard')">
            <div class="size-9 rounded-xl bg-primary-light flex items-center justify-center text-primary border border-border-emerald">
                <span class="material-symbols-outlined text-xl">eco</span>
            </div>
            <div>
                <h1 class="text-text-emerald font-display text-lg font-black uppercase tracking-tight">${title}</h1>
                <p class="text-[10px] text-text-muted font-bold">${state.profile.name || 'Mi Tracker'}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.router.navigate('profile')" class="size-9 rounded-full border border-border-soft overflow-hidden">
                <img src="/lucas.jpeg" class="w-full h-full object-cover">
            </button>
        </div>
    </header>
    `;
};

export const renderBottomNav = (activeRoute = 'dashboard') => {
    const navItems = [
        { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
        { id: 'tracker', label: 'Diario', icon: 'restaurant' },
        { id: 'workouts', label: 'Entrenos', icon: 'fitness_center' },
        { id: 'measurements', label: 'Progreso', icon: 'straighten' },
        { id: 'profile', label: 'Ajustes', icon: 'settings' }
    ];

    return `
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav-light px-3 py-2 pb-safe">
        <div class="flex items-center justify-around max-w-lg mx-auto">
            ${navItems.slice(0, 2).map(item => {
                const isActive = activeRoute === item.id;
                return `
                    <button onclick="window.router.navigate('${item.id}')" class="flex flex-col items-center gap-1 py-1.5 px-3 transition-colors ${
                        isActive ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
                    }">
                        <span class="material-symbols-outlined text-2xl">${item.icon}</span>
                        <span class="text-[10px] tracking-tight">${item.label}</span>
                    </button>
                `;
            }).join('')}

            <!-- Center Quick Add Button -->
            <div class="-mt-6">
                <button id="mobile-central-add-btn" class="size-13 rounded-full btn-emerald flex items-center justify-center shadow-emerald-lg border-4 border-white active:scale-90 transition-transform">
                    <span class="material-symbols-outlined text-3xl font-black">add</span>
                </button>
            </div>

            ${navItems.slice(2).map(item => {
                const isActive = activeRoute === item.id;
                return `
                    <button onclick="window.router.navigate('${item.id}')" class="flex flex-col items-center gap-1 py-1.5 px-3 transition-colors ${
                        isActive ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-700'
                    }">
                        <span class="material-symbols-outlined text-2xl">${item.icon}</span>
                        <span class="text-[10px] tracking-tight">${item.label}</span>
                    </button>
                `;
            }).join('')}
        </div>
    </nav>
    `;
};
