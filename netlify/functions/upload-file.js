import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with the secret service role key
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handler = async (event) => {
  // 1. Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    // 2. Parse the data sent from the frontend
    const { bucket, fileName, fileBody, contentType } = JSON.parse(event.body);

    // Ensure all required data is present
    if (!bucket || !fileName || !fileBody || !contentType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required file data: bucket, fileName, fileBody, or contentType.' })
      };
    }
    
    // 3. Convert the base64 string back to a file buffer
    const buffer = Buffer.from(fileBody, 'base64');

    // 4. Upload the file to the specified Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket) // Use the bucket name sent from the frontend ('icons' or 'apks')
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: true, // If a file with the same name exists, overwrite it
      });

    if (uploadError) {
      // If the upload fails, throw an error
      throw uploadError;
    }
    
    // 5. If the upload is successful, get the public URL of the file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
        throw new Error("File uploaded, but could not generate public URL.");
    }

    // 6. Return the public URL to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ publicUrl: urlData.publicUrl }),
    };

  } catch (err) {
    console.error('Error in upload-file function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};