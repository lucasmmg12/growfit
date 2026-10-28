import { getState, addObetideTreatment, deleteObetideTreatment, getArgentinaDate, getLatestMeasurement } from '../state';
import { generateObetideCoachingSummary } from '../services/openai';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';
import Chart from 'chart.js/auto';

let obetideChartInstance = null;

export const renderObetide = () => {
    const state = getState();
    const treatments = state.obetideTreatments || [];
    const latest = treatments[0] || null;
    const latestMeasurement = getLatestMeasurement();
    const startingWeight = state.profile.startingWeight || (latestMeasurement ? latestMeasurement.weight : 104);

    // Calculate days since last dose
    let daysSince = null;
    let nextDoseDate = 'Inmediato';
    let isDue = true;
    let daysRemaining = 0;

    if (latest && latest.date) {
        const [y, m, d] = latest.date.split('-').map(Number);
        const lastD = new Date(y, m - 1, d);
        const [nowY, nowM, nowD] = getArgentinaDate().split('-').map(Number);
        const now = new Date(nowY, nowM - 1, nowD);
        const diffMs = now - lastD;
        daysSince = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const nextD = new Date(lastD.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextY = nextD.getFullYear();
        const nextM = String(nextD.getMonth() + 1).padStart(2, '0');
        const nextDay = String(nextD.getDate()).padStart(2, '0');
        nextDoseDate = `${nextY}-${nextM}-${nextDay}`;
        daysRemaining = Math.max(0, 7 - daysSince);
        isDue = daysSince >= 7;
    }

    const currentDose = latest ? `${latest.dose_ml} ml` : '0.25 ml';

    // Weight variation: if no measurement on/after dose date, show "Sin pesaje aún"
    const hasPostTreatmentWeight = latest && latestMeasurement && latestMeasurement.date >= latest.date;
    let weightDiffText = 'Sin pesaje';
    let weightDiffColor = 'text-slate-400';

    if (hasPostTreatmentWeight && startingWeight) {
        const diff = Number((latestMeasurement.weight - startingWeight).toFixed(1));
        weightDiffText = `${diff > 0 ? '+' : ''}${diff} kg`;
        weightDiffColor = diff <= 0 ? 'text-emerald-300' : 'text-amber-300';
    } else {
        weightDiffText = 'Sin pesaje aún';
        weightDiffColor = 'text-slate-400';
    }


    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('obetide')}

        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Tratamiento Obetide')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-8">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- Header Clinical Card -->
                    <div class="white-card card-glow-emerald p-6 text-white shadow-2xl relative overflow-hidden">
                        <div class="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                            <span class="material-symbols-outlined text-[180px]">vaccines</span>
                        </div>
                        
                        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                            <div>
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-2">
                                    <span class="material-symbols-outlined text-sm">medical_services</span>
                                    Tratamiento GLP-1 · Descenso de Peso
                                </div>
                                <h2 class="text-2xl md:text-3xl font-display font-black tracking-tight text-white uppercase">Control Obetide</h2>
                                <p class="text-xs text-emerald-200 mt-1 max-w-md">
                                    Protocolo progresivo semanal. Inicia en 0.25 ml para adaptación metabólica y minimización de efectos secundarios.
                                </p>
                            </div>

                            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-emerald-300">Dosis Actual</span>
                                    <p class="text-2xl font-mono font-black text-white">${currentDose}</p>
                                </div>
                                <div class="h-10 w-px bg-white/20"></div>
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-emerald-300">Próxima Dosis</span>
                                    <p class="text-sm font-bold ${isDue ? 'text-amber-300' : 'text-white'}">
                                        ${isDue ? '¡Toca Hoy!' : `${nextDoseDate} (en ${daysRemaining}d)`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Mini stats banner -->
                        <div class="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center text-xs">
                            <div>
                                <span class="text-emerald-300/80 text-[10px] block uppercase font-bold">Total Dosis</span>
                                <span class="font-mono font-black text-base">${treatments.length} aplicadas</span>
                            </div>
                            <div>
                                <span class="text-emerald-300/80 text-[10px] block uppercase font-bold">Variación Peso</span>
                                <span class="font-mono font-black text-base ${weightDiffColor}">
                                    ${weightDiffText}
                                </span>
                            </div>
                            <div>
                                <span class="text-emerald-300/80 text-[10px] block uppercase font-bold">Última Inyección</span>
                                <span class="font-mono font-black text-base">${latest ? latest.date : 'Pendiente'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <button id="open-obetide-modal-btn" class="btn-emerald py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 font-display font-black text-sm uppercase tracking-wide shadow-emerald-md">
                            <span class="material-symbols-outlined text-xl">syringe</span>
                            Registrar Dosis Semanal
                        </button>

                        <button id="run-obetide-ai-btn" class="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition-all active:scale-95">
                            <span class="material-symbols-outlined text-lg text-emerald-400">psychology</span>
                            Evaluación Médica con IA
                        </button>
                    </div>

                    <!-- AI Medical Coaching Section (Collapsible/Dynamic) -->
                    <div id="obetide-ai-feedback-container" class="hidden"></div>

                    <!-- Clinical Correlation Chart -->
                    <div class="white-card p-5 border border-slate-700/60 shadow-xl">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <span class="badge-emerald bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-1">Evolución Clínica</span>
                                <h3 class="text-lg font-display font-black text-white uppercase">Correlación: Dosis Obetide vs Peso</h3>
                            </div>
                            <span class="text-xs text-slate-400 font-mono font-bold">Semanal</span>
                        </div>
                        <div class="h-64 w-full">
                            <canvas id="obetide-correlation-chart"></canvas>
                        </div>
                    </div>

                    <!-- Titration Guide (Education) -->
                    <div class="white-card p-5 border-l-4 border-l-emerald-500 border border-slate-700/60">
                        <h4 class="text-sm font-bold uppercase tracking-tight text-white mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-emerald-400">stairs</span>
                            Esquema Clínico de Titulación
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div class="p-3 rounded-xl ${latest?.dose_ml === 0.25 || !latest ? 'bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900/60 border border-slate-700/60 text-slate-300'}">
                                <span class="text-[10px] text-emerald-400 block uppercase font-bold">Semanas 1 a 4</span>
                                <p class="text-base font-black">0.25 ml / sem</p>
                                <p class="text-[10px] font-normal text-slate-400 mt-1">Inicio y tolerancia digestiva.</p>
                            </div>
                            <div class="p-3 rounded-xl ${latest?.dose_ml === 0.50 ? 'bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900/60 border border-slate-700/60 text-slate-300'}">
                                <span class="text-[10px] text-emerald-400 block uppercase font-bold">Semanas 5 a 8</span>
                                <p class="text-base font-black">0.50 ml / sem</p>
                                <p class="text-[10px] font-normal text-slate-400 mt-1">Aumento de efecto anorexígeno.</p>
                            </div>
                            <div class="p-3 rounded-xl ${latest?.dose_ml === 1.00 ? 'bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900/60 border border-slate-700/60 text-slate-300'}">
                                <span class="text-[10px] text-emerald-400 block uppercase font-bold">Semanas 9 a 12</span>
                                <p class="text-base font-black">1.00 ml / sem</p>
                                <p class="text-[10px] font-normal text-slate-400 mt-1">Dosis de mantenimiento habitual.</p>
                            </div>
                            <div class="p-3 rounded-xl ${latest?.dose_ml > 1.00 ? 'bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900/60 border border-slate-700/60 text-slate-300'}">
                                <span class="text-[10px] text-emerald-400 block uppercase font-bold">Avanzado</span>
                                <p class="text-base font-black">1.7 - 2.4 ml</p>
                                <p class="text-[10px] font-normal text-slate-400 mt-1">Según prescripción médica.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Treatments History List -->
                    <div class="white-card p-5 border border-slate-700/60">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                            <h3 class="text-base font-display font-black text-white uppercase tracking-tight">Historial de Aplicaciones</h3>
                            <span class="text-xs text-slate-400 font-bold font-mono">${treatments.length} registros</span>
                        </div>

                        <div class="flex flex-col gap-3">
                            ${treatments.length ? treatments.map(t => {
        const siteLabels = {
            'abdomen_der': 'Abdomen Derecho',
            'abdomen_izq': 'Abdomen Izquierdo',
            'muslo_der': 'Muslo Derecho',
            'muslo_izq': 'Muslo Izquierdo',
            'brazo_der': 'Brazo Derecho',
            'brazo_izq': 'Brazo Izquierdo'
        };
        const siteName = siteLabels[t.injection_site] || t.injection_site || 'Abdomen';
        const effects = Array.isArray(t.side_effects) ? t.side_effects : [];

        return `
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 hover:border-slate-600 transition-all gap-3">
                                    <div class="flex items-center gap-3.5">
                                        <div class="size-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-sm border border-emerald-500/30">
                                            ${t.dose_ml}ml
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <h4 class="text-sm font-bold text-white">${t.date}</h4>
                                                <span class="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-emerald-400">
                                                    📍 ${siteName}
                                                </span>
                                            </div>
                                            <p class="text-xs text-slate-400 mt-1">
                                                Saciedad: <strong class="text-emerald-400">${t.satiety_level}/10</strong> ${t.notes ? `· "${t.notes}"` : ''}
                                            </p>
                                            ${effects.length ? `
                                                <div class="flex flex-wrap gap-1 mt-1.5">
                                                    ${effects.map(ef => `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-medium">${ef}</span>`).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>

                                    <button class="delete-obetide-btn self-end sm:self-center size-8 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors" data-id="${t.id}">
                                        <span class="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                                `;
    }).join('') : `
                                <div class="text-center py-10">
                                    <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">vaccines</span>
                                    <p class="text-sm font-bold text-slate-300">Aún no has registrado tu primera dosis</p>
                                    <p class="text-xs text-slate-400 mt-1">Toca en "Registrar Dosis Semanal" para comenzar con 0.25 ml.</p>
                                </div>
                            `}
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('obetide')}
        </main>

        <!-- Log Obetide Modal -->
        <div id="obetide-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
            <div class="white-card p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-slate-700/80 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
                    <div class="flex items-center gap-2.5">
                        <div class="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">syringe</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-display font-black text-white uppercase">Nueva Aplicación Obetide</h3>
                            <p class="text-[11px] text-slate-400">Registro de dosis semanal y saciedad</p>
                        </div>
                    </div>
                    <button id="close-obetide-modal" class="size-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <form id="obetide-form" class="flex flex-col gap-4">
                    <!-- Date & Dose -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Fecha de Inyección</label>
                            <input type="date" id="obetide-date" value="${getArgentinaDate()}" required class="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500">
                        </div>
                        <div>
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Dosis (ml)</label>
                            <select id="obetide-dose" class="w-full mt-1 bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500">
                                <option value="0.25" selected>0.25 ml (Inicio / Sem 1-4)</option>
                                <option value="0.50">0.50 ml (Escalón 2)</option>
                                <option value="1.00">1.00 ml (Mantenimiento)</option>
                                <option value="1.70">1.70 ml (Dosis Alta)</option>
                                <option value="2.40">2.40 ml (Máxima)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Injection Site Picker (Rotation) -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase mb-1 block">
                            Sitio de Punción (Rotación)
                            ${latest?.injection_site ? `<span class="text-emerald-400 font-normal ml-1">· Último: ${latest.injection_site}</span>` : ''}
                        </label>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="abdomen_der" checked class="accent-emerald-500">
                                <span>Abdomen Derecho</span>
                            </label>
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="abdomen_izq" class="accent-emerald-500">
                                <span>Abdomen Izquierdo</span>
                            </label>
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="muslo_der" class="accent-emerald-500">
                                <span>Muslo Derecho</span>
                            </label>
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="muslo_izq" class="accent-emerald-500">
                                <span>Muslo Izquierdo</span>
                            </label>
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="brazo_der" class="accent-emerald-500">
                                <span>Brazo Derecho</span>
                            </label>
                            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer">
                                <input type="radio" name="injection_site" value="brazo_izq" class="accent-emerald-500">
                                <span>Brazo Izquierdo</span>
                            </label>
                        </div>
                    </div>

                    <!-- Satiety Rating Slider -->
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[11px] font-bold text-slate-400 uppercase">Nivel de Saciedad Percibido</label>
                            <span id="satiety-display" class="text-xs font-mono font-black text-emerald-400">7 / 10 (Saciedad alta)</span>
                        </div>
                        <input type="range" id="obetide-satiety" min="1" max="10" value="7" class="w-full accent-emerald-500">
                        <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
                            <span>1: Mucha hambre</span>
                            <span>5: Moderado</span>
                            <span>10: Inapetencia</span>
                        </div>
                    </div>

                    <!-- Side Effects Checklist -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Efectos Secundarios Observados</label>
                        <div class="flex flex-wrap gap-2 text-xs">
                            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 cursor-pointer">
                                <input type="checkbox" name="side_effect" value="Ninguno" checked class="accent-emerald-500">
                                <span>Ninguno</span>
                            </label>
                            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 cursor-pointer">
                                <input type="checkbox" name="side_effect" value="Náuseas leves" class="accent-emerald-500">
                                <span>Náuseas leves</span>
                            </label>
                            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 cursor-pointer">
                                <input type="checkbox" name="side_effect" value="Digestión lenta" class="accent-emerald-500">
                                <span>Digestión lenta</span>
                            </label>
                            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 cursor-pointer">
                                <input type="checkbox" name="side_effect" value="Reflujo" class="accent-emerald-500">
                                <span>Reflujo</span>
                            </label>
                            <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 cursor-pointer">
                                <input type="checkbox" name="side_effect" value="Fatiga" class="accent-emerald-500">
                                <span>Fatiga</span>
                            </label>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="text-[11px] font-bold text-slate-400 uppercase">Notas o Sensaciones</label>
                        <textarea id="obetide-notes" rows="2" placeholder="ej. Buena energía, sin náuseas, almuerzo completo sin picar entre horas..." class="w-full mt-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"></textarea>
                    </div>

                    <button type="submit" class="w-full btn-emerald py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wide mt-2 shadow-emerald-sm">
                        Guardar Aplicación
                    </button>
                </form>
            </div>
        </div>
    </div>
    `;
};

export const attachObetideEvents = () => {
    const modal = document.getElementById('obetide-modal');
    const openBtn = document.getElementById('open-obetide-modal-btn');
    const closeBtn = document.getElementById('close-obetide-modal');
    const form = document.getElementById('obetide-form');
    const satietySlider = document.getElementById('obetide-satiety');
    const satietyDisplay = document.getElementById('satiety-display');
    const runAiBtn = document.getElementById('run-obetide-ai-btn');
    const aiContainer = document.getElementById('obetide-ai-feedback-container');

    // Satiety slider verbal feedback
    if (satietySlider && satietyDisplay) {
        satietySlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            let desc = 'Normal';
            if (val <= 3) desc = 'Hambre alta / Poca saciedad';
            else if (val <= 6) desc = 'Saciedad moderada';
            else if (val <= 8) desc = 'Saciedad óptima prolongada';
            else desc = 'Muy alta / Inapetencia';
            satietyDisplay.textContent = `${val} / 10 (${desc})`;
        });
    }

    // Open/Close modal
    openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    // Handle Form Submit
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('obetide-date').value;
        const dose_ml = Number(document.getElementById('obetide-dose').value);
        const injection_site = document.querySelector('input[name="injection_site"]:checked')?.value || 'abdomen_der';
        const satiety_level = Number(satietySlider.value);
        const notes = document.getElementById('obetide-notes').value;

        const side_effects = [];
        document.querySelectorAll('input[name="side_effect"]:checked').forEach(cb => {
            side_effects.push(cb.value);
        });

        await addObetideTreatment({
            date,
            dose_ml,
            injection_site,
            satiety_level,
            side_effects,
            notes
        });

        modal?.classList.add('hidden');
        window.showAlert?.('¡Dosis Registrada!', `Se registró la aplicación de ${dose_ml} ml para la fecha ${date}.`, 'success');
        window.router.navigate('obetide');
    });

    // Delete Treatment
    document.querySelectorAll('.delete-obetide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = Number(e.currentTarget.dataset.id);
            window.showConfirm?.('¿Eliminar registro?', 'Esta acción no se puede deshacer.', async () => {
                await deleteObetideTreatment(id);
                window.router.navigate('obetide');
            });
        });
    });

    // AI Medical Evaluation
    runAiBtn?.addEventListener('click', async () => {
        runAiBtn.disabled = true;
        runAiBtn.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Analizando con IA...`;

        try {
            const state = getState();
            const analysis = await generateObetideCoachingSummary(state);

            aiContainer.innerHTML = `
                <div class="white-card p-5 border border-emerald-500/40 bg-slate-900/90 animate-scale-up shadow-2xl">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-emerald-400 text-xl">verified</span>
                            <h4 class="text-sm font-display font-black text-white uppercase">${analysis.statusTitle || 'Informe Clínico'}</h4>
                        </div>
                        <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">GPT-4o Medical</span>
                    </div>

                    <div class="mt-3 flex flex-col gap-2.5 text-xs text-slate-300">
                        <p><strong class="text-white">Titulación:</strong> ${analysis.titrationStatus}</p>
                        <p class="text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                            <strong class="text-emerald-200">Proteína & Músculo:</strong> ${analysis.proteinAlert}
                        </p>
                        <p><strong class="text-white">Saciedad & Efectos:</strong> ${analysis.satietyNotes}</p>
                        
                        ${analysis.actionableTips && analysis.actionableTips.length ? `
                            <div class="mt-1">
                                <span class="font-bold text-white block mb-1">Recomendaciones Clave:</span>
                                <ul class="list-disc pl-4 space-y-1 text-slate-300">
                                    ${analysis.actionableTips.map(tip => `<li>${tip}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            aiContainer.classList.remove('hidden');
        } catch (err) {
            window.showAlert?.('Error de IA', err.message || 'No se pudo conectar con OpenAI.', 'error');
        } finally {
            runAiBtn.disabled = false;
            runAiBtn.innerHTML = `<span class="material-symbols-outlined text-lg text-emerald-400">psychology</span> Evaluación Médica con IA`;
        }
    });

    // Render Correlation Chart
    initObetideChart();
};

const initObetideChart = () => {
    const canvas = document.getElementById('obetide-correlation-chart');
    if (!canvas) return;

    if (obetideChartInstance) {
        obetideChartInstance.destroy();
    }

    const state = getState();
    const treatments = [...(state.obetideTreatments || [])].reverse();
    const measurements = [...(state.measurements || [])].reverse();

    // Build timeline of dates
    const datesMap = new Map();
    treatments.forEach(t => {
        if (!datesMap.has(t.date)) datesMap.set(t.date, { dose: t.dose_ml, weight: null });
        else datesMap.get(t.date).dose = t.dose_ml;
    });

    measurements.forEach(m => {
        if (!datesMap.has(m.date)) datesMap.set(m.date, { dose: null, weight: m.weight });
        else datesMap.get(m.date).weight = m.weight;
    });

    const sortedDates = Array.from(datesMap.keys()).sort();
    const labels = sortedDates.length ? sortedDates : ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

    // Carry over values if sparse
    let lastWeight = state.profile.startingWeight || (measurements[0]?.weight) || 104;
    let lastDose = 0.25;

    const doseData = labels.map(d => {
        const item = datesMap.get(d);
        if (item && item.dose !== null) lastDose = item.dose;
        return lastDose;
    });

    const weightData = labels.map(d => {
        const item = datesMap.get(d);
        if (item && item.weight !== null) lastWeight = item.weight;
        return lastWeight;
    });

    obetideChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Peso Corporal (kg)',
                    data: weightData,
                    borderColor: '#34d399',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    yAxisID: 'yWeight',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#34d399'
                },
                {
                    label: 'Dosis Obetide (ml)',
                    data: doseData,
                    borderColor: '#60a5fa',
                    backgroundColor: '#60a5fa',
                    yAxisID: 'yDose',
                    stepped: true,
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: '#60a5fa'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                yWeight: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Peso (kg)', color: '#94a3b8', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#94a3b8' }
                },
                yDose: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Dosis (ml)', color: '#94a3b8', font: { size: 10 } },
                    min: 0,
                    max: 3.0,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, color: '#f1f5f9', font: { size: 11, weight: 'bold' } }
                }
            }
        }
    });
};
