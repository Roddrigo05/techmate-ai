import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { problemDescription, machineName, machineLocation } = await req.json();
    
    if (!problemDescription) {
      console.error('No problem description provided');
      throw new Error('Problem description is required');
    }

    console.log('Generating solution for problem:', problemDescription.substring(0, 100) + '...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um especialista em manutenção industrial com vasta experiência em diagnóstico e resolução de problemas de máquinas. 

Sua tarefa é analisar problemas reportados por técnicos e fornecer soluções práticas e detalhadas.

Sempre estruture sua resposta da seguinte forma:
1. **Diagnóstico**: Análise breve do problema
2. **Causa Provável**: O que pode estar causando o problema
3. **Solução Recomendada**: Passos detalhados para resolver
4. **Prevenção**: Como evitar que o problema ocorra novamente
5. **Peças Necessárias**: Lista de peças que podem ser necessárias (se aplicável)

Seja conciso mas completo. Use linguagem técnica apropriada.`;

    const userPrompt = `Máquina: ${machineName || 'Não especificada'}
Localização: ${machineLocation || 'Não especificada'}

Problema Reportado:
${problemDescription}

Por favor, forneça uma solução detalhada para este problema.`;

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const result = await response.json();
    const solution = result.choices?.[0]?.message?.content;
    
    console.log('Solution generated successfully');

    return new Response(
      JSON.stringify({ solution }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Solution generation error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
