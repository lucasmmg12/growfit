import { getState, saveAiMealPlan, addMeal, getArgentinaDate } from '../state';
import { generateMealPlanWithAI } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

let activeDayTab = 0;

export const renderMealPlan = () => {
    const state = getState();
    const plans = state.aiMealPlans || [];
    const currentPlan = plans[0] ? (plans[0].plan_data || plans[0]) : null;
    const profile = state.profile || {};

    const days = currentPlan?.days || [];
    const currentDay = days[activeDayTab] || days[0] || null;

    return `
    <div class="flex h-screen w-full bg-[#0F172A] font-body text-slate-100 overflow-hidden fade-in">
        ${renderSidebar('mealplan')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0F172A]">
            ${renderMobileHeader('Plan Nutricional IA')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-5 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Header AI Plan Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden">
                        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-2">
                                    <span class="material-symbols-outlined text-sm">auto_stories</span>
                                    Plan Nutricional Adaptado a Obetide
                                </span>
                                <h2 class="text-2xl md:text-3xl font-display font-black tracking-tight text-white uppercase">Menú Personalizado</h2>
                                <p class="text-xs text-emerald-200 mt-1 max-w-md">
                                    Diseñado con porciones óptimas y alta densidad proteica para preservar masa muscular mientras utilizas Obetide.
                                </p>
                            </div>

                            <button id="generate-new-plan-btn" class="btn-emerald py-3 px-5 rounded-2xl flex items-center justify-center gap-2 font-display font-black text-xs uppercase tracking-wide shadow-emerald-sm active:scale-95 transition-transform">
                                <span class="material-symbols-outlined text-lg">psychology</span>
                                Generar con IA
                            </button>
                        </div>

                        ${currentPlan?.clinicalRecommendation ? `
                            <div class="mt-4 pt-3 border-t border-white/10 text-xs text-emerald-200 flex items-start gap-2">
                                <span class="material-symbols-outlined text-base text-emerald-400 shrink-0">info</span>
                                <p><strong class="text-white">Indicación Clínica:</strong> ${currentPlan.clinicalRecommendation}</p>
                            </div>
                        ` : ''}
                    </div>

                    ${currentPlan ? `
                        <!-- Day Selector Tabs (Horizontal Scrollable for Mobile) -->
                        <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                            ${days.map((d, idx) => `
                                <button class="plan-day-tab px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                                    activeDayTab === idx 
                                        ? 'bg-emerald-600 text-white shadow-emerald-sm scale-102' 
                                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                }" data-index="${idx}">
                                    ${d.day || `Día ${idx + 1}`}
                                </button>
                            `).join('')}
                        </div>

                        <!-- Meals for Selected Day -->
                        ${currentDay ? `
                            <div class="flex flex-col gap-3">
                                <div class="flex items-center justify-between px-1">
                                    <h3 class="text-sm font-display font-black uppercase text-white tracking-tight">
                                        Comidas para ${currentDay.day}
                                    </h3>
                                    <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                                        Meta: ~${currentPlan.targetCalories || profile.calorieGoal || 1800} kcal
                                    </span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${(currentDay.meals || []).map(m => `
                                        <div class="white-card p-5 flex flex-col justify-between border border-slate-700/60 hover:border-emerald-500/40 shadow-xl transition-all">
                                            <div>
                                                <div class="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2.5">
                                                    <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">${m.meal || 'Comida'}</span>
                                                    <div class="text-xs font-mono font-bold">
                                                        <span class="text-emerald-400">${m.calories} kcal</span> · 
                                                        <span class="text-blue-400">P:${m.protein}g</span>
                                                    </div>
                                                </div>
                                                <h4 class="text-sm font-bold text-white">${m.name}</h4>
                                                <p class="text-xs text-slate-400 mt-1 leading-relaxed">${m.description || ''}</p>
                                            </div>

                                            <button class="log-plan-meal-btn mt-4 w-full bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                data-name="${m.name}"
                                                data-cals="${m.calories}"
                                                data-p="${m.protein}"
                                                data-meal="${m.meal}">
                                                <span class="material-symbols-outlined text-sm">add_circle</span>
                                                Registrar en mi Diario
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                    ` : `
                        <!-- Empty State -->
                        <div class="white-card p-10 text-center flex flex-col items-center justify-center border border-slate-700/60 shadow-xl">
                            <span class="material-symbols-outlined text-6xl text-emerald-400 mb-3">restaurant_menu</span>
                            <h3 class="text-lg font-display font-black text-white uppercase">Crea tu primer Plan Nutricional</h3>
                            <p class="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                                La IA elaborará un menú para 7 días calculado específicamente para tu déficit calórico, peso actual (${profile.startingWeight || 75} kg) y tratamiento con Obetide.
                            </p>
                            <button id="generate-first-plan-btn" class="btn-emerald py-3.5 px-6 rounded-2xl font-display font-black text-xs uppercase tracking-wide shadow-emerald-sm">
                                Generar Plan Nutricional con IA
                            </button>
                        </div>
                    `}

                </div>
            </div>

            ${renderBottomNav('mealplan')}
        </main>
    </div>
    `;
};

export const attachMealPlanEvents = () => {
    const state = getState();

    // Day tabs
    document.querySelectorAll('.plan-day-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeDayTab = Number(e.currentTarget.dataset.index);
            window.router.navigate('mealplan');
        });
    });

    // Generate Plan Handler
    const handleGenerate = async (buttonEl) => {
        buttonEl.disabled = true;
        const originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">refresh</span> Elaborando Menú con IA...`;

        try {
            const profile = state.profile || {};
            const newPlan = await generateMealPlanWithAI(profile, profile.calorieGoal || 1800);
            await saveAiMealPlan(newPlan);
            window.showAlert?.('¡Plan Creado!', 'Se generó un nuevo menú semanal adaptado a tu tratamiento.', 'success');
            activeDayTab = 0;
            window.router.navigate('mealplan');
        } catch (err) {
            window.showAlert?.('Error', err.message || 'No se pudo conectar con OpenAI.', 'error');
        } finally {
            buttonEl.disabled = false;
            buttonEl.innerHTML = originalText;
        }
    };

    const genBtn = document.getElementById('generate-new-plan-btn');
    const firstGenBtn = document.getElementById('generate-first-plan-btn');

    genBtn?.addEventListener('click', () => handleGenerate(genBtn));
    firstGenBtn?.addEventListener('click', () => handleGenerate(firstGenBtn));

    // Log meal directly to tracker
    document.querySelectorAll('.log-plan-meal-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const name = e.currentTarget.dataset.name;
            const calories = Number(e.currentTarget.dataset.cals) || 0;
            const protein = Number(e.currentTarget.dataset.p) || 0;
            const mealType = e.currentTarget.dataset.meal || 'Almuerzo';

            await addMeal({
                name,
                calories,
                macros: { protein, carbs: Math.round(calories * 0.4 / 4), fat: Math.round(calories * 0.25 / 9) },
                category: mealType,
                date: getArgentinaDate()
            });

            window.showAlert?.('¡Comida Registrada!', `Se agregó "${name}" (${calories} kcal) a tu diario de hoy.`, 'success');
        });
    });
};
