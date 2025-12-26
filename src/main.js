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

// --- APP STARTUP (NO AUTH) ---
const startApp = async () => {
  // 1. Mostrar carga...
  app.innerHTML = `<div class="flex h-screen items-center justify-center bg-[#102212] text-primary animate-pulse font-bold">SYNERGYZING...</div>`;

  // 2. Cargar datos (Nube o Local)
  await initializeState();

  // 3. Iniciar App
  window.router.navigate('dashboard');
};

startApp();
