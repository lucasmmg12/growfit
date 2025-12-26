import { chatWithAI } from '../services/openai';
import { getState } from '../state';

export const renderChatWidget = () => {
    return `
    <!-- Chat Button -->
    <div id="chat-fab-container" class="fixed bottom-6 right-6 z-50">
        <button id="chat-toggle-btn" class="bg-primary hover:bg-[#0fd620] text-black w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-105">
             <span class="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
    </div>

    <!-- Chat Modal -->
    <div id="chat-modal" class="fixed bottom-24 right-6 w-[90vw] max-w-[400px] h-[500px] bg-background-dark/95 backdrop-blur-xl border border-[#28392a] rounded-2xl shadow-2xl flex flex-col z-50 hidden transition-all origin-bottom-right scale-95 opacity-0">
        <!-- Header -->
        <div class="p-4 border-b border-[#28392a] flex justify-between items-center bg-[#1A261C] rounded-t-2xl">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">smart_toy</span>
                <div>
                     <h3 class="text-white font-bold text-sm">GrowFit AI</h3>
                     <p class="text-[10px] text-primary flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> En línea</p>
                </div>
            </div>
            <button id="chat-close-btn" class="text-text-secondary hover:text-white">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Chat Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
            <!-- Welcome Message -->
            <div class="flex flex-col gap-1 items-start max-w-[85%]">
                <div class="bg-[#1A261C] border border-[#28392a] p-3 rounded-2xl rounded-tl-none text-sm text-white shadow-sm">
                    ¡Hola! Soy tu asistente personal. ¿En qué te ayudo hoy?
                </div>
            </div>
        </div>

        <!-- Quick Questions -->
        <div class="p-2 border-t border-[#28392a] flex gap-2 overflow-x-auto no-scrollbar">
            <button class="quick-q whitespace-nowrap px-3 py-1.5 bg-[#28392a] hover:bg-primary/20 hover:text-primary text-xs text-text-secondary rounded-full transition-colors border border-transparent hover:border-primary/50">
                ¿Qué como hoy?
            </button>
            <button class="quick-q whitespace-nowrap px-3 py-1.5 bg-[#28392a] hover:bg-primary/20 hover:text-primary text-xs text-text-secondary rounded-full transition-colors border border-transparent hover:border-primary/50">
                Resumen de hoy
            </button>
             <button class="quick-q whitespace-nowrap px-3 py-1.5 bg-[#28392a] hover:bg-primary/20 hover:text-primary text-xs text-text-secondary rounded-full transition-colors border border-transparent hover:border-primary/50">
                Idea de cena ligera
            </button>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-[#1A261C] rounded-b-2xl">
            <form id="chat-form" class="flex items-center gap-2">
                <input type="text" id="chat-input" placeholder="Escribe tu duda..." class="flex-1 bg-background-dark border border-[#28392a] rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary outline-none">
                <button type="submit" class="bg-primary hover:bg-[#0fd620] text-black p-2.5 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined text-[20px]">send</span>
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

    // Toggle Visibility with Animation
    const toggleChat = () => {
        const isHidden = modal.classList.contains('hidden');
        if (isHidden) {
            modal.classList.remove('hidden');
            // Trigger reflow
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

    // Send Message Logic
    const sendMessage = async (text) => {
        if (!text.trim()) return;

        // 1. Add User Message
        appendMessage('user', text);
        input.value = '';
        input.disabled = true;

        // Setup Loading Indicator
        const loadingId = 'loading-' + Date.now();
        appendLoading(loadingId);

        // 2. Call AI
        try {
            const state = getState();
            const response = await chatWithAI(text, state);

            // Remove Loading
            removeLoading(loadingId);

            // 3. Add AI Message
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

    // Quick Questions
    document.querySelectorAll('.quick-q').forEach(btn => {
        btn.addEventListener('click', () => {
            sendMessage(btn.textContent.trim());
        });
    });

    // Helpers
    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] self-${role === 'user' ? 'end' : 'start'} animate-fadeIn`;

        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'p-3 rounded-2xl rounded-tr-none text-sm text-black bg-white shadow-sm font-medium'
            : 'bg-[#1A261C] border border-[#28392a] p-3 rounded-2xl rounded-tl-none text-sm text-white shadow-sm';

        // Simple Markdown parsing for formatting
        bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

        div.appendChild(bubble);
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendLoading(id) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'flex items-center gap-2 self-start p-3 bg-[#1A261C] border border-[#28392a] rounded-2xl rounded-tl-none text-white w-fit animate-pulse';
        div.innerHTML = `
            <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-100"></span>
            <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-200"></span>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};
