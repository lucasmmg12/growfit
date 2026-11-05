// Supabase Edge Function: builderbot-webhook
// Despliegue: supabase functions deploy builderbot-webhook --no-verify-jwt
// URL para pegar en BuilderBot -> Webhooks:
// https://dtjmckbrofevgfqbkzli.supabase.co/functions/v1/builderbot-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-builderbot",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Clasificador heurístico + IA para los 4 Círculos Vitales de Lucas (Hijos, Novia, Trabajo, Amigos)
function classifyCircleAndImportance(name = "", body = "", existingCircle = "otros") {
  const text = `${name} ${body}`.toLowerCase();

  let circle = existingCircle !== "otros" ? existingCircle : "otros";
  if (/hijo|hija|niñ|cole|escuela|jard[ií]n|pediatra|maestra|pap[aá]|acto escolar|uniforme|tarea/.test(text)) {
    circle = "hijos";
  } else if (/amor|novia|mi vida|gorda|gordo|cenamos|te amo|te extrañ|pareja|aniversario/.test(text)) {
    circle = "novia";
  } else if (/sanatorio|grow\s*labs|servidor|sistema|cliente|presupuesto|reuni[oó]n|factura|auditor[ií]a|m[eé]dico|proyecto|deploy| guardia/.test(text)) {
    circle = "trabajo";
  } else if (/f[uú]tbol|asado|amigo|juntada|cancha|previa|cerveza|cumple|partido|pibes/.test(text)) {
    circle = "amigos";
  }

  const isImportant =
    circle === "hijos" ||
    circle === "novia" ||
    circle === "trabajo" ||
    circle === "amigos" ||
    /urgente|importante|hoy|mañana|reuni[oó]n|turno|avisame|confirm/.test(text);

  // Detectar posible evento agendable para Google Calendar
  let detectedEvent = null;
  if (/mañana|hoy|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\b\d{1,2}\s*(hs|horas|:\d{2})/i.test(body)) {
    detectedEvent = {
      title: `WhatsApp (${name || "Contacto"}): ${body.slice(0, 48)}`,
      raw_text: body,
      circle,
      suggested_duration_min: 45,
    };
  }

  return { circle, isImportant, detectedEvent };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://dtjmckbrofevgfqbkzli.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const eventName = payload.eventName || "message.incoming";
    const data = payload.data || payload || {};

    // 1. Eventos de estado del Bot (status.online, status.ready, status.require_action, status.disconnect)
    if (eventName.startsWith("status.")) {
      const statusType =
        eventName === "status.ready" || eventName === "status.online"
          ? "online"
          : eventName === "status.require_action"
          ? "require_action"
          : "disconnect";

      await supabase.from("growfit_bot_status").upsert({
        id: "builderbot_main",
        status: statusType,
        qr_code: data?.payload?.qr || null,
        reason: data?.reason || null,
        last_event: eventName,
        updated_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ ok: true, status: statusType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Eventos de Mensajes y Llamadas (message.incoming, message.outgoing, message.calling)
    const phone = String(data.from || data.number || "desconocido").replace(/[^\d+]/g, "");
    const contactName = data.name || (eventName === "message.outgoing" ? "Lucas (Enviado)" : phone);
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

    // Consultar si el contacto ya tiene un círculo asignado por Lucas
    const { data: existingContact } = await supabase
      .from("growfit_whatsapp_contacts")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    const { circle, isImportant, detectedEvent } = classifyCircleAndImportance(
      existingContact?.name || contactName,
      rawBody,
      existingContact?.circle || "otros"
    );

    const argDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Insertar mensaje en growfit_whatsapp_messages
    const { data: insertedMsg } = await supabase
      .from("growfit_whatsapp_messages")
      .insert({
        phone,
        contact_name: existingContact?.name || contactName,
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
        project_id: data.projectId || "f7806984-3538-457b-b4a3-84c97293583b",
        raw_payload: payload,
        message_date: argDate,
      })
      .select()
      .maybeSingle();

    // Actualizar resumen del contacto en growfit_whatsapp_contacts
    const finalName =
      direction === "incoming" && data.name ? data.name : existingContact?.name || contactName;

    await supabase.from("growfit_whatsapp_contacts").upsert(
      {
        phone,
        name: finalName,
        circle,
        is_important: isImportant || Boolean(existingContact?.is_important),
        last_message_preview: rawBody.slice(0, 140),
        last_message_at: new Date().toISOString(),
        total_messages: (existingContact?.total_messages || 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        event: eventName,
        phone,
        circle,
        isImportant,
        messageId: insertedMsg?.id || null,
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
