import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Extracts and verifies JWT from Authorization header.
 * Returns the authenticated user or an error Response.
 */
export async function getAuthUser(req: Request): Promise<AuthUser | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('Token de autenticação não fornecido', 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    return errorResponse('Token inválido ou expirado', 401);
  }

  return {
    id: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    role: data.claims.role as string | undefined,
  };
}

/**
 * Creates a Supabase admin client using service role key.
 */
export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}
