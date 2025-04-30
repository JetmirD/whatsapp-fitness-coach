function extractName(message) {
  const lower = message.toLowerCase();
  if (lower.startsWith("my name is")) {
    return message.slice(11).trim();
  } else if (lower.startsWith("i am")) {
    return message.slice(4).trim();
  } else if (lower.startsWith("i'm")) {
    return message.slice(4).trim();
  }

  return message.trim();
}

module.exports = extractName;
