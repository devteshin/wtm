from multiprocessing import cpu_count
from os import getenv

from aiomysql import DictCursor, Pool, create_pool

from .db import (
    check_user, select_task, select_tasks, change_password, select_stocks, select_operations, select_operation, select_arrival, 
    update_job_status, check_can_login, select_tasks_progress, update_rest_gross_weight, update_arrival, delete_arrival, create_arrival,
    check_material_item, select_dnm_doc_number, DocumentExistsError, ItemsExistsError, MaterialError
)


async def create_connect_db(user: str, password: str, host: str, port: int, db: str) -> Pool:
    return await create_pool(
        user=user,
        password=password,
        host=host,
        port=port,
        db=db,
        minsize=0,
        maxsize=cpu_count()*10,
        autocommit=True,
        cursorclass=DictCursor
    )


__all__ = (
    "select_tasks",
    "select_task",
    "check_user",
    "change_password",
    "select_stocks",
    "select_operations",
    "select_dnm_doc_number",
    "select_operation",
    "select_arrival",
    "update_job_status",
    "update_arrival",
    "delete_arrival",
    "create_arrival",
    "check_can_login",
    "select_tasks_progress",
    "update_rest_gross_weight",
    "check_material_item",
    "DocumentExistsError",
    "MaterialError",
    "ItemsExistsError"
)
