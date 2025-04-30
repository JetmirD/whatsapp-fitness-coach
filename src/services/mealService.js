const axios = require('axios');
const supabase = require('../db/supabase');

const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_API_KEY = process.env.NUTRITIONIX_API_KEY;

// Function to detect meal + calories
async function detectMealInfo(text) {
  try {
    console.log('🔍 Detecting meal info:', text);
    const response = await axios.post(
      'https://trackapi.nutritionix.com/v2/natural/nutrients',
      { query: text },
      {
        headers: {
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
console.log('🔍 Nutritionix response:', response.data);
    const food = response.data.foods?.[0];
    if (!food) return null;

    return {
      meal_type: food.food_name,
      calories_estimate: Math.round(food.nf_calories),
    };
  } catch (err) {
    console.error('❌ Error detecting meal:', err.message);
    return null;
  }
}

async function logMeal(userId, mealInfo) {
  try {
    const isHealthy = mealInfo.calories_estimate <= 400; 

    const { error } = await supabase.from('meals').insert([
      {
        user_id: userId,
        meal_type: mealInfo.meal_type,
        calories_estimate: mealInfo.calories_estimate,
        healthy: isHealthy,
      },
    ]);

    if (error) throw error;

    return isHealthy;
  } catch (err) {
    console.error('❌ Error logging meal:', err.message);
    return false;
  }
}
async function getMealsForUserThisWeek(userId) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) 
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching weekly meals:', error.message);
    return [];
  }

  return data;
}

module.exports = {
  detectMealInfo,
  logMeal,
  getMealsForUserThisWeek
};


