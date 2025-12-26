import { analyzeFood, generateMealPlan } from '../services/openai';
import { getState, addMeal } from '../state';

let currentAnalysis = null;
let isAnalyzing = false;

export const renderTracker = () => {
  const state = getState(); // Need state for sidebar
  const profile = state.profile || { name: 'User' };

  return `
    <div class="flex h-screen w-full text-slate-900 dark:text-white font-display overflow-hidden fade-in">
         <!-- Sidebar -->
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
                     <a class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#28392a] transition-colors text-text-secondary hover:text-white cursor-pointer" onclick="window.router.navigate('profile')">
                        <span class="material-symbols-outlined">settings</span>
                        <p class="text-sm font-medium">Ajustes</p>
                    </a>
                </nav>
            </div>
        </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full overflow-hidden relative">
          <!-- Mobile Header -->
          <div class="md:hidden flex items-center justify-between w-full p-4 border-b border-[#28392a] bg-surface-dark backdrop-blur-md">
                <img src="/logogrow.png" alt="GrowFit" class="h-6 object-contain">
                <button class="text-white" onclick="window.router.navigate('dashboard')"><span class="material-symbols-outlined">dashboard</span></button>
          </div>

          <div class="flex-1 overflow-y-auto w-full p-4 md:p-8 flex flex-col gap-8 max-w-3xl mx-auto">
              
              <header class="flex flex-col gap-2">
                <div class="flex items-center gap-4">
                     <button onclick="window.router.navigate('dashboard')" class="bg-[#28392a] hover:bg-primary hover:text-black text-white p-2 rounded-xl transition-colors">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 class="text-3xl font-black text-white">Registrar Comida</h2>
                </div>
                <p class="text-text-secondary ml-14">Describe tu comida o sube una foto para análisis IA.</p>
              </header>

              <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 flex flex-col gap-6 shadow-lg">
                
                <!-- Text Input -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold uppercase text-primary tracking-wider">Descripción</label>
                    <div class="relative">
                        <textarea id="food-text" rows="3" placeholder="Ej: 200g de pechuga de pollo con arroz blanco y ensalada mixta..." 
                            class="w-full bg-[#1A261C] border border-[#28392a] rounded-xl p-4 text-white placeholder-gray-500 focus:border-primary outline-none transition-all resize-none"></textarea>
                        <button id="mic-btn" class="absolute right-3 bottom-3 text-primary hover:text-white transition-colors p-2 rounded-full hover:bg-[#28392a]">
                            <span class="material-symbols-outlined">mic</span>
                        </button>
                    </div>
                </div>
                
                <!-- Image Input -->
                <div class="flex flex-col gap-2 text-center">
                    <p class="text-xs font-bold uppercase text-[#5c6e5e] tracking-wider relative flex items-center gap-2 justify-center">
                        <span class="h-px w-8 bg-[#28392a]"></span> O sube una foto <span class="h-px w-8 bg-[#28392a]"></span>
                    </p>
                    <label for="food-image" class="block w-full py-8 border-2 border-dashed border-[#28392a] hover:border-primary rounded-xl cursor-pointer transition-all hover:bg-[#28392a]/30 group">
                        <div class="flex flex-col items-center gap-2">
                            <span class="material-symbols-outlined text-4xl text-[#5c6e5e] group-hover:text-primary transition-colors">add_a_photo</span>
                            <div id="file-label" class="text-sm text-text-secondary group-hover:text-white font-medium">Clic para subir imagen</div>
                        </div>
                    </label>
                    <input type="file" id="food-image" accept="image/*" class="hidden">
                </div>

                <button id="analyze-btn" class="w-full bg-primary hover:bg-[#0fd620] text-black font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-lg">
                    <span class="material-symbols-outlined">auto_awesome</span> 
                    Analizar con IA
                </button>
              </div>

              <!-- Generator CTA -->
              <div class="bg-gradient-to-r from-[#1A261C] to-[#111812] border border-[#28392a] rounded-2xl p-6 flex flex-col items-center text-center gap-4 relative overflow-hidden group hover:border-[#3b543d] transition-colors shadow-lg">
                  <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <span class="material-symbols-outlined text-8xl text-primary">restaurant_menu</span>
                  </div>
                  <h3 class="text-xl font-bold text-white relative z-10">¿Sin ideas para hoy?</h3>
                  <p class="text-text-secondary text-sm max-w-sm relative z-10">Deja que la IA planifique tu día completo basándose en tus objetivos y gustos.</p>
                  <button id="generate-plan-btn" class="bg-[#28392a] hover:bg-[#3b543d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all border border-[#3b543d] hover:border-primary flex items-center gap-2 relative z-10">
                      <span class="material-symbols-outlined text-primary">auto_fix_high</span>
                      Generar Plan Diario
                  </button>
              </div>
              <div id="plan-loading" class="hidden flex flex-col items-center justify-center p-4 gap-2">
                  <div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p class="text-xs text-primary font-bold animate-pulse">Diseñando menú perfecto...</p>
              </div>
              <!-- Plan Result Area -->
              <div id="plan-result" class="hidden animate-slide-in flex flex-col gap-4"></div>

              <!-- Loading State -->
              <div id="loading" class="hidden flex flex-col items-center justify-center p-8 gap-4 animate-fadeIn">
                <div class="relative w-16 h-16">
                    <div class="absolute inset-0 border-4 border-[#28392a] rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p class="text-primary font-bold animate-pulse">Analizando alimentos...</p>
              </div>

              <!-- Results Area -->
              <div id="result-area" class="hidden animate-slide-in">
                 <!-- Populated by JS -->
              </div>
          </div>
      </main>
    </div>
  `;
};


export const attachTrackerEvents = () => {
  const fileInput = document.querySelector('#food-image');
  const analyzeBtn = document.querySelector('#analyze-btn');
  const resultArea = document.querySelector('#result-area');
  const loading = document.querySelector('#loading');
  const fileLabel = document.querySelector('#file-label');

  // File selection preview
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileLabel.innerText = e.target.files[0].name;
        // Could show image preview here
        fileLabel.style.color = 'var(--primary-start)';
      }
    });
  }

  // Voice Recognition Logic
  const micBtn = document.querySelector('#mic-btn');
  if (micBtn) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES'; // Spanish by default
      recognition.interimResults = false;

      micBtn.addEventListener('click', () => {
        micBtn.style.color = '#ef4444'; // Recording state
        recognition.start();
      });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const textArea = document.querySelector('#food-text');
        if (textArea) textArea.value = transcript;
        micBtn.style.color = 'var(--primary-start)';
      };

      recognition.onerror = () => {
        micBtn.style.color = 'var(--primary-start)';
        alert('Error de reconocimiento de voz o permiso denegado.');
      };

      recognition.onend = () => {
        micBtn.style.color = 'var(--primary-start)';
      };
    } else {
      micBtn.style.display = 'none';
    }
  }

  // Analyze Action
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const text = document.querySelector('#food-text').value;
      const file = fileInput?.files[0];

      if (!text && !file) {
        alert("Por favor ingresa un texto o sube una imagen.");
        return;
      }

      isAnalyzing = true;
      loading.style.display = 'block';
      resultArea.style.display = 'none';
      analyzeBtn.disabled = true;

      try {
        let result;
        if (file) {
          const base64 = await toBase64(file);
          result = await analyzeFood(base64, 'image');
        } else {
          result = await analyzeFood(text, 'text');
        }

        currentAnalysis = result;
        showResult(result);
      } catch (error) {
        alert("Error al analizar: " + error.message);
      } finally {
        isAnalyzing = false;
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
      }
    });
  }

  // --- MEAL PLAN GENERATOR ---
  const genBtn = document.querySelector('#generate-plan-btn');
  const planLoading = document.querySelector('#plan-loading');
  const planResult = document.querySelector('#plan-result');

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const state = getState();

      planLoading.classList.remove('hidden');
      planResult.classList.add('hidden');
      genBtn.disabled = true;

      try {
        const plan = await generateMealPlan(state.profile);

        if (!plan || !plan.meals) throw new Error("Error generando el plan.");

        const mealsHtml = plan.meals.map(m => `
                  <div class="bg-[#1A261C] border border-[#28392a] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <p class="text-primary text-[10px] font-bold uppercase tracking-wider mb-1">${m.category}</p>
                        <h4 class="text-white font-bold">${m.name}</h4>
                        <p class="text-xs text-gray-400 mt-1 line-clamp-2">${m.ingredients}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-white font-bold">${m.calories} kcal</p>
                        <p class="text-[10px] text-gray-500">P:${m.macros.protein} C:${m.macros.carbs} F:${m.macros.fat}</p>
                    </div>
                  </div>
              `).join('');

        planResult.innerHTML = `
                  <div class="bg-surface-dark/90 backdrop-blur-md border border-[#28392a] rounded-2xl p-6 shadow-2xl animate-scale-up">
                      <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-white font-bold text-lg">Plan Sugerido</h3>
                            <p class="text-xs text-text-secondary">${plan.tips || 'Basado en tus preferencias'}</p>
                        </div>
                        <span class="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-full">${plan.total_calories} kcal</span>
                      </div>
                      <div class="flex flex-col gap-3">
                        ${mealsHtml}
                      </div>
                      <button id="save-plan-btn" class="w-full bg-primary hover:bg-[#0fd620] text-black font-bold py-3.5 rounded-xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined">save_all</span>
                        Aceptar y Guardar Día
                      </button>
                  </div>
              `;

        planResult.classList.remove('hidden');

        // Bind Save All
        document.getElementById('save-plan-btn').addEventListener('click', () => {
          if (confirm('¿Guardar todas estas comidas en tu diario de hoy?')) {
            plan.meals.forEach(m => addMeal(m));
            window.router.navigate('dashboard');
          }
        });

      } catch (e) {
        alert(e.message);
      } finally {
        planLoading.classList.add('hidden');
        genBtn.disabled = false;
      }
    });
  }
};

const showResult = (data) => {
  const resultArea = document.querySelector('#result-area');
  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="bg-surface-dark/90 backdrop-blur-md border border-primary rounded-2xl p-6 shadow-lg flex flex-col gap-4 animate-scale-up">
      <h3 class="text-2xl font-bold text-white text-center">${data.name}</h3>
      
      <div class="grid grid-cols-4 gap-4 py-4 border-y border-[#28392a]">
        <div class="flex flex-col items-center">
          <div class="text-2xl font-black text-white">${data.calories}</div>
          <div class="text-xs font-bold text-text-secondary uppercase">kcal</div>
        </div>
        <div class="flex flex-col items-center">
          <div class="text-xl font-bold text-blue-400">${data.macros.protein}g</div>
          <div class="text-xs font-bold text-[#5c6e5e] uppercase">Prot</div>
        </div>
        <div class="flex flex-col items-center">
          <div class="text-xl font-bold text-yellow-400">${data.macros.carbs}g</div>
          <div class="text-xs font-bold text-[#5c6e5e] uppercase">Carb</div>
        </div>
        <div class="flex flex-col items-center">
          <div class="text-xl font-bold text-red-400">${data.macros.fat}g</div>
          <div class="text-xs font-bold text-[#5c6e5e] uppercase">Grasa</div>
        </div>
      </div>

      <button id="save-meal-btn" class="w-full bg-primary hover:bg-[#0fd620] text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
        <span class="material-symbols-outlined">check_circle</span>
        Guardar en Diario
      </button>
    </div>
  `;

  document.querySelector('#save-meal-btn').addEventListener('click', () => {
    addMeal(currentAnalysis);
    window.router.navigate('dashboard');
  });
};

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});
