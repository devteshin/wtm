#!/usr/bin/env python3
"""Агент инкрементальной передачи показаний из SQLite (Симп Лайт) в облачный MySQL.

Конфигурация загрузки — облачная таблица scada_channel_map:
  upload = 1        — канал передаётся;
  interval_min      — интервал прореживания;
  kind              — counter: последнее значение интервала,
                      analog: среднее, discrete: максимум;
  from_dt / to_dt   — границы периода передачи (NULL — без границы).
"""
import json
import logging
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path

import pymysql
import tomllib

TD_EPOCH = datetime(1899, 12, 30)  # начало отсчёта TDateTime
TD_UNIX_OFFSET = 25569.0           # TDateTime момента 1970-01-01 UTC


def setup_logging() -> None:
    log_dir = Path(__file__).with_name("logs")
    log_dir.mkdir(exist_ok=True)
    fmt = logging.Formatter(
        "%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    fh = RotatingFileHandler(
        log_dir / "agent.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    console = logging.StreamHandler()
    console.setFormatter(fmt)
    logging.basicConfig(level=logging.INFO, handlers=[fh, console])


def load_channels(conn) -> dict:
    """Белый список каналов из облачной таблицы настроек."""
    channels = {}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT passport_id, station_id, kind, interval_min, from_dt, to_dt "
            "FROM scada_channel_map WHERE upload = 1"
        )
        for pid, station, kind, interval, from_dt, to_dt in cur.fetchall():
            channels[pid] = {
                "pid": pid,
                "station_id": station,
                "kind": kind,
                "interval_sec": interval * 60,
                "from_td": (from_dt - TD_EPOCH).total_seconds() / 86400.0 if from_dt else None,
                "to_td": (to_dt - TD_EPOCH).total_seconds() / 86400.0 if to_dt else None,
            }
    return channels


def load_state(path: Path) -> dict:
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return {int(k): int(v) for k, v in data.get("cursors", {}).items()}
    return {}


def save_state(path: Path, cursors: dict) -> None:
    path.write_text(
        json.dumps({"cursors": {str(k): v for k, v in cursors.items()}},
                   ensure_ascii=False),
        encoding="utf-8",
    )


def flush_bucket(ch: dict, bucket, agg, out: list) -> None:
    """Превращает накопленный интервал в строку для вставки."""
    if agg is None:
        return
    ts = datetime.fromtimestamp(bucket * ch["interval_sec"], tz=timezone.utc)
    if ch["kind"] == "counter":
        value = agg["last"]
    elif ch["kind"] == "analog":
        value = agg["sum"] / agg["cnt"]
    else:  # discrete
        value = agg["maxv"]
    out.append((ch["station_id"], ch["pid"],
                ts.strftime("%Y-%m-%d %H:%M:%S"), round(value, 4)))


def write_batch(conn, out, sql_write, log, cfg, mysql_cfg):
    try:
        with conn.cursor() as cur:
            cur.executemany(sql_write, out)
        conn.commit()
    except pymysql.err.OperationalError as e:
        log.warning("MySQL недоступен (%s), переподключение...", e)
        conn.close()
        time.sleep(cfg["agent"].get("retry_sec", 10))
        return pymysql.connect(**mysql_cfg)
    return conn


def main() -> None:
    setup_logging()
    log = logging.getLogger("scada-agent")

    cfg_path = Path(__file__).with_name("config_agent.toml")
    cfg = tomllib.loads(cfg_path.read_text(encoding="utf-8"))

    db_path: str = cfg["sqlite"]["path"]
    state_path = Path(__file__).with_name("state.json")
    batch_size: int = cfg["agent"]["batch_size"]
    cycle_sleep: float = cfg["agent"]["interval_sec"]

    mysql_cfg = dict(cfg["mysql"])
    mysql_cfg["autocommit"] = False
    conn = pymysql.connect(**mysql_cfg)

    channels = load_channels(conn)
    if not channels:
        log.warning("В scada_channel_map нет каналов с upload=1 — агенту нечего передавать.")
        return
    log.info("Агент запущен. База: %s. Каналов: %s: %s",
             db_path, len(channels), ", ".join(str(p) for p in sorted(channels)))

    cursors = load_state(state_path)

    # защита от пересоздания базы
    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as lite:
        cur_max = lite.execute("SELECT MAX(code) FROM DataValues").fetchone()[0] or 0
    if cursors and cur_max < max(cursors.values()):
        log.warning(
            "Макс. code в базе (%s) меньше сохранённых курсоров — похоже, база "
            "пересоздана. Курсоры сброшены.", cur_max,
        )
        cursors = {}

    sql_read = (
        "SELECT code, valueTime, valueData FROM DataValues "
        "WHERE passportID = ? AND code > ? ORDER BY code LIMIT ?"
    )
    sql_write = (
        "INSERT IGNORE INTO scada_reading (station_id, passport_id, ts, value) "
        "VALUES (%s, %s, %s, %s)"
    )

    total = 0
    try:
        while True:
            for pid, ch in channels.items():
                last_code = cursors.get(pid, 0)
                sent = 0
                pending_key = None
                pending_agg = None

                with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as lite:
                    while True:
                        rows = lite.execute(sql_read, (pid, last_code, batch_size)).fetchall()
                        if not rows:
                            break
                        out = []
                        for code, td, val in rows:
                            if ch["from_td"] is not None and td < ch["from_td"]:
                                continue
                            if ch["to_td"] is not None and td > ch["to_td"]:
                                continue
                            bucket = int((td - TD_UNIX_OFFSET) * 86400.0 // ch["interval_sec"])
                            if bucket != pending_key:
                                flush_bucket(ch, pending_key, pending_agg, out)
                                pending_key = bucket
                                pending_agg = {"last": val, "sum": val, "cnt": 1, "maxv": val}
                            else:
                                pending_agg["last"] = val
                                pending_agg["sum"] += val
                                pending_agg["cnt"] += 1
                                pending_agg["maxv"] = max(pending_agg["maxv"], val)
                        if out:
                            conn = write_batch(conn, out, sql_write, log, cfg, mysql_cfg)
                            sent += len(out)
                        last_code = rows[-1][0]

                    # в конце данных канала сбрасываем интервал, если он уже завершился
                    out = []
                    if pending_agg is not None and \
                            (pending_key + 1) * ch["interval_sec"] <= time.time():
                        flush_bucket(ch, pending_key, pending_agg, out)
                    if out:
                        conn = write_batch(conn, out, sql_write, log, cfg, mysql_cfg)
                        sent += len(out)

                cursors[pid] = last_code
                save_state(state_path, cursors)
                if sent:
                    total += sent
                    log.info("Канал %s: передано %s агрегатов (всего %s), курсор %s",
                             pid, sent, total, last_code)
            time.sleep(cycle_sleep)
    except KeyboardInterrupt:
        log.info("Остановка по Ctrl+C. Всего передано %s агрегатов.", total)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
