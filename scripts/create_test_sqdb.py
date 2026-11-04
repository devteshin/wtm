import os
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "sq_test.db")

# Проверьте, что datetime(1899,12,30) + 29788.625 == реальный момент —
# это контроль корректности схемы TDateTime
_TDATETIME_EPOCH = datetime(1899, 12, 30)

# Каналы: passportID → (название, стартовое показание кВт·ч, максимум шага)
CHANNELS = {
    101: ("Станок фрезерный #1", 125000.0, 4.5),
    102: ("Станок токарный #2",   87000.0, 3.2),
    103: ("Компрессор",          310000.0, 9.8),
}

STATION_ID = 1
INTERVAL_MINUTES = 5
PERIOD_HOURS = 48          # сколько часов истории сгенерировать


def tdatetime(dt: datetime) -> float:
    """ локальное время → Delphi TDateTime (число суток с 30.12.1899) """
    return (dt - _TDATETIME_EPOCH).total_seconds() / 86400.0


def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE DataValues (
                code       INTEGER PRIMARY KEY AUTOINCREMENT,
                stationID  INTEGER,
                passportID INTEGER,
                valueTime  REAL,
                valueData  REAL
            )
        """)

        now = datetime.now().replace(second=0, microsecond=0)
        start = now - timedelta(hours=PERIOD_HOURS)

        readings = {pid: start_value for pid, (_, start_value, _) in CHANNELS.items()}
        rows = []
        t = start
        while t <= now:
            for pid, (_, _, max_step) in CHANNELS.items():
                # показания счётчика только растут; ночью потребление ниже
                night = 5 <= t.hour < 8
                step = random.uniform(0.05, max_step) * (0.25 if night else 1.0)
                readings[pid] = round(readings[pid] + step, 3)
                rows.append((STATION_ID, pid, tdatetime(t), readings[pid]))
            t += timedelta(minutes=INTERVAL_MINUTES)

        conn.executemany(
            "INSERT INTO DataValues (stationID, passportID, valueTime, valueData) "
            "VALUES (?, ?, ?, ?)",
            rows,
        )
        conn.commit()

        print("Создан файл:", DB_PATH)
        print("Записей:", len(rows))
        print("Каналов:", len(CHANNELS))
        print("Последняя метка времени:", now.isoformat())

        # контрольная выборка — глазами проверить конвертацию
        for r in conn.execute(
            "SELECT code, passportID, valueTime, valueData "
            "FROM DataValues ORDER BY code DESC LIMIT 3"
        ):
            dt = _TDATETIME_EPOCH + timedelta(days=r[2])
            print(r, "->", dt.isoformat())
    finally:
        conn.close()


if __name__ == "__main__":
    main()
