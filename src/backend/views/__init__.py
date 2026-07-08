import pathlib

from aiohttp.web import Application, FileResponse, Request

from .handlers import (
    change_password_handler, get_stocks, get_task,
    get_tasks, get_dnm_doc_number, get_operations, get_operation_data, get_operations_meta, get_operation, get_arrival, login_handler, rest_gross_weight,
    tasks_progress, update_job_status_handler, get_max_tare_id,
    update_jobs_status_handler, create_material_handler, create_arrival_handler, update_arrival_handler, delete_arrival_handler, 
    check_material_item_handler, get_materials_meta, get_materials_data, get_selection_data)


def index_spa(path: str, filename: str):
    static_files = [p.name for p in pathlib.Path(
        path).iterdir() if p.is_dir() is False]

    async def static_view(request: Request):
        path_to_file = pathlib.Path(path, filename)
        if request.path.removeprefix("/") in static_files:
            path_to_file = pathlib.Path(path, request.path.removeprefix("/"))
        return FileResponse(path_to_file)
    return static_view


def setup_handlers(app: Application):
    try:
        app.router.add_static("/assets", "static/assets")
        app.router.add_get("/{path:(?!api).*}",
                           index_spa("static", "index.html"))
    except ValueError:
        print("static dir not found")

    views = [
        ("POST", "/api/login", login_handler, "login"),
        ("POST", "/api/change_password", change_password_handler, "change_password"),
        ("PUT", "/api/job", update_job_status_handler, "update_job_status"),
        ("POST", "/api/job", update_jobs_status_handler, "update_jobs_status_handler"),
        ("POST", "/api/arrival", update_arrival_handler, "update_arrival_handler"),
        ("POST", "/api/arrival/delete", delete_arrival_handler, "delete_arrival_handler"),
        ("POST", "/api/arrival/create", create_arrival_handler, "create_arrival_handler"),
        ("POST", "/api/material/create", create_material_handler, "create_material_handler"),
        ("GET", "/api/material/{material}", get_max_tare_id, "get_max_tare_id"),
        ("GET", "/api/stocks", get_stocks, "get_stocks"),
        ("GET", "/api/stock/{stockID}/operations", get_operations, "get_operations"),
        ("GET", "/api/stock/{stockID}/operations_meta", get_operations_meta, "get_operations_meta"),
        ("GET", "/api/stock/{stockID}/operation/{operationID}", get_operation, "get_operation"),
        ("GET", "/api/operation/{operationID}/operation_data", get_operation_data, "get_operation_data"),
        ("GET", "/api/dnm/{operationID}", get_dnm_doc_number, "get_dnm_doc_number"),
        ("GET", "/api/stock/{stockID}/operation/{operationID}/doc/{docID}", get_arrival, "get_arrival"),
        ("GET", "/api/stock/{stockID}/tasks", get_tasks, "get_tasks"),
        ("GET", "/api/stock/{stockID}/tasks_progress", tasks_progress, "tasks_progress"),
        ("GET", "/api/stock/{stockID}/task/{taskID}/material/{materialID}", get_task, "get_task"),
        ("GET", "/api/stock/{stockID}/materials", get_materials_meta, "get_materials_meta"),
        ("GET", "/api/stock/{stockID}/materials_data", get_materials_data, "get_materials_data"),
        ("GET", "/api/selection_data", get_selection_data, "get_selection_data"),
        ("PUT", "/api/rest_gross_weight", rest_gross_weight, "rest_gross_weight"),
        ("POST", "/api/check_item", check_material_item_handler, "check_material_item_handler")
    ]
    for method, path, func, name in [*views]:
        app.router.add_route(method, path, func, name=name)
