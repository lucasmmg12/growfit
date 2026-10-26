import './style.css';
import { initializeState, addMeasurement, addMeal, getArgentinaDate, getState } from './state';
import { analyzeFood } from './services/openai';
import { supabase } from './supabase-client';
import { setLocalUserId } from './services/db';

import { renderDashboard, attachDashboardEvents } from './views/Dashboard';
import { renderTracker, attachTrackerEvents } from './views/Tracker';
import { renderWorkouts, attachWorkoutsEvents } from './views/Workouts';
import { renderProfile, attachProfileEvents } from './views/Profile';
import { renderInsights, attachInsightsEvents } from './views/Insights';
import { renderMeasurements, attachMeasurementsEvents } from './views/Measurements';
import { renderChatWidget, attachChatWidgetEvents } from './views/ChatWidget';
import { renderCalendar, attachCalendarEvents } from './views/CalendarView';
import { renderObetide, attachObetideEvents } from './views/Obetide';
import { renderWallet, attachWalletEvents } from './views/Wallet';
import { renderMealPlan, attachMealPlanEvents } from './views/MealPlan';
import { renderAuth, attachAuthEvents } from './views/Auth';

const app = document.querySelector('#app');

// --- CHAT WIDGET ---
const initChat = () => {
  if (!document.getElementById('chat-root')) {
    const chatRoot = document.createElement('div');
    chatRoot.id = 'chat-root';
    document.body.appendChild(chatRoot);
    chatRoot.innerHTML = renderChatWidget();
    attachChatWidgetEvents();
  }
};

// --- ROUTER ---
const routes = {
  'dashboard': { render: renderDashboard, attach: attachDashboardEvents },
  'obetide': { render: renderObetide, attach: attachObetideEvents },
  'tracker': { render: renderTracker, attach: attachTrackerEvents },
  'wallet': { render: renderWallet, attach: attachWalletEvents },
  'mealplan': { render: renderMealPlan, attach: attachMealPlanEvents },
  'workouts': { render: renderWorkouts, attach: attachWorkoutsEvents },
  'profile': { render: renderProfile, attach: attachProfileEvents },
  'insights': { render: renderInsights, attach: attachInsightsEvents },
  'measurements': { render: renderMeasurements, attach: attachMeasurementsEvents },
  'calendar': { render: renderCalendar, attach: attachCalendarEvents },
  'auth': { render: renderAuth, attach: attachAuthEvents }
};

window.router = {
  navigate: (path) => {
    const route = routes[path] || routes['dashboard'];
    if (route) {
      app.innerHTML = route.render();
      if (route.attach) route.attach();
      if (path !== 'auth') initChat();
      window.scrollTo(0, 0);
    }
  }
};

// --- GLOBAL ALERTS & CONFIRMS ---
window.showAlert = (title, message, type = 'success') => {
  const modal = document.getElementById('global-modal');
  const content = document.getElementById('global-modal-content');
  if (!modal || !content) return;

  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'cancel' : 'info';
  const iconColor = type === 'success' ? 'text-primary' : type === 'error' ? 'text-red-500' : 'text-blue-500';
  const iconBg = type === 'success' ? 'bg-primary-light border-border-emerald' : type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';

  content.innerHTML = `
        <div class="white-card p-6 shadow-emerald-lg w-full text-center relative overflow-hidden animate-scale-up">
            <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="${iconBg} p-3.5 rounded-2xl border ${iconColor} flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl">${icon}</span>
                </div>
                <div>
                    <h3 class="text-xl font-display font-black text-text-primary uppercase tracking-tight">${title}</h3>
                    <p class="text-text-muted text-xs leading-relaxed mt-1">${message}</p>
                </div>
                <button onclick="window.hideAlert()" class="mt-3 w-full btn-emerald py-3 text-xs font-bold shadow-emerald-sm">
                    Aceptar
                </button>
            </div>
        </div>
    `;
  modal.classList.remove('hidden');
};

window.showConfirm = (title, message, onConfirm, onCancel) => {
  const modal = document.getElementById('global-modal');
  const content = document.getElementById('global-modal-content');
  if (!modal || !content) return;

  content.innerHTML = `
        <div class="white-card p-6 shadow-emerald-lg w-full text-center relative overflow-hidden animate-scale-up">
            <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-red-500 flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl">delete_forever</span>
                </div>
                <div>
                    <h3 class="text-xl font-display font-black text-text-primary uppercase tracking-tight">${title}</h3>
                    <p class="text-text-muted text-xs leading-relaxed mt-1">${message}</p>
                </div>
                <div class="flex gap-2.5 w-full mt-3">
                    <button id="confirm-cancel-btn" class="flex-1 btn-ghost-light py-3 text-xs font-bold">
                        Cancelar
                    </button>
                    <button id="confirm-ok-btn" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-sm active:scale-95">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    `;

  document.getElementById('confirm-cancel-btn').onclick = () => {
    window.hideAlert();
    if (onCancel) onCancel();
  };

  document.getElementById('confirm-ok-btn').onclick = () => {
    window.hideAlert();
    if (onConfirm) onConfirm();
  };

  modal.classList.remove('hidden');
};

window.hideAlert = () => {
  const modal = document.getElementById('global-modal');
  if (modal) modal.classList.add('hidden');
};

// --- MOBILE-FIRST QUICK ACTIONS BOTTOM SHEET ---
window.openQuickActionsModal = () => {
  let sheet = document.getElementById('quick-actions-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'quick-actions-sheet';
    sheet.className = 'fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs p-3 transition-opacity';
    document.body.appendChild(sheet);
  }

  sheet.innerHTML = `
    <div class="white-card p-5 w-full max-w-lg mx-auto rounded-3xl animate-scale-up shadow-2xl border border-slate-200">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-border-soft">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <span class="material-symbols-outlined text-lg">bolt</span>
          </div>
          <div>
            <h3 class="text-base font-display font-black text-text-primary uppercase tracking-tight">Acceso Rápido Móvil</h3>
            <p class="text-[10px] text-text-muted">¿Qué deseas registrar ahora?</p>
          </div>
        </div>
        <button id="close-quick-sheet" class="size-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <!-- Action Grid -->
      <div class="grid grid-cols-2 gap-3 text-left">
        <!-- 1. Foto Comida (IA) -->
        <label for="camera-direct-input" class="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all">
          <div class="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-emerald-sm">
            <span class="material-symbols-outlined text-xl">photo_camera</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-emerald-950 uppercase">Foto Comida (IA)</h4>
            <p class="text-[10px] text-emerald-700 leading-tight mt-0.5">Captura tu plato y calcula calorías al instante.</p>
          </div>
        </label>
        <input type="file" id="camera-direct-input" accept="image/*" capture="environment" class="hidden">

        <!-- 2. Registrar Obetide -->
        <button id="quick-action-obetide" class="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <span class="material-symbols-outlined text-xl">syringe</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-blue-950 uppercase">Dosis Obetide</h4>
            <p class="text-[10px] text-blue-700 leading-tight mt-0.5">Control semanal (0.25ml), saciedad y punción.</p>
          </div>
        </button>

        <!-- 3. Registrar Gasto Billetera -->
        <button id="quick-action-wallet" class="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm">
            <span class="material-symbols-outlined text-xl">add_card</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-amber-950 uppercase">Mi Billetera</h4>
            <p class="text-[10px] text-amber-700 leading-tight mt-0.5">Registrar gasto rápido con categoría.</p>
          </div>
        </button>

        <!-- 4. Registrar Peso Corporal -->
        <button id="quick-action-weight" class="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 hover:border-purple-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <span class="material-symbols-outlined text-xl">scale</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-purple-950 uppercase">Registrar Peso</h4>
            <p class="text-[10px] text-purple-700 leading-tight mt-0.5">Pesaje para actualizar curva de descenso.</p>
          </div>
        </button>
      </div>

      <!-- Quick Weight Input Modal Container (Hidden by default) -->
      <div id="quick-weight-container" class="hidden mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
        <label class="text-[10px] font-bold uppercase text-slate-500 block mb-1">Ingresa tu peso de hoy (kg):</label>
        <div class="flex gap-2">
          <input type="number" id="quick-weight-input" step="0.1" placeholder="ej. 74.5" class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-purple-500">
          <button id="save-quick-weight-btn" class="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Guardar</button>
        </div>
      </div>

    </div>
  `;

  sheet.classList.remove('hidden');

  // Close sheet
  document.getElementById('close-quick-sheet')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
  });

  // Camera capture & OpenAI Vision
  const camInput = document.getElementById('camera-direct-input');
  camInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sheet.classList.add('hidden');
    window.showAlert?.('Analizando con IA', 'Procesando la foto de tu plato con visión artificial...', 'info');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        const result = await analyzeFood(base64, 'image');
        if (result.meals && result.meals.length > 0) {
          const meal = result.meals[0];
          await addMeal({
            name: meal.name,
            calories: meal.calories,
            macros: meal.macros,
            category: meal.category || 'Almuerzo',
            date: getArgentinaDate()
          });
          window.showAlert?.('¡Plato Identificado!', `Se guardó "${meal.name}" (${meal.calories} kcal) con éxito.`, 'success');
          window.router.navigate('tracker');
        } else {
          window.showAlert?.('Listo', 'Foto analizada sin comidas detectadas.', 'info');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      window.showAlert?.('Error en Foto', err.message || 'No se pudo analizar la foto.', 'error');
    }
  });

  // Obetide Action
  document.getElementById('quick-action-obetide')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('obetide');
    setTimeout(() => {
      document.getElementById('open-obetide-modal-btn')?.click();
    }, 200);
  });

  // Wallet Action
  document.getElementById('quick-action-wallet')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('wallet');
    setTimeout(() => {
      document.getElementById('open-expense-modal-btn')?.click();
    }, 200);
  });

  // Weight Action
  document.getElementById('quick-action-weight')?.addEventListener('click', () => {
    const wc = document.getElementById('quick-weight-container');
    wc?.classList.toggle('hidden');
  });

  document.getElementById('save-quick-weight-btn')?.addEventListener('click', async () => {
    const val = Number(document.getElementById('quick-weight-input').value);
    if (!val || val <= 0) return;
    await addMeasurement({
      weight: val,
      date: getArgentinaDate()
    });
    sheet.classList.add('hidden');
    window.showAlert?.('¡Peso Registrado!', `Tu peso de ${val} kg fue guardado en el historial.`, 'success');
    window.router.navigate('measurements');
  });
};

// --- AUTH STATE LISTENER (MULTI-TENANT) ---
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log(`[Supabase Auth] Event: ${event}, User: ${session?.user?.id || 'none'}`);
  if (session?.user) {
    setLocalUserId(session.user.id);
  }
});

// --- APP STARTUP ---
const startApp = async () => {
  await initializeState();
  window.router.navigate('dashboard');
};

startApp();
