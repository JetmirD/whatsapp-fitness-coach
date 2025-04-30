const supabase = require('../db/supabase');

async function getOrCreateUser(phoneNumber) {

  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('SELECT error:', selectError.message);
  }

  if (existingUser) {
    return existingUser;
  }


  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([{ phone_number: phoneNumber }])
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {

      const { data: retryUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      return retryUser;
    }

    console.error('INSERT error:', insertError.message);
    return null;
  }

  return newUser;
}

async function updateUserField(userId, field, value) {
  const { error } = await supabase
    .from('users')
    .update({ [field]: value })
    .eq('id', userId);

  if (error) {
    console.error(`🛑 Failed to update ${field}:`, error.message);
  }
}
async function updateOnboardingStep(userId, step) {
  const { error } = await supabase
    .from('users')
    .update({ onboarding_step: step })
    .eq('id', userId);

  if (error) {
    console.error(`Failed to update onboarding_step to ${step}:`, error.message);
  }
}



module.exports = {
  getOrCreateUser,
  updateUserField,
  updateOnboardingStep
};
