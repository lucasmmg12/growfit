import { getState, saveState } from '../state';

export const renderProfile = () => {
    const state = getState();
    const { profile } = state;
    const workouts = state.workouts || [];

    // Calculate Achievements
    const totalCals = workouts.reduce((acc, w) => acc + (parseInt(w.calories) || 0), 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const last7DaysCount = workouts.filter(w => new Date(w.date) >= oneWeekAgo).length;

    const hasRun = workouts.some(w => w.type === 'running' || w.type === 'run_walk_mix');

    const badges = [
        { id: 'weekly', label: "Guerrero Semanal", desc: "3 entrenamientos en 7 días", unlocked: last7DaysCount >= 3, icon: "swords", color: "text-yellow-400" },
        { id: 'cals', label: "Club 1000", desc: "+1000 kcal quemadas", unlocked: totalCals >= 1000, icon: "local_fire_department", color: "text-orange-500" },
        { id: 'runner', label: "Runner", desc: "Primer run registrado", unlocked: hasRun, icon: "sprint", color: "text-blue-400" },
        { id: 'early', label: "Madrugador", desc: "Entrenamiento antes de 8am", unlocked: false, icon: "wb_twilight", color: "text-purple-400" } // Mock
    ];

    return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
        <!-- Reusing Sidebar -->
        <aside class="hidden md:flex w-64 flex-col justify-between border-r border-[#28392a] bg-surface-dark backdrop-blur-md p-4">
            <div class="flex flex-col gap-8">
                <div class="flex items-center gap-3 px-2">
                     <img src="/lucas.jpeg" alt="Profile" class="w-12 h-12 rounded-full border-2 border-primary object-cover">
                    <div class="flex flex-col">
                        <img src="/logogrow.png" alt="GrowFit" class="h-6 object-contain self-start">
                        <p class="text-primary text-xs font-medium uppercase tracking-wide">Plan Personal</p>
                    </div>
                </div>
                <nav class="flex flex-col gap-2">
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('dashboard')">
                        <span class="material-symbols-outlined">dashboard</span>
                        <p class="text-sm font-medium">Inicio</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('measurements')">
                        <span class="material-symbols-outlined">straighten</span>
                        <p class="text-sm font-medium">Progreso</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('insights')">
                        <span class="material-symbols-outlined">insights</span>
                        <p class="text-sm font-medium">Estadísticas</p>
                    </a>
                    <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('workouts')">
                        <span class="material-symbols-outlined">fitness_center</span>
                        <p class="text-sm font-medium">Entrenamientos</p>
                    </a>
                     <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 border border-primary/20 group transition-colors cursor-pointer" onclick="window.router.navigate('profile')">
                        <span class="material-symbols-outlined text-primary group-hover:text-white">settings</span>
                        <p class="text-white text-sm font-medium">Ajustes</p>
                    </a>
                </nav>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col p-4 md:p-8 lg:px-12 gap-8 overflow-y-auto h-full relative w-full">
            <!-- Mobile Header -->
            <div class="md:hidden flex items-center justify-between w-full mb-4 bg-surface-dark backdrop-blur-md p-4 rounded-xl border border-[#28392a]">
                <img src="/logogrow.png" alt="GrowFit" class="h-6 object-contain">
                <button class="text-white" onclick="window.router.navigate('dashboard')"><span class="material-symbols-outlined">dashboard</span></button>
            </div>

            <!-- Profile Header Card -->
            <section class="rounded-xl bg-surface-dark/90 backdrop-blur-md border border-[#28392a] p-6 shadow-lg">
                <div class="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div class="flex gap-5 items-center w-full md:w-auto">
                        <img src="/lucas.jpeg" alt="Profile" class="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-[#28392a] object-cover">
                        <div class="flex flex-col gap-2 w-full">
                            <label class="text-xs text-[#9db99f] uppercase font-bold">Nombre</label>
                            <input type="text" id="profile-name" value="${profile.name}" class="bg-transparent border-b border-[#28392a] text-white text-2xl font-bold focus:border-primary outline-none w-full md:w-64" placeholder="Tu Nombre">
                            <p class="text-[#9db99f] text-sm">Miembro desde 2024</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Weight Settings Section -->
            <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-xl p-6 flex flex-col gap-2 relative group focus-within:border-primary transition-colors">
                    <div class="absolute top-3 right-3 opacity-50"><span class="material-symbols-outlined text-[#9db99f]">history</span></div>
                    <label class="text-xs text-[#9db99f] uppercase font-bold tracking-wider">Peso Inicial</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="profile-start-weight" step="0.1" value="${profile.startingWeight || 80}" class="bg-[#1A261C] border border-[#28392a] rounded-lg px-3 py-2 text-2xl font-black text-white focus:border-primary outline-none w-full">
                        <span class="text-sm text-text-secondary font-bold">kg</span>
                    </div>
                 </div>
                 
                 <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-xl p-6 flex flex-col gap-2 relative group focus-within:border-primary transition-colors">
                    <div class="absolute top-3 right-3 opacity-50"><span class="material-symbols-outlined text-[#9db99f]">flag</span></div>
                    <label class="text-xs text-[#9db99f] uppercase font-bold tracking-wider">Peso Meta</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="profile-target-weight" step="0.1" value="${profile.targetWeight || 70}" class="bg-[#1A261C] border border-[#28392a] rounded-lg px-3 py-2 text-2xl font-black text-white focus:border-primary outline-none w-full">
                        <span class="text-sm text-text-secondary font-bold">kg</span>
                    </div>
                 </div>
            </section>

             <!-- Achievements Section -->
            <section class="flex flex-col gap-5">
                 <div class="flex items-center gap-2">
                    <h3 class="text-xl font-bold text-white">Premios y Logros</h3>
                    <span class="material-symbols-outlined text-primary text-sm">emoji_events</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${badges.map(badge => `
                        <div class="bg-surface-dark/90 backdrop-blur-md border ${badge.unlocked ? 'border-primary/50' : 'border-[#28392a]'} rounded-xl p-4 flex flex-col items-center text-center gap-3 transition-all ${badge.unlocked ? 'opacity-100 shadow-[0_0_15px_rgba(19,236,37,0.1)]' : 'opacity-40 grayscale'}">
                            <div class="bg-black/30 p-3 rounded-full">
                                <span class="material-symbols-outlined ${badge.color} text-2xl drop-shadow-md">${badge.icon}</span>
                            </div>
                            <div>
                                <h4 class="text-white font-bold text-sm">${badge.label}</h4>
                                <p class="text-[10px] text-text-secondary mt-1 leading-tight">${badge.desc}</p>
                            </div>
                            ${badge.unlocked ? '<div class="mt-auto text-[10px] uppercase font-bold text-primary tracking-wider">Desbloqueado</div>' : '<div class="mt-auto text-[10px] uppercase font-bold text-gray-600 tracking-wider">Bloqueado</div>'}
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- Goals Section -->
            <section class="flex flex-col gap-5">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-white">Objetivos Nutricionales</h3>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Daily Calorie Card -->
                    <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-xl p-6 flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-[#9db99f] font-medium">
                                <span class="material-symbols-outlined text-orange-500">local_fire_department</span>
                                Meta de Calorías
                            </span>
                            <div class="flex items-center gap-1">
                                <input type="number" id="goal-cals" value="${profile.calorieGoal}" 
                                    class="w-20 bg-[#1A261C] border border-[#28392a] rounded px-2 py-1 text-right text-xl font-bold text-white focus:border-primary outline-none" />
                                <span class="text-sm text-[#9db99f]">kcal</span>
                            </div>
                        </div>
                        <p class="text-xs text-[#5c6e5e]">Recomendado: 2000 - 3000 kcal para hombres activos.</p>
                    </div>

                    <!-- Water Goal -->
                    <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-xl p-6 flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-[#9db99f] font-medium">
                                <span class="material-symbols-outlined text-blue-500">water_drop</span>
                                Meta de Hidratación
                            </span>
                            <div class="flex items-center gap-1">
                                <input type="number" step="0.1" id="goal-water" value="${profile.hydrationGoal || 2.5}" 
                                    class="w-20 bg-[#1A261C] border border-[#28392a] rounded px-2 py-1 text-right text-xl font-bold text-white focus:border-primary outline-none" />
                                <span class="text-sm text-[#9db99f]">L</span>
                            </div>
                        </div>
                        <p class="text-xs text-[#5c6e5e]">Mantente hidratado para mejor rendimiento.</p>
                    </div>
                </div>
            </section>

            <!-- Macros Section -->
            <section class="w-full rounded-xl bg-surface-dark/90 backdrop-blur-md border border-[#28392a] p-6 shadow-lg">
                <h3 class="text-lg font-bold text-white mb-6">Distribución de Macronutrientes (g)</h3>
                <div class="flex flex-col gap-6">
                    
                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between text-sm">
                            <label class="text-blue-400 font-bold">Proteínas</label>
                            <input type="number" id="goal-form-protein" value="${profile.proteinGoal || 150}" class="bg-[#1A261C] border border-[#28392a] rounded px-2 py-0.5 text-right w-16 text-white focus:border-primary outline-none">
                        </div>
                        <div class="h-2 w-full bg-[#28392a] rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 w-[40%]"></div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between text-sm">
                            <label class="text-yellow-400 font-bold">Carbohidratos</label>
                            <input type="number" id="goal-form-carbs" value="${profile.carbsGoal || 200}" class="bg-[#1A261C] border border-[#28392a] rounded px-2 py-0.5 text-right w-16 text-white focus:border-primary outline-none">
                        </div>
                        <div class="h-2 w-full bg-[#28392a] rounded-full overflow-hidden">
                            <div class="h-full bg-yellow-500 w-[50%]"></div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between text-sm">
                            <label class="text-red-400 font-bold">Grasas</label>
                            <input type="number" id="goal-form-fat" value="${profile.fatGoal || 65}" class="bg-[#1A261C] border border-[#28392a] rounded px-2 py-0.5 text-right w-16 text-white focus:border-primary outline-none">
                        </div>
                        <div class="h-2 w-full bg-[#28392a] rounded-full overflow-hidden">
                            <div class="h-full bg-red-500 w-[20%]"></div>
                        </div>
                </div>
            </section>

            <!-- BIO-METABOLIC PROFILE (Smart Anamnesis) -->
            <section class="w-full rounded-xl bg-surface-dark/90 backdrop-blur-md border border-[#28392a] p-6 shadow-lg animate-slide-in">
                <div class="flex items-center gap-2 mb-6">
                    <span class="bg-blue-500/10 p-2 rounded-lg">
                        <span class="material-symbols-outlined text-blue-400">medical_services</span>
                    </span>
                    <div>
                        <h3 class="text-xl font-bold text-white">Historial Clínico Inteligente</h3>
                        <p class="text-xs text-[#9db99f] font-medium">Adaptamos tu plan a tu biología.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Pathology -->
                    <div class="flex flex-col gap-2">
                        <label class="text-xs text-[#9db99f] uppercase font-bold tracking-wider">Patología Diagnosticada</label>
                        <div class="relative">
                            <select id="profile-condition" class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl px-4 py-3 text-white appearance-none focus:border-blue-500 outline-none transition-colors">
                                <option value="" ${!profile.health?.conditions ? 'selected' : ''}>Ninguna</option>
                                <option value="hipotiroidismo" ${profile.health?.conditions === 'hipotiroidismo' ? 'selected' : ''}>Hipotiroidismo</option>
                                <option value="hipertiroidismo" ${profile.health?.conditions === 'hipertiroidismo' ? 'selected' : ''}>Hipertiroidismo</option>
                                <option value="diabetes_2" ${profile.health?.conditions === 'diabetes_2' ? 'selected' : ''}>Diabetes Tipo 2</option>
                                <option value="sop" ${profile.health?.conditions === 'sop' ? 'selected' : ''}>SOP (Síndrome Ovario Poliquístico)</option>
                            </select>
                            <span class="material-symbols-outlined absolute right-4 top-3 text-[#5c6e5e] pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <!-- Medication -->
                    <div class="flex flex-col gap-2">
                         <label class="text-xs text-[#9db99f] uppercase font-bold tracking-wider">Medicación Actual</label>
                         <input type="text" id="profile-medication" value="${profile.health?.medications || ''}" 
                            class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none placeholder-[#3b4a3d]" 
                            placeholder="Ej: Levotiroxina 100mcg">
                         <p class="text-[10px] text-blue-400 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[10px]">info</span>
                            Usaremos esto para ajustar horarios de comida.
                         </p>
                    </div>

                    <!-- Metabolic Speed -->
                    <div class="flex flex-col gap-2">
                         <label class="text-xs text-[#9db99f] uppercase font-bold tracking-wider">Metabolismo Percibido</label>
                         <div class="grid grid-cols-3 gap-2 p-1 bg-[#1A261C] rounded-xl border border-[#28392a]">
                            <button class="metabolism-btn px-2 py-2 rounded-lg text-xs font-bold transition-all ${profile.health?.metabolism === 'slow' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-gray-400 hover:text-white'}" data-value="slow">Lento</button>
                            <button class="metabolism-btn px-2 py-2 rounded-lg text-xs font-bold transition-all ${profile.health?.metabolism === 'normal' || !profile.health?.metabolism ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-gray-400 hover:text-white'}" data-value="normal">Normal</button>
                            <button class="metabolism-btn px-2 py-2 rounded-lg text-xs font-bold transition-all ${profile.health?.metabolism === 'fast' ? 'bg-green-500/20 text-primary border border-primary/50' : 'text-gray-400 hover:text-white'}" data-value="fast">Rápido</button>
                         </div>
                    </div>
                    
                    <!-- Alert Box (Dynamic) -->
                    <div id="medical-alert-box" class="hidden md:col-span-2 bg-[#28392a]/30 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                        <span class="material-symbols-outlined text-yellow-500">warning</span>
                        <div class="flex flex-col gap-1">
                            <h4 class="text-sm font-bold text-yellow-500">Ajuste Metabólico Activo</h4>
                            <p class="text-xs text-text-secondary leading-relaxed">
                                Hemos detectado una condición que podría afectar tu gasto energético. Tu ingesta calórica recomendada se ajustará automáticamente (-5% a -10%) para asegurar resultados reales.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

             <!-- Connected Devices -->
            <section class="flex flex-col gap-5">
                <div class="flex items-center gap-2">
                    <h3 class="text-xl font-bold text-white">Dispositivos Conectados</h3>
                    <span class="material-symbols-outlined text-[#9db99f] text-sm">lock</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <!-- Garmin -->
                    <div class="bg-surface-dark border border-primary/30 shadow-[0_0_15px_rgba(19,236,37,0.05)] rounded-xl p-5 flex flex-col justify-between h-40 relative overflow-hidden group">
                        <div class="flex justify-between items-start z-10">
                            <div class="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                <span class="material-symbols-outlined text-white">watch</span>
                            </div>
                            <div class="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                                <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                <span class="text-[10px] font-bold text-primary uppercase">Activo</span>
                            </div>
                        </div>
                        <div class="z-10">
                            <h4 class="text-white font-bold">Garmin</h4>
                            <p class="text-xs text-[#9db99f] mt-1">Sincronizado: hace 2m</p>
                        </div>
                    </div>
                     <!-- Apple Health -->
                    <div class="bg-surface-dark border border-[#28392a] rounded-xl p-5 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-[#3b543d] transition-colors">
                        <div class="flex justify-between items-start z-10">
                            <div class="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                <span class="material-symbols-outlined text-white">monitor_heart</span>
                            </div>
                             <button class="text-primary text-xs font-bold px-3 py-1.5 rounded bg-[#28392a] hover:bg-primary hover:text-[#102212] transition-colors">Conectar</button>
                        </div>
                        <div class="z-10">
                             <h4 class="text-white font-bold">Apple Health</h4>
                             <p class="text-xs text-[#9db99f] mt-1">Sinc. anillos de actividad</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <div class="h-20"></div>

        </main>
        
        <!-- Sticky Footer Action Bar -->
        <div class="fixed bottom-0 right-0 w-full md:w-[calc(100%-16rem)] border-t border-[#28392a] bg-background-dark/90 backdrop-blur-md p-4 flex justify-end gap-4 z-40">
            <button class="px-6 py-2.5 rounded-lg text-white font-bold text-sm hover:text-[#9db99f] transition-colors">
                Cancelar
            </button>
            <button id="save-profile" class="px-8 py-2.5 rounded-lg bg-primary text-[#102212] font-bold text-sm hover:bg-primary/90 shadow-[0_0_15px_rgba(19,236,37,0.3)] transition-all transform hover:-translate-y-0.5">
                Guardar Cambios
            </button>
        </div>
        <!-- Success Modal -->
        <div id="success-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center fade-in">
            <div class="bg-[#102212] border border-[#13ec25]/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(19,236,37,0.2)] max-w-sm w-full text-center transform scale-100 animate-scale-up relative overflow-hidden">
                <!-- Background Glow -->
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>
                
                <div class="relative z-10 flex flex-col items-center gap-4">
                    <div class="bg-primary/20 p-4 rounded-full border-2 border-primary text-primary">
                        <span class="material-symbols-outlined text-4xl">check</span>
                    </div>
                    
                    <div>
                        <h3 class="text-2xl font-black text-white mb-2">¡Cambios Guardados!</h3>
                        <p class="text-text-secondary text-sm leading-relaxed">
                            Tu perfil biológico y objetivos han sido actualizados correctamente.
                        </p>
                    </div>

                    <button id="modal-close-btn" class="mt-2 w-full bg-primary text-[#102212] font-bold py-3 rounded-xl hover:bg-[#0fd620] transition-colors shadow-lg shadow-primary/20">
                        Entendido
                    </button>
                </div>
            </div>
        </div>

    </div>
    `;
};

export const attachProfileEvents = () => {
    // Metabolism Selection Logic
    const metaBtns = document.querySelectorAll('.metabolism-btn');
    let selectedMetabolism = getState().profile.health?.metabolism || 'normal';

    metaBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset all styles
            metaBtns.forEach(b => {
                b.className = 'metabolism-btn px-2 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white';
            });
            // highlight clicked
            const val = e.target.dataset.value;
            selectedMetabolism = val;
            let activeClass = '';
            if (val === 'slow') activeClass = 'bg-red-500/20 text-red-400 border border-red-500/50';
            else if (val === 'normal') activeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
            else if (val === 'fast') activeClass = 'bg-green-500/20 text-primary border border-primary/50';

            e.target.className = `metabolism-btn px-2 py-2 rounded-lg text-xs font-bold transition-all ${activeClass}`;
        });
    });

    // Medical Alert Logic
    const conditionSelect = document.querySelector('#profile-condition');
    const alertBox = document.querySelector('#medical-alert-box');

    const checkAlert = () => {
        if (conditionSelect.value === 'hipotiroidismo' || conditionSelect.value === 'sop') {
            alertBox.classList.remove('hidden');
        } else {
            alertBox.classList.add('hidden');
        }
    };
    conditionSelect?.addEventListener('change', checkAlert);
    // Initial check
    if (conditionSelect) checkAlert();


    // SAVE LOGIC
    document.querySelector('#save-profile')?.addEventListener('click', () => {
        const state = getState();
        const cals = parseInt(document.querySelector('#goal-cals').value);
        const prot = parseInt(document.querySelector('#goal-form-protein').value);
        const carb = parseInt(document.querySelector('#goal-form-carbs').value);
        const fat = parseInt(document.querySelector('#goal-form-fat').value);
        const name = document.querySelector('#profile-name').value;
        const condition = document.querySelector('#profile-condition').value;
        const medication = document.querySelector('#profile-medication').value;
        const startW = parseFloat(document.querySelector('#profile-start-weight').value);
        const targetW = parseFloat(document.querySelector('#profile-target-weight').value);


        // Validate
        if (cals && prot && carb && fat) {
            state.profile.calorieGoal = cals;
            state.profile.proteinGoal = prot;
            state.profile.carbsGoal = carb;
            state.profile.fatGoal = fat;
            if (name) state.profile.name = name;

            if (startW) state.profile.startingWeight = startW;
            if (targetW) state.profile.targetWeight = targetW;

            // Save Medical Profile
            state.profile.health = {
                conditions: condition,
                medications: medication,
                metabolism: selectedMetabolism
            };

            saveState(state);

            // Show Success Modal
            const modal = document.getElementById('success-modal');
            modal.classList.remove('hidden');
        } else {
            alert('Por favor verifica tus datos.');
        }
    });

    // Modal Close Logic
    const modal = document.getElementById('success-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    closeBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on click outside
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
};
