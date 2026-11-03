import sqlite3
import os
from datetime import datetime, timedelta, timezone

# valueTime в Симп Лайт — Delphi TDateTime: число суток с 30.12.1899
_TDATETIME_EPOCH = datetime(1899, 12, 30, tzinfo=timezone.utc)


def tdatetime_to_iso(value):
    if value is None:
        return None
    return (_TDATETIME_EPOCH + timedelta(days=float(value))).isoformat()


def select_scada_test_data(db_path: str, limit: int = 20):
    # Режим ro: открыть можно только существующую базу, писать нельзя.
    # На Windows в URI нужны прямые слэши.
    uri = "file:{}?mode=ro".format(os.path.abspath(db_path).replace("\\", "/"))
    conn = sqlite3.connect(uri, uri=True)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT code, stationID, passportID, valueTime, valueData "
            "FROM DataValues ORDER BY code DESC LIMIT :limit",
            {"limit": limit},
        ).fetchall()
        data = []
        for r in rows:
            row = dict(r)
            row["value_time_iso"] = tdatetime_to_iso(row.get("valueTime"))
            data.append(row)
        return data
    finally:
        conn.close()
