import { classifyIntent, directLookup } from '../../../lib/agent/intentRouter.js';
import { pool } from '../../../lib/db/db.js';
import { checkRateLimit, rateLimitExceededResponse } from '../../../lib/rateLimiter.js';

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const LANGUAGE_MAP = {
    '1': 'hi', // Hindi
    '2': 'en', // English
    '3': 'gu', // Gujarati
    '4': 'ta', // Tamil
    '5': 'te'  // Telugu
};

const SYSTEM_PROMPT = `You are "Vaani Sahayak" IVR Assistant for Indian farmers. 
Keep answers VERY SHORT, SIMPLE, and directly speakable over a phone call (maximum 2-3 concise sentences). 
Do not use Markdown, bullet points, or complex formatting.`;

async function handleIVRRequest(request) {
    const rateCheck = checkRateLimit(request, { limit: 10, prefix: 'ivr' });
    if (!rateCheck.allowed) {
        return rateLimitExceededResponse(rateCheck);
    }

    let params = {};

    try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            params = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            formData.forEach((value, key) => {
                params[key] = value;
            });
        }
    } catch (e) {
        // Fallback to URL search params if body parsing fails
    }

    const { searchParams } = new URL(request.url);
    searchParams.forEach((value, key) => {
        if (!params[key]) params[key] = value;
    });

    const digits = params.Digits || params.digits || params.DigitsKey;
    const feedbackDigit = params.feedbackDigit || params.FeedbackDigits;
    const conversationIdParam = params.conversationId;
    const selectedLanguage = LANGUAGE_MAP[digits] || params.language || params.lang || 'hi';
    const query = params.query || params.SpeechResult || params.Speech || params.message || params.CallFrom;

    // Handle IVR feedback DTMF press (1 = Yes / Helpful, 2 = No / Unhelpful)
    if (feedbackDigit && conversationIdParam) {
        const isHelpful = feedbackDigit === '1';
        try {
            await pool.query(`UPDATE "CONVERSATION" SET helpful = $1 WHERE id = $2`, [isHelpful, conversationIdParam]);
        } catch (e) {}
        const thankYouText = isHelpful ? 'Thank you for your positive feedback!' : 'Thank you for your feedback. We will work to improve.';
        return new Response(`<Response><Say>${thankYouText}</Say></Response>`, {
            headers: { 'Content-Type': 'text/xml' }
        });
    }

    // 1. Handle DTMF / Language Selection step if no user query present
    if (digits && !query) {
        const langName = selectedLanguage === 'hi' ? 'Hindi' : selectedLanguage === 'gu' ? 'Gujarati' : 'English';
        const responseXml = `<Response><Say>Language selected: ${langName}. Please ask your question after the beep.</Say></Response>`;
        return new Response(responseXml, {
            headers: { 'Content-Type': 'text/xml' }
        });
    }

    if (!query) {
        const initialPrompt = `<Response>
            <Gather numDigits="1" timeout="5">
                <Say>Press 1 for Hindi, Press 2 for English, Press 3 for Gujarati.</Say>
            </Gather>
        </Response>`;
        return new Response(initialPrompt, {
            headers: { 'Content-Type': 'text/xml' }
        });
    }

    // 2. Query handling step: Run intent classification (latency-sensitive)
    console.log(`[IVR Webhook] Processing IVR query: "${query}" (Language: ${selectedLanguage})`);
    
    const { intent, tool } = await classifyIntent(query);
    console.log(`[IVR IntentRouter] Classified IVR query as: ${intent} (Tool: ${tool})`);

    let responseText = '';

    if (intent === 'direct_lookup') {
        const lookupResult = await directLookup(query, tool);
        responseText = lookupResult.reply;
    } else {
        // Complex reasoning path via Gemini API
        if (!GEMINI_API_KEY) {
            responseText = "System is currently unavailable. Please try again later.";
        } else {
            try {
                const payload = {
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ role: 'user', parts: [{ text: `[Language: ${selectedLanguage}] Query: ${query}` }] }],
                    generationConfig: { temperature: 0.5, maxOutputTokens: 256 }
                };

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not process your query.";
                } else {
                    responseText = "Failed to fetch response. Please try again.";
                }
            } catch (err) {
                console.error("[IVR Webhook] Error calling Gemini for complex reasoning:", err);
                responseText = "An error occurred while processing your request.";
            }
        }
    }

    let conversationId = null;
    try {
        const dbRes = await pool.query(
            `INSERT INTO "CONVERSATION" (channel, user_message, assistant_response)
             VALUES ('ivr', $1, $2) RETURNING id`,
            [query, responseText]
        );
        conversationId = dbRes.rows[0]?.id || null;
    } catch (e) {
        console.warn('[IVR API] Error logging to CONVERSATION:', e.message);
    }

    // Return Exotel Voice XML or JSON if requested
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
        return Response.json({
            reply: responseText,
            intent,
            tool,
            language: selectedLanguage,
            conversationId
        });
    }

    const xmlResponse = `<Response>
        <Say>${responseText}</Say>
        <Gather numDigits="1" action="/api/ivr?conversationId=${conversationId}" method="POST">
            <Say>Was this response helpful? Press 1 for Yes, Press 2 for No.</Say>
        </Gather>
    </Response>`;

    return new Response(xmlResponse, {
        headers: { 'Content-Type': 'text/xml' }
    });
}

export async function GET(request) {
    return handleIVRRequest(request);
}

export async function POST(request) {
    return handleIVRRequest(request);
}
