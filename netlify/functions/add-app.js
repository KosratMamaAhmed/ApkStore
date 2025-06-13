import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
    try {
        const appData = JSON.parse(event.body);
        const { data, error } = await supabase.from('apps').insert(appData).select().single();
        if (error) throw error;
        return { statusCode: 201, body: JSON.stringify(data) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};