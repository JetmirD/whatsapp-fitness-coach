const casualPatterns = [
    /\b(thanks|thank you|appreciate it|cool|great|got it|nice|ok|okay|sounds good)\b/i,
  ];
  
  module.exports = function isCasualMessage(message) {
    return casualPatterns.some((pattern) => pattern.test(message));
  };
  