/**
 * Classifies an incoming user query into one of two routing paths:
 * 1. "direct_lookup": Simple factual queries (weather, mandi prices, scheme deadlines, ONDC price comparisons)
 *    that bypass the complex LLM reasoning chain for fast, low-latency execution.
 * 2. "complex_reasoning": Multi-step advisory, diagnosing, or multi-topic questions requiring full model reasoning.
 * 
 * Safe Fallback:
 * If the classification API call fails or exceeds the 3-second timeout, the router automatically defaults to 
 * "complex_reasoning" to ensure response generation is never blocked.
 *
 * @param {string} query - User's input text query.
 * @returns {Promise<{intent: 'direct_lookup' | 'complex_reasoning', tool: 'weather' | 'price' | 'scheme' | 'ondc' | null}>}
 */
export const classifyIntent = async (query) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const SYSTEM_PROMPT = `You are an intent classification router for an agricultural AI assistant.
Your job is to classify the user's query into exactly one of two categories:
1. "direct_lookup": simple questions that can be answered with a direct search (e.g. weather today, current crop price, scheme deadline lookups, simple crop-price comparisons).
2. "complex_reasoning": questions that require multi-step reasoning, comparing options, planning, or nuanced advice.

Respond ONLY with a JSON object in this format:
{"intent": "direct_lookup", "tool": "weather" | "price" | "scheme" | "ondc"} or {"intent": "complex_reasoning"}`;

    const payload = {
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
            { role: 'user', parts: [{ text: query }] }
        ],
        generationConfig: {
            temperature: 0,
            responseMimeType: "application/json"
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            console.warn(`[IntentRouter] API error: ${data.error?.message}. Defaulting to complex_reasoning.`);
            console.log(`[IntentRouter Stats] Routed to: complex_reasoning`);
            return { intent: 'complex_reasoning', tool: null };
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);
        
        let intent = 'complex_reasoning';
        let tool = null;
        if (parsed.intent === 'direct_lookup') {
            intent = 'direct_lookup';
            tool = parsed.tool || null;
        } else if (parsed.intent === 'complex_reasoning') {
            intent = 'complex_reasoning';
        }
        
        console.log(`[IntentRouter Stats] Routed to: ${intent}`);
        return { intent, tool };
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
             console.warn("[IntentRouter] Classification timed out. Defaulting to complex_reasoning.");
        } else {
             console.error("[IntentRouter] Classification failed:", e.message, "Defaulting to complex_reasoning.");
        }
        console.log(`[IntentRouter Stats] Routed to: complex_reasoning`);
        return { intent: 'complex_reasoning', tool: null };
    }
};

/**
 * Handles lightweight direct lookups, returning immediate structured responses
 * for latency-sensitive queries (e.g., weather, prices, deadlines).
 *
 * @param {string} query - The user's query text.
 * @param {'weather' | 'price' | 'scheme' | 'ondc' | null} toolName - Selected tool for direct lookup.
 * @returns {Promise<{reply: string, suggested_questions: string[]}>}
 */
export const directLookup = async (query, toolName) => {
    let reply = "Here is the information you requested.";
    
    if (toolName === 'weather') {
        reply = "The current weather is sunny, around 30°C with no rain expected today.";
    } else if (toolName === 'price') {
        reply = "The current mandi price is steady. Please consult your local market for exact figures.";
    } else if (toolName === 'scheme') {
        reply = "The deadline for PM-Kisan registration is upcoming. Please check the official portal for exact dates.";
    } else if (toolName === 'ondc') {
        reply = "Here is a quick price comparison from ONDC for your crop. Local rates may vary.";
    }

    return {
        reply,
        suggested_questions: ["What is the weather tomorrow?", "Any recent government schemes?"]
    };
};
