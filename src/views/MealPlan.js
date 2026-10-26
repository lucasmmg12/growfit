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
    <div class="flex h-screen w-full bg-background-light font-body text-text-primary overflow-hidden fade-in">
        ${renderSidebar('mealplan')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            ${renderMobileHeader('Plan Nutricional IA')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-5 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-4xl mx-auto flex flex-col gap-6">

                    <!-- Header AI Plan Card -->
                    <div class="white-card p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white border-0 shadow-emerald-lg relative overflow-hidden">
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
                            <div class="mt-4 pt-3 border-t border-white/10 text-xs text-emerald-100 flex items-start gap-2">
                                <span class="material-symbols-outlined text-base text-emerald-300 shrink-0">info</span>
                                <p><strong>Indicación Clínica:</strong> ${currentPlan.clinicalRecommendation}</p>
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
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }" data-index="${idx}">
                                    ${d.day || `Día ${idx + 1}`}
                                </button>
                            `).join('')}
                        </div>

                        <!-- Meals for Selected Day -->
                        ${currentDay ? `
                            <div class="flex flex-col gap-3">
                                <div class="flex items-center justify-between px-1">
                                    <h3 class="text-sm font-display font-black uppercase text-text-primary tracking-tight">
                                        Comidas para ${currentDay.day}
                                    </h3>
                                    <span class="badge-emerald text-[10px] font-mono">
                                        Meta: ~${currentPlan.targetCalories || profile.calorieGoal || 1800} kcal
                                    </span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${(currentDay.meals || []).map(m => `
                                        <div class="white-card p-5 flex flex-col justify-between border-slate-200/90 hover:border-emerald-300 transition-all">
                                            <div>
                                                <div class="flex items-center justify-between pb-2 border-b border-border-soft mb-2.5">
                                                    <span class="badge-emerald text-[10px]">${m.meal || 'Comida'}</span>
                                                    <div class="text-xs font-mono font-bold text-slate-700">
                                                        <span class="text-emerald-700">${m.calories} kcal</span> · 
                                                        <span class="text-blue-700">P:${m.protein}g</span>
                                                    </div>
                                                </div>
                                                <h4 class="text-sm font-bold text-text-primary">${m.name}</h4>
                                                <p class="text-xs text-text-muted mt-1 leading-relaxed">${m.description || ''}</p>
                                            </div>

                                            <button class="log-plan-meal-btn mt-4 w-full bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
                        <div class="white-card p-10 text-center flex flex-col items-center justify-center">
                            <span class="material-symbols-outlined text-6xl text-emerald-500 mb-3">restaurant_menu</span>
                            <h3 class="text-lg font-display font-black text-text-primary uppercase">Crea tu primer Plan Nutricional</h3>
                            <p class="text-xs text-text-muted max-w-sm mt-1 mb-5">
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
