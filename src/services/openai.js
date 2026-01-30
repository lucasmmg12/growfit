export const analyzeFood = async (input, type = 'text', context = '') => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  let messages = [];

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamic import or passed from caller? Let's use the same logic as state.js manually here to avoid complex imports if possible, or just use the logic directly.
  const getArgDate = () => {
    const now = new Date();
    const argentinaOffset = -3;
    const argentinaTime = new Date(now.getTime() + (argentinaOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return argentinaTime.toISOString().split('T')[0];
  };
  const todayISO = getArgDate();

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
          "macros": { "protein": number, "carbs": number, "fat": number },
          "category": "Desayuno" | "Media Mañana" | "Almuerzo" | "Merienda" | "Media Tarde" | "Cena",
          "date": "YYYY-MM-DD"
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
    1. Food: Identify visual or text components. Sum up calories/macros.
    2. Sleep: Extract hours.
    3. Workouts: If user mentions exercise (e.g. "played football 1 hour", "ran 5km"), estimate the calories burned. 
       - Approx: Football/Soccer ~8-10 kcal/min. Running ~10-12 kcal/min. Walking ~4 kcal/min.
    4. Date: Assume TODAY unless specified. 
       - If the user mentions a day of the week (e.g., "el jueves", "el lunes"), use the date from the current week provided above. 
       - If the day mentioned is in the future relative to today, assume they mean that day from the PREVIOUS week.
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 600,
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    const result = JSON.parse(jsonStr);

    return result;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

export const generateProfileAnalysis = async (profile) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 300
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";
  } catch (e) {
    console.error(e);
    return "Error al conectar con el analista virtual.";
  }
};

export const generateDailyTip = async (profile, stats, measurements) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("Tip Generation Error:", error);
    return "Concéntrate en tus proteínas hoy y bebe suficiente agua. ¡Tú puedes!"; // Fallback
  }
};

export const chatWithAI = async (message, state) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
      return acc;
    }, { cal: 0, p: 0, c: 0, f: 0 });

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
      - Nutrición: ${Math.round(todaySummary.macros.cal)} kcal (P:${todaySummary.macros.p}g, C:${todaySummary.macros.c}g, F:${todaySummary.macros.f}g).
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No pude procesar tu mensaje.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Lo siento, tuve un problema de conexión. Intenta de nuevo.";
  }
};

export const generateMealPlan = async (profile, preferences = '') => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '');
    return JSON.parse(jsonStr);

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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 1500,
        temperature: 0.7
      })
    });
    const data = await response.json();
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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API Key");

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 400,
        temperature: 0.7
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No se pudo generar la lista.";
  } catch (e) {
    console.error("Shopping List Error:", e);
    return "Error al generar lista de compras.";
  }
};
