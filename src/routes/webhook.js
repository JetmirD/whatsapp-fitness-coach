const express = require('express');
const router = express.Router();
const { getOrCreateUser, updateUserField, updateOnboardingStep } = require('../services/userService');
const { logMessage } = require('../services/messageService');
const { generateSmartReply, sendToLLM } = require('../services/aiService');
const { handleWorkoutLogging } = require('../services/streakService');
const { detectMealInfo, logMeal, getMealsForUserThisWeek } = require('../services/mealService');
const supabase = require('../db/supabase');
const extractName = require('../helpers/nameExtract');
const { classifyImageFromUrl } = require('../services/imageService');
const { isWeeklyMealRequest } = require('../helpers/messageType');

const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function isFitnessRelated(userMessage) {
  const prompt = `
You are a strict assistant that only answers YES or NO.

The user says: "${userMessage}"

Question: Is the user asking about FITNESS, WORKOUTS, EXERCISES, GYM, HEALTHY LIFESTYLE, NUTRITION, or MOTIVATION?

- If yes, answer "YES".
- If no, answer "NO".
Do not explain anything, just reply YES or NO.
  `.trim();

  const response = await sendToLLM(prompt);
  return response.trim().toUpperCase() === 'YES';
}

router.post('/', async (req, res) => {
  const phoneNumber = req.body.From;
  const message = req.body.Body?.trim() || '';

  if (phoneNumber === TWILIO_NUMBER) return res.status(200).send('<Response></Response>');

  const user = await getOrCreateUser(phoneNumber);
  await logMessage(user.id, message, 'inbound');

  let replyText = '';
  const step = user.onboarding_step;

  // === ONBOARDING FLOW ===
  if (step === 'name' && !user.name) {
    replyText = `Hi there! 👋 I'm your fitness coach. What’s your name?`;
    await updateOnboardingStep(user.id, 'awaiting_name');

  } else if (step === 'awaiting_name') {
    const name = extractName(message);
    await updateUserField(user.id, 'name', name);
    await updateOnboardingStep(user.id, 'goal');
    replyText = `Nice to meet you, ${name}! 🎉 What’s your fitness goal? (e.g., lose weight, gain muscle)`;

  } else if (step === 'goal') {
    await updateUserField(user.id, 'goal', message);
    await updateOnboardingStep(user.id, 'intensity');
    replyText = `Awesome! Your goal is "${message}" 💪 What's your fitness level? (beginner / intermediate / advanced)`;

  } else if (step === 'intensity') {
    await supabase.from('preferences').insert([{ user_id: user.id, intensity_level: message }]);
    await updateOnboardingStep(user.id, 'preferred_hour');
    replyText = `Great! ⏰ Last step — when should I send your daily workout reminder? (0–23, e.g., 9 for 9AM)`;

  } else if (step === 'preferred_hour') {
    const hour = parseInt(message);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      await updateUserField(user.id, 'preferred_hour', hour);
      await updateOnboardingStep(user.id, 'location');
      replyText = `⏰ Noted! I'll remind you daily at ${hour}:00. Do you work out at home or at the gym? 🏠🏋️‍♂️`;
    } else {
      replyText = `Oops, please enter a number between 0 and 23.`;
    }

  } else if (step === 'location') {
    const loc = message.toLowerCase();
    if (loc.includes('home') || loc.includes('gym')) {
      const location = loc.includes('home') ? 'home' : 'gym';
      await updateUserField(user.id, 'location', location);
      await updateOnboardingStep(user.id, 'done');
      replyText = `Awesome! ✅ You're all set, ${user.name}. Let's crush it together! Type anything to get started.`;
    } else {
      replyText = `Where do you usually work out — at home or at the gym?`;
    }

  } else {
    // === MAIN FUNCTIONALITY ===

    // 1. If image sent
    if (parseInt(req.body.NumMedia || '0') > 0) {
      const imageUrl = req.body.MediaUrl0;
      const result = await classifyImageFromUrl(imageUrl);

      if (!result) {
        replyText = "Sorry, I couldn't recognize the image clearly. Try sending another one! 📸";
      } else {
        replyText = `📷 I think this is *${result.label}* (${Math.round(result.confidence * 100)}% confidence).\n\nNeed tips on it? Just ask!`;
      }

      await logMessage(user.id, replyText, 'outbound');
      const reply = `<Response><Message>${replyText}</Message></Response>`;
      res.set('Content-Type', 'text/xml');
      return res.send(reply);
    }

    // 2. Weekly meal summary?
    if (await isWeeklyMealRequest(message)) {
      const meals = await getMealsForUserThisWeek(user.id);

      if (!meals || meals.length === 0) {
        replyText = `I couldn’t find any meals logged this week. Want to start by logging something now? 🍽️`;
      } else {
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
        
        
        
        
        replyText = await sendToLLM(summaryPrompt);
      }

    } else {
      // 3. Workout streak logging
      const streakMessage = await handleWorkoutLogging(user, message);
      if (streakMessage) {
        replyText = streakMessage;

      } else {
        // 4. Meal logging
        const mealInfo = await detectMealInfo(message);
        if (mealInfo) {
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

          replyText = await sendToLLM(mealPrompt);

        } else {
          const isFitness = await isFitnessRelated(message);
          if (!isFitness) {
            replyText = `I’m here to help with fitness, nutrition, and your health goals — nothing else for now. Let’s keep our focus strong! 💪`;
          } else {
            replyText = await generateSmartReply(user, message);
          }
        }
      }
    }
  }

  await logMessage(user.id, replyText, 'outbound');
  const reply = `<Response><Message>${replyText}</Message></Response>`;
  res.set('Content-Type', 'text/xml');
  return res.send(reply);
});

module.exports = router;
