import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// validaciones
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        'Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env'
    );
}

// cliente de supabase 
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});