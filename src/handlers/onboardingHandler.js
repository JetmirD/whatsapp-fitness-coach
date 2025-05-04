const { updateUserField, updateOnboardingStep } = require('../services/userService');
const supabase = require('../db/supabase');
const extractName = require('../helpers/nameExtract');

async function handleOnboarding(user, message) {
  const step = user.onboarding_step;
  const lower = message.trim().toLowerCase();
  let replyText = null;

  if (step === 'name' && !user.name) {
    await updateOnboardingStep(user.id, 'awaiting_name');
    replyText = `Hiii there! 👋 I'm your fitness coach. What’s your name?`;

  } else if (step === 'awaiting_name') {
    const name = extractName(message);
    const isValidName = (input) => {
      const qWords = ['what', 'why', 'how', 'when', 'where', 'are', 'who'];
      return (
        !input.endsWith('?') &&
        input.split(' ').length <= 3 &&
        input.length >= 2 &&
        !qWords.some(w => input.includes(w))
      );
    };

    if (!isValidName(name)) {
      replyText = `Hmm, that doesn't sound like a name. Could you please just tell me your first name? 😊`;
    } else {
      await updateUserField(user.id, 'name', name);
      await updateOnboardingStep(user.id, 'goal');
      replyText = `Nice to meet you, ${name}! 🎉 What’s your fitness goal? (e.g., lose weight, gain muscle)`;
    }

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
    const normalized = lower.replace(/[^\w\s]/gi, '');
    if (/\b(home|house|apartment)\b/.test(normalized)) {
      await updateUserField(user.id, 'location', 'home');
      await updateOnboardingStep(user.id, 'done');
      replyText = `Awesome! ✅ You're all set, ${user.name}. Let's crush it together! Type anything to get started.`;
    } else if (/\b(gym|fitness|club|workout center)\b/.test(normalized)) {
      await updateUserField(user.id, 'location', 'gym');
      await updateOnboardingStep(user.id, 'done');
      replyText = `Awesome! ✅ You're all set, ${user.name}. Let's crush it together! Type anything to get started.`;
    } else {
      replyText = `Just to confirm — do you usually work out *at home* or *at the gym*? 🏠🏋️‍♂️`;
    }
  }

  return replyText;
}

module.exports = { handleOnboarding };
