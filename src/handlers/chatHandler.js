const { isWeeklyMealRequest } = require('../helpers/messageType');
const isCasualMessage = require('../helpers/isCasualMessage');
const { getMealsForUserThisWeek } = require('../services/mealService');
const { generateSmartReply, sendToLLM } = require('../services/aiService');

async function handleChat(user, message) {
    const lowerMessage = message.toLowerCase();

    // 1. Image follow-up like "give me tips for it"
    if (
        user.last_image_label &&
        /(this|it|photo|image|pic)/.test(lowerMessage)
    ) {
        const prompt = `
You're a fitness and nutrition coach.

The user previously sent an image, and it was classified as "${user.last_image_label}".

Now they said: "${message}"

Based on the item "${user.last_image_label}", generate a helpful, specific and friendly 1-2 sentence reply with tips or suggestions related to that item. Keep it warm, relevant, and short.
    `.trim();

        return await sendToLLM(prompt);
    }

    // 2. Weekly Meal Summary
    if (await isWeeklyMealRequest(message)) {
        const meals = await getMealsForUserThisWeek(user.id);

        if (!meals || meals.length === 0) {
            return `I couldn’t find any meals logged this week. Want to start by logging something now? 🍽️`;
        }

        const healthy = meals.filter(m => m.healthy).length;
        const unhealthy = meals.length - healthy;

        const summaryPrompt = `
You're a friendly fitness coach.

The user logged ${meals.length} meals this week:
• ${healthy} were healthy
• ${unhealthy} were unhealthy

Write a short sentence that clearly summarizes these numbers.
Do not suggest new goals. Be warm, brief, and human. Keep it under 2 sentences.
    `.trim();

        return await sendToLLM(summaryPrompt);
    }

    // 3. Fitness-related check
    const fitnessCheckPrompt = `
You are a strict assistant that only answers YES or NO.

The user says: "${message}"

Question: Is the user asking about FITNESS, WORKOUTS, EXERCISES, GYM, HEALTHY LIFESTYLE, NUTRITION, or MOTIVATION?

- If yes, answer "YES".
- If no, answer "NO".

Do not explain anything. Only reply YES or NO.
  `.trim();

    const fitnessResponse = await sendToLLM(fitnessCheckPrompt);
    const isFitnessRelated = fitnessResponse.trim().toUpperCase() === 'YES';

    if (!isFitnessRelated) {
        return `I’m here to help with fitness, nutrition, and your health goals — nothing else for now. Let’s keep our focus strong! 💪`;
    }

    // 4. Casual messages like "Thanks" or "Okay"
    if (isCasualMessage(message)) {
        return "You got it! 💪 Let me know if you need anything else.";
    }

    // 5. Fallback to smart reply
    return await generateSmartReply(user, message);
}

module.exports = { handleChat };
