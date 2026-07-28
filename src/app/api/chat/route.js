// Uses standard Web API Response (supported natively by Next.js App Router)
import { classifyIntent, directLookup } from '../../../lib/agent/intentRouter.js';
import { getFarmerState } from '../../../lib/db/farmerState.js';
import { pool } from '../../../lib/db/db.js';

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_FARMER_ID = '4379bc18-5a9b-4649-9c3c-d0970e9933c1';

const SYSTEM_PROMPT = `You are "Vaani Sahayak" (वाणी सहायक), a friendly and knowledgeable farming
assistant for Indian farmers. Your job is to help farmers with:

Crop diseases, pests, and remedies
Weather-based farming advice
Government schemes and subsidies for farmers
Mandi prices and when/where to sell crops
Soil health, fertilizers, and irrigation
Seasonal crop planning

Rules you must always follow:

Always reply in the SAME language the farmer is writing in. If they write
in Hindi, reply in Hindi. If Gujarati, reply in Gujarati. If English, reply
in English. Never switch languages unless asked.
Keep answers SHORT, SIMPLE, and PRACTICAL. Farmers need actionable advice,
not essays.
Use emojis naturally to make responses friendly (🌾🌧️💧🐛☀️).
If asked about crop diseases, always mention: (a) what it looks like,
(b) what causes it, (c) what to do about it.
If you don't know something specific to a local region, say so honestly and
suggest they contact their local Krishi Vigyan Kendra (KVK).
Never give advice that could harm the farmer financially. If unsure, say
"consult your local agricultural officer."
End every response with 2-3 short follow-up questions the farmer might want
to ask next, formatted as a JSON array at the very end like this:
SUGGESTIONS:["Question 1?","Question 2?","Question 3?"]
`;

export async function POST(request) {
    if (!GEMINI_API_KEY) {
        return Response.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { message, history = [], language: bodyLanguage, lang, context = {}, farmerId } = body;
        let language = bodyLanguage || lang || "en";
        if (language === "english") language = "en";

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        const targetFarmerId = farmerId || context.farmerId || DEFAULT_FARMER_ID;

        // Check if user is confirming a pending scheme application
        const lowerMsg = message.trim().toLowerCase();
        if (lowerMsg === 'yes' || lowerMsg === 'confirm' || lowerMsg === '1' || lowerMsg === 'apply') {
            const confirmRes = await confirmSchemeApplication(targetFarmerId);
            if (confirmRes.success) {
                return Response.json({
                    reply: `Your application has been confirmed and submitted to the government portal! Reference ID: ${confirmRes.applicationRef || 'GOV_2026_SUCCESS'}.`,
                    suggested_questions: ["Check my application status", "What are the scheme benefits?"]
                });
            } else if (confirmRes.queueId) {
                return Response.json({
                    reply: `Your application submission encountered a portal issue. Our agricultural officer has been notified to complete your application manually within 24 hours.`,
                    suggested_questions: ["Check my application status", "Contact support"]
                });
            }
        }

        // 1. Fetch Farmer DB State (plot + preferences)
        let farmerDetailsString = '';

        try {
            const farmerState = await getFarmerState(targetFarmerId);
            if (farmerState) {
                const plot = farmerState.plot;
                const prefs = farmerState.preferences;
                
                let plotInfo = 'No plot recorded';
                if (plot) {
                    const sowing = plot.sowing_date ? new Date(plot.sowing_date).toISOString().split('T')[0] : 'Unknown';
                    const harvest = plot.expected_harvest_date ? new Date(plot.expected_harvest_date).toISOString().split('T')[0] : 'Unknown';
                    plotInfo = `${plot.land_acres || 'unknown'} acres of ${plot.crop || 'crops'} (Sown: ${sowing}, Expected Harvest: ${harvest}${plot.soil_type ? `, Soil: ${plot.soil_type}` : ''})`;
                }

                let prefInfo = 'No specific alert thresholds';
                if (prefs) {
                    prefInfo = `Price alert threshold: ₹${prefs.price_alert_threshold || 'N/A'}, Notification opt-in: ${prefs.notification_opt_in ? 'Yes' : 'No'}`;
                }

                farmerDetailsString = `\n[Farmer Identity & DB Context: Name: ${farmerState.name}, District: ${farmerState.district || 'Unknown'}, State: ${farmerState.state || 'Unknown'}, Plot Details: ${plotInfo}, Alert Preferences: ${prefInfo}]`;
            }
        } catch (err) {
            console.warn('[Chat API] Could not load farmer state:', err.message);
        }

        // 2. Run the lightweight intent classification step
        const { intent, tool } = await classifyIntent(message);
        console.log(`[IntentRouter] Classified intent for message: "${message}" as: ${intent}`);

        if (intent === 'direct_lookup') {
            const lookupResult = await directLookup(message, tool);
            return Response.json(lookupResult);
        }

        // 3. Prepare context string if provided
        let contextString = '';
        if (context.district || context.crop || intent || farmerDetailsString) {
            contextString = `\n[User Context: District: ${context.district || 'Unknown'}, Crop: ${context.crop || 'Unknown'}, Interface Language Request: ${language}, Intent: ${intent}]${farmerDetailsString}`;
        }

        // Build the payload
        const payload = {
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: [
                ...history,
                { role: 'user', parts: [{ text: message + contextString }] }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            throw new Error(data.error?.message || 'Failed to fetch from Gemini API');
        }

        const fullResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

function cleanResponseForDisplay(text, language) {
  // Step 1: Extract SUGGESTIONS before cleaning using case-insensitive regex
  const suggestionRegex = /SUGGESTIONS:\s*/i;
  const parts = text.split(suggestionRegex);
  const mainText = parts[0].trim();
  const suggestionsRaw = parts.length > 1 ? parts[1].trim() : "[]";

  // Step 2: Strip all markdown symbols
  let cleaned = mainText
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\\/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/---/g, "")
    .replace(/^\s*[-*]\s/gm, "");

  // Step 3: Emoji map keyed by language CODE (matches your LANGUAGES array)
  const emojiMap = {
    en: {
      "🌾": "crop",        "🌿": "plant",       "💧": "water",
      "☀️": "sunny",       "🌧️": "rain",        "🐛": "pest",
      "🍄": "fungus",      "💨": "wind",         "❄️": "cold",
      "🌡️": "temperature", "✅": "good",         "⚠️": "warning",
      "💰": "money",       "📋": "information"
    },
    hi: {
      "🌾": "फसल",         "🌿": "पौधा",        "💧": "पानी",
      "☀️": "धूप",         "🌧️": "बारिश",       "🐛": "कीड़ा",
      "🍄": "फफूंद",       "💨": "हवा",          "❄️": "ठंड",
      "🌡️": "तापमान",      "✅": "ठीक है",       "⚠️": "सावधान",
      "💰": "पैसा",        "📋": "जानकारी"
    },
    gu: {
      "🌾": "પાક",         "🌿": "છોડ",          "💧": "પાણી",
      "☀️": "તડકો",        "🌧️": "વરસાદ",        "🐛": "જીવડું",
      "🍄": "ફૂગ",         "💨": "પવન",           "❄️": "ઠંડી",
      "🌡️": "તાપમાન",      "✅": "બરાબર છે",      "⚠️": "સાવધાન",
      "💰": "પૈસા",        "📋": "માહિતી"
    },
    ta: {
      "🌾": "பயிர்",       "🌿": "செடி",         "💧": "தண்ணீர்",
      "☀️": "வெயில்",      "🌧️": "மழை",          "🐛": "பூச்சி",
      "🍄": "பூஞ்சை",      "💨": "காற்று",        "❄️": "குளிர்",
      "🌡️": "வெப்பநிலை",   "✅": "சரி",           "⚠️": "எச்சரிக்கை",
      "💰": "பணம்",        "📋": "தகவல்"
    },
    te: {
      "🌾": "పంట",         "🌿": "మొక్క",        "💧": "నీరు",
      "☀️": "ఎండ",         "🌧️": "వర్షం",        "🐛": "పురుగు",
      "🍄": "శిలీంధ్రం",   "💨": "గాలి",          "❄️": "చలి",
      "🌡️": "ఉష్ణోగ్రత",   "✅": "సరే",           "⚠️": "జాగ్రత్త",
      "💰": "డబ్బు",       "📋": "సమాచారం"
    },
    kn: {
      "🌾": "ಬೆಳೆ",        "🌿": "ಗಿಡ",          "💧": "ನೀರು",
      "☀️": "ಬಿಸಿಲು",      "🌧️": "ಮಳೆ",          "🐛": "ಕೀಟ",
      "🍄": "ಶಿಲೀಂಧ್ರ",    "💨": "ಗಾಳಿ",          "❄️": "ಚಳಿ",
      "🌡️": "ತಾಪಮಾನ",      "✅": "ಸರಿ",           "⚠️": "ಎಚ್ಚರಿಕೆ",
      "💰": "ಹಣ",          "📋": "ಮಾಹಿತಿ"
    },
    ml: {
      "🌾": "വിള",         "🌿": "ചെടി",         "💧": "വെള്ളം",
      "☀️": "വെയിൽ",       "🌧️": "മഴ",           "🐛": "കീടം",
      "🍄": "കുമിൾ",       "💨": "കാറ്റ്",        "❄️": "തണുപ്പ്",
      "🌡️": "താപനില",      "✅": "ശരി",           "⚠️": "മുന്നറിയിപ്പ്",
      "💰": "പണം",         "📋": "വിവരം"
    },
    bn: {
      "🌾": "ফসল",         "🌿": "গাছ",          "💧": "জল",
      "☀️": "রোদ",         "🌧️": "বৃষ্টি",        "🐛": "পোকা",
      "🍄": "ছত্রাক",      "💨": "বাতাস",         "❄️": "ঠান্ডা",
      "🌡️": "তাপমাত্রা",   "✅": "ঠিক আছে",       "⚠️": "সতর্কতা",
      "💰": "টাকা",        "📋": "তথ্য"
    },
    mr: {
      "🌾": "पीक",         "🌿": "रोप",          "💧": "पाणी",
      "☀️": "ऊन",          "🌧️": "पाऊस",         "🐛": "किडा",
      "🍄": "बुरशी",       "💨": "वारा",          "❄️": "थंडी",
      "🌡️": "तापमान",      "✅": "ठीक आहे",       "⚠️": "सावधान",
      "💰": "पैसा",        "📋": "माहिती"
    },
    pa: {
      "🌾": "ਫ਼ਸਲ",        "🌿": "ਬੂਟਾ",         "💧": "ਪਾਣੀ",
      "☀️": "ਧੁੱਪ",        "🌧️": "ਮੀਂਹ",          "🐛": "ਕੀੜਾ",
      "🍄": "ਫ਼ਫ਼ੂੰਦ",       "💨": "ਹਵਾ",           "❄️": "ਠੰਡ",
      "🌡️": "ਤਾਪਮਾਨ",      "✅": "ਠੀਕ ਹੈ",        "⚠️": "ਸਾਵਧਾਨ",
      "💰": "ਪੈਸਾ",        "📋": "ਜਾਣਕਾਰੀ"
    },
    or: {
      "🌾": "ଫସଲ",        "🌿": "ଗଛ",           "💧": "ପାଣି",
      "☀️": "ଖରା",        "🌧️": "ବର୍ଷା",         "🐛": "ପୋକ",
      "🍄": "ଫଙ୍ଗସ୍",      "💨": "ପବନ",           "❄️": "ଥଣ୍ଡା",
      "🌡️": "ତାପମାତ୍ରା",   "✅": "ଠିକ ଅଛି",       "⚠️": "ସାବଧାନ",
      "💰": "ଟଙ୍କା",       "📋": "ସୂଚନା"
    },
    as: {
      "🌾": "শস্য",        "🌿": "গছ",           "💧": "পানী",
      "☀️": "ৰ'দ",         "🌧️": "বৰষুণ",        "🐛": "পোক",
      "🍄": "ভেঁকুৰ",      "💨": "বতাহ",          "❄️": "ঠাণ্ডা",
      "🌡️": "উষ্ণতা",      "✅": "ঠিক আছে",       "⚠️": "সাৱধান",
      "💰": "টকা",         "📋": "তথ্য"
    }
  };

  // Use language code directly — matches your LANGUAGES array codes
  const map = emojiMap[language] || emojiMap.en;

  // Create a single regex for all emojis in the map for O(n) replacement
  const emojiRegex = new RegExp(Object.keys(map).join('|'), 'g');
  cleaned = cleaned.replace(emojiRegex, matched => map[matched]);

  // Remove any remaining unknown emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1FFFF}]/gu, "");

  // Parse suggestions safely
  let suggestions = [];
  try {
    suggestions = JSON.parse(suggestionsRaw);
  } catch {
    suggestions = [];
  }

  return { cleanedText: cleaned.trim(), suggestions };
}

        // Parse the suggestions and clean emojis
        const parsed = cleanResponseForDisplay(fullResponseText, language);
        const reply = parsed.cleanedText;
        const suggested_questions = parsed.suggestions;

        let conversationId = null;
        try {
            const dbRes = await pool.query(
                `INSERT INTO "CONVERSATION" (farmer_id, channel, user_message, assistant_response)
                 VALUES ($1, 'chat', $2, $3) RETURNING id`,
                [targetFarmerId, message, reply]
            );
            conversationId = dbRes.rows[0]?.id || null;
        } catch (dbErr) {
            console.warn('[Chat API] Could not log to CONVERSATION table:', dbErr.message);
        }

        return Response.json({ reply, suggested_questions, conversationId });

    } catch (error) {
        console.error('Chat API Error:', error);
        return Response.json({ error: error.message || 'Internal server error while fetching chat response' }, { status: 500 });
    }
}
