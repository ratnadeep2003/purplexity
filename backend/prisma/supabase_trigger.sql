-- Supabase Database Trigger to mirror auth.users into public."User"
-- You can run this in your Supabase Dashboard -> SQL Editor

-- 1. Create the function that will handle inserting new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    display_name TEXT;
    auth_provider "AuthProvider";
    raw_provider TEXT;
BEGIN
    -- Determine display name with fallbacks
    display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'preferred_username',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    -- Determine provider enum
    raw_provider := LOWER(COALESCE(
        NEW.raw_app_meta_data->>'provider',
        (NEW.raw_app_meta_data->'providers'->>0),
        'google'
    ));

    IF raw_provider LIKE '%github%' THEN
        auth_provider := 'Github'::"AuthProvider";
    ELSE
        auth_provider := 'Google'::"AuthProvider";
    END IF;

    -- Upsert into public."User" table
    INSERT INTO public."User" ("id", "supabaseId", "email", "name", "provider")
    VALUES (
        NEW.id::TEXT,
        NEW.id::TEXT,
        COALESCE(NEW.email, ''),
        display_name,
        auth_provider
    )
    ON CONFLICT ("id") DO UPDATE SET
        "email" = EXCLUDED."email",
        "name" = EXCLUDED."name",
        "provider" = EXCLUDED."provider",
        "supabaseId" = EXCLUDED."supabaseId";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if any, then create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
