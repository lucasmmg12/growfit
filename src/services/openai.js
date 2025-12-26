export const analyzeFood = async (input, type = 'text', context = '') => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  let messages = [];

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayISO = new Date().toISOString().split('T')[0];

  // ... existing code ...
  const systemPrompt = `
    You are an expert nutritionist and fitness coach AI. 
    Analyze the user input, which may contain FOOD logs, SLEEP logs, WORKOUT logs, or mixed.
    THE CURRENT DATE IS: ${today} (${todayISO}).
    
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

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Summarize State for Context
  const profile = state.profile || {};
  const todayStats = state.days?.[new Date().toISOString().split('T')[0]] || { calorieCount: 0, protein: 0, carbs: 0, fat: 0 };
  const measurement = state.measurements?.[0] || {};
  const recentWorkouts = state.workouts?.slice(0, 3) || [];

  const healthInfo = profile.health
    ? `Condiciones: ${profile.health.conditions || 'Ninguna'}, Meds: ${profile.health.medications || 'Ninguna'}, Metabolismo: ${profile.health.metabolism || 'Normal'}`
    : 'Salud: Sin regitros especiales';

  const systemPrompt = `
      Eres GrowFit AI, un asistente de salud y fitness altamente inteligente, empático y experto médico-deportivo.
      
      CONTEXTO ACTUAL (${today}):
      - Usuario: ${profile.name || 'Atleta'}.
      - Meta Diaria: ${profile.calorieGoal || 2000} kcal.
      - Estado Hoy: Ha consumido ${Math.round(todayStats.calorieCount || 0)} kcal.
      - Peso Actual: ${measurement.weight || 'N/A'} kg.
      - Entrenamientos Recientes: ${recentWorkouts.map(w => w.name).join(', ') || 'Ninguno reciente'}.
      - PERFIL CLÍNICO: ${healthInfo}.
      
      OBJETIVO:
      Responde a la pregunta del usuario basándote en este contexto.
      - Si pregunta qué comer, sugiere algo que encaje en sus macros y sea seguro para sus condiciones (ej. Si tiene SOP o Diabetes, evita azúcares simples).
      - Si toma medicación (ej. Levotiroxina), recuérdale los tiempos de espera si pregunta por desayunos.
      
      PERSONALIDAD:
      - Motivador, energético, claro y conciso.
      - Usa emojis ocasionalmente.
      - Respuestas breves (max 2-3 parrafos cortos).
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

  } catch (error) {
    console.error("Habits Error:", error);
    return [
      { id: 'fallback_1', name: 'Beber 2L Agua', icon: 'water_drop', reason: 'Hidratación básica' },
      { id: 'fallback_2', name: 'Caminar 15min', icon: 'directions_walk', reason: 'Movimiento esencial' },
      { id: 'fallback_3', name: 'Comer Verduras', icon: 'restaurant', reason: 'Nutrición' }
    ];
  }
};
