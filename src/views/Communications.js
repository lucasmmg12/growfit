import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import { getCurrentUser, isAdminUser, listAllUsersAdmin, adminSaveUser, adminDeleteUser } from '../services/auth';
import { getArgentinaDate } from '../state';
import {
    CIRCLE_META,
    loadCommunicationsData,
    clearAllCommunicationsData,
    getBuilderBotConfig,
    saveBuilderBotConfig,
    sendBuilderBotWhatsApp,
    ingestBuilderBotWebhookLocal,
    updateContactCircleAdmin,
    analyzeContactConversationWithAI,
    buildGoogleCalendarLink,
    downloadCalendarICS,
    buildDayByDaySummaries
} from '../services/builderbot';

let cachedCommsStore = null;
let selectedPeriod = 'today'; // 'today' | 'week' | 'month'
let selectedCircle = 'all';   // 'all' | 'hijos' | 'novia' | 'trabajo' | 'amigos' | 'otros'
let activeContactViewTab = {}; // { [phone]: 'short' | 'detailed' | 'messages' }
let activeMainSection = 'assistant'; // 'assistant' | 'users' | 'webhook'

const filterMessagesByPeriod = (messages = [], period = 'today') => {
    const todayStr = getArgentinaDate();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayDate = new Date(ty, tm - 1, td);

    return messages.filter(m => {
        const mDateStr = m.message_date || (m.created_at ? m.created_at.split('T')[0] : todayStr);
        if (period === 'today') {
            return mDateStr === todayStr;
        }
        const [my, mm, md] = mDateStr.split('-').map(Number);
        const mDate = new Date(my, mm - 1, md);
        const diffDays = Math.round((todayDate - mDate) / (1000 * 60 * 60 * 24));
        if (period === 'week') return diffDays >= 0 && diffDays <= 7;
        if (period === 'month') return diffDays >= 0 && diffDays <= 31;
        return true;
    });
};

export const renderCommunications = () => {
    const user = getCurrentUser();
    if (!isAdminUser(user)) {
        setTimeout(() => window.router?.navigate('dashboard'), 10);
        return `
            <div class="flex h-screen w-full items-center justify-center bg-[#050C09] text-white p-6">
                <div class="white-card p-6 text-center max-w-md border border-emerald-500/30">
                    <span class="material-symbols-outlined text-4xl text-[#10E775]">lock</span>
                    <h3 class="text-lg font-display font-bold mt-2">Acceso Exclusivo Administrador</h3>
                    <p class="text-xs text-emerald-300/70 mt-1">Solo el usuario lmarinero tiene permisos para acceder a Comunicaciones y Gestión de Usuarios.</p>
                </div>
            </div>
        `;
    }

    const store = cachedCommsStore || {
        botStatus: { status: 'online', bot_id: 'f7806984-3538-457b-b4a3-84c97293583b' },
        contacts: [],
        messages: []
    };

    const { botId, webhookUrl, edgeFunctionUrl, apiKey } = getBuilderBotConfig();
    const periodMessages = filterMessagesByPeriod(store.messages || [], selectedPeriod);
    const dailyTimeline = buildDayByDaySummaries(periodMessages, store.contacts || []);

    // Contacts active in the selected period (or all contacts if none in today filter yet)
    const activePhonesInPeriod = new Set(periodMessages.map(m => m.phone));
    let filteredContacts = (store.contacts || []).filter(c => {
        const matchesCircle = selectedCircle === 'all' ? true : c.circle === selectedCircle;
        const matchesPeriod = selectedPeriod === 'today'
            ? (activePhonesInPeriod.has(c.phone) || store.contacts.length <= 6)
            : true;
        return matchesCircle && matchesPeriod;
    });

    // Sort by priority of Vital Circle (Hijos -> Novia -> Trabajo -> Amigos -> Otros) and recency
    filteredContacts.sort((a, b) => {
        const pA = CIRCLE_META[a.circle]?.priority || 5;
        const pB = CIRCLE_META[b.circle]?.priority || 5;
        if (pA !== pB) return pA - pB;
        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

    // Counts per Vital Circle
    const circleCounts = {
        hijos: (store.contacts || []).filter(c => c.circle === 'hijos').length,
        novia: (store.contacts || []).filter(c => c.circle === 'novia').length,
        trabajo: (store.contacts || []).filter(c => c.circle === 'trabajo').length,
        amigos: (store.contacts || []).filter(c => c.circle === 'amigos').length
    };

    // Collect all pending promises and calendar events across important circles
    const allPromises = [];
    const allCalendarEvents = [];
    (store.contacts || []).forEach(c => {
        if (['hijos', 'novia', 'trabajo', 'amigos'].includes(c.circle)) {
            (c.pending_promises || []).forEach(p => {
                allPromises.push({ contact: c.name, phone: c.phone, circle: c.circle, text: p });
            });
            (c.detected_calendar_events || []).forEach(ev => {
                allCalendarEvents.push({ ...ev, contact: c.name, phone: c.phone, circle: c.circle });
            });
        }
    });

    const periodLabelMap = {
        today: 'Hoy (' + getArgentinaDate() + ')',
        week: 'Esta Semana (Últimos 7 días)',
        month: 'Este Mes (Últimos 30 días)'
    };

    const botStatusColor = store.botStatus?.status === 'online'
        ? 'text-[#10E775] bg-[#10E775]/15 border-[#10E775]/40'
        : store.botStatus?.status === 'require_action'
        ? 'text-lime-300 bg-lime-400/15 border-lime-400/40'
        : 'text-teal-300 bg-teal-500/15 border-teal-500/40';

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('communications')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Comunicaciones IA')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- HERO CABECERA: ASISTENTE PERSONAL DE LUCAS & CONTROL ADMIN (lmarinero) -->
                    <div class="white-card card-glow-emerald p-6 shadow-2xl relative overflow-hidden">
                        <div class="pointer-events-none select-none absolute -right-4 -top-6 text-[#10E775] opacity-[0.08] rotate-12">
                            <span class="material-symbols-outlined text-[140px]">support_agent</span>
                        </div>

                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-emerald-500/20">
                            <div>
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span class="badge-emerald text-[10px]">👑 Exclusivo Admin · lmarinero</span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${botStatusColor}">
                                        ● BuilderBot ${store.botStatus?.status === 'online' ? 'CONECTADO' : store.botStatus?.status === 'require_action' ? 'REQUIERE QR' : 'DESCONECTADO'}
                                    </span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10E775]/15 text-[#10E775] border border-[#10E775]/30">
                                        📅 Google Calendar: lucasmmarinerosanarg@gmail.com
                                    </span>
                                </div>
                                <h2 class="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                                    Comunicaciones & Asistente Personal de Lucas
                                </h2>
                                <p class="text-xs text-emerald-300/75 mt-0.5">
                                    Inteligencia de WhatsApp en tiempo real para tus 4 Círculos Vitales: <strong>👶 Hijos · ❤️ Novia · 💼 Trabajo · 🤝 Amigos</strong>
                                </p>
                            </div>

                            <!-- Selector de Sección Principal: Asistente WhatsApp / Webhook & API / Gestión de Usuarios -->
                            <div class="flex flex-wrap items-center gap-2">
                                <button data-section="assistant" class="comm-section-tab px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${activeMainSection === 'assistant' ? 'btn-emerald' : 'bg-[#040B08]/90 text-emerald-300 border border-emerald-500/25 hover:text-white'}">
                                    <span class="material-symbols-outlined text-base">forum</span>
                                    <span>Asistente & Chats</span>
                                </button>
                                <button data-section="webhook" class="comm-section-tab px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${activeMainSection === 'webhook' ? 'btn-emerald' : 'bg-[#040B08]/90 text-emerald-300 border border-emerald-500/25 hover:text-white'}">
                                    <span class="material-symbols-outlined text-base">webhook</span>
                                    <span>Webhook & BuilderBot</span>
                                </button>
                                <button data-section="users" class="comm-section-tab px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${activeMainSection === 'users' ? 'btn-emerald' : 'bg-[#040B08]/90 text-emerald-300 border border-emerald-500/25 hover:text-white'}">
                                    <span class="material-symbols-outlined text-base">manage_accounts</span>
                                    <span>Gestión Usuarios</span>
                                </button>
                            </div>
                        </div>

                        <!-- Filtros de Período (Hoy / Esta Semana / Este Mes) & Círculo Vital -->
                        <div class="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mr-1">Círculo Vital:</span>
                                ${[
                                    { id: 'all', label: '🌟 Todos', count: (store.contacts || []).length },
                                    { id: 'hijos', label: '👶 Hijos', count: circleCounts.hijos },
                                    { id: 'novia', label: '❤️ Novia', count: circleCounts.novia },
                                    { id: 'trabajo', label: '💼 Trabajo', count: circleCounts.trabajo },
                                    { id: 'amigos', label: '🤝 Amigos', count: circleCounts.amigos },
                                    { id: 'otros', label: '📁 Otros', count: (store.contacts || []).filter(c => c.circle === 'otros').length }
                                ].map(tab => `
                                    <button type="button" data-circle="${tab.id}" class="comm-circle-filter px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${selectedCircle === tab.id ? 'bg-[#10E775] text-[#04120B] shadow-md' : 'bg-[#040B08]/85 text-emerald-200 border border-emerald-500/25 hover:border-[#10E775]/50'}">
                                        ${tab.label} <span class="font-mono text-[10px] opacity-80">(${tab.count})</span>
                                    </button>
                                `).join('')}
                            </div>

                            <div class="flex items-center gap-1.5 bg-[#040B08]/90 p-1 rounded-xl border border-emerald-500/25">
                                ${[
                                    { id: 'today', label: '📅 Hoy' },
                                    { id: 'week', label: '📆 Esta Semana' },
                                    { id: 'month', label: '🗓️ Este Mes' }
                                ].map(p => `
                                    <button type="button" data-period="${p.id}" class="comm-period-filter px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${selectedPeriod === p.id ? 'bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/40' : 'text-emerald-300/70 hover:text-white'}">
                                        ${p.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    ${activeMainSection === 'users' ? renderAdminUsersSection() : ''}
                    ${activeMainSection === 'webhook' ? renderWebhookConfigSection(store, botId, webhookUrl, edgeFunctionUrl, apiKey) : ''}

                    ${activeMainSection === 'assistant' ? `
                        <!-- BRIEFING EJECUTIVO DE LUCAS (HOY / SEMANA / MES) + RADAR DE PROMESAS + GOOGLE CALENDAR -->
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <!-- Resumen Ejecutivo IA del Período (7 Cols) -->
                            <div class="lg:col-span-7 white-card p-5 md:p-6 border border-[#10E775]/35 flex flex-col justify-between">
                                <div>
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-emerald-500/15">
                                        <div class="flex items-center gap-2.5">
                                            <div class="size-10 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center text-[#10E775]">
                                                <span class="material-symbols-outlined text-xl">auto_awesome</span>
                                            </div>
                                            <div>
                                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-lime-400">Briefing Ejecutivo · ${periodLabelMap[selectedPeriod]}</span>
                                                <h3 class="text-base font-display font-black text-white uppercase">¿Qué pasó en tus charlas importantes?</h3>
                                            </div>
                                        </div>
                                        <button id="comm-listen-briefing-btn" class="px-3 py-1.5 rounded-xl bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/40 text-[#10E775] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                                            <span class="material-symbols-outlined text-base">volume_up</span>
                                            <span>🎧 Escuchar Resumen</span>
                                        </button>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="executive-briefing-cards">
                                        ${['hijos', 'novia', 'trabajo', 'amigos'].map(cKey => {
                                            const meta = CIRCLE_META[cKey];
                                            const cContacts = (store.contacts || []).filter(c => c.circle === cKey);
                                            const topSummary = cContacts[0]?.short_summary || 'Sin mensajes críticos pendientes en este círculo.';
                                            return `
                                                <div class="p-3.5 rounded-2xl bg-[#040B08]/80 border border-emerald-500/20 flex flex-col gap-1">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-xs font-display font-extrabold text-white">${meta.emoji} ${meta.label}</span>
                                                        <span class="text-[10px] font-mono text-[#10E775] font-bold">${cContacts.length} chat(s)</span>
                                                    </div>
                                                    <p class="text-xs text-emerald-200/85 leading-relaxed mt-1">${topSummary}</p>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>

                                <!-- Promesas y Tareas Detectadas en tus Chats -->
                                <div class="mt-4 pt-3 border-t border-emerald-500/15">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 block mb-2">
                                        📌 Compromisos & Pendientes Detectados por tu Asistente (${allPromises.length}):
                                    </span>
                                    <div class="flex flex-wrap gap-2">
                                        ${allPromises.length ? allPromises.map(p => `
                                            <span class="px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-xs text-emerald-100 flex items-center gap-1.5">
                                                <span>${CIRCLE_META[p.circle]?.emoji || '📌'}</span>
                                                <strong class="text-[#10E775]">${p.contact}:</strong>
                                                <span>${p.text}</span>
                                            </span>
                                        `).join('') : `<span class="text-xs text-emerald-300/60">No hay promesas pendientes sin cumplir.</span>`}
                                    </div>
                                </div>
                            </div>

                            <!-- Agenda Inteligente & Google Calendar Sync (5 Cols) -->
                            <div class="lg:col-span-5 white-card p-5 md:p-6 border border-[#34D399]/35 flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center justify-between pb-3 mb-4 border-b border-emerald-500/15">
                                        <div class="flex items-center gap-2.5">
                                            <div class="size-10 rounded-2xl bg-[#34D399]/15 border border-[#34D399]/35 flex items-center justify-center text-[#34D399]">
                                                <span class="material-symbols-outlined text-xl">calendar_month</span>
                                            </div>
                                            <div>
                                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#34D399]">Google Calendar Conectado</span>
                                                <h3 class="text-base font-display font-black text-white uppercase">Eventos Detectados en WhatsApp</h3>
                                            </div>
                                        </div>
                                        <a href="https://calendar.google.com/calendar/u/0/r?authuser=lucasmmarinerosanarg@gmail.com" target="_blank" rel="noopener" class="px-2.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/30 text-[11px] font-bold text-[#10E775] hover:text-white flex items-center gap-1">
                                            <span>Abrir Calendar</span>
                                            <span class="material-symbols-outlined text-xs">open_in_new</span>
                                        </a>
                                    </div>

                                    <div class="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                        ${allCalendarEvents.length ? allCalendarEvents.map((ev, evIdx) => `
                                            <div class="p-3 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25 flex items-center justify-between gap-3">
                                                <div class="min-w-0">
                                                    <span class="text-[10px] font-mono font-bold text-lime-400 block">${ev.date || getArgentinaDate()} · ${ev.startTime || '18:00'} hs</span>
                                                    <h4 class="text-xs font-bold text-white truncate mt-0.5">${ev.title}</h4>
                                                    <span class="text-[10px] text-emerald-300/70">De: ${ev.contact}</span>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    <button type="button" class="comm-download-ics-btn px-2.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/30 text-[10px] font-bold text-lime-300 hover:text-white cursor-pointer" data-ev-idx="${evIdx}" title="Descargar archivo .ICS">
                                                        .ICS
                                                    </button>
                                                    <a href="${buildGoogleCalendarLink(ev)}" target="_blank" rel="noopener" class="btn-emerald px-3 py-1.5 text-[10px] font-extrabold uppercase flex items-center gap-1">
                                                        <span class="material-symbols-outlined text-sm">event_available</span>
                                                        Agendar
                                                    </a>
                                                </div>
                                            </div>
                                        `).join('') : `
                                            <p class="text-xs text-emerald-300/60 py-6 text-center">No se detectaron eventos con fecha/hora en las charlas actuales.</p>
                                        `}
                                    </div>
                                </div>

                                <!-- Crear Evento Rápido en Google Calendar -->
                                <div class="mt-4 pt-3 border-t border-emerald-500/15">
                                    <label class="text-[10px] font-bold uppercase text-emerald-300/80 block mb-1.5">Agendar recordatorio rápido en Google Calendar:</label>
                                    <div class="flex gap-2">
                                        <input id="comm-quick-gcal-title" type="text" placeholder="Ej: Buscar a los chicos 17:30hs..." class="flex-1 rounded-xl px-3 py-1.5 text-xs text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                                        <input id="comm-quick-gcal-time" type="time" value="18:00" class="rounded-xl px-2 py-1.5 text-xs font-mono text-[#10E775] bg-[#040B08] border border-emerald-500/30 outline-none" />
                                        <button id="comm-quick-gcal-btn" class="btn-emerald px-3 py-1.5 text-[11px] font-extrabold uppercase cursor-pointer">
                                            + Calendar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- RESUMEN DÍA A DÍA: QUIÉN ESCRIBIÓ Y QUÉ QUISO EN CADA JORNADA -->
                        <div class="white-card p-5 md:p-6 border border-emerald-500/25">
                            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-emerald-500/15">
                                <div class="flex items-center gap-2.5">
                                    <div class="size-9 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center text-[#10E775]">
                                        <span class="material-symbols-outlined text-lg">today</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#10E775]">Bitácora Cronológica</span>
                                        <h3 class="text-base font-display font-black text-white uppercase">Resumen Día a Día: Quién Escribió y Qué Quiso (${periodLabelMap[selectedPeriod]})</h3>
                                    </div>
                                </div>
                                <span class="text-xs font-mono text-emerald-300/75">${dailyTimeline.length} jornada(s) con actividad</span>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${dailyTimeline.length ? dailyTimeline.map(day => `
                                    <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/20 flex flex-col gap-2.5">
                                        <div class="flex items-center justify-between pb-2 border-b border-emerald-500/15">
                                            <span class="text-xs font-mono font-extrabold text-lime-400">📅 ${day.date === getArgentinaDate() ? `HOY (${day.date})` : day.date}</span>
                                            <span class="text-[10px] font-mono text-emerald-300/70">${day.items.length} contacto(s)</span>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            ${day.items.map(it => `
                                                <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/15 flex flex-col gap-1">
                                                    <div class="flex items-center justify-between gap-1">
                                                        <span class="text-xs font-bold text-white truncate">${CIRCLE_META[it.circle]?.emoji || '💬'} ${it.name}</span>
                                                        <span class="text-[9px] font-mono text-emerald-400">+${it.phone}</span>
                                                    </div>
                                                    <p class="text-[11px] text-emerald-200/85 leading-snug">
                                                        <strong class="text-[#10E775]">Quiso:</strong> "${it.whatTheyWanted.slice(0, 90)}"
                                                    </p>
                                                    ${it.whatLucasReplied ? `
                                                        <p class="text-[10px] text-lime-300/85 leading-snug">
                                                            <strong>Lucas respondió:</strong> "${it.whatLucasReplied.slice(0, 80)}"
                                                        </p>
                                                    ` : ''}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('') : `<p class="text-xs text-emerald-300/60 col-span-full py-4 text-center">Sin actividad registrada en el período seleccionado.</p>`}
                            </div>
                        </div>

                        <!-- LISTADO DE CONTACTOS POR {name} Y {from} CON 3 VISTAS (RESUMEN CORTO, ANÁLISIS DETALLADO, TODOS LOS MENSAJES) -->
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <h3 class="text-lg font-display font-black text-white uppercase tracking-tight">
                                    Conversaciones Reales por Contacto y Número (${filteredContacts.length})
                                </h3>
                                <div class="flex flex-wrap items-center gap-2">
                                    <button id="comm-sync-now-btn" class="px-3.5 py-2 rounded-2xl bg-[#040B08] border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                                        <span class="material-symbols-outlined text-base">sync</span>
                                        Sincronizar
                                    </button>
                                    ${(store.contacts || []).length > 0 ? `
                                        <button id="comm-clear-all-btn" class="px-3.5 py-2 rounded-2xl bg-emerald-950/70 border border-lime-400/30 text-lime-300 hover:text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                                            <span class="material-symbols-outlined text-base">delete_sweep</span>
                                            Limpiar Bandeja
                                        </button>
                                    ` : ''}
                                    <button id="comm-new-message-modal-btn" class="btn-emerald px-4 py-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                                        <span class="material-symbols-outlined text-base">send</span>
                                        + Enviar Nuevo WhatsApp (BuilderBot)
                                    </button>
                                </div>
                            </div>

                            ${filteredContacts.length > 0
                                ? filteredContacts.map(contact => renderContactAssistantCard(contact, store.messages || [])).join('')
                                : `
                                <div class="white-card p-8 border border-emerald-500/25 text-center flex flex-col items-center gap-3">
                                    <div class="size-12 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center text-[#10E775]">
                                        <span class="material-symbols-outlined text-2xl">webhook</span>
                                    </div>
                                    <h4 class="text-base font-display font-black text-white uppercase">Sin mensajes recibidos aún desde BuilderBot</h4>
                                    <p class="text-xs text-emerald-300/75 max-w-xl leading-relaxed">
                                        La bandeja está 100% limpia (sin datos de demostración). En cuanto BuilderBot envíe eventos reales a tu webhook
                                        <code class="text-[#10E775] font-mono px-1.5 py-0.5 rounded bg-[#040B08]">${webhookUrl}</code>
                                        o envíes un mensaje desde aquí, aparecerán automáticamente tus conversaciones reales.
                                    </p>
                                </div>
                                `
                            }
                        </div>
                    ` : ''}

                </div>
            </div>

            ${renderBottomNav('communications')}
        </main>

        <!-- Modal para Enviar Nuevo WhatsApp Directo -->
        <div id="comm-send-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"></div>
    </div>
    `;
};

const renderContactAssistantCard = (contact, allMessages) => {
    const circleInfo = CIRCLE_META[contact.circle] || CIRCLE_META.otros;
    const activeTab = activeContactViewTab[contact.phone] || 'short';
    const contactMessages = allMessages.filter(m => m.phone === contact.phone);
    const incomingCount = contactMessages.filter(m => m.direction === 'incoming').length;
    const outgoingCount = contactMessages.filter(m => m.direction === 'outgoing').length;

    return `
        <div class="white-card p-5 border border-emerald-500/25 shadow-xl flex flex-col gap-4">
            <!-- Cabecera del Contacto ({name} + {from} + Selector de Círculo) -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
                <div class="flex items-center gap-3">
                    <div class="size-12 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center text-2xl shrink-0">
                        ${circleInfo.emoji}
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="text-base font-display font-black text-white">${contact.name}</h4>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#040B08] text-emerald-300 border border-emerald-500/25">
                                +{from}: ${contact.phone}
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${circleInfo.badgeClass}">
                                ${circleInfo.emoji} ${circleInfo.label}
                            </span>
                        </div>
                        <p class="text-[11px] text-emerald-300/70 mt-0.5">
                            Recibidos: <strong class="text-[#10E775] font-mono">${incomingCount}</strong> · Enviados por Lucas: <strong class="text-lime-400 font-mono">${outgoingCount}</strong> · Último: ${contact.last_message_at ? new Date(contact.last_message_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Hoy'}
                        </p>
                    </div>
                </div>

                <!-- Cambiar Círculo Vital + Re-analizar con IA -->
                <div class="flex flex-wrap items-center gap-2">
                    <select class="comm-change-circle-select rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#10E775] bg-[#040B08] border border-emerald-500/30 outline-none cursor-pointer" data-phone="${contact.phone}">
                        ${Object.values(CIRCLE_META).map(c => `<option value="${c.id}" ${c.id === contact.circle ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}
                    </select>
                    <button type="button" class="comm-reanalyze-ai-btn px-3 py-1.5 rounded-xl bg-[#10E775]/15 hover:bg-[#10E775]/25 border border-[#10E775]/35 text-[#10E775] text-xs font-extrabold flex items-center gap-1 cursor-pointer" data-phone="${contact.phone}">
                        <span class="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>Resumir IA</span>
                    </button>
                </div>
            </div>

            <!-- Selector de las 3 Vistas Solicitadas por Contacto -->
            <div class="grid grid-cols-3 gap-1.5 p-1 bg-[#040B08] rounded-xl border border-emerald-500/25 text-xs font-bold">
                <button type="button" class="comm-contact-tab py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${activeTab === 'short' ? 'bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/45' : 'text-emerald-300/70 hover:text-white'}" data-phone="${contact.phone}" data-tab="short">
                    <span class="material-symbols-outlined text-sm">bolt</span>
                    <span>1. Resumen Corto</span>
                </button>
                <button type="button" class="comm-contact-tab py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${activeTab === 'detailed' ? 'bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/45' : 'text-emerald-300/70 hover:text-white'}" data-phone="${contact.phone}" data-tab="detailed">
                    <span class="material-symbols-outlined text-sm">psychology</span>
                    <span>2. Análisis Detallado</span>
                </button>
                <button type="button" class="comm-contact-tab py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${activeTab === 'messages' ? 'bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/45' : 'text-emerald-300/70 hover:text-white'}" data-phone="${contact.phone}" data-tab="messages">
                    <span class="material-symbols-outlined text-sm">chat</span>
                    <span>3. Todos los Mensajes (${contactMessages.length})</span>
                </button>
            </div>

            <!-- Contenido Dinámico según la Pestaña Activa -->
            ${activeTab === 'short' ? `
                <div class="p-4 rounded-2xl bg-[#040B08]/80 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#10E775] block mb-1">Qué escribió y qué necesitó hoy:</span>
                        <p class="text-sm font-semibold text-white leading-relaxed">${contact.short_summary || contact.last_message_preview}</p>
                    </div>
                    ${(contact.detected_calendar_events || []).length > 0 ? `
                        <a href="${buildGoogleCalendarLink(contact.detected_calendar_events[0])}" target="_blank" rel="noopener" class="btn-emerald px-3.5 py-2 text-xs font-extrabold uppercase shrink-0 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-base">event</span>
                            Agendar en Calendar
                        </a>
                    ` : ''}
                </div>
            ` : ''}

            ${activeTab === 'detailed' ? `
                <div class="p-4 rounded-2xl bg-[#040B08]/85 border border-[#10E775]/30 flex flex-col gap-3">
                    <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 block mb-1">Análisis Profundo del Asistente de Lucas:</span>
                        <p class="text-xs text-emerald-100 leading-relaxed">${contact.detailed_analysis}</p>
                    </div>
                    ${(contact.pending_promises || []).length > 0 ? `
                        <div class="pt-2 border-t border-emerald-500/15">
                            <span class="text-[10px] font-bold uppercase text-[#10E775] block mb-1">Compromisos / Acciones Pendientes:</span>
                            <ul class="list-disc pl-4 text-xs text-emerald-200 space-y-1">
                                ${contact.pending_promises.map(pr => `<li>${pr}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div class="pt-2 border-t border-emerald-500/15">
                        <span class="text-[10px] font-bold uppercase text-emerald-300/80 block mb-1.5">⚡ Respuestas Rápidas Sugeridas (1 clic para responder por WhatsApp):</span>
                        <div class="flex flex-wrap gap-2">
                            ${(contact.smart_replies && contact.smart_replies.length ? contact.smart_replies : [
                                '¡Recibido! Ya lo agendo y te confirmo en un rato.',
                                'Perfecto, contá conmigo a esa hora.',
                                '¡Gracias por avisar! Salgo del Sanatorio y te escribo.'
                            ]).map(sr => `
                                <button type="button" class="comm-smart-reply-chip px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-[#10E775]/20 border border-emerald-500/30 text-[11px] font-semibold text-emerald-100 hover:text-white cursor-pointer transition-all" data-phone="${contact.phone}" data-reply="${sr.replace(/"/g, '&quot;')}">
                                    💬 "${sr}"
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}

            ${activeTab === 'messages' ? `
                <div class="p-4 rounded-2xl bg-[#040B08]/90 border border-emerald-500/30 flex flex-col gap-3">
                    <div class="flex flex-col gap-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        ${contactMessages.map(m => {
                            const isOut = m.direction === 'outgoing';
                            const isCall = m.direction === 'call';
                            return `
                                <div class="flex flex-col ${isOut ? 'items-end' : 'items-start'}">
                                    <div class="max-w-[85%] p-3 rounded-2xl ${isCall ? 'bg-lime-400/15 border border-lime-400/40 text-lime-200' : isOut ? 'bg-[#10E775]/20 border border-[#10E775]/45 text-white' : 'bg-emerald-950/70 border border-emerald-500/25 text-emerald-100'}">
                                        <div class="flex items-center justify-between gap-3 mb-1">
                                            <span class="text-[10px] font-extrabold ${isOut ? 'text-[#10E775]' : 'text-lime-400'}">
                                                ${isOut ? '📤 Lucas (Enviado · message.outgoing)' : isCall ? '📞 Llamada (message.calling)' : `📥 ${contact.name} (Recibido · message.incoming)`}
                                            </span>
                                            <span class="text-[9px] font-mono text-emerald-300/60">
                                                ${m.created_at ? new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p class="text-xs leading-relaxed">${m.body || ''}</p>
                                        ${m.ai_voice ? `<p class="mt-1.5 p-2 rounded-xl bg-[#040B08]/70 text-[11px] text-lime-300 font-mono">🎙️ ${m.ai_voice}</p>` : ''}
                                        ${m.ai_image ? `<p class="mt-1.5 p-2 rounded-xl bg-[#040B08]/70 text-[11px] text-teal-300 font-mono">🖼️ ${m.ai_image}</p>` : ''}
                                        ${m.media_url ? `<a href="${m.media_url}" target="_blank" rel="noopener" class="inline-block mt-1 text-[10px] text-[#10E775] underline">📎 Ver archivo multimedia ({urlTempFile})</a>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Barra para Responder por WhatsApp vía BuilderBot API v2 -->
                    <div class="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
                        <input type="text" class="comm-inline-reply-input flex-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-white bg-emerald-950/50 border border-emerald-500/30 outline-none focus:border-[#10E775]" data-phone="${contact.phone}" placeholder="Escribir respuesta de WhatsApp a ${contact.name} ({from}: ${contact.phone})..." />
                        <button type="button" class="comm-inline-reply-btn btn-emerald px-4 py-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer shrink-0" data-phone="${contact.phone}" data-name="${contact.name}" data-circle="${contact.circle}">
                            <span class="material-symbols-outlined text-sm">send</span>
                            Enviar WhatsApp
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
};

const renderWebhookConfigSection = (store, botId, webhookUrl, edgeFunctionUrl, apiKey) => {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Configuración de BuilderBot API v2 & Webhook Edge Function (7 Cols) -->
            <div class="lg:col-span-7 white-card p-6 border border-[#10E775]/35 flex flex-col gap-4">
                <div class="flex items-center justify-between pb-3 border-b border-emerald-500/15">
                    <div>
                        <span class="badge-emerald text-[10px]">BuilderBot Cloud API v2</span>
                        <h3 class="text-lg font-display font-black text-white uppercase mt-1">Configuración de Webhook & Credenciales</h3>
                    </div>
                    <span class="material-symbols-outlined text-2xl text-[#10E775]">api</span>
                </div>

                <div class="p-3.5 rounded-2xl bg-[#040B08]/90 border border-emerald-500/30 flex flex-col gap-2.5">
                    <div>
                        <label class="text-[10px] font-extrabold uppercase text-lime-400 block mb-1">
                            1A. URL Webhook Activa en Vercel (Lista para pegar en BuilderBot → Webhooks):
                        </label>
                        <div class="flex gap-2 items-center">
                            <input id="comm-webhook-url-display" type="text" readonly value="${webhookUrl}" class="flex-1 rounded-xl px-3 py-2 text-xs font-mono text-[#10E775] bg-emerald-950/40 border border-emerald-500/30 outline-none" />
                            <button id="comm-copy-webhook-btn" class="btn-emerald px-3.5 py-2 text-xs font-extrabold uppercase cursor-pointer">Copiar URL</button>
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/80 block mb-1">
                            1B. URL Supabase Edge Function (<code>supabase/functions/builderbot-webhook/index.ts</code>):
                        </label>
                        <input type="text" readonly value="${edgeFunctionUrl || ''}" class="w-full rounded-xl px-3 py-1.5 text-[11px] font-mono text-emerald-300/80 bg-emerald-950/25 border border-emerald-500/20 outline-none" />
                    </div>
                    <p class="text-[11px] text-emerald-300/70">
                        Soporta todos los eventos de tus capturas: <code>message.incoming</code>, <code>message.outgoing</code>, <code>message.calling</code>, <code>status.online</code>, <code>status.require_action</code> y <code>status.disconnect</code>.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/80 block mb-1">ID del Bot BuilderBot</label>
                        <input id="comm-bot-id-input" type="text" value="${botId}" class="w-full rounded-xl px-3 py-2 text-xs font-mono text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/80 block mb-1">Header x-api-builderbot (API Key)</label>
                        <input id="comm-api-key-input" type="password" value="${apiKey}" placeholder="Pegar tu clave x-api-builderbot..." class="w-full rounded-xl px-3 py-2 text-xs font-mono text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                    </div>
                </div>

                <button id="comm-save-bb-config-btn" class="btn-emerald py-2.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                    Guardar Configuración de BuilderBot
                </button>
            </div>

            <!-- Simulador de Eventos Webhook en Vivo (5 Cols) -->
            <div class="lg:col-span-5 white-card p-6 border border-[#34D399]/35 flex flex-col justify-between">
                <div>
                    <span class="badge-emerald text-[10px]">Pruebas en Tiempo Real</span>
                    <h3 class="text-lg font-display font-black text-white uppercase mt-1">Simular Eventos Webhook BuilderBot</h3>
                    <p class="text-xs text-emerald-300/75 mt-1">
                        Dispara cualquiera de los eventos de BuilderBot para verificar cómo los procesa el Asistente:
                    </p>

                    <div class="flex flex-col gap-2.5 mt-3">
                        <select id="sim-wa-event" class="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#10E775] bg-[#040B08] border border-emerald-500/30 outline-none">
                            <option value="message.incoming">📥 message.incoming (Mensaje Recibido)</option>
                            <option value="message.outgoing">📤 message.outgoing (Mensaje Enviado por Bot/Lucas)</option>
                            <option value="message.calling">📞 message.calling (Llamada Entrante)</option>
                            <option value="status.ready">🟢 status.ready / status.online</option>
                            <option value="status.require_action">🟡 status.require_action (Requiere QR)</option>
                            <option value="status.disconnect">🔴 status.disconnect (Bot Desconectado)</option>
                        </select>
                        <input id="sim-wa-name" type="text" value="" placeholder="{name} Nombre del contacto en WhatsApp" class="w-full rounded-xl px-3 py-2 text-xs text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                        <input id="sim-wa-phone" type="text" value="" placeholder="{from} Número de teléfono (ej. 549264...)" class="w-full rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 bg-[#040B08] border border-emerald-500/30 outline-none" />
                        <textarea id="sim-wa-body" rows="2" class="w-full rounded-xl px-3 py-2 text-xs text-white bg-[#040B08] border border-emerald-500/30 outline-none" placeholder="{body} Contenido del mensaje..."></textarea>
                    </div>
                </div>

                <button id="comm-simulate-webhook-btn" class="btn-emerald w-full py-3 mt-4 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                    ⚡ Disparar Evento Webhook
                </button>
            </div>
        </div>
    `;
};

const renderAdminUsersSection = () => {
    return `
        <div class="white-card p-6 border border-[#10E775]/35 flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                <div>
                    <span class="badge-emerald text-[10px]">👑 Panel Maestro de Usuarios · Solo lmarinero</span>
                    <h3 class="text-lg font-display font-black text-white uppercase mt-1">Gestión de Usuarios y Permisos del Sistema</h3>
                </div>
            </div>

            <!-- Crear o Actualizar Usuario -->
            <form id="admin-user-form" class="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                <div>
                    <label class="text-[10px] font-bold uppercase text-emerald-300/70">Usuario (login)</label>
                    <input id="admin-u-username" type="text" required placeholder="ej. mgarcia" class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-mono text-white bg-emerald-950/50 border border-emerald-500/30 outline-none" />
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase text-emerald-300/70">Nombre Visible</label>
                    <input id="admin-u-display" type="text" required placeholder="ej. Martín García" class="w-full mt-1 rounded-xl px-3 py-2 text-xs text-white bg-emerald-950/50 border border-emerald-500/30 outline-none" />
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase text-emerald-300/70">Contraseña</label>
                    <input id="admin-u-password" type="text" required placeholder="Clave de acceso" class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-mono text-lime-300 bg-emerald-950/50 border border-emerald-500/30 outline-none" />
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase text-emerald-300/70">Rol</label>
                    <select id="admin-u-role" class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-bold text-white bg-emerald-950/50 border border-emerald-500/30 outline-none">
                        <option value="user">Usuario Estándar</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div class="flex items-end">
                    <button type="submit" class="w-full btn-emerald py-2.5 text-xs font-extrabold uppercase cursor-pointer">
                        + Guardar Usuario
                    </button>
                </div>
            </form>

            <!-- Tabla de Usuarios Registrados -->
            <div id="admin-users-list-container" class="flex flex-col gap-2">
                <p class="text-xs text-emerald-300/70 py-4 text-center">Cargando directorio de usuarios...</p>
            </div>
        </div>
    `;
};

export const attachCommunicationsEvents = async () => {
    if (!isAdminUser()) return;

    const wasNull = !cachedCommsStore;
    cachedCommsStore = await loadCommunicationsData();
    if (wasNull) {
        window.router.navigate('communications', true);
        return;
    }

    // If first render had empty store, re-render once loaded
    if (!document.querySelector('.comm-section-tab')) return;

    document.getElementById('comm-sync-now-btn')?.addEventListener('click', async () => {
        cachedCommsStore = await loadCommunicationsData();
        window.showAlert?.('Sincronizado', 'Bandeja sincronizada con el Webhook en tiempo real.', 'success');
        window.router.navigate('communications', true);
    });

    document.getElementById('comm-clear-all-btn')?.addEventListener('click', () => {
        window.showConfirm?.(
            '¿Vaciar Bandeja de Comunicaciones?',
            'Se eliminarán todas las conversaciones almacenadas actualmente.',
            async () => {
                cachedCommsStore = await clearAllCommunicationsData();
                window.router.navigate('communications', true);
            }
        );
    });

    // Section Switching (Asistente / Webhook / Usuarios)
    document.querySelectorAll('.comm-section-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            activeMainSection = btn.dataset.section || 'assistant';
            window.router.navigate('communications', true);
        });
    });

    // Circle Filters
    document.querySelectorAll('.comm-circle-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCircle = btn.dataset.circle || 'all';
            window.router.navigate('communications', true);
        });
    });

    // Period Filters (Hoy / Esta Semana / Este Mes)
    document.querySelectorAll('.comm-period-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedPeriod = btn.dataset.period || 'today';
            window.router.navigate('communications', true);
        });
    });

    // Contact 3-View Tabs (Resumen Corto / Análisis Detallado / Todos los Mensajes)
    document.querySelectorAll('.comm-contact-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const phone = btn.dataset.phone;
            const tab = btn.dataset.tab;
            if (phone && tab) {
                activeContactViewTab[phone] = tab;
                window.router.navigate('communications', true);
            }
        });
    });

    // Change Contact Vital Circle
    document.querySelectorAll('.comm-change-circle-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const phone = sel.dataset.phone;
            const newCircle = sel.value;
            cachedCommsStore = await updateContactCircleAdmin(phone, newCircle);
            window.showAlert?.('Círculo Actualizado', `El contacto fue asignado a ${CIRCLE_META[newCircle]?.label}.`, 'success');
            window.router.navigate('communications', true);
        });
    });

    // Re-analyze Contact with AI
    document.querySelectorAll('.comm-reanalyze-ai-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const phone = btn.dataset.phone;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Analizando...`;
            await analyzeContactConversationWithAI(phone);
            cachedCommsStore = await loadCommunicationsData();
            activeContactViewTab[phone] = 'detailed';
            window.router.navigate('communications', true);
        });
    });

    // Smart Reply 1-Click Chips
    document.querySelectorAll('.comm-smart-reply-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            const phone = chip.dataset.phone;
            const replyText = chip.dataset.reply;
            const contact = (cachedCommsStore?.contacts || []).find(c => c.phone === phone);
            if (!phone || !replyText) return;
            await sendBuilderBotWhatsApp({
                number: phone,
                content: replyText,
                contactName: contact?.name || phone,
                circle: contact?.circle || 'otros'
            });
            cachedCommsStore = await loadCommunicationsData();
            activeContactViewTab[phone] = 'messages';
            window.showAlert?.('Respuesta Rápida Enviada', `Se envió "${replyText}" a ${contact?.name || phone}.`, 'success');
            window.router.navigate('communications', true);
        });
    });

    // Download .ICS Calendar Event
    document.querySelectorAll('.comm-download-ics-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.evIdx || 0);
            const allEvents = [];
            (cachedCommsStore?.contacts || []).forEach(c => {
                if (['hijos', 'novia', 'trabajo', 'amigos'].includes(c.circle)) {
                    (c.detected_calendar_events || []).forEach(ev => {
                        allEvents.push({ ...ev, contact: c.name, phone: c.phone, circle: c.circle });
                    });
                }
            });
            const targetEv = allEvents[idx];
            if (targetEv) {
                downloadCalendarICS(targetEv);
            }
        });
    });

    // Inline Reply via BuilderBot API v2
    document.querySelectorAll('.comm-inline-reply-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const phone = btn.dataset.phone;
            const name = btn.dataset.name;
            const circle = btn.dataset.circle;
            const inputEl = document.querySelector(`.comm-inline-reply-input[data-phone="${phone}"]`);
            const text = inputEl?.value?.trim();
            if (!text) return;

            btn.disabled = true;
            btn.textContent = 'Enviando...';
            try {
                const res = await sendBuilderBotWhatsApp({
                    number: phone,
                    content: text,
                    contactName: name,
                    circle
                });
                cachedCommsStore = await loadCommunicationsData();
                window.showAlert?.(
                    'WhatsApp Registrado',
                    res.apiDispatched
                        ? `Mensaje enviado a ${name} (${phone}) vía BuilderBot API.`
                        : `Mensaje guardado en el hilo de ${name}. (Configura tu x-api-builderbot en la pestaña Webhook para despacho en vivo).`,
                    'success'
                );
                window.router.navigate('communications', true);
            } catch (e) {
                window.showAlert?.('Error', e.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Enviar WhatsApp';
            }
        });
    });

    // Audio TTS Briefing ("Escuchar Resumen")
    document.getElementById('comm-listen-briefing-btn')?.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
            window.showAlert?.('Audio TTS', 'Tu navegador no soporta síntesis de voz.', 'info');
            return;
        }
        window.speechSynthesis.cancel();
        const contacts = cachedCommsStore?.contacts || [];
        const speechText = `Hola Lucas. Resumen de tu asistente personal. ` +
            contacts.slice(0, 4).map(c => `En el círculo ${CIRCLE_META[c.circle]?.label || 'general'}, ${c.name}: ${c.short_summary}`).join('. ');
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'es-AR';
        utterance.rate = 1.03;
        window.speechSynthesis.speak(utterance);
    });

    // Quick Google Calendar Event Creator
    document.getElementById('comm-quick-gcal-btn')?.addEventListener('click', () => {
        const title = document.getElementById('comm-quick-gcal-title')?.value?.trim() || 'Recordatorio Asistente Lucas';
        const startTime = document.getElementById('comm-quick-gcal-time')?.value || '18:00';
        const url = buildGoogleCalendarLink({
            title,
            date: getArgentinaDate(),
            startTime,
            description: 'Creado desde el Asistente Personal de Comunicaciones GrowFit.'
        });
        window.open(url, '_blank', 'noopener');
    });

    // Open Modal to Send New WhatsApp to any number
    const sendModal = document.getElementById('comm-send-modal');
    document.getElementById('comm-new-message-modal-btn')?.addEventListener('click', () => {
        if (!sendModal) return;
        sendModal.innerHTML = `
            <div class="white-card p-6 w-full max-w-md relative animate-scale-up border border-[#10E775]/40 shadow-2xl">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-emerald-500/20">
                    <span class="badge-emerald text-xs">BuilderBot API v2 · Envío Directo</span>
                    <button id="close-comm-send-modal" class="size-8 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/70">Nombre del Contacto ({name})</label>
                        <input id="new-wa-name" type="text" placeholder="Ej: Mi Amor / Colegio / Dr. Pérez" class="w-full mt-1 rounded-xl px-3 py-2 text-xs text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] font-bold uppercase text-emerald-300/70">Número ({number})</label>
                            <input id="new-wa-number" type="text" placeholder="549264..." class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-mono text-white bg-[#040B08] border border-emerald-500/30 outline-none" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold uppercase text-emerald-300/70">Círculo Vital</label>
                            <select id="new-wa-circle" class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-bold text-[#10E775] bg-[#040B08] border border-emerald-500/30 outline-none">
                                ${Object.values(CIRCLE_META).map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/70">Mensaje (messages.content)</label>
                        <textarea id="new-wa-content" rows="3" placeholder="Hola, este es un mensaje..." class="w-full mt-1 rounded-xl px-3 py-2 text-xs text-white bg-[#040B08] border border-emerald-500/30 outline-none"></textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase text-emerald-300/70">URL Multimedia Opcional (messages.mediaUrl)</label>
                        <input id="new-wa-media" type="text" placeholder="https://..." class="w-full mt-1 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 bg-[#040B08] border border-emerald-500/30 outline-none" />
                    </div>
                    <button id="confirm-new-wa-send-btn" class="btn-emerald py-3 text-xs font-extrabold uppercase tracking-wider cursor-pointer mt-1">
                        Enviar Mensaje por BuilderBot
                    </button>
                </div>
            </div>
        `;
        sendModal.classList.remove('hidden');
        document.getElementById('close-comm-send-modal').onclick = () => sendModal.classList.add('hidden');
        document.getElementById('confirm-new-wa-send-btn').onclick = async () => {
            const contactName = document.getElementById('new-wa-name').value.trim() || 'Contacto';
            const number = document.getElementById('new-wa-number').value.trim();
            const circle = document.getElementById('new-wa-circle').value;
            const content = document.getElementById('new-wa-content').value.trim();
            const mediaUrl = document.getElementById('new-wa-media').value.trim();
            if (!number || !content) {
                window.showAlert?.('Faltan datos', 'Ingresa el número y el contenido del mensaje.', 'info');
                return;
            }
            await sendBuilderBotWhatsApp({ number, content, mediaUrl, contactName, circle });
            cachedCommsStore = await loadCommunicationsData();
            sendModal.classList.add('hidden');
            window.router.navigate('communications', true);
        };
    });

    // Webhook Config Events
    document.getElementById('comm-copy-webhook-btn')?.addEventListener('click', () => {
        const url = document.getElementById('comm-webhook-url-display')?.value;
        if (url) {
            navigator.clipboard?.writeText(url);
            window.showAlert?.('URL Copiada', 'Pégala en BuilderBot -> Webhooks y haz clic en Guardar.', 'success');
        }
    });

    document.getElementById('comm-save-bb-config-btn')?.addEventListener('click', () => {
        const botId = document.getElementById('comm-bot-id-input')?.value || '';
        const apiKey = document.getElementById('comm-api-key-input')?.value || '';
        saveBuilderBotConfig({ botId, apiKey });
        window.showAlert?.('Configuración Guardada', 'Credenciales de BuilderBot API v2 actualizadas.', 'success');
    });

    document.getElementById('comm-simulate-webhook-btn')?.addEventListener('click', async () => {
        const eventName = document.getElementById('sim-wa-event')?.value || 'message.incoming';
        const name = document.getElementById('sim-wa-name')?.value || 'Contacto';
        const from = document.getElementById('sim-wa-phone')?.value || '5492645102030';
        const body = document.getElementById('sim-wa-body')?.value || 'Hola Lucas!';
        cachedCommsStore = await ingestBuilderBotWebhookLocal({
            eventName,
            data: {
                name,
                from,
                body,
                answer: body,
                reason: 'Simulación manual desde GrowFit Admin',
                payload: { qr: 'BUILDERBOT-QR-DEMO-' + Date.now() },
                attachment: [],
                projectId: getBuilderBotConfig().botId
            }
        });
        activeMainSection = 'assistant';
        window.showAlert?.('Webhook Procesado', `Evento ${eventName} (${name}) procesado y sincronizado en la nube.`, 'success');
        window.router.navigate('communications', true);
    });

    // Admin Users Section Events
    if (activeMainSection === 'users') {
        const listCont = document.getElementById('admin-users-list-container');
        const users = await listAllUsersAdmin();
        if (listCont) {
            listCont.innerHTML = users.map(u => `
                <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center font-display font-black text-[#10E775] uppercase">
                            ${(u.displayName || u.username).charAt(0)}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="text-sm font-bold text-white">${u.displayName}</h4>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-[#10E775] border border-emerald-500/30">@${u.username}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${u.username === 'lmarinero' ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40' : 'bg-emerald-500/15 text-emerald-300'}">
                                    ${u.username === 'lmarinero' ? '👑 Admin Total' : u.role}
                                </span>
                            </div>
                            <p class="text-[11px] font-mono text-emerald-300/70 mt-0.5">Clave: <strong>${u.password}</strong> · ID: ${u.userId}</p>
                        </div>
                    </div>
                    ${u.username !== 'lmarinero' ? `
                        <button type="button" class="admin-del-user-btn px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-lime-300 border border-lime-400/30 text-xs font-bold cursor-pointer" data-username="${u.username}">
                            Eliminar Usuario
                        </button>
                    ` : `<span class="text-[10px] font-mono text-[#10E775] font-bold">Cuenta Maestra Protegida</span>`}
                </div>
            `).join('');

            listCont.querySelectorAll('.admin-del-user-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetU = btn.dataset.username;
                    window.showConfirm?.('¿Eliminar usuario?', `Se revocará el acceso de @${targetU}.`, async () => {
                        await adminDeleteUser(targetU);
                        window.router.navigate('communications', true);
                    });
                });
            });
        }

        const userForm = document.getElementById('admin-user-form');
        userForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-u-username').value;
            const displayName = document.getElementById('admin-u-display').value;
            const password = document.getElementById('admin-u-password').value;
            const role = document.getElementById('admin-u-role').value;
            const res = await adminSaveUser({ username, displayName, password, role });
            if (res.success) {
                window.showAlert?.('Usuario Guardado', `El usuario @${res.user.username} fue actualizado.`, 'success');
                window.router.navigate('communications', true);
            } else {
                window.showAlert?.('Error', res.error, 'error');
            }
        });
    }
};

