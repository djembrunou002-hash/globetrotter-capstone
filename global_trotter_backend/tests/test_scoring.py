from services.scoring import get_recommendations, score_destination


def make_dest(id="dest_x", tags=None, budget_level="low", area="Centre-ville", rating=None):
    return {
        "id": id,
        "name": id,
        "tags": tags or [],
        "budget_level": budget_level,
        "area": area,
        "rating": rating or {"average": 0, "count": 0},
    }


# ---- travel style / budget / area preferences ----

def test_style_overlap_adds_score_and_reason():
    user = {"preferences": {"travel_style": ["nature", "food"]}}
    dest = make_dest(tags=["nature", "shopping"])

    score, reasons = score_destination(user, dest, [])

    assert score == 10  # one matching tag ("nature") * 10
    assert any("nature" in r for r in reasons)


def test_budget_match_adds_flat_bonus():
    user = {"preferences": {"budget": "low"}}
    dest = make_dest(budget_level="low")

    score, reasons = score_destination(user, dest, [])

    assert score == 15
    assert "matches your budget" in reasons


def test_preferred_area_match_adds_flat_bonus():
    user = {"preferences": {"preferred_area": "Centre-ville"}}
    dest = make_dest(area="Centre-ville")

    score, reasons = score_destination(user, dest, [])

    assert score == 10
    assert "close to an area you prefer" in reasons


def test_no_preferences_no_bonus():
    user = {"preferences": {}}
    dest = make_dest()

    score, reasons = score_destination(user, dest, [])

    assert score == 0
    assert reasons == []


# ---- past itineraries ----

def test_past_itinerary_tag_overlap_adds_score():
    user = {"preferences": {}}
    dest = make_dest(tags=["wildlife", "nature"])
    past_itineraries = [{"tags": ["wildlife"]}]

    score, reasons = score_destination(user, dest, past_itineraries)

    assert score == 5  # one overlapping tag * 5
    assert "similar to trips you've taken before" in reasons


# ---- favorites (added today) ----

def test_favorite_destination_tag_overlap_adds_score():
    user = {"preferences": {}}
    dest = make_dest(tags=["nature", "hiking"])
    favorites = [make_dest(id="dest_fav", tags=["nature"])]

    score, reasons = score_destination(user, dest, [], favorites)

    assert score == 7  # one overlapping tag * 7
    assert "similar to destinations you've favorited" in reasons


def test_no_favorites_no_favorite_bonus():
    user = {"preferences": {}}
    dest = make_dest(tags=["nature"])

    score, reasons = score_destination(user, dest, [], favorite_destinations=None)

    assert score == 0
    assert "similar to destinations you've favorited" not in reasons


# ---- ratings (added today, replaces popularity_score) ----

def test_rated_destination_gets_score_boost():
    user = {"preferences": {}}
    dest = make_dest(rating={"average": 5, "count": 10})

    score, reasons = score_destination(user, dest, [])

    assert score == 10  # average(5) * 2
    assert "highly rated by other travelers" in reasons


def test_unrated_destination_gets_no_boost():
    user = {"preferences": {}}
    dest = make_dest(rating={"average": 0, "count": 0})

    score, reasons = score_destination(user, dest, [])

    assert score == 0
    assert "highly rated by other travelers" not in reasons


def test_popularity_score_field_is_ignored_if_present():
    """
    Destinations may still have stray legacy fields from old data exports;
    scoring should never look at popularity_score even if it's there.
    """
    user = {"preferences": {}}
    dest = make_dest()
    dest["popularity_score"] = 999

    score, _ = score_destination(user, dest, [])

    assert score == 0


# ---- get_recommendations ----

def test_recommendations_excludes_visited_destinations():
    user = {"preferences": {}}
    destinations = [make_dest(id="dest_1"), make_dest(id="dest_2")]
    itineraries = [{"destinations": ["dest_1"]}]

    results = get_recommendations(user, destinations, itineraries)

    ids = [r["destination_id"] for r in results]
    assert "dest_1" not in ids
    assert "dest_2" in ids


def test_recommendations_sorted_by_score_descending():
    user = {"preferences": {"travel_style": ["nature"]}}
    destinations = [
        make_dest(id="dest_low", tags=[]),
        make_dest(id="dest_high", tags=["nature"]),
    ]

    results = get_recommendations(user, destinations, [])

    assert results[0]["destination_id"] == "dest_high"
    assert results[0]["score"] >= results[1]["score"]


def test_recommendations_respects_limit():
    user = {"preferences": {}}
    destinations = [make_dest(id=f"dest_{i}") for i in range(10)]

    results = get_recommendations(user, destinations, [], limit=3)

    assert len(results) == 3


def test_higher_rated_destination_outranks_lower_rated_all_else_equal():
    user = {"preferences": {}}
    destinations = [
        make_dest(id="dest_low_rated", rating={"average": 2.0, "count": 5}),
        make_dest(id="dest_high_rated", rating={"average": 4.8, "count": 50}),
    ]

    results = get_recommendations(user, destinations, [])

    assert results[0]["destination_id"] == "dest_high_rated"
