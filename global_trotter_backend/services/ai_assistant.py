import json

import requests

from config import Config
from services.storage import load_json

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are the travel assistant built into GlobalTrotter, an app that recommends places to visit in and around Yaounde, Cameroon.

You will receive a free-text request from a user and a list of destinations available in the app, each with an id, name, type, area, tags, budget_level and description.

Do the following:
1. Decide whether the request is actually about travel, places to visit, or things to do (in_scope: true), or whether it is unrelated to travel (in_scope: false), for example coding help, homework, general chit-chat, or anything else this app is not built for.
2. If in_scope is true, choose the destination ids, from the provided list only, that best match what the user described. Return an empty list if nothing fits well.
3. Write a short, friendly one or two sentence "message" for the user:
   - If in_scope is true and you found matches, a short intro to the results.
   - If in_scope is true but nothing matches, a short, kind note that nothing fits yet and maybe suggest they rephrase.
   - If in_scope is false, a short, light-hearted refusal that makes clear you can only help with travel and destination requests for this app.

Respond ONLY with valid JSON, no markdown formatting, in exactly this shape:
{"in_scope": true, "message": "your message here", "destination_ids": ["dest_001"]}
"""


def _destination_summaries():
    destinations = load_json("destinations.json")["destinations"]
    return [
        {
            "id": d["id"],
            "name": d["name"],
            "type": d.get("type"),
            "area": d.get("area"),
            "tags": d.get("tags", []),
            "budget_level": d.get("budget_level"),
            "description": d.get("description", "")
        }
        for d in destinations
    ]


def get_ai_destination_suggestions(query):
    if not Config.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    summaries = _destination_summaries()

    payload = {
        "model": Config.OPENROUTER_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps({"user_request": query, "destinations": summaries})
            }
        ]
    }

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=30
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(content)
    except (ValueError, KeyError):
        return {
            "in_scope": True,
            "message": "I couldn't quite process that, could you rephrase what you're looking for?",
            "destination_ids": []
        }

    valid_ids = {d["id"] for d in summaries}
    destination_ids = [d_id for d_id in parsed.get("destination_ids", []) if d_id in valid_ids]

    return {
        "in_scope": bool(parsed.get("in_scope", True)),
        "message": parsed.get("message", ""),
        "destination_ids": destination_ids
    }