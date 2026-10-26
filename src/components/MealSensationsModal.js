import { getState, updateMealSensations } from '../state';

export const SENSATIONS_LIST = [
    { id: 'saciedad_temprana', label: '⚡ Saciedad temprana (Dutide)', desc: 'Llenado gástrico rápido' },
    { id: 'digestion_ligera', label: '🍃 Digestión ligera', desc: 'Confort estomacal' },
    { id: 'energia_optima', label: '🔥 Energía óptima', desc: 'Vitalidad sin pesadez' },
    { id: 'somnolencia', label: '🥱 Somnolencia post-comida', desc: 'Sueño o baja de energía' },
    { id: 'pesadez', label: '🫃 Pesadez abdominal', desc: 'Sensación de indigestión' },
    { id: 'nausea_leve', label: '🤢 Náusea o molestia leve', desc: 'Efecto gastrointestinal' },
    { id: 'mucha_sed', label: '🥛 Mucha sed', desc: 'Necesidad de hidratación' },
    { id: 'ansiedad_antojo', label: '🧠 Hambre emocional / Ansiedad', desc: 'Deseo de seguir comiendo' },
    { id: 'digestion_lenta', label: '⏳ Digestión lenta', desc: 'Retraso de vaciado' }
];

export const SATIETY_LEVELS = [
    {
        score: 1,
        emoji: '🥣',
        title: 'Con Hambre',
        desc: 'Me quedé con apetito residual o con ganas de comer más',
        color: 'border-blue-500/40 text-blue-400 bg-blue-500/10 active-ring-blue-500'
    },
    {
        score: 2,
        emoji: '🥗',
        title: 'Ligero / Poco Lleno',
        desc: 'Sin hambre pero con sensación liviana',
        color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10 active-ring-cyan-500'
    },
    {
        score: 3,
        emoji: '⚖️',
        title: 'En su Punto',
        desc: 'Saciedad óptima, cómoda y controlada (Recomendado)',
        color: 'border-[#10E775]/50 text-[#10E775] bg-[#10E775]/15 active-ring-[#10E775]'
    },
    {
        score: 4,
        emoji: '🍕',
        title: 'Muy Lleno',
        desc: 'Comí de más o al límite de la capacidad',
        color: 'border-amber-500/40 text-amber-300 bg-amber-500/10 active-ring-amber-500'
    },
    {
        score: 5,
        emoji: '🫄',
        title: 'Pesado / Empachado',
        desc: 'Molestia digestiva o sensación de hinchazón por exceso',
        color: 'border-rose-500/40 text-rose-300 bg-rose-500/10 active-ring-rose-500'
    }
];

export const renderMealSensationsModalContainer = () => {
    return `
        <div id="meal-sensations-modal-root" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <!-- Modal Content injected dynamically -->
        </div>
    `;
};

export const renderSatietyBadge = (meal) => {
    const score = meal.satiety_score ? Number(meal.satiety_score) : null;
    const hasOpinion = Boolean(meal.opinion && meal.opinion.trim());
    const sensations = Array.isArray(meal.sensations) ? meal.sensations : [];

    let scoreBadge = '';
    if (score === 1) {
        scoreBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">🥣 Con hambre (1/5)</span>`;
    } else if (score === 2) {
        scoreBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">🥗 Ligero (2/5)</span>`;
    } else if (score === 3) {
        scoreBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/35 shadow-[0_0_10px_rgba(16,231,117,0.15)]">⚖️ En su punto (3/5)</span>`;
    } else if (score === 4) {
        scoreBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">🍕 Muy lleno (4/5)</span>`;
    } else if (score === 5) {
        scoreBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">🫄 Pesado (5/5)</span>`;
    }

    if (!score && !hasOpinion && sensations.length === 0) {
        return `
            <button class="open-sensations-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer group shadow-xs active:scale-95" data-meal-id="${meal.id}" title="Registrar cómo te sentiste con esta comida">
                <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">add_reaction</span>
                <span>¿Cómo te sentiste?</span>
            </button>
        `;
    }

    return `
        <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                    ${scoreBadge}
                    ${sensations.slice(0, 3).map(s => `
                        <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60">
                            ${s}
                        </span>
                    `).join('')}
                    ${sensations.length > 3 ? `<span class="text-[10px] text-slate-400 font-mono">+${sensations.length - 3}</span>` : ''}
                </div>
                <button class="open-sensations-btn inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer" data-meal-id="${meal.id}" title="Editar opinión y sensación">
                    <span class="material-symbols-outlined text-xs">edit_note</span>
                    <span>Editar</span>
                </button>
            </div>
            ${hasOpinion ? `
                <p class="text-xs text-slate-300/90 italic border-l-2 border-[#10E775]/60 pl-2.5 py-0.5 line-clamp-2">
                    “${meal.opinion}”
                </p>
            ` : ''}
        </div>
    `;
};

export const openMealSensationsModal = (mealId, onSaveCallback) => {
    const modalRoot = document.getElementById('meal-sensations-modal-root');
    if (!modalRoot) return;

    const state = getState();
    const meal = (state.dailyLog || []).find(m => String(m.id) === String(mealId));
    if (!meal) return;

    let currentScore = meal.satiety_score ? Number(meal.satiety_score) : 3;
    let selectedSensations = new Set(Array.isArray(meal.sensations) ? meal.sensations : []);
    let currentOpinion = meal.opinion || '';

    const renderModalInner = () => {
        modalRoot.innerHTML = `
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-slate-700/90 bg-[#162032] text-slate-100 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <!-- Modal Header -->
                <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-3">
                        <div class="size-11 rounded-2xl bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/30 flex items-center justify-center text-xl">
                            🍽️
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Feedback Post-Comida</span>
                            <h3 class="text-lg font-bold text-white leading-tight capitalize">${meal.name}</h3>
                            <p class="text-xs font-mono text-slate-400 mt-0.5">
                                ${meal.time || meal.category || 'Comida'} · ${meal.calories} kcal · ${meal.date}
                            </p>
                        </div>
                    </div>
                    <button id="close-sensations-modal-btn" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <!-- Satiety Scale Section -->
                <div class="mb-5">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-300">
                            1. Nivel de Plenitud / Saciedad
                        </label>
                        <span class="text-xs font-mono font-bold text-[#10E775]">
                            ${currentScore ? `${currentScore} / 5` : 'Selecciona'}
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-400 mb-3">
                        ¿Cómo te sentiste 20-30 minutos después de terminar el plato?
                    </p>

                    <div class="grid grid-cols-1 sm:grid-cols-5 gap-2" id="satiety-buttons-grid">
                        ${SATIETY_LEVELS.map(lvl => {
                            const isSelected = currentScore === lvl.score;
                            return `
                                <button type="button" class="satiety-btn flex sm:flex-col items-center justify-between sm:justify-center p-3 rounded-2xl border transition-all cursor-pointer text-left sm:text-center gap-2 ${
                                    isSelected 
                                        ? `${lvl.color} border-2 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]` 
                                        : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500'
                                }" data-score="${lvl.score}">
                                    <div class="flex items-center gap-2 sm:flex-col">
                                        <span class="text-2xl">${lvl.emoji}</span>
                                        <div>
                                            <p class="text-xs font-bold text-white sm:mt-1">${lvl.title}</p>
                                            <span class="text-[9px] text-slate-400 block sm:hidden font-normal">${lvl.desc}</span>
                                        </div>
                                    </div>
                                    <span class="text-[10px] font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-500'}">
                                        #${lvl.score}
                                    </span>
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- Selected level detailed descriptor -->
                    <div class="mt-2.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex items-center gap-2 text-slate-300">
                        <span class="material-symbols-outlined text-emerald-400 text-base">info</span>
                        <span>${SATIETY_LEVELS.find(l => l.score === currentScore)?.desc || 'Selecciona un nivel de saciedad.'}</span>
                    </div>
                </div>

                <!-- Sensations Tags Section -->
                <div class="mb-5">
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-300">
                            2. Sensaciones y Síntomas Físicos
                        </label>
                        <span class="text-[10px] text-slate-400 font-mono">Toca para seleccionar</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mb-3">
                        Ideal para evaluar la tolerancia digestiva y el efecto del tratamiento (Dutide).
                    </p>

                    <div class="flex flex-wrap gap-2" id="sensations-chips-container">
                        ${SENSATIONS_LIST.map(sens => {
                            const isSelected = selectedSensations.has(sens.label);
                            return `
                                <button type="button" class="sensation-chip text-xs px-3 py-1.5 rounded-xl border font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected 
                                        ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold shadow-xs' 
                                        : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500'
                                }" data-tag="${sens.label}">
                                    <span>${sens.label}</span>
                                    ${isSelected ? `<span class="material-symbols-outlined text-xs text-emerald-400">check</span>` : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Free Text Opinion / Reflections -->
                <div class="mb-6">
                    <label class="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                        3. Opinión o Reflexión Libre
                    </label>
                    <textarea id="meal-opinion-textarea" rows="3" placeholder="¿Qué observaciones tienes? Ej: Sentí saciedad rápida, dejé la mitad del puré porque me llené antes, o comí muy rápido y quedé pesado..." class="w-full bg-slate-900/80 border border-slate-700 rounded-2xl p-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all custom-scrollbar">${currentOpinion}</textarea>
                    <p class="text-[10px] text-slate-400 mt-1">
                        Esta opinión se almacena en tus métricas para analizar tus hábitos y saciedad a lo largo de las semanas.
                    </p>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-3 pt-3 border-t border-slate-700/60">
                    <button type="button" id="cancel-sensations-modal-btn" class="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700">
                        Cancelar
                    </button>
                    <button type="button" id="save-sensations-btn" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-emerald-sm flex items-center justify-center gap-1.5 active:scale-95">
                        <span class="material-symbols-outlined text-base">check_circle</span>
                        Guardar Sensación
                    </button>
                </div>

            </div>
        `;

        // Attach listeners inside modal
        document.getElementById('close-sensations-modal-btn').onclick = () => modalRoot.classList.add('hidden');
        document.getElementById('cancel-sensations-modal-btn').onclick = () => modalRoot.classList.add('hidden');

        document.querySelectorAll('.satiety-btn').forEach(btn => {
            btn.onclick = () => {
                currentScore = Number(btn.dataset.score);
                currentOpinion = document.getElementById('meal-opinion-textarea')?.value || '';
                renderModalInner();
            };
        });

        document.querySelectorAll('.sensation-chip').forEach(chip => {
            chip.onclick = () => {
                const tag = chip.dataset.tag;
                if (selectedSensations.has(tag)) {
                    selectedSensations.delete(tag);
                } else {
                    selectedSensations.add(tag);
                }
                currentOpinion = document.getElementById('meal-opinion-textarea')?.value || '';
                renderModalInner();
            };
        });

        document.getElementById('save-sensations-btn').onclick = () => {
            const opinionText = document.getElementById('meal-opinion-textarea')?.value || '';
            updateMealSensations(mealId, {
                satiety_score: currentScore,
                sensations: Array.from(selectedSensations),
                opinion: opinionText
            });

            modalRoot.classList.add('hidden');

            if (window.showToast) {
                window.showToast('Sensación registrada en tus métricas');
            }

            if (typeof onSaveCallback === 'function') {
                onSaveCallback();
            }
        };
    };

    renderModalInner();
    modalRoot.classList.remove('hidden');
};

export const attachSensationsModalEvents = (onSaveCallback) => {
    document.querySelectorAll('.open-sensations-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const mealId = btn.dataset.mealId;
            openMealSensationsModal(mealId, onSaveCallback);
        };
    });
};
