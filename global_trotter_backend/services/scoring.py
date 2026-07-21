def score_destination(user, dest, user_itineraries, favorite_destinations=None):
    score = 0
    reasons = []
    prefs = user.get("preferences", {})
    favorite_destinations = favorite_destinations or []

    style_overlap = set(prefs.get("travel_style", [])) & set(dest["tags"])
    if style_overlap:
        score += 10 * len(style_overlap)
        reasons.append(f"matches your interest in {', '.join(sorted(style_overlap))}")

    if prefs.get("budget") and prefs["budget"] == dest["budget_level"]:
        score += 15
        reasons.append("matches your budget")

    if prefs.get("preferred_area") and prefs["preferred_area"] == dest["area"]:
        score += 10
        reasons.append("close to an area you prefer")

    past_tags = [t for itin in user_itineraries for t in itin.get("tags", [])]
    past_overlap = set(past_tags) & set(dest["tags"])
    if past_overlap:
        score += 5 * len(past_overlap)
        reasons.append("similar to trips you've taken before")

    favorite_tags = [t for fav in favorite_destinations for t in fav.get("tags", [])]
    favorite_overlap = set(favorite_tags) & set(dest["tags"])
    if favorite_overlap:
        score += 7 * len(favorite_overlap)
        reasons.append("similar to destinations you've favorited")

    rating = dest.get("rating", {})
    if rating.get("count"):
        score += rating.get("average", 0) * 2
        reasons.append("highly rated by other travelers")

    return score, reasons


def get_recommendations(user, destinations, user_itineraries, favorite_destinations=None, limit=5):
    visited_ids = {d for itin in user_itineraries for d in itin.get("destinations", [])}
    favorite_destinations = favorite_destinations or []

    scored = []
    for dest in destinations:
        if dest["id"] in visited_ids:
            continue
        score, reasons = score_destination(user, dest, user_itineraries, favorite_destinations)
        scored.append({
            "destination_id": dest["id"],
            "name": dest["name"],
            "score": round(score, 2),
            "reasons": reasons,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]