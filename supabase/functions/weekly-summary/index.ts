import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  console.log('📈 Starting Weekly Summary job...');

  const { data: users, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    return new Response('Error fetching users', { status: 500 });
  }

  for (const user of users) {
    try {
      const phone = user.phone;
      const userId = user.id;

      const { data: workouts } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'inbound')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .ilike('body', '%trained%') 
      
      // 2. Fetch healthy meals
      const { data: healthyMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId)
        .eq('healthy', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // 3. Fetch unhealthy meals
      const { data: unhealthyMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId)
        .eq('healthy', false)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const workoutsCompleted = workouts?.length || 0;
      const healthyCount = healthyMeals?.length || 0;
      const unhealthyCount = unhealthyMeals?.length || 0;

      let summary = `📊 Here's your weekly check-in! \n\n`;
      summary += `• Workouts crushed: ${workoutsCompleted}\n`;
      summary += `• Healthy meals enjoyed: ${healthyCount}\n`;
      summary += `• Little treats indulged: ${unhealthyCount}\n\n`;
      
      if (workoutsCompleted >= 4) {
        summary += `You're smashing it! Keep up the momentum! 🔥💪`;
      } else {
        summary += `Let's turn it up next week! 🚀 You've got this!`;
      }
      

      if (workoutsCompleted >= 4) {
        summary += `Amazing consistency this week! 💪 Keep it up!`;
      } else {
        summary += `Let's aim for even more next week! 🚀 I'm here to support you!`;
      }

      // 5. Send WhatsApp message
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioPhoneNumber}`,
          To: `whatsapp:${phone}`,
          Body: summary,
        }),
      });

      console.log(`✅ Sent weekly summary to ${phone}`);

    } catch (err) {
      console.error('❌ Error sending summary to user:', err.message);
    }
  }

  return new Response('Weekly Summary done.', { status: 200 });
});
