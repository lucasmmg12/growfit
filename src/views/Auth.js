import { login, register, getCurrentUser } from '../services/auth';
import { initializeState } from '../state';

export const renderAuth = () => {
    const currentUser = getCurrentUser();

    return `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0D1117] text-[#F5F5F7] p-4 relative overflow-hidden font-sans">
        <!-- iOS 18 Ambient Gradients -->
        <div class="absolute -top-40 -left-40 size-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-40 -right-40 size-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 w-full max-w-md animate-scale-up">
            <!-- App Logo & Branding -->
            <div class="flex flex-col items-center text-center mb-6">
                <div class="size-14 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(16,231,117,0.2)] mb-3">
                    🌱
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-white">GrowFit</h1>
                <p class="text-xs text-slate-400 mt-1">Plataforma Médica, Nutricional y Financiera</p>
                ${currentUser ? `
                    <div class="mt-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
                        Sesión activa: @${currentUser.username}
                    </div>
                ` : ''}
            </div>

            <!-- Card Container -->
            <div class="white-card p-6 md:p-8 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-2xl rounded-3xl backdrop-blur-2xl">
                
                <!-- Auth Tabs (Login vs Register) -->
                <div class="flex p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-6">
                    <button id="tab-login-btn" class="flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white/[0.1] text-white shadow-sm">
                        Iniciar Sesión
                    </button>
                    <button id="tab-register-btn" class="flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white">
                        Crear Cuenta
                    </button>
                </div>

                <!-- Form 1: LOGIN -->
                <form id="login-form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Usuario o Email</label>
                        <div class="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 focus-within:border-[#10E775] transition-all">
                            <span class="material-symbols-outlined text-slate-400 text-lg mr-2.5">account_circle</span>
                            <input id="login-username" type="text" placeholder="Tu usuario o email" required class="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600" />
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Contraseña</label>
                        <div class="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 focus-within:border-[#10E775] transition-all">
                            <span class="material-symbols-outlined text-slate-400 text-lg mr-2.5">lock</span>
                            <input id="login-password" type="password" placeholder="Tu contraseña" required class="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600" />
                        </div>
                    </div>

                    <button type="submit" id="login-submit-btn" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-emerald-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-2">
                        <span class="material-symbols-outlined text-base">login</span>
                        <span>Ingresar a GrowFit</span>
                    </button>
                </form>

                <!-- Form 2: REGISTER -->
                <form id="register-form" class="hidden flex flex-col gap-4">
                    <div>
                        <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Nombre Completo</label>
                        <div class="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 focus-within:border-[#0A84FF] transition-all">
                            <span class="material-symbols-outlined text-slate-400 text-lg mr-2.5">badge</span>
                            <input id="reg-name" type="text" placeholder="Ej: Dra. María Gómez" required class="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600" />
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Nombre de Usuario (Único)</label>
                        <div class="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 focus-within:border-[#0A84FF] transition-all">
                            <span class="material-symbols-outlined text-slate-400 text-lg mr-2.5">alternate_email</span>
                            <input id="reg-username" type="text" placeholder="Ej: mgomez" required class="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600" />
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Contraseña</label>
                        <div class="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 focus-within:border-[#0A84FF] transition-all">
                            <span class="material-symbols-outlined text-slate-400 text-lg mr-2.5">lock</span>
                            <input id="reg-password" type="password" placeholder="Mínimo 4 caracteres" required class="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600" />
                        </div>
                    </div>

                    <div class="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-2 text-xs text-blue-200">
                        <span class="material-symbols-outlined text-base text-blue-400 mt-0.5">shield</span>
                        <span>Tus métricas, comidas y presupuesto se guardarán en un espacio 100% independiente sin mezclarse con otros perfiles.</span>
                    </div>

                    <button type="submit" id="register-submit-btn" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-1">
                        <span class="material-symbols-outlined text-base">person_add</span>
                        <span>Crear mi Cuenta Independiente</span>
                    </button>
                </form>

                <!-- Feedback / Error Message -->
                <p id="auth-msg" class="text-center text-xs text-red-400 mt-4 min-h-[1.25rem] font-medium"></p>
            </div>
            
            <p class="text-center text-[11px] text-slate-500 mt-6">
                Grow Labs · Sanatorio Argentino &copy; 2026
            </p>
        </div>
    </div>
    `;
};

export const attachAuthEvents = () => {
    const tabLogin = document.getElementById('tab-login-btn');
    const tabRegister = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const msg = document.getElementById('auth-msg');

    const showMsg = (text, isError = true) => {
        if (!msg) return;
        msg.textContent = text;
        msg.className = `text-center text-xs mt-4 min-h-[1.25rem] font-medium ${isError ? 'text-red-400' : 'text-emerald-400'}`;
    };

    // Tab Switching
    tabLogin?.addEventListener('click', () => {
        tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white/[0.1] text-white shadow-sm';
        tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white';
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
        showMsg('');
    });

    tabRegister?.addEventListener('click', () => {
        tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white/[0.1] text-white shadow-sm';
        tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white';
        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        showMsg('');
    });

    // Login Submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username')?.value;
        const password = document.getElementById('login-password')?.value;
        const btn = document.getElementById('login-submit-btn');

        if (btn) btn.disabled = true;
        showMsg('Verificando credenciales...', false);

        try {
            const res = await login(username, password);
            if (!res.success) {
                showMsg(res.error, true);
                if (btn) btn.disabled = false;
            } else {
                showMsg(`¡Bienvenido, ${res.user.displayName}! Sincronizando tus datos de la nube...`, false);
                await initializeState();
                window.location.hash = '#dashboard';
                window.router.navigate('dashboard');
            }
        } catch (err) {
            showMsg(err.message || 'Error al iniciar sesión.', true);
            if (btn) btn.disabled = false;
        }
    });

    // Register Submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('reg-name')?.value;
        const username = document.getElementById('reg-username')?.value;
        const password = document.getElementById('reg-password')?.value;
        const btn = document.getElementById('register-submit-btn');

        if (btn) btn.disabled = true;
        showMsg('Creando tu espacio independiente...', false);

        try {
            const res = await register({ username, password, displayName });
            if (!res.success) {
                showMsg(res.error, true);
                if (btn) btn.disabled = false;
            } else {
                showMsg(`¡Cuenta @${res.user.username} creada con éxito! Sincronizando...`, false);
                await initializeState();
                window.location.hash = '#dashboard';
                window.router.navigate('dashboard');
            }
        } catch (err) {
            showMsg(err.message || 'Error al registrar la cuenta.', true);
            if (btn) btn.disabled = false;
        }
    });
};
