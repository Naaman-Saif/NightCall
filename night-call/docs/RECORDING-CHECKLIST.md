# Recording checklist

For the demo video. What to say is in [SUBMISSION-DRAFT.md](SUBMISSION-DRAFT.md), under "Video script outline".

## Before recording

1. The crash flag is on: `docker exec night-call node dist/scripts/set-shop-flag.js on`
2. `night-call` has been up for at least 10 minutes, so the report shows real crash counts.
3. No NightCall pull request is open on the fork.
4. The SSH forward is running, and http://127.0.0.1:8001/op/incidents loads.

## During recording

Time is minutes after pressing Start. Fill in from INC-019 (not in the repo yet).

| Step | Point at | Around |
|---|---|---|
| 1 | Start investigation | 0:00 |
| 2 | The readings, with their source links | __:__ |
| 3 | The question card | __:__ |
| 4 | Possible causes | __:__ |
| 5 | The live replay panel | __:__ |
| 6 | Kimi's review reasons | __:__ |
| 7 | Three rounds at 2x speed | __:__ |
| 8 | The pull request button | __:__ |
| 9 | The finished header | __:__ |

## After recording

1. Close the pull request, only if you want a clean fork.
2. Turn the crash flag off: `docker exec night-call node dist/scripts/set-shop-flag.js off`
