#!/usr/bin/env python3
"""Агент загрузки SCADA-показаний в облачный MySQL. Версия 2.0.

Данные переносятся как есть: каждая запись SQLite -> строка scada_reading.
Курсор — последний загруженный Code (монотонный в Симп Лайт).
"""
import calendar
import datetime as dt
import json
import logging
import sqlite3
import time
from pathlib import Path

import pymysql
import tomllib

BASE = Path(__file__).resolve().parent
CFG_PATH = BASE / "config_agent.toml"
STATE_PATH = BASE / "state.json"
LOG_PATH = BASE / "agent.log"

EPOCH_OFFSET = 25569.0   # TDateTime -> unix time, в сутках

BATCH = int(tomllib.loads(CFG_PATH.read_text(encoding="utf-8"))["agent"]["batch_size"]) # записей за один заход по каналу

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("agent")


def to_ts(tdt: float) -> int:
    """TDateTime -> unix timestamp (секунды UTC)."""
    return round((tdt - EPOCH_OFFSET) * 86400)


def ts_to_tdt(ts: int) -> float:
    """unix timestamp -> TDateTime, для условий в SQL."""
    return ts / 86400.0 + EPOCH_OFFSET


def datetime_to_ts(value) -> int | None:
    """datetime из MySQL или строка -> unix timestamp (UTC)."""
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return calendar.timegm(value.timetuple())
    return calendar.timegm(dt.datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S").timetuple())


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict) -> None:
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(STATE_PATH)

def ts_to_datetime(ts: int) -> dt.datetime:
    """unix timestamp -> naive datetime (тот же часовой пояс, что в базе)."""
    return dt.datetime(1970, 1, 1) + dt.timedelta(seconds=ts)


def sync_channel(lite: sqlite3.Connection, cloud, ch: dict, state: dict) -> None:
    pid = ch["passport_id"]
    last_code = int(state.get(str(pid), 0))

    where = ["PassportID = ?", "Code > ?"]
    args = [pid, last_code]
    from_limit = datetime_to_ts(ch["from_dt"])
    to_limit = datetime_to_ts(ch["to_dt"])
    if from_limit is not None:
        where.append("ValueTime >= ?")
        args.append(ts_to_tdt(from_limit))
    if to_limit is not None:
        where.append("ValueTime <= ?")
        args.append(ts_to_tdt(to_limit))

    rows = lite.execute(
        f"SELECT Code, ValueData, ValueTime FROM DataValues "
        f"WHERE {' AND '.join(where)} ORDER BY Code LIMIT {BATCH}",
        args,
    ).fetchall()
    if not rows:
        return

    payload = [
            (pid, ch["station_id"], ts_to_datetime(to_ts(tdt)), value)
            for code, value, tdt in rows
        ]
    with cloud.cursor() as cur:
        cur.executemany(
            "INSERT IGNORE INTO scada_reading (passport_id, station_id, ts, value) "
            "VALUES (%s, %s, %s, %s)",
            payload,
        )


    state[str(pid)] = rows[-1][0]
    log.info("канал %s (%s): +%d записей, курсор Code=%d",
             pid, ch["name"], len(payload), rows[-1][0])


def main() -> None:
    cfg = tomllib.loads(CFG_PATH.read_text(encoding="utf-8"))
    state = load_state()

    lite = sqlite3.connect(f"file:{cfg['sqlite']['path']}?mode=ro", uri=True)
    cloud = pymysql.connect(
        autocommit=True, charset="utf8mb4",
        **{k: cfg["mysql"][k] for k in ("host", "port", "user", "password", "database")},
    )

    log.info("агент запущен")
    while True:
        try:
            cloud.ping(reconnect=True)
            with cloud.cursor() as cur:
                cur.execute(
                    "SELECT passport_id, station_id, name, tp_id, unit, upload, from_dt, to_dt "
                    "FROM scada_channel_map WHERE upload = 1"
                )
                channels = cur.fetchall()
            cur_cols = ["passport_id", "station_id", "name", "tp_id", "unit", "upload", "from_dt", "to_dt"]
            for row in channels:
                ch = dict(zip(cur_cols, row))
                sync_channel(lite, cloud, ch, state)
            save_state(state)
        except Exception:
            log.exception("ошибка цикла")
            time.sleep(30)
        time.sleep(cfg.get("agent", {}).get("poll_sec", 60))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("агент остановлен вручную")