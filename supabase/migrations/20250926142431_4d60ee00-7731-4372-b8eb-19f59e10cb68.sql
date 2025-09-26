-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION generate_private_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN substr(md5(random()::text || clock_timestamp()::text), 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION set_private_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_private = true AND NEW.private_code IS NULL THEN
    NEW.private_code = generate_private_code();
  ELSIF NEW.is_private = false THEN
    NEW.private_code = NULL;
  END IF;
  RETURN NEW;
END;
$$;