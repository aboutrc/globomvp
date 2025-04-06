import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const models = await openai.models.list();
    
    // Filter and sort models
    const relevantModels = models.data
      .map(model => model.id)
      .filter(id => id.startsWith('gpt-'))
      .sort();

    return new Response(
      JSON.stringify({ 
        models: relevantModels,
        status: "success" 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error("Error listing models:", error);
    
    const errorResponse = {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      status: "error"
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