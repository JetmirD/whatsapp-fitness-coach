const axios = require('axios');

const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
const CLARIFAI_USER_ID = process.env.CLARIFAI_USER_ID;
const CLARIFAI_APP_ID = process.env.CLARIFAI_APP_ID;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;

const MODELS = {
  food: 'food-item-recognition',
  general: 'general-image-recognition',
};

async function classifyImageFromUrl(imageUrl) {
  try {
    const imageRes = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: TWILIO_SID,
        password: TWILIO_TOKEN,
      },
    });

    const base64Image = Buffer.from(imageRes.data, 'binary').toString('base64');

    let foodResult = await queryClarifaiModel(base64Image, MODELS.food);

    if (foodResult && foodResult.confidence > 0.8) {
      console.log('🍕 Detected food:', foodResult);
      return {
        type: 'food',
        ...foodResult,
      };
    }

    let generalResult = await queryClarifaiModel(base64Image, MODELS.general);

    if (generalResult) {
      console.log('🏋️ Detected general object:', generalResult);
      return {
        type: 'general',
        ...generalResult,
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Error classifying image:', error.message);
    return null;
  }
}

async function queryClarifaiModel(base64Image, modelId) {
  try {
    const clarifaiRes = await axios.post(
      `https://api.clarifai.com/v2/models/${modelId}/outputs`,
      {
        user_app_id: {
          user_id: CLARIFAI_USER_ID,
          app_id: CLARIFAI_APP_ID,
        },
        inputs: [
          {
            data: {
              image: {
                base64: base64Image,
              },
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Key ${CLARIFAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const concepts = clarifaiRes.data.outputs?.[0]?.data?.concepts || [];
    const topConcept = concepts[0];

    if (!topConcept) {
      return null;
    }

    return {
      label: topConcept.name,
      confidence: topConcept.value,
    };
  } catch (error) {
    console.error(`❌ Clarifai model ${modelId} failed:`, error.message);
    return null;
  }
}

module.exports = { classifyImageFromUrl };
