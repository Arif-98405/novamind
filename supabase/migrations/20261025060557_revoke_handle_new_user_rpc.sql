/*
# Revoke direct RPC access to the profile-creation trigger function

## Why
`handle_new_user()` is a SECURITY DEFINER trigger function that fires when a
new auth user signs up. It should ONLY run via its trigger on `auth.users`,
never be called directly through the Data API (`/rest/v1/rpc/handle_new_user`).
The security advisor flagged that `authenticated` could invoke it via RPC.

## Change
Revoke EXECUTE from `authenticated` (and reaffirm revocation from PUBLIC/anon).
The trigger still works because triggers run with the function's privileges
regardless of who can CALL the function.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;