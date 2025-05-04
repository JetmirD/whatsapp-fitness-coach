const express = require('express');
const router = express.Router();
const { getOrCreateUser, updateUserField, updateOnboardingStep } = require('../services/userService');
const { logMessage } = require('../services/messageService');
const { handleOnboardingStep } = require('../handlers/onboardingHandler');
const { handleImage } = require('../handlers/imageHandler');
const { handleMeal } = require('../handlers/mealHandler');
const { handleWorkout } = require('../handlers/workoutHandler');
const { handleChat } = require('../handlers/chatHandler');

const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

router.post('/', async (req, res) => {
  const phoneNumber = req.body.From;
  const message = req.body.Body?.trim() || '';
  const numMedia = parseInt(req.body.NumMedia || '0');
  if (phoneNumber === TWILIO_NUMBER) {
return res.status(200).send('<Response></Response>');
}

  const user = await getOrCreateUser(phoneNumber);
  await logMessage(user.id, message, 'inbound');

  let replyText = '';
  const step = user.onboarding_step;

  try {
    // === 1. Onboarding ===
    if (step !== 'done') {
      replyText = await handleOnboardingStep(user, message);
    }

    // === 2. Image handling ===
    else if (numMedia > 0) {
      const imageUrl = req.body.MediaUrl0;
      replyText = await handleImage(user, imageUrl);
    }

    // === 3. Workout logging ===
    else if (!replyText) {
      replyText = await handleWorkout(user, message);
    }

    // === 4. Meal detection ===
    if (!replyText) {
      replyText = await handleMeal(user, message);
    }

    // === 5. General chat (summary, motivation, smart reply) ===
    if (!replyText) {
      replyText = await handleChat(user, message);
    }

    // === 6. Send the reply ===
    await logMessage(user.id, replyText, 'outbound');
    const twiml = `<Response><Message>${replyText}</Message></Response>`;
    res.set('Content-Type', 'text/xml');
    return res.send(twiml);
  } catch (err) {
    console.error('❌ Error in webhook handler:', err.message || err);
    const fallback = `<Response><Message>Oops! Something went wrong. Try again in a moment.</Message></Response>`;
    return res.status(200).set('Content-Type', 'text/xml').send(fallback);
  }
});

module.exports = router;
