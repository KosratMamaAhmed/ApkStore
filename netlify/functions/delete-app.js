import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
    try {
        const { id } = JSON.parse(event.body);
        const { error } = await supabase.from('apps').delete().eq('id', id);
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ message: 'Deleted' }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};