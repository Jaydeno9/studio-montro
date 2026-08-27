$SupabaseUrl = $env:SUPABASE_URL
$SupabaseAnonKey = $env:SUPABASE_ANON_KEY
$AdminEmail = $env:MONTRO_ADMIN_EMAIL
$AdminPassword = $env:MONTRO_ADMIN_PASSWORD

if (-not $SupabaseUrl) {
    throw "SUPABASE_URL is not configured"
}

if (-not $SupabaseAnonKey) {
    throw "SUPABASE_ANON_KEY is not configured"
}

if (-not $AdminEmail -or -not $AdminPassword) {
    throw "MONTRO_ADMIN_EMAIL / MONTRO_ADMIN_PASSWORD are not configured"
}