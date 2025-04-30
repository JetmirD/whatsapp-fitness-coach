function isWeeklyMealRequest(message) {
    const lower = message.toLowerCase();
    return (
      lower.includes('what did i eat') ||
      lower.includes('my meals this week') ||
      lower.includes('weekly meal') ||
      lower.includes('what meals') ||
      lower.includes('show meals')
    );
  }
  
  module.exports = { isWeeklyMealRequest };
  