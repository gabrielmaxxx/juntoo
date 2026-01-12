
-- =============================================
-- CORREÇÃO 1: Função get_complete_schema com search_path
-- =============================================

-- Primeiro, vamos verificar e recriar a função com search_path definido
CREATE OR REPLACE FUNCTION public.get_complete_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    result jsonb;
BEGIN
    -- Get all enums
    WITH enum_types AS (
        SELECT 
            t.typname as enum_name,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
    )
    SELECT jsonb_build_object(
        'enums',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'name', enum_name,
                    'values', to_jsonb(enum_values)
                )
            ),
            '[]'::jsonb
        )
    )
    FROM enum_types
    INTO result;

    -- Get all tables with their details
    WITH RECURSIVE 
    columns_info AS (
        SELECT 
            c.oid as table_oid,
            c.relname as table_name,
            a.attname as column_name,
            format_type(a.atttypid, a.atttypmod) as column_type,
            a.attnotnull as notnull,
            pg_get_expr(d.adbin, d.adrelid) as column_default,
            CASE 
                WHEN a.attidentity != '' THEN true
                WHEN pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%' THEN true
                ELSE false
            END as is_identity,
            EXISTS (
                SELECT 1 FROM pg_constraint con 
                WHERE con.conrelid = c.oid 
                AND con.contype = 'p' 
                AND a.attnum = ANY(con.conkey)
            ) as is_pk
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND a.attnum > 0 
        AND NOT a.attisdropped
    ),
    tables_combined AS (
        SELECT 
            ci.table_name,
            jsonb_agg(
                jsonb_build_object(
                    'name', ci.column_name,
                    'type', ci.column_type,
                    'nullable', NOT ci.notnull,
                    'default', ci.column_default,
                    'is_identity', ci.is_identity,
                    'is_pk', ci.is_pk
                )
            ) as columns
        FROM columns_info ci
        GROUP BY ci.table_name
    )
    SELECT result || jsonb_build_object(
        'tables',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'name', table_name,
                    'columns', columns
                )
            ),
            '[]'::jsonb
        )
    )
    FROM tables_combined
    INTO result;

    RETURN result;
END;
$function$;

-- =============================================
-- CORREÇÃO 2: Função para verificar se é service role (para notificações do sistema)
-- =============================================

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
$$;

-- =============================================
-- CORREÇÃO 3: Remover política permissiva e criar política restritiva para notifications
-- =============================================

-- Primeiro, remover a política atual que permite qualquer inserção
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Criar política que só permite inserções via service_role (edge functions)
-- OU permite que usuários criem notificações para si mesmos (caso seja necessário)
CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_service_role() OR auth.uid() = user_id
);

-- =============================================
-- CORREÇÃO 4: Atualizar user_wants_notification para ter search_path
-- =============================================

CREATE OR REPLACE FUNCTION public.user_wants_notification(p_type text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p_type LIKE 'event_reminder%' THEN COALESCE((SELECT event_reminder FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'friend_request' THEN COALESCE((SELECT friend_request FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'new_event' THEN COALESCE((SELECT new_event FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'event_updated' THEN COALESCE((SELECT event_updated FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'new_message' THEN COALESCE((SELECT new_message FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'participant_joined' THEN COALESCE((SELECT participant_joined FROM notification_preferences WHERE user_id = p_user_id), true)
    WHEN p_type = 'event_join' THEN COALESCE((SELECT event_join FROM notification_preferences WHERE user_id = p_user_id), true)
    ELSE true
  END
$$;
