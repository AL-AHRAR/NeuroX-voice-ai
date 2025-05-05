// --- === NeuroX Voice Interaction Script === ---

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    console.log("DOM fully loaded and parsed");

    // --- DOM Element Selection ---
    let body;
    try {
        body = document.body;
        if (!body) throw new Error("Document body not found initially.");
    } catch (error) {
        console.error("Fatal Error: Could not access document.body.", error);
        if (document && document.documentElement) {
             document.documentElement.innerHTML = '<p style="color:red; padding:20px;">Fatal Error: Application could not initialize.</p>';
        }
        return;
    }

    const htmlElement = document.documentElement;
    const micButton = document.getElementById('mic-button');
    const micIcon = micButton?.querySelector('.mic-icon-container > i'); // More specific selector
    const outputArea = document.getElementById('output-area');
    let placeholderText = outputArea?.querySelector('.placeholder');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const loaderWrapper = document.getElementById('loader-wrapper');
    const responseAudio = document.getElementById('response-audio');

    // Sidebar Elements
    const historySidebar = document.getElementById('history-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');

    // Theme Toggle
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = themeToggleButton?.querySelector('i');

    // Language Elements
    const langArBtn = document.getElementById('lang-ar-btn');
    const langEnBtn = document.getElementById('lang-en-btn');

    // Voice Selector Element
    const voiceSelect = document.getElementById('voice-select');

    // Welcome Modal Elements
    const welcomeModalOverlay = document.getElementById('welcome-modal-overlay');
    const welcomeModalContent = document.getElementById('welcome-modal-content');
    const modalTabButtons = welcomeModalContent?.querySelectorAll('.modal-tab-btn');
    const modalTabPanels = welcomeModalContent?.querySelectorAll('.modal-tab-panel');
    const acceptTermsBtn = document.getElementById('accept-terms-btn');
    const closeModalBtns = welcomeModalContent?.querySelectorAll('.close-modal-btn');
    const modalStep2 = document.getElementById('modal-step-2');
    const showAgainBtn = document.getElementById('show-again-btn');
    const dontShowAgainBtn = document.getElementById('dont-show-again-btn');

    // Mic Permission Modal Elements
    const micPermissionModalOverlay = document.getElementById('mic-permission-modal-overlay');
    const allowMicBtn = document.getElementById('allow-mic-btn');
    const denyMicBtn = document.getElementById('deny-mic-btn');

    // --- State Variables ---
    let isRecording = false;
    let recognition = null;
    let conversationHistory = [];
    let currentLanguage = 'ar'; // Default, will be loaded
    let currentTheme = 'dark'; // Default, will be loaded
    let silenceTimer = null;
    const SILENCE_TIMEOUT = 3000; // milliseconds
    let finalTranscript = '';
    let interimTranscript = '';

    // --- Translation Dictionary ---
    // (Keep the full dictionary as provided in the original prompt)
    const translations = {
        en: {
            appTitle: "NeuroX - Voice Interaction",
            welcomeTabUpdates: "Updates",
            welcomeTabAbout: "About NeuroX",
            welcomeTabPrivacy: "Privacy",
            welcomeUpdateTitle: "NeuroX Update",
            welcomeUpdateDesc: "NeuroX has been updated with new features and performance improvements for a better voice interaction experience.",
            welcomeUpdateHighlights: "Highlights:",
            welcomeUpdatePoint1: "Faster response speed.",
            welcomeUpdatePoint2: "Improved contextual understanding.",
            welcomeUpdatePoint3: "Better audio quality.",
            welcomeUpdatePoint4: "Refreshed user interface.",
            welcomeUpdatePoint5: "Foundation for future features.",
            welcomeUpdateConsent: "Your use signifies agreement to the updated terms.",
            continueBtn: "Continue",
            welcomeAboutTitle: "What is NeuroX?",
            welcomeAboutDesc1: "NeuroX is an intelligent voice assistant designed to understand and interact with you naturally and smoothly.",
            welcomeAboutDesc2: "We use advanced techniques in natural language processing and speech synthesis to provide a seamless and efficient experience, focusing on speed and accuracy.",
            welcomeAboutFeatHead: "Key Features:",
            welcomeAboutFeat1: "<strong>Contextual Understanding:</strong> NeuroX remembers the conversation flow to provide more relevant responses.",
            welcomeAboutFeat2: "<strong>Fast Response:</strong> Optimized to deliver responses with minimal delay.",
            welcomeAboutFeat3: "<strong>Natural Voice:</strong> Hear clear and natural voice responses in your chosen language.",
            welcomeAboutFeat4: "<strong>Simple Interface:</strong> Design focused on ease of use and quick access to features.",
            welcomeAboutDesc3: "<strong>Our Goal:</strong> To make voice interaction simple, useful, and accessible to everyone, while respecting your privacy.",
            gotItBtn: "Got It",
            welcomePrivacyTitle: "Privacy Policy",
            welcomePrivacyDesc1: "At NeuroX, we take your privacy seriously and are committed to protecting your personal data.",
            welcomePrivacyDesc2: "<strong>How we use your data:</strong>",
            welcomePrivacyPoint1: "Your voice and text inputs are used <strong data-translate-key=\"onlyStrong\">only</strong> to process your requests and generate appropriate responses through AI models.", // Note: Strong tag has its own key now
            onlyStrong: "only", // Added key for the strong tag content
            welcomePrivacyPoint2: "We may collect anonymous usage data (like request types, response times, errors) to improve application performance and model accuracy. This data is not linked to you personally.",
            welcomePrivacySecure1: "<strong>Data Security:</strong> We use standard security measures to protect your data during transmission and storage.",
            welcomePrivacyPoint3: "<strong>No Sharing:</strong> We do not share your voice, text data, or any personally identifiable information with third parties for commercial or advertising purposes without your explicit consent.",
            welcomePrivacyControl1: "<strong>Control & Transparency:</strong> You can clear your locally stored conversation history at any time through the app settings.",
            welcomePrivacyDesc4: "We use external APIs for language processing and voice generation. These services may be subject to their own privacy policies.",
            welcomePrivacyDesc3: "For more details, you can view the full privacy policy <a href=\"#\" class=\"footer-links\" data-translate-key=\"hereLink\">here</a>.", // Note: Key is on the <p>, <a> has its own key
            hereLink: "here", // Added key for the link text
            welcomeConfirmTitle: "Approved",
            welcomeConfirmMsg: "Would you like to see major update messages in the future?",
            yesBtn: "Yes",
            noBtn: "No",
            micPermissionTitle: "Microphone Permission Required",
            micPermissionDesc: "NeuroX needs access to your microphone to listen to your voice commands. Nothing will be recorded until you press the microphone button.",
            allowBtn: "Allow",
            denyBtn: "Deny",
            settingsLabel: "Settings",
            historyTitle: "History",
            closeLabel: "Close",
            languageLabel: "Language",
            langAr: "العربية", // Added for buttons
            langEn: "English", // Added for buttons
            historyEmpty: "No history yet.",
            clearHistoryLabel: "Clear History",
            clearHistoryBtn: "Clear History",
            clearHistoryConfirm: "Are you sure you want to clear the entire conversation history? This cannot be undone.",
            openHistoryLabel: "Open History",
            toggleThemeLabel: "Toggle Theme",
            statusTapToStart: "Tap to Start",
            statusListening: "Listening...",
            statusProcessing: "Processing...",
            statusSpeaking: "Speaking...",
            statusError: "Error Occurred",
            voiceSelectLabel: "Choose Voice Tone:",
            micBtnStartLabel: "Start Listening",
            micBtnStopLabel: "Stop Listening",
            outputPlaceholder: "Conversation appears here...",
            infoCapabilitiesTitle: "Core Capabilities",
            infoCap1Title: "Speech Recognition",
            infoCap1Desc: "Accurate understanding of your speech.",
            infoCap2Title: "Language Understanding",
            infoCap2Desc: "Analyzing meaning and intent.",
            infoCap3Title: "Speech Synthesis",
            infoCap3Desc: "Natural voice responses.",
            infoCap4Title: "Contextual Memory",
            infoCap4Desc: "Remembering past conversations.",
            infoCap5Title: "Privacy & Security",
            infoCap5Desc: "Protecting your data is our priority.",
            privacyLink: "Privacy",
            termsLink: "Terms",
            historyUserLabel: "You",
            historyAiLabel: "AI",
            historyErrorLabel: "Error",
            // Errors (more detailed)
            errorApiFailed: "Sorry, the request could not be processed.",
            errorApiDetails: "Sorry, couldn't process the request: ", // Appends details
            errorNoSpeech: "Sorry, I didn't hear anything. Please try again.",
            errorAudioPlayback: "Sorry, there was an issue playing the response.",
            errorMicNotAllowed: "Microphone access denied. Please allow access in your browser settings to use voice input.",
            errorRecognition: "Sorry, a speech recognition error occurred.",
            errorNetwork: "Network error. Please check your connection and try again.",
            errorServer: "Server error. Please try again later.",
            errorCanceled: "Speech input canceled.",
            errorMicNotSupported: "Speech Recognition (microphone input) is not supported by this browser.",
            errorAudioCapture: "Audio capture error. Check microphone connection or system permissions.",
            errorFailedMicStart: "Failed to start microphone. Please ensure it's connected and allowed.",
            errorIncompleteAudio: "Received empty or incomplete audio from server.",
            errorUnexpectedResponse: "Received an unexpected response format from the server.",
        },
        ar: {
            appTitle: "NeuroX - التفاعل الصوتي",
            welcomeTabUpdates: "التحديثات",
            welcomeTabAbout: "عن NeuroX",
            welcomeTabPrivacy: "الخصوصية",
            welcomeUpdateTitle: "تحديث NeuroX",
            welcomeUpdateDesc: "تم تحديث NeuroX بميزات جديدة وتحسينات في الأداء لتجربة تفاعل صوتي أفضل.",
            welcomeUpdateHighlights: "أبرز الجديد:",
            welcomeUpdatePoint1: "سرعة استجابة فائقة.",
            welcomeUpdatePoint2: "فهم سياقي مُحسَّن.",
            welcomeUpdatePoint3: "جودة صوت أفضل.",
            welcomeUpdatePoint4: "واجهة مستخدم مُجدَّدة.",
            welcomeUpdatePoint5: "أساس لميزات مستقبلية.",
            welcomeUpdateConsent: "استخدامك يعني موافقتك على الشروط المحدثة.",
            continueBtn: "متابعة",
            welcomeAboutTitle: "ما هو NeuroX؟",
            welcomeAboutDesc1: "NeuroX هو مساعد صوتي ذكي مصمم لفهمك والتفاعل معك بشكل طبيعي وسلس.",
            welcomeAboutDesc2: "نحن نستخدم تقنيات متقدمة في معالجة اللغة الطبيعية وتوليد الكلام لنقدم لك تجربة سلسة وفعالة، مع التركيز على السرعة والدقة.",
            welcomeAboutFeatHead: "مميزات رئيسية:",
            welcomeAboutFeat1: "<strong>فهم السياق:</strong> يتذكر NeuroX مجرى الحديث لتقديم ردود أكثر ملاءمة.",
            welcomeAboutFeat2: "<strong>استجابة سريعة:</strong> مُحسَّن لتقديم الردود بأقل تأخير ممكن.",
            welcomeAboutFeat3: "<strong>صوت طبيعي:</strong> استمع إلى ردود صوتية واضحة وطبيعية باللغة التي تختارها.",
            welcomeAboutFeat4: "<strong>واجهة بسيطة:</strong> تصميم يركز على سهولة الاستخدام والوصول السريع للميزات.",
            welcomeAboutDesc3: "<strong>هدفنا:</strong> جعل التفاعل الصوتي بسيطًا ومفيدًا ومتاحًا للجميع، مع احترام خصوصيتك.",
            gotItBtn: "فهمت",
            welcomePrivacyTitle: "سياسة الخصوصية",
            welcomePrivacyDesc1: "نحن في NeuroX نأخذ خصوصيتك على محمل الجد ونلتزم بحماية بياناتك الشخصية.",
            welcomePrivacyDesc2: "<strong>كيف نستخدم بياناتك:</strong>",
            welcomePrivacyPoint1: "تُستخدم مدخلاتك الصوتية والنصية <strong data-translate-key=\"onlyStrong\">فقط</strong> لمعالجة طلباتك وتوليد الردود المناسبة من خلال نماذج الذكاء الاصطناعي.", // Note: Strong tag has its own key now
            onlyStrong: "فقط", // Added key for the strong tag content
            welcomePrivacyPoint2: "قد نجمع بيانات استخدام مجهولة المصدر (مثل نوع الطلبات، مدة الاستجابة، حدوث أخطاء) لتحسين أداء التطبيق ودقة النماذج. هذه البيانات لا ترتبط بك شخصيًا.",
            welcomePrivacySecure1: "<strong>أمان البيانات:</strong> نستخدم تدابير أمنية قياسية لحماية بياناتك أثناء النقل والتخزين.",
            welcomePrivacyPoint3: "<strong>عدم المشاركة:</strong> لا نشارك بياناتك الصوتية أو النصية أو أي معلومات تعريف شخصية مع أطراف ثالثة لأغراض تجارية أو إعلانية دون موافقتك الصريحة.",
            welcomePrivacyControl1: "<strong>التحكم والشفافية:</strong> يمكنك مسح سجل محادثاتك المخزن محليًا في أي وقت من خلال إعدادات التطبيق.",
            welcomePrivacyDesc4: "نحن نستخدم واجهات برمجة تطبيقات (APIs) خارجية لمعالجة اللغة وتوليد الصوت. قد تخضع هذه الخدمات لسياسات الخصوصية الخاصة بها.",
            welcomePrivacyDesc3: "للمزيد من التفاصيل، يمكنك الاطلاع على سياسة الخصوصية الكاملة <a href=\"#\" class=\"footer-links\" data-translate-key=\"hereLink\">هنا</a>.", // Note: Key is on the <p>, <a> has its own key
            hereLink: "هنا", // Added key for the link text
            welcomeConfirmTitle: "تمت الموافقة",
            welcomeConfirmMsg: "هل ترغب برؤية رسائل التحديثات الرئيسية مستقبلًا؟",
            yesBtn: "نعم",
            noBtn: "لا",
            micPermissionTitle: "إذن الميكروفون مطلوب",
            micPermissionDesc: "يحتاج NeuroX إلى الوصول إلى الميكروفون الخاص بك للاستماع إلى أوامرك الصوتية. لن يتم تسجيل أي شيء إلا عند الضغط على زر الميكروفون.",
            allowBtn: "السماح",
            denyBtn: "رفض",
            settingsLabel: "الإعدادات",
            historyTitle: "السجل",
            closeLabel: "إغلاق",
            languageLabel: "اللغة",
            langAr: "العربية", // Added for buttons
            langEn: "English", // Added for buttons
            historyEmpty: "لا يوجد سجل حتى الآن.",
            clearHistoryLabel: "مسح السجل",
            clearHistoryBtn: "مسح السجل",
            clearHistoryConfirm: "هل أنت متأكد من رغبتك في مسح سجل المحادثات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.",
            openHistoryLabel: "فتح السجل",
            toggleThemeLabel: "تبديل السمة",
            statusTapToStart: "انقر للبدء",
            statusListening: "يستمع...",
            statusProcessing: "يعالج...",
            statusSpeaking: "يتحدث...",
            statusError: "حدث خطأ",
            voiceSelectLabel: "اختر نبرة الصوت:",
            micBtnStartLabel: "بدء الاستماع",
            micBtnStopLabel: "إيقاف الاستماع",
            outputPlaceholder: "المحادثة تظهر هنا...",
            infoCapabilitiesTitle: "القدرات الأساسية",
            infoCap1Title: "التعرف على الكلام",
            infoCap1Desc: "فهم دقيق لكلامك.",
            infoCap2Title: "فهم اللغة",
            infoCap2Desc: "تحليل المعنى والقصد.",
            infoCap3Title: "توليد الكلام",
            infoCap3Desc: "استجابات صوتية طبيعية.",
            infoCap4Title: "ذاكرة سياقية",
            infoCap4Desc: "تذكر المحادثات السابقة.",
            infoCap5Title: "خصوصية وأمان",
            infoCap5Desc: "حماية بياناتك أولويتنا.",
            privacyLink: "الخصوصية",
            termsLink: "الشروط",
            historyUserLabel: "أنت",
            historyAiLabel: "الذكاء الاصطناعي",
            historyErrorLabel: "خطأ",
             // Errors (more detailed)
             errorApiFailed: "عذرًا، لم يتمكن الخادم من معالجة الطلب.",
             errorApiDetails: "عذرًا، لم أتمكن من معالجة الطلب: ", // Appends details
             errorNoSpeech: "عذرًا، لم أسمع شيئًا. يرجى المحاولة مرة أخرى.",
             errorAudioPlayback: "عذرًا، حدثت مشكلة أثناء تشغيل الرد الصوتي.",
             errorMicNotAllowed: "تم رفض الوصول إلى الميكروفون. يرجى السماح بالوصول في إعدادات المتصفح لاستخدام الإدخال الصوتي.",
             errorRecognition: "عذرًا، حدث خطأ أثناء التعرف على الكلام.",
             errorNetwork: "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
             errorServer: "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقًا.",
             errorCanceled: "تم إلغاء إدخال الكلام.",
             errorMicNotSupported: "خاصية التعرف على الكلام (إدخال الميكروفون) غير مدعومة في هذا المتصفح.",
             errorAudioCapture: "خطأ في التقاط الصوت. تحقق من توصيل الميكروفون أو أذونات النظام.",
             errorFailedMicStart: "فشل بدء تشغيل الميكروفون. يرجى التأكد من توصيله والسماح بالوصول إليه.",
             errorIncompleteAudio: "تم استلام ملف صوتي فارغ أو غير مكتمل من الخادم.",
             errorUnexpectedResponse: "تم استلام تنسيق استجابة غير متوقع من الخادم.",
        }
    };

    // --- Helper Functions ---

    // Function to get translation safely
    const t = (key, lang = currentLanguage) => translations[lang]?.[key] ?? key; // Return key if not found

    const showModal = (overlayElement) => {
        if (!overlayElement) return;
        overlayElement.style.visibility = 'visible';
        requestAnimationFrame(() => { // Ensure element is visible before adding class for transition
            overlayElement.classList.add('visible');
        });
    };

    const hideModal = (overlayElement) => {
        if (!overlayElement) return;
        overlayElement.classList.remove('visible');
        // Use transitionend to set visibility hidden after fade out
        const handler = (event) => {
            if (event.target === overlayElement) {
                overlayElement.style.visibility = 'hidden';
                overlayElement.removeEventListener('transitionend', handler);
            }
        };
        overlayElement.addEventListener('transitionend', handler);
         // Fallback timeout in case transitionend doesn't fire
         setTimeout(() => {
             if (!overlayElement.classList.contains('visible')) {
                overlayElement.style.visibility = 'hidden';
             }
             overlayElement.removeEventListener('transitionend', handler);
         }, 400); // Slightly longer than CSS transition
    };

    const updateStatus = (textKey, showLoader = false, isError = false) => {
        if (statusText && loaderWrapper) {
            statusText.textContent = t(textKey);
            statusText.style.color = isError ? 'var(--system-red)' : 'var(--label-secondary)'; // Use CSS variables for color
            loaderWrapper.style.display = showLoader ? 'inline-block' : 'none';
        } else {
             console.warn("Status elements (text/loader) not found for update.");
        }
    };

    const addMessageToOutput = (type, text) => {
        if (!outputArea) {
            console.warn("Output area not found, cannot add message.");
            return;
        }
        // Remove placeholder if it exists
        if (placeholderText && outputArea.contains(placeholderText)) {
            try {
                 outputArea.removeChild(placeholderText);
                 placeholderText = null; // Mark as removed
            } catch (e) {
                // This might happen if element was already removed by another operation
                console.warn("Could not remove placeholder:", e);
                placeholderText = null;
            }
        }

        const messageElement = document.createElement('p');
        const iconElement = document.createElement('i');
        const textElement = document.createElement('span'); // Use span for text content

        messageElement.className = `${type}-text`; // e.g., user-text, ai-text, error-text

        switch (type) {
            case 'user':
                iconElement.className = 'fas fa-user icon'; // Added 'icon' class for potential styling
                textElement.textContent = text;
                break;
            case 'ai':
                iconElement.className = 'fas fa-robot icon';
                textElement.textContent = text;
                // Placeholder for AI response while audio plays
                if (text === '(...)') {
                     messageElement.classList.add('loading-response');
                     // We'll update this later when audio finishes or fails
                }
                break;
            case 'error':
                iconElement.className = 'fas fa-exclamation-triangle icon';
                textElement.textContent = `${t('historyErrorLabel')}: ${text}`;
                messageElement.classList.add('error-message'); // Add specific class for error styling
                break;
            default: // Info or other types
                iconElement.className = 'fas fa-info-circle icon';
                textElement.textContent = text;
        }

        messageElement.appendChild(iconElement);
        messageElement.appendChild(textElement);
        outputArea.appendChild(messageElement);
        // Scroll to the bottom
        outputArea.scrollTop = outputArea.scrollHeight;

        // Add to conversation history only for user/ai messages
        if ((type === 'user' || type === 'ai') && text !== '(...)') {
            const timestamp = new Date();
            conversationHistory.push({ type, text, timestamp });
            updateHistorySidebar();
            saveHistory();
        }
    };

    const playResponseAudio = (audioBlob) => {
        if (!responseAudio) {
            handleError('errorAudioPlayback', '(Audio element missing)');
            return;
        }
        let audioUrl = null; // Keep track of the URL to revoke it

        try {
            audioUrl = URL.createObjectURL(audioBlob);
            responseAudio.src = audioUrl;

            // Find the loading placeholder message to update it later
            const loadingMessage = outputArea?.querySelector('.ai-text.loading-response span');

            responseAudio.play()
                .then(() => {
                     console.log("Audio playback started.");
                     updateStatus('statusSpeaking');
                     if (micButton) micButton.disabled = true; // Disable mic while AI speaks
                })
                .catch(e => {
                    console.error("Audio playback failed:", e);
                    handleError('errorAudioPlayback');
                    if (audioUrl) URL.revokeObjectURL(audioUrl); // Clean up URL
                    if (loadingMessage) loadingMessage.textContent = `[${t('errorAudioPlayback')}]`;
                    if (micButton) micButton.disabled = false; // Re-enable mic
                });

            responseAudio.onended = () => {
                console.log("Audio playback finished.");
                updateStatus('statusTapToStart');
                if (micButton) micButton.disabled = false; // Re-enable mic after AI finishes
                if (audioUrl) URL.revokeObjectURL(audioUrl); // Clean up URL

                // Replace (...) with actual text IF we get text back from API in future
                // For now, just remove the loading class
                const finishedMessage = outputArea?.querySelector('.ai-text.loading-response');
                if (finishedMessage) {
                    finishedMessage.classList.remove('loading-response');
                    // If we had text content: finishedMessage.querySelector('span').textContent = actualAiText;
                }
                // Find the corresponding history entry and update text if needed (currently not possible as API only returns audio)
                // const lastAiIndex = conversationHistory.map(i => i.type).lastIndexOf('ai');
                // if (lastAiIndex > -1 && conversationHistory[lastAiIndex].text === '(...)') {
                //     // conversationHistory[lastAiIndex].text = actualAiText;
                //     // saveHistory();
                //     // updateHistorySidebar();
                // }

            };

            responseAudio.onerror = (e) => {
                console.error("Audio playback error event:", e);
                // Avoid duplicate error messages if already handled
                if (statusText?.textContent !== t('statusError')) {
                     handleError('errorAudioPlayback');
                }
                if (audioUrl) URL.revokeObjectURL(audioUrl); // Clean up URL
                 if (statusText?.textContent === t('statusSpeaking')) {
                     updateStatus('statusTapToStart'); // Reset status if it was speaking
                 }
                 if (micButton) micButton.disabled = false; // Re-enable mic
                 if (loadingMessage) loadingMessage.textContent = `[${t('errorAudioPlayback')}]`;
                 const errorMsgElement = outputArea?.querySelector('.ai-text.loading-response');
                 if (errorMsgElement) errorMsgElement.classList.remove('loading-response');
            };
        } catch (error) {
            console.error("Error setting up audio playback:", error);
            handleError('errorAudioPlayback');
            if (audioUrl) URL.revokeObjectURL(audioUrl); // Clean up
             if (micButton) micButton.disabled = false; // Re-enable mic
        }
    };

    const handleError = (errorKey, details = '') => {
        console.error(`Error Key: ${errorKey}, Details: ${details}`);
        const errorMsg = details ? `${t(errorKey)}${details}` : t(errorKey);
        addMessageToOutput('error', errorMsg); // Display in chat
        updateStatus('statusError', false, true); // Update status bar

        // Reset recording state
        isRecording = false;
        if (micButton) {
            micButton.classList.remove('listening');
            micButton.disabled = false; // Ensure mic is usable again
            if (micIcon) micIcon.className = 'fas fa-microphone';
            micButton.setAttribute('aria-label', t('micBtnStartLabel'));
        }
        // Abort any ongoing recognition safely
        if (recognition?.abort) {
            try { recognition.abort(); } catch (e) { console.warn("Minor error aborting recognition:", e); }
        }
        // Stop any ongoing audio playback
        if (responseAudio && !responseAudio.paused) {
            responseAudio.pause();
            responseAudio.src = ''; // Clear source
        }
        clearTimeout(silenceTimer); // Clear any pending silence timeout
    };

    // --- Speech Recognition Setup ---
    const setupSpeechRecognition = () => {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!('SpeechRecognition' in window)) {
            console.error("Speech Recognition API not supported by this browser.");
            // Optionally disable mic button permanently here or show a persistent error message
            if (micButton) {
                micButton.disabled = true;
                micButton.style.opacity = '0.5';
                micButton.style.cursor = 'not-allowed';
                micButton.setAttribute('aria-label', t('errorMicNotSupported'));
                micButton.title = t('errorMicNotSupported');
            }
            updateStatus('errorMicNotSupported', false, true);
            return null; // Indicate failure
        }

        try {
            const recognizer = new SpeechRecognition();
            recognizer.continuous = false; // Stop after first pause/result
            recognizer.interimResults = true; // Get results while speaking
            recognizer.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US'; // Set initial language

            recognizer.onstart = () => {
                console.log('Speech recognition started.');
                isRecording = true;
                finalTranscript = ''; // Reset transcripts
                interimTranscript = '';
                if (micButton) {
                    micButton.classList.add('listening');
                    micButton.setAttribute('aria-label', t('micBtnStopLabel'));
                    if (micIcon) micIcon.className = 'fas fa-stop';
                }
                updateStatus('statusListening');
                clearTimeout(silenceTimer); // Clear previous timer
                // Start a silence timer - if no result/speech for a while, stop automatically
                silenceTimer = setTimeout(() => {
                    if (isRecording) {
                         console.log("Silence detected (long timeout), stopping recognition.");
                         stopRecognition();
                         // Maybe trigger no-speech error if nothing was captured at all
                         if (!finalTranscript && !interimTranscript) {
                            handleError('errorNoSpeech');
                         }
                    }
                }, SILENCE_TIMEOUT * 2); // Longer timeout
            };

            recognizer.onresult = (event) => {
                clearTimeout(silenceTimer); // Reset silence timer on activity
                interimTranscript = ''; // Reset interim for this event

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPart + ' '; // Add space between final parts
                    } else {
                        interimTranscript += transcriptPart;
                    }
                }

                // Display interim results (optional, can be noisy)
                // if (interimTranscript) { console.log("Interim:", interimTranscript); }

                // If the last result is final, process it
                 if (event.results[event.results.length - 1].isFinal) {
                     const resultToSend = finalTranscript.trim();
                     console.log('Final transcript received:', resultToSend);
                     // Don't stop recognition here, let onend handle it naturally
                     // or stop it explicitly if continuous=true was needed
                     if (resultToSend) {
                         // Check if this exact message was already added (prevents duplicates from rapid events)
                         const lastHistory = conversationHistory[conversationHistory.length - 1];
                         if (!lastHistory || !(lastHistory.type === 'user' && lastHistory.text === resultToSend)) {
                            addMessageToOutput('user', resultToSend);
                         }
                         sendTextToServer(resultToSend);
                         // No need to stopRecognition() here if continuous=false, it stops automatically
                     } else {
                         // Handle cases where final result is empty (rare but possible)
                         if (!interimTranscript) { // Only error if interim was also empty
                            handleError('errorNoSpeech');
                         }
                     }
                     // No need to call stopRecognition here if continuous is false
                 } else {
                     // Restart silence timer if still listening for interim results
                     silenceTimer = setTimeout(() => {
                        if (isRecording) {
                            console.log("Silence detected (interim timeout), stopping recognition.");
                            stopRecognition(); // Force stop after pause
                            // Process whatever transcript we have (final or interim)
                            const resultToSend = finalTranscript.trim() || interimTranscript.trim();
                            if (resultToSend) {
                                const lastHistory = conversationHistory[conversationHistory.length - 1];
                                if (!lastHistory || !(lastHistory.type === 'user' && lastHistory.text === resultToSend)) {
                                     addMessageToOutput('user', resultToSend);
                                }
                                sendTextToServer(resultToSend);
                            } else {
                                handleError('errorNoSpeech');
                            }
                        }
                     }, SILENCE_TIMEOUT);
                 }
            };

            recognizer.onerror = (event) => {
                console.error('Speech recognition error:', event.error, event.message);
                clearTimeout(silenceTimer); // Stop timer on error
                const currentStatus = statusText?.textContent;

                // Ignore 'aborted' if we already processed a result (handled by onend)
                if (event.error === 'aborted' && (finalTranscript.trim() || interimTranscript.trim())) {
                     console.log("Recognition aborted by user/silence after results - normal.");
                     // Let onend handle the UI state reset
                     return;
                 }
                 // Ignore 'no-speech' if it was triggered by silence timer and we already processed interim
                 if (event.error === 'no-speech' && (finalTranscript.trim() || interimTranscript.trim())) {
                     console.log("Recognition ended with 'no-speech' after results - likely silence timeout.");
                      // Let onend handle the UI state reset
                      return;
                 }

                 // Handle specific errors
                let errorKey = 'errorRecognition'; // Default
                switch (event.error) {
                    case 'no-speech':
                        errorKey = 'errorNoSpeech';
                        break;
                    case 'audio-capture':
                        errorKey = 'errorAudioCapture';
                        break;
                    case 'not-allowed':
                        errorKey = 'errorMicNotAllowed';
                        // Show mic permission modal again? Or just the error?
                        // showModal(micPermissionModalOverlay);
                        break;
                    case 'network':
                        errorKey = 'errorNetwork';
                        break;
                    case 'aborted':
                         // Aborted likely by user clicking stop or silence timeout before any results
                         console.log("Recognition aborted (likely by user/silence), no significant results captured yet.");
                         // Don't show a big error, just reset the state if needed
                         if (currentStatus !== t('statusProcessing') && currentStatus !== t('statusSpeaking') && currentStatus !== t('statusError')) {
                             updateStatus('statusTapToStart');
                         }
                         isRecording = false; // Ensure state is reset
                         // No return here, let onend handle UI reset
                         break; // Don't call handleError for user-aborted actions without results
                    case 'service-not-allowed': // Another potential permission error
                         errorKey = 'errorMicNotAllowed';
                         break;
                    case 'bad-grammar': // If grammar rules were used (not common here)
                    case 'language-not-supported':
                        errorKey = 'errorRecognition'; // Generic is fine
                        break;
                    default:
                        errorKey = 'errorRecognition';
                }

                // Call handleError only for actual errors, not simple aborts without results
                 if (errorKey && event.error !== 'aborted') {
                    handleError(errorKey);
                 } else {
                     // Ensure state is reset even if not showing error message
                     isRecording = false;
                 }

                // Let onend handle UI cleanup like button state
            };

            recognizer.onend = () => {
                console.log('Speech recognition ended.');
                clearTimeout(silenceTimer); // Clear timer definitively
                const wasRecordingState = isRecording; // Capture state before resetting
                isRecording = false; // Reset state

                // Reset button and status *unless* we are processing or speaking
                const currentStatus = statusText?.textContent;
                if (currentStatus !== t('statusProcessing') && currentStatus !== t('statusSpeaking') && currentStatus !== t('statusError')) {
                    if (micButton) {
                        micButton.classList.remove('listening');
                        micButton.disabled = false;
                        if (micIcon) micIcon.className = 'fas fa-microphone';
                        micButton.setAttribute('aria-label', t('micBtnStartLabel'));
                    }
                    updateStatus('statusTapToStart');
                } else {
                    // Still processing/speaking, just ensure button icon/label is reset
                     if (micButton) {
                        micButton.classList.remove('listening');
                         // Keep disabled if processing/speaking
                         micButton.disabled = (currentStatus === t('statusProcessing') || currentStatus === t('statusSpeaking'));
                        if (micIcon) micIcon.className = 'fas fa-microphone';
                        micButton.setAttribute('aria-label', t('micBtnStartLabel'));
                    }
                }

                 // Process transcript if recognition ended unexpectedly *while* recording and we have something
                 const transcriptToProcess = finalTranscript.trim() || interimTranscript.trim();
                 if (wasRecordingState && transcriptToProcess && currentStatus === t('statusListening')) {
                     console.warn("Recognition ended unexpectedly (e.g., network issue?) while listening with results. Processing transcript:", transcriptToProcess);
                     const lastHistory = conversationHistory[conversationHistory.length - 1];
                     if (!lastHistory || !(lastHistory.type === 'user' && lastHistory.text === transcriptToProcess)) {
                          addMessageToOutput('user', transcriptToProcess);
                     }
                     sendTextToServer(transcriptToProcess);
                 }
                 // If it ended while recording but *no* transcript, and no specific error was caught,
                 // it might warrant a generic error or just reset. Let's assume specific errors cover this.
            };

            return recognizer;
        } catch (e) {
            console.error("Error creating SpeechRecognition instance:", e);
            if (micButton) { // Disable mic if setup failed
                micButton.disabled = true;
                micButton.style.opacity = '0.5';
                micButton.style.cursor = 'not-allowed';
            }
            handleError("errorMicNotSupported", `(Instance creation failed: ${e.message})`);
            return null;
        }
    };

    // Function to explicitly stop recognition
    const stopRecognition = () => {
        if (recognition && isRecording) {
            console.log("Attempting to stop recognition...");
            try {
                recognition.stop(); // This will trigger the 'onend' event
                // State (isRecording, button) will be reset in onend
            } catch (e) {
                // This might happen if recognition already stopped
                console.warn("Minor error stopping recognition (might be already stopped):", e);
                // Manually reset state just in case onend doesn't fire
                isRecording = false;
                if (micButton) {
                     micButton.classList.remove('listening');
                     micButton.disabled = false; // Ensure it's enabled
                     if (micIcon) micIcon.className = 'fas fa-microphone';
                     micButton.setAttribute('aria-label', t('micBtnStartLabel'));
                }
                 // Reset status only if it was 'Listening'
                 if (statusText?.textContent === t('statusListening')) {
                     updateStatus('statusTapToStart');
                 }
            }
        }
        clearTimeout(silenceTimer); // Always clear timer when stopping
    };

    // --- API Interaction ---
    const sendTextToServer = async (text) => {
        if (!text || text.trim().length === 0) {
             console.warn("sendTextToServer called with empty text.");
             updateStatus('statusTapToStart'); // Reset status
             if (micButton) micButton.disabled = false; // Re-enable mic
             return;
        }
        updateStatus('statusProcessing', true); // Show loader
        if (micButton) micButton.disabled = true; // Disable mic during processing

        const selectedVoiceId = voiceSelect ? voiceSelect.value : "21m00Tcm4TlvDq8ikWAM"; // Get selected voice or default
        console.log(`Sending text "${text.substring(0,50)}..." | Lang: ${currentLanguage} | Voice: ${selectedVoiceId}`);

        // Add placeholder AI message
        addMessageToOutput('ai', '(...)');


        try {
            const response = await fetch('/api/generate-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg, application/json' // Accept audio or JSON error
                },
                body: JSON.stringify({
                    text: text,
                    language: currentLanguage,
                    voiceId: selectedVoiceId // Send the selected voice ID
                }),
            });

            const contentType = response.headers.get("content-type");

            if (!response.ok) {
                let errorData = { error: `HTTP error! Status: ${response.status}`, details: '' };
                 let responseText = ''; // Store raw response text for logging
                try {
                     responseText = await response.text(); // Get raw text first
                    if (contentType && contentType.includes("application/json")) {
                       const jsonError = JSON.parse(responseText); // Try parsing as JSON
                       errorData.details = jsonError.error?.message || jsonError.error || jsonError.details || responseText; // Extract detail
                    } else {
                       errorData.details = responseText.substring(0, 200); // Use raw text if not JSON
                    }
                } catch (parseError) {
                     console.warn("Error parsing error response, using raw text:", parseError);
                     errorData.details = responseText.substring(0, 200) || "(Could not read error response body)";
                }
                console.error("API Error Response:", response.status, errorData);
                handleError('errorApiDetails', errorData.details || errorData.error);

                // Update the placeholder message with the error
                const loadingMessage = outputArea?.querySelector('.ai-text.loading-response span');
                if (loadingMessage) loadingMessage.textContent = `[${t('errorApiFailed')}]`;
                const errorMsgElement = outputArea?.querySelector('.ai-text.loading-response');
                if (errorMsgElement) errorMsgElement.classList.remove('loading-response');

                return; // Stop processing on error
            }

            // --- Success Path ---
            if (contentType && contentType.includes('audio/mpeg')) {
                const audioBlob = await response.blob();
                console.log("Audio blob received, size:", audioBlob.size);
                if (audioBlob.size < 500) { // Check for suspiciously small file size
                    console.warn("Received very small audio blob - potential issue.");
                    handleError("errorIncompleteAudio");
                    // Update placeholder
                    const loadingMessage = outputArea?.querySelector('.ai-text.loading-response span');
                    if (loadingMessage) loadingMessage.textContent = `[${t('errorIncompleteAudio')}]`;
                    const errorMsgElement = outputArea?.querySelector('.ai-text.loading-response');
                    if (errorMsgElement) errorMsgElement.classList.remove('loading-response');
                    return;
                }
                // Play the audio (will update status and button state internally)
                playResponseAudio(audioBlob);
                // The (...) message will be updated/handled by playResponseAudio's onended/onerror

            } else {
                 // Unexpected success response type (e.g., got HTML or plain text back)
                 const respText = await response.text();
                 console.error("Unexpected success response type:", contentType, "\nBody:", respText.substring(0, 200));
                 handleError("errorUnexpectedResponse");
                 // Update placeholder
                 const loadingMessage = outputArea?.querySelector('.ai-text.loading-response span');
                 if (loadingMessage) loadingMessage.textContent = `[${t('errorUnexpectedResponse')}]`;
                 const errorMsgElement = outputArea?.querySelector('.ai-text.loading-response');
                 if (errorMsgElement) errorMsgElement.classList.remove('loading-response');
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
            if (error.name === 'AbortError') {
                console.log('Fetch aborted.');
                 // Reset status only if it was processing
                 if (statusText?.textContent === t('statusProcessing')) {
                     updateStatus('statusTapToStart');
                     if (micButton) micButton.disabled = false;
                 }
            } else {
                handleError('errorNetwork'); // Handle network errors
            }
            // Update placeholder message on network error
            const loadingMessage = outputArea?.querySelector('.ai-text.loading-response span');
            if (loadingMessage) loadingMessage.textContent = `[${t('errorNetwork')}]`;
            const errorMsgElement = outputArea?.querySelector('.ai-text.loading-response');
            if (errorMsgElement) errorMsgElement.classList.remove('loading-response');

        } finally {
             // Ensure button is enabled if we are not speaking or processing anymore
             // This check might be redundant due to onended/onerror handlers but acts as a safety net
             if (responseAudio?.paused && micButton?.disabled) {
                 const currentStatus = statusText?.textContent;
                 if (currentStatus !== t('statusSpeaking') && currentStatus !== t('statusProcessing') && currentStatus !== t('statusError')) {
                    micButton.disabled = false;
                    updateStatus('statusTapToStart');
                 } else if (currentStatus === t('statusError')) {
                      micButton.disabled = false; // Also enable on error
                 }
             }
        }
    };

    // --- History Management ---
    const updateHistorySidebar = () => {
        if (!historyList) return;
        historyList.innerHTML = ''; // Clear previous items

        if (conversationHistory.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'history-empty';
            emptyLi.textContent = t('historyEmpty');
            emptyLi.setAttribute('data-translate-key', 'historyEmpty'); // Keep key for re-translation
            historyList.appendChild(emptyLi);
            if (clearHistoryBtn) clearHistoryBtn.disabled = true; // Disable clear button
        } else {
            conversationHistory.forEach(item => {
                // Basic validation of history item structure
                 if (!item || typeof item !== 'object' || !item.type || !item.text || !(item.timestamp instanceof Date) || isNaN(item.timestamp.getTime())) {
                     console.warn("Skipping invalid history item:", item);
                     return; // Skip malformed items
                 }

                const li = document.createElement('li');
                li.className = 'history-item';

                const typeSpan = document.createElement('span');
                typeSpan.className = 'history-item-type';
                typeSpan.textContent = item.type === 'user' ? t('historyUserLabel') : t('historyAiLabel');
                // Add color/style based on type
                typeSpan.style.color = item.type === 'user' ? 'var(--system-blue)' : 'var(--system-indigo)';

                const textSpan = document.createElement('span');
                textSpan.className = 'history-item-text';
                textSpan.textContent = item.text.length > 50 ? item.text.substring(0, 47) + '...' : item.text; // Truncate long text

                const timeStampSpan = document.createElement('span');
                timeStampSpan.className = 'history-timestamp';
                 try {
                     // Format time based on current language locale
                     timeStampSpan.textContent = item.timestamp.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                 } catch (e) {
                     console.warn("Error formatting timestamp:", item.timestamp, e);
                     timeStampSpan.textContent = "??:??"; // Fallback for invalid date
                 }

                li.appendChild(typeSpan);
                li.appendChild(textSpan);
                li.appendChild(timeStampSpan);
                historyList.appendChild(li);
            });
            if (clearHistoryBtn) clearHistoryBtn.disabled = false; // Enable clear button
        }
    };

    const saveHistory = () => {
        try {
            // Filter out any potentially invalid items before saving
            const validHistory = conversationHistory.filter(item =>
                 item && item.type && typeof item.text === 'string' && item.timestamp instanceof Date && !isNaN(item.timestamp.getTime())
            );
            localStorage.setItem('neuroxHistory', JSON.stringify(validHistory));
        } catch (e) {
            console.error("Failed to save history to localStorage:", e);
            // Handle potential storage errors (e.g., quota exceeded)
        }
    };

    const loadHistory = () => {
        try {
            const savedHistory = localStorage.getItem('neuroxHistory');
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                // Validate and convert timestamps back to Date objects
                conversationHistory = parsedHistory
                    .map(item => ({
                        ...item,
                        // Ensure timestamp is parsed correctly
                        timestamp: item.timestamp ? new Date(item.timestamp) : null
                    }))
                    .filter(item => // Add robust validation during load
                         item && typeof item.type === 'string' && typeof item.text === 'string' &&
                         item.timestamp instanceof Date && !isNaN(item.timestamp.getTime())
                     );
            } else {
                conversationHistory = []; // Initialize empty if nothing saved
            }
        } catch (e) {
            console.error("Failed to load or parse history from localStorage:", e);
            conversationHistory = []; // Reset on error
            // Optionally clear corrupted storage item
            try { localStorage.removeItem('neuroxHistory'); } catch (removeError) { /* ignore */ }
        } finally {
            updateHistorySidebar(); // Update UI regardless of load success/failure
            // Populate main output area from loaded history
            if (outputArea) {
                 outputArea.innerHTML = ''; // Clear existing content first
                 if (conversationHistory.length > 0) {
                    conversationHistory.forEach(item => addMessageToOutput(item.type, item.text)); // Add history to main view
                 } else {
                    // Re-add placeholder if history is empty
                    const p = document.createElement('p');
                    p.className = 'placeholder';
                    p.textContent = t('outputPlaceholder');
                    p.setAttribute('data-translate-key', 'outputPlaceholder');
                    outputArea.appendChild(p);
                    placeholderText = p; // Update reference
                 }
            }
        }
    };

    const clearHistory = () => {
        conversationHistory = [];
        saveHistory(); // Save the empty history
        updateHistorySidebar(); // Update the sidebar view

        // Clear the main output area and add placeholder
        if (outputArea) {
            outputArea.innerHTML = ''; // Clear all messages
            const p = document.createElement('p');
            p.className = 'placeholder';
            p.textContent = t('outputPlaceholder');
            p.setAttribute('data-translate-key', 'outputPlaceholder');
            outputArea.appendChild(p);
            placeholderText = p; // Reset placeholder reference
        }
        console.log("Conversation history cleared.");
    };

    // --- Theme Management ---
    const applyTheme = (theme) => {
        if (!body || !themeToggleIcon || !htmlElement) return; // Ensure elements exist
        const oldTheme = theme === 'dark' ? 'light' : 'dark';
        body.classList.remove(oldTheme + '-theme');
        body.classList.add(theme + '-theme');
        // Update icon based on the *new* theme
        themeToggleIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        // Set data attribute for potential CSS targeting
        htmlElement.setAttribute('data-color-scheme', theme);
        currentTheme = theme; // Update state variable
        try {
            localStorage.setItem('neuroxTheme', theme);
        } catch (e) {
            console.error("Failed to save theme preference:", e);
        }
         console.log(`Theme applied: ${theme}`);
    };

    const toggleTheme = () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };

    const loadTheme = () => {
        let savedTheme = null;
        try { savedTheme = localStorage.getItem('neuroxTheme'); }
        catch(e) { console.error("LS Error getting theme:", e); }

        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            applyTheme(savedTheme);
        } else {
            // Check system preference if no theme is saved
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
        }
    };

    // --- Language Management ---
    const applyLanguage = (lang) => {
        if (!translations[lang] || !htmlElement) return; // Ensure language exists

        console.log(`Applying language: ${lang}`);
        currentLanguage = lang;
        htmlElement.lang = lang;
        htmlElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update all elements with data-translate-key
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            const translation = t(key, lang); // Get translation for the target language

             // --- FIX: Refined Translation Application Logic ---

             // 1. Handle specific attributes first
            if (el.matches('title') && key === 'appTitle') {
                document.title = translation;
            } else if (el.placeholder && key.endsWith('Placeholder')) {
                 el.placeholder = translation;
             } else if (el.hasAttribute('title') && (key.endsWith('Label') || key === 'clearHistoryLabel')) { // Use hasAttribute for robustness
                 el.title = translation;
             } else if (el.hasAttribute('aria-label') && key.endsWith('Label')) { // Use hasAttribute
                 el.setAttribute('aria-label', translation);

             // 2. Handle specific element types known to contain only text
             } else if (el.matches('#status-text') || el.matches('.history-empty') || el.matches('label[for="voice-select"]')) {
                 el.textContent = translation;
             } else if (el.matches('#clear-history-btn > span') && key === 'clearHistoryBtn') { // Specific span in button
                 el.textContent = translation;
             } else if (el.matches('.language-btn') && (key === 'langAr' || key === 'langEn')) { // Language buttons
                 el.textContent = translation;
             } else if (el.matches('.modal-button') && el.children.length === 0 && el.textContent.trim()) { // Simple modal buttons (text only)
                  el.textContent = translation;

             // 3. Handle elements that *might* contain HTML (like list items or paragraphs in modals)
             // Use innerHTML *only* if the translation string contains HTML tags.
             // This relies on the translations object being correctly structured.
            } else if (el.matches('li') || el.matches('p') || el.matches('h2') || el.matches('h3') || el.matches('h4') || el.matches('strong') || el.matches('a')) {
                 if (translation.includes('<') && translation.includes('>')) {
                     // Warning: Using innerHTML can be risky if translations aren't trusted.
                     // Ensure translations with HTML are sanitized or come from a safe source.
                     el.innerHTML = translation;
                 } else {
                     // If translation is plain text, check if element ONLY contains text nodes
                     // or if it contains other elements we should preserve.
                     // Safest bet for elements that MIGHT have children (like <li> with <strong>):
                     // Only update if it DOESN'T have element children.
                     if (el.children.length === 0) {
                         el.textContent = translation;
                     } else {
                         // If it has children (e.g., the <li> containing <strong>),
                         // find the first direct text node child and update it.
                         // This is a heuristic and might not cover all cases perfectly.
                         let textNodeUpdated = false;
                         for(let i = 0; i < el.childNodes.length; i++) {
                             if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].textContent.trim()) {
                                 el.childNodes[i].textContent = translation; // Replace first non-empty text node
                                 textNodeUpdated = true;
                                 break;
                             }
                         }
                         if (!textNodeUpdated) {
                             console.warn(`Translation skipped for complex element key '${key}' to avoid overwriting children. Consider restructuring HTML or translation string. Element:`, el);
                         }
                     }
                 }
             } else {
                 // Log elements that weren't specifically handled, if any
                 // console.log(`Element with key '${key}' not explicitly handled by translation logic:`, el.tagName);
                 // Default fallback (less safe):
                 // if (el.children.length === 0) {
                 //     el.textContent = translation;
                 // }
             }
        });

        // Update UI elements dependent on language (e.g., active button, recognition lang)
        if (recognition) {
            try {
                 recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
                 console.log(`Recognition language set to: ${recognition.lang}`);
            } catch(e) { console.warn("Could not set recognition language dynamically", e); }
        }

        if (langArBtn) langArBtn.classList.toggle('active', lang === 'ar');
        if (langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');

        // Re-render history sidebar with new language labels
        updateHistorySidebar();

        // Update placeholder text if it's currently displayed
        if (placeholderText && outputArea?.contains(placeholderText)) {
            placeholderText.textContent = t('outputPlaceholder', lang);
        }

        // Save preference
        try {
            localStorage.setItem('neuroxLanguage', lang);
        } catch (e) {
            console.error("Failed to save language preference:", e);
        }
    };


    const loadLanguage = () => {
        let savedLang = null;
        try { savedLang = localStorage.getItem('neuroxLanguage'); }
        catch(e) { console.error("LS Error getting language:", e); }

        // Validate saved language against available translations
        const langToLoad = (savedLang && translations[savedLang]) ? savedLang : 'ar'; // Default to 'ar' if invalid/missing
        applyLanguage(langToLoad);
    };

    // --- Voice Preference Management ---
    const loadVoicePreference = () => {
        if (!voiceSelect) {
             console.warn("Voice select dropdown not found. Cannot load preference.");
             return;
        }
        try {
            const savedVoice = localStorage.getItem('neuroxSelectedVoice');
            // Check if the saved voice ID exists as an option in the dropdown
            if (savedVoice && voiceSelect.querySelector(`option[value="${savedVoice}"]`)) {
                voiceSelect.value = savedVoice; // Set dropdown to saved value
                console.log("Loaded saved voice preference:", savedVoice);
            } else {
                 // If no preference saved or saved voice is invalid, use the first option as default
                 if (voiceSelect.options.length > 0) {
                    voiceSelect.selectedIndex = 0; // Select the first option
                    console.log("No valid saved voice preference found. Using default:", voiceSelect.value);
                    // Optionally save the default now
                    // saveVoicePreference(voiceSelect.value);
                 } else {
                     console.warn("Voice select dropdown has no options.");
                 }
            }
        } catch (e) {
            console.error("Failed to load voice preference from localStorage:", e);
             // Fallback to default if error occurs
             if (voiceSelect.options.length > 0) {
                 voiceSelect.selectedIndex = 0;
             }
        }
    };

    const saveVoicePreference = (voiceId) => {
        if (!voiceId) return; // Don't save empty values
        try {
            localStorage.setItem('neuroxSelectedVoice', voiceId);
             console.log("Saved voice preference:", voiceId);
        } catch (e) {
            console.error("Failed to save voice preference to localStorage:", e);
        }
    };


     // --- Welcome Modal Logic ---
    const showWelcomeModalIfNeeded = () => {
        if (!welcomeModalOverlay || !welcomeModalContent) {
             console.warn("Welcome modal elements not found.");
             return;
         }

        let dontShowWelcome = null;
        let lastShownVersion = null;
        const currentAppVersion = '1.1'; // Increment this for new updates

        try {
            dontShowWelcome = localStorage.getItem('neuroxDontShowWelcome');
            lastShownVersion = localStorage.getItem('neuroxUpdateVersion');
        } catch (e) { console.error("LS Error getting welcome modal state:", e); }

        // Show if 'don't show' is not true OR if the app version has changed
        if (dontShowWelcome !== 'true' || lastShownVersion !== currentAppVersion) {
             console.log("Showing Welcome Modal. Reason:", dontShowWelcome !== 'true' ? "First time or 'show again' selected" : `Version changed (saved: ${lastShownVersion}, current: ${currentAppVersion})`);
             // Ensure first tab is active and visible
             if (modalTabButtons && modalTabPanels) {
                 modalTabButtons.forEach((btn, index) => btn.classList.toggle('active', index === 0));
                 modalTabPanels.forEach((panel, index) => {
                     panel.classList.toggle('visible', index === 0);
                     panel.classList.toggle('hidden', index !== 0);
                 });
                 // Make sure tab content scrolls independently if needed (CSS should handle this)
             }
             // Reset to step 1 view initially
             const headerTabs = welcomeModalContent.querySelector('.modal-header-tabs');
             const contentContainer = welcomeModalContent.querySelector('.modal-tab-content-container');
             if (headerTabs) headerTabs.style.display = ''; // Show tabs
             if (contentContainer) contentContainer.style.display = ''; // Show tab panels container
             if (modalStep2) modalStep2.style.display = 'none'; // Hide step 2

             showModal(welcomeModalOverlay);
        } else {
            console.log("Welcome modal skipped (Already seen this version and 'don't show again' is set).");
        }
    };

    const handleWelcomeTabSwitch = (event) => {
        const targetTab = event.target.closest('.modal-tab-btn');
        if (!targetTab || !welcomeModalContent || !modalTabButtons || !modalTabPanels) return;

        const tabId = targetTab.dataset.tab;
        if (!tabId || targetTab.classList.contains('active')) return; // Do nothing if already active

        console.log(`Switching welcome modal tab to: ${tabId}`);

        // Update button states
        modalTabButtons.forEach(btn => btn.classList.remove('active'));
        targetTab.classList.add('active');

        // Update panel visibility
        modalTabPanels.forEach(panel => {
            panel.classList.remove('visible');
            panel.classList.add('hidden');
        });
        const targetPanel = welcomeModalContent.querySelector(`#modal-tab-${tabId}`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            targetPanel.classList.add('visible');
        } else {
             console.warn(`Welcome modal panel not found for tab: ${tabId}`);
        }
    };

    // --- Microphone Permission Flow ---
    const checkOrRequestMicrophonePermission = async (promptUserIfNeeded = false) => {
        console.log(`Checking mic permission. Prompt allowed: ${promptUserIfNeeded}`);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia not supported.");
            return 'unsupported'; // Browser doesn't support API
        }

        // 1. Try Permissions API first (more efficient)
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                console.log("Mic permission state via Permissions API:", permissionStatus.state); // 'granted', 'prompt', 'denied'

                if (permissionStatus.state === 'granted') {
                    return 'granted';
                } else if (permissionStatus.state === 'prompt' && promptUserIfNeeded) {
                     // Need to trigger actual getUserMedia to show browser prompt
                     console.log("Permission state is 'prompt'. Triggering getUserMedia...");
                     try {
                         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                         stream.getTracks().forEach(track => track.stop()); // Stop stream immediately after getting permission
                         console.log("Permission granted via getUserMedia prompt.");
                         return 'granted';
                     } catch (err) {
                         console.warn("getUserMedia failed after 'prompt' state:", err.name, err.message);
                         if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                             return 'denied'; // User denied the browser prompt
                         } else {
                              return 'error'; // Other error during prompt
                         }
                     }
                 } else {
                     // State is 'denied' or 'prompt' but we shouldn't prompt now
                     return permissionStatus.state; // 'denied' or 'prompt'
                 }
            } catch (queryError) {
                 console.warn("Permissions API query failed. Falling back to getUserMedia check.", queryError);
                 // Fall through to getUserMedia check
            }
        }

        // 2. Fallback: Try getUserMedia directly (will prompt if needed and promptUserIfNeeded is true)
        if (promptUserIfNeeded) {
             console.log("Permissions API unavailable or failed. Attempting getUserMedia directly...");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                console.log("getUserMedia check successful (permission likely granted or obtained).");
                return 'granted';
            } catch (err) {
                console.warn("Direct getUserMedia check/request failed:", err.name, err.message);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    return 'denied';
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'){
                    return 'no-device'; // Specific error for missing mic
                } else {
                     return 'error'; // Other errors (TypeError, AbortError, etc.)
                }
            }
        } else {
            // If not prompting, we can't determine state without Permissions API
            console.log("Cannot determine permission state without Permissions API or prompting.");
            return 'unknown'; // Or potentially assume 'prompt' if no API available
        }
    };


    const startRecordingFlow = async () => {
        if (!recognition) {
             handleError("errorMicNotSupported", "(Cannot start flow)");
             return;
         }
        if (isRecording) {
             console.warn("Already recording, flow shouldn't start.");
             stopRecognition(); // Stop existing recording if button clicked again
             return;
        }
        if (micButton) micButton.disabled = true; // Disable button while checking/prompting
        console.log("Starting recording flow...");

        // Check permission status, prompting the user if necessary
        const permissionStatus = await checkOrRequestMicrophonePermission(true);

        switch (permissionStatus) {
            case 'granted':
                console.log("Permission already granted or obtained. Starting recognition.");
                startRecognitionActual(); // Start the actual recognition process
                if (micButton) micButton.disabled = false; // Re-enable now ready
                hideModal(micPermissionModalOverlay); // Hide modal if it was open
                break;
            case 'prompt':
                // This case might occur if Permissions API said prompt, but getUserMedia wasn't triggered,
                // or if the custom modal should be shown first.
                console.log("Permission requires prompt (or custom modal needed).");
                // Show our custom modal to explain *why* we need permission
                showModal(micPermissionModalOverlay);
                // Keep button disabled until user interacts with the *custom* modal
                break;
            case 'denied':
                console.warn("Microphone permission denied by user.");
                handleError('errorMicNotAllowed'); // Show error in UI
                if (micButton) micButton.disabled = false; // Re-enable button (though it won't work)
                hideModal(micPermissionModalOverlay); // Hide modal if it was open
                break;
            case 'unsupported':
                 console.error("getUserMedia API not supported.");
                 handleError('errorMicNotSupported'); // Show specific error
                 // Button should already be disabled from setupSpeechRecognition
                 break;
             case 'no-device':
                 console.error("No microphone device found.");
                 handleError("errorAudioCapture", "(No microphone device found)");
                 if (micButton) micButton.disabled = false; // Re-enable button
                 break;
            case 'error':
                 console.error("An unexpected error occurred during permission check/request.");
                 // Avoid overwriting a more specific previous error
                 if (statusText?.textContent !== t('statusError')) {
                    handleError('errorFailedMicStart', '(Permission check failed)');
                 }
                 if (micButton) micButton.disabled = false; // Re-enable button
                 break;
             case 'unknown':
                 console.warn("Permission state unknown (likely needs prompt, but wasn't requested).");
                 // Treat as needing prompt? Or show error? Let's prompt via custom modal.
                 showModal(micPermissionModalOverlay);
                 break;
            default:
                 console.error("Unknown permission status:", permissionStatus);
                 if (micButton) micButton.disabled = false;
                 handleError('errorFailedMicStart', `(Unknown permission state: ${permissionStatus})`);
        }
    };

    // Renamed function to clarify it's the final step after permission granted
    const startRecognitionActual = () => {
        if (!recognition) {
             handleError("errorMicNotSupported", "(Rec object null)");
             return;
         }
         if (isRecording) {
             console.warn("startRecognitionActual called while already recording.");
             return;
         }

        try {
            recognition.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US'; // Ensure lang is current
            finalTranscript = ''; // Reset transcripts
            interimTranscript = '';
            console.log(`Calling recognition.start() with lang: ${recognition.lang}`);
            recognition.start();
            // Button/status updates happen in recognition.onstart
        } catch (e) {
            // Handle potential errors when calling start() itself (less common)
            console.error("Error calling recognition.start():", e);
            // Check if error is because it's already started (though `isRecording` should prevent this)
             if (e.name === 'InvalidStateError') {
                console.warn("Attempted to start recognition when already started?");
             } else {
                handleError("errorFailedMicStart", `(${e.name}: ${e.message})`);
             }
             // Reset UI just in case
            if (micButton) {
                 micButton.classList.remove('listening');
                 micButton.disabled = false;
                 if (micIcon) micIcon.className = 'fas fa-microphone';
                 micButton.setAttribute('aria-label', t('micBtnStartLabel'));
            }
        }
    }

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        console.log("Setting up event listeners...");
        let listenerCount = 0;

        // Microphone Button
        if (micButton) {
            micButton.addEventListener('click', () => {
                console.log("Mic button clicked. isRecording:", isRecording);
                if (isRecording) {
                    stopRecognition(); // User manually stops
                } else {
                    // Check permission and start if granted, otherwise handle flow
                    startRecordingFlow();
                }
            });
            listenerCount++;
            console.log(" - Mic button listener attached.");
        } else { console.warn("Mic button not found."); }

        // Voice Selector Dropdown
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (event) => {
                const newVoiceId = event.target.value;
                console.log("Voice selected via dropdown:", newVoiceId);
                saveVoicePreference(newVoiceId); // Save the selected preference
                // Optional: Provide feedback? e.g., brief status update or play a sample? (Keep it simple for now)
            });
            listenerCount++;
            console.log(" - Voice select listener attached.");
        } else { console.warn("Voice select element not found."); }

        // Sidebar Open Button
        if (openSidebarBtn && historySidebar && body) {
            openSidebarBtn.addEventListener('click', () => {
                historySidebar.classList.add('open');
                // Add class to body for potential background overlay/styling on mobile
                body.classList.add('sidebar-open-mobile');
                // Force reflow before adding transition class (safer for some browsers)
                 requestAnimationFrame(() => {
                     requestAnimationFrame(() => {
                        body.classList.add('sidebar-visible'); // Class that triggers transition
                     });
                 });
            });
            listenerCount++;
             console.log(" - Open sidebar listener attached.");
        } else { console.warn("Open sidebar button, sidebar element, or body not found."); }

         // Function to close sidebar
         const closeSidebar = () => {
             if (!historySidebar || !body) return;
             historySidebar.classList.remove('open');
             body.classList.remove('sidebar-visible'); // Remove transition class first

             // Remove mobile overlay class *after* transition ends
             const handler = (event) => {
                 if (event.target === historySidebar && !historySidebar.classList.contains('open')) {
                     body.classList.remove('sidebar-open-mobile');
                     historySidebar.removeEventListener('transitionend', handler);
                 }
             };
             historySidebar.addEventListener('transitionend', handler);
             // Fallback timeout
             setTimeout(() => {
                 if (!historySidebar.classList.contains('open')) {
                     body.classList.remove('sidebar-open-mobile');
                 }
                 historySidebar.removeEventListener('transitionend', handler);
             }, 500); // Match CSS transition duration
         };

        // Sidebar Close Button
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', closeSidebar);
            listenerCount++;
             console.log(" - Close sidebar listener attached.");
        } else { console.warn("Close sidebar button not found."); }

        // Close sidebar by clicking body overlay (only when sidebar is visibly open)
         if (body) {
             body.addEventListener('click', (e) => {
                 // Check if sidebar is open AND the click is directly on the body (the overlay area)
                 if (body.classList.contains('sidebar-visible') && e.target === body) {
                     closeSidebar();
                 }
             });
             listenerCount++;
              console.log(" - Body overlay click listener attached.");
         }

        // Settings Button & Panel (inside sidebar)
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent sidebar closing if clicking settings inside
                settingsPanel.classList.toggle('visible');
                settingsBtn.classList.toggle('active'); // Indicate if panel is open
            });
            listenerCount++;
             console.log(" - Settings button listener attached.");
        } else { console.warn("Settings button or panel not found."); }

        // Clear History Button (inside sidebar)
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                 // Use translated confirmation message
                 if (confirm(t('clearHistoryConfirm'))) {
                    clearHistory();
                }
            });
            listenerCount++;
             console.log(" - Clear history listener attached.");
        } else { console.warn("Clear history button not found."); }

        // Theme Toggle Button
        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', toggleTheme);
            listenerCount++;
             console.log(" - Theme toggle listener attached.");
        } else { console.warn("Theme toggle button not found."); }

        // Language Buttons
        if (langArBtn) {
            langArBtn.addEventListener('click', () => applyLanguage('ar'));
            listenerCount++;
             console.log(" - Lang AR listener attached.");
        } else { console.warn("Lang AR button not found."); }

        if (langEnBtn) {
            langEnBtn.addEventListener('click', () => applyLanguage('en'));
            listenerCount++;
             console.log(" - Lang EN listener attached.");
        } else { console.warn("Lang EN button not found."); }

        // Welcome Modal Listeners
        if (welcomeModalOverlay && welcomeModalContent) {
            // Tab switching via event delegation
             const tabContainer = welcomeModalContent.querySelector('.modal-header-tabs');
             if (tabContainer) {
                 tabContainer.addEventListener('click', handleWelcomeTabSwitch);
                 listenerCount++;
             }

             // Accept Terms button (moves to step 2)
             if (acceptTermsBtn) {
                 acceptTermsBtn.addEventListener('click', () => {
                     const currentAppVersion = '1.1'; // Match version used in check
                     const headerTabs = welcomeModalContent.querySelector('.modal-header-tabs');
                     const contentContainer = welcomeModalContent.querySelector('.modal-tab-content-container');

                     if (headerTabs) headerTabs.style.display = 'none'; // Hide tabs
                     if (contentContainer) contentContainer.style.display = 'none'; // Hide panels
                     if (modalStep2) modalStep2.style.display = 'block'; // Show step 2

                     // Mark this version as seen (terms accepted)
                     try { localStorage.setItem('neuroxUpdateVersion', currentAppVersion); } catch (e) { /* ignore LS errors */ }
                 });
                 listenerCount++;
             } else { console.warn("Accept terms button not found."); }

             // Generic "Got It" / Close buttons
             if (closeModalBtns) {
                 closeModalBtns.forEach(btn => {
                     btn.addEventListener('click', () => {
                         const currentAppVersion = '1.1';
                         hideModal(welcomeModalOverlay);
                         // Mark version as seen even if closed early
                         try { localStorage.setItem('neuroxUpdateVersion', currentAppVersion); } catch (e) { /* ignore */ }
                     });
                 });
                 listenerCount++;
             } else { console.warn("Welcome modal close buttons not found."); }

             // Step 2 buttons ('Show Again' / 'Don't Show Again')
             if (showAgainBtn) {
                 showAgainBtn.addEventListener('click', () => {
                     try { localStorage.removeItem('neuroxDontShowWelcome'); } catch (e) { /* ignore */ }
                     hideModal(welcomeModalOverlay);
                 });
                 listenerCount++;
             } else { console.warn("Show again button not found."); }

             if (dontShowAgainBtn) {
                 dontShowAgainBtn.addEventListener('click', () => {
                     try { localStorage.setItem('neuroxDontShowWelcome', 'true'); } catch (e) { /* ignore */ }
                     hideModal(welcomeModalOverlay);
                 });
                 listenerCount++;
             } else { console.warn("Don't show again button not found."); }
             console.log(" - Welcome modal listeners attached.");
        } else { console.warn("Welcome modal overlay or content not found."); }

        // Mic Permission Modal Listeners (Custom Modal)
        if (micPermissionModalOverlay) {
            if (allowMicBtn) {
                 // This button is on the *custom* modal. Clicking it means the user *wants* to grant permission.
                 // Now we trigger the *browser* prompt via getUserMedia.
                allowMicBtn.addEventListener('click', async () => {
                    hideModal(micPermissionModalOverlay); // Hide our custom modal
                    if (micButton) micButton.disabled = true; // Keep mic disabled while browser prompt shows
                    console.log("Custom 'Allow' clicked. Triggering browser permission prompt...");
                    try {
                         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                         stream.getTracks().forEach(track => track.stop()); // Stop stream immediately
                         console.log("Mic permission granted via browser prompt.");
                         // Now that permission is granted, start recognition
                         startRecognitionActual();
                         if (micButton) micButton.disabled = false; // Enable mic button
                    } catch (err) {
                        console.error("Error getting mic permission after custom prompt:", err);
                         // User likely denied the *browser* prompt here
                        handleError('errorMicNotAllowed');
                        if (micButton) micButton.disabled = false; // Re-enable button, but it won't work
                    }
                });
                 listenerCount++;
             } else { console.warn("Allow mic button not found in custom modal."); }

            if (denyMicBtn) {
                 // User clicked 'Deny' on *our* custom modal.
                denyMicBtn.addEventListener('click', () => {
                    hideModal(micPermissionModalOverlay);
                    console.log("Custom 'Deny' clicked.");
                    handleError('errorMicNotAllowed'); // Show error message
                    if (micButton) micButton.disabled = false; // Re-enable button (won't work)
                });
                 listenerCount++;
            } else { console.warn("Deny mic button not found in custom modal."); }
            console.log(" - Mic permission modal listeners attached.");
        } else { console.warn("Mic permission modal overlay not found."); }

        console.log(`Event listener setup complete. ${listenerCount} listeners attached.`);
    };

    // --- Initialization Function ---
    const initApp = () => {
        console.log('%cInitializing NeuroX App...', 'color: blue; font-weight: bold;');

        // 1. Load Theme (applies theme class to body)
        loadTheme();

        // 2. Load Language (sets lang/dir, translates static elements)
        loadLanguage(); // Needs to run early for UI text

        // 3. Load History (populates sidebar and main chat area)
        loadHistory(); // Needs language loaded for date formatting/labels

        // 4. Load Voice Preference (sets dropdown value)
        loadVoicePreference();

        // 5. Setup Speech Recognition instance (checks browser support)
        recognition = setupSpeechRecognition();
        // If setup failed (e.g., no API support), `recognition` will be null,
        // and the mic button should have been disabled within setupSpeechRecognition.

        // 6. Setup ALL event listeners for interactivity
        setupEventListeners();

        // 7. Show Welcome Modal if needed (runs after a short delay)
        setTimeout(showWelcomeModalIfNeeded, 150); // Delay slightly to ensure page is stable

        // 8. Set initial status message
        // Avoid setting status if an error occurred during setup (e.g., mic not supported)
        if (!statusText || statusText.textContent !== t('errorMicNotSupported')) {
             updateStatus('statusTapToStart');
        }


        // 9. Final check for critical UI elements after setup
        const essentialElements = { micButton, outputArea, statusIndicator, responseAudio, historySidebar, voiceSelect, htmlElement, body };
        const missingElements = Object.entries(essentialElements)
            .filter(([_, el]) => !el)
            .map(([name]) => name);

        if (missingElements.length > 0) {
             console.error("CRITICAL ERROR: Essential UI elements missing after initialization:", missingElements.join(', '));
             // Display a prominent error message to the user
             if(body) {
                  const errorDiv = document.createElement('div');
                  errorDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:red; color:white; padding:10px; text-align:center; z-index:9999; font-family: sans-serif;';
                  errorDiv.textContent = 'Application Error: Core components failed to load. Please refresh or try a different browser.';
                  // Avoid adding if body itself is the missing element
                  if (!missingElements.includes('body')) {
                     body.prepend(errorDiv);
                  } else {
                      // Fallback if body is missing (though unlikely given initial check)
                      if(htmlElement) htmlElement.innerHTML = errorDiv.outerHTML;
                  }
             }
             return; // Halt further execution
        }

        console.log('%cNeuroX App Initialized Successfully.', 'color: green; font-weight: bold;');
    };

    // --- Start the application ---
    // Ensure DOM is ready before initializing
    if (document.readyState === 'loading') {
        console.log("DOM not ready yet, waiting for DOMContentLoaded.");
        // Listener already set up, initApp will run when ready.
    } else {
        console.log("DOM already ready, initializing app immediately.");
        initApp();
    }

}); // End DOMContentLoaded Listener