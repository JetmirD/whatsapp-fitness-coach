// src/services/classifyService.js
const axios = require('axios');
const CLARIFAI_GENERAL_MODEL = 'food-item-recognition'; // or another depending on the case

const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
const CLARIFAI_USER_ID = process.env.CLARIFAI_USER_ID;
const CLARIFAI_APP_ID = process.env.CLARIFAI_APP_ID;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function captionImageFromUrl(imageUrl) {
    try {
      const imageRes = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: TWILIO_SID,
          password: TWILIO_TOKEN,
        },
      });
  
      const base64Image = Buffer.from(imageRes.data, 'binary').toString('base64');
  
      const clarifaiRes = await axios.post(
        `https://api.clarifai.com/v2/models/${CLARIFAI_GENERAL_MODEL}/outputs`,
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
  
      console.log('🔍 Detected concept:', topConcept.name, topConcept.value);
  
      return {
        label: topConcept.name,
        confidence: topConcept.value,
      };
    } catch (error) {
      console.error('❌ Error classifying image:', error.message);
      return null;
    }
  }
module.exports = { captionImageFromUrl };
