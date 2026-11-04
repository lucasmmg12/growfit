import {
    getState,
    addMeal,
    getArgentinaDate,
    calculateBodyIndices,
    getDailyStats,
    getDailyBurn,
    getGlp1Pharmacokinetics,
    getMuscleShieldMetrics,
    getWeightProjection,
    getLabResults,
    addLabResult,
    getSensationsMetrics
} from '../state';
import { analyzeFridgeWithAI } from '../services/openai';

/**
 * Web Speech API Voice Dictation helper (es-AR)
 */
export const attachVoiceDictation = (micBtn, inputEl, onRecognized = null) => {
    if (!micBtn || !inputEl) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.addEventListener('click', () => {
            window.showAlert?.('Dictado por Voz', 'Tu navegador no soporta reconocimiento de voz directo. Usa Chrome o Safari.', 'info');
        });
        return;
    }

    let isListening = false;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isListening) {
            recognition.stop();
            return;
        }
        try {
            isListening = true;
            micBtn.classList.add('ring-2', 'ring-[#10E775]', 'bg-[#10E775]/25');
            inputEl.placeholder = '🎙️ Escuchando... habla ahora';
            recognition.start();
        } catch (err) {
            isListening = false;
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
            inputEl.value = transcript;
            if (onRecognized) onRecognized(transcript);
        }
    };

    const resetMicUI = () => {
        isListening = false;
        micBtn.classList.remove('ring-2', 'ring-[#10E775]', 'bg-[#10E775]/25');
    };

    recognition.onend = resetMicUI;
    recognition.onerror = resetMicUI;
};

/**
 * Modal "¿Qué cocino con mi heladera?" (Heladera IA)
 */
export const openFridgeAiModal = (modalContainer, onSavedCallback = null) => {
    if (!modalContainer) return;
    const state = getState();
    const today = state.selectedDate || getArgentinaDate();
    const dailyStats = getDailyStats(today);
    const remainingCals = Math.max(250, (state.profile?.calorieGoal || 2000) - dailyStats.calories);
    const remainingProt = Math.max(25, (state.profile?.proteinGoal || 150) - dailyStats.protein);

    modalContainer.innerHTML = `
        <div class="white-card p-6 w-full max-w-2xl relative animate-scale-up shadow-2xl border border-[#10E775]/40 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/20">
                <div class="flex items-center gap-2.5">
                    <div class="size-10 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/35 flex items-center justify-center text-[#10E775]">
                        <span class="material-symbols-outlined text-xl">kitchen</span>
                    </div>
                    <div>
                        <span class="badge-emerald text-[10px]">Chef Nutricional IA</span>
                        <h3 class="text-lg font-display font-black text-white uppercase tracking-tight">¿Qué cocino con mi heladera?</h3>
                    </div>
                </div>
                <button id="close-fridge-modal-btn" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-2xl bg-[#040B08]/80 border border-emerald-500/20 text-xs">
                <span class="text-emerald-300/80">Presupuesto restante hoy:</span>
                <strong class="text-[#10E775] font-mono">${Math.round(remainingCals)} kcal</strong>
                <span class="text-emerald-500/40">·</span>
                <span class="text-emerald-300/80">Meta proteica restante:</span>
                <strong class="text-lime-400 font-mono">${Math.round(remainingProt)}g proteína</strong>
            </div>

            <div class="flex flex-col gap-3">
                <label class="text-[11px] font-bold uppercase tracking-wider text-lime-400">Ingredientes que tienes a mano:</label>
                <div class="flex flex-col sm:flex-row gap-2">
                    <div class="flex items-center flex-1 gap-2 bg-[#040B08] border border-emerald-500/30 rounded-xl px-3.5 py-2.5">
                        <input id="fridge-ingredients-input" type="text" placeholder="Ej: 3 huevos, media calabaza, queso magro, atún..." class="w-full bg-transparent text-sm font-semibold text-white outline-none" />
                        <button id="fridge-voice-btn" type="button" class="size-8 rounded-lg bg-emerald-950/80 text-[#10E775] flex items-center justify-center cursor-pointer" title="Dictar ingredientes por voz">
                            <span class="material-symbols-outlined text-base">mic</span>
                        </button>
                    </div>
                    <button id="fridge-generate-btn" class="btn-emerald px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer shrink-0">
                        <span class="material-symbols-outlined text-base">auto_awesome</span>
                        Armar 3 Recetas IA
                    </button>
                </div>

                <div class="flex flex-wrap gap-1.5">
                    ${[
                        'Huevos, queso magro, espinaca y tomate',
                        'Pechuga de pollo, calabaza y cebolla',
                        'Atún al natural, palta, arroz y huevo duro',
                        'Carne magra, morrón, zapallito y zanahoria'
                    ].map(preset => `
                        <button type="button" class="fridge-preset-chip px-2.5 py-1 rounded-xl bg-[#040B08]/85 hover:bg-[#10E775]/20 border border-emerald-500/25 text-[11px] font-semibold text-emerald-100 hover:text-white cursor-pointer" data-ing="${preset}">
                            🥗 ${preset}
                        </button>
                    `).join('')}
                </div>

                <div id="fridge-recipes-results" class="mt-2 flex flex-col gap-3"></div>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    document.getElementById('close-fridge-modal-btn').onclick = () => modalContainer.classList.add('hidden');

    const inputEl = document.getElementById('fridge-ingredients-input');
    const genBtn = document.getElementById('fridge-generate-btn');
    const resultsBox = document.getElementById('fridge-recipes-results');
    const voiceBtn = document.getElementById('fridge-voice-btn');

    const runFridgeChef = async (ingText) => {
        const clean = (ingText || '').trim();
        if (!clean) return;
        genBtn.disabled = true;
        genBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Cocinando...`;
        resultsBox.innerHTML = `<p class="text-xs text-center py-6 text-emerald-300/70">Diseñando 3 platos proteicos con tus ingredientes...</p>`;

        try {
            const recipes = await analyzeFridgeWithAI(clean, remainingCals, remainingProt);
            resultsBox.innerHTML = recipes.map((r, idx) => `
                <div class="p-4 rounded-2xl bg-[#040B08]/90 border border-emerald-500/30 flex flex-col gap-2">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <span class="px-2 py-0.5 rounded-md bg-[#10E775]/15 text-[#10E775] text-[10px] font-bold uppercase">Opción ${idx + 1} · ⏱️ ${r.prep_time || '15 min'}</span>
                            <h4 class="text-sm font-display font-extrabold text-white mt-1">${r.name}</h4>
                        </div>
                        <span class="text-base font-mono font-extrabold text-lime-400 shrink-0">${r.calories} kcal</span>
                    </div>
                    <p class="text-xs text-emerald-200/80 leading-relaxed">${r.steps}</p>
                    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/15">
                        <div class="flex flex-wrap gap-2 text-[11px] font-mono font-bold">
                            <span class="text-[#10E775]">P: ${r.macros?.protein || 32}g</span>
                            <span class="text-[#34D399]">C: ${r.macros?.carbs || 20}g</span>
                            <span class="text-lime-400">G: ${r.macros?.fat || 12}g</span>
                            <span class="text-teal-300">Sodio: ${r.macros?.sodium || 350}mg</span>
                        </div>
                        <button type="button" class="log-fridge-recipe-btn btn-emerald px-3.5 py-1.5 text-[11px] font-extrabold uppercase cursor-pointer" data-recipe='${JSON.stringify(r).replace(/'/g, "&apos;")}'>
                            + Registrar Plato
                        </button>
                    </div>
                </div>
            `).join('');

            resultsBox.querySelectorAll('.log-fridge-recipe-btn').forEach(btn => {
                btn.onclick = async () => {
                    const r = JSON.parse(btn.dataset.recipe);
                    await addMeal({
                        name: r.name,
                        calories: r.calories,
                        category: 'Almuerzo',
                        time: 'Almuerzo',
                        date: today,
                        macros: r.macros || { protein: 32, carbs: 20, fat: 12, sodium: 350 },
                        satiety_score: 3,
                        sensations: ['Saciedad temprana']
                    });
                    modalContainer.classList.add('hidden');
                    window.showAlert?.('¡Plato Registrado!', `${r.name} (${r.calories} kcal) sumado a tu Diario.`, 'success');
                    if (onSavedCallback) onSavedCallback();
                };
            });
        } catch (err) {
            resultsBox.innerHTML = `<p class="text-xs text-center text-lime-300 py-4">No se pudo generar las recetas.</p>`;
        } finally {
            genBtn.disabled = false;
            genBtn.innerHTML = `<span class="material-symbols-outlined text-base">auto_awesome</span> Armar 3 Recetas IA`;
        }
    };

    attachVoiceDictation(voiceBtn, inputEl, (txt) => runFridgeChef(txt));
    genBtn.onclick = () => runFridgeChef(inputEl.value);
    inputEl.onkeypress = (e) => { if (e.key === 'Enter') runFridgeChef(inputEl.value); };

    modalContainer.querySelectorAll('.fridge-preset-chip').forEach(chip => {
        chip.onclick = () => {
            inputEl.value = chip.dataset.ing || '';
            runFridgeChef(inputEl.value);
        };
    });
};

/**
 * Modal "Reporte Médico & Clínico Ejecutivo (PDF / Impresión)" + Carga de Laboratorios
 */
export const openMedicalReportModal = (modalContainer, onUpdatedCallback = null) => {
    if (!modalContainer) return;
    const state = getState();
    const today = getArgentinaDate();
    const indices = calculateBodyIndices({}, state.profile);
    const glp1 = getGlp1Pharmacokinetics();
    const shield = getMuscleShieldMetrics(today);
    const proj = getWeightProjection();
    const labs = getLabResults();
    const latestLab = labs[0] || null;
    const sensations = getSensationsMetrics();

    modalContainer.innerHTML = `
        <div class="white-card p-6 w-full max-w-4xl relative animate-scale-up shadow-2xl border border-[#10E775]/40 max-h-[92dvh] overflow-y-auto custom-scrollbar">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-emerald-500/20">
                <div class="flex items-center gap-3">
                    <div class="size-11 rounded-2xl bg-[#10E775]/15 border border-[#10E775]/40 flex items-center justify-center text-[#10E775]">
                        <span class="material-symbols-outlined text-2xl">clinical_notes</span>
                    </div>
                    <div>
                        <span class="badge-emerald text-[10px]">Historia Clínica Metabólica · GrowFit</span>
                        <h3 class="text-xl font-display font-black text-white uppercase tracking-tight">Reporte Médico & Laboratorios</h3>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="print-medical-report-btn" class="btn-emerald px-4 py-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                        <span class="material-symbols-outlined text-base">print</span>
                        Imprimir / Exportar PDF
                    </button>
                    <button id="close-medical-report-btn" class="size-9 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            </div>

            <!-- 1. Resumen Antropométrico & 8 Índices -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Peso & Meta</span>
                    <p class="text-lg font-mono font-extrabold text-[#10E775] mt-0.5">${indices.weight} kg <small class="text-[10px] text-emerald-300/70">→ ${proj.targetWeight} kg</small></p>
                    <span class="text-[10px] text-emerald-400">ETA: ${proj.etaFormatted}</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">IMC & % Grasa</span>
                    <p class="text-lg font-mono font-extrabold text-white mt-0.5">${indices.bmi} <small class="text-xs text-lime-400">(${indices.bodyFat}% grasa)</small></p>
                    <span class="text-[10px] text-emerald-400">${indices.bmiCategory}</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">Masa Magra & FFMI</span>
                    <p class="text-lg font-mono font-extrabold text-[#34D399] mt-0.5">${indices.leanMass} kg <small class="text-xs">(${indices.ffmi})</small></p>
                    <span class="text-[10px] text-emerald-400">Escudo Muscular: ${shield.shieldScore}%</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <span class="text-[10px] font-bold uppercase text-emerald-300/70 block">ICA & Gasto TDEE</span>
                    <p class="text-lg font-mono font-extrabold text-lime-400 mt-0.5">${indices.whtr} <small class="text-xs">(${indices.tdee} kcal)</small></p>
                    <span class="text-[10px] text-emerald-400">Cintura: ${indices.waist} cm · Basal: ${indices.bmr}</span>
                </div>
            </div>

            <!-- 2. Farmacocinética GLP-1 & Simulador 30/60/90 Días -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="p-4 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-display font-extrabold uppercase text-[#10E775]">Protocolo GLP-1 (Obetide)</span>
                        <span class="badge-emerald text-[10px]">Dosis: ${glp1.doseMl} ml</span>
                    </div>
                    <p class="text-xs text-white font-semibold">${glp1.phase} · Nivel Activo Estimado: <strong class="text-lime-400 font-mono">${glp1.activeLevelPct}%</strong></p>
                    <p class="text-[11px] text-emerald-300/75 mt-1">${glp1.phaseDesc}</p>
                    <p class="text-[11px] text-emerald-200 mt-2 pt-2 border-t border-emerald-500/15">
                        Saciedad Promedio: <strong class="font-mono text-[#10E775]">${sensations.avgScore || '3.0'} / 5.0</strong> (${sensations.statusLabel})
                    </p>
                </div>

                <div class="p-4 rounded-2xl bg-[#040B08]/85 border border-emerald-500/25">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-display font-extrabold uppercase text-lime-400">Proyección Metabólica 30 / 60 / 90 Días</span>
                        <span class="text-[11px] font-mono text-emerald-300">-${proj.weeklyKgLoss} kg/sem</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-center mt-2">
                        <div class="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">+30 Días</span>
                            <strong class="text-sm font-mono text-white">${proj.weight30d} kg</strong>
                        </div>
                        <div class="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">+60 Días</span>
                            <strong class="text-sm font-mono text-[#34D399]">${proj.weight60d} kg</strong>
                        </div>
                        <div class="p-2 rounded-xl bg-emerald-950/50 border border-[#10E775]/40">
                            <span class="text-[9px] uppercase text-[#10E775] block">+90 Días</span>
                            <strong class="text-sm font-mono text-[#10E775]">${proj.weight90d} kg</strong>
                        </div>
                    </div>
                    <p class="text-[10px] text-emerald-300/70 mt-2">Déficit neto estimado: <strong>-${proj.dailyDeficit} kcal/día</strong> · Llegada a meta (${proj.targetWeight} kg): <strong>${proj.etaFormatted}</strong></p>
                </div>
            </div>

            <!-- 3. Biomarcadores de Laboratorio Clínico -->
            <div class="p-4 rounded-2xl bg-[#040B08]/90 border border-emerald-500/30">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                        <h4 class="text-xs font-display font-extrabold uppercase text-white">Analítica de Laboratorio & Sensibilidad Insulínica</h4>
                        <p class="text-[11px] text-emerald-300/70">Cálculo automático de índice HOMA-IR (Glucemia × Insulina / 405)</p>
                    </div>
                    <button id="toggle-new-lab-form-btn" class="btn-emerald-soft px-3 py-1.5 text-xs font-bold cursor-pointer">
                        + Cargar Análisis de Sangre
                    </button>
                </div>

                ${latestLab ? `
                    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-3">
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">Glucemia</span>
                            <strong class="text-sm font-mono text-white">${latestLab.glucose} mg/dL</strong>
                        </div>
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">Insulina Basal</span>
                            <strong class="text-sm font-mono text-white">${latestLab.insulin} uUI/mL</strong>
                        </div>
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-[#10E775]/35">
                            <span class="text-[9px] uppercase text-[#10E775] block">Índice HOMA-IR</span>
                            <strong class="text-sm font-mono text-[#10E775]">${latestLab.homaIr}</strong>
                        </div>
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">HbA1c</span>
                            <strong class="text-sm font-mono text-lime-400">${latestLab.hba1c}%</strong>
                        </div>
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">Triglicéridos</span>
                            <strong class="text-sm font-mono text-white">${latestLab.triglycerides} mg/dL</strong>
                        </div>
                        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                            <span class="text-[9px] uppercase text-emerald-300/70 block">Colesterol / HDL</span>
                            <strong class="text-sm font-mono text-white">${latestLab.cholesterolTotal} / ${latestLab.hdl}</strong>
                        </div>
                    </div>
                ` : ''}

                <!-- Formulario rápido para agregar nuevo Laboratorio -->
                <div id="new-lab-form-box" class="hidden flex-col gap-3 pt-3 border-t border-emerald-500/20">
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Glucemia (mg/dL)</label>
                            <input id="lab-glucose" type="number" value="${latestLab?.glucose || 90}" class="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono text-white bg-emerald-950/60 border border-emerald-500/30 mt-1" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Insulina (uUI/mL)</label>
                            <input id="lab-insulin" type="number" step="0.1" value="${latestLab?.insulin || 8.0}" class="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono text-white bg-emerald-950/60 border border-emerald-500/30 mt-1" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">HbA1c (%)</label>
                            <input id="lab-hba1c" type="number" step="0.1" value="${latestLab?.hba1c || 5.4}" class="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono text-white bg-emerald-950/60 border border-emerald-500/30 mt-1" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Triglicéridos</label>
                            <input id="lab-tg" type="number" value="${latestLab?.triglycerides || 115}" class="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono text-white bg-emerald-950/60 border border-emerald-500/30 mt-1" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Colesterol Total</label>
                            <input id="lab-chol" type="number" value="${latestLab?.cholesterolTotal || 175}" class="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono text-white bg-emerald-950/60 border border-emerald-500/30 mt-1" />
                        </div>
                    </div>
                    <button id="save-lab-result-btn" class="btn-emerald py-2.5 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
                        Guardar Laboratorio & Calcular HOMA-IR
                    </button>
                </div>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    document.getElementById('close-medical-report-btn').onclick = () => modalContainer.classList.add('hidden');
    document.getElementById('print-medical-report-btn').onclick = () => window.print();

    const toggleLabBtn = document.getElementById('toggle-new-lab-form-btn');
    const labFormBox = document.getElementById('new-lab-form-box');
    toggleLabBtn.onclick = () => {
        labFormBox.classList.toggle('hidden');
        labFormBox.classList.toggle('flex');
    };

    document.getElementById('save-lab-result-btn').onclick = () => {
        const entry = addLabResult({
            glucose: document.getElementById('lab-glucose').value,
            insulin: document.getElementById('lab-insulin').value,
            hba1c: document.getElementById('lab-hba1c').value,
            triglycerides: document.getElementById('lab-tg').value,
            cholesterolTotal: document.getElementById('lab-chol').value
        });
        window.showAlert?.('Laboratorio Guardado', `Índice HOMA-IR calculado: ${entry.homaIr}`, 'success');
        openMedicalReportModal(modalContainer, onUpdatedCallback);
        if (onUpdatedCallback) onUpdatedCallback();
    };
};
