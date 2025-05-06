// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- Verify API Keys ---
const geminiApiKey = process.env.GEMINI_API_KEY;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID; // Default voice

if (!geminiApiKey) {
    console.error("!!!!!!!!!! FATAL ERROR: Gemini API key not found in .env file !!!!!!!!!!");
    process.exit(1); // Exit if key is missing
}
if (!elevenLabsApiKey) {
    console.error("!!!!!!!!!! FATAL ERROR: ElevenLabs API key not found in .env file !!!!!!!!!!");
    process.exit(1);
}
if (!elevenLabsVoiceId) {
    console.error("!!!!!!!!!! FATAL ERROR: ElevenLabs Voice ID (ELEVENLABS_VOICE_ID) not found in .env file !!!!!!!!!!");
    process.exit(1);
}

// --- Define Required API Models ---
const geminiModelName = 'gemini-2.0-flash'; // Specific model requested
const elevenLabsModelId = 'eleven_turbo_v2_5'; // Specific model requested

// --- Middleware Setup ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// --- Main API Endpoint ---
app.post('/api/generate-speech', async (req, res) => {
    const userText = req.body.text;
    const selectedVoiceId = req.body.voiceId; // Get voice ID from request

    if (!userText || typeof userText !== 'string' || userText.trim() === '') {
        console.warn(`[${new Date().toISOString()}] Invalid request: Text is missing or empty.`);
        // Return error in English
        return res.status(400).json({ error: 'Please send valid text in the request.' });
    }

    const sanitizedUserText = userText.trim();
    console.log(`[${new Date().toISOString()}] Received request with text: "${sanitizedUserText.substring(0, 100)}..."`);

    const voiceToUse = selectedVoiceId || elevenLabsVoiceId;
    console.log(`[INFO] Using voice ID: ${voiceToUse} (${selectedVoiceId ? 'User selected' : 'Default'})`);

    try {
        // --- 1. Call Gemini API to get text response ---
        console.log(`--> Calling Gemini API (Model: ${geminiModelName})...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${geminiApiKey}`;

        // *** System Prompt for context/persona ***
        const systemPrompt = `You are an AI assistant developed by NeuroX AI as part of the company's investment research.
Respond politely by default, but if the user's message is provocative or angry, you can simulate a response reflecting anger.
Always provide your answers in professional, well-structured sentences, using appropriate punctuation (like commas and periods) to ensure the best text-to-speech quality.`;

        // Prepare payload with system prompt and user message
        // NOTE: This structure provides initial context/instructions. True multi-turn conversational memory
        // would require storing and sending the previous user/model turns in the 'contents' array,
        // which needs session management on the server (not implemented in this simple endpoint).
        const geminiPayload = {
            "contents": [
                // System Prompt as part of the initial context
                {
                    "role": "user",
                    "parts": [{ "text": systemPrompt }]
                },
                // A hypothetical model response acknowledging the instructions (optional, helps guide the model)
                {
                    "role": "model",
                    "parts": [{ "text": "Understood. I will adhere to these instructions." }]
                },
                // The actual user message
                {
                    "role": "user",
                    "parts": [{ "text": sanitizedUserText }]
                }
            ],
            "safetySettings": [ // Safety settings remain the same
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
            ],
            "generationConfig": {
                // Generation settings can be added here if needed
            },
        };
        // *** End of context modification ***

        const geminiResponse = await axios.post(geminiUrl, geminiPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000 // Gemini timeout
        });

        let generatedText = "Sorry, I encountered a problem generating the text response."; // Default error message in English
        let blockReason = null;
        let finishReason = null;

        // Process Gemini response (logic remains the same, messages will be in English now)
        if (geminiResponse.data?.promptFeedback?.blockReason) {
            blockReason = geminiResponse.data.promptFeedback.blockReason;
            console.warn(`[WARN] Response blocked by Gemini due to: ${blockReason}`);
            // Return error in English
            generatedText = `Sorry, I cannot respond to this request due to content restrictions (${blockReason}).`;
        } else if (geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            generatedText = geminiResponse.data.candidates[0].content.parts[0].text.trim();
            finishReason = geminiResponse.data.candidates[0].finishReason;
            if (finishReason && finishReason !== 'STOP') {
                console.warn(`[WARN] Gemini finish reason: ${finishReason}`);
                if (finishReason === 'MAX_TOKENS') generatedText += '... (response truncated)';
            }
        } else if (geminiResponse.data?.candidates?.[0]?.finishReason === 'SAFETY') {
            // Specific case if the candidate was blocked for safety
            blockReason = 'SAFETY';
            console.warn(`[WARN] Response blocked by Gemini due to: ${blockReason}`);
             // Return error in English
            generatedText = `Sorry, I cannot respond to this request due to content restrictions (${blockReason}).`;
        } else {
            console.warn("[WARN] Expected text not found in Gemini response:", JSON.stringify(geminiResponse.data, null, 2));
        }

        if (!generatedText) {
            console.error("[ERROR] Generated text from Gemini is unexpectedly empty.");
             // Return error in English
            generatedText = "Apologies, an error occurred and I couldn't formulate a response.";
        }

        console.log(`<-- Gemini response (${blockReason ? `Blocked: ${blockReason}` : `Success - ${finishReason || 'Unknown'}`}): "${generatedText.substring(0, 60)}..."`);

        // --- 2. Call ElevenLabs API to convert text to speech ---
        // Skip if Gemini response was blocked, empty, or an error message
        if (blockReason || !generatedText || generatedText.startsWith("Sorry, I cannot respond") || generatedText.startsWith("Apologies, an error occurred")) {
            console.log("--> Skipping ElevenLabs call due to blocked/empty/error Gemini response.");
            // Send the Gemini error message back to the client as JSON
            return res.status(400).json({
                error: "Failed to generate text from Gemini",
                details: generatedText // Send the specific error message
            });
        }

        console.log(`--> Calling ElevenLabs API (Model: ${elevenLabsModelId}, Voice: ${voiceToUse})...`);
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`;

        // --- Ensure ElevenLabs payload uses the correct model and settings ---
        const elevenLabsPayload = {
            text: generatedText,
            model_id: elevenLabsModelId, // Use the specified model
            voice_settings: {           // Match settings from image/request
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.1,             // Default style, adjust if needed
                use_speaker_boost: true
            }
        };
        // ------------------------------------------------------------------

        const elevenLabsHeaders = {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey
        };

        const audioResponse = await axios.post(elevenLabsUrl, elevenLabsPayload, {
            headers: elevenLabsHeaders,
            responseType: 'arraybuffer', // Expect binary audio data
            timeout: 15000 // ElevenLabs timeout
        });

        // Check if received audio data seems valid (basic size check)
        if (!audioResponse.data || audioResponse.data.length < 500) { // Check for very small data size
            console.warn(`[WARN] Received very small audio data size (${audioResponse.data?.length || 0} bytes).`);
             // Return error in English
            return res.status(500).json({ error: 'Failed to generate audio, received incomplete data.' });
        } else {
            console.log(`<-- Received audio data from ElevenLabs (Size: ${audioResponse.data.length} bytes).`);
        }

        // --- 3. Send audio response back to the frontend ---
        console.log(`[${new Date().toISOString()}] Sending audio response for the original request.`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioResponse.data.length);
        res.send(audioResponse.data);

    } catch (error) {
        // --- Detailed Error Handling (Translated) ---
        console.error(`!!!!! [${new Date().toISOString()}] CRITICAL ERROR processing request !!!!!`);
        let errorMsg = 'An unexpected server error occurred while processing your request.'; // Default English
        let statusCode = 500;
        let errorDetails = {};
        let errorSource = 'Unknown';

        if (axios.isCancel(error)) {
            console.error('[ERROR] Request canceled (timeout):', error.message);
            statusCode = 504; // Gateway Timeout
            errorMsg = 'The request took too long to process.';
            errorSource = error.config?.url?.includes('google') ? 'Gemini Timeout' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs Timeout' : 'API Timeout';
        } else if (error.response) {
            // Error response received from API
            statusCode = error.response.status || 500;
            errorSource = error.config?.url?.includes('google') ? 'Gemini API' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs API' : 'API Error';
            errorMsg = `An error occurred while contacting the ${errorSource}.`;

            let detailMessage = `Status ${statusCode}`;
            try {
                // Attempt to parse error response data (could be JSON or plain text)
                if (error.response.data instanceof ArrayBuffer) {
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
            console.error(`[ERROR] Error from ${errorSource} (Status ${statusCode}):`, JSON.stringify(errorDetails, null, 2));

            // Handle specific known API errors
            if (errorSource === 'ElevenLabs API' && (typeof detailMessage === 'string' && detailMessage.includes('does not exist'))) {
                if (detailMessage.includes(elevenLabsModelId)) {
                    errorMsg = `Configuration Error: The specified ElevenLabs model (${elevenLabsModelId}) does not exist or is incorrect.`;
                    console.error(`!!!! [CONFIG ERROR] Verify the ElevenLabs model name: ${elevenLabsModelId} !!!!`)
                } else if (detailMessage.includes(voiceToUse)) {
                    errorMsg = `Configuration Error: The specified ElevenLabs voice ID (${voiceToUse}) does not exist or is incorrect.`;
                    console.error(`!!!! [CONFIG ERROR] Verify the voice ID: ${voiceToUse} !!!!`)
                } else {
                    errorMsg = `Configuration Error with ElevenLabs: ${detailMessage}`;
                }
            } else if (errorSource === 'ElevenLabs API' && statusCode === 401) {
                errorMsg = "Authentication Error with ElevenLabs. Please check your API key.";
                console.error("!!!! [CONFIG ERROR] Verify ELEVENLABS_API_KEY in .env or environment variables !!!!")
            } else if (errorSource === 'Gemini API' && statusCode === 400) {
                errorMsg = "Error with Gemini request (invalid text, settings, or model name).";
                console.error(`[API ERROR] Gemini bad request details: ${detailMessage}`);
                if (detailMessage.includes('model') || detailMessage.includes('User location is not supported')) { // Check for model or region error
                    console.error(`!!!! [CONFIG ERROR] Verify the Gemini model name (${geminiModelName}) or check region support !!!!`);
                }
            } else if (errorSource === 'Gemini API' && statusCode === 401) {
                 errorMsg = "Authentication Error with Gemini. Please check your API key.";
                 console.error("!!!! [CONFIG ERROR] Verify GEMINI_API_KEY in .env or environment variables !!!!")
             } else if (errorSource === 'Gemini API' && statusCode === 404) {
                  errorMsg = `Error: The specified Gemini model (${geminiModelName}) was not found or is inaccessible.`;
                  console.error(`!!!! [CONFIG ERROR] Verify the Gemini model '${geminiModelName}' is correct and available to you !!!!`);
              }
            // Add more specific error checks if needed

        } else if (error.request) {
            // Request made but no response received
            statusCode = 504; // Gateway Timeout
            errorSource = error.config?.url?.includes('google') ? 'Gemini Network' : error.config?.url?.includes('elevenlabs') ? 'ElevenLabs Network' : 'Network Error';
            errorMsg = `No response received in time from ${errorSource}.`;
            console.error('[ERROR] Request error (no response):', error.message);
            errorDetails = { message: error.message };
        } else {
            // Error setting up the request or other internal error
            errorSource = 'Server Logic';
            errorMsg = 'Internal error setting up or processing the request.';
            console.error('[ERROR] General server error:', error.message, error.stack);
            errorDetails = { message: error.message };
        }

        // Send unified JSON error response to the frontend
        if (!res.headersSent) {
            // Avoid sending full internal details in production for server errors
            const clientErrorDetails = (process.env.NODE_ENV === 'production' && statusCode >= 500)
                ? { source: errorSource } // Less detail in production for internal errors
                : errorDetails;

            res.status(statusCode).json({
                error: errorMsg, // Send English error message
                details: clientErrorDetails
            });
        }
    }
});

// --- Root Route Handler (serves index.html) ---
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // Log error in English
            console.error(`[ERROR] Error sending index.html: ${err.message}`);
            if (!res.headersSent) {
                // Send 404 in English if index.html not found
                res.status(404).send("Homepage not found.");
            }
        }
    });
});

// --- Catch-all 404 Handler for unknown routes ---
// Must be after all other routes and static middleware
app.use((req, res, next) => {
    if (!res.headersSent) {
        // Log 404 in English
        console.warn(`[${new Date().toISOString()}] Request to non-existent path (404): ${req.method} ${req.originalUrl}`);
        // Send JSON 404 in English
        res.status(404).json({ error: 'Requested resource not found' });
    }
});


// --- Start Server ---
app.listen(port, () => {
    // Log startup messages in English
    console.log(`\n🚀 Server is now running on port ${port}.`);
    console.log(`🔗 Access the interface: http://localhost:${port}`);
    console.log(`🧠 Gemini model in use: ${geminiModelName} (with custom system prompt)`);
    console.log(`🔊 ElevenLabs model in use: ${elevenLabsModelId}`);
    // Display the actual voice settings being used
    console.log(`📊 ElevenLabs Voice Settings: stability=${elevenLabsPayload.voice_settings.stability}, similarity_boost=${elevenLabsPayload.voice_settings.similarity_boost}, style=${elevenLabsPayload.voice_settings.style}`);
    console.log(`🗣️ Default ElevenLabs voice: ${elevenLabsVoiceId}`);
    console.log(`🔑 API Keys ${geminiApiKey && elevenLabsApiKey ? 'loaded (or using environment variables)' : '!!! Some keys might be missing !!!'}.`);
    console.log(`📡 API Endpoint: POST /api/generate-speech\n`);
});
