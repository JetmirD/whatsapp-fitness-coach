// src/db/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
console.log("Supabase URL:", process.env.SUPABASE_URL);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;
