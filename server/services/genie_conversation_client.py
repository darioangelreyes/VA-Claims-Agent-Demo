"""
Databricks Genie Conversation API (server-side). Same flow as Supply Chain Control Tower:
start-conversation / create-message / get-message. Token never sent to the browser.
"""
from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import urlparse

import httpx


def _token() -> str:
    return (os.getenv("DATABRICKS_TOKEN") or os.getenv("DATABRICKS_ACCESS_TOKEN") or "").strip()


def _workspace_host() -> str:
    """Netloc only, e.g. fevm-....cloud.databricks.com"""
    raw = (os.getenv("DATABRICKS_HOST") or "").strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = f"https://{raw}"
    p = urlparse(raw)
    return (p.netloc or "").strip().lower()


def _base_url() -> str:
    h = _workspace_host()
    return f"https://{h}" if h else ""


def _parse_space_id_from_url(url: str) -> str | None:
    if not url:
        return None
    m = re.search(r"/genie/(?:spaces|rooms)/([a-fA-F0-9]+)", url)
    return m.group(1) if m else None


def get_genie_space_id() -> str:
    explicit = (os.getenv("DATABRICKS_GENIE_SPACE_ID") or os.getenv("GENIE_SPACE_ID") or "").strip()
    if explicit:
        return explicit
    for key in ("DATABRICKS_GENIE_SPACE_URL", "GENIE_SPACE_URL"):
        parsed = _parse_space_id_from_url(os.getenv(key) or "")
        if parsed:
            return parsed
    return ""


def is_configured() -> bool:
    return bool(_base_url() and _token() and get_genie_space_id())


def start_conversation(space_id: str, content: str) -> dict[str, Any]:
    url = f"{_base_url()}/api/2.0/genie/spaces/{space_id}/start-conversation"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            json={"content": content},
            headers={"Authorization": f"Bearer {_token()}"},
        )
        r.raise_for_status()
        return r.json()


def create_message(space_id: str, conversation_id: str, content: str) -> dict[str, Any]:
    url = (
        f"{_base_url()}/api/2.0/genie/spaces/{space_id}/conversations/"
        f"{conversation_id}/messages"
    )
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            json={"content": content},
            headers={"Authorization": f"Bearer {_token()}"},
        )
        r.raise_for_status()
        return r.json()


def get_message(space_id: str, conversation_id: str, message_id: str) -> dict[str, Any]:
    url = (
        f"{_base_url()}/api/2.0/genie/spaces/{space_id}/conversations/"
        f"{conversation_id}/messages/{message_id}"
    )
    with httpx.Client(timeout=30.0) as client:
        r = client.get(url, headers={"Authorization": f"Bearer {_token()}"})
        r.raise_for_status()
        return r.json()
