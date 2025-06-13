import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        // Log auth role for debugging
        console.log('Auth role:', await supabase.auth.getSession().then(session => session?.user?.role || 'unknown'));

        // Log full event for debugging
        console.log('Event:', JSON.stringify(event, null, 2));

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Body parse error:', parseError);
            throw new Error('Invalid request body');
        }

        const { bucket, fileName, fileBody, contentType } = body;

        // Log input for debugging
        console.log('Upload request:', { bucket, fileName, contentType });

        // Validate bucket name
        if (!['icons', 'apks'].includes(bucket)) {
            throw new Error(`Invalid bucket: ${bucket}`);
        }

        // Validate fileName and fileBody
        if (!fileName || !fileBody) {
            throw new Error('Missing fileName or fileBody');
        }

        // Convert base64 to buffer
        let buffer;
        try {
            buffer = Buffer.from(fileBody, 'base64');
        } catch (base64Error) {
            console.error('Base64 decode error:', base64Error);
            throw new Error('Invalid base64 fileBody');
        }

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, buffer, { contentType: contentType, upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

        // Log success
        console.log('File uploaded successfully:', { publicUrl });

        return {
            statusCode: 200,
            body: JSON.stringify({ publicUrl })
        };
    } catch (err) {
        console.error('Handler error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};