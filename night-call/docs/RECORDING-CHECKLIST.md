# Recording checklist

For the demo video. What to say is in [SUBMISSION-DRAFT.md](SUBMISSION-DRAFT.md), under "Video script outline".

## Before recording

1. The crash flag is on: `docker exec night-call node dist/scripts/set-shop-flag.js on`
2. `night-call` has been up for at least 10 minutes, so the report shows real crash counts.
3. No NightCall pull request is open on the fork.
4. The SSH forward is running, and http://127.0.0.1:8001/op/incidents loads.

## During recording

Minutes after pressing Start, from the check run INC-019 (17 min 4 s in total).

| Step | Point at | Around |
|---|---|---|
| 1 | Start investigation | 0:00 |
| 2 | The readings, with their source links | 0:10 |
| 3 | The question card | between 0:10 and 0:40 |
| 4 | Possible causes | 0:40 |
| 5 | The live replay panel | 0:40 to 2:45 |
| 6 | Kimi's review reasons | 2:55 |
| 7 | Three rounds at 2x speed | 3:00 to 16:30 |
| 8 | The pull request button | 16:50 |
| 9 | The finished header | 17:04 |

## After recording

1. Close the pull request, only if you want a clean fork.
2. Turn the crash flag off: `docker exec night-call node dist/scripts/set-shop-flag.js off`
