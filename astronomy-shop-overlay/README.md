# astronomy-shop overlay

Files to drop into the `astronomy-shop` fork of opentelemetry-demo. Nothing upstream is edited; everything here is additive and layered with `-f`.

- `compose.nightcall.yaml`: Alertmanager, the Prometheus rule mount, the Night Call service itself, and the read-only status page on port 8001.
- `src/alertmanager/alertmanager.yml`: routes every alert to Night Call.
- `src/prometheus/rules/night-call.yml`: one alert per demo fault.
- `src/prometheus/prometheus-nightcall.yaml` and `compose.clone.yaml` are generated, not committed by hand. From the night-call repo: `npm run overlay -- /root/code/astronomy-shop`.

Production:

    docker compose -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.box-override.yaml -f compose.nightcall.yaml up -d

`compose.box-override.yaml` is the box's local file raising the `ad` and `fraud-detection` memory limits to 768M; demo 3.0.0 ships them at 300M and both OOM loop. Night Call includes it in the clone automatically when it exists.

The clone is brought up by Night Call, never by hand, with the same three base files plus `compose.clone.yaml` and project name `clone`.
