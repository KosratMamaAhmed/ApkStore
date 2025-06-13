import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
    try {
        const { id } = JSON.parse(event.body);
        const { data, error } = await supabase.rpc('increment_downloads', { app_id: id });
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ downloads: data }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};