import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert';
import { classifyIntent, directLookup } from './intentRouter.js';

if (!process.env.GEMINI_API_KEY) {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
            if (match) {
                process.env.GEMINI_API_KEY = match[1].trim();
            }
        }
    } catch (e) {
        console.warn("Could not load .env.local automatically");
    }
}

test('classifyIntent - direct_lookup (weather)', async () => {
    const result = await classifyIntent("What is the weather like today in Pune?");
    assert.strictEqual(result.intent, "direct_lookup");
    assert.strictEqual(result.tool, "weather");
});

test('classifyIntent - direct_lookup (scheme)', async () => {
    const result = await classifyIntent("when is PM-Kisan deadline");
    assert.strictEqual(result.intent, "direct_lookup");
    assert.strictEqual(result.tool, "scheme");
});

test('classifyIntent - direct_lookup (ondc)', async () => {
    const result = await classifyIntent("what is the price of wheat on ondc?");
    assert.strictEqual(result.intent, "direct_lookup");
    assert.strictEqual(result.tool, "ondc");
});

test('classifyIntent - complex_reasoning', async () => {
    const result = await classifyIntent("My wheat crop has brown spots and yellowing leaves. What pesticide should I use, and what is the proper dosage for a 2-acre farm?");
    assert.strictEqual(result.intent, "complex_reasoning");
    assert.strictEqual(result.tool, null);
});

test('directLookup - returns responses for tools', async () => {
    const resWeather = await directLookup("weather query", "weather");
    assert.ok(resWeather.reply.includes("sunny"));

    const resScheme = await directLookup("scheme query", "scheme");
    assert.ok(resScheme.reply.includes("PM-Kisan"));

    const resOndc = await directLookup("ondc query", "ondc");
    assert.ok(resOndc.reply.includes("ONDC"));
});
