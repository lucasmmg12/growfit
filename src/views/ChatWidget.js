import { chatWithAI } from '../services/openai';
import { getState } from '../state';

export const renderChatWidget = () => {
    return `
    <!-- Floating AI Chat Button -->
    <div id="chat-fab-container" class="fixed bottom-20 lg:bottom-8 right-5 z-40">
        <button id="chat-toggle-btn" class="btn-emerald size-13 rounded-full shadow-emerald-lg flex items-center justify-center border-2 border-white active:scale-95 transition-transform" title="Asistente GrowFit AI">
             <span class="material-symbols-outlined text-2xl">smart_toy</span>
        </button>
    </div>

    <!-- Chat Modal -->
    <div id="chat-modal" class="fixed bottom-36 lg:bottom-24 right-5 w-[92vw] max-w-[380px] h-[520px] bg-white/95 backdrop-blur-2xl border border-border-emerald rounded-3xl shadow-emerald-lg flex flex-col z-50 hidden transition-all origin-bottom-right scale-95 opacity-0">
        <!-- Header -->
        <div class="p-4 border-b border-border-soft flex justify-between items-center bg-emerald-50/70 rounded-t-3xl">
            <div class="flex items-center gap-2.5">
                <div class="size-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                    <span class="material-symbols-outlined text-base">smart_toy</span>
                </div>
                <div>
                     <h3 class="text-text-emerald font-display font-black text-sm uppercase">GrowFit AI Coach</h3>
                     <p class="text-[10px] text-text-muted flex items-center gap-1 font-semibold">
                        <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En línea
                     </p>
                </div>
            </div>
            <button id="chat-close-btn" class="size-7 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-xs">
                <span class="material-symbols-outlined text-base">close</span>
            </button>
        </div>

        <!-- Messages Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            <!-- Welcome Message -->
            <div class="flex flex-col gap-1 items-start max-w-[85%]">
                <div class="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none text-xs text-text-primary shadow-xs leading-relaxed font-medium">
                    ¡Hola! Soy tu asistente de nutrición y entrenamiento. ¿En qué te ayudo hoy?
                </div>
            </div>
        </div>

        <!-- Quick Question Chips -->
        <div class="px-3 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
            <button class="quick-q whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 hover:text-text-emerald text-[11px] font-bold text-text-muted rounded-full border border-slate-200 shadow-xs transition-colors">
                ¿Qué como hoy?
            </button>
            <button class="quick-q whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 hover:text-text-emerald text-[11px] font-bold text-text-muted rounded-full border border-slate-200 shadow-xs transition-colors">
                Resumen de macros
            </button>
             <button class="quick-q whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 hover:text-text-emerald text-[11px] font-bold text-text-muted rounded-full border border-slate-200 shadow-xs transition-colors">
                Consejo pre-entreno
            </button>
        </div>

        <!-- Input Area -->
        <div class="p-3 bg-white rounded-b-3xl border-t border-slate-100">
            <form id="chat-form" class="flex items-center gap-2">
                <input type="text" id="chat-input" placeholder="Pregunta sobre comida o rutinas..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:border-primary outline-none">
                <button type="submit" class="btn-emerald size-9 rounded-xl flex items-center justify-center p-0 shadow-emerald-sm">
                    <span class="material-symbols-outlined text-base">send</span>
                </button>
            </form>
        </div>
    </div>
    `;
};

export const attachChatWidgetEvents = () => {
    const fab = document.getElementById('chat-toggle-btn');
    const modal = document.getElementById('chat-modal');
    const closeBtn = document.getElementById('chat-close-btn');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    if (!fab || !modal || !form || !input) return;

    const toggleChat = () => {
        const isHidden = modal.classList.contains('hidden');
        if (isHidden) {
            modal.classList.remove('hidden');
            void modal.offsetWidth;
            modal.classList.remove('scale-95', 'opacity-0');
            modal.classList.add('scale-100', 'opacity-100');
            input.focus();
        } else {
            modal.classList.remove('scale-100', 'opacity-100');
            modal.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 200);
        }
    };

    fab.addEventListener('click', toggleChat);
    closeBtn?.addEventListener('click', toggleChat);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        appendMessage('user', text);
        input.value = '';
        input.disabled = true;

        const loadingId = 'loading-' + Date.now();
        appendLoading(loadingId);

        try {
            const state = getState();
            const response = await chatWithAI(text, state);
            removeLoading(loadingId);
            appendMessage('ai', response);
        } catch (e) {
            removeLoading(loadingId);
            appendMessage('ai', 'Error de conexión. Intenta de nuevo.');
        } finally {
            input.disabled = false;
            input.focus();
        }
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage(input.value);
    });

    document.querySelectorAll('.quick-q').forEach(btn => {
        btn.addEventListener('click', () => {
            sendMessage(btn.textContent.trim());
        });
    });

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] self-${role === 'user' ? 'end' : 'start'} animate-fadeIn`;

        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'p-3 rounded-2xl rounded-tr-none text-xs text-white bg-primary font-medium shadow-xs'
            : 'p-3 rounded-2xl rounded-tl-none text-xs text-text-primary bg-slate-50 border border-slate-200 shadow-xs font-medium leading-relaxed';

        bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

        div.appendChild(bubble);
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendLoading(id) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'flex items-center gap-2 self-start p-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none text-text-muted w-fit animate-pulse';
        div.innerHTML = `
            <span class="size-1.5 bg-primary rounded-full animate-bounce"></span>
            <span class="size-1.5 bg-primary rounded-full animate-bounce delay-100"></span>
            <span class="size-1.5 bg-primary rounded-full animate-bounce delay-200"></span>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};
