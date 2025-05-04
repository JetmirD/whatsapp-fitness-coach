// src/handlers/mealHandler.js

const { detectMealInfo, logMeal, getMealsForUserThisWeek } = require('../services/mealService');
const { sendToLLM } = require('../services/aiService');
const { logMessage } = require('../services/messageService');
const { isWeeklyMealRequest } = require('../helpers/messageType');

async function handleMeal(user, message) {
  // Check for weekly meal summary first
  if (await isWeeklyMealRequest(message)) {
    const meals = await getMealsForUserThisWeek(user.id);

    if (!meals || meals.length === 0) {
      return `I couldn’t find any meals logged this week. Want to start by logging something now? 🍽️`;
    }

    const healthy = meals.filter(m => m.healthy).length;
    const unhealthy = meals.length - healthy;

    const summaryPrompt = `
You're a fitness coach.

The user logged ${meals.length} meals this week:
• ${healthy} were healthy
• ${unhealthy} were unhealthy

Write a short sentence that clearly summarizes these exact numbers.
Only give the user the numbers in the form of a short report — do not set goals or suggest targets.
Keep it warm and motivating, but brief.
`.trim();

    return await sendToLLM(summaryPrompt);
  }

  // Otherwise, try to detect meal
  const mealInfo = await detectMealInfo(message);
  if (!mealInfo) return null;

  const isHealthy = await logMeal(user.id, mealInfo);

  const mealPrompt = `
You are a friendly and motivating fitness coach.

The user just logged a meal: ${mealInfo.meal_type} (${mealInfo.calories_estimate} kcal).
It is considered ${isHealthy ? 'healthy' : 'unhealthy'}.

Craft a SHORT (1-2 sentences) and NATURAL reply:
- If healthy, celebrate it with energy! 🎉💪
- If unhealthy, be positive and suggest gentle balance (no shaming!).
- Be playful and real. Sometimes use emojis. Sometimes not.
- Vary your reply styles slightly to feel natural.
`.trim();

  const reply = await sendToLLM(mealPrompt);
  await logMessage(user.id, reply, 'outbound');
  return reply;
}

module.exports = { handleMeal };
