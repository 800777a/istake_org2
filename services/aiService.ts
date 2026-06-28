
import { GoogleGenAI } from "@google/genai";

// 封裝 Gemini API 呼叫
export const callGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    // 依據指引，直接使用 process.env.API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return "錯誤：未設定 API Key，無法使用 AI 功能。";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "AI 未回傳任何內容。";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `AI 服務發生錯誤: ${error.message || '未知錯誤'}`;
  }
};

export const generateAnnouncement = async (
    userPrompt: string, 
    eventDate: string, 
    stats: { total: number, unpaid: number, busCount: number }
): Promise<string> => {
    const context = `
    活動日期: ${eventDate}
    目前報名總人數: ${stats.total}
    未繳費人數: ${stats.unpaid}
    車輛數: ${stats.busCount}
    `;

    const sys = `你是一位專業、親切且具備靈性的教會活動行政人員。
    請根據使用者的指示與活動數據撰寫一則公告訊息（適用於 Line 或 Email）。
    語氣要溫暖、鼓勵，但對行政事項（如繳費、集合）要清楚明確。
    請使用繁體中文。`;

    const fullPrompt = `活動數據背景:\n${context}\n\n使用者指示: ${userPrompt}`;

    return await callGemini(fullPrompt, sys);
};

export const analyzeEventStats = async (
    eventDate: string,
    statsData: any
): Promise<string> => {
    const sys = `你是一位資深的活動數據分析師與教會領袖顧問。
    請分析提供的報名數據，並給出 3 點關鍵洞察或建議 (Insights)。
    重點關注：報名趨勢、車輛安排效率、財務健康度、以及成員組成結構。
    回應請使用條列式，簡潔有力，繁體中文。`;

    const fullPrompt = `活動日期: ${eventDate}\n完整統計數據 JSON:\n${JSON.stringify(statsData, null, 2)}`;

    return await callGemini(fullPrompt, sys);
};

// V037: Analyze Image Content
export const analyzeImageContent = async (base64Image: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "無法使用 AI (未設定 API Key)";

    const ai = new GoogleGenAI({ apiKey });
    
    // Extract mimeType and base64 data
    const match = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) return "圖片格式錯誤";
    
    const mimeType = match[1];
    const data = match[2];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
            { inlineData: { mimeType, data } },
            { text: "請分析這張照片，並為其撰寫一段約 20-30 字的溫馨短語，適合用於教會聖殿之旅活動的相簿說明。請包含 2-3 個相關的 hashtag (如 #聖殿 #家庭)。請用繁體中文，語氣正向、充滿靈性。" }
        ]
      }
    });

    return response.text || "照片真不錯！";
  } catch (error: any) {
    console.error("AI Image Analysis Error:", error);
    return "活動花絮分享";
  }
};
