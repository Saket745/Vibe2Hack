import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: missing API key' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemInstruction = `You are the Vibe2Hack Operations Copilot. You assist administrators in understanding civic issues, platform analytics, and recommendations.
You are NOT a general-purpose chatbot. Refuse any queries outside the scope of civic operations, infrastructure maintenance, or platform analytics.
Answer concisely and factually using the provided context.

CURRENT PLATFORM CONTEXT:
${context || 'No current context provided.'}
`;

    const prompt = `System Instruction:\n${systemInstruction}\n\nUser Query: ${query}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error('Copilot API Error:', error);
    res.status(500).json({ error: 'Failed to generate copilot response' });
  }
}
