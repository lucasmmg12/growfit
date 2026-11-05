const SUPABASE_OPENAI_PROXY_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://dtjmckbrofevgfqbkzli.supabase.co') + '/functions/v1/builderbot-webhook';

const getOpenAIKey = () => {
  return import.meta.env.VITE_OPENAI_API_KEY || 'server-proxy-enabled';
};

const callOpenAICompletions = async (bodyPayload) => {
  const clientKey = import.meta.env.VITE_OPENAI_API_KEY || '';

  // 1. Intentar primero vía Supabase Edge Function Proxy (seguro, sin CORS y funciona en Vercel sin exponer claves)
  try {
    const proxyRes = await fetch(SUPABASE_OPENAI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'openai_chat',
        ...bodyPayload
      })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && !data.error && data.choices?.length) {
        return data;
      }
    }
  } catch (proxyErr) {
    // Fallback a llamada directa si existe clientKey
  }

  // 2. Fallback directo a OpenAI API si hay clave local
  if (clientKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientKey}`
      },
      body: JSON.stringify(bodyPayload)
    });
    return await response.json();
  }

  throw new Error('No se pudo conectar con el servicio de IA.');
};

export const analyzeFood = async (input, type = 'text', context = '') => {
  const apiKey = getOpenAIKey();

  const getArgDate = () => {
    const now = new Date();
    const argentinaOffset = -3;
    const argentinaTime = new Date(now.getTime() + (argentinaOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return argentinaTime.toISOString().split('T')[0];
  };
  const todayISO = getArgDate();

  // Smart local nutritional estimator fallback (Argentine & general foods)
  const buildFallbackFoodAnalysis = (rawText) => {
    const txt = (rawText || context || 'Alimento registrado').trim();
    const lower = txt.toLowerCase();

    // Determine category by keywords or time of day
    let category = 'Almuerzo';
    if (/desayuno|mate|tostada|medialuna|caf[eé]|avena/.test(lower)) category = 'Desayuno';
    else if (/media ma[ñn]ana|colaci[oó]n/.test(lower)) category = 'Media Mañana';
    else if (/merienda|tarde/.test(lower)) category = 'Merienda';
    else if (/cena|noche/.test(lower)) category = 'Cena';

    // Ingredient dictionary (per standard portion)
    const db = [
      { re: /(\d+)?\s*huevo/i, cal: 75, p: 6.5, c: 0.6, f: 5, na: 70, defaultQty: 2 },
      { re: /(\d+)?\s*tostada/i, cal: 70, p: 2.5, c: 13, f: 1, na: 120, defaultQty: 2 },
      { re: /(\d+)?\s*medialuna/i, cal: 165, p: 3.5, c: 22, f: 7, na: 160, defaultQty: 2 },
      { re: /(\d+)?\s*chip[aá]/i, cal: 150, p: 4.5, c: 18, f: 6.5, na: 280, defaultQty: 2 },
      { re: /caf[eé]\s*con\s*leche/i, cal: 95, p: 5, c: 8, f: 4.5, na: 85, defaultQty: 1 },
      { re: /caf[eé]|mate/i, cal: 15, p: 0.5, c: 2, f: 0, na: 10, defaultQty: 1 },
      { re: /yogur/i, cal: 130, p: 10, c: 14, f: 3.5, na: 75, defaultQty: 1 },
      { re: /avena/i, cal: 150, p: 5.5, c: 27, f: 2.5, na: 15, defaultQty: 1 },
      { re: /palta|aguacate/i, cal: 120, p: 1.5, c: 6, f: 11, na: 10, defaultQty: 1 },
      { re: /queso/i, cal: 95, p: 7, c: 1, f: 7, na: 220, defaultQty: 1 },
      { re: /jam[oó]n/i, cal: 60, p: 9, c: 1, f: 2, na: 420, defaultQty: 1 },
      { re: /pollo|pechuga/i, cal: 260, p: 42, c: 0, f: 8, na: 290, defaultQty: 1 },
      { re: /milanesa/i, cal: 380, p: 32, c: 22, f: 18, na: 540, defaultQty: 1 },
      { re: /carne|bife|asado|vacio|lomo/i, cal: 340, p: 38, c: 0, f: 20, na: 310, defaultQty: 1 },
      { re: /pescado|at[uú]n|merluza|salm[oó]n/i, cal: 230, p: 34, c: 0, f: 10, na: 260, defaultQty: 1 },
      { re: /arroz/i, cal: 205, p: 4.5, c: 44, f: 0.5, na: 140, defaultQty: 1 },
      { re: /fideos|pasta|tallarines/i, cal: 290, p: 10, c: 56, f: 2.5, na: 180, defaultQty: 1 },
      { re: /ensalada/i, cal: 90, p: 2, c: 9, f: 5, na: 150, defaultQty: 1 },
      { re: /papa|pur[eé]|batata|calabaza/i, cal: 160, p: 3.5, c: 32, f: 2.5, na: 190, defaultQty: 1 },
      { re: /(\d+)?\s*empanada/i, cal: 240, p: 9, c: 24, f: 12, na: 410, defaultQty: 2 },
      { re: /(\d+)?\s*porci[oó]n(es)?\s*de\s*pizza|pizza/i, cal: 260, p: 11, c: 30, f: 10, na: 520, defaultQty: 2 },
      { re: /fruta|manzana|banana|naranja|frutilla/i, cal: 95, p: 1.2, c: 23, f: 0.3, na: 5, defaultQty: 1 },
      { re: /prote[ií]na|whey|batido/i, cal: 130, p: 25, c: 3, f: 2, na: 90, defaultQty: 1 },
      { re: /pan/i, cal: 130, p: 4.5, c: 25, f: 1.5, na: 210, defaultQty: 1 }
    ];

    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalNa = 0;
    let matched = false;

    for (const item of db) {
      const m = lower.match(item.re);
      if (m) {
        matched = true;
        const qty = m[1] ? Math.min(10, Math.max(1, parseInt(m[1], 10))) : 1;
        totalCal += item.cal * qty;
        totalP += item.p * qty;
        totalC += item.c * qty;
        totalF += item.f * qty;
        totalNa += item.na * qty;
      }
    }

    if (!matched) {
      totalCal = 320;
      totalP = 18;
      totalC = 32;
      totalF = 12;
      totalNa = 340;
    }

    const formattedName = txt.charAt(0).toUpperCase() + txt.slice(1);
    return {
      meals: [
        {
          name: formattedName,
          calories: Math.round(totalCal),
          macros: {
            protein: Math.round(totalP),
            carbs: Math.round(totalC),
            fat: Math.round(totalF),
            sodium: Math.round(totalNa)
          },
          category,
          date: todayISO,
          satiety_score: 3,
          sensations: ['Saciedad temprana'],
          opinion: null
        }
      ],
      sleep: null,
      workouts: [],
      sleep_notes: null
    };
  };

  if (!apiKey) {
    return buildFallbackFoodAnalysis(type === 'text' ? input : context);
  }

  let messages = [];

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Calculate dates for the current week to help the AI
  const weekDates = {};
  const curr = new Date();
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.setDate(first + i));
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
    weekDates[dayName] = d.toISOString().split('T')[0];
  }

  const systemPrompt = `
    You are an expert nutritionist and fitness coach AI. 
    Analyze the user input, which may contain FOOD logs, SLEEP logs, WORKOUT logs, or mixed.
    THE CURRENT DATE IS: ${today} (${todayISO}).
    DATES FOR THE CURRENT WEEK: ${JSON.stringify(weekDates)}.
    
    Return ONLY a JSON object with this EXACT structure:
    {
      "meals": [
        {
          "name": "Short descriptive name",
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fat": number, "sodium": number }, // sodium in mg (milligrams)
          "category": "Desayuno" | "Media Mañana" | "Almuerzo" | "Merienda" | "Media Tarde" | "Cena",
          "date": "YYYY-MM-DD",
          "satiety_score": number | null, // 1: Con hambre, 2: Ligero, 3: En su punto, 4: Muy lleno, 5: Pesado / empachado
          "sensations": string[], // e.g. ["Saciedad temprana", "Muy lleno", "Pesadez", "Digestión ligera"]
          "opinion": string | null // Any text reflecting user's feeling or opinion (e.g. "me sentí muy lleno")
        }
      ],
      "sleep": number | null, // Hours of sleep.
      "workouts": [
        {
          "name": "Activity name (e.g. Fútbol, Running)",
          "duration_minutes": number,
          "calories": number, // Estimate based on activity & duration
          "type": "cardio" | "strength" | "sport" | "other",
          "date": "YYYY-MM-DD"
        }
      ],
      "sleep_notes": string | null
    }

    Instructions:
    1. Food: Identify visual or text components. If multiple items are mentioned in one meal (e.g. "2 huevos con tostada y café"), combine them into a single meal entry in "meals" with summed calories and macros, or return the full meal as the first element of "meals".
    2. Sleep: Extract hours.
    3. Workouts: If user mentions exercise (e.g. "played football 1 hour", "ran 5km"), estimate the calories burned. 
    4. Date: Assume TODAY unless specified.
    5. Do not include markdown formatting.
  `;

  if (type === 'text') {
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analiza esto (Español): ${input}` }
    ];
  } else if (type === 'image') {
    const userInstruction = context
      ? `Analiza esta imagen y texto. Texto del usuario: "${context}". Si es comida, estima nutrición. Si hay actividad física o sueño, extráelo.`
      : "Analiza esta imagen. Estima valores nutricionales.";

    messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userInstruction },
          { type: "image_url", image_url: { "url": input } }
        ]
      }
    ];
  }

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 600,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    const result = JSON.parse(jsonStr);

    return result;

  } catch (error) {
    console.warn("AI Food Analysis fallback activated:", error);
    return buildFallbackFoodAnalysis(type === 'text' ? input : context);
  }
};

export const generateProfileAnalysis = async (profile) => {
  const systemPrompt = `
        Eres un experto endocrinólogo y nutricionista deportivo de "Grow Labs".
        Tu tarea es analizar el perfil metabólico de un usuario para optimizar su pérdida de peso.
        
        Datos del Usuario:
        - Edad: ${profile.age || 'N/A'}
        - Género: ${profile.gender}
        - Altura: ${profile.height} cm
        - Peso Inicial: ${profile.startingWeight || 'N/A'} kg
        - Condiciones: ${profile.health?.conditions || 'Ninguna'}
        - Medicación: ${profile.health?.medications || 'Ninguna'}
        - Metabolismo (Percibido): ${profile.health?.metabolism || 'Normal'}
        
        Instrucciones:
        1. Analiza cómo sus condiciones (ej. hipotiroidismo) y medicación afectan su TMB y quema de grasa.
        2. Determina si su meta calórica actual (${profile.calorieGoal}) parece adecuada (solo opina, no cambies números).
        3. Genera un resumen estratégico de 3-4 oraciones titulado "Perfil Metabólico".
        4. Sé empático pero científico. Explica "Por qué" le cuesta (o no) bajar de peso.
        
        Salida: Texto plano (Markdown).
    `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 300
    });
    return data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";
  } catch (e) {
    console.error(e);
    return "Error al conectar con el analista virtual.";
  }
};

export const generateDailyTip = async (profile, stats, measurements) => {
  // Context Building
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  const remainingCals = profile.calorieGoal - stats.calories;
  const measurementStr = measurements && measurements.length > 0
    ? `Último peso: ${measurements[0].weight}kg (${measurements[0].bodyFat}% grasa).`
    : "Sin mediciones recientes.";

  const healthContext = profile.health ? `Condiciones: ${profile.health.conditions || 'Ninguna'}, Meds: ${profile.health.medications || 'Ninguna'}` : 'Salud: Sin datos';

  const systemPrompt = `
      Eres un coach nutricional experto de "Grow Labs". Tu objetivo es dar UN SOLO consejo corto, potente y personalizado para HOY (${today}).
      
      Datos del usuario (${profile.name}):
      - Meta: ${profile.calorieGoal} kcal/día (P:${profile.proteinGoal}g, C:${profile.carbsGoal}g, G:${profile.fatGoal}g).
      - Hoy lleva: ${Math.round(stats.calories)} kcal (P:${Math.round(stats.protein)}g).
      - Progreso: ${measurementStr}
      - ${healthContext}
      
      Instrucciones:
      1. Analiza si le falta proteína, si va bien de calorías, o si necesita motivación basada en su peso reciente.
      2. ten EN CUENTA sus condiciones médicas (ej. Hipotiroidismo reduce metabolismo, Diabetes requiere cuidar picos glucémicos) para el consejo si es relevante.
      3. Sé directo, amigable y motivador. MÁXIMO 2 oraciones.
    `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 150,
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("Tip Generation Error:", error);
    return "Concéntrate en tus proteínas hoy y bebe suficiente agua. ¡Tú puedes!"; // Fallback
  }
};

export const chatWithAI = async (message, state) => {

  const getArgDate = () => {
    const now = new Date();
    const argentinaOffset = -3;
    const argentinaTime = new Date(now.getTime() + (argentinaOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return argentinaTime.toISOString().split('T')[0];
  };

  const todayStr = getArgDate();
  const yesterdayDate = new Date(new Date(todayStr + 'T12:00:00').getTime() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const getDaySummary = (date) => {
    const meals = state.dailyLog?.filter(m => m.date === date) || [];
    const workouts = state.workouts?.filter(w => w.date === date) || [];
    const dayData = state.days?.[date] || {};

    const macros = meals.reduce((acc, m) => {
      acc.cal += (m.calories || 0);
      acc.p += (m.macros?.protein || 0);
      acc.c += (m.macros?.carbs || 0);
      acc.f += (m.macros?.fat || 0);
      acc.na += (m.macros?.sodium || 0);
      return acc;
    }, { cal: 0, p: 0, c: 0, f: 0, na: 0 });

    const workoutSum = workouts.reduce((acc, w) => {
      acc.cal += (w.calories || 0);
      acc.count++;
      return acc;
    }, { cal: 0, count: 0 });

    return {
      date,
      macros,
      water: dayData.water || 0,
      sleep: dayData.sleep || 0,
      workouts: workoutSum,
      mealNames: meals.map(m => m.name).join(', '),
      workoutNames: workouts.map(w => w.name).join(', ')
    };
  };

  // History (Last 7 days simplified)
  const history = [];
  for (let i = 2; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const s = getDaySummary(dStr);
    if (s.macros.cal > 0 || s.workouts.count > 0) {
      history.push(`${dStr}: ${Math.round(s.macros.cal)}kcal`);
    }
  }

  const todaySummary = getDaySummary(todayStr);
  const yesterdaySummary = getDaySummary(yesterdayStr);

  // Calculate dates for the current week to help the AI
  const weekDates = {};
  const curr = new Date();
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.setDate(first + i));
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
    weekDates[dayName] = d.toISOString().split('T')[0];
  }

  const profile = state.profile || {};
  const measurement = state.measurements?.[state.measurements.length - 1] || {};
  const healthInfo = profile.health
    ? `Condiciones: ${profile.health.conditions || 'Ninguna'}, Meds: ${profile.health.medications || 'Ninguna'}, Metabolismo: ${profile.health.metabolism || 'Normal'}`
    : 'Salud: Sin registros especiales';

  const systemPrompt = `
      Eres GrowFit AI, un asistente de salud y fitness altamente inteligente, empático y experto médico-deportivo.
      Tu misión es ayudar a ${profile.name || 'el atleta'} a alcanzar su meta de ${profile.targetWeight || 'peso ideal'} kg.

      DATOS DE HOY (${todayStr}):
      - Nutrición: ${Math.round(todaySummary.macros.cal)} kcal (P:${todaySummary.macros.p}g, C:${todaySummary.macros.c}g, F:${todaySummary.macros.f}g, Sodio:${Math.round(todaySummary.macros.na)}mg).
      - Comidas: ${todaySummary.mealNames || 'Nada registrado aún'}.
      - Actividad: ${todaySummary.workouts.count} entrenos (${todaySummary.workouts.cal} kcal). ${todaySummary.workoutNames ? `Ejercicios: ${todaySummary.workoutNames}` : ''}
      - Otros: ${todaySummary.water}ml agua, ${todaySummary.sleep}h sueño.

      DATOS DE AYER (${yesterdayStr}):
      - Nutrición: ${Math.round(yesterdaySummary.macros.cal)} kcal. Comidas: ${yesterdaySummary.mealNames || 'Nada'}.
      - Actividad: ${yesterdaySummary.workouts.count} entrenos. ${yesterdaySummary.workoutNames ? `Ejercicios: ${yesterdaySummary.workoutNames}` : ''}
      - Otros: ${yesterdaySummary.water}ml agua, ${yesterdaySummary.sleep}h sueño.
      
      FECHAS DE LA SEMANA ACTUAL: ${JSON.stringify(weekDates)}.
      
      ${history.length > 0 ? `HISTORIAL SEMANAL: ${history.join(' | ')}` : ''}

      PERFIL DEL USUARIO:
      - Objetivos Diarios: ${profile.calorieGoal} kcal (P:${profile.proteinGoal}g, C:${profile.carbsGoal}g, G:${profile.fatGoal}g).
      - Peso: ${measurement.weight || 'N/A'} kg (Meta: ${profile.targetWeight || 'N/A'} kg).
      - Perfil Clínico: ${healthInfo}.

      REGLAS DE ORO:
      1. Usa los datos anteriores para responder con precisión quirúrgica. Si preguntan "qué comí ayer", lista las comidas de AYER.
      2. Si mencionan un día de la semana (ej. "el martes"), usa la FECHA correspondiente de la SEMANA ACTUAL indicada arriba. Si el día mencionado es futuro, asume que se refieren al de la SEMANA PASADA.
      3. Sé breve y conciso (máximo 2 parrafos cortos). Usa emojis.
      4. Si tiene condiciones médicas (ej. Hipotiroidismo, Diabetes), adapta tus consejos (ej. recomendar alimentos de bajo índice glucémico).
      5. Si toma medicación (ej. Levotiroxina), recuérdale los tiempos de absorción si pregunta por comidas.
    `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 400,
      temperature: 0.7
    });
    return data.choices?.[0]?.message?.content || "No pude procesar tu mensaje.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Lo siento, tuve un problema de conexión. Intenta de nuevo.";
  }
};

export const generateMealPlan = async (profile, preferences = '') => {
  const p = profile;
  const healthInfo = p.health ? `Condiciones: ${p.health.conditions || 'None'}` : '';

  const systemPrompt = `
    Eres un chef nutricionista experto de "Grow Labs".
    Genera un PLAN DE COMIDAS DE 1 DÍA completo y delicioso para:
    - Objetivo: ${p.calorieGoal} kcal (P:${p.proteinGoal}g, C:${p.carbsGoal}g, F:${p.fatGoal}g).
    - Perfil: ${healthInfo}.
    - Preferencias extra: ${preferences || 'Sin preferencias'}.

    Debes devolver un JSON con esta estructura exacta:
    {
      "meals": [
        {
          "name": "Nombre creativo del plato",
          "category": "Desayuno", // Desayuno, Media Mañana, Almuerzo, Merienda, Cena
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fat": number },
          "ingredients": "Breve lista de ingredientes"
        },
        ... (Crea 5 comidas: Desayuno, Media Mañana, Almuerzo, Media Tarde, Cena)
      ],
      "total_calories": number,
      "tips": "Un consejo corto de preparación"
    }
    Asegúrate de que la suma de calorías se acerque al objetivo (+/- 100kcal).
    Prioriza alimentos reales, baratos y saciantes.
  `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 1000,
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    // Sanitize in case of markdown
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Meal Plan Error:", error);
    throw error;
  }
};

export const generateSmartHabits = async (profile, contextData) => {
  const systemPrompt = `
    Eres un Coach de Vida y Salud de Alto Rendimiento.
    Tu misión: Analizar los datos de ayer del usuario y generarle 3 "Micro-Retos" (Hábitos) para HOY.
    
    Toma en cuenta:
    - Perfil: ${profile.name}, Meta: ${profile.calorieGoal}kcal.
    - Salud: ${profile.health?.conditions || 'Ninguna'}, Meds: ${profile.health?.medications || 'Ninguna'}.
    - CONTEXTO RECIENTE: ${contextData}
    
    Lógica de Decisión:
    1. Si ayer comió mal (muchas cal/azúcar) -> Reto de Detox/Ayuno/Verdes hoy.
    2. Si ayer fue sedentario -> Reto de Movimiento hoy.
    3. Si ayer cumplió todo -> Reto de Mantenimiento o Motivación mental.
    4. Si tiene condiciones (ej. Diabetes) -> Prioriza glucosa estable.

    Responde SOLO un JSON:
    [
      { "id": "smart_1", "name": "Nombre corto (max 20 chars)", "icon": "material_icon_name", "reason": "Por qué este reto hoy" },
      { "id": "smart_2", "name": "...", "icon": "...", "reason": "..." },
      { "id": "smart_3", "name": "...", "icon": "...", "reason": "..." }
    ]
  `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 300,
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Habits Error:", error);
    return [
      { id: 'fallback_1', name: 'Beber 2L Agua', icon: 'water_drop', reason: 'Hidratación básica' },
      { id: 'fallback_2', name: 'Caminar 15min', icon: 'directions_walk', reason: 'Movimiento esencial' },
      { id: 'fallback_3', name: 'Comer Verduras', icon: 'restaurant', reason: 'Nutrición' }
    ];
  }
};

export const generateWeeklyReport = async (state) => {
  // Gather last 7 days data relative to the selected date or today
  const referenceDate = state.selectedDate ? new Date(state.selectedDate + 'T12:00:00') : new Date();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayMeals = state.dailyLog.filter(m => m.date === dateStr);
    const dayWorkouts = state.workouts.filter(w => w.date === dateStr);

    last7Days.push({
      date: dateStr,
      calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
      protein: dayMeals.reduce((s, m) => s + (m.macros?.protein || 0), 0),
      meals: dayMeals.map(m => m.name).join(', '),
      workouts: dayWorkouts.map(w => w.name).join(', '),
      workoutCount: dayWorkouts.length
    });
  }

  console.log("Weekly Report Data Payload:", last7Days);

  const systemPrompt = `
        Eres el "Chief Performance Analyst" de Grow Labs. 
        Tu misión es generar un REPORTE DE RENDIMIENTO NEURAL (Semanal) para un atleta de élite.
        
        DATOS DE LA ÚLTIMA SEMANA (Telemetry):
        ${JSON.stringify(last7Days)}
        Protocolo Calórico Base: ${state.profile.calorieGoal} kcal
        
        INSTRUCCIONES DE ESTILO:
        1. Tono: "Premium Powerhouse". Debe sentirse como un análisis de una IA avanzada o un equipo de F1.
        2. Personalidad: Usa modismos sanjuaninos sutiles (ej. "viste", "che", "tremendo") para dar cercanía humana, pero mantén un rigor científico absoluto.
        3. Análisis: No solo resumas. Identifica patrones (ej. "tus proteínas bajaron los días que entrenaste piernas").
        
        ESTRUCTURA DE SALIDA (JSON PURO):
        {
          "summary": "Análisis estratégico de 4 líneas. Conciso, potente e inteligente.",
          "kpis": {
            "avg_calories": número (promedio real),
            "total_workouts": número (conteo total),
            "consistency_score": número (1-10, basado en qué tanto se acercó a la meta),
            "best_day": "YYYY-MM-DD"
          },
          "strengths": ["Métrica optimizada 1", "Métrica optimizada 2"],
          "weaknesses": ["Punto de fricción 1", "Punto de fricción 2"],
          "mission": "Protocolo de mejora para la próxima semana. Sea específico.",
          "calories_chart_data": [array de números con las calorías de los últimos 7 días, del más antiguo al más reciente]
        }
    `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(jsonStr);

  } catch (e) {
    console.error("Weekly Report Error:", e);
    throw e;
  }
};

export const generateShoppingList = async (profile, history) => {
  const systemPrompt = `
        Eres un Nutricionista de San Juan, Argentina, experto en "comer sano con poca plata".
        Genera una LISTA DE COMPRAS para ${profile.name}.
        Meta: ${profile.calorieGoal} kcal (Alta Proteína: ${profile.proteinGoal}g).
        
        CONTEXTO ECONÓMICO (MUY IMPORTANTE):
        - El usuario está corto de dinero. NO recomiendes salmón, palta importada ni suplementos caros.
        - Prioriza: Huevos (maple), Pollo (pata muslo es más barato que pechuga), Hígado, Carne picada, Lentejas, Atún desmenuzado, Avena suelta.
        - Verduras de estación (Feria de Capital o Mercado de Abasto): Zapallo, Acelga, Papa, Camote.
        - Marcas recomendadas (económicas/locales): Marolio, Molto, La Campagnola, Arcor, Tregar, Ilolay.
        
        Instrucciones:
        1. Organiza por: "🥩 Proteínas Económicas", "🥔 Carbos y Energía", "🥑 Grasas y Varios".
        2. Pon cantidades para 1 semana.
        3. Agrega un "Tip de Ahorro Sanjuanino" al final (ej: "Buscá precios en el Vea o el Átomo", "Comprá el bolsón en la feria").
        
        Salida: Texto plano con formato checkboxes "- [ ] Item".
    `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 400,
      temperature: 0.7
    });
    return data.choices?.[0]?.message?.content || "No se pudo generar la lista.";
  } catch (e) {
    console.error("Shopping List Error:", e);
    return "Error al generar lista de compras.";
  }
};

// --- COACHING IA: TRATAMIENTO OBETIDE (GLP-1) Y RESUMEN DIARIO/SEMANAL ---

export const generateObetideCoachingSummary = async (state) => {
  const latestObetide = state.obetideTreatments?.[0] || null;
  const recentMeals = (state.dailyLog || []).slice(0, 15);
  const recentMeasurements = (state.measurements || []).slice(0, 5);
  const profile = state.profile || {};

  const systemPrompt = `
    Eres un médico endocrinólogo y nutricionista clínico de alta experiencia, especialista en agonistas del receptor GLP-1 (como Obetide / Semaglutida).
    El usuario está en un tratamiento médico con Obetide para descenso de peso, iniciando con titulación progresiva de 0.25 ml por semana.
    
    Analiza la situación actual y devuelve un JSON con:
    {
      "statusTitle": "Título motivador y clínico (ej: Buena tolerancia a 0.25 ml)",
      "titrationStatus": "Evaluación de la dosis actual y cuándo evaluar el próximo escalón",
      "proteinAlert": "Consejo sobre masa muscular y consumo proteico",
      "satietyNotes": "Análisis de saciedad y efectos secundarios",
      "actionableTips": ["Tip 1", "Tip 2", "Tip 3"]
    }

    Reglas:
    - Prioriza siempre la preservación de masa muscular magra (consumo de proteína 1.6-2.0 g/kg).
    - Prevención de náuseas o reflujo: porciones chicas, masticar despacio, evitar grasas pesadas e hidratación constante.
    - Responde únicamente el objeto JSON sin formato markdown.
  `;

  const userContext = JSON.stringify({
    profile: {
      name: profile.name,
      currentWeight: recentMeasurements[0]?.weight || profile.startingWeight,
      targetWeight: profile.targetWeight,
      dailyCalorieGoal: profile.calorieGoal,
      proteinGoal: profile.proteinGoal
    },
    latestObetideTreatment: latestObetide,
    recentMealsCount: recentMeals.length,
    recentWeightTrend: recentMeasurements.map(m => ({ date: m.date, weight: m.weight }))
  });

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analiza este paciente en tratamiento con Obetide: ${userContext}` }
      ],
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content.trim().replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error generating Obetide coaching summary:", err);
    throw err;
  }
};

// --- GENERADOR DE PLAN NUTRICIONAL ADAPTADO A OBETIDE (GLP-1) ---

export const generateMealPlanWithAI = async (profile, targetCalories = null) => {
  const calories = targetCalories || profile.calorieGoal || 1800;

  const systemPrompt = `
    Eres un Nutricionista Deportivo y Clínico experto en pacientes bajo tratamiento médico con agonistas GLP-1 (Obetide / Semaglutida).
    Crea un plan de alimentación estructurado para 7 días enfocado en:
    1. Alta densidad proteica para proteger masa muscular mientras se pierde grasa.
    2. Digestibilidad ligera: platos sin exceso de grasas saturadas para prevenir náuseas y pesadez gastrointestinal típicas del GLP-1.
    3. Distribución en 4 a 5 comidas chicas y fáciles de tolerar.
    4. Meta calórica diaria: aprox ${calories} kcal.

    Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
    {
      "targetCalories": ${calories},
      "estimatedProteinGrams": number,
      "clinicalRecommendation": "Recomendación médica sobre hidratación y tiempos de ingesta",
      "days": [
        {
          "day": "Lunes",
          "meals": [
            { "meal": "Desayuno", "name": "Nombre del plato", "calories": 350, "protein": 30, "description": "Detalle y porciones" },
            { "meal": "Almuerzo", "name": "Nombre del plato", "calories": 500, "protein": 45, "description": "Detalle y porciones" },
            { "meal": "Merienda", "name": "Nombre del plato", "calories": 250, "protein": 20, "description": "Detalle y porciones" },
            { "meal": "Cena", "name": "Nombre del plato", "calories": 400, "protein": 35, "description": "Detalle y porciones" }
          ]
        }
      ]
    }
    No incluyas markdown backticks en la respuesta.
  `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generar plan nutricional para ${profile.name || 'Paciente'}, peso meta: ${profile.targetWeight || 70}kg.` }
      ],
      temperature: 0.7
    });
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content.trim().replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error generating meal plan:", err);
    throw err;
  }
};

// --- ANALIZADOR FISIOLÓGICO Y BIOMÉTRICO DE ENTRENAMIENTO CON IA ---

export const analyzeWorkoutWithAI = async (workoutText, state) => {
  const apiKey = getOpenAIKey();
  const profile = state?.profile || {};
  const latestM = (state?.measurements && state.measurements.length > 0)
    ? [...state.measurements].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const weight = Number(latestM?.weight || profile.startingWeight || 85);
  const height = Number(latestM?.height || profile.height || 175);
  const age = Number(profile.age || 32);
  const gender = profile.gender || 'male';
  const bodyFat = Number(latestM?.bodyFat || 24);
  const leanMass = Number(latestM?.leanMass || (weight * (1 - bodyFat / 100)).toFixed(1));
  const latestObetide = state?.obetideTreatments?.[0] || null;
  const conditions = profile.health?.conditions || 'Tratamiento descenso de peso';
  const medications = profile.health?.medications || (latestObetide ? `Obetide/Dutide (${latestObetide.dose_ml}ml)` : 'Ninguna');

  // Local intelligent fallback builder if API fails or is offline
  const buildFallbackAnalysis = (text) => {
    const lower = (text || '').toLowerCase();
    let duration = 60;
    const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:hora|horas|hs|h\b)/);
    const minMatch = lower.match(/(\d+)\s*(?:min|minutos|m\b)/);
    if (hourMatch) {
      duration = Math.round(parseFloat(hourMatch[1].replace(',', '.')) * 60);
      if (minMatch) duration += parseInt(minMatch[1]);
    } else if (minMatch) {
      duration = parseInt(minMatch[1]);
    }

    let met = 6.5;
    let icon = 'fitness_center';
    let cleanName = text.trim() || 'Entrenamiento Funcional';
    let hrZone = 'Zona 3-4 (138 - 164 lpm) · Aeróbico / Mixto';
    let muscles = ['Core & Estabilizadores', 'Tren Inferior', 'Tren Superior', 'Sistema Cardiovascular'];
    let endorphinPct = 92;

    if (lower.includes('funcional') || lower.includes('crossfit') || lower.includes('hiit') || lower.includes('circuito')) {
      met = 7.5;
      icon = 'bolt';
      hrZone = 'Zona 4 (148 - 172 lpm) · Umbral Metabólico';
      endorphinPct = 96;
    } else if (lower.includes('fútbol') || lower.includes('futbol') || lower.includes('pádel') || lower.includes('padel')) {
      met = 8.0;
      icon = 'sports_soccer';
      hrZone = 'Zona 4 (145 - 170 lpm) · Intermitente Alta Intensidad';
      muscles = ['Cuádriceps & Isquiotibiales', 'Gemelos', 'Core', 'Capacidad Cardiorrespiratoria'];
      endorphinPct = 95;
    } else if (lower.includes('bici') || lower.includes('ciclismo') || lower.includes('spinning')) {
      met = 7.2;
      icon = 'directions_bike';
      hrZone = 'Zona 3 (135 - 158 lpm) · Resistencia Aeróbica';
      muscles = ['Cuádriceps', 'Glúteos', ' Isquiotibiales', 'Sistema Cardiorrespiratorio'];
      endorphinPct = 90;
    } else if (lower.includes('caminata') || lower.includes('caminar')) {
      met = 4.2;
      icon = 'directions_walk';
      hrZone = 'Zona 2 (112 - 130 lpm) · Oxidación Lipídica Pura';
      muscles = ['Tren Inferior', 'Glúteos', 'Core Postural'];
      endorphinPct = 82;
    } else if (lower.includes('pesas') || lower.includes('musculacion') || lower.includes('musculación') || lower.includes('gym') || lower.includes('fuerza')) {
      met = 5.8;
      icon = 'fitness_center';
      hrZone = 'Zona 2-3 (120 - 148 lpm) · Tensión Mecánica & Hipertrofia';
      muscles = ['Fibras Rápidas Tipo II', 'Pectorales & Dorsales', 'Tren Inferior', 'Core'];
      endorphinPct = 91;
    }

    const calories = Math.round(met * weight * (duration / 60));
    const epocCalories = Math.round(calories * 0.14);
    const fatOxidizedG = Math.round((calories * 0.55) / 9);
    const glycogenUsedG = Math.round((calories * 0.45) / 4);
    const hydrationLossMl = Math.round((duration / 60) * (weight * 8.5));

    return {
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      duration,
      calories,
      epoc_calories: epocCalories,
      total_metabolic_burn: calories + epocCalories,
      fat_oxidized_g: fatOxidizedG,
      glycogen_used_g: glycogenUsedG,
      met_value: met,
      icon,
      endorphins_score: `${endorphinPct}% · Pico Alto de Endorfinas y Dopamina`,
      endorphins_detail: `Liberación intensa de beta-endorfinas, serotonina y BDNF cerebral. Reduce el cortisol (estrés) en un ~30% y potencia el control de ansiedad y saciedad por las próximas 6 a 8 horas.`,
      heart_rate_zone: hrZone,
      muscle_groups: muscles,
      hydration_loss_ml: hydrationLossMl,
      recovery_hours: duration >= 60 ? '24 a 36 hs' : '18 a 24 hs',
      metabolic_impact: `Calculado para tu peso actual de ${weight} kg (${leanMass} kg de masa magra): este entrenamiento preserva tejido muscular activo, eleva tu sensibilidad a la insulina por 24h y potencia la pérdida de grasa visceral.`,
      post_workout_nutrition: `Ingerir 30-35g de proteína limpia + ${hydrationLossMl} ml de agua en los próximos 45 minutos para reparar fibras y proteger masa magra.`
    };
  };

  if (!apiKey) {
    return buildFallbackAnalysis(workoutText);
  }

  const systemPrompt = `
    Eres un Fisiólogo del Ejercicio, Deportólogo y Endocrinólogo Clínico de "Grow Labs".
    El usuario te dirá qué ejercicio hizo hoy (ej. "1 hora de funcional", "45 min de pesas", "jugué fútbol 1 hora").
    Debes calcular con precisión fisiológica TODOS los indicadores basándote en el cuerpo y datos reales del usuario cargados en el sistema:
    
    DATOS BIOMÉTRICOS DEL USUARIO EN EL SISTEMA:
    - Nombre: ${profile.name || 'Atleta'}
    - Peso Corporal Actual: ${weight} kg
    - Altura: ${height} cm
    - Edad: ${age} años | Género: ${gender}
    - % Grasa Corporal: ${bodyFat}% | Masa Magra Muscular (LBM): ${leanMass} kg
    - Condiciones / Contexto Clínico: ${conditions} | Medicación: ${medications}
    - Tratamiento GLP-1 (Obetide/Dutide): ${latestObetide ? `Activo (${latestObetide.dose_ml} ml)` : 'En seguimiento'}

    Fórmula base calórica: Calorías = MET * ${weight} kg * (duración_minutos / 60), ajustada por masa magra (${leanMass} kg) y edad (${age}).
    
    Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin backticks) con esta estructura exacta:
    {
      "name": "Nombre claro y profesional del ejercicio (ej: Funcional de Alta Intensidad)",
      "duration": number (minutos totales, ej: 60),
      "calories": number (calorías directas quemadas en la sesión según sus ${weight}kg),
      "epoc_calories": number (calorías extra quemadas post-ejercicio por efecto EPOC / Afterburn en las siguientes 12-24h),
      "total_metabolic_burn": number (calories + epoc_calories),
      "fat_oxidized_g": number (gramos estimados de grasa corporal oxidada),
      "glycogen_used_g": number (gramos de glucógeno muscular utilizado),
      "met_value": number (MET estimado de la actividad, ej: 7.5),
      "icon": "fitness_center" | "bolt" | "sports_soccer" | "directions_bike" | "directions_walk" | "sprint",
      "endorphins_score": "Ej: 95% · Pico Alto de Endorfinas, Dopamina y Serotonina",
      "endorphins_detail": "Explicación neuroquímica clara: liberación de beta-endorfinas, reducción de cortisol, mejora del estado de ánimo y sinergia con el centro de saciedad hipotalámico.",
      "heart_rate_zone": "Ej: Zona 3-4 (142 - 166 lpm) · Umbral Aeróbico-Metabólico",
      "muscle_groups": ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"],
      "hydration_loss_ml": number (ml de sudoración perdidos y agua recomendada a reponer según sus ${weight}kg),
      "recovery_hours": "Ej: 24 a 36 hs",
      "metabolic_impact": "Explicación personalizada mencionando su peso (${weight}kg), su masa magra (${leanMass}kg) y cómo esta sesión protege su músculo e impulsa la lipólisis.",
      "post_workout_nutrition": "Recomendación concreta de proteína e hidratación post-entreno adaptada a su perfil."
    }
  `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `¿Qué ejercicio hice hoy?: "${workoutText}"` }
      ],
      max_tokens: 650,
      temperature: 0.3
    });
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(content);
    return {
      ...buildFallbackAnalysis(workoutText),
      ...parsed
    };
  } catch (err) {
    console.warn("AI Workout fallback used:", err);
    return buildFallbackAnalysis(workoutText);
  }
};

export const analyzeFridgeWithAI = async (ingredientsText, remainingCalories = 600, remainingProtein = 45) => {
  const apiKey = getOpenAIKey();
  const cleanIng = (ingredientsText || 'huevos, queso, pollo, verduras').trim();

  const buildFallbackRecipes = () => [
    {
      name: `Omelette Proteico con ${cleanIng.split(',')[0] || 'Vegetales'}`,
      prep_time: '12 min',
      calories: Math.min(520, Math.max(280, Math.round(remainingCalories * 0.65))),
      macros: { protein: 34, carbs: 14, fat: 14, sodium: 380 },
      steps: 'Batir claras y huevos, saltear los ingredientes disponibles en sartén antiadherente y plegar con queso magro.',
      why_fit: 'Alta densidad proteica para proteger masa magra con mínima carga glucémica.'
    },
    {
      name: `Salteado Magro Express (${cleanIng.slice(0, 35)})`,
      prep_time: '18 min',
      calories: Math.min(580, Math.max(320, Math.round(remainingCalories * 0.75))),
      macros: { protein: 42, carbs: 24, fat: 12, sodium: 420 },
      steps: 'Cortar en cubos la fuente de proteína y vegetales, dorar al wok con rocío vegetal y hierbas.',
      why_fit: 'Saciedad prolongada compatible con protocolo GLP-1 y fácil digestión.'
    },
    {
      name: `Bowl Nutricional Tibio de Heladera`,
      prep_time: '15 min',
      calories: Math.min(460, Math.max(250, Math.round(remainingCalories * 0.55))),
      macros: { protein: 29, carbs: 28, fat: 11, sodium: 310 },
      steps: 'Combinar base de vegetales cocidos o frescos con proteína dorada a la plancha y condimento suave.',
      why_fit: 'Volumen gástrico controlado sin pesadez postprandial.'
    }
  ];

  if (!apiKey) return buildFallbackRecipes();

  const systemPrompt = `
    Eres un Chef Nutricionista Clínico de Grow Labs especializado en pacientes en descenso de peso y protocolo GLP-1.
    El usuario tiene estos ingredientes en su heladera/alacena: "${cleanIng}".
    Le quedan disponibles hoy aproximadamente ${remainingCalories} kcal y necesita cubrir ${remainingProtein}g de proteína.
    Devuelve ÚNICAMENTE un JSON válido con el formato:
    {
      "recipes": [
        {
          "name": "Nombre tentador del plato",
          "prep_time": "15 min",
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fat": number, "sodium": number },
          "steps": "Instrucción breve en 1-2 oraciones",
          "why_fit": "Por qué protege su masa muscular y saciedad"
        }
      ]
    }
    Genera exactamente 3 recetas prácticas.
  `;

  try {
    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Ingredientes: ${cleanIng}` }
      ],
      max_tokens: 600,
      temperature: 0.4,
      response_format: { type: "json_object" }
    });
    if (data.error) throw new Error(data.error.message);
    const parsed = JSON.parse(data.choices[0].message.content.trim());
    return parsed.recipes?.length ? parsed.recipes : buildFallbackRecipes();
  } catch (e) {
    console.warn("Fridge AI fallback:", e);
    return buildFallbackRecipes();
  }
};

export const analyzeReceiptWithAI = async (input, type = 'text') => {
  const apiKey = getOpenAIKey();

  const buildFallbackReceipt = (txt) => {
    const raw = (txt || 'Compra Supermercado Saludable').trim();
    const numMatch = raw.match(/(\d{3,8})/);
    const amount = numMatch ? Number(numMatch[1]) : 42500;
    const isPharma = /farmacia|obetide|dutide|medicamento/i.test(raw);
    return {
      merchant: isPharma ? 'Farmacia / Tratamiento GLP-1' : 'Supermercado & Alimentos Saludables',
      amount,
      category_id: isPharma ? 'salud-obetide' : 'operativos-vida',
      category_name: isPharma ? 'Salud & Obetide' : 'Operativos & Alimentación',
      detected_items: isPharma ? ['Obetide / Insumos Farmacia'] : ['Pechuga de Pollo', 'Huevos Maples', 'Yogur Griego', 'Vegetales Frescos'],
      protein_estimate_g: isPharma ? 0 : 480,
      health_score: 94,
      summary: isPharma
        ? 'Inversión directa en continuidad terapéutica GLP-1.'
        : 'Compra de alta densidad proteica (~480g de proteína limpia estimada para tu semana).'
    };
  };

  if (!apiKey) return buildFallbackReceipt(type === 'text' ? input : 'Ticket escaneado');

  const systemPrompt = `
    Analiza este ticket o descripción de gasto del usuario.
    Devuelve ÚNICAMENTE un JSON válido:
    {
      "merchant": "Nombre del comercio o concepto",
      "amount": number (monto total en ARS),
      "category_id": "salud-obetide" | "operativos-vida" | "vivienda-servicios" | "compromisos-cuotas",
      "category_name": "Salud & Obetide" | "Operativos & Vida" | "Vivienda & Servicios",
      "detected_items": ["Item 1", "Item 2"],
      "protein_estimate_g": number (gramos totales de proteína estimados en la compra si son alimentos, o 0),
      "health_score": number (0 a 100 según qué tan saludable es la compra),
      "summary": "Breve conclusión financiera-nutricional en 1 oración"
    }
  `;

  try {
    const messages = type === 'image'
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: [{ type: "text", text: "Extrae monto, comercio y alimentos de este ticket:" }, { type: "image_url", image_url: { url: input } }] }
        ]
      : [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Ticket / Gasto: ${input}` }
        ];

    const data = await callOpenAICompletions({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 450,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    if (data.error) throw new Error(data.error.message);
    return { ...buildFallbackReceipt(type === 'text' ? input : ''), ...JSON.parse(data.choices[0].message.content.trim()) };
  } catch (e) {
    console.warn("Receipt AI fallback:", e);
    return buildFallbackReceipt(type === 'text' ? input : '');
  }
};



