import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dtjmckbrofevgfqbkzli.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0am1ja2Jyb2ZldmdmcWJremxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTQxMTgsImV4cCI6MjA4NjI5MDExOH0.JhZPg8DhTBu9nnbKYFKvluDirqKgehDzDP44g_nlqM8';
const HUB_USER_ID = 'lmarinero_whatsapp_hub';
const DEFAULT_BOT_ID = 'f7806984-3538-457b-b4a3-84c97293583b';

function classifyCircle(name = '', body = '', currentCircle = 'otros') {
  const text = `${name} ${body}`.toLowerCase();
  let circle = currentCircle && currentCircle !== 'otros' ? currentCircle : 'otros';

  if (/hijo|hija|chicos|cole|escuela|jard[ií]n|pediatra|maestra|pap[aá]|acto|uniforme/.test(text)) {
    circle = 'hijos';
  } else if (/amor|novia|mi vida|cenamos|te amo|te extrañ|pareja|aniversario/.test(text)) {
    circle = 'novia';
  } else if (/sanatorio|grow\s*labs|servidor|sistema|cliente|presupuesto|reuni[oó]n|factura|auditor[ií]a|m[eé]dico|deploy|proyecto/.test(text)) {
    circle = 'trabajo';
  } else if (/f[uú]tbol|asado|amigo|juntada|cancha|previa|partido|pibes|padel/.test(text)) {
    circle = 'amigos';
  }

  const isImportant = ['hijos', 'novia', 'trabajo', 'amigos'].includes(circle) ||
    /urgente|importante|hoy|mañana|reuni[oó]n|turno|confirm|avisame/.test(text);

  let detectedEvent = null;
  const timeMatch = body.match(/(\d{1,2})[:.]?(\d{2})?\s*(hs|horas|am|pm)?/i);
  if (/mañana|hoy|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|turno|reuni[oó]n|cena|acto|partido/i.test(body)) {
    const hour = timeMatch ? Math.min(23, Math.max(7, parseInt(timeMatch[1], 10))) : 18;
    const minute = timeMatch && timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    if (/mañana/i.test(body)) now.setDate(now.getDate() + 1);
    const dateStr = now.toISOString().split('T')[0];

    detectedEvent = {
      title: `${name || 'WhatsApp'}: ${body.slice(0, 48)}`,
      date: dateStr,
      startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      durationMinutes: 60,
      description: `Agendado automáticamente desde WhatsApp BuilderBot.\nContacto: ${name}\nMensaje: "${body}"`,
      circle
    };
  }

  return { circle, isImportant, detectedEvent };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-builderbot');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  if (req.method === 'GET') {
    const { data: hubRow } = await supabase
      .from('growfit_profiles')
      .select('data, updated_at')
      .eq('user_id', HUB_USER_ID)
      .maybeSingle();

    return res.status(200).json({
      ok: true,
      service: 'GrowFit BuilderBot Webhook (lmarinero personal assistant)',
      botId: DEFAULT_BOT_ID,
      updatedAt: hubRow?.updated_at || null,
      hub: hubRow?.data || null
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const eventName = payload.eventName || payload.event || 'message.incoming';
    const data = payload.data || payload;
    const argDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Load current hub state from growfit_profiles (which is guaranteed to exist in Supabase)
    const { data: existingProfile } = await supabase
      .from('growfit_profiles')
      .select('data')
      .eq('user_id', HUB_USER_ID)
      .maybeSingle();

    const hubData = existingProfile?.data && typeof existingProfile.data === 'object'
      ? existingProfile.data
      : {
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

    if (!Array.isArray(hubData.contacts)) hubData.contacts = [];
    if (!Array.isArray(hubData.messages)) hubData.messages = [];

    // 1. Handle Bot Status Events (status.online, status.ready, status.require_action, status.disconnect)
    if (eventName.startsWith('status.')) {
      const statusType = (eventName === 'status.ready' || eventName === 'status.online')
        ? 'online'
        : eventName === 'status.require_action'
        ? 'require_action'
        : 'disconnect';

      hubData.botStatus = {
        id: 'builderbot_main',
        bot_id: data.projectId || DEFAULT_BOT_ID,
        status: statusType,
        qr_code: data?.payload?.qr || data?.qr || null,
        reason: data?.reason || null,
        last_event: eventName,
        updated_at: new Date().toISOString()
      };

      await supabase.from('growfit_profiles').upsert({
        user_id: HUB_USER_ID,
        full_name: 'WhatsApp Hub (lmarinero)',
        display_name: 'WhatsApp Hub',
        data: hubData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      try {
        await supabase.from('growfit_bot_status').upsert(hubData.botStatus);
      } catch (e) {}

      return res.status(200).json({ ok: true, handled: eventName, status: statusType });
    }

    // 2. Handle Message & Call Events (message.incoming, message.outgoing, message.calling)
    const phone = String(data.from || data.number || 'unknown').replace(/[^\d]/g, '') || 'unknown';
    const existingContact = hubData.contacts.find(c => c.phone === phone);
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

    const { circle, isImportant, detectedEvent } = classifyCircle(
      contactName,
      bodyText,
      existingContact?.circle || 'otros'
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
      ctx: data.ctx || payload,
      circle,
      is_important: isImportant,
      detected_event: detectedEvent,
      message_date: argDate,
      created_at: new Date().toISOString()
    };

    hubData.messages.push(newMsg);
    if (hubData.messages.length > 600) {
      hubData.messages = hubData.messages.slice(-600);
    }

    const contactMsgs = hubData.messages.filter(m => m.phone === phone);
    const incomingMsgs = contactMsgs.filter(m => m.direction === 'incoming');
    const latestIncoming = incomingMsgs[incomingMsgs.length - 1]?.body || bodyText;

    const updatedContact = {
      phone,
      name: contactName,
      circle,
      is_important: isImportant || Boolean(existingContact?.is_important),
      short_summary: `${contactName}: "${latestIncoming.slice(0, 120)}"`,
      detailed_analysis: existingContact?.detailed_analysis || `Conversación activa con ${contactName} (+${phone}). Se registran ${contactMsgs.length} mensajes totales.`,
      pending_promises: existingContact?.pending_promises || [],
      detected_calendar_events: detectedEvent
        ? [detectedEvent, ...(existingContact?.detected_calendar_events || []).slice(0, 3)]
        : (existingContact?.detected_calendar_events || []),
      last_message_preview: bodyText.slice(0, 140),
      last_message_at: new Date().toISOString(),
      total_messages: contactMsgs.length
    };

    const cIdx = hubData.contacts.findIndex(c => c.phone === phone);
    if (cIdx >= 0) hubData.contacts[cIdx] = updatedContact;
    else hubData.contacts.unshift(updatedContact);

    // Save to guaranteed growfit_profiles row
    await supabase.from('growfit_profiles').upsert({
      user_id: HUB_USER_ID,
      full_name: 'WhatsApp Hub (lmarinero)',
      display_name: 'WhatsApp Hub',
      data: hubData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // Also save to dedicated tables if created
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

    return res.status(200).json({
      ok: true,
      handled: eventName,
      phone,
      name: contactName,
      direction,
      circle,
      isImportant
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Internal webhook error' });
  }
}

