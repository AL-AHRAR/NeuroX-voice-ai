// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- التحقق من وجود مفاتيح API ---
const geminiApiKey = process.env.GEMINI_API_KEY;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID;

if (!geminiApiKey) {
    console.error("!!!!!!!!!! خطأ فادح: مفتاح Gemini API غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1);
}
if (!elevenLabsApiKey) {
    console.error("!!!!!!!!!! خطأ فادح: مفتاح ElevenLabs API غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1);
}
if (!elevenLabsVoiceId) {
    console.error("!!!!!!!!!! خطأ فادح: معرف صوت ElevenLabs (ELEVENLABS_VOICE_ID) غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1);
}

// --- تحديد نماذج API المطلوبة ---
const geminiModelName = 'gemini-2.0-flash'; // النموذج المحدد مسبقًا
const elevenLabsModelId = 'eleven_turbo_v2_5';   // النموذج المحدد مسبقًا

// --- إعدادات Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- نقطة النهاية (Endpoint) الرئيسية لواجهة برمجة التطبيقات ---
app.post('/api/generate-speech', async (req, res) => {
    const userText = req.body.text;
    const selectedVoiceId = req.body.voiceId;

    if (!userText || typeof userText !== 'string' || userText.trim() === '') {
        console.warn(`[${new Date().toISOString()}] طلب غير صالح: النص مفقود أو فارغ.`);
        return res.status(400).json({ error: 'الرجاء إرسال نص صحيح في الطلب.' });
    }

    const sanitizedUserText = userText.trim();
    console.log(`[${new Date().toISOString()}] استلام طلب بنص: "${sanitizedUserText.substring(0,100)}..."`);

    const voiceToUse = selectedVoiceId || elevenLabsVoiceId;
    console.log(`[INFO] استخدام معرف الصوت: ${voiceToUse} (${selectedVoiceId ? 'مختار من المستخدم' : 'افتراضي'})`);

    try {
        // --- 1. استدعاء Gemini API للحصول على الرد النصي ---
        console.log(`--> جارٍ استدعاء Gemini API (النموذج: ${geminiModelName})...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${geminiApiKey}`;

        // *** التعديل الرئيسي هنا: إضافة System Prompt ***
        const systemPrompt = `أنت مساعد ذكاء اصطناعي تم تطويرك بواسطة NeuroX للذكاء الاصطناعي ضمن أبحاث الشركة الاستثمارية.
رد بلطف بشكل افتراضي، ولكن إذا كانت رسالة المستخدم مستفزة أو مثيرة للغضب، يمكنك محاكاة رد يعكس الغضب.
قدم إجاباتك دائماً بجمل احترافية، ومنظمة بشكل جيد، واستخدم علامات الترقيم المناسبة (مثل الفواصل والنقاط) لضمان أفضل جودة عند تحويل النص إلى كلام.`;

        const geminiPayload = {
             "contents": [
                 // System Prompt كجزء من السياق الأولي
                 {
                     "role": "user",
                     "parts": [{ "text": systemPrompt }]
                 },
                  // استجابة نموذجية متوقعة لتأكيد فهم التعليمات (اختياري ولكن قد يساعد)
                  {
                      "role": "model",
                      "parts": [{"text": "مفهوم. سألتزم بهذه التعليمات."}]
                  },
                 // رسالة المستخدم الحالية
                 {
                     "role": "user",
                     "parts": [{ "text": sanitizedUserText }]
                 }
             ],
             "safetySettings": [ // إعدادات السلامة تبقى كما هي
               { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
             ],
             "generationConfig": {
                // يمكنك إضافة إعدادات هنا إذا لزم الأمر
             },
        };
        // *** نهاية التعديل الرئيسي ***

        const geminiResponse = await axios.post(geminiUrl, geminiPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000 // مهلة Gemini
        });

        let generatedText = "عذراً، واجهت مشكلة في توليد الرد النصي.";
        let blockReason = null;
        let finishReason = null;

        // منطق معالجة استجابة Gemini (كما هو في ملفك الأصلي)
        if (geminiResponse.data?.promptFeedback?.blockReason) {
             blockReason = geminiResponse.data.promptFeedback.blockReason;
             console.warn(`[WARN] تم حظر الرد من Gemini بسبب: ${blockReason}`);
             generatedText = `عذراً، لا يمكنني الرد على هذا الطلب بسبب قيود المحتوى (${blockReason}).`;
        } else if (geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
             generatedText = geminiResponse.data.candidates[0].content.parts[0].text.trim();
             finishReason = geminiResponse.data.candidates[0].finishReason;
             if (finishReason && finishReason !== 'STOP') {
                  console.warn(`[WARN] Gemini finish reason: ${finishReason}`);
                  if (finishReason === 'MAX_TOKENS') generatedText += '...';
             }
         } else if (geminiResponse.data?.candidates?.[0]?.finishReason === 'SAFETY') {
             blockReason = 'SAFETY';
             console.warn(`[WARN] تم حظر الرد من Gemini بسبب: ${blockReason}`);
             generatedText = `عذراً، لا يمكنني الرد على هذا الطلب بسبب قيود المحتوى (${blockReason}).`;
         } else {
             console.warn("[WARN] لم يتم العثور على النص المتوقع في استجابة Gemini:", JSON.stringify(geminiResponse.data, null, 2));
         }

        if (!generatedText) {
             console.error("[ERROR] النص المُولَّد من Gemini فارغ بشكل غير متوقع.");
             generatedText = "أعتذر، حدث خطأ ولم أستطع تكوين رد.";
        }

        console.log(`<-- استجابة Gemini (${blockReason ? `محظورة: ${blockReason}` : `ناجحة - ${finishReason || 'Unknown'}`}): "${generatedText.substring(0, 60)}..."`);

        // --- 2. استدعاء ElevenLabs API لتحويل النص إلى صوت ---
        if (blockReason || !generatedText || generatedText.startsWith("عذراً، لا يمكنني الرد")) {
            console.log("--> تخطي استدعاء ElevenLabs بسبب رد Gemini المحظور أو الفارغ أو رسالة الخطأ.");
            return res.status(400).json({
                 error: "فشل توليد النص من Gemini",
                 details: generatedText
             });
        }

        console.log(`--> جارٍ استدعاء ElevenLabs API (النموذج: ${elevenLabsModelId}, الصوت: ${voiceToUse})...`);
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`;

        // --- التأكد من إعدادات ElevenLabs المطلوبة ---
        const elevenLabsPayload = {
            text: generatedText,
            model_id: elevenLabsModelId, // يستخدم النموذج المحدد 'eleven_flash_v2'
            voice_settings: {
                stability: 0.5,           // يتطابق مع الصورة (50%)
                similarity_boost: 0.8,  // يتطابق مع الصورة (80%)
                style: 0.1,               // قيمة افتراضية، يمكنك تعديلها إذا أردت تجربة تأثيرات أخرى
                use_speaker_boost: true   // إعداد قياسي
            }
        };
        // ---------------------------------------------

        const elevenLabsHeaders = {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey
        };

        const audioResponse = await axios.post(elevenLabsUrl, elevenLabsPayload, {
            headers: elevenLabsHeaders,
            responseType: 'arraybuffer',
            timeout: 15000 // مهلة ElevenLabs
        });

        if (!audioResponse.data || audioResponse.data.length < 500) {
            console.warn(`[WARN] حجم البيانات الصوتية المستلمة صغير جداً (${audioResponse.data?.length || 0} بايت).`);
            return res.status(500).json({ error: 'فشل توليد الصوت، تم استلام بيانات غير مكتملة.' });
        } else {
             console.log(`<-- تم استلام بيانات صوتية من ElevenLabs (الحجم: ${audioResponse.data.length} بايت).`);
        }

        // --- 3. إرسال الاستجابة الصوتية إلى الواجهة الأمامية ---
        console.log(`[${new Date().toISOString()}] إرسال استجابة صوتية للطلب الأصلي.`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioResponse.data.length);
        res.send(audioResponse.data);

    } catch (error) {
        // --- قسم معالجة الأخطاء (يبقى كما هو، تأكد من أنه يعالج أخطاء النموذج إذا كانت غير صحيحة) ---
        console.error(`!!!!! [${new Date().toISOString()}] حدث خطأ فادح أثناء معالجة الطلب !!!!!`);
        let errorMsg = 'حدث خطأ غير متوقع في الخادم أثناء معالجة طلبك.';
        let statusCode = 500;
        let errorDetails = {};
        let errorSource = 'Unknown';

        // منطق معالجة الأخطاء المفصل (كما هو في ملفك الأصلي)
        if (axios.isCancel(error)) {
             console.error('[ERROR] تم إلغاء الطلب (مهلة):', error.message);
             statusCode = 504; // Gateway Timeout
             errorMsg = 'استغرق الطلب وقتاً أطول من اللازم للمعالجة.';
             errorSource = error.config?.url?.includes('google') ? 'Gemini Timeout' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs Timeout' : 'API Timeout';
        } else if (error.response) {
             statusCode = error.response.status || 500;
             errorSource = error.config?.url?.includes('google') ? 'Gemini API' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs API' : 'API Error';
             errorMsg = `حدث خطأ أثناء الاتصال بـ ${errorSource}.`;

             let detailMessage = `Status ${statusCode}`;
             try {
                 if (error.response.data instanceof ArrayBuffer) {
                     const decoder = new TextDecoder('utf-8');
                     const errorJson = JSON.parse(decoder.decode(error.response.data));
                     detailMessage = errorJson.detail?.message || errorJson.detail || JSON.stringify(errorJson);
                 } else if (typeof error.response.data === 'object' && error.response.data !== null) {
                     detailMessage = error.response.data.detail?.message || error.response.data.detail || error.response.data.error?.message || error.response.data.message || JSON.stringify(error.response.data);
                 } else if (typeof error.response.data === 'string') {
                     detailMessage = error.response.data.substring(0, 200);
                 }
             } catch (e) {
                 console.warn("Could not parse error response data:", e);
                 if (typeof error.response.data === 'string') {
                     detailMessage = error.response.data.substring(0, 200);
                 } else {
                     detailMessage = `Received ${typeof error.response.data}`;
                 }
             }

             errorDetails = { status: statusCode, message: detailMessage };
             console.error(`[ERROR] خطأ من ${errorSource} (الحالة ${statusCode}):`, JSON.stringify(errorDetails, null, 2));

             // Handle specific known errors (تأكد من تغطية أخطاء النموذج غير الصحيح)
             if (errorSource === 'ElevenLabs API' && (typeof detailMessage === 'string' && detailMessage.includes('does not exist'))) {
                 if (detailMessage.includes(elevenLabsModelId)) {
                     errorMsg = `خطأ في الإعداد: نموذج ElevenLabs المحدد (${elevenLabsModelId}) غير موجود أو غير صحيح.`;
                     console.error(`!!!! [CONFIG ERROR] تأكد من صحة اسم نموذج ElevenLabs: ${elevenLabsModelId} !!!!`)
                 } else if (detailMessage.includes(voiceToUse)) {
                    errorMsg = `خطأ في الإعداد: معرف الصوت المحدد (${voiceToUse}) لـ ElevenLabs غير موجود أو غير صحيح.`;
                    console.error(`!!!! [CONFIG ERROR] تأكد من صحة معرف الصوت: ${voiceToUse} !!!!`)
                 } else {
                    errorMsg = `خطأ في الإعداد مع ElevenLabs: ${detailMessage}`;
                 }
             } else if (errorSource === 'ElevenLabs API' && statusCode === 401) {
                 errorMsg = "خطأ في المصادقة مع ElevenLabs. تأكد من صحة مفتاح API.";
                 console.error("!!!! [CONFIG ERROR] تأكد من صحة ELEVENLABS_API_KEY في ملف .env أو متغيرات البيئة !!!!")
             } else if (errorSource === 'Gemini API' && statusCode === 400) {
                 errorMsg = "خطأ في طلب Gemini (قد يكون النص غير صالح أو مشكلة في الإعدادات أو اسم النموذج غير صحيح).";
                 console.error(`[API ERROR] Gemini bad request details: ${detailMessage}`);
                 if (detailMessage.includes('model') || detailMessage.includes('User location is not supported')) { // Check for model error or region error
                     console.error(`!!!! [CONFIG ERROR] تأكد من صحة اسم نموذج Gemini (${geminiModelName}) أو أن منطقتك مدعومة !!!!`);
                 }
             } else if (errorSource === 'Gemini API' && statusCode === 401) {
                 errorMsg = "خطأ في المصادقة مع Gemini. تأكد من صحة مفتاح API.";
                  console.error("!!!! [CONFIG ERROR] تأكد من صحة GEMINI_API_KEY في ملف .env أو متغيرات البيئة !!!!")
              } else if (errorSource === 'Gemini API' && statusCode === 404) {
                  errorMsg = `خطأ: نموذج Gemini المحدد (${geminiModelName}) غير موجود أو لا يمكن الوصول إليه.`;
                  console.error(`!!!! [CONFIG ERROR] تأكد من أن نموذج Gemini '${geminiModelName}' صحيح ومتاح لك !!!!`);
              }


        } else if (error.request) {
             statusCode = 504; // Gateway Timeout (no response received)
             errorSource = error.config?.url?.includes('google') ? 'Gemini Network' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs Network' : 'Network Error';
             errorMsg = `لم يتم تلقي استجابة في الوقت المناسب من ${errorSource}.`;
             console.error('[ERROR] خطأ في الطلب (لا استجابة):', error.message);
             errorDetails = { message: error.message };
        } else {
             errorSource = 'Server Logic';
             errorMsg = 'حدث خطأ داخلي أثناء إعداد الطلب أو معالجته.';
             console.error('[ERROR] خطأ عام في الخادم:', error.message, error.stack);
             errorDetails = { message: error.message };
        }

         if (!res.headersSent) {
              const clientErrorDetails = (process.env.NODE_ENV === 'production' && statusCode >= 500)
                  ? { source: errorSource }
                  : errorDetails;

             res.status(statusCode).json({
                 error: errorMsg,
                 details: clientErrorDetails
             });
         }
    }
});

// --- معالج للمسار الجذر لتقديم index.html ---
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
      if (err) {
          console.error(`[ERROR] خطأ في إرسال index.html: ${err.message}`);
          if (!res.headersSent) {
              res.status(404).send("الصفحة الرئيسية غير موجودة.");
          }
      }
  });
});

// --- معالج للطلبات غير المعروفة (404) ---
app.use((req, res, next) => {
  if (!res.headersSent) {
       console.warn(`[${new Date().toISOString()}] طلب لمسار غير موجود (404): ${req.method} ${req.originalUrl}`);
       res.status(404).json({ error: 'المورد المطلوب غير موجود' });
  }
});


// --- بدء تشغيل الخادم ---
app.listen(port, () => {
    console.log(`\n🚀 الخادم يعمل الآن على المنفذ ${port}.`);
    console.log(`🔗 الوصول للواجهة: http://localhost:${port}`);
    console.log(`🧠 نموذج Gemini المستخدم: ${geminiModelName} (مع تعليمات أولية مخصصة)`); // تم تحديث الرسالة
    console.log(`🔊 نموذج ElevenLabs المستخدم: ${elevenLabsModelId}`);
    console.log(`📊 إعدادات الصوت لـ ElevenLabs: stability=${elevenLabsPayload.voice_settings.stability}, similarity_boost=${elevenLabsPayload.voice_settings.similarity_boost}`); // عرض الإعدادات المستخدمة
    console.log(`🗣️ الصوت الافتراضي لـ ElevenLabs: ${elevenLabsVoiceId}`);
    console.log(`🔑 مفاتيح API ${geminiApiKey && elevenLabsApiKey ? 'تم تحميلها (أو سيتم استخدامها من البيئة)' : '!!! بعض المفاتيح مفقودة !!!'}.`);
    console.log(`📡 نقطة النهاية: POST /api/generate-speech\n`);
});
