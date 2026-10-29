import { getState, addMeasurement, getLatestMeasurement, getArgentinaDate, calculateBodyIndices } from '../state';
import { renderSidebar, renderMobileHeader, renderBottomNav } from '../components/Navigation';

export const renderMeasurements = () => {
    const state = getState();
    const history = state.measurements ? [...state.measurements].reverse() : [];
    const latest = getLatestMeasurement();
    const indices = calculateBodyIndices(latest || {}, state.profile);

    const startWeight = state.profile?.startingWeight || indices.weight;
    const weightDelta = Number((indices.weight - startWeight).toFixed(1));

    return `
    <div class="flex h-screen w-full bg-[#050C09] font-body text-[#ECFDF5] overflow-hidden fade-in">
        ${renderSidebar('measurements')}

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            ${renderMobileHeader('Medidas e Índices')}

            <div class="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar pb-28 lg:pb-10">
                <div class="max-w-7xl mx-auto flex flex-col gap-6">

                    <!-- Top Hero Biometric Card -->
                    <div class="white-card card-glow-emerald p-6 shadow-2xl relative overflow-hidden">
                        <!-- Green Watermark Graphics -->
                        <div class="pointer-events-none select-none absolute -right-4 -top-6 text-[#10E775] opacity-[0.09] rotate-12">
                            <span class="material-symbols-outlined text-[130px]">monitor_weight</span>
                        </div>
                        <div class="pointer-events-none select-none absolute right-48 -bottom-6 text-[#84CC16] opacity-[0.08] -rotate-12">
                            <span class="material-symbols-outlined text-[110px]">straighten</span>
                        </div>

                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                            <div>
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span class="badge-emerald">
                                        <span class="size-1.5 rounded-full bg-[#10E775] animate-pulse"></span>
                                        Antropometría & Biometría Automática
                                    </span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                        Fórmula US Navy Seal + Mifflin-St Jeor
                                    </span>
                                </div>
                                <h2 class="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                                    Peso, Medidas & Índices Corporales
                                </h2>
                                <p class="text-xs text-emerald-300/75 mt-0.5">
                                    Ingresa tu peso y perímetros para calcular automáticamente IMC, % Grasa, Masa Magra, ICA, FFMI y TMB.
                                </p>
                            </div>
                            <button id="open-measurement-form-btn" class="btn-emerald px-5 py-3 text-xs font-extrabold uppercase tracking-wider shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-lg">add_circle</span>
                                + Cargar Peso y Medidas
                            </button>
                        </div>

                        <!-- 8 Automatic Body Indices Bento Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 relative z-10">
                            <!-- 1. Peso Actual -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-[#10E775]/30 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">Peso Corporal</span>
                                    <span class="material-symbols-outlined text-base text-[#10E775]">scale</span>
                                </div>
                                <p class="text-2xl font-mono font-extrabold text-[#10E775] mt-1.5">
                                    ${indices.weight} <span class="text-xs font-normal text-emerald-300/60">kg</span>
                                </p>
                                <span class="text-[10px] font-mono ${weightDelta <= 0 ? 'text-[#10E775]' : 'text-lime-300'} mt-1">
                                    ${weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg vs inicio · Meta ideal: ${indices.idealWeight} kg
                                </span>
                            </div>

                            <!-- 2. IMC (BMI) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-emerald-500/25 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">IMC (BMI)</span>
                                    <span class="material-symbols-outlined text-base text-[#34D399]">analytics</span>
                                </div>
                                <p class="text-2xl font-mono font-extrabold text-white mt-1.5">
                                    ${indices.bmi} <span class="text-xs font-normal text-emerald-300/60">kg/m²</span>
                                </p>
                                <span class="text-[10px] font-semibold text-[#34D399] mt-1">
                                    ${indices.bmiCategory} (${indices.height} cm)
                                </span>
                            </div>

                            <!-- 3. % Grasa Corporal (Navy Seal) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-lime-500/25 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-lime-300/80">% Grasa Corporal</span>
                                    <span class="material-symbols-outlined text-base text-lime-400">Percent</span>
                                </div>
                                <p class="text-2xl font-mono font-extrabold text-lime-400 mt-1.5">
                                    ${indices.bodyFat}<span class="text-xs font-normal text-emerald-300/60">%</span>
                                </p>
                                <span class="text-[10px] text-emerald-300/70 mt-1">
                                    Método Antropométrico Navy
                                </span>
                            </div>

                            <!-- 4. Masa Magra / Muscular (LBM) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-teal-500/25 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-teal-300/80">Masa Magra (LBM)</span>
                                    <span class="material-symbols-outlined text-base text-teal-300">fitness_center</span>
                                </div>
                                <p class="text-2xl font-mono font-extrabold text-teal-300 mt-1.5">
                                    ${indices.leanMass} <span class="text-xs font-normal text-emerald-300/60">kg</span>
                                </p>
                                <span class="text-[10px] text-teal-300/80 mt-1">
                                    ${indices.leanPct}% libre de grasa
                                </span>
                            </div>

                            <!-- 5. Masa Grasa Total -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-emerald-500/20 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">Masa Grasa Total</span>
                                    <span class="material-symbols-outlined text-base text-lime-400">water_drop</span>
                                </div>
                                <p class="text-xl font-mono font-extrabold text-lime-300 mt-1.5">
                                    ${indices.fatMass} <span class="text-xs font-normal text-emerald-300/60">kg</span>
                                </p>
                                <span class="text-[10px] text-emerald-300/70 mt-1">
                                    Tejido adiposo estimado
                                </span>
                            </div>

                            <!-- 6. ICA (Índice Cintura-Altura) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-emerald-500/20 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">Índice Cintura/Altura</span>
                                    <span class="material-symbols-outlined text-base text-[#10E775]">straighten</span>
                                </div>
                                <p class="text-xl font-mono font-extrabold text-white mt-1.5">
                                    ${indices.whtr} <span class="text-xs font-normal text-emerald-300/60">ICA</span>
                                </p>
                                <span class="text-[10px] font-semibold ${indices.whtr < 0.5 ? 'text-[#10E775]' : 'text-lime-300'} mt-1">
                                    ${indices.whtrCategory} · ICC: ${indices.whr}
                                </span>
                            </div>

                            <!-- 7. FFMI (Índice de Desarrollo Muscular) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-emerald-500/20 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">Índice Muscular FFMI</span>
                                    <span class="material-symbols-outlined text-base text-[#34D399]">exercise</span>
                                </div>
                                <p class="text-xl font-mono font-extrabold text-[#34D399] mt-1.5">
                                    ${indices.ffmi} <span class="text-xs font-normal text-emerald-300/60">kg/m²</span>
                                </p>
                                <span class="text-[10px] text-emerald-300/70 mt-1">
                                    ${indices.ffmi >= 20 ? 'Estructura muscular sólida' : 'En desarrollo muscular'}
                                </span>
                            </div>

                            <!-- 8. TMB & TDEE (Metabolismo) -->
                            <div class="p-4 rounded-2xl bg-[#040B08]/75 border border-emerald-500/20 flex flex-col justify-between">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/75">Metabolismo (TMB)</span>
                                    <span class="material-symbols-outlined text-base text-[#10E775]">local_fire_department</span>
                                </div>
                                <p class="text-xl font-mono font-extrabold text-[#10E775] mt-1.5">
                                    ${indices.bmr} <span class="text-xs font-normal text-emerald-300/60">kcal</span>
                                </p>
                                <span class="text-[10px] text-emerald-300/70 mt-1">
                                    Gasto Total (TDEE): ~${indices.tdee} kcal
                                </span>
                            </div>
                        </div>

                        <!-- Current Body Perimeters Strip -->
                        <div class="mt-5 pt-4 border-t border-emerald-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Perímetros actuales:</span>
                                <span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Cintura: <strong>${indices.waist} cm</strong></span>
                                <span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Cuello: <strong>${indices.neck} cm</strong></span>
                                <span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Cadera: <strong>${indices.hip} cm</strong></span>
                                ${indices.chest ? `<span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Pecho: <strong>${indices.chest} cm</strong></span>` : ''}
                                ${indices.arm ? `<span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Brazo: <strong>${indices.arm} cm</strong></span>` : ''}
                                ${indices.thigh ? `<span class="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/20 font-mono text-emerald-100">Muslo: <strong>${indices.thigh} cm</strong></span>` : ''}
                            </div>
                            <span class="text-[11px] text-emerald-300/70 font-mono">Altura: ${indices.height} cm</span>
                        </div>
                    </div>

                    <!-- Chart Card -->
                    <div class="white-card card-glow-mint p-6 shadow-xl">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <h3 class="text-base font-display font-extrabold text-white uppercase">Curva de Evolución: Peso, % Grasa y Masa Magra</h3>
                                <p class="text-xs text-emerald-300/70">Seguimiento histórico de recomposición corporal</p>
                            </div>
                            <span class="badge-emerald font-mono">${history.length} mediciones</span>
                        </div>
                        <div class="h-64 w-full relative">
                            <canvas id="measurementsChart" class="w-full h-full"></canvas>
                        </div>
                    </div>

                    <!-- History Table -->
                    <div class="white-card p-6 border border-emerald-500/20 shadow-xl">
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                            <h3 class="text-base font-display font-extrabold text-white uppercase">
                                Historial Antropométrico Completo
                            </h3>
                            <button id="open-measurement-form-table-btn" class="btn-emerald-soft px-3 py-1.5 text-xs font-bold cursor-pointer">
                                + Nueva Medición
                            </button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="text-emerald-300/70 font-bold uppercase text-[10px] border-b border-emerald-500/15">
                                        <th class="pb-2.5">Fecha</th>
                                        <th class="pb-2.5">Peso</th>
                                        <th class="pb-2.5">IMC</th>
                                        <th class="pb-2.5">% Grasa</th>
                                        <th class="pb-2.5">Masa Magra</th>
                                        <th class="pb-2.5">Masa Grasa</th>
                                        <th class="pb-2.5">Cintura / Cuello / Cadera</th>
                                        <th class="pb-2.5">ICA</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-emerald-500/10 font-medium">
                                    ${history.length ? history.map(m => {
                                        const rowIdx = calculateBodyIndices(m, state.profile);
                                        return `
                                        <tr class="hover:bg-emerald-500/[0.04]">
                                            <td class="py-3 font-bold text-white font-mono">${m.date}</td>
                                            <td class="py-3 font-mono font-extrabold text-[#10E775]">${rowIdx.weight} kg</td>
                                            <td class="py-3 font-mono text-emerald-200">${rowIdx.bmi}</td>
                                            <td class="py-3 font-mono font-bold text-lime-400">${rowIdx.bodyFat}%</td>
                                            <td class="py-3 font-mono font-bold text-teal-300">${rowIdx.leanMass} kg</td>
                                            <td class="py-3 font-mono text-emerald-300/80">${rowIdx.fatMass} kg</td>
                                            <td class="py-3 font-mono text-emerald-200/70">${m.waist || '--'} / ${m.neck || '--'} / ${m.hip || '--'} cm</td>
                                            <td class="py-3 font-mono text-emerald-300">${rowIdx.whtr}</td>
                                        </tr>
                                        `;
                                    }).join('') : `
                                        <tr><td colspan="8" class="py-6 text-center text-emerald-300/50 italic">Sin mediciones registradas. Haz clic en "+ Cargar Peso y Medidas" para comenzar.</td></tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            ${renderBottomNav('measurements')}
        </main>

        <!-- Measurement Form Modal -->
        <div id="measurement-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"></div>
    </div>
    `;
};

export const openBodyMeasurementModal = (modalContainer, onSavedCallback) => {
    const state = getState();
    const latest = getLatestMeasurement();
    const initial = calculateBodyIndices(latest || {}, state.profile);

    modalContainer.innerHTML = `
        <div class="white-card card-glow-emerald p-6 w-full max-w-lg relative animate-scale-up shadow-2xl border border-emerald-500/35 my-6 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/15">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[#10E775] text-xl">monitor_weight</span>
                    <div>
                        <h3 class="text-base font-display font-extrabold text-white uppercase">Cargar Peso y Medidas</h3>
                        <p class="text-[11px] text-emerald-300/70">Cálculo automático en tiempo real de todos tus índices</p>
                    </div>
                </div>
                <button id="close-meas-modal" class="size-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 hover:bg-emerald-900 cursor-pointer">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <div class="flex flex-col gap-3.5">
                <!-- Primary Inputs: Weight, Height, Date -->
                <div class="grid grid-cols-3 gap-2.5">
                    <div>
                        <label class="text-[10px] font-bold text-[#10E775] uppercase">Peso Actual (kg) *</label>
                        <input id="input-weight" type="number" step="0.1" value="${initial.weight}" placeholder="85.0" class="meas-live-input w-full rounded-xl px-3 py-2 text-base font-mono font-extrabold text-[#10E775] outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-emerald-300/80 uppercase">Altura (cm)</label>
                        <input id="input-height" type="number" step="1" value="${initial.height}" placeholder="175" class="meas-live-input w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-emerald-300/80 uppercase">Fecha</label>
                        <input id="input-date" type="date" value="${getArgentinaDate()}" class="w-full rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none mt-1">
                    </div>
                </div>

                <!-- Navy Seal Core Perimeters: Waist, Neck, Hip -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/70 border border-emerald-500/20">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block mb-2">Perímetros Clave (Cálculo % Grasa, ICA e ICC)</span>
                    <div class="grid grid-cols-3 gap-2.5">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Cintura (cm)</label>
                            <input id="input-waist" type="number" step="0.5" value="${initial.waist}" placeholder="88" class="meas-live-input w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Cuello (cm)</label>
                            <input id="input-neck" type="number" step="0.5" value="${initial.neck}" placeholder="39" class="meas-live-input w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/70 uppercase">Cadera (cm)</label>
                            <input id="input-hip" type="number" step="0.5" value="${initial.hip}" placeholder="98" class="meas-live-input w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none mt-1">
                        </div>
                    </div>
                </div>

                <!-- Optional Muscular Perimeters: Chest, Arm, Thigh -->
                <div class="p-3.5 rounded-2xl bg-[#040B08]/50 border border-emerald-500/15">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/70 block mb-2">Perímetros Musculares Opcionales (cm)</span>
                    <div class="grid grid-cols-3 gap-2.5">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/60 uppercase">Pecho / Tórax</label>
                            <input id="input-chest" type="number" step="0.5" value="${initial.chest || ''}" placeholder="102" class="meas-live-input w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/60 uppercase">Brazo / Bíceps</label>
                            <input id="input-arm" type="number" step="0.5" value="${initial.arm || ''}" placeholder="36" class="meas-live-input w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none mt-1">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-300/60 uppercase">Muslo</label>
                            <input id="input-thigh" type="number" step="0.5" value="${initial.thigh || ''}" placeholder="58" class="meas-live-input w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none mt-1">
                        </div>
                    </div>
                </div>

                <!-- LIVE AUTOMATIC INDICES PREVIEW PANEL -->
                <div class="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-[#040B08] border border-[#10E775]/35">
                    <div class="flex items-center justify-between mb-2.5">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#10E775] flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">auto_awesome</span>
                            Cálculo Automático de Índices en Vivo
                        </span>
                        <span id="live-bmi-cat" class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10E775]/20 text-[#10E775] border border-[#10E775]/30">
                            ${initial.bmiCategory}
                        </span>
                    </div>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div class="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                            <span class="text-[9px] text-emerald-300/70 uppercase block font-bold">IMC</span>
                            <span id="live-bmi" class="text-sm font-mono font-extrabold text-white">${initial.bmi}</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-lime-500/25">
                            <span class="text-[9px] text-lime-300/80 uppercase block font-bold">% Grasa</span>
                            <span id="live-bf" class="text-sm font-mono font-extrabold text-lime-400">${initial.bodyFat}%</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-teal-500/25">
                            <span class="text-[9px] text-teal-300/80 uppercase block font-bold">M. Magra</span>
                            <span id="live-lean" class="text-sm font-mono font-extrabold text-teal-300">${initial.leanMass}kg</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                            <span class="text-[9px] text-emerald-300/70 uppercase block font-bold">M. Grasa</span>
                            <span id="live-fat" class="text-sm font-mono font-extrabold text-emerald-200">${initial.fatMass}kg</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                            <span class="text-[9px] text-emerald-300/70 uppercase block font-bold">ICA / FFMI</span>
                            <span id="live-whtr" class="text-xs font-mono font-extrabold text-[#10E775]">${initial.whtr} / ${initial.ffmi}</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                            <span class="text-[9px] text-emerald-300/70 uppercase block font-bold">TMB Basal</span>
                            <span id="live-bmr" class="text-xs font-mono font-extrabold text-white">${initial.bmr} kcal</span>
                        </div>
                    </div>
                </div>

                <button id="save-meas-btn" class="btn-emerald py-3.5 text-xs font-extrabold uppercase tracking-wider mt-1 cursor-pointer">
                    <span class="material-symbols-outlined text-lg">check_circle</span>
                    Guardar Peso, Medidas e Índices
                </button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    const updateLivePreview = () => {
        const weight = parseFloat(document.getElementById('input-weight')?.value) || initial.weight;
        const height = parseFloat(document.getElementById('input-height')?.value) || initial.height;
        const waist = parseFloat(document.getElementById('input-waist')?.value) || initial.waist;
        const neck = parseFloat(document.getElementById('input-neck')?.value) || initial.neck;
        const hip = parseFloat(document.getElementById('input-hip')?.value) || initial.hip;

        const calc = calculateBodyIndices({ weight, height, waist, neck, hip }, { ...state.profile, height });
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setTxt('live-bmi', calc.bmi);
        setTxt('live-bmi-cat', calc.bmiCategory);
        setTxt('live-bf', `${calc.bodyFat}%`);
        setTxt('live-lean', `${calc.leanMass}kg`);
        setTxt('live-fat', `${calc.fatMass}kg`);
        setTxt('live-whtr', `${calc.whtr} / ${calc.ffmi}`);
        setTxt('live-bmr', `${calc.bmr} kcal`);
    };

    modalContainer.querySelectorAll('.meas-live-input').forEach(inp => {
        inp.addEventListener('input', updateLivePreview);
    });

    document.getElementById('close-meas-modal').onclick = () => modalContainer.classList.add('hidden');

    document.getElementById('save-meas-btn').onclick = async () => {
        const weight = parseFloat(document.getElementById('input-weight').value);
        const height = parseFloat(document.getElementById('input-height').value) || initial.height;
        const date = document.getElementById('input-date').value || getArgentinaDate();
        const waist = parseFloat(document.getElementById('input-waist').value) || initial.waist;
        const neck = parseFloat(document.getElementById('input-neck').value) || initial.neck;
        const hip = parseFloat(document.getElementById('input-hip').value) || initial.hip;
        const chest = parseFloat(document.getElementById('input-chest').value) || 0;
        const arm = parseFloat(document.getElementById('input-arm').value) || 0;
        const thigh = parseFloat(document.getElementById('input-thigh').value) || 0;

        if (!weight || weight <= 0) {
            window.showAlert?.('Peso requerido', 'Ingresa un peso corporal válido en kg.', 'error');
            return;
        }

        const savedEntry = await addMeasurement({ weight, height, date, waist, neck, hip, chest, arm, thigh });
        modalContainer.classList.add('hidden');
        window.showAlert?.(
            '¡Medidas e Índices Actualizados!',
            `Peso: ${savedEntry.weight}kg · IMC: ${savedEntry.bmi} · Grasa: ${savedEntry.bodyFat}% · Masa Magra: ${savedEntry.leanMass}kg`,
            'success'
        );
        if (onSavedCallback) onSavedCallback(savedEntry);
    };
};

export const attachMeasurementsEvents = () => {
    const state = getState();
    const modal = document.getElementById('measurement-modal');

    // Render Chart in Green Spectrum
    const history = (state.measurements || []).slice(-12);
    const ctx = document.getElementById('measurementsChart')?.getContext('2d');
    if (ctx && history.length > 0 && window.Chart) {
        new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(m => m.date),
                datasets: [
                    {
                        label: 'Peso (kg)',
                        data: history.map(m => m.weight),
                        borderColor: '#10E775',
                        backgroundColor: 'rgba(16, 231, 117, 0.12)',
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: 'Masa Magra (kg)',
                        data: history.map(m => m.leanMass || calculateBodyIndices(m, state.profile).leanMass),
                        borderColor: '#2DD4BF',
                        backgroundColor: 'transparent',
                        tension: 0.35
                    },
                    {
                        label: '% Grasa',
                        data: history.map(m => m.bodyFat),
                        borderColor: '#84CC16',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#ECFDF5', font: { size: 11, weight: 'bold' } }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#86EFAC' }
                    },
                    y: {
                        grid: { color: 'rgba(16, 231, 117, 0.08)' },
                        ticks: { color: '#86EFAC' }
                    }
                }
            }
        });
    }

    const triggerOpenModal = () => {
        openBodyMeasurementModal(modal, () => {
            window.router.navigate('measurements');
        });
    };

    document.getElementById('open-measurement-form-btn')?.addEventListener('click', triggerOpenModal);
    document.getElementById('open-measurement-form-table-btn')?.addEventListener('click', triggerOpenModal);
};
