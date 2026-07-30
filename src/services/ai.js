import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { settings } from '@/services/settings';

// Fallback model per provider when the user leaves the model field blank in
// their profile — not meant to be "the best" model, just a cheap sane default
// so getAIModel() always resolves to something callable.
const DEFAULT_MODELS = {
    openrouter: 'openai/gpt-4o-mini',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-haiku-4-5-20251001',
    google: 'gemini-2.5-flash',
};

// Anthropic's API rejects direct browser requests unless this header opts
// in (there is no such restriction on the other three) — every call here
// goes straight from the browser to the provider using the user's own key,
// never through one of our Route Handlers.
const PROVIDER_FACTORIES = {
    openrouter: apiKey => createOpenRouter({ apiKey }),
    openai: apiKey => createOpenAI({ apiKey }),
    anthropic: apiKey =>
        createAnthropic({
            apiKey,
            headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
        }),
    google: apiKey => createGoogleGenerativeAI({ apiKey }),
};

// Cheap check for feature-gating UI ("set up your AI provider first") without
// needing a try/catch around getAIModel().
export const isAIConfigured = () => {
    const config = settings.get('ai', {});
    const provider = config.provider || 'openrouter';
    return Boolean(config.keys?.[provider]);
};

// Reads the user's own provider/token/model from localStorage
// (src/services/settings.js, key `ai`, edited from the profile page) — this
// never touches the DB or a server env var. Returns a LanguageModel ready to
// pass straight into `generateText`/`streamText`/`generateObject` from `ai`.
// `modelOverride` lets a specific feature request a different model than the
// user's saved default (e.g. a cheaper one for a background task).
export const getAIModel = modelOverride => {
    const config = settings.get('ai', {});
    const provider = config.provider || 'openrouter';
    const apiKey = config.keys?.[provider];

    if (!apiKey) {
        throw new Error('Configura tu proveedor de IA en tu perfil antes de usar esta función.');
    }

    const factory = PROVIDER_FACTORIES[provider];
    if (!factory) {
        throw new Error(`Proveedor de IA desconocido: ${provider}`);
    }

    const client = factory(apiKey);
    const model = modelOverride || config.model?.trim() || DEFAULT_MODELS[provider];
    return client(model);
};
