function formatDate(iso) {
    if (!iso) return 'Never';
    const date = new Date(iso);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  function getUserProgressSummary(user) {
    return `📊 Here's your progress, ${user.name}!\n\n` +
      `🎯 Goal: ${user.goal || 'Not set'}\n` +
      `🔥 Streak: ${user.streak || 0} day(s)\n` +
      `✅ Last workout: ${formatDate(user.last_completed_date)}\n` +
      `🏋️ Location: ${user.location || 'Not set'}\n` +
      `⏰ Reminder: ${user.preferred_hour !== null ? `${user.preferred_hour}:00` : 'Not set'}\n\n` +
      `Stay consistent and keep crushing it! 💪`;
  }
  
  module.exports = getUserProgressSummary;
  