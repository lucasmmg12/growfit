import './style.css';
import { renderDashboard, attachDashboardEvents } from './views/Dashboard';
import { renderTracker, attachTrackerEvents } from './views/Tracker';
import { renderWorkouts, attachWorkoutsEvents } from './views/Workouts';
import { renderProfile, attachProfileEvents } from './views/Profile';
import { renderInsights } from './views/Insights';
import { renderMeasurements, attachMeasurementsEvents } from './views/Measurements';
import { renderChatWidget, attachChatWidgetEvents } from './views/ChatWidget'; // Import Chat

const app = document.querySelector('#app');

// --- CHAT INITIALIZATION ---
const initChat = () => {
  const chatRoot = document.createElement('div');
  chatRoot.id = 'chat-root';
  document.body.appendChild(chatRoot);
  chatRoot.innerHTML = renderChatWidget();
  attachChatWidgetEvents();
};
initChat(); // Run once

const routes = {
  'dashboard': { render: renderDashboard, attach: attachDashboardEvents },
  'tracker': { render: renderTracker, attach: attachTrackerEvents },
  'workouts': { render: renderWorkouts, attach: attachWorkoutsEvents },
  'profile': { render: renderProfile, attach: attachProfileEvents },
  'insights': { render: renderInsights, attach: null },
  'measurements': { render: renderMeasurements, attach: attachMeasurementsEvents }
};

// Main Entry Point with Router Logic

window.router = {
  navigate: (path) => {
    const route = routes[path] || routes['dashboard'];

    // 1. Render content
    app.innerHTML = route.render();

    // 2. Attach sub-view events (like form handling)
    if (route.attach) route.attach();

    // 3. Navigation is now handled inside each view or via sidebar
  }
};

// Initial Render
window.router.navigate('dashboard');

