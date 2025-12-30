import './style.css';
import { initializeState } from './state';
import { renderDashboard, attachDashboardEvents } from './views/Dashboard';
import { renderTracker, attachTrackerEvents } from './views/Tracker';
import { renderWorkouts, attachWorkoutsEvents } from './views/Workouts';
import { renderProfile, attachProfileEvents } from './views/Profile';
import { renderInsights } from './views/Insights';
import { renderMeasurements, attachMeasurementsEvents } from './views/Measurements';
import { renderChatWidget, attachChatWidgetEvents } from './views/ChatWidget';

const app = document.querySelector('#app');

// --- CHAT ---
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
  'insights': { render: renderInsights, attach: null },
  'measurements': { render: renderMeasurements, attach: attachMeasurementsEvents }
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
  const iconColor = type === 'success' ? 'text-primary' : type === 'error' ? 'text-red-500' : 'text-blue-400';
  const borderColor = type === 'success' ? 'border-primary/30' : type === 'error' ? 'border-red-500/30' : 'border-blue-500/30';

  content.innerHTML = `
        <div class="bg-[#1A261C] border ${borderColor} p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>
            <div class="relative z-10 flex flex-col items-center gap-4">
                <div class="bg-surface-dark p-4 rounded-full border border-white/5 ${iconColor}">
                    <span class="material-symbols-outlined text-4xl">${icon}</span>
                </div>
                <div>
                    <h3 class="text-2xl font-black text-white mb-2">${title}</h3>
                    <p class="text-text-secondary text-sm leading-relaxed">${message}</p>
                </div>
                <button onclick="window.hideAlert()" class="mt-2 w-full bg-primary text-[#102212] font-bold py-3.5 rounded-2xl hover:bg-[#0fd620] transition-all shadow-lg shadow-primary/20 transform active:scale-95">
                    Aceptar
                </button>
            </div>
        </div>
    `;
  modal.classList.remove('hidden');
};

window.hideAlert = () => {
  const modal = document.getElementById('global-modal');
  if (modal) modal.classList.add('hidden');
};

// --- APP STARTUP (NO AUTH) ---
const startApp = async () => {
  await initializeState();
  window.router.navigate('dashboard');
};

startApp();
