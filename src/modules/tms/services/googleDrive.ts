export async function uploadToGoogleDrive(filename: string, base64String: string): Promise<string> {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        console.error("VITE_GOOGLE_SCRIPT_URL is not set");
        return "";
    }

    // Remove data:image/jpeg;base64, prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");

    try {
        const response = await fetch(scriptUrl, {
            method: "POST",
            body: JSON.stringify({
                filename: filename,
                base64: base64Data,
                mimeType: "image/jpeg"
            }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // Use text/plain to avoid CORS preflight issues with GAS
            },
        });

        const result = await response.json();
        
        if (result.success) {
            return result.url;
        } else {
            console.error("Google Drive Upload Error:", result.error);
            return "";
        }
    } catch (error) {
        console.error("Network Error uploading to Drive:", error);
        return "";
    }
}
