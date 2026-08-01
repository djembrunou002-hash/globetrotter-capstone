#!/usr/bin/env bash
set -u

BASE="${1:-http://localhost:5000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "  PASS  $label"
    PASS=$((PASS + 1))
  else
    red   "  FAIL  $label (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

jsonfield() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d$1'))" 2>/dev/null; }

echo
echo "Testing $BASE"
echo

echo "[1] gateway and downstream health"
BODY=$(curl -s "$BASE/health")
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
check "gateway /health" "200" "$CODE"
echo "      $BODY"

echo
echo "[2] internal endpoints must be blocked at the gateway"
for P in /internal/users/batch /internal/itineraries /internal/destinations/batch; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$P")
  check "$P blocked" "404" "$CODE"
done

echo
echo "[3] register a phone user (skips OTP)"
NUM="6$(shuf -i 10000000-99999999 -n 1)"
REG=$(curl -s -X POST "$BASE/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"number\":\"$NUM\",\"password\":\"secret123\"}")
TOKEN=$(echo "$REG" | jsonfield "['token']")
USER_ID=$(echo "$REG" | jsonfield "['user']['id']")
if [ -n "${TOKEN:-}" ]; then
  green "  PASS  registered $USER_ID"
  PASS=$((PASS + 1))
else
  red "  FAIL  registration: $REG"
  FAIL=$((FAIL + 1))
  echo; red "Cannot continue without a token."; exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

echo
echo "[4] destination-service, no cross-service call"
DESTS=$(curl -s "$BASE/destinations")
DEST_ID=$(echo "$DESTS" | jsonfield "['destinations'][0]['id']")
IMG=$(echo "$DESTS" | jsonfield "['destinations'][0]['images'][0]")
if [ -n "${DEST_ID:-}" ]; then
  green "  PASS  listed destinations, first is $DEST_ID"
  PASS=$((PASS + 1))
else
  red "  FAIL  no destinations returned"
  FAIL=$((FAIL + 1))
  echo; red "Cannot continue without a destination."; exit 1
fi

case "$IMG" in
  "$BASE"*) green "  PASS  image URL points at the gateway"; PASS=$((PASS + 1)) ;;
  http*)    red "  FAIL  image URL is $IMG, expected it to start with $BASE"; FAIL=$((FAIL + 1)) ;;
  *)        red "  FAIL  image URL is not absolute: $IMG"; FAIL=$((FAIL + 1)) ;;
esac

echo
echo "[5] favorites: destination-service -> user-service"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/destinations/$DEST_ID/favorite" -H "$AUTH")
check "add favorite" "200" "$CODE"
FAVS=$(curl -s "$BASE/favorites" -H "$AUTH")
COUNT=$(echo "$FAVS" | jsonfield "['favorites'].__len__()")
check "favorite reads back" "1" "${COUNT:-0}"

echo
echo "[6] create itinerary: itinerary-service -> destination-service"
ITIN=$(curl -s -X POST "$BASE/itineraries" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke Trip\",\"destinations\":[\"$DEST_ID\"]}")
ITIN_ID=$(echo "$ITIN" | jsonfield "['itinerary']['id']")
if [ -n "${ITIN_ID:-}" ]; then
  green "  PASS  created $ITIN_ID"
  PASS=$((PASS + 1))
else
  red "  FAIL  create itinerary: $ITIN"
  FAIL=$((FAIL + 1))
fi

TAGS=$(echo "$ITIN" | jsonfield "['itinerary']['tags'].__len__()")
if [ "${TAGS:-0}" -gt 0 ] 2>/dev/null; then
  green "  PASS  tags were pulled from destination-service"
  PASS=$((PASS + 1))
else
  red "  FAIL  itinerary has no tags, the cross-service fetch returned nothing"
  FAIL=$((FAIL + 1))
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/itineraries" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"title":"Bad","destinations":["dest_doesnotexist"]}')
check "invalid destination id rejected" "400" "$CODE"

echo
echo "[7] recommendations: destination-service -> user-service + itinerary-service"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/recommendations" -H "$AUTH")
check "GET /recommendations" "200" "$CODE"

echo
echo "[8] comments: destination-service -> user-service for author names"
CMT=$(curl -s -X POST "$BASE/destinations/$DEST_ID/comments" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"text":"smoke test comment"}')
CMT_ID=$(echo "$CMT" | jsonfield "['comment']['id']")
AUTHOR=$(echo "$CMT" | jsonfield "['comment']['author']['name']")
check "author name resolved" "Smoke Test" "${AUTHOR:-none}"

echo
echo "[9] itinerary sharing: itinerary-service -> user-service lookup"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/itineraries/$ITIN_ID/share" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"email":"nobody@example.invalid"}')
check "unknown share target is 404" "404" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/itineraries/$ITIN_ID/shared-users" -H "$AUTH")
check "GET shared-users" "200" "$CODE"

echo
echo "[10] cleanup"
curl -s -o /dev/null -X DELETE "$BASE/destinations/$DEST_ID/comments/$CMT_ID" -H "$AUTH"
curl -s -o /dev/null -X DELETE "$BASE/destinations/$DEST_ID/favorite" -H "$AUTH"
curl -s -o /dev/null -X DELETE "$BASE/itineraries/$ITIN_ID" -H "$AUTH"
green "  removed comment, favorite and itinerary"
echo "  note: the test user $USER_ID stays in user-service/data/users.json"

echo
echo "-----------------------------"
if [ "$FAIL" -eq 0 ]; then
  green "$PASS passed, 0 failed"
else
  red "$PASS passed, $FAIL failed"
fi
echo

exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)