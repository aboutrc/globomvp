import OpenAI from "npm:openai@4.28.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }
  try {
    // Verify environment variables are set
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid request body');
    }
    const { message, maxTokens = 500 } = body;
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
    const isImageMessage = body.isImage === true;
    let processedMessage = message.trim();
    let imageUrl;
    // Handle image messages
    if (isImageMessage) {
      if (!message.startsWith('[PHOTO]')) {
        throw new Error('Invalid image format');
      }
      imageUrl = message.substring(7).trim(); // Remove [PHOTO] prefix and trim
      if (!imageUrl) {
        throw new Error('Image URL is missing');
      }
    } else if (message.length > 4000) {
      throw new Error('Message is too long. Please limit your message to 4000 characters.');
    }
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });
    try {
      // Use gpt-4o for image analysis and gpt-3.5-turbo for text
      const modelForImage = "gpt-4o";
      const regularModel = "gpt-3.5-turbo-0125";
      const completion = await openai.chat.completions.create({
        model: isImageMessage ? modelForImage : regularModel,
        messages: [
          {
            role: "system",
            content: "You are Gloria, a helpful AI assistant focused on providing accurate and concise information about mathematics problems. When analyzing images, focus on identifying and explaining mathematical concepts, equations, and problem-solving steps."
          },
          {
            role: "user",
            content: isImageMessage ? [
              {
                type: "text",
                text: "Por favor, analiza esta imagen y explícame el problema matemático que ves:"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "auto"
                }
              }
            ] : processedMessage
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });
      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }
      const response = completion.choices[0].message;
      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    } catch (openaiError) {
      console.error("OpenAI API Error:", {
        message: openaiError.message,
        response: openaiError.response?.data,
        status: openaiError.status
      });
      // Extract and format specific OpenAI error messages
      let errorMessage = 'OpenAI API error';
      if (openaiError.error) {
        const error = openaiError.error;
        if (error.code === 'rate_limit_exceeded') {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.code === 'invalid_api_key') {
          errorMessage = 'Invalid API key. Please check your OpenAI configuration.';
        } else if (error.message?.includes('does not exist') || error.message?.includes('do not have access')) {
          errorMessage = error.message || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error:", {
      message: error.message,
      stack: error.stack
    });
    const errorResponse = {
      error: error.message,
      details: error.error || null,
      status: "error"
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
