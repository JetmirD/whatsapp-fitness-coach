import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const FROM = Deno.env.get("TWILIO_PHONE_NUMBER")!;
const SUPABASE_URL = Deno.env.get("PROJECT_URL")!;
const SUPABASE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async () => {
  console.log("📤 Sending daily reminders...", SUPABASE_URL, SUPABASE_KEY);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    return new Response("❌ Failed to fetch users", { status: 500 });
  }

  const users = await res.json();

  for (const user of users) {
    const now = new Date();
const currentHour = now.getUTCHours(); /
console.log(`Current hour: ${currentHour}`);
if (user.preferred_hour !== null && user.preferred_hour !== currentHour) {
  console.log(`⏭️ Skipping ${user.phone_number} – prefers ${user.preferred_hour}:00`);
  continue;
}

    const name = user.name || "champ";
    const to = user.phone_number;

    const messages = [
      `Hey ${name}! 💪 Ready to crush your goals today? Type "plan" and I’ll get your workout ready.`,
      `🚀 Let's get stronger, ${name}! Want today's workout? Just type "plan".`,
      `🌞 Good morning, ${name}! It's time to move! Text me "plan" and let’s start.`,
      `🏋️ Your fitness journey continues, ${name}! Type "plan" to stay on track.`,
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    console.log(`📨 MOCK SEND to ${to}: ${message}`);

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: FROM,
        To: to,
        Body: message,
      }),
    });
   }

  return new Response("✅ Reminders sent!", { status: 200 });
});
