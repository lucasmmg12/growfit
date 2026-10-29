import './style.css';
import { initializeState, addMeasurement, addMeal, getArgentinaDate, getState } from './state';
import { analyzeFood } from './services/openai';
import { supabase } from './supabase-client';
import { setLocalUserId } from './services/db';
import { getCurrentUser, logout } from './services/auth';

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

let activeRoutePath = 'dashboard';

window.router = {
  navigate: (path, preserveScroll = false) => {
    const currentUser = getCurrentUser();
    const targetPath = (!currentUser && path !== 'auth') ? 'auth' : path;
    const route = routes[targetPath] || (currentUser ? routes['dashboard'] : routes['auth']);
    if (route) {
      activeRoutePath = routes[targetPath] ? targetPath : (currentUser ? 'dashboard' : 'auth');
      app.innerHTML = route.render();
      if (route.attach) route.attach();
      if (activeRoutePath !== 'auth') initChat();
      if (!preserveScroll) window.scrollTo(0, 0);
    }
  },
  refresh: () => {
    if (activeRoutePath && activeRoutePath !== 'auth') {
      window.router.navigate(activeRoutePath, true);
    }
  }
};

// --- GLOBAL ALERTS & CONFIRMS ---
window.showAlert = (title, message, type = 'success') => {
  const modal = document.getElementById('global-modal');
  const content = document.getElementById('global-modal-content');
  if (!modal || !content) return;

  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'cancel' : 'info';
  const iconColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-blue-400';
  const iconBg = type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30' : type === 'error' ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/20 border-blue-500/30';

  content.innerHTML = `
        <div class="white-card p-6 shadow-2xl w-full text-center relative overflow-hidden animate-scale-up border border-slate-700 bg-[#1E293B]">
            <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="${iconBg} p-3.5 rounded-2xl border ${iconColor} flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl">${icon}</span>
                </div>
                <div>
                    <h3 class="text-xl font-display font-bold text-white uppercase tracking-tight">${title}</h3>
                    <p class="text-slate-300 text-xs leading-relaxed mt-1">${message}</p>
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
        <div class="white-card p-6 shadow-2xl w-full text-center relative overflow-hidden animate-scale-up border border-slate-700 bg-[#1E293B]">
            <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="bg-red-500/20 p-3.5 rounded-2xl border border-red-500/30 text-red-400 flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl">delete_forever</span>
                </div>
                <div>
                    <h3 class="text-xl font-display font-bold text-white uppercase tracking-tight">${title}</h3>
                    <p class="text-slate-300 text-xs leading-relaxed mt-1">${message}</p>
                </div>
                <div class="flex gap-2.5 w-full mt-3">
                    <button id="confirm-cancel-btn" class="flex-1 btn-ghost-light py-3 text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        Cancelar
                    </button>
                    <button id="confirm-ok-btn" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-sm active:scale-95">
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
    sheet.className = 'fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md p-3 transition-opacity';
    document.body.appendChild(sheet);
  }

  sheet.innerHTML = `
    <div class="white-card card-glow-emerald p-5 w-full max-w-lg mx-auto rounded-3xl animate-scale-up shadow-2xl border border-emerald-500/30">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/15">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35 flex items-center justify-center">
            <span class="material-symbols-outlined text-lg">bolt</span>
          </div>
          <div>
            <h3 class="text-base font-display font-bold text-white uppercase tracking-tight">Acciones Rápidas</h3>
            <p class="text-[10px] text-emerald-300/70">¿Qué deseas registrar o calcular ahora?</p>
          </div>
        </div>
        <button id="close-quick-sheet" class="size-7 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:text-white hover:bg-emerald-900 cursor-pointer">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <!-- Action Grid (6 Green Cards) -->
      <div class="grid grid-cols-2 gap-2.5 text-left">
        <!-- 1. Foto Comida (IA) -->
        <label for="camera-direct-input" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-[#10E775]/30 hover:border-[#10E775] flex flex-col justify-between cursor-pointer active:scale-95 transition-all">
          <div class="size-9 rounded-xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">photo_camera</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-[#10E775] uppercase">Foto Comida (IA)</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Analiza calorías, macros y sodio.</p>
          </div>
        </label>
        <input type="file" id="camera-direct-input" accept="image/*" capture="environment" class="hidden">

        <!-- 2. Agregar Ejercicio / Entreno -->
        <button id="quick-action-workout" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-400/30 hover:border-emerald-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">fitness_center</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-emerald-300 uppercase">Agregar Ejercicio</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Pesas, cardio, deportes y calorías.</p>
          </div>
        </button>

        <!-- 3. Registrar Peso y Medidas Corporales -->
        <button id="quick-action-weight" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-lime-500/30 hover:border-lime-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-9 rounded-xl bg-lime-500/20 text-lime-300 border border-lime-400/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">monitor_weight</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-lime-300 uppercase">Peso y Medidas</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Calcula IMC, % grasa, masa magra y más.</p>
          </div>
        </button>

        <!-- 4. Registrar Obetide -->
        <button id="quick-action-obetide" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-teal-500/30 hover:border-teal-400 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">vaccines</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-teal-300 uppercase">Dosis Obetide</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Control semanal GLP-1 y saciedad.</p>
          </div>
        </button>

        <!-- 5. Registrar Gasto / Ingreso Billetera -->
        <button id="quick-action-wallet" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 hover:border-[#10E775] flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-9 rounded-xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">account_balance_wallet</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-[#10E775] uppercase">Mi Billetera</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Registrar gasto o ingreso por categoría.</p>
          </div>
        </button>

        <!-- 6. Diario de Comidas -->
        <button id="quick-action-tracker" class="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-300 flex flex-col justify-between cursor-pointer active:scale-95 transition-all text-left">
          <div class="size-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-xl">restaurant</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-emerald-300 uppercase">Agregar Comida</h4>
            <p class="text-[10px] text-emerald-200/70 leading-tight mt-0.5">Buscar alimento o código de barras.</p>
          </div>
        </button>
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

  // Workout Action
  document.getElementById('quick-action-workout')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('workouts');
    setTimeout(() => {
      document.getElementById('open-add-workout-modal-btn')?.click();
    }, 150);
  });

  // Weight & Measurements Action
  document.getElementById('quick-action-weight')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('measurements');
    setTimeout(() => {
      document.getElementById('open-measurement-form-btn')?.click();
    }, 150);
  });

  // Obetide Action
  document.getElementById('quick-action-obetide')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('obetide');
    setTimeout(() => {
      document.getElementById('open-obetide-modal-btn')?.click();
    }, 150);
  });

  // Wallet Action
  document.getElementById('quick-action-wallet')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('wallet');
    setTimeout(() => {
      document.getElementById('open-expense-modal-btn')?.click();
    }, 150);
  });

  // Tracker Action
  document.getElementById('quick-action-tracker')?.addEventListener('click', () => {
    sheet.classList.add('hidden');
    window.router.navigate('tracker');
  });
};

// --- GLOBAL LOGOUT HANDLER ---
window.handleGlobalLogout = () => {
  window.showConfirm?.(
    '¿Cerrar Sesión?',
    'Saldrás de tu cuenta actual y volverás a la pantalla de acceso. Tu información personal permanecerá aislada y segura.',
    async () => {
      await logout();
      window.router.navigate('auth');
    }
  );
};

// --- AUTH & CLOUD SYNC LISTENERS (MULTI-DEVICE) ---
window.addEventListener('auth-changed', async (e) => {
  if (e.detail) {
    setLocalUserId(e.detail.userId);
    await initializeState();
    window.router.refresh();
  }
});

let lastCloudSyncAt = Date.now();
const syncFromCloudOnResume = async () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (Date.now() - lastCloudSyncAt < 10000) return;
  lastCloudSyncAt = Date.now();
  await initializeState();
  // Re-render current view if no modal is currently active
  const anyModalOpen = Array.from(document.querySelectorAll('[id$="-modal"], #quick-actions-sheet'))
    .some(el => !el.classList.contains('hidden'));
  if (!anyModalOpen) {
    window.router.refresh();
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncFromCloudOnResume();
  }
});

window.addEventListener('focus', () => {
  syncFromCloudOnResume();
});

// --- APP STARTUP ---
const startApp = async () => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.router.navigate('auth');
  } else {
    setLocalUserId(currentUser.userId);
    window.router.navigate('dashboard');
    await initializeState();
    window.router.refresh();
  }
};

startApp();
