-- Add user_number column to profiles table
ALTER TABLE profiles ADD COLUMN user_number INTEGER;

-- Create a sequence for user numbers
CREATE SEQUENCE user_number_seq START WITH 1;

-- Update existing users with sequential numbers
UPDATE profiles 
SET user_number = nextval('user_number_seq')
WHERE user_number IS NULL;

-- Set default for new users
ALTER TABLE profiles ALTER COLUMN user_number SET DEFAULT nextval('user_number_seq');

-- Make user_number unique and not null
ALTER TABLE profiles ALTER COLUMN user_number SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_number_unique UNIQUE (user_number);