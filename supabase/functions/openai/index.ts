import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
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

    const { message, maxTokens = 500, developer_mode = false, previousMessages = [] } = body;
    
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
      // Prepare conversation history
      const systemMessage = {
        role: "system",
        content: developer_mode 
          ? `You are Gloria, an AI tutor focused on helping with 5th grade math homework. Respond in clear, instructional English without cultural metaphors. Format your response as a JSON object with lesson_summary, steps (numbered), and optional wolfram_query for visualizations.`
          : `You are Gloria, a compassionate, culturally grounded AI tutor who helps Spanish-speaking parents support their children with 5th grade math homework. Use warm, patient Spanish with everyday examples. Format your response as a JSON object with lesson_summary, metaphor, importance, steps (numbered), and optional wolfram_query and send_to_voice fields.`
      };

      const messages = [
        systemMessage,
        {
          role: "system",
          content: "You are Gloria, a helpful AI assistant focused on providing accurate and concise information about mathematics problems. When analyzing images, focus on identifying and explaining mathematical concepts, equations, and problem-solving steps. Maintain context from previous messages to provide coherent responses."
        },
        // Include previous messages in the conversation
        ...previousMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
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
      ];

      const completion = await openai.chat.completions.create({
        model: isImageMessage ? "gpt-4-vision-preview" : "gpt-3.5-turbo-0125",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      // Get the raw response content
      const rawResponse = completion.choices[0].message.content;
      
      // Try to parse the response as JSON first
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch (e) {
        // If not JSON, split into steps as before
        const steps = rawResponse.split(/\n(?=\d+[\).]|Step \d+:)/)
          .filter(step => step.trim())
          .map((content, index) => ({
            step_number: index + 1,
            content: content.trim().replace(/^\d+[\).]|Step \d+:\s*/, '')
          }));

        parsedResponse = {
          steps,
          send_to_voice: true
        };
      }

      const response = {
        content: JSON.stringify(parsedResponse),
        steps: parsedResponse.steps,
        send_to_voice: parsedResponse.send_to_voice
      };

      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
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