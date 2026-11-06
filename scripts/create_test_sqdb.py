#!/usr/bin/env python3
"""Генератор тестовой базы sq_test.db в стиле Симп Лайт.

Режимы:
  python create_test_sqdb.py              — дописать данные (по умолчанию +2 часа)
  python create_test_sqdb.py --hours 24   — дописать сутки
  python create_test_sqdb.py --recreate   — удалить базу и создать с нуля
"""
import argparse
import os
import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).with_name("sq_test.db")
STATION_ID = 1
CHANNELS = [101, 102, 103]
TD_EPOCH = datetime(1899, 12, 30)          # начало отсчёта TDateTime
STEP_MIN = 5

FIRST_TS = datetime(2026, 11, 2, 15, 31)   # старт сетки при --recreate
FIRST_VALUE = {101: 125_004.036, 102: 87_000.648, 103: 310_000.079}
RATE_PER_MIN = {101: 0.214, 102: 0.156, 103: 0.483}  # кВт·ч/мин, подогнано под живые цифры


def to_td(dt: datetime) -> float:
    return (dt - TD_EPOCH).total_seconds() / 86400.0


def from_td(td: float) -> datetime:
    return TD_EPOCH + timedelta(days=td)


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS DataValues (
               code       INTEGER PRIMARY KEY AUTOINCREMENT,
               stationID  INTEGER NOT NULL,
               passportID INTEGER NOT NULL,
               valueTime  REAL    NOT NULL,
               valueData  REAL    NOT NULL
           )"""
    )


def append_points(conn, start_dt: datetime, n_points: int,
                  values: dict, next_code: int) -> int:
    """Дописывает n_points шагов сетки, по одному коду на канал."""
    code = next_code
    for i in range(n_points):
        dt = start_dt + i * timedelta(minutes=STEP_MIN)
        td = to_td(dt)
        for ps in CHANNELS:
            code += 1
            values[ps] += RATE_PER_MIN[ps] * STEP_MIN * random.uniform(0.5, 1.5)
            conn.execute(
                "INSERT INTO DataValues "
                "(code, stationID, passportID, valueTime, valueData) "
                "VALUES (?, ?, ?, ?, ?)",
                (code, STATION_ID, ps, td, round(values[ps], 3)),
            )
    return code


def main() -> None:
    parser = argparse.ArgumentParser(description="Генератор тестовой базы sq_test.db")
    parser.add_argument("--hours", type=float, default=2.0,
                        help="сколько часов данных дописать в режиме append")
    parser.add_argument("--recreate", action="store_true",
                        help="удалить базу и создать с нуля (сетка до текущего момента)")
    args = parser.parse_args()

    random.seed(42)
    recreate = args.recreate or not DB_PATH.exists()

    if recreate and DB_PATH.exists():
        os.remove(DB_PATH)   # база должна быть свободна: остановите агента

    with sqlite3.connect(DB_PATH) as conn:
        init_db(conn)

        if recreate:
            start_dt = FIRST_TS
            end_dt = datetime.now().replace(second=0, microsecond=0)
            n_points = int((end_dt - start_dt).total_seconds() // (STEP_MIN * 60)) + 1
            values = dict(FIRST_VALUE)
            next_code = 0
            mode = "recreate"
        else:
            row = conn.execute("SELECT MAX(valueTime), MAX(code) FROM DataValues").fetchone()
            if row[0] is None:
                raise SystemExit("База пуста — используйте --recreate")
            start_dt = from_td(row[0]) + timedelta(minutes=STEP_MIN)
            n_points = int(args.hours * 60 // STEP_MIN)
            next_code = row[1] or 0
            values = {
                ps: (conn.execute(
                    "SELECT valueData FROM DataValues WHERE passportID = ? "
                    "ORDER BY code DESC LIMIT 1", (ps,)
                ).fetchone() or (FIRST_VALUE[ps],))[0]
                for ps in CHANNELS
            }
            mode = f"append (+{args.hours} ч)"

        end_code = append_points(conn, start_dt, n_points, values, next_code)
        conn.commit()

    print(f"Режим: {mode}")
    print(f"Добавлено записей: {n_points * len(CHANNELS)} "
          f"(коды {next_code + 1} … {end_code}), сетка с {start_dt:%Y-%m-%d %H:%M}")


if __name__ == "__main__":
    main()
