import fs from 'fs';
import path from 'path';

// Load .env.local if present
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf-8');
        envFile.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length) {
                process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
    }
} catch (e) {}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Language display names map for prompt context
 */
const LANGUAGE_NAMES = {
    hi: 'Hindi',
    gu: 'Gujarati',
    pa: 'Punjabi',
    te: 'Telugu',
    ta: 'Tamil',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    bn: 'Bengali',
    or: 'Odia',
    as: 'Assamese',
    en: 'English'
};

/**
 * Bhashini NMT / LLM Translation function matching main chat flow
 * Translates English text to farmer's target language.
 */
export async function translateText(text, targetLang = 'hi') {
    if (!targetLang || targetLang === 'en' || targetLang === 'english') {
        return text;
    }

    const langName = LANGUAGE_NAMES[targetLang] || targetLang;

    // Call Gemini NMT fallback pipeline (matching main chat flow)
    if (GEMINI_API_KEY) {
        try {
            const payload = {
                system_instruction: {
                    parts: [{ text: `You are an expert agricultural translator for Bhashini NMT pipeline. Translate the given English text into natural, spoken ${langName} suitable for an Indian farmer. Return ONLY the plain translated text without explanation or markdown.` }]
                },
                contents: [{ role: 'user', parts: [{ text: text }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (translated) return translated;
            }
        } catch (err) {
            console.warn(`[Bhashini NMT fallback] Translation to ${langName} failed: ${err.message}. Using original text.`);
        }
    }

    return text;
}

/**
 * Bhashini TTS (Text-to-Speech) pipeline helper
 */
export async function generateTTS(text, targetLang = 'hi') {
    return {
        audioUrl: `https://api.bhashini.gov.in/tts/mock-stream?lang=${targetLang}&text=${encodeURIComponent(text.substring(0, 50))}`,
        format: 'mp3',
        durationSeconds: Math.ceil(text.length / 15)
    };
}

/**
 * Notification Channel Stubs
 */
export async function sendFCM(farmerId, title, body) {
    console.log(`  📱 [FCM Push Sent] Farmer: ${farmerId} | Title: "${title}" | Body: "${body}"`);
    return { success: true, messageId: `fcm_${Date.now()}` };
}

export async function sendSMS(farmerId, phone, body) {
    console.log(`  💬 [Twilio SMS Sent] Farmer: ${farmerId} (${phone || 'No Phone'}) | Text: "${body}"`);
    return { success: true, sid: `sms_${Date.now()}` };
}

export async function triggerOutboundIVR(farmerId, message, phone) {
    console.log(`  📞 [Exotel Outbound IVR Call Triggered] Farmer: ${farmerId} (${phone || 'No Phone'}) | Speech: "${message}"`);
    // TODO: Wire Exotel outbound call API (POST https://api.exotel.com/v1/Accounts/{AccountSid}/Calls/connect.json) when credentials provided.
    return { success: true, callSid: `exotel_call_${Date.now()}` };
}

/**
 * Shared translate + notify logic for both Daily Briefing and Alert Engine
 * 
 * @param {Object} params
 * @param {Object} params.farmer - Farmer object containing id, name, phone, language, preferences
 * @param {string} params.messageEnglish - English briefing/alert content
 * @param {string} [params.title="Vaani Sahayak Alert"] - Title for push notifications
 * @param {'low'|'medium'|'high'} [params.severity="medium"] - Alert severity level
 * @param {string} [params.alertType="general"] - Type identifier for tracking
 */
export async function notifyFarmer({ farmer, messageEnglish, title = 'Vaani Sahayak Update', severity = 'medium', alertType = 'general' }) {
    if (!farmer || !farmer.id) {
        throw new Error('Valid farmer object is required for notification dispatch');
    }

    const farmerLang = farmer.language || 'hi';
    const prefs = farmer.preferences || {};
    const userChannels = prefs.alert_channels || ['push', 'sms', 'ivr'];

    // 1. Bhashini NMT Translation & TTS Generation
    const translatedText = await translateText(messageEnglish, farmerLang);
    const ttsMeta = await generateTTS(translatedText, farmerLang);

    console.log(`\n[Notify Pipeline] Dispatching to ${farmer.name} (${farmer.id})`);
    console.log(`  -> Preferred Language: ${farmerLang.toUpperCase()}`);
    console.log(`  -> Severity: ${severity.toUpperCase()} | Type: ${alertType}`);
    console.log(`  -> English Text: "${messageEnglish}"`);
    console.log(`  -> Translated Text (${farmerLang}): "${translatedText}"`);

    // 2. Channel Selection based on Severity Tiers & User Preferences
    // High: push + sms + ivr
    // Medium: push + sms
    // Low: push only
    const allowedBySeverity = {
        high: ['push', 'sms', 'ivr'],
        medium: ['push', 'sms'],
        low: ['push']
    };

    const targetChannels = (allowedBySeverity[severity] || ['push']).filter(c => userChannels.includes(c));
    console.log(`  -> Active Dispatch Channels: [${targetChannels.join(', ')}]`);

    const results = {};

    // 3. Dispatch to Channels
    if (targetChannels.includes('push')) {
        results.push = await sendFCM(farmer.id, title, translatedText);
    }

    if (targetChannels.includes('sms')) {
        results.sms = await sendSMS(farmer.id, farmer.phone, translatedText);
    }

    if (targetChannels.includes('ivr') && severity === 'high') {
        results.ivr = await triggerOutboundIVR(farmer.id, translatedText, farmer.phone);
    }

    return {
        farmerId: farmer.id,
        language: farmerLang,
        severity,
        alertType,
        originalText: messageEnglish,
        translatedText,
        ttsMeta,
        channelsSent: targetChannels,
        results
    };
}
