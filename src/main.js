import './style.css';
import { initializeState } from './state';
import { renderDashboard, attachDashboardEvents } from './views/Dashboard';
import { renderTracker, attachTrackerEvents } from './views/Tracker';
import { renderWorkouts, attachWorkoutsEvents } from './views/Workouts';
import { renderProfile, attachProfileEvents } from './views/Profile';
import { renderInsights, attachInsightsEvents } from './views/Insights';
import { renderMeasurements, attachMeasurementsEvents } from './views/Measurements';
import { renderChatWidget, attachChatWidgetEvents } from './views/ChatWidget';
import { renderCalendar, attachCalendarEvents } from './views/CalendarView';

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
  'tracker': { render: renderTracker, attach: attachTrackerEvents },
  'workouts': { render: renderWorkouts, attach: attachWorkoutsEvents },
  'profile': { render: renderProfile, attach: attachProfileEvents },
  'insights': { render: renderInsights, attach: attachInsightsEvents },
  'measurements': { render: renderMeasurements, attach: attachMeasurementsEvents },
  'calendar': { render: renderCalendar, attach: attachCalendarEvents }
};

window.router = {
  navigate: (path) => {
    const route = routes[path];
    if (route) {
      app.innerHTML = route.render();
      if (route.attach) route.attach();
      initChat();
    }
  }
};

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
                        Eliminar
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

// --- APP STARTUP ---
const startApp = async () => {
  await initializeState();
  window.router.navigate('dashboard');
};

startApp();
