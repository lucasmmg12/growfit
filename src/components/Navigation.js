import { getState } from '../state';
import { getCurrentUser } from '../services/auth';

export const renderSidebar = (activeRoute = 'dashboard') => {
    const state = getState();
    const { profile } = state;
    const currentUser = getCurrentUser();
    const level = profile.level || 1;
    const xp = profile.xp || 0;
    const xpProgress = Math.min(100, (xp % 100));
    const ringRadius = 18;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (xpProgress / 100) * ringCircumference;

    const navItems = [
        { id: 'dashboard', label: 'Centro de Control', icon: 'space_dashboard', accent: 'emerald' },
        { id: 'obetide', label: 'Tratamiento Obetide', icon: 'vaccines', highlight: 'violet', badge: 'GLP-1' },
        { id: 'tracker', label: 'Diario de Comidas', icon: 'restaurant', accent: 'emerald' },
        { id: 'wallet', label: 'Mi Billetera', icon: 'account_balance_wallet', highlight: 'blue', badge: 'ARS' },
        { id: 'mealplan', label: 'Plan Nutricional IA', icon: 'auto_awesome', accent: 'cyan' },
        { id: 'measurements', label: 'Progreso y Medidas', icon: 'monitor_weight', accent: 'emerald' },
        { id: 'workouts', label: 'Entrenamientos', icon: 'fitness_center', accent: 'amber' },
        { id: 'insights', label: 'Biometría & Métricas', icon: 'monitoring', accent: 'violet' },
        { id: 'profile', label: 'Ajustes y Cuenta', icon: 'tune', accent: 'slate' }
    ];

    return `
    <aside class="hidden lg:flex w-72 flex-col justify-between border-r border-white/[0.08] bg-[#090D16]/95 backdrop-blur-2xl p-5 relative z-30 shadow-2xl">
        <div class="flex flex-col gap-6">
            <!-- Brand & Biometric Athlete Header -->
            <div class="flex items-center justify-between px-2 pt-1">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="size-11 rounded-2xl bg-gradient-to-br from-[#10E775] via-emerald-500 to-cyan-500 p-[2px] shadow-[0_0_20px_rgba(16,231,117,0.3)]">
                            <div class="w-full h-full rounded-[14px] bg-[#090D16] flex items-center justify-center text-[#10E775] font-display font-black text-lg">
                                ${(profile.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <span class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#10E775] border-2 border-[#090D16]"></span>
                    </div>
                    <div class="flex flex-col overflow-hidden">
                        <div class="flex items-center gap-1.5">
                            <h1 class="text-white font-display text-lg font-extrabold tracking-tight">GrowFit</h1>
                            <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30">PRO</span>
                        </div>
                        <p class="text-slate-400 text-xs font-medium truncate">${profile.name || currentUser?.displayName || 'Atleta'}</p>
                    </div>
                </div>
            </div>
            
            <!-- Navigation Links -->
            <nav class="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-310px)] custom-scrollbar pr-1">
                <span class="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1"> Ecosistema Diario</span>
                ${navItems.map(item => {
                    const isActive = activeRoute === item.id;
                    const activeStyles = item.highlight === 'violet' && isActive
                        ? 'bg-gradient-to-r from-purple-500/25 to-purple-500/5 text-purple-200 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.18)]'
                        : item.highlight === 'blue' && isActive
                        ? 'bg-gradient-to-r from-sky-500/25 to-sky-500/5 text-sky-200 border border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.18)]'
                        : isActive
                        ? 'bg-gradient-to-r from-[#10E775]/20 to-[#10E775]/5 text-white border border-[#10E775]/35 shadow-[0_0_20px_rgba(16,231,117,0.15)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent';

                    const iconColor = isActive
                        ? (item.highlight === 'violet' ? 'text-purple-400' : item.highlight === 'blue' ? 'text-sky-400' : 'text-[#10E775]')
                        : (item.highlight === 'violet' ? 'text-purple-400/70' : item.highlight === 'blue' ? 'text-sky-400/70' : 'text-slate-400');

                    return `
                        <a onclick="window.router.navigate('${item.id}')" class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 ${activeStyles}">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-[20px] ${iconColor}">${item.icon}</span>
                                <p class="text-xs font-semibold tracking-wide">${item.label}</p>
                            </div>
                            ${item.badge ? `
                                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    item.highlight === 'violet'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }">${item.badge}</span>
                            ` : isActive ? `
                                <span class="size-1.5 rounded-full bg-[#10E775] shadow-[0_0_8px_#10E775]"></span>
                            ` : ''}
                        </a>
                    `;
                }).join('')}
            </nav>
        </div>

        <div class="flex flex-col gap-3">
            <!-- Whoop / Apple Ring Level & XP Widget -->
            <div class="p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center gap-3.5">
                <div class="relative size-12 shrink-0 flex items-center justify-center">
                    <svg class="size-12 -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="${ringRadius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4"></circle>
                        <circle cx="22" cy="22" r="${ringRadius}" fill="none" stroke="#10E775" stroke-width="4" stroke-linecap="round"
                            stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}" class="ring-glow-emerald"></circle>
                    </svg>
                    <span class="absolute text-[11px] font-mono font-extrabold text-white">N${level}</span>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-white">Nivel ${level}</span>
                        <span class="text-xs font-mono font-bold text-[#10E775]">${xp} XP</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-0.5 truncate">${100 - xpProgress} XP para subir a Nivel ${level + 1}</p>
                </div>
            </div>

            <!-- User Session & Logout Widget -->
            <div class="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="size-2 rounded-full bg-[#10E775] animate-pulse shrink-0"></span>
                    <div class="truncate">
                        <span class="text-xs font-bold text-white block truncate">@${currentUser?.username || 'lmarinero'}</span>
                        <span class="text-[9px] text-slate-400 uppercase tracking-wider block">Cloud Sync Activo</span>
                    </div>
                </div>
                <button onclick="window.handleGlobalLogout()" class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 active:scale-95" title="Cerrar Sesión">
                    <span class="material-symbols-outlined text-sm">logout</span>
                    <span>Salir</span>
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
    <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-[#090D16]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-30 shadow-lg">
        <div class="flex items-center gap-2.5 cursor-pointer" onclick="window.router.navigate('dashboard')">
            <div class="size-9 rounded-xl bg-gradient-to-br from-[#10E775]/25 to-cyan-500/20 flex items-center justify-center text-[#10E775] border border-[#10E775]/35 shadow-[0_0_12px_rgba(16,231,117,0.2)]">
                <span class="material-symbols-outlined text-lg">bolt</span>
            </div>
            <div>
                <h1 class="text-white font-display text-base font-extrabold tracking-tight leading-none">${title}</h1>
                <p class="text-[10px] text-slate-400 font-medium mt-0.5">@${currentUser?.username || 'lmarinero'} · ${state.profile.name || 'GrowFit'}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.openQuickActionsModal()" class="size-8 rounded-xl btn-emerald flex items-center justify-center active:scale-95 transition-transform" title="Acción Rápida">
                <span class="material-symbols-outlined text-lg">add</span>
            </button>
            <button onclick="window.handleGlobalLogout()" class="size-8 rounded-xl border border-rose-500/30 bg-rose-500/15 flex items-center justify-center text-rose-300 font-bold text-xs cursor-pointer active:scale-95" title="Cerrar Sesión">
                <span class="material-symbols-outlined text-sm">logout</span>
            </button>
        </div>
    </header>
    `;
};

export const renderBottomNav = (activeRoute = 'dashboard') => {
    return `
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav-light px-2 py-1.5 pb-safe border-t border-white/[0.08]">
        <div class="flex items-center justify-around max-w-lg mx-auto">
            <!-- 1. Inicio -->
            <button onclick="window.router.navigate('dashboard')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'dashboard' ? 'text-[#10E775] font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">space_dashboard</span>
                <span class="text-[9px] tracking-tight">Inicio</span>
            </button>

            <!-- 2. Comidas -->
            <button onclick="window.router.navigate('tracker')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'tracker' ? 'text-[#10E775] font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">restaurant</span>
                <span class="text-[9px] tracking-tight">Comidas</span>
            </button>

            <!-- 3. Center Quick Add Button -->
            <div class="-mt-5">
                <button onclick="window.openQuickActionsModal()" class="size-12 rounded-2xl btn-emerald flex items-center justify-center border-2 border-[#090D16] active:scale-90 transition-transform">
                    <span class="material-symbols-outlined text-2xl font-black">add</span>
                </button>
            </div>

            <!-- 4. Obetide -->
            <button onclick="window.router.navigate('obetide')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'obetide' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">vaccines</span>
                <span class="text-[9px] tracking-tight">Obetide</span>
            </button>

            <!-- 5. Billetera -->
            <button onclick="window.router.navigate('wallet')" class="flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                activeRoute === 'wallet' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }">
                <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                <span class="text-[9px] tracking-tight">Billetera</span>
            </button>
        </div>
    </nav>
    `;
};
