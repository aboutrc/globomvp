import { Configuration, OpenAIApi } from "npm:openai@3.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not set in environment variables');
    }

    // Try to initialize OpenAI and make a simple API call
    const configuration = new Configuration({
      apiKey: openaiApiKey
    });

    const openai = new OpenAIApi(configuration);

    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ],
        max_tokens: 5
      });

      if (!completion.data.choices || completion.data.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      return new Response(
        JSON.stringify({ 
          status: "success",
          message: "OpenAI API key is valid and working"
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (apiError) {
      // Handle OpenAI API specific errors
      const errorMessage = apiError.response?.data?.error?.message || apiError.message;
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }
  } catch (error) {
    console.error("API Key Check Error:", error);
    
    const errorResponse = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});