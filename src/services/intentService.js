const { HfInference } = require("@huggingface/inference");
const hf = new HfInference(process.env.HF_API_KEY); 

async function isWorkoutConfirmed(message) {
  const text = message.toLowerCase();

  if (!text.includes('work') && !text.includes('train') && !text.includes('gym') && !text.includes('exercise') && !text.includes('crushed') && !text.includes('smashed')) {
    return false;
  }

  try {
    const result = await hf.textClassification({
      model: 'distilbert-base-uncased-finetuned-sst-2-english',
      inputs: message
    });
    console.log("REZULTATI I HUGGING FACE", result);

    const confidence = result[0]?.score || 0;
    const label = result[0]?.label;

    return label === "POSITIVE" && confidence > 0.9;
  } catch (err) {
    console.error("NLP failed:", err.message);
    return false;
  }
}

async function isProgressRequest(message) {
  const text = message.toLowerCase();

  // Keyword check
  const keywords = ['progress', 'stats', 'streak', 'how am i doing', 'show progress', 'show my stats'];
  if (keywords.some(k => text.includes(k))) return true;

  try {
    const result = await hf.textClassification({
      model: 'distilbert-base-uncased-finetuned-sst-2-english',
      inputs: message
    });

    const label = result[0]?.label;
    const confidence = result[0]?.score || 0;
    return label === "POSITIVE" && confidence > 0.95 && text.includes("how");
  } catch (err) {
    console.error("Progress intent NLP failed:", err.message);
    return false;
  }
}

module.exports = {
  isWorkoutConfirmed,
  isProgressRequest,
};
