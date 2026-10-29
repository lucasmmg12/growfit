import { getState } from '../state';
import { getCurrentUser } from '../services/auth';

export const renderAmbientGreenGraphics = () => {
    return `
    <!-- Ambient Green Background Graphics: Alimentos Saludables & Pesas (Gamas de Verdes) -->
    <div class="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none" aria-hidden="true">
        <!-- 1. Top Right: Mancuerna Hexagonal Grande (Verde Neón #10E775) -->
        <div class="absolute -top-6 right-8 md:right-16 text-[#10E775] opacity-[0.11] animate-float-slow graphic-green-glow">
            <svg width="190" height="190" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="-rotate-12">
                <!-- Left Hex Weight -->
                <polygon points="18,36 30,28 38,36 38,84 30,92 18,84" fill="currentColor" fill-opacity="0.18"/>
                <polygon points="8,44 18,38 18,82 8,76" fill="currentColor" fill-opacity="0.28"/>
                <!-- Knurled Handle -->
                <line x1="38" y1="55" x2="82" y2="55"/>
                <line x1="38" y1="65" x2="82" y2="65"/>
                <line x1="48" y1="55" x2="54" y2="65" stroke-width="2"/>
                <line x1="58" y1="55" x2="64" y2="65" stroke-width="2"/>
                <line x1="68" y1="55" x2="74" y2="65" stroke-width="2"/>
                <!-- Right Hex Weight -->
                <polygon points="82,36 90,28 102,36 102,84 90,92 82,84" fill="currentColor" fill-opacity="0.18"/>
                <polygon points="102,38 112,44 112,76 102,82" fill="currentColor" fill-opacity="0.28"/>
            </svg>
        </div>

        <!-- 2. Top Left (unto Sidebar): Manzana & Hoja Nutricional (Verde Lima #84CC16) -->
        <div class="absolute top-14 left-6 lg:left-80 text-[#84CC16] opacity-[0.11] animate-float-reverse graphic-green-glow">
            <svg width="145" height="145" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="rotate-12">
                <!-- Apple Body -->
                <path d="M50 32 C35 28, 18 38, 20 58 C22 76, 36 90, 46 88 C49 87, 51 87, 54 88 C64 90, 78 76, 80 58 C82 38, 65 28, 50 32 Z" fill="currentColor" fill-opacity="0.15"/>
                <!-- Stem -->
                <path d="M50 32 C50 22, 55 15, 62 12"/>
                <!-- Leaf -->
                <path d="M52 24 C42 14, 30 18, 34 28 C40 30, 48 28, 52 24 Z" fill="currentColor" fill-opacity="0.28"/>
            </svg>
        </div>

        <!-- 3. Upper Center-Right: Pesa Rusa / Kettlebell (Verde Menta #34D399) -->
        <div class="absolute top-1/4 right-1/3 text-[#34D399] opacity-[0.09] animate-float-slow graphic-green-glow">
            <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="rotate-6">
                <!-- Kettlebell Handle -->
                <path d="M32 36 C32 18, 68 18, 68 36" stroke-width="5"/>
                <!-- Kettlebell Body -->
                <circle cx="50" cy="60" r="26" fill="currentColor" fill-opacity="0.16"/>
                <!-- Flat Base -->
                <path d="M34 82 L66 82" stroke-width="4"/>
                <!-- Weight Label -->
                <text x="50" y="65" text-anchor="middle" fill="currentColor" font-size="13" font-weight="bold" stroke="none">16KG</text>
            </svg>
        </div>

        <!-- 4. Middle Left: Palta / Aguacate Fit (Verde Jade #2DD4BF) -->
        <div class="absolute top-1/2 left-4 lg:left-76 text-[#2DD4BF] opacity-[0.10] animate-float-slow graphic-green-glow">
            <svg width="140" height="140" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="-rotate-12">
                <!-- Avocado Outer -->
                <path d="M50 14 C36 14, 24 42, 24 62 C24 80, 36 90, 50 90 C64 90, 76 80, 76 62 C76 42, 64 14, 50 14 Z" fill="currentColor" fill-opacity="0.14"/>
                <!-- Avocado Seed -->
                <circle cx="50" cy="62" r="13" fill="currentColor" fill-opacity="0.32"/>
            </svg>
        </div>

        <!-- 5. Middle Right: Bowl de Proteína & Ensalada (Verde Esmeralda #10E775) -->
        <div class="absolute top-[52%] right-6 md:right-12 text-[#10E775] opacity-[0.10] animate-float-reverse graphic-green-glow">
            <svg width="165" height="165" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="rotate-6">
                <!-- Bowl Rim & Base -->
                <path d="M18 58 L102 58 C100 84, 82 98, 60 98 C38 98, 20 84, 18 58 Z" fill="currentColor" fill-opacity="0.16"/>
                <path d="M44 102 L76 102" stroke-width="4"/>
                <!-- Salad Leaves & Egg/Protein on Top -->
                <path d="M28 58 C28 42, 46 40, 52 54"/>
                <path d="M48 58 C52 38, 72 38, 76 58" fill="currentColor" fill-opacity="0.22"/>
                <path d="M70 58 C76 42, 94 44, 92 58"/>
                <!-- Chopsticks / Fork accent -->
                <line x1="78" y1="26" x2="96" y2="54"/>
            </svg>
        </div>

        <!-- 6. Bottom Left: Barra Olímpica con Discos (Verde Esmeralda #10B981) -->
        <div class="absolute bottom-10 left-10 lg:left-80 text-[#10B981] opacity-[0.11] animate-float-reverse graphic-green-glow">
            <svg width="220" height="110" viewBox="0 0 180 90" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="-rotate-6">
                <!-- Barbell Bar -->
                <line x1="6" y1="45" x2="174" y2="45" stroke-width="4"/>
                <!-- Left Plates -->
                <rect x="18" y="24" width="8" height="42" rx="3" fill="currentColor" fill-opacity="0.26"/>
                <rect x="29" y="14" width="10" height="62" rx="3" fill="currentColor" fill-opacity="0.20"/>
                <rect x="42" y="20" width="8" height="50" rx="3" fill="currentColor" fill-opacity="0.15"/>
                <!-- Right Plates -->
                <rect x="130" y="20" width="8" height="50" rx="3" fill="currentColor" fill-opacity="0.15"/>
                <rect x="141" y="14" width="10" height="62" rx="3" fill="currentColor" fill-opacity="0.20"/>
                <rect x="154" y="24" width="8" height="42" rx="3" fill="currentColor" fill-opacity="0.26"/>
            </svg>
        </div>

        <!-- 7. Bottom Right: Shaker de Proteína + Brócoli/Vegetal (Verde Lima #84CC16) -->
        <div class="absolute bottom-12 right-14 md:right-24 text-[#84CC16] opacity-[0.10] animate-float-slow graphic-green-glow">
            <svg width="150" height="150" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="rotate-12">
                <!-- Shaker Bottle -->
                <path d="M34 36 L76 36 L70 94 C70 98, 66 100, 62 100 L48 100 C44 100, 40 98, 40 94 Z" fill="currentColor" fill-opacity="0.15"/>
                <rect x="30" y="26" width="50" height="10" rx="4" fill="currentColor" fill-opacity="0.28"/>
                <path d="M46 26 L46 16 L64 16 L64 26"/>
                <!-- Lightning / Protein emblem -->
                <polygon points="56,50 46,66 55,66 52,82 64,62 55,62" fill="currentColor" fill-opacity="0.35"/>
            </svg>
        </div>

        <!-- 8. Scattered Mini Fitness & Food Icons in Green Spectrum -->
        <span class="material-symbols-outlined absolute top-[18%] left-[46%] text-[54px] text-[#10E775] opacity-[0.06] -rotate-12">fitness_center</span>
        <span class="material-symbols-outlined absolute top-[38%] left-[28%] text-[48px] text-[#84CC16] opacity-[0.06] rotate-12">nutrition</span>
        <span class="material-symbols-outlined absolute top-[68%] left-[52%] text-[56px] text-[#34D399] opacity-[0.06] -rotate-6">exercise</span>
        <span class="material-symbols-outlined absolute top-[82%] left-[36%] text-[44px] text-[#2DD4BF] opacity-[0.06] rotate-12">egg_alt</span>
        <span class="material-symbols-outlined absolute top-[12%] right-[28%] text-[46px] text-[#34D399] opacity-[0.06] rotate-6">restaurant</span>
        <span class="material-symbols-outlined absolute bottom-[28%] right-[35%] text-[50px] text-[#84CC16] opacity-[0.06] -rotate-12">eco</span>
    </div>
    `;
};

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
        { id: 'dashboard', label: 'Centro de Control', icon: 'space_dashboard' },
        { id: 'obetide', label: 'Tratamiento Obetide', icon: 'vaccines', badge: 'GLP-1', shade: 'teal' },
        { id: 'tracker', label: 'Diario de Comidas', icon: 'restaurant' },
        { id: 'wallet', label: 'Mi Billetera', icon: 'account_balance_wallet', badge: 'ARS', shade: 'lime' },
        { id: 'mealplan', label: 'Plan Nutricional IA', icon: 'auto_awesome' },
        { id: 'measurements', label: 'Progreso y Medidas', icon: 'monitor_weight' },
        { id: 'workouts', label: 'Entrenamientos', icon: 'fitness_center' },
        { id: 'insights', label: 'Biometría & Métricas', icon: 'monitoring' },
        { id: 'profile', label: 'Ajustes y Cuenta', icon: 'tune' }
    ];

    return `
    ${renderAmbientGreenGraphics()}
    <aside class="hidden lg:flex w-72 flex-col justify-between border-r border-emerald-500/15 bg-[#040B08]/95 backdrop-blur-2xl p-5 relative z-30 shadow-2xl overflow-hidden">
        <!-- Subtle Sidebar Green Food & Dumbbell Watermarks -->
        <div class="pointer-events-none select-none absolute -right-8 top-28 text-[#10E775] opacity-[0.06] rotate-12">
            <span class="material-symbols-outlined text-[110px]">fitness_center</span>
        </div>
        <div class="pointer-events-none select-none absolute -left-6 bottom-36 text-[#84CC16] opacity-[0.06] -rotate-12">
            <span class="material-symbols-outlined text-[100px]">nutrition</span>
        </div>
        <div class="flex flex-col gap-6">
            <!-- Brand & Biometric Athlete Header -->
            <div class="flex items-center justify-between px-2 pt-1">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="size-11 rounded-2xl bg-gradient-to-br from-[#10E775] via-emerald-500 to-teal-500 p-[2px] shadow-[0_0_20px_rgba(16,231,117,0.3)]">
                            <div class="w-full h-full rounded-[14px] bg-[#040B08] flex items-center justify-center text-[#10E775] font-display font-black text-lg">
                                ${(profile.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <span class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#10E775] border-2 border-[#040B08]"></span>
                    </div>
                    <div class="flex flex-col overflow-hidden">
                        <div class="flex items-center gap-1.5">
                            <h1 class="text-white font-display text-lg font-extrabold tracking-tight">GrowFit</h1>
                            <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30">PRO</span>
                        </div>
                        <p class="text-emerald-300/70 text-xs font-medium truncate">${profile.name || currentUser?.displayName || 'Atleta'}</p>
                    </div>
                </div>
            </div>
            
            <!-- Navigation Links -->
            <nav class="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-310px)] custom-scrollbar pr-1">
                <span class="px-3 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-1">Ecosistema Diario</span>
                ${navItems.map(item => {
                    const isActive = activeRoute === item.id;
                    const activeStyles = isActive
                        ? 'bg-gradient-to-r from-[#10E775]/22 to-emerald-900/20 text-white border border-[#10E775]/40 shadow-[0_0_20px_rgba(16,231,117,0.16)]'
                        : 'text-emerald-100/65 hover:text-white hover:bg-emerald-500/[0.07] border border-transparent';

                    const iconColor = isActive
                        ? 'text-[#10E775]'
                        : (item.shade === 'teal' ? 'text-teal-400/80' : item.shade === 'lime' ? 'text-lime-400/80' : 'text-emerald-400/65');

                    return `
                        <a onclick="window.router.navigate('${item.id}')" class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 ${activeStyles}">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-[20px] ${iconColor}">${item.icon}</span>
                                <p class="text-xs font-semibold tracking-wide">${item.label}</p>
                            </div>
                            ${item.badge ? `
                                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    item.shade === 'teal'
                                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/35'
                                        : 'bg-lime-500/20 text-lime-300 border border-lime-500/35'
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
            <!-- Green Ring Level & XP Widget -->
            <div class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-[#06140E] border border-emerald-500/20 flex items-center gap-3.5">
                <div class="relative size-12 shrink-0 flex items-center justify-center">
                    <svg class="size-12 -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="${ringRadius}" fill="none" stroke="rgba(16,231,117,0.12)" stroke-width="4"></circle>
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
                    <p class="text-[10px] text-emerald-200/60 mt-0.5 truncate">${100 - xpProgress} XP para Nivel ${level + 1}</p>
                </div>
            </div>

            <!-- User Session & Logout Widget -->
            <div class="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/15 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="size-2 rounded-full bg-[#10E775] animate-pulse shrink-0"></span>
                    <div class="truncate">
                        <span class="text-xs font-bold text-white block truncate">@${currentUser?.username || 'lmarinero'}</span>
                        <span class="text-[9px] text-emerald-400/70 uppercase tracking-wider block">Cloud Sync Activo</span>
                    </div>
                </div>
                <button onclick="window.handleGlobalLogout()" class="px-2.5 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-500/30 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 active:scale-95" title="Cerrar Sesión">
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
    <header class="lg:hidden shrink-0 flex items-center justify-between px-4 py-3 bg-[#040B08]/95 backdrop-blur-xl border-b border-emerald-500/15 sticky top-0 z-30 shadow-lg">
        <div class="flex items-center gap-2.5 cursor-pointer" onclick="window.router.navigate('dashboard')">
            <div class="size-9 rounded-xl bg-gradient-to-br from-[#10E775]/25 to-emerald-600/20 flex items-center justify-center text-[#10E775] border border-[#10E775]/35 shadow-[0_0_12px_rgba(16,231,117,0.2)]">
                <span class="material-symbols-outlined text-lg">eco</span>
            </div>
            <div>
                <h1 class="text-white font-display text-base font-extrabold tracking-tight leading-none">${title}</h1>
                <p class="text-[10px] text-emerald-300/70 font-medium mt-0.5">@${currentUser?.username || 'lmarinero'} · ${state.profile.name || 'GrowFit'}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.openQuickActionsModal()" class="size-8 rounded-xl btn-emerald flex items-center justify-center active:scale-95 transition-transform" title="Acción Rápida">
                <span class="material-symbols-outlined text-lg">add</span>
            </button>
            <button onclick="window.handleGlobalLogout()" class="size-8 rounded-xl border border-emerald-500/30 bg-emerald-900/30 flex items-center justify-center text-emerald-200 font-bold text-xs cursor-pointer active:scale-95" title="Cerrar Sesión">
                <span class="material-symbols-outlined text-sm">logout</span>
            </button>
        </div>
    </header>
    `;
};

export const renderBottomNav = (activeRoute = 'dashboard') => {
    return `
    <nav class="lg:hidden shrink-0 fixed bottom-0 left-0 right-0 z-50 glass-nav-light px-1.5 pt-1.5 pb-safe border-t border-emerald-500/20 shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
        <div class="flex items-center justify-around max-w-lg mx-auto">
            <!-- 1. Inicio -->
            <button onclick="window.router.navigate('dashboard')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'dashboard' ? 'text-[#10E775] font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">space_dashboard</span>
                <span class="text-[8.5px] tracking-tight">Inicio</span>
            </button>

            <!-- 2. Comidas -->
            <button onclick="window.router.navigate('tracker')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'tracker' ? 'text-[#10E775] font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">restaurant</span>
                <span class="text-[8.5px] tracking-tight">Comidas</span>
            </button>

            <!-- 3. Entrenamientos -->
            <button onclick="window.router.navigate('workouts')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'workouts' ? 'text-[#10E775] font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">fitness_center</span>
                <span class="text-[8.5px] tracking-tight">Entreno</span>
            </button>

            <!-- 4. Center Quick Add Button -->
            <div class="-mt-5 px-0.5">
                <button onclick="window.openQuickActionsModal()" class="size-11 rounded-2xl btn-emerald flex items-center justify-center border-2 border-[#040B08] active:scale-90 transition-transform cursor-pointer">
                    <span class="material-symbols-outlined text-2xl font-black">add</span>
                </button>
            </div>

            <!-- 5. Medidas y Peso -->
            <button onclick="window.router.navigate('measurements')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'measurements' ? 'text-[#34D399] font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">monitor_weight</span>
                <span class="text-[8.5px] tracking-tight">Medidas</span>
            </button>

            <!-- 6. Obetide -->
            <button onclick="window.router.navigate('obetide')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'obetide' ? 'text-teal-400 font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">vaccines</span>
                <span class="text-[8.5px] tracking-tight">Obetide</span>
            </button>

            <!-- 7. Billetera -->
            <button onclick="window.router.navigate('wallet')" class="flex flex-col items-center gap-0.5 py-1 px-1.5 transition-colors cursor-pointer ${
                activeRoute === 'wallet' ? 'text-lime-400 font-bold' : 'text-emerald-200/55 hover:text-emerald-200'
            }">
                <span class="material-symbols-outlined text-xl">account_balance_wallet</span>
                <span class="text-[8.5px] tracking-tight">Billetera</span>
            </button>
        </div>
    </nav>
    `;
};
