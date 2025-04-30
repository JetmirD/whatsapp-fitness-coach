const axios = require('axios');

const HF_API_KEY = process.env.HF_API_KEY; 
const HF_MODEL = "google/flan-t5-small"; 

async function generateAdviceFromLabel(label) {
  try {
    const prompt = `
You are a fitness and nutrition assistant.
The user sent a picture that the AI classified as: "${label}".
Based on this, tell them clearly:
- If it is gym equipment, how to use it.
- If it is food, whether it is healthy or not.
Answer short, clear, and friendly.
`;
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const generatedText = response.data[0]?.generated_text || '';
    return generatedText.trim();
  } catch (error) {
    console.error("❌ Error generating smart advice:", error.message);
    return "Sorry, I couldn't generate advice. Try again!";
  }
}

module.exports = { generateAdviceFromLabel };
