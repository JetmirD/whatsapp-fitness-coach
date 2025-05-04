// imageHandler.js
const { classifyImageFromUrl } = require('../services/imageService');
const { sendToLLM } = require('../services/aiService');
const { updateUserField } = require('../services/userService');
const { logMessage } = require('../services/messageService');

async function handleImage(user, imageUrl) {
  console.log("🔍 Handling image for:", user?.name || user?.id);

  const result = await classifyImageFromUrl(imageUrl);

  if (!result || !result.label) {
    return "Sorry, I couldn't recognize the image clearly. Try sending another one! 📸";
  }

  const label = result.label;
  const confidence = Math.round(result.confidence * 100);

  // Save the label to user context
  await updateUserField(user.id, 'last_image_label', label);

  // Generate fitness-relevant tips
  const tipPrompt = `
You are a fitness nutrition coach.

The user just sent a picture of: ${label}.
Their fitness goal is: ${user.goal}.
Their level is: ${user.intensity_level || 'beginner'}.
They work out at: ${user.location || 'not specified'}.

Based on this, write a SHORT and CLEAR fitness-specific tip (1–2 sentences):
- Include a rough calorie estimate if possible.
- Say whether it's good or bad for their goal (e.g. bulking, fat loss).
- Do NOT describe the recipe or how to cook it.
- Keep it relevant, warm, and practical. Mix emojis naturally.
`.trim();

  const tipReply = await sendToLLM(tipPrompt);

  return `📷 That looks like *${label}.\n\n${tipReply}`;
}

module.exports = { handleImage };
