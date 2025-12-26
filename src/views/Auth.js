import { supabase } from '../supabase-client';

export const renderAuth = () => {
    return `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#102212] relative overflow-hidden">
         <!-- Background Effects -->
         <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-[#102212] to-[#102212]"></div>
         <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full"></div>

         <div class="relative z-10 w-full max-w-md p-6">
            <div class="bg-surface-dark/80 backdrop-blur-xl border border-[#28392a] rounded-3xl p-8 shadow-2xl animate-scale-up">
                <div class="flex flex-col items-center mb-8">
                    <img src="/logogrow.png" alt="GrowFit" class="h-10 mb-2">
                    <h2 class="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
                    <p class="text-text-secondary text-sm">Ingresa para continuar tu viaje.</p>
                </div>

                <div class="flex flex-col gap-4">
                    <button id="google-login" class="flex items-center justify-center gap-3 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5">
                        Continuar con Google
                    </button>
                    
                    <div class="flex items-center gap-2 my-2">
                        <div class="h-px flex-1 bg-[#28392a]"></div>
                        <span class="text-xs text-[#5c6e5e]">O usa tu email</span>
                        <div class="h-px flex-1 bg-[#28392a]"></div>
                    </div>

                    <form id="email-form" class="flex flex-col gap-4">
                        <div>
                            <input type="email" id="email" placeholder="Tu Email" required class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors">
                        </div>
                        <div>
                             <input type="password" id="password" placeholder="Tu Contraseña" required class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors">
                        </div>
                        <button type="submit" class="w-full bg-primary text-[#102212] font-bold py-3 rounded-xl hover:bg-[#0fd620] transition-colors shadow-[0_0_20px_rgba(19,236,37,0.3)]">
                            Ingresar / Registrarse
                        </button>
                    </form>
                    <p id="auth-msg" class="text-center text-xs text-red-400 mt-2 h-4"></p>
                </div>
            </div>
         </div>
    </div>
    `;
};

export const attachAuthEvents = () => {
    // Google Login
    document.getElementById('google-login')?.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) console.error(error);
    });

    // Email Login
    document.getElementById('email-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const msg = document.getElementById('auth-msg');

        msg.textContent = 'Procesando...';

        // Try Login
        let { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // Try Signup if login failed (Simple Logic for MVP)
            msg.textContent = 'Creando cuenta...';
            const { data: upData, error: upError } = await supabase.auth.signUp({ email, password });
            if (upError) {
                msg.textContent = "Error: " + upError.message;
            } else {
                msg.textContent = "¡Cuenta creada! Revisa tu email para confirmar.";
                // Or immediate login if auto-confirm is enabled in Supabase
            }
        } else {
            // Success - Redirect handled by onAuthStateChange in main
        }
    });
};
