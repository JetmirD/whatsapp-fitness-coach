const supabase = require('../db/supabase');

async function logMessage(userId, content, type = 'inbound') {
  const { error } = await supabase
    .from('messages')
    .insert([{ user_id: userId, content, message_type: type }]);

  if (error) {
    console.error('🧨 Error saving message log:', error.message);
  }
}

module.exports = {
  logMessage,
};
