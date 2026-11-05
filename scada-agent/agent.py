#!/usr/bin/env python3
"""Агент инкрементальной передачи показаний из SQLite (Симп Лайт) в облачный MySQL."""
import json
import logging
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pymysql
import tomllib  # Python 3.11+; для более старых: pip install tomli и заменить импорт

TD_EPOCH = datetime(1899, 12, 30)  # начало отсчёта TDateTime


def tdatetime_to_iso(td: float) -> str:
    """TDateTime -> ISO-строка. Логика как в бэкенде, чтобы данные совпадали."""
    return (TD_EPOCH + timedelta(days=td)).replace(
        tzinfo=timezone.utc
    ).strftime("%Y-%m-%d %H:%M:%S")


def load_state(path: Path) -> int:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8")).get("last_code", 0)
    return 0


def save_state(path: Path, last_code: int) -> None:
    path.write_text(
        json.dumps({"last_code": last_code}, ensure_ascii=False),
        encoding="utf-8",
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    log = logging.getLogger("scada-agent")

    cfg_path = Path(__file__).with_name("config_agent.toml")
    cfg = tomllib.loads(cfg_path.read_text(encoding="utf-8"))

    db_path: str = cfg["sqlite"]["path"]
    state_path = Path(__file__).with_name("state.json")
    batch_size: int = cfg["agent"]["batch_size"]
    interval: float = cfg["agent"]["interval_sec"]

    # --- проверка базы и защита от пересоздания ---
    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as lite:
        cur_max = lite.execute("SELECT MAX(code) FROM DataValues").fetchone()[0]
    if cur_max is None:
        cur_max = 0
    last_code = load_state(state_path)
    if cur_max < last_code:
        log.warning(
            "Макс. code в базе (%s) меньше сохранённого курсора (%s) — "
            "похоже, база пересоздана. Курсор сброшен.",
            cur_max, last_code,
        )
        last_code = 0

    # --- постоянное соединение с MySQL ---
    mysql_cfg = dict(cfg["mysql"])
    mysql_cfg["autocommit"] = False
    conn = pymysql.connect(**mysql_cfg)
    log.info("Агент запущен. База: %s, курсор: %s", db_path, last_code)

    sql_read = (
        "SELECT code, stationID, passportID, valueTime, valueData "
        "FROM DataValues WHERE code > ? ORDER BY code LIMIT ?"
    )
    sql_write = (
        "INSERT IGNORE INTO scada_reading (station_id, passport_id, ts, value) "
        "VALUES (%s, %s, %s, %s)"
    )

    total = 0
    try:
        while True:
            sent_in_cycle = 0
            with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as lite:
                while True:
                    rows = lite.execute(sql_read, (last_code, batch_size)).fetchall()
                    if not rows:
                        break
                    payload = [
                        (st, ps, tdatetime_to_iso(td), vd)
                        for _, st, ps, td, vd in rows
                    ]
                    try:
                        with conn.cursor() as cur:
                            cur.executemany(sql_write, payload)
                        conn.commit()
                    except pymysql.err.OperationalError as e:
                        # связь с облаком пропала — переподключаемся и повторяем пачку
                        log.warning("MySQL недоступен (%s), переподключение...", e)
                        conn.close()
                        time.sleep(cfg["agent"].get("retry_sec", 10))
                        conn = pymysql.connect(**mysql_cfg)
                        continue
                    last_code = rows[-1][0]
                    save_state(state_path, last_code)
                    sent_in_cycle += len(rows)
            if sent_in_cycle:
                total += sent_in_cycle
                log.info("Передано %s записей (всего %s), курсор %s",
                         sent_in_cycle, total, last_code)
            time.sleep(interval)
    except KeyboardInterrupt:
        log.info("Остановка по Ctrl+C. Всего передано %s записей.", total)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
