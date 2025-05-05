// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // تأكد من وجود هذا السطر

const app = express();
const port = process.env.PORT || 3000;

// --- التحقق من وجود مفاتيح API ---
const geminiApiKey = process.env.GEMINI_API_KEY;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID; // هذا هو الصوت الافتراضي

if (!geminiApiKey) {
    console.error("!!!!!!!!!! خطأ فادح: مفتاح Gemini API غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1); // إنهاء العملية إذا كان المفتاح مفقودًا
}
if (!elevenLabsApiKey) {
    console.error("!!!!!!!!!! خطأ فادح: مفتاح ElevenLabs API غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1);
}
if (!elevenLabsVoiceId) {
    console.error("!!!!!!!!!! خطأ فادح: معرف صوت ElevenLabs (ELEVENLABS_VOICE_ID) غير موجود في ملف .env !!!!!!!!!!");
    process.exit(1);
}

// --- تحديد نماذج API المطلوبة (لم يتم تغييرها حسب الطلب) ---
const geminiModelName = 'gemini-1.5-flash'; // أو أي نموذج آخر تفضله
const elevenLabsModelId = 'eleven_multilingual_v2'; // أو أي نموذج آخر تفضله

// --- إعدادات Middleware ---
app.use(cors());
app.use(express.json());

// *** التعديل المطلوب هنا ***
// يفترض هذا المسار أن مجلد 'public' موجود في نفس المجلد الذي يوجد به 'server.js'
app.use(express.static(path.join(__dirname, 'public')));
// *** نهاية التعديل المطلوب ***

// --- نقطة النهاية (Endpoint) الرئيسية لواجهة برمجة التطبيقات ---
app.post('/api/generate-speech', async (req, res) => {
    const userText = req.body.text;
    const selectedVoiceId = req.body.voiceId; // الحصول على معرف الصوت من الطلب

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
        const geminiPayload = {
             // استخدم نفس الإعدادات من ملفك الأصلي
             "contents": [{
                 "parts": [{ "text": sanitizedUserText }]
             }],
             "safetySettings": [
               { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
               { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
             ],
             "generationConfig": {
                // يمكنك إضافة إعدادات هنا
             },
        };

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
             // حالة خاصة إذا تم حظر المرشح بسبب الأمان
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
             // إرسال الخطأ كـ JSON إذا فشل توليد النص
            return res.status(400).json({
                 error: "فشل توليد النص من Gemini",
                 details: generatedText // إرسال رسالة الخطأ للمستخدم
             });
        }

        console.log(`--> جارٍ استدعاء ElevenLabs API (النموذج: ${elevenLabsModelId}, الصوت: ${voiceToUse})...`);
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`;
        const elevenLabsPayload = {
            text: generatedText,
            model_id: elevenLabsModelId,
            voice_settings: { // استخدم نفس الإعدادات من ملفك الأصلي
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.1,
                use_speaker_boost: true
            }
        };
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
            // قد يكون من الأفضل إرسال خطأ هنا إذا كان الحجم صغيرًا بشكل غير طبيعي
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
                     // Attempt to decode ArrayBuffer as UTF-8 text for potential JSON error
                     const decoder = new TextDecoder('utf-8');
                     const errorJson = JSON.parse(decoder.decode(error.response.data));
                     detailMessage = errorJson.detail?.message || errorJson.detail || JSON.stringify(errorJson);
                 } else if (typeof error.response.data === 'object' && error.response.data !== null) {
                     detailMessage = error.response.data.detail?.message || error.response.data.detail || error.response.data.error?.message || error.response.data.message || JSON.stringify(error.response.data);
                 } else if (typeof error.response.data === 'string') {
                     detailMessage = error.response.data.substring(0, 200); // Limit length
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

             // Handle specific known errors
             if (errorSource === 'ElevenLabs API' && (typeof detailMessage === 'string' && detailMessage.includes('does not exist'))) {
                 errorMsg = `خطأ في الإعداد: معرف الصوت المحدد (${voiceToUse}) لـ ElevenLabs غير موجود أو غير صحيح.`;
                 console.error(`!!!! [CONFIG ERROR] تأكد من صحة معرف الصوت: ${voiceToUse} !!!!`)
             } else if (errorSource === 'ElevenLabs API' && statusCode === 401) {
                 errorMsg = "خطأ في المصادقة مع ElevenLabs. تأكد من صحة مفتاح API.";
                 console.error("!!!! [CONFIG ERROR] تأكد من صحة ELEVENLABS_API_KEY في ملف .env أو متغيرات البيئة !!!!")
             } else if (errorSource === 'Gemini API' && statusCode === 400) {
                 errorMsg = "خطأ في طلب Gemini (قد يكون النص غير صالح أو مشكلة في الإعدادات).";
                 console.error(`[API ERROR] Gemini bad request details: ${detailMessage}`);
             } else if (errorSource === 'Gemini API' && statusCode === 401) {
                 errorMsg = "خطأ في المصادقة مع Gemini. تأكد من صحة مفتاح API.";
                  console.error("!!!! [CONFIG ERROR] تأكد من صحة GEMINI_API_KEY في ملف .env أو متغيرات البيئة !!!!")
              }


        } else if (error.request) {
             statusCode = 504; // Gateway Timeout (no response received)
             errorSource = error.config?.url?.includes('google') ? 'Gemini Network' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs Network' : 'Network Error';
             errorMsg = `لم يتم تلقي استجابة في الوقت المناسب من ${errorSource}.`;
             console.error('[ERROR] خطأ في الطلب (لا استجابة):', error.message);
             errorDetails = { message: error.message };
        } else {
             // Error setting up the request or other internal error
             errorSource = 'Server Logic';
             errorMsg = 'حدث خطأ داخلي أثناء إعداد الطلب أو معالجته.';
             console.error('[ERROR] خطأ عام في الخادم:', error.message, error.stack);
             errorDetails = { message: error.message };
        }

         // إرسال استجابة خطأ JSON موحدة للواجهة الأمامية
         if (!res.headersSent) {
              // لا ترسل تفاصيل الخطأ الداخلية الكاملة في الإنتاج
              const clientErrorDetails = (process.env.NODE_ENV === 'production' && statusCode >= 500)
                  ? { source: errorSource } // تفاصيل أقل في الإنتاج للأخطاء الداخلية
                  : errorDetails;

             res.status(statusCode).json({
                 error: errorMsg,
                 details: clientErrorDetails // إرسال تفاصيل الخطأ للعميل
             });
         }
    }
});

// --- معالج للمسار الجذر لتقديم index.html ---
// تأكد من أن هذا المسار صحيح ويعمل مع المسار المعدل لـ express.static
app.get('/', (req, res) => {
  // بما أن express.static يعالج '/' لـ index.html، قد لا تحتاج لهذا
  // ولكن من الجيد تركه كـ fallback أو إذا أردت تقديم ملف معين
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
      if (err) {
          console.error(`[ERROR] خطأ في إرسال index.html: ${err.message}`);
          if (!res.headersSent) {
              // إرسال خطأ 404 إذا لم يتم العثور على index.html
              res.status(404).send("الصفحة الرئيسية غير موجودة.");
          }
      }
  });
});

// --- معالج للطلبات غير المعروفة (404) ---
// يجب أن يكون هذا المعالج **بعد** كل المسارات الأخرى و express.static
app.use((req, res, next) => {
  if (!res.headersSent) {
       // لا تحاول إرسال ملف 404.html إذا كان express.static سيعالجه
       // فقط أرسل استجابة 404 نصية أو JSON
       console.warn(`[${new Date().toISOString()}] طلب لمسار غير موجود (404): ${req.method} ${req.originalUrl}`);
       res.status(404).json({ error: 'المورد المطلوب غير موجود' });
  }
});


// --- بدء تشغيل الخادم ---
app.listen(port, () => {
    console.log(`\n🚀 الخادم يعمل الآن على المنفذ ${port}.`);
    console.log(`🔗 الوصول للواجهة: http://localhost:${port}`);
    console.log(`🧠 نموذج Gemini المستخدم: ${geminiModelName}`);
    console.log(`🔊 نموذج ElevenLabs المستخدم: ${elevenLabsModelId}`);
    console.log(`🗣️ الصوت الافتراضي لـ ElevenLabs: ${elevenLabsVoiceId}`);
    console.log(`🔑 مفاتيح API ${geminiApiKey && elevenLabsApiKey ? 'تم تحميلها (أو سيتم استخدامها من البيئة)' : '!!! بعض المفاتيح مفقودة !!!'}.`);
    console.log(`📡 نقطة النهاية: POST /api/generate-speech\n`);
});