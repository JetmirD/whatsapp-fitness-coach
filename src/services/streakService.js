const supabase = require('../db/supabase');
const { isWorkoutConfirmed } = require('./intentService');

async function handleWorkoutLogging(user, message) {
  const today = new Date().toISOString().split('T')[0];

  const confirmed = await isWorkoutConfirmed(message);
  if (!confirmed || user.onboarding_step !== 'done') return null;

  if (user.last_completed_date === today) {
    return `✅ You've already logged your workout today, ${user.name}. Rest well! 🌙`;
  }

  const updatedStreak = (user.streak || 0) + 1;

  await supabase
    .from('users')
    .update({
      last_completed_date: today,
      streak: updatedStreak,
    })
    .eq('id', user.id);

  return `🔥 Workout logged, ${user.name}! You're on a ${updatedStreak}-day streak. Keep it up! 💪`;
}

module.exports = { handleWorkoutLogging };
