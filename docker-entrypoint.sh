#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/js/runtime-config.js
window.__MSWAZI_ENV__ = {
  supabaseUrl: "${SUPABASE_URL:-https://YOUR-PROJECT-REF.supabase.co}",
  supabaseAnonKey: "${SUPABASE_ANON_KEY:-YOUR-PUBLIC-ANON-KEY}",
  demoMode: ${DEMO_MODE:-true}
};
EOF

exec "$@"