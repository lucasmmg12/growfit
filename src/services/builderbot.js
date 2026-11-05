import { supabase } from '../supabase-client';
import { getArgentinaDate } from '../state';

const DEFAULT_BOT_ID = 'f7806984-3538-457b-b4a3-84c97293583b';
const LOCAL_COMMS_KEY = 'growfit_admin_communications_v1';
const HUB_USER_ID = 'lmarinero_whatsapp_hub';
const BUILDERBOT_KEY_STORAGE = 'growfit_builderbot_api_key';
const BUILDERBOT_BOT_ID_STORAGE = 'growfit_builderbot_bot_id';
const GCAL_CLIENT_ID_STORAGE = 'growfit_gcal_client_id';
const GCAL_TOKEN_STORAGE = 'growfit_gcal_access_token';

export const getBuilderBotConfig = () => {
    const apiKey = localStorage.getItem(BUILDERBOT_KEY_STORAGE) || import.meta.env.VITE_BUILDERBOT_API_KEY || '';
    const botId = localStorage.getItem(BUILDERBOT_BOT_ID_STORAGE) || import.meta.env.VITE_BUILDERBOT_BOT_ID || DEFAULT_BOT_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dtjmckbrofevgfqbkzli.supabase.co';
    const originUrl = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
        ? window.location.origin
        : 'https://growfit.vercel.app';
    const webhookUrl = `${originUrl}/api/builderbot-webhook`;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/builderbot-webhook`;
    return { apiKey, botId, webhookUrl, edgeFunctionUrl };
};

export const saveBuilderBotConfig = ({ apiKey, botId }) => {
    if (apiKey !== undefined) localStorage.setItem(BUILDERBOT_KEY_STORAGE, apiKey.trim());
    if (botId !== undefined && botId.trim()) localStorage.setItem(BUILDERBOT_BOT_ID_STORAGE, botId.trim());
};

export const getGoogleCalendarConfig = () => {
    return {
        clientId: localStorage.getItem(GCAL_CLIENT_ID_STORAGE) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        accessToken: localStorage.getItem(GCAL_TOKEN_STORAGE) || '',
        primaryEmail: 'lucasmmarinerosanarg@gmail.com'
    };
};

export const saveGoogleCalendarConfig = ({ clientId, accessToken }) => {
    if (clientId !== undefined) localStorage.setItem(GCAL_CLIENT_ID_STORAGE, clientId.trim());
    if (accessToken !== undefined) localStorage.setItem(GCAL_TOKEN_STORAGE, accessToken.trim());
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

    // Extraer evento para Google Calendar si menciona día/hora
    let detectedEvent = null;
    const timeMatch = body.match(/(\d{1,2})[:.]?(\d{2})?\s*(hs|horas|am|pm)?/i);
    if (/mañana|hoy|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|turno|reuni[oó]n|cena|acto|partido/i.test(body)) {
        const hour = timeMatch ? Math.min(23, Math.max(7, parseInt(timeMatch[1], 10))) : 18;
        const minute = timeMatch && timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const isTomorrow = /mañana/i.test(body);
        const eventDateObj = new Date();
        if (isTomorrow) eventDateObj.setDate(eventDateObj.getDate() + 1);
        const dateStr = eventDateObj.toISOString().split('T')[0];

        detectedEvent = {
            title: `${CIRCLE_META[circle]?.emoji || '📅'} ${name || 'WhatsApp'}: ${body.slice(0, 46)}`,
            date: dateStr,
            startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            durationMinutes: 60,
            description: `Agendado automáticamente por Asistente IA de Lucas desde WhatsApp.\nContacto: ${name}\nMensaje original: "${body}"`,
            circle
        };
    }

    return { circle, isImportant, detectedEvent };
};

const DEMO_FAKE_PHONES = new Set([
    '5492645102030',
    '5492644889900',
    '5492644112233',
    '5492645776655'
]);

// Estado inicial 100% limpio (sin conversaciones ni eventos inventados)
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
        messages: []
    };
};

const purgeFakeSeedEntries = (store) => {
    if (!store || typeof store !== 'object') return getInitialSeedData();
    const prevContactsLen = Array.isArray(store.contacts) ? store.contacts.length : 0;
    const prevMsgsLen = Array.isArray(store.messages) ? store.messages.length : 0;
    store.contacts = (store.contacts || []).filter(c => !DEMO_FAKE_PHONES.has(String(c.phone)));
    store.messages = (store.messages || []).filter(m => !DEMO_FAKE_PHONES.has(String(m.phone)) && ![1001,1002,1003,1004,1005,1006,1007,1008,1009].includes(Number(m.id)));
    const purged = (store.contacts.length !== prevContactsLen) || (store.messages.length !== prevMsgsLen);
    return { store, purged };
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

    const { store: cleanedLocal, purged: localPurged } = purgeFakeSeedEntries(localData);
    localData = cleanedLocal;
    if (localPurged) {
        localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(localData));
    }

    // 1. Sync with guaranteed Supabase growfit_profiles hub row (user_id = 'lmarinero_whatsapp_hub')
    try {
        const { data: hubProfile } = await supabase
            .from('growfit_profiles')
            .select('data, updated_at')
            .eq('user_id', HUB_USER_ID)
            .maybeSingle();

        if (hubProfile?.data && typeof hubProfile.data === 'object') {
            const { store: remoteHub, purged: remotePurged } = purgeFakeSeedEntries(hubProfile.data);
            if (remoteHub.botStatus) {
                localData.botStatus = remoteHub.botStatus;
            }
            if (Array.isArray(remoteHub.contacts) && remoteHub.contacts.length > 0) {
                const byPhone = new Map();
                localData.contacts.forEach(c => byPhone.set(c.phone, c));
                remoteHub.contacts.forEach(rc => {
                    const prev = byPhone.get(rc.phone) || {};
                    byPhone.set(rc.phone, { ...prev, ...rc });
                });
                localData.contacts = Array.from(byPhone.values()).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
            }
            if (Array.isArray(remoteHub.messages) && remoteHub.messages.length > 0) {
                const byId = new Map();
                localData.messages.forEach(m => byId.set(String(m.id), m));
                remoteHub.messages.forEach(rm => byId.set(String(rm.id), rm));
                localData.messages = Array.from(byId.values()).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            }
            if (remotePurged) {
                await supabase.from('growfit_profiles').upsert({
                    user_id: HUB_USER_ID,
                    full_name: 'WhatsApp Hub (lmarinero)',
                    display_name: 'WhatsApp Hub',
                    data: localData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            }
        }
    } catch (e) {
        // Ignore network errors
    }

    // 2. Also merge live data from dedicated Supabase tables if created
    try {
        const [{ data: remoteStatus }, { data: remoteContacts }, { data: remoteMessages }] = await Promise.all([
            supabase.from('growfit_bot_status').select('*').eq('id', 'builderbot_main').maybeSingle(),
            supabase.from('growfit_whatsapp_contacts').select('*').order('last_message_at', { ascending: false }).limit(100),
            supabase.from('growfit_whatsapp_messages').select('*').order('created_at', { ascending: true }).limit(400)
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
                    short_summary: rc.short_summary || prev.short_summary || rc.last_message_preview || 'Conversación activa en WhatsApp.',
                    detailed_analysis: rc.detailed_analysis || prev.detailed_analysis || `Contacto ${rc.name} (${rc.phone}) clasificado en círculo ${CIRCLE_META[rc.circle]?.label || 'General'}.`
                });
            });
            localData.contacts = Array.from(byPhone.values()).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        }

        if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
            const byId = new Map();
            localData.messages.forEach(m => byId.set(String(m.id), m));
            remoteMessages.forEach(rm => byId.set(String(rm.id), rm));
            localData.messages = Array.from(byId.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(localData));
    } catch (e) {
        // Fallback to local state silently if tables are not yet created in Supabase
    }

    return localData;
};

export const saveCommunicationsDataLocal = (data) => {
    localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(data));
    supabase.from('growfit_profiles').upsert({
        user_id: HUB_USER_ID,
        full_name: 'WhatsApp Hub (lmarinero)',
        display_name: 'WhatsApp Hub',
        data,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).then(() => {}).catch(() => {});
};

export const clearAllCommunicationsData = async () => {
    const empty = getInitialSeedData();
    localStorage.setItem(LOCAL_COMMS_KEY, JSON.stringify(empty));
    try {
        await supabase.from('growfit_profiles').upsert({
            user_id: HUB_USER_ID,
            full_name: 'WhatsApp Hub (lmarinero)',
            display_name: 'WhatsApp Hub',
            data: empty,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {}
    return empty;
};

/**
 * Envía un mensaje real por BuilderBot API v2 (Imagen 1) y lo guarda en el historial
 */
export const sendBuilderBotWhatsApp = async ({ number, content, mediaUrl = '', contactName = 'Contacto', circle = 'otros' }) => {
    const cleanNumber = String(number || '').replace(/[^\d]/g, '');
    const cleanContent = (content || '').trim();
    if (!cleanNumber || !cleanContent) {
        throw new Error('Debes indicar número de destino y mensaje.');
    }

    const { apiKey, botId } = getBuilderBotConfig();
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

    const phone = String(data.from || data.number || '5492640000000').replace(/[^\d]/g, '');
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

    const newMsg = {
        id: Date.now() + Math.floor(Math.random() * 1000),
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
        created_at: new Date().toISOString()
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
        last_message_preview: bodyText.slice(0, 140),
        last_message_at: new Date().toISOString(),
        total_messages: contactMsgs.length
    };

    const idx = store.contacts.findIndex(c => c.phone === phone);
    if (idx >= 0) store.contacts[idx] = updatedContact;
    else store.contacts.unshift(updatedContact);

    saveCommunicationsDataLocal(store);

    try {
        await supabase.from('growfit_whatsapp_messages').insert({
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
            message_date: newMsg.message_date
        });
        await supabase.from('growfit_whatsapp_contacts').upsert({
            phone: updatedContact.phone,
            name: updatedContact.name,
            circle: updatedContact.circle,
            is_important: updatedContact.is_important,
            short_summary: updatedContact.short_summary,
            detailed_analysis: updatedContact.detailed_analysis,
            last_message_preview: updatedContact.last_message_preview,
            last_message_at: updatedContact.last_message_at,
            total_messages: updatedContact.total_messages
        }, { onConflict: 'phone' });
    } catch (e) {}

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
                is_important: target.is_important
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
    const transcript = msgs
        .slice(-20)
        .map(m => `[${m.direction === 'outgoing' ? 'Lucas' : contact.name}]: ${m.body} ${m.ai_voice ? `(Audio: ${m.ai_voice})` : ''}`)
        .join('\n');

    if (apiKey) {
        try {
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
                    messages: [
                        {
                            role: 'system',
                            content: `Eres el Asistente Ejecutivo Personal de Lucas Marinero.
Analiza esta conversación de WhatsApp con "${contact.name}" (${contact.phone}).
Clasifícala en uno de los 4 círculos prioritarios de Lucas: "hijos", "novia", "trabajo", "amigos" (o "otros").
Devuelve ÚNICAMENTE un JSON válido:
{
  "circle": "hijos" | "novia" | "trabajo" | "amigos" | "otros",
  "short_summary": "Resumen ejecutivo corto (1-2 líneas) de quién escribió y qué necesitó",
  "detailed_analysis": "Análisis profundo: intención, contexto emocional, qué pidió exactamente y qué respondió o acordó Lucas",
  "pending_promises": ["Tarea o compromiso 1", "Tarea 2"],
  "smart_replies": ["Respuesta sugerida 1", "Respuesta sugerida 2", "Respuesta sugerida 3"]
}`
                        },
                        { role: 'user', content: transcript }
                    ]
                })
            });
            const data = await response.json();
            if (!data.error) {
                const parsed = JSON.parse(data.choices[0].message.content.trim());
                contact.circle = parsed.circle || contact.circle;
                contact.short_summary = parsed.short_summary || contact.short_summary;
                contact.detailed_analysis = parsed.detailed_analysis || contact.detailed_analysis;
                contact.pending_promises = parsed.pending_promises || contact.pending_promises;
                contact.smart_replies = parsed.smart_replies || [];
                saveCommunicationsDataLocal(store);
                return contact;
            }
        } catch (e) {
            console.warn('Fallback local AI summary:', e);
        }
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

/**
 * Construye link directo de 1 clic para Google Calendar + Descarga ICS
 */
export const buildGoogleCalendarLink = (eventData = {}) => {
    const title = encodeURIComponent(eventData.title || 'Evento Asistente Lucas');
    const dateStr = (eventData.date || getArgentinaDate()).replace(/-/g, '');
    const [hh, mm] = (eventData.startTime || '18:00').split(':').map(Number);
    const startH = String(hh || 18).padStart(2, '0');
    const startM = String(mm || 0).padStart(2, '0');
    const endHourNum = Math.min(23, (hh || 18) + 1);
    const endH = String(endHourNum).padStart(2, '0');

    const dates = `${dateStr}T${startH}${startM}00/${dateStr}T${endH}${startM}00`;
    const details = encodeURIComponent(eventData.description || 'Agendado desde GrowFit Comunicaciones & WhatsApp IA');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&authuser=lucasmmarinerosanarg@gmail.com`;
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

