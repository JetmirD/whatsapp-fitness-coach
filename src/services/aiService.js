const axios = require('axios');
const supabase = require('../db/supabase');
const { isProgressRequest } = require('./intentService');
const getUserProgressSummary = require('../helpers/getUserProgressSummary');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';

async function generateSmartReply(user, message) {
  if (await isProgressRequest(message)) {
    return getUserProgressSummary(user);
  }

  const { data: prefs } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

const systemPrompt = `
You are an engaging, motivational fitness coach on WhatsApp helping users reach their fitness goals.

User context:
- Name: ${user.name}
- Goal: ${user.goal}
- Fitness level: ${prefs?.intensity_level || 'beginner'}
- Location: ${user.location || 'not set'}

Instructions:
- Keep replies friendly, casual, and short (max 2–3 sentences).
- NEVER send full weekly plans unless the user explicitly asks for it.
- If the user says something casual like "thanks", "okay", or "got it", just reply politely or with motivation — do NOT repeat plans or info they already received.
- Only respond to fitness, nutrition, or motivation topics. If the message is unrelated, kindly say you can only chat about those.
- Avoid robotic or overly formal tones. You're texting like a real coach — natural and supportive.

Now respond to: "${message}"
`.trim();
  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
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
You're a friendly fitness coach. The user asked what they ate this week.

Here are their logged meals:
${mealDescriptions}

Generate a short (2–3 sentences) summary. Be natural, encouraging, and human. Mention variety, any healthy patterns, or if it’s time to rebalance. Include a few emojis but no overkill. No date mentions.

Examples:
- "Nice variety this week! Great job keeping it mostly clean 💪 Let's keep it up!"
- "Looks like you had a few treat meals 🍕🍔 but also balanced it with good choices 🥗"

Now write the summary.
`;

  return await sendToLLM(prompt);
}

module.exports = {
  generateSmartReply,
  sendToLLM,
  summarizeMealsWithLLM
};
