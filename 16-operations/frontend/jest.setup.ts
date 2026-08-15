// The api client reads EXPO_PUBLIC_API_URL once at import time, so a stable base
// URL must exist before any test imports it; the wiring tests assert against it.
process.env.EXPO_PUBLIC_API_URL = 'http://test.local';
