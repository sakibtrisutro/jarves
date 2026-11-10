# JARVIS — API Provider & Key Management Guide

JARVIS features an independent API Key Manager that supports Google Gemini, OpenAI, and OpenRouter without vendor lock-in or default hardcoded model dependencies.

## Supported Providers
1. **Google Gemini**
   - Official Gemini API Key (`AIzaSy...`).
   - Supports Gemini models with multimodal voice synthesis & transcription.
2. **OpenAI**
   - Official OpenAI API Key (`sk-...`).
   - Supports GPT-4o, GPT-4, o1, o3 models.
3. **OpenRouter**
   - OpenRouter API Key (`sk-or-v1-...`).
   - Access 200+ models with automatic free model discovery.

## Zero-Configuration First Boot
Upon fresh installation:
- `AI PROVIDER`: `NOT CONFIGURED`
- `ACTIVE MODEL`: `NONE`
- `MODEL INTELLIGENCE`: `NOT INITIALIZED`

## How to Configure Your First API Key
1. Click the Settings icon in the top right header.
2. Navigate to **API Keys & Providers**.
3. Paste your API key into your desired provider slot and click **Save Key**.
4. Click **Verify Key** to confirm connectivity.
5. Go to **Model Control Center** and click **Instant Free Model Bootstrap** to activate your first free model automatically!
