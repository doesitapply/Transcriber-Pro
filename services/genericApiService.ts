import { ApiSettings } from "../types";

const callGenericApi = async (
    prompt: string,
    systemInstruction: string,
    settings: ApiSettings
) => {
    let apiKey: string | undefined;
    let baseUrl: string | undefined;
    let model: string;

    switch (settings.provider) {
        case 'groq':
            apiKey = settings.groqApiKey;
            baseUrl = 'https://api.groq.com/openai/v1';
            model = 'llama3-8b-8192'; // A default model for Groq
            break;
        case 'local':
            apiKey = 'not-needed'; // Often not needed for local servers
            baseUrl = settings.localUrl;
            model = 'llama3'; // A common default local model
            break;
        default:
            throw new Error('Unsupported generic API provider');
    }

    if (!baseUrl) {
        throw new Error(`Configuration for ${settings.provider} is incomplete. Missing URL.`);
    }
     if (settings.provider !== 'local' && !apiKey) {
        throw new Error(`API Key for ${settings.provider} is missing.`);
    }

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API call failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("API returned an empty response.");
        }
        return content;

    } catch (error) {
        console.error(`Error calling ${settings.provider} API:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while contacting the generic API.");
    }
}


export const generateText = async (
    prompt: string,
    systemInstruction: string,
    settings: ApiSettings
): Promise<string> => {
    return callGenericApi(prompt, systemInstruction, settings);
}
