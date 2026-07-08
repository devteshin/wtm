from multiprocessing import cpu_count
from os import getenv

from aiomysql import DictCursor, Pool, create_pool

from .db import (
    check_user, select_task, select_tasks, change_password, select_stocks, select_operations, select_operation_data, select_operations_meta, select_operation, select_arrival, select_max_tare_id, 
    update_job_status, check_can_login, select_tasks_progress, update_rest_gross_weight, update_arrival, delete_arrival, create_arrival, 
    select_materials_meta, select_materials_data, get_material_id, select_selection_data, check_operation_name,
    check_material_item, select_dnm_doc_number, DocumentExistsError, ItemsExistsError, ItemsConsumptionError, MaterialError
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
    "select_materials_meta",
    "select_materials_data",
    "get_material_id"
    "select_selection_data",
    "select_stocks",
    "select_operations",
    "select_operations_meta",
    "select_operation_data",
    "select_dnm_doc_number",
    "select_operation",
    "select_arrival",
    "select_max_tare_id",
    "update_job_status",
    "update_arrival",
    "delete_arrival",
    "create_arrival",
    "check_can_login",
    "select_tasks_progress",
    "update_rest_gross_weight",
    "check_material_item",
    "check_operation_name",
    "DocumentExistsError",
    "MaterialError",
    "ItemsExistsError",
    "ItemsConsumptionError"
)
