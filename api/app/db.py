import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    # Service-role key: server-side only, bypasses RLS. Never send this to the browser.
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


ATTACHMENTS_BUCKET = "task-attachments"
