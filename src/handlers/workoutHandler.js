
const { handleWorkoutLogging } = require('../services/streakService');
const { logMessage } = require('../services/messageService');

async function handleWorkout(user, message) {
  const reply = await handleWorkoutLogging(user, message);

  if (reply) {
    await logMessage(user.id, reply, 'outbound');
    return reply;
  }

  return null;
}

module.exports = { handleWorkout };
