import { supabase } from '../supabase-client';
import { getArgentinaDate } from '../state';

const DEFAULT_BOT_ID = 'f7806984-3538-457b-b4a3-84c97293583b';
const LOCAL_COMMS_KEY = 'growfit_admin_communications_v1';
const HUB_USER_ID = 'lmarinero_whatsapp_hub';
const BUILDERBOT_KEY_STORAGE = 'growfit_builderbot_api_key';
const BUILDERBOT_BOT_ID_STORAGE = 'growfit_builderbot_bot_id';
const GCAL_CLIENT_ID_STORAGE = 'growfit_gcal_client_id';
const GCAL_TOKEN_STORAGE = 'growfit_gcal_access_token';
const GCAL_ICAL_STORAGE = 'growfit_gcal_ical_url';
const GCAL_EMAIL_STORAGE = 'growfit_gcal_email';

export const getBuilderBotConfig = () => {
    const apiKey = localStorage.getItem(BUILDERBOT_KEY_STORAGE) || import.meta.env.VITE_BUILDERBOT_API_KEY || '';
    const botId = localStorage.getItem(BUILDERBOT_BOT_ID_STORAGE) || import.meta.env.VITE_BUILDERBOT_BOT_ID || DEFAULT_BOT_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dtjmckbrofevgfqbkzli.supabase.co';
    const originUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
        ? window.location.origin
        : 'https://growfit.vercel.app';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/builderbot-webhook`;
    const vercelWebhookUrl = `${originUrl}/api/builderbot-webhook`;
    // Usamos la Edge Function de Supabase (con verify_jwt: false) como URL principal garantizada
    const webhookUrl = edgeFunctionUrl;
    return { apiKey, botId, webhookUrl, vercelWebhookUrl, edgeFunctionUrl };
};

export const saveBuilderBotConfig = ({ apiKey, botId }) => {
    if (apiKey !== undefined) localStorage.setItem(BUILDERBOT_KEY_STORAGE, apiKey.trim());
    if (botId !== undefined && botId.trim()) localStorage.setItem(BUILDERBOT_BOT_ID_STORAGE, botId.trim());
};

export const getGoogleCalendarConfig = () => {
    const clientId = localStorage.getItem(GCAL_CLIENT_ID_STORAGE) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const accessToken = localStorage.getItem(GCAL_TOKEN_STORAGE) || '';
    const icalUrl = localStorage.getItem(GCAL_ICAL_STORAGE) || import.meta.env.VITE_GOOGLE_ICAL_URL || '';
    const primaryEmail = localStorage.getItem(GCAL_EMAIL_STORAGE) || 'lucasmmarinerosanarg@gmail.com';
    const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(primaryEmail)}&ctz=America%2FArgentina%2FSan_Juan&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`;
    return {
        clientId,
        accessToken,
        icalUrl,
        primaryEmail,
        embedUrl,
        isApiConnected: Boolean(accessToken || icalUrl)
    };
};

export const saveGoogleCalendarConfig = ({ clientId, accessToken, icalUrl, primaryEmail }) => {
    if (clientId !== undefined) localStorage.setItem(GCAL_CLIENT_ID_STORAGE, clientId.trim());
    if (accessToken !== undefined) localStorage.setItem(GCAL_TOKEN_STORAGE, accessToken.trim());
    if (icalUrl !== undefined) localStorage.setItem(GCAL_ICAL_STORAGE, icalUrl.trim());
    if (primaryEmail !== undefined && primaryEmail.trim()) localStorage.setItem(GCAL_EMAIL_STORAGE, primaryEmail.trim());
};

export const CIRCLE_META = {
    hijos: {
        id: 'hijos',
        label: 'Hijos',
        icon: 'child_care',
        emoji: '👶',
        badgeClass: 'bg-[#10E775]/20 text-[#10E775] border-[#10E775]/40',
        priority: 1,
        desc: 'Escuela, salud, actividades y horarios de los chicos'
    },
    novia: {
        id: 'novia',
        label: 'Novia',
        icon: 'favorite',
        emoji: '❤️',
        badgeClass: 'bg-lime-400/20 text-lime-300 border-lime-400/40',
        priority: 2,
        desc: 'Planes juntos, cenas, mensajes afectivos y fechas importantes'
    },
    trabajo: {
        id: 'trabajo',
        label: 'Trabajo',
        icon: 'business_center',
        emoji: '💼',
        badgeClass: 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40',
        priority: 3,
        desc: 'Sanatorio Argentino, Grow Labs, sistemas, auditorías y reuniones'
    },
    amigos: {
        id: 'amigos',
        label: 'Amigos',
        icon: 'sports_soccer',
        emoji: '🤝',
        badgeClass: 'bg-teal-400/20 text-teal-300 border-teal-400/40',
        priority: 4,
        desc: 'Fútbol, asados, juntadas y charlas del grupo'
    },
    otros: {
        id: 'otros',
        label: 'Otros / General',
        icon: 'forum',
        emoji: '📁',
        badgeClass: 'bg-emerald-950/80 text-emerald-300/70 border-emerald-500/25',
        priority: 5,
        desc: 'Consultas generales, servicios y notificaciones'
    }
};

// Clasificador automático de círculo e importancia
export const classifyMessageContext = (name = '', body = '', currentCircle = 'otros') => {
    const text = `${name} ${body}`.toLowerCase();
    let circle = currentCircle && currentCircle !== 'otros' ? currentCircle : 'otros';

    if (/hijo|hija|chicos|cole|escuela|jard[ií]n|pediatra|maestra|pap[aá]|acto|uniforme|entrenamiento de los chicos/.test(text)) {
        circle = 'hijos';
    } else if (/amor|novia|mi vida|cenamos|te amo|te extrañ|pareja|aniversario|finde juntos/.test(text)) {
        circle = 'novia';
    } else if (/sanatorio|grow\s*labs|servidor|sistema|cliente|presupuesto|reuni[oó]n|factura|auditor[ií]a|m[eé]dico|deploy|proyecto/.test(text)) {
        circle = 'trabajo';
    } else if (/f[uú]tbol|asado|amigo|juntada|cancha|previa|partido|pibes|padel/.test(text)) {
        circle = 'amigos';
    }

    const isImportant = ['hijos', 'novia', 'trabajo', 'amigos'].includes(circle) ||
        /urgente|importante|hoy|mañana|reuni[oó]n|turno|confirm|avisame/.test(text);

    // Extraer evento para Google Calendar si menciona día/hora o actividad agendable
    let detectedEvent = null;
    const timeMatch = body.match(/(?:a\s+las\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(hs|horas|hr|am|pm)?/i);
    const hasExplicitTime = Boolean(
        body.match(/\b(\d{1,2})[:.](\d{2})\b/) ||
        body.match(/\b(\d{1,2})\s*(hs|horas|hr|am|pm)\b/i) ||
        body.match(/a\s+las\s+\d{1,2}/i)
    );
    const hasEventKeyword = /mañana|hoy|pasado\s+mañana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|turno|reuni[oó]n|cena|almuerzo|desayuno|merienda|acto|partido|f[uú]tbol|padel|asado|buscar|llevar|retirar|cole|escuela|jard[ií]n|m[eé]dico|pediatra|dentista|cumple|juntada|llamada|meet|zoom|auditor[ií]a|entrega|visita/i.test(body);

    if (hasEventKeyword || hasExplicitTime) {
        let hour = 18;
        let minute = 0;
        const strictTime =
            body.match(/\b(\d{1,2})[:.](\d{2})\s*(hs|horas|am|pm)?\b/i) ||
            body.match(/\b(\d{1,2})\s*(hs|horas|am|pm)\b/i) ||
            body.match(/a\s+las\s+(\d{1,2})(?:[:.](\d{2}))?\s*(hs|horas|am|pm)?/i);

        if (strictTime) {
            hour = parseInt(strictTime[1], 10);
            minute = strictTime[2] && /^\d+$/.test(strictTime[2]) ? parseInt(strictTime[2], 10) : 0;
            const mer = (strictTime[3] || '').toLowerCase();
            if (mer === 'pm' && hour < 12) hour += 12;
            if (mer === 'am' && hour === 12) hour = 0;
            hour = Math.min(23, Math.max(0, hour));
        } else if (timeMatch) {
            hour = Math.min(23, Math.max(7, parseInt(timeMatch[1], 10)));
        }

        const eventDateObj = new Date();
        if (/pasado\s+mañana/i.test(body)) {
            eventDateObj.setDate(eventDateObj.getDate() + 2);
        } else if (/mañana/i.test(body)) {
            eventDateObj.setDate(eventDateObj.getDate() + 1);
        }
        const dateStr = eventDateObj.toISOString().split('T')[0];

        detectedEvent = {
            id: `wa-ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: `${CIRCLE_META[circle]?.emoji || '📅'} ${name || 'WhatsApp'}: ${body.slice(0, 52)}`,
            date: dateStr,
            startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            durationMinutes: 60,
            description: `Agendado automáticamente por Asistente IA de Lucas desde WhatsApp.\nContacto: ${name}\nMensaje original: "${body}"`,
            contact: name || 'WhatsApp',
            circle,
            source: 'whatsapp'
        };
    }

    return { circle, isImportant, detectedEvent };
};

const getInitialSeedData = () => {
    return {
        botStatus: {
            id: 'builderbot_main',
            bot_id: DEFAULT_BOT_ID,
            status: 'online',
            qr_code: null,
            reason: null,
            last_event: 'status.ready',
            updated_at: new Date().toISOString()
        },
        contacts: [],
        messages: [],
        calendarEvents: []
    };
};

const deduplicateCalendarEvents = (events = []) => {
    const map = new Map();
    for (const ev of events) {
        if (!ev || !ev.title) continue;
        const key = ev.id || `${ev.date || ''}|${ev.startTime || ''}|${ev.title.trim().toLowerCase()}`;
        if (!map.has(key)) {
            map.set(key, {
                ...ev,
                id: ev.id || `ev-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            });
        }
    }
    return Array.from(map.values()).sort((a, b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`));
};

const deduplicateMessages = (messages = []) => {
    const byId = new Map();
    const seenSignatures = new Set();

    for (const m of messages) {
        if (!m) continue;
        // Skip legacy hardcoded demo IDs 1001..1009
        if ([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009].includes(Number(m.id))) continue;

        const idKey = String(m.id || '');
        const tsMinute = m.created_at ? String(m.created_at).slice(0, 16) : '';
        const sig = `${m.phone}|${m.direction}|${(m.body || '').trim()}|${tsMinute}`;

        if (idKey && byId.has(idKey)) continue;
        if (seenSignatures.has(sig)) continue;

        seenSignatures.add(sig);
        byId.set(idKey || sig, m);
    }

    return Array.from(byId.values()).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
};

export const loadCommunicationsData = async () => {
    let localData = null;
    try {
        const raw = localStorage.getItem(LOCAL_COMMS_KEY);
        if (raw) localData = JSON.parse(raw);
    } catch (e) {
        localData = null;
    }

    if (!localData || !Array.isArray(localData.contacts) || !Array.isArray(localData.messages)) {
        localData = getInitialSeedData();
    }
    if (!Array.isArray(localData.calendarEvents)) {
        localData.calendarEvents = [];
    }

    // 1. Sync with Supabase growfit_profiles hub row (user_id = 'lmarinero_whatsapp_hub')
    try {
        const { data: hubProfile } = await supabase
            .from('growfit_profiles')
            .select('data, updated_at')
            .eq('user_id', HUB_USER_ID)
            .maybeSingle();

        if (hubProfile?.data && typeof hubProfile.data === 'object') {
            const remoteHub = hubProfile.data;
            if (remoteHub.botStatus) {
                localData.botStatus = remoteHub.botStatus;
            }
            if (remoteHub.gcalConfig && typeof remoteHub.gcalConfig === 'object') {
                const currentGcal = getGoogleCalendarConfig();
                saveGoogleCalendarConfig({
                    clientId: currentGcal.clientId || remoteHub.gcalConfig.clientId || '',
                    icalUrl: currentGcal.icalUrl || remoteHub.gcalConfig.icalUrl || '',
                    primaryEmail: remoteHub.gcalConfig.primaryEmail || currentGcal.primaryEmail
                });
            }
            if (Array.isArray(remoteHub.calendarEvents) && remoteHub.calendarEvents.length > 0) {
                localData.calendarEvents = deduplicateCalendarEvents([
                    ...localData.calendarEvents,
                    ...remoteHub.calendarEvents
                ]);
            }
            if (Array.isArray(remoteHub.contacts) && remoteHub.contacts.length > 0) {
                const byPhone = new Map();
                localData.contacts.forEach(c => byPhone.set(c.phone, c));
                remoteHub.contacts.forEach(rc => {
                    const prev = byPhone.get(rc.phone) || {};
                    byPhone.set(rc.phone, { ...prev, ...rc });
                });
                localData.contacts = Array.from(byPhone.values());
            }
            if (Array.isArray(remoteHub.messages) && remoteHub.messages.length > 0) {
                localData.messages = deduplicateMessages([...localData.messages, ...remoteHub.messages]);
            }
        }
    } catch (e) {
        // Ignore network errors
    }

    // 2. Merge live data from dedicated Supabase WhatsApp tables
    try {
        const [{ data: remoteStatus }, { data: remoteContacts }, { data: remoteMessages }] = await Promise.all([
            supabase.from('growfit_bot_status').select('*').eq('id', 'builderbot_main').maybeSingle(),
            supabase.from('growfit_whatsapp_contacts').select('*').order('last_message_at', { ascending: false }).limit(150),
            supabase.from('growfit_whatsapp_messages').select('*').order('created_at', { ascending: true }).limit(500)
        ]);

        if (remoteStatus) {
            localData.botStatus = remoteStatus;
        }

        if (Array.isArray(remoteContacts) && remoteContacts.length > 0) {
            const byPhone = new Map();
            localData.contacts.forEach(c => byPhone.set(c.phone, c));
            remoteContacts.forEach(rc => {
                const prev = byPhone.get(rc.phone) || {};
                byPhone.set(rc.phone, {
                    ...prev,
                    ...rc,
                    pending_promises: Array.isArray(rc.pending_promises) && rc.pending_promises.length ? rc.pending_promises : (prev.pending_promises || []),
                    detected_calendar_events: Array.isArray(rc.detected_calendar_events) && rc.detected_calendar_events.length ? rc.detected_calendar_events : (prev.detected_calendar_events || []),
                    smart_replies: Array.isArray(rc.smart_replies) && rc.smart_replies.length ? rc.smart_replies : (prev.smart_replies || []),
                    short_summary: rc.short_summary || prev.short_summary || rc.last_message_preview || 'Conversación activa en WhatsApp.',
                    detailed_analysis: rc.detailed_analysis || prev.detailed_analysis || `Contacto ${rc.name} (${rc.phone}) clasificado en círculo ${CIRCLE_META[rc.circle]?.label || 'General'}.`
                });
            });
            localData.contacts = Array.from(byPhone.values());
        }

        if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
            localData.messages = deduplicateMessages([...localData.messages, ...remoteMessages]);
        }

        // Ensure every contact in messages exists in contacts list & extract any message-level detected_event
        const contactByPhone = new Map();
        localData.contacts.forEach(c => contactByPhone.set(c.phone, c));
        localData.messages.forEach(m => {
            if (!m.phone) return;
            if (!contactByPhone.has(m.phone)) {
                const cCircle = m.circle || 'otros';
                contactByPhone.set(m.phone, {
                    phone: m.phone,
                    name: m.contact_name || m.phone,
                    circle: cCircle,
                    is_important: Boolean(m.is_important),
                    short_summary: `${m.contact_name || m.phone}: "${(m.body || '').slice(0, 110)}"`,
                    detailed_analysis: `Conversación activa con ${m.contact_name || m.phone} (+${m.phone}).`,
                    pending_promises: [],
                    detected_calendar_events: m.detected_event ? [m.detected_event] : [],
                    smart_replies: [],
                    last_message_preview: (m.body || '').slice(0, 140),
                    last_message_at: m.created_at || new Date().toISOString(),
                    total_messages: 1
                });
            } else if (m.detected_event) {
                const existingC = contactByPhone.get(m.phone);
                existingC.detected_calendar_events = deduplicateCalendarEvents([
                    ...(existingC.detected_calendar_events || []),
                    { ...m.detected_event, contact: existingC.name, phone: existingC.phone, circle: existingC.circle }
                ]);
            }
        });

        localData.contacts = Array.from(contactByPhone.values()).sort(
            (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        );

        localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(localData));
    } catch (e) {
        console.warn('[GrowFit Comms] Error sincronizando tablas remotas:', e);
    }

    return localData;
};

export const saveCommunicationsDataLocal = (data) => {
    const gcal = getGoogleCalendarConfig();
    const payloadToSave = {
        ...data,
        gcalConfig: {
            clientId: gcal.clientId,
            icalUrl: gcal.icalUrl,
            primaryEmail: gcal.primaryEmail
        }
    };
    localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(payloadToSave));
    supabase.from('growfit_profiles').upsert({
        user_id: HUB_USER_ID,
        full_name: 'WhatsApp Hub (lmarinero)',
        display_name: 'WhatsApp Hub',
        data: payloadToSave,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).then(() => {}).catch(() => {});
};

export const clearAllCommunicationsData = async () => {
    const empty = getInitialSeedData();
    localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(empty));
    try {
        await Promise.all([
            supabase.from('growfit_profiles').upsert({
                user_id: HUB_USER_ID,
                full_name: 'WhatsApp Hub (lmarinero)',
                display_name: 'WhatsApp Hub',
                data: empty,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' }),
            supabase.from('growfit_whatsapp_messages').delete().neq('id', 0),
            supabase.from('growfit_whatsapp_contacts').delete().neq('phone', '')
        ]);
    } catch (e) {
        console.warn('Error vaciando tablas de comunicaciones:', e);
    }
    return empty;
};

/**
 * Envía un mensaje real por BuilderBot API v2 (vía Edge Function proxy libre de CORS + fallback directo) y lo guarda en el historial
 */
export const sendBuilderBotWhatsApp = async ({ number, content, mediaUrl = '', contactName = 'Contacto', circle = 'otros' }) => {
    const cleanNumber = String(number || '').replace(/[^\d]/g, '');
    const cleanContent = (content || '').trim();
    if (!cleanNumber || !cleanContent) {
        throw new Error('Debes indicar número de destino y mensaje.');
    }

    const { apiKey, botId, edgeFunctionUrl } = getBuilderBotConfig();
    const endpoint = `https://app.builderbot.cloud/api/v2/${botId}/messages`;

    const payload = {
        messages: {
            content: cleanContent,
            ...(mediaUrl && mediaUrl.trim() ? { mediaUrl: mediaUrl.trim() } : {})
        },
        number: cleanNumber,
        checkIfExists: false
    };

    let apiDispatched = false;
    let apiErrorMsg = null;

    if (apiKey) {
        // 1. Intentar despacho vía Supabase Edge Function Proxy (evita bloqueos CORS del navegador)
        try {
            const proxyRes = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_whatsapp',
                    botId,
                    apiKey,
                    body: payload
                })
            });
            const proxyData = await proxyRes.json();
            if (proxyData.apiDispatched) {
                apiDispatched = true;
            } else if (proxyData.response || proxyData.error) {
                apiErrorMsg = String(proxyData.response || proxyData.error).slice(0, 120);
            }
        } catch (proxyErr) {
            // 2. Fallback directo a BuilderBot API v2
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-builderbot': apiKey
                    },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    apiDispatched = true;
                } else {
                    const errText = await response.text();
                    apiErrorMsg = `HTTP ${response.status}: ${errText.slice(0, 100)}`;
                }
            } catch (err) {
                apiErrorMsg = err.message;
            }
        }
    }

    // Registrar inmediatamente como message.outgoing en el historial local y Supabase
    await ingestBuilderBotWebhookLocal({
        eventName: 'message.outgoing',
        data: {
            answer: cleanContent,
            from: cleanNumber,
            name: contactName,
            attachment: mediaUrl ? [mediaUrl] : [],
            projectId: botId
        },
        forcedCircle: circle
    });

    return {
        ok: true,
        apiDispatched,
        apiErrorMsg,
        endpoint,
        payload
    };
};

/**
 * Procesa cualquier evento de BuilderBot (message.incoming, message.outgoing, message.calling, status.*)
 */
export const ingestBuilderBotWebhookLocal = async ({ eventName = 'message.incoming', data = {}, forcedCircle = null }) => {
    const store = await loadCommunicationsData();
    const today = getArgentinaDate();

    if (eventName.startsWith('status.')) {
        const statusType = (eventName === 'status.ready' || eventName === 'status.online')
            ? 'online'
            : eventName === 'status.require_action'
            ? 'require_action'
            : 'disconnect';

        store.botStatus = {
            id: 'builderbot_main',
            bot_id: getBuilderBotConfig().botId,
            status: statusType,
            qr_code: data?.payload?.qr || null,
            reason: data?.reason || null,
            last_event: eventName,
            updated_at: new Date().toISOString()
        };
        saveCommunicationsDataLocal(store);
        try {
            await supabase.from('growfit_bot_status').upsert(store.botStatus);
        } catch (e) {}
        return store;
    }

    const phone = String(data.from || data.number || '5492645001122').replace(/[^\d]/g, '') || '5492645001122';
    const existingContact = store.contacts.find(c => c.phone === phone);
    const contactName = (eventName !== 'message.outgoing' && data.name)
        ? data.name
        : (existingContact?.name || data.name || phone);

    const direction = eventName === 'message.outgoing'
        ? 'outgoing'
        : eventName === 'message.calling'
        ? 'call'
        : 'incoming';

    const bodyText = direction === 'outgoing'
        ? (data.answer || data.body || data.aiResponse || '')
        : direction === 'call'
        ? `📞 Llamada entrante de WhatsApp (${contactName})`
        : (data.body || data.aiVoice || data.aiImage || '');

    const { circle, isImportant, detectedEvent } = classifyMessageContext(
        contactName,
        bodyText,
        forcedCircle || existingContact?.circle || 'otros'
    );

    const msgId = Date.now() + Math.floor(Math.random() * 1000);
    const nowIso = new Date().toISOString();

    const newMsg = {
        id: msgId,
        phone,
        contact_name: contactName,
        direction,
        event_name: eventName,
        body: bodyText,
        media_url: data.urlTempFile || (Array.isArray(data.attachment) && data.attachment[0]) || null,
        ai_voice: data.aiVoice || null,
        ai_image: data.aiImage || null,
        ai_response: data.aiResponse || data.answer || null,
        circle,
        is_important: isImportant,
        detected_event: detectedEvent,
        message_date: today,
        created_at: nowIso
    };

    store.messages.push(newMsg);

    const contactMsgs = store.messages.filter(m => m.phone === phone);
    const incomingMsgs = contactMsgs.filter(m => m.direction === 'incoming');
    const latestIncoming = incomingMsgs[incomingMsgs.length - 1]?.body || bodyText;

    const updatedContact = {
        phone,
        name: contactName,
        circle,
        is_important: isImportant || Boolean(existingContact?.is_important),
        short_summary: `${contactName} (${CIRCLE_META[circle]?.label || 'General'}): "${latestIncoming.slice(0, 110)}"`,
        detailed_analysis: existingContact?.detailed_analysis || `Conversación activa con ${contactName}. Última interacción registrada hoy (${contactMsgs.length} mensajes en el hilo).`,
        pending_promises: existingContact?.pending_promises || [],
        detected_calendar_events: detectedEvent
            ? [detectedEvent, ...(existingContact?.detected_calendar_events || []).slice(0, 2)]
            : (existingContact?.detected_calendar_events || []),
        smart_replies: existingContact?.smart_replies || [],
        last_message_preview: bodyText.slice(0, 140),
        last_message_at: nowIso,
        total_messages: contactMsgs.length
    };

    const idx = store.contacts.findIndex(c => c.phone === phone);
    if (idx >= 0) store.contacts[idx] = updatedContact;
    else store.contacts.unshift(updatedContact);

    saveCommunicationsDataLocal(store);

    try {
        await Promise.all([
            supabase.from('growfit_whatsapp_messages').upsert({
                id: newMsg.id,
                phone: newMsg.phone,
                contact_name: newMsg.contact_name,
                direction: newMsg.direction,
                event_name: newMsg.event_name,
                body: newMsg.body,
                media_url: newMsg.media_url,
                ai_voice: newMsg.ai_voice,
                ai_image: newMsg.ai_image,
                ai_response: newMsg.ai_response,
                circle: newMsg.circle,
                is_important: newMsg.is_important,
                detected_event: newMsg.detected_event,
                message_date: newMsg.message_date,
                created_at: newMsg.created_at
            }, { onConflict: 'id' }),
            supabase.from('growfit_whatsapp_contacts').upsert({
                phone: updatedContact.phone,
                name: updatedContact.name,
                circle: updatedContact.circle,
                is_important: updatedContact.is_important,
                short_summary: updatedContact.short_summary,
                detailed_analysis: updatedContact.detailed_analysis,
                pending_promises: updatedContact.pending_promises,
                detected_calendar_events: updatedContact.detected_calendar_events,
                smart_replies: updatedContact.smart_replies,
                last_message_preview: updatedContact.last_message_preview,
                last_message_at: updatedContact.last_message_at,
                total_messages: updatedContact.total_messages,
                updated_at: nowIso
            }, { onConflict: 'phone' })
        ]);
    } catch (e) {
        console.warn('[GrowFit Comms] Error guardando mensaje en Supabase:', e);
    }

    return store;
};

export const updateContactCircleAdmin = async (phone, newCircle, customName = null) => {
    const store = await loadCommunicationsData();
    const target = store.contacts.find(c => c.phone === phone);
    if (target) {
        target.circle = newCircle;
        target.is_important = ['hijos', 'novia', 'trabajo', 'amigos'].includes(newCircle);
        if (customName && customName.trim()) target.name = customName.trim();
        store.messages.forEach(m => {
            if (m.phone === phone) {
                m.circle = newCircle;
                if (customName && customName.trim()) m.contact_name = customName.trim();
            }
        });
        saveCommunicationsDataLocal(store);
        try {
            await supabase.from('growfit_whatsapp_contacts').update({
                circle: newCircle,
                name: target.name,
                is_important: target.is_important,
                updated_at: new Date().toISOString()
            }).eq('phone', phone);
        } catch (e) {}
    }
    return store;
};

/**
 * Analiza con OpenAI GPT-4o-mini una conversación completa y devuelve Resumen Corto, Análisis Detallado, Promesas y Eventos de Calendario
 */
export const analyzeContactConversationWithAI = async (phone) => {
    const store = await loadCommunicationsData();
    const contact = store.contacts.find(c => c.phone === phone);
    const msgs = store.messages.filter(m => m.phone === phone);
    if (!contact || !msgs.length) return null;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const { edgeFunctionUrl } = getBuilderBotConfig();
    const transcript = msgs
        .slice(-20)
        .map(m => `[${m.direction === 'outgoing' ? 'Lucas' : contact.name}]: ${m.body} ${m.ai_voice ? `(Audio: ${m.ai_voice})` : ''}`)
        .join('\n');

    const aiMessages = [
        {
            role: 'system',
            content: `Eres el Asistente Ejecutivo Personal de Lucas Marinero.
Fecha actual en Argentina: ${getArgentinaDate()}.
Analiza esta conversación de WhatsApp con "${contact.name}" (${contact.phone}).
Clasifícala en uno de los 4 círculos prioritarios de Lucas: "hijos", "novia", "trabajo", "amigos" (o "otros").
Extrae además cualquier reunión, turno, cena, acto, partido, horario o evento mencionado para Google Calendar.
Devuelve ÚNICAMENTE un JSON válido:
{
  "circle": "hijos" | "novia" | "trabajo" | "amigos" | "otros",
  "short_summary": "Resumen ejecutivo corto (1-2 líneas) de quién escribió y qué necesitó",
  "detailed_analysis": "Análisis profundo: intención, contexto emocional, qué pidió exactamente y qué respondió o acordó Lucas",
  "pending_promises": ["Tarea o compromiso 1", "Tarea 2"],
  "detected_calendar_events": [
    {
      "title": "Título claro del evento",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "description": "Contexto del evento acordado por WhatsApp"
    }
  ],
  "smart_replies": ["Respuesta sugerida 1", "Respuesta sugerida 2", "Respuesta sugerida 3"]
}`
        },
        { role: 'user', content: transcript }
    ];

    try {
        let data = null;

        // 1. Intentar vía Edge Function (funciona en producción aunque no haya VITE_OPENAI_API_KEY en el cliente)
        try {
            const proxyRes = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'openai_chat',
                    model: 'gpt-4o-mini',
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    messages: aiMessages
                })
            });
            if (proxyRes.ok) {
                data = await proxyRes.json();
            }
        } catch (proxyErr) {
            // Ignorar y pasar a llamada directa
        }

        // 2. Fallback directo con VITE_OPENAI_API_KEY
        if ((!data || data.error) && apiKey) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    messages: aiMessages
                })
            });
            data = await response.json();
        }

        if (data && !data.error && data.choices?.[0]?.message?.content) {
            const parsed = JSON.parse(data.choices[0].message.content.trim());
            contact.circle = parsed.circle || contact.circle;
            contact.short_summary = parsed.short_summary || contact.short_summary;
            contact.detailed_analysis = parsed.detailed_analysis || contact.detailed_analysis;
            contact.pending_promises = parsed.pending_promises || contact.pending_promises;
            if (Array.isArray(parsed.detected_calendar_events) && parsed.detected_calendar_events.length > 0) {
                const aiEvents = parsed.detected_calendar_events.map((ev, i) => ({
                    id: ev.id || `ai-ev-${contact.phone}-${i}-${Date.now()}`,
                    title: ev.title || `Evento con ${contact.name}`,
                    date: ev.date || getArgentinaDate(),
                    startTime: ev.startTime || '18:00',
                    durationMinutes: 60,
                    description: ev.description || `Detectado por IA en conversación con ${contact.name}`,
                    contact: contact.name,
                    phone: contact.phone,
                    circle: contact.circle,
                    source: 'whatsapp_ai'
                }));
                contact.detected_calendar_events = deduplicateCalendarEvents([
                    ...aiEvents,
                    ...(contact.detected_calendar_events || [])
                ]);
            }
            contact.smart_replies = parsed.smart_replies || [];
            saveCommunicationsDataLocal(store);
            try {
                await supabase.from('growfit_whatsapp_contacts').upsert({
                    phone: contact.phone,
                    name: contact.name,
                    circle: contact.circle,
                    is_important: contact.is_important,
                    short_summary: contact.short_summary,
                    detailed_analysis: contact.detailed_analysis,
                    pending_promises: contact.pending_promises,
                    detected_calendar_events: contact.detected_calendar_events || [],
                    smart_replies: contact.smart_replies,
                    last_message_preview: contact.last_message_preview,
                    last_message_at: contact.last_message_at,
                    total_messages: contact.total_messages,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'phone' });
            } catch (e) {}
            return contact;
        }
    } catch (e) {
        console.warn('Fallback local AI summary:', e);
    }

    // Fallback instantáneo enriquecido
    const incomingCount = msgs.filter(m => m.direction === 'incoming').length;
    const outgoingCount = msgs.filter(m => m.direction === 'outgoing').length;
    const lastIn = [...msgs].reverse().find(m => m.direction === 'incoming')?.body || '';
    contact.short_summary = `${contact.name} envió ${incomingCount} msj(s): "${lastIn.slice(0, 95)}". Lucas respondió ${outgoingCount} vez/veces.`;
    contact.detailed_analysis = `Análisis del vínculo (${CIRCLE_META[contact.circle]?.label || 'General'}): Se registran ${msgs.length} interacciones totales. El contacto planteó: "${lastIn}". Se recomienda confirmar horario en Google Calendar si aplica.`;
    saveCommunicationsDataLocal(store);
    return contact;
};

let activeRealtimeChannel = null;

export const subscribeToCommunicationsRealtime = (onRealtimeChange) => {
    if (activeRealtimeChannel) {
        try {
            supabase.removeChannel(activeRealtimeChannel);
        } catch (e) {}
        activeRealtimeChannel = null;
    }

    activeRealtimeChannel = supabase
        .channel('growfit-whatsapp-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'growfit_whatsapp_messages' }, () => {
            if (typeof onRealtimeChange === 'function') onRealtimeChange();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'growfit_whatsapp_contacts' }, () => {
            if (typeof onRealtimeChange === 'function') onRealtimeChange();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'growfit_bot_status' }, () => {
            if (typeof onRealtimeChange === 'function') onRealtimeChange();
        })
        .subscribe();

    return activeRealtimeChannel;
};

/**
 * Reúne todos los eventos de Google Calendar:
 * 1) Recordatorios rápidos guardados y eventos sincronizados desde Google Calendar API / iCal (store.calendarEvents)
 * 2) Eventos detectados en TODOS los contactos de WhatsApp (sin excluir ningún círculo)
 * 3) Eventos detectados en mensajes individuales (store.messages)
 */
export const collectAllCalendarEvents = (store = {}) => {
    const rawList = [];

    if (Array.isArray(store.calendarEvents)) {
        store.calendarEvents.forEach(ev => {
            if (ev && ev.title) {
                rawList.push({
                    ...ev,
                    contact: ev.contact || (ev.source?.startsWith('gcal') ? 'Google Calendar' : 'Recordatorio Lucas'),
                    circle: ev.circle || 'trabajo'
                });
            }
        });
    }

    if (Array.isArray(store.contacts)) {
        store.contacts.forEach(c => {
            (c.detected_calendar_events || []).forEach(ev => {
                if (ev && ev.title) {
                    rawList.push({
                        ...ev,
                        contact: ev.contact || c.name || c.phone,
                        phone: c.phone,
                        circle: c.circle || ev.circle || 'otros',
                        source: ev.source || 'whatsapp'
                    });
                }
            });
        });
    }

    if (Array.isArray(store.messages)) {
        store.messages.forEach(m => {
            if (m?.detected_event && m.detected_event.title) {
                rawList.push({
                    ...m.detected_event,
                    contact: m.contact_name || m.phone || 'WhatsApp',
                    phone: m.phone,
                    circle: m.circle || 'otros',
                    source: 'whatsapp'
                });
            }
        });
    }

    return deduplicateCalendarEvents(rawList);
};

/**
 * Guarda un evento/recordatorio en la Agenda Cloud (Supabase) y opcionalmente lo crea en Google Calendar API v3 o abre la ventana de Google Calendar
 */
export const addQuickCalendarEvent = async ({
    title,
    date = getArgentinaDate(),
    startTime = '18:00',
    durationMinutes = 60,
    description = '',
    contact = 'Lucas Marinero',
    circle = 'trabajo',
    openGoogleTab = true
}) => {
    const cleanTitle = (title || '').trim() || 'Recordatorio Asistente Lucas';
    const cleanDate = date || getArgentinaDate();
    const cleanTime = startTime || '18:00';

    const store = await loadCommunicationsData();
    if (!Array.isArray(store.calendarEvents)) {
        store.calendarEvents = [];
    }

    const newEvent = {
        id: `manual-gcal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: cleanTitle,
        date: cleanDate,
        startTime: cleanTime,
        durationMinutes,
        description: description || `Creado desde el Asistente Personal de Comunicaciones GrowFit (${cleanDate} ${cleanTime} hs).`,
        contact,
        circle,
        source: 'manual',
        created_at: new Date().toISOString()
    };

    // Si hay un OAuth Access Token activo, insertar también vía Google Calendar API v3 directamente
    let createdInGoogleApi = false;
    const { accessToken, primaryEmail } = getGoogleCalendarConfig();
    if (accessToken) {
        try {
            const [hh, mm] = cleanTime.split(':').map(Number);
            const startIso = `${cleanDate}T${String(hh || 18).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}:00-03:00`;
            const endHour = Math.min(23, (hh || 18) + 1);
            const endIso = `${cleanDate}T${String(endHour).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}:00-03:00`;

            const apiRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryEmail || 'primary')}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    summary: cleanTitle,
                    description: newEvent.description,
                    start: { dateTime: startIso, timeZone: 'America/Argentina/San_Juan' },
                    end: { dateTime: endIso, timeZone: 'America/Argentina/San_Juan' }
                })
            });
            if (apiRes.ok) {
                const createdData = await apiRes.json();
                newEvent.id = createdData.id || newEvent.id;
                newEvent.htmlLink = createdData.htmlLink || null;
                newEvent.source = 'gcal_api';
                createdInGoogleApi = true;
            }
        } catch (err) {
            console.warn('[GrowFit GCal] Fallback a link directo:', err);
        }
    }

    store.calendarEvents = deduplicateCalendarEvents([newEvent, ...store.calendarEvents]);
    saveCommunicationsDataLocal(store);

    if (openGoogleTab && !createdInGoogleApi && typeof window !== 'undefined') {
        const url = buildGoogleCalendarLink(newEvent);
        window.open(url, '_blank', 'noopener');
    }

    return { store, event: newEvent, createdInGoogleApi };
};

/**
 * Elimina un evento de la lista de agenda en GrowFit y Supabase
 */
export const deleteCalendarEvent = async (eventId) => {
    const store = await loadCommunicationsData();
    if (Array.isArray(store.calendarEvents)) {
        store.calendarEvents = store.calendarEvents.filter(ev => String(ev.id) !== String(eventId));
    }
    if (Array.isArray(store.contacts)) {
        store.contacts.forEach(c => {
            if (Array.isArray(c.detected_calendar_events)) {
                c.detected_calendar_events = c.detected_calendar_events.filter(
                    ev => String(ev.id || `${ev.date}|${ev.startTime}|${ev.title}`) !== String(eventId)
                );
            }
        });
    }
    saveCommunicationsDataLocal(store);
    return store;
};

/**
 * Sincroniza eventos reales desde Google Calendar (vía API v3 OAuth Token o vía feed iCal .ics en Edge Function)
 */
export const syncGoogleCalendarEvents = async () => {
    const store = await loadCommunicationsData();
    if (!Array.isArray(store.calendarEvents)) store.calendarEvents = [];

    const { accessToken, icalUrl, primaryEmail } = getGoogleCalendarConfig();
    const { edgeFunctionUrl } = getBuilderBotConfig();
    let importedEvents = [];
    let syncMethod = null;
    let errorDetail = null;

    // 1. Intentar con Google Calendar API v3 si hay Access Token OAuth
    if (accessToken) {
        try {
            const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const calTarget = encodeURIComponent(primaryEmail || 'primary');
            const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calTarget}/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=50&singleEvents=true&orderBy=startTime`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );
            if (res.ok) {
                const data = await res.json();
                importedEvents = (data.items || []).map(item => {
                    const rawStart = item.start?.dateTime || item.start?.date || new Date().toISOString();
                    const datePart = rawStart.split('T')[0];
                    const timePart = rawStart.includes('T') ? rawStart.split('T')[1].slice(0, 5) : '09:00';
                    return {
                        id: item.id || `gcal-api-${datePart}-${timePart}`,
                        title: item.summary || 'Evento Google Calendar',
                        date: datePart,
                        startTime: timePart,
                        durationMinutes: 60,
                        description: item.description || item.location || 'Sincronizado desde Google Calendar API',
                        contact: 'Google Calendar',
                        circle: 'trabajo',
                        source: 'gcal_api',
                        htmlLink: item.htmlLink || null
                    };
                });
                syncMethod = 'Google Calendar API v3 (OAuth)';
            } else {
                const errJson = await res.json().catch(() => ({}));
                errorDetail = errJson?.error?.message || `Token OAuth expirado o inválido (HTTP ${res.status})`;
            }
        } catch (e) {
            errorDetail = e.message;
        }
    }

    // 2. Intentar vía iCal URL (.ics) usando el proxy en Supabase Edge Function (sin bloqueo CORS)
    const targetIcalUrl = icalUrl || `https://calendar.google.com/calendar/ical/${encodeURIComponent(primaryEmail)}/public/basic.ics`;
    if (importedEvents.length === 0 && targetIcalUrl) {
        try {
            const res = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'fetch_ical',
                    icalUrl: targetIcalUrl
                })
            });
            const data = await res.json();
            if (data.ok && Array.isArray(data.events)) {
                importedEvents = data.events;
                syncMethod = icalUrl ? 'Feed iCal Secreto (.ics)' : 'Calendario Público Google (.ics)';
            } else if (data.error && !errorDetail) {
                errorDetail = data.error;
            }
        } catch (e) {
            if (!errorDetail) errorDetail = e.message;
        }
    }

    if (importedEvents.length > 0) {
        store.calendarEvents = deduplicateCalendarEvents([...importedEvents, ...store.calendarEvents]);
        saveCommunicationsDataLocal(store);
    }

    return {
        ok: Boolean(syncMethod),
        syncMethod,
        importedCount: importedEvents.length,
        totalEvents: collectAllCalendarEvents(store).length,
        errorDetail,
        store
    };
};

/**
 * Inicia conexión OAuth 2.0 en ventana emergente con Google Identity Services para leer/crear eventos en Google Calendar
 */
export const connectGoogleCalendarOAuth = () => {
    return new Promise((resolve, reject) => {
        const { clientId, primaryEmail } = getGoogleCalendarConfig();
        if (!clientId) {
            reject(new Error('Para usar OAuth 1-Clic ingresa un Google Client ID, o bien pega directamente tu "Dirección secreta en formato iCal (.ics)" de Google Calendar (no requiere Client ID).'));
            return;
        }

        const startTokenFlow = () => {
            try {
                const tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                    hint: primaryEmail,
                    callback: async (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            saveGoogleCalendarConfig({ accessToken: tokenResponse.access_token });
                            const syncRes = await syncGoogleCalendarEvents();
                            resolve({ token: tokenResponse.access_token, syncRes });
                        } else {
                            reject(new Error(tokenResponse?.error_description || 'No se recibió token de Google.'));
                        }
                    }
                });
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                reject(err);
            }
        };

        if (window.google?.accounts?.oauth2) {
            startTokenFlow();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => startTokenFlow();
        script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
        document.head.appendChild(script);
    });
};

/**
 * Construye link directo de 1 clic para Google Calendar + Descarga ICS
 */
export const buildGoogleCalendarLink = (eventData = {}) => {
    const { primaryEmail } = getGoogleCalendarConfig();
    const title = encodeURIComponent(eventData.title || 'Evento Asistente Lucas');
    const dateStr = (eventData.date || getArgentinaDate()).replace(/-/g, '');
    const [hh, mm] = (eventData.startTime || '18:00').split(':').map(Number);
    const startH = String(hh || 18).padStart(2, '0');
    const startM = String(mm || 0).padStart(2, '0');
    const endHourNum = Math.min(23, (hh || 18) + 1);
    const endH = String(endHourNum).padStart(2, '0');

    const dates = `${dateStr}T${startH}${startM}00/${dateStr}T${endH}${startM}00`;
    const details = encodeURIComponent(eventData.description || 'Agendado desde GrowFit Comunicaciones & WhatsApp IA');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&authuser=${encodeURIComponent(primaryEmail)}`;
};

/**
 * Descarga archivo .ICS compatible con Google Calendar / Apple Calendar / Outlook
 */
export const downloadCalendarICS = (eventData = {}) => {
    const title = eventData.title || 'Evento Asistente Lucas';
    const dateStr = (eventData.date || getArgentinaDate()).replace(/-/g, '');
    const [hh, mm] = (eventData.startTime || '18:00').split(':').map(Number);
    const startH = String(hh || 18).padStart(2, '0');
    const startM = String(mm || 0).padStart(2, '0');
    const endHourNum = Math.min(23, (hh || 18) + 1);
    const endH = String(endHourNum).padStart(2, '0');
    const description = (eventData.description || 'Agendado por el Asistente Personal de Lucas (GrowFit)').replace(/\n/g, '\\n');

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GrowFit//Asistente Personal Lucas//ES',
        'BEGIN:VEVENT',
        `UID:growfit-${Date.now()}@growfit.vercel.app`,
        `DTSTAMP:${dateStr}T${startH}${startM}00`,
        `DTSTART:${dateStr}T${startH}${startM}00`,
        `DTEND:${dateStr}T${endH}${startM}00`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evento-lucas-${dateStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Genera el resumen día a día de quién escribió y qué quiso
 */
export const buildDayByDaySummaries = (messages = [], contacts = []) => {
    const byDate = new Map();
    const contactMap = new Map();
    contacts.forEach(c => contactMap.set(c.phone, c));

    messages.forEach(m => {
        const dateKey = m.message_date || (m.created_at ? m.created_at.split('T')[0] : getArgentinaDate());
        if (!byDate.has(dateKey)) {
            byDate.set(dateKey, new Map());
        }
        const dayContacts = byDate.get(dateKey);
        if (!dayContacts.has(m.phone)) {
            const cInfo = contactMap.get(m.phone);
            dayContacts.set(m.phone, {
                phone: m.phone,
                name: cInfo?.name || m.contact_name || m.phone,
                circle: cInfo?.circle || m.circle || 'otros',
                incoming: [],
                outgoing: [],
                calls: []
            });
        }
        const entry = dayContacts.get(m.phone);
        if (m.direction === 'outgoing') entry.outgoing.push(m);
        else if (m.direction === 'call') entry.calls.push(m);
        else entry.incoming.push(m);
    });

    return Array.from(byDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, phoneMap]) => ({
            date,
            items: Array.from(phoneMap.values()).map(item => {
                const lastIn = item.incoming[item.incoming.length - 1]?.body || (item.calls.length ? 'Llamada telefónica por WhatsApp' : 'Solo mensajes enviados por Lucas');
                const lastOut = item.outgoing[item.outgoing.length - 1]?.body || null;
                return {
                    ...item,
                    whatTheyWanted: lastIn,
                    whatLucasReplied: lastOut
                };
            })
        }));
};
