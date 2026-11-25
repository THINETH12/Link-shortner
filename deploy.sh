#!/bin/bash
set -e  # stop immediately if any command fails

VERSION=${1:-"latest"}

# 1. Which slot is idle?
ACTIVE=$(cat active_slot.txt)
if [ "$ACTIVE" = "blue" ]; then IDLE="green"; else IDLE="blue"; fi

echo "Active: $ACTIVE → deploying to: $IDLE"

# 2. Build the new image for the idle slot
docker compose build $IDLE

# 3. Start the idle container
docker compose up -d $IDLE

# 4. Health check — wait up to 20 seconds for it to be ready
echo "Health checking $IDLE..."
for i in {1..10}; do
  STATUS=$(docker compose exec $IDLE wget -qO- http://localhost:3000/health > /dev/null 2>&1 && echo "ok" || echo "fail")
  if [ "$STATUS" = "ok" ]; then
    echo "$IDLE is healthy."
    break
  fi
  echo "  Attempt $i/10 failed, retrying in 2s..."
  sleep 2
  if [ $i -eq 10 ]; then
    echo "Health check failed — aborting. $ACTIVE still live."
    exit 1
  fi
done

# 5. Switch Nginx upstream and reload
sed -i "s/server $ACTIVE:3000/server $IDLE:3000/" nginx/nginx.conf
docker compose exec nginx nginx -s reload
echo "Traffic switched to $IDLE."

# 6. Record new active slot
echo $IDLE > active_slot.txt
echo "Deploy complete. $IDLE is now live. $ACTIVE is idle (ready for rollback)."r