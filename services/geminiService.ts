const WEBHOOK_URL = 'https://n8n.srv985449.hstgr.cloud/webhook/56e68249-61ac-4bcc-80d2-ab2c29125d91/chat';

export interface N8nResponse {
  text: string;
}

/**
 * Extracts a conversational string from a potentially complex n8n response object.
 * This prevents displaying raw JSON like `{"output":"Hello"}` in the chat.
 * @param data The raw data from the n8n webhook response.
 * @returns A string to be displayed in the chat.
 */
function extractTextFromResponse(data: any): string {
    // If the data is already a string, return it directly.
    if (typeof data === 'string') {
        return data;
    }

    // If data is an object, check for common conversational keys.
    if (typeof data === 'object' && data !== null) {
        // Standard key for chat responses.
        if (typeof data.text === 'string') {
            return data.text;
        }
        // Other common keys found in AI/workflow responses.
        if (typeof data.output === 'string') {
            return data.output;
        }
        if (typeof data.answer === 'string') {
            return data.answer;
        }
        if (typeof data.message === 'string') {
            return data.message;
        }

        // Handle cases where the response is an array, e.g., `[{"text": "Hello"}]`
        // We'll try to process the first element.
        if (Array.isArray(data) && data.length > 0) {
            return extractTextFromResponse(data[0]);
        }
    }

    // Fallback if no clean text can be extracted.
    console.warn("Unexpected response format from n8n webhook. Could not find a text property:", data);
    return "I received a response I couldn't display properly. Please check the workflow's output format.";
}


/**
 * Sends a message and an optional file to the n8n workflow webhook.
 * @param message The user's text message.
 * @param file The optional file to upload.
 * @returns The AI's response from the workflow.
 */
export async function sendMessageToN8n(message: string, file?: File): Promise<N8nResponse> {
  try {
    let body: BodyInit;
    const headers: HeadersInit = {};

    if (file) {
      const formData = new FormData();
      formData.append('chatInput', message);
      // The 'file' key is what n8n will use to identify the incoming file.
      formData.append('file', file, file.name);
      body = formData;
      // When using FormData with fetch, the browser automatically sets the 
      // 'Content-Type' header to 'multipart/form-data' with the correct boundary.
    } else {
      body = JSON.stringify({ chatInput: message });
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();

    const extractedText = extractTextFromResponse(data);
    
    return { text: extractedText };

  } catch (error) {
    console.error('Error communicating with n8n webhook:', error);
    return { text: "Sorry, I couldn't connect to the workflow. Please check the webhook configuration and ensure it's active." };
  }
}
