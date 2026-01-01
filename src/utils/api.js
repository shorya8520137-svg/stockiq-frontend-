const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://13-201-222-24.nip.io/api";
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

export async function api(path, method = "GET", body, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
            ...options,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `API error ${res.status}`);
        }

        return res.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

// Test API connection
export async function testConnection() {
    try {
        const response = await fetch(`${BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        } else {
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}
