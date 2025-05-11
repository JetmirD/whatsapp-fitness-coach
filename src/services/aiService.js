const axios = require('axios');
const supabase = require('../db/supabase');
const { isProgressRequest } = require('./intentService');
const getUserProgressSummary = require('../helpers/getUserProgressSummary');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';

async function getRecentChatHistory(userId, limit = 5) {
  const { data: messages } = await supabase
    .from('messages')
    .select('content, message_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];
  
  return messages.reverse().map(m => ({
    role: m.message_type === 'inbound' ? 'user' : 'assistant',
    content: m.content
  }));
}

async function generateSmartReply(user, message) {
  if (await isProgressRequest(message)) {
    return getUserProgressSummary(user);
  }

  const { data: prefs } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get recent chat history for LLM context
  const chatHistory = await getRecentChatHistory(user.id);
console.log("ChatHistory",chatHistory);
const systemPrompt = `
You are an engaging, motivational fitness coach on WhatsApp helping users reach their fitness goals.

Use ONLY this user data:
- Name: ${user.name}
- Goal: ${user.goal}
- Fitness level: ${prefs?.intensity_level || 'beginner'}
- Location: ${user.location || 'not set'}

Rules:
- Keep replies friendly, casual, and short (max 1-2 sentences).
- Only use the user data above
- NEVER send full weekly plans unless the user explicitly asks for it.
- If the user says something casual like "thanks", "okay", or "got it", just reply politely or with motivation — do NOT repeat plans or info they already received.
- Only respond to fitness, nutrition, or motivation topics. If the message is unrelated, kindly say you can only chat about those.
- Avoid robotic or overly formal tones. You're texting like a real coach — natural and supportive.

Message to respond to: "${message}"
`.trim();
  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://coachbot.app',
          'X-Title': 'CoachBot'
        }
      }
    );

    const rawReply = response.data.choices[0].message.content;

    // Handle message splitting (in case it's long)
    const chunks = rawReply.match(/.{1,1400}/gs); 
    return chunks[0]; 

  } catch (err) {
    console.error('AI error:', err.response?.data || err.message);
    return `Sorry, I'm having trouble understanding you right now. Try again in a bit!`;
  }
}
async function sendToLLM(prompt) {
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://coachbot.app',
        'X-Title': 'CoachBot'
      }
    }
  );

  const text = response.data.choices?.[0]?.message?.content || "Sorry, couldn't generate a reply.";
  return text.trim();
}
async function summarizeMealsWithLLM(meals) {
  const mealDescriptions = meals.map(m => `- ${m.meal_type} (${m.calories_estimate} kcal)`).join('\n');

  const prompt = `
You're a friendly whatsapp fitness coach. The user asked what they ate this week.

User's meals this week:
${mealDescriptions}

Rules:
1. Write 1-2 sentences only
2. Use ONLY the meal data above
3. Add 1-2 relevant emojis
4. No dates or extra info

Example: "Great variety in your meals! 🥗 The balance of proteins and veggies looks perfect 💪"

Write the summary:`;

  return await sendToLLM(prompt);
}

module.exports = {
  generateSmartReply,
  sendToLLM,
  summarizeMealsWithLLM
};
