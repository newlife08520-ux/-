import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UploadedFile } from "../types";
import { HARDCODED_API_KEY } from "../constants";

const getAiClient = (customKey?: string) => {
  // 優先順序: 1. 前端輸入的 Key 2. constants.ts 裡寫死的 Key 3. 環境變數
  const key = customKey || HARDCODED_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key is missing. 請在設定中輸入，或在 constants.ts 中填寫 HARDCODED_API_KEY。");
  }
  return new GoogleGenAI({ apiKey: key });
};

// 預設為最寬鬆的設定
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

export const runAudit = async (
  text: string, 
  file: UploadedFile | null, 
  systemPrompt: string,
  modelId: string,
  apiKey?: string
): Promise<string> => {
  
  const ai = getAiClient(apiKey);

  const parts: any[] = [];
  if (text) parts.push({ text });
  if (file) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  }

  if (parts.length === 0) throw new Error("No content to audit.");

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9, // 微調：讓創意與邏輯平衡
        safetySettings: SAFETY_SETTINGS,
      }
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("模型回應為空，請稍後再試。");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      throw new Error(`找不到模型 '${modelId}'。\n請確認您的 API Key 是否有權限存取 Gemini 3 Pro Preview。\n(若使用免費 Key，通常無權限)`);
    }
    if (error.message?.includes("403") || error.message?.includes("permission")) {
        throw new Error(`API Key 權限不足或無效。請檢查 Key 是否正確。`);
    }
    throw error;
  }
};

// 重寫後的嚴格測試連線
export const testConnection = async (modelId: string, apiKey?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const ai = getAiClient(apiKey);
    
    // 真實發送請求，要求模型自我介紹，確保不是假連線
    // 修正：移除 maxOutputTokens: 5，因為思考型模型 (如 Gemini 3 Pro) 需要更多 token 進行思考，否則會回傳空值。
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: "Hello" }] },
    });
    
    // 嚴格檢查是否有回應
    if (response && response.text) {
         return { 
            success: true, 
            message: `連線成功` 
        };
    } else {
        throw new Error("API 連線建立但無回應 (Empty Response)");
    }

  } catch (error: any) {
    console.error("Test Connection Error:", error);
    let errMsg = error.message || "Unknown error";

    if (errMsg.includes("404") || errMsg.includes("not found")) {
        errMsg = "模型未授權 (404)";
    } else if (errMsg.includes("400") || errMsg.includes("INVALID_ARGUMENT")) {
        errMsg = "Key 格式無效 (400)";
    } else if (errMsg.includes("403")) {
        errMsg = "存取被拒 (403)";
    }

    return { 
      success: false, 
      message: `${errMsg}` 
    };
  }
};
