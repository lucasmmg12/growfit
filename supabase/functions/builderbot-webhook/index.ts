// Supabase Edge Function: builderbot-webhook
// Despliegue con verify_jwt = false (--no-verify-jwt)
// URL para pegar en BuilderBot -> Webhooks:
// https://dtjmckbrofevgfqbkzli.supabase.co/functions/v1/builderbot-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-builderbot",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const HUB_USER_ID = "lmarinero_whatsapp_hub";
const DEFAULT_BOT_ID = "f7806984-3538-457b-b4a3-84c97293583b";

const CIRCLE_LABELS: Record<string, string> = {
  hijos: "Hijos",
  novia: "Novia",
  trabajo: "Trabajo",
  amigos: "Amigos",
  otros: "General",
};

function classifyCircleAndImportance(name = "", body = "", existingCircle = "otros") {
  const text = `${name} ${body}`.toLowerCase();

  let circle = existingCircle && existingCircle !== "otros" ? existingCircle : "otros";
  if (/hijo|hija|niñ|chicos|cole|escuela|jard[ií]n|pediatra|maestra|pap[aá]|acto|uniforme|tarea/.test(text)) {
    circle = "hijos";
  } else if (/amor|novia|mi vida|gorda|gordo|cenamos|te amo|te extrañ|pareja|aniversario/.test(text)) {
    circle = "novia";
  } else if (/sanatorio|grow\s*labs|servidor|sistema|cliente|presupuesto|reuni[oó]n|factura|auditor[ií]a|m[eé]dico|proyecto|deploy|guardia/.test(text)) {
    circle = "trabajo";
  } else if (/f[uú]tbol|asado|amigo|juntada|cancha|previa|cerveza|cumple|partido|pibes|padel/.test(text)) {
    circle = "amigos";
  }

  const isImportant =
    ["hijos", "novia", "trabajo", "amigos"].includes(circle) ||
    /urgente|importante|hoy|mañana|reuni[oó]n|turno|avisame|confirm/.test(text);

  let detectedEvent = null;
  const timeMatch = body.match(/(\d{1,2})[:.]?(\d{2})?\s*(hs|horas|am|pm)?/i);
  if (/mañana|hoy|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|turno|reuni[oó]n|cena|acto|partido/i.test(body)) {
    const hour = timeMatch ? Math.min(23, Math.max(7, parseInt(timeMatch[1], 10))) : 18;
    const minute = timeMatch && timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    if (/mañana/i.test(body)) now.setDate(now.getDate() + 1);
    const dateStr = now.toISOString().split("T")[0];

    detectedEvent = {
      title: `${name || "WhatsApp"}: ${body.slice(0, 48)}`,
      date: dateStr,
      startTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      durationMinutes: 60,
      description: `Agendado automáticamente desde WhatsApp BuilderBot.\nContacto: ${name}\nMensaje: "${body}"`,
      circle,
    };
  }

  return { circle, isImportant, detectedEvent };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://dtjmckbrofevgfqbkzli.supabase.co";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET: Health check + estado actual del Hub
  if (req.method === "GET") {
    const [{ data: botStatus }, { data: contacts }, { data: messages }] = await Promise.all([
      supabase.from("growfit_bot_status").select("*").eq("id", "builderbot_main").maybeSingle(),
      supabase.from("growfit_whatsapp_contacts").select("*").order("last_message_at", { ascending: false }).limit(50),
      supabase.from("growfit_whatsapp_messages").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        service: "GrowFit BuilderBot Webhook Edge Function (verify_jwt: false)",
        botId: botStatus?.bot_id || DEFAULT_BOT_ID,
        status: botStatus?.status || "online",
        contactsCount: contacts?.length || 0,
        messagesCount: messages?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();

    // Acción 1: Proxy para enviar mensajes a BuilderBot API v2 sin bloqueo CORS
    if (payload.action === "send_whatsapp") {
      const botId = payload.botId || DEFAULT_BOT_ID;
      const apiKey = payload.apiKey || Deno.env.get("BUILDERBOT_API_KEY") || "";
      const endpoint = `https://app.builderbot.cloud/api/v2/${botId}/messages`;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ ok: false, apiDispatched: false, error: "Falta configurar x-api-builderbot API Key" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bbRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-builderbot": apiKey,
        },
        body: JSON.stringify(payload.body),
      });

      const bbText = await bbRes.text();
      return new Response(
        JSON.stringify({
          ok: bbRes.ok,
          apiDispatched: bbRes.ok,
          status: bbRes.status,
          response: bbText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Acción 2: Proxy para consultas OpenAI (ChatWidget, análisis de conversaciones, nutrición, etc.)
    if (payload.action === "openai_chat") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY") || payload.apiKey || "";
      if (!openAiKey) {
        return new Response(
          JSON.stringify({ error: { message: "OPENAI_API_KEY not configured on server" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: payload.model || "gpt-4o-mini",
          messages: payload.messages || [],
          max_tokens: payload.max_tokens || 500,
          temperature: payload.temperature ?? 0.4,
          ...(payload.response_format ? { response_format: payload.response_format } : {}),
        }),
      });

      const oaiData = await oaiRes.json();
      return new Response(JSON.stringify(oaiData), {
        status: oaiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Acción 3: Eventos de Webhook BuilderBot
    const eventName = payload.eventName || payload.event || "message.incoming";
    const data = payload.data || payload || {};
    const argDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Cargar estado actual en growfit_profiles (respaldo multi-dispositivo)
    const { data: existingProfile } = await supabase
      .from("growfit_profiles")
      .select("data")
      .eq("user_id", HUB_USER_ID)
      .maybeSingle();

    const hubData =
      existingProfile?.data && typeof existingProfile.data === "object"
        ? existingProfile.data
        : {
            botStatus: {
              id: "builderbot_main",
              bot_id: DEFAULT_BOT_ID,
              status: "online",
              qr_code: null,
              reason: null,
              last_event: "status.ready",
              updated_at: new Date().toISOString(),
            },
            contacts: [],
            messages: [],
          };

    if (!Array.isArray(hubData.contacts)) hubData.contacts = [];
    if (!Array.isArray(hubData.messages)) hubData.messages = [];

    // 3A. Eventos de estado del Bot (status.online, status.ready, status.require_action, status.disconnect)
    if (eventName.startsWith("status.")) {
      const statusType =
        eventName === "status.ready" || eventName === "status.online"
          ? "online"
          : eventName === "status.require_action"
          ? "require_action"
          : "disconnect";

      const newBotStatus = {
        id: "builderbot_main",
        bot_id: data.projectId || DEFAULT_BOT_ID,
        status: statusType,
        qr_code: data?.payload?.qr || data?.qr || null,
        reason: data?.reason || null,
        last_event: eventName,
        updated_at: new Date().toISOString(),
      };

      hubData.botStatus = newBotStatus;

      await Promise.all([
        supabase.from("growfit_bot_status").upsert(newBotStatus),
        supabase.from("growfit_profiles").upsert(
          {
            user_id: HUB_USER_ID,
            full_name: "WhatsApp Hub (lmarinero)",
            display_name: "WhatsApp Hub",
            data: hubData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        ),
      ]);

      return new Response(JSON.stringify({ ok: true, status: statusType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3B. Eventos de Mensajes y Llamadas (message.incoming, message.outgoing, message.calling)
    const phone = String(data.from || data.number || "desconocido").replace(/[^\d]/g, "") || "desconocido";
    const { data: existingContact } = await supabase
      .from("growfit_whatsapp_contacts")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    const hubContact = hubData.contacts.find((c: { phone: string }) => c.phone === phone);
    const baseContact = existingContact || hubContact || null;

    const contactName =
      eventName !== "message.outgoing" && data.name
        ? data.name
        : baseContact?.name || data.name || phone;

    const direction =
      eventName === "message.outgoing"
        ? "outgoing"
        : eventName === "message.calling"
        ? "call"
        : "incoming";

    const rawBody =
      direction === "outgoing"
        ? data.answer || data.body || data.aiResponse || ""
        : direction === "call"
        ? `📞 Llamada entrante de WhatsApp (${contactName})`
        : data.body || data.aiVoice || data.aiImage || "";

    const mediaUrl =
      data.urlTempFile ||
      (Array.isArray(data.attachment) && data.attachment.length > 0 ? data.attachment[0] : null);

    const { circle, isImportant, detectedEvent } = classifyCircleAndImportance(
      contactName,
      rawBody,
      baseContact?.circle || "otros"
    );

    const { data: insertedMsg } = await supabase
      .from("growfit_whatsapp_messages")
      .insert({
        phone,
        contact_name: contactName,
        direction,
        event_name: eventName,
        body: rawBody,
        media_url: mediaUrl,
        ai_voice: data.aiVoice || null,
        ai_image: data.aiImage || null,
        ai_response: data.aiResponse || data.answer || null,
        circle,
        is_important: isImportant,
        detected_event: detectedEvent,
        project_id: data.projectId || DEFAULT_BOT_ID,
        raw_payload: payload,
        message_date: argDate,
      })
      .select()
      .maybeSingle();

    const totalMsgs = (baseContact?.total_messages || 0) + 1;
    const prevEvents = Array.isArray(baseContact?.detected_calendar_events)
      ? baseContact.detected_calendar_events
      : [];
    const updatedEvents = detectedEvent ? [detectedEvent, ...prevEvents.slice(0, 3)] : prevEvents;

    const shortSummary =
      direction === "incoming"
        ? `${contactName} (${CIRCLE_LABELS[circle] || "General"}): "${rawBody.slice(0, 110)}"`
        : baseContact?.short_summary || `${contactName}: "${rawBody.slice(0, 110)}"`;

    const detailedAnalysis =
      baseContact?.detailed_analysis ||
      `Conversación activa con ${contactName} (+${phone}) en círculo ${CIRCLE_LABELS[circle] || "General"}. Total de interacciones: ${totalMsgs}.`;

    const updatedContact = {
      phone,
      name: contactName,
      circle,
      is_important: isImportant || Boolean(baseContact?.is_important),
      short_summary: shortSummary,
      detailed_analysis: detailedAnalysis,
      pending_promises: baseContact?.pending_promises || [],
      detected_calendar_events: updatedEvents,
      smart_replies: baseContact?.smart_replies || [],
      last_message_preview: rawBody.slice(0, 140),
      last_message_at: new Date().toISOString(),
      total_messages: totalMsgs,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("growfit_whatsapp_contacts").upsert(updatedContact, { onConflict: "phone" });

    // Actualizar hubData en growfit_profiles también
    const hubMsg = {
      id: insertedMsg?.id || Date.now() + Math.floor(Math.random() * 1000),
      phone,
      contact_name: contactName,
      direction,
      event_name: eventName,
      body: rawBody,
      media_url: mediaUrl,
      ai_voice: data.aiVoice || null,
      ai_image: data.aiImage || null,
      ai_response: data.aiResponse || data.answer || null,
      circle,
      is_important: isImportant,
      detected_event: detectedEvent,
      message_date: argDate,
      created_at: insertedMsg?.created_at || new Date().toISOString(),
    };

    hubData.messages.push(hubMsg);
    if (hubData.messages.length > 600) {
      hubData.messages = hubData.messages.slice(-600);
    }

    const cIdx = hubData.contacts.findIndex((c: { phone: string }) => c.phone === phone);
    if (cIdx >= 0) hubData.contacts[cIdx] = updatedContact;
    else hubData.contacts.unshift(updatedContact);

    await supabase.from("growfit_profiles").upsert(
      {
        user_id: HUB_USER_ID,
        full_name: "WhatsApp Hub (lmarinero)",
        display_name: "WhatsApp Hub",
        data: hubData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        event: eventName,
        phone,
        name: contactName,
        direction,
        circle,
        isImportant,
        messageId: insertedMsg?.id || hubMsg.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
