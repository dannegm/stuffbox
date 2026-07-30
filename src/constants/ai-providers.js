// Provider metadata for the AI settings section (profile page) and
// src/services/ai.js. Each `id` must have a matching factory in ai.js's
// PROVIDER_FACTORIES — keep both lists in sync when adding a provider.
// OpenRouter is first/default since it's the project's established AI
// gateway (see CLAUDE.md) and needs no per-provider model guessing — it
// proxies whichever underlying model id you give it.
export const AI_PROVIDERS = [
    {
        id: 'openrouter',
        label: 'OpenRouter',
        modelPlaceholder: 'openai/gpt-4o-mini',
        keyPlaceholder: 'sk-or-...',
        keysUrl: 'https://openrouter.ai/keys',
    },
    {
        id: 'openai',
        label: 'OpenAI',
        modelPlaceholder: 'gpt-4o-mini',
        keyPlaceholder: 'sk-...',
        keysUrl: 'https://platform.openai.com/api-keys',
    },
    {
        id: 'anthropic',
        label: 'Anthropic',
        modelPlaceholder: 'claude-haiku-4-5-20251001',
        keyPlaceholder: 'sk-ant-...',
        keysUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
        id: 'google',
        label: 'Google',
        modelPlaceholder: 'gemini-2.5-flash',
        keyPlaceholder: 'AIza...',
        keysUrl: 'https://aistudio.google.com/apikey',
    },
];
