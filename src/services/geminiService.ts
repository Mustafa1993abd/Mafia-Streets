import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeMarket(marketData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert Mafia Economy Analyst. Analyze the following market data and provide a concise report in Arabic.
      
      Market Data:
      ${JSON.stringify(marketData, null, 2)}
      
      Provide:
      1. Overall Market Sentiment (Bullish/Bearish/Stable).
      2. Top 3 items to buy now (low price, high potential).
      3. Top 3 items to sell now (high price, high demand).
      4. A short "Mafia Tip" for players.
      
      Keep it professional, immersive (Mafia style), and concise.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error analyzing market:", error);
    return "عذراً، فشل تحليل السوق حالياً. حاول لاحقاً.";
  }
}
