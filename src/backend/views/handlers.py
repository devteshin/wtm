from aiohttp.web import HTTPBadRequest, HTTPForbidden, HTTPCreated, HTTPNotFound, HTTPConflict, HTTPException, Request, Response

from db import (check_user, select_task, select_tasks, change_password, select_materials_meta, select_materials_data, select_selection_data,
                select_stocks, select_operations, select_operation_data, select_operations_meta, select_dnm_doc_number, select_operation, select_arrival, select_max_tare_id,
                update_job_status, select_tasks_progress, update_rest_gross_weight, update_arrival, delete_arrival, create_arrival, get_material_id,
                check_material_item, check_operation_name, update_operation
                )
from utils import jsonify
from db import DocumentExistsError, ItemsExistsError, ItemsConsumptionError, MaterialError
import json

async def login_handler(request: Request):
    """ хэндлен авторизация """
    security = request.app["crypto"]
    body = await request.json()
    login = body.get("login", "")
    password = body.get("password", "")
    password_hash = security.hash_password(password)
    user = None
    async with request.app["db"].acquire() as conn:
        user = await check_user(conn, login, password_hash)
    if user is None:
        raise HTTPForbidden()
    return await jsonify(security.create_jwt(user), request)


async def change_password_handler(request: Request):
    """ хэндер смены пароля """
    security = request.app["crypto"]
    body = await request.json()
    new_password = body.get("newPassword")
    repetition_password = body.get("repetitionPassword")
    if new_password is None or repetition_password is None or new_password != repetition_password:
        raise HTTPBadRequest(body="Проверьте корректность запроса")
    password_hash = security.hash_password(new_password)
    async with request.app["db"].acquire() as conn:
        await change_password(conn, request.user_id, password_hash)
    return HTTPCreated()


async def get_dnm_doc_number(request: Request):
    operation_id = request.match_info.get("operationID", None)
    if operation_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        dnm_doc_number = await select_dnm_doc_number(conn, operation_id)
    return await jsonify(dnm_doc_number, request)

async def get_operations(request: Request):
    """ получени списка операций """
    stock_id = request.match_info.get("stockID", None)
    #active_operation_mode = request.match_info.get("activeOperationMode", None)
    active_operation_mode_str = request.query.get("activeOperationMode")
    if stock_id is None:
        raise HTTPBadRequest()
    if active_operation_mode_str is None:
        raise HTTPBadRequest()
    active_operation_mode = int (active_operation_mode_str)
    operations = []
    async with request.app["db"].acquire() as conn:
        operations = await select_operations(conn, request.user_id, stock_id, active_operation_mode)
    return await jsonify(operations, request)

async def check_operation_name_handler(request: Request):
    operation_id_str = request.query.get("operationID")
    operation_name = request.query.get("operationName")
    if operation_name is None or operation_id_str is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        exists = await check_operation_name(conn, int(operation_id_str), operation_name)
    return await jsonify(exists, request)


async def get_operation(request: Request):
    """ получени списка документов операции """
    stock_id = request.match_info.get("stockID", None)
    operation_id = request.match_info.get("operationID", None)
    if stock_id is None or operation_id is None:
        raise HTTPBadRequest()
    operation = []
    async with request.app["db"].acquire() as conn:
        operation = await select_operation(conn, request.user_id, stock_id, operation_id)
    return await jsonify(operation, request)

async def get_operations_meta(request: Request):
    """ получени метаданных для операции """
    stock_id = request.match_info.get("stockID", None)
    if stock_id is None:
        raise HTTPBadRequest()
    operation = []
    async with request.app["db"].acquire() as conn:
        operation = await select_operations_meta(conn, request.user_id, stock_id)
    return await jsonify(operation, request)

async def get_operation_data(request: Request):
    """ получение данных операции """
    operation_id = request.match_info.get("operationID", None)
    print(f"Operation ID {operation_id}")
    if operation_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        operation_data = await select_operation_data(conn, operation_id)
    return await jsonify(operation_data, request)

async def get_max_tare_id(request: Request):
    material = request.match_info.get("material", None)
    if material is None:
        raise HTTPBadRequest()
    max_tare_id = 0
    async with request.app["db"].acquire() as conn:
        max_tare_id = await select_max_tare_id(conn, material)
    return await jsonify(max_tare_id, request)

async def get_arrival(request: Request):
    """ получени позиций документа прихода """
    doc_id = request.match_info.get("docID", None)
    if doc_id is None:
        raise HTTPBadRequest()
    arrival = []
    async with request.app["db"].acquire() as conn:
        arrival = await select_arrival(conn, doc_id)
    return await jsonify(arrival, request)

async def get_stocks(request: Request):
    """ получени списка складов """
    stocks = []
    async with request.app["db"].acquire() as conn:
        stocks = await select_stocks(conn, request.user_id)
    return await jsonify(stocks, request)

async def get_materials_meta(request: Request):
    stock_id = request.match_info.get("stockID", None)
    if stock_id is None:
        raise HTTPBadRequest()
    materials_meta = []
    async with request.app["db"].acquire() as conn:
        materials_meta = await select_materials_meta(conn, request.user_id, stock_id)
    return await jsonify(materials_meta, request)

async def get_materials_data(request: Request):
    stock_id = request.match_info.get("stockID", None)
    if stock_id is None:
        raise HTTPBadRequest()
    
    materials = request.query.get("materials")
    stocks = request.query.get("stocks")
    material_groups = request.query.get("material_groups")
    indicators = request.query.get("indicators")
    indicator_conditions = request.query.get("indicator_conditions")
    detailed_mode = request.query.get("detailed_mode")
    only_non_zero_mode = request.query.get("only_non_zero_mode")
    element_order = request.query.get("element_order")

    materials_data = []
    async with request.app["db"].acquire() as conn:
        materials_data = await select_materials_data(
            conn,
            request.user_id,
            stock_id,
            materials=materials,
            stocks=stocks,
            material_groups=material_groups,
            indicators=indicators,
            indicator_conditions=indicator_conditions,
            detailed_mode=detailed_mode,
            only_non_zero_mode=only_non_zero_mode,
            element_order=element_order
        )

    return await jsonify(materials_data, request)

async def get_selection_data(request: Request):
    
    stock_list = request.query.get("stock_list")
    indicators = request.query.get("indicators")
    key_material_list = request.query.get("key_material_list")
    query_type = request.query.get("query_type")
    element_order = request.query.get("element_order")

    selection_data = []
    async with request.app["db"].acquire() as conn:
        selection_data = await select_selection_data(
            conn,
            stock_list=stock_list,
            indicators=indicators,
            key_material_list=key_material_list,
            query_type=query_type,
            element_order=element_order
        )

    return await jsonify(selection_data, request)

async def get_tasks(request: Request):
    """ получение списка заданий """
    stock_id = request.match_info.get("stockID", None)
    if stock_id is None:
        raise HTTPBadRequest()
    tasks = []
    async with request.app["db"].acquire() as conn:
        tasks = await select_tasks(conn, request.user_id, stock_id)
    return await jsonify(tasks, request)


async def tasks_progress(request: Request):
    """ прогресс задач """
    stock_id = request.match_info.get("stockID", None)
    if stock_id is None:
        raise HTTPBadRequest()
    tasks = []
    async with request.app["db"].acquire() as conn:
        tasks = await select_tasks_progress(conn, request.user_id, stock_id)
    return await jsonify(tasks, request)


async def get_task(request: Request):
    """ получение позиций в задании """
    # TODO: нужна привязка еще и по ID юзера
    stock_id = request.match_info.get("stockID", None)
    doc_id = request.match_info.get("taskID", None)
    material_id = request.match_info.get("materialID", None)
    if doc_id is None or stock_id is None or material_id is None:
        raise HTTPBadRequest()
    task = {}
    async with request.app["db"].acquire() as conn:
        task = await select_task(conn, int(stock_id), int(doc_id), int(material_id), request.user_id)
        if task is None:
            raise HTTPNotFound()
    return await jsonify(task, request)


async def update_job_status_handler(request: Request):
    job = await request.json()
    doc_id = job.get("taskID", None)
    material_id = job.get("materialID", None)
    tara_id = job.get("taraID", None)
    status = job.get("done", None)
    net_weight_fact = job.get("netWeightFact", None)
    rest_gross_weight = job.get("restGrossWeight", None)
    add_processing_id = job.get("processingID", 0)

    if doc_id is None or material_id is None or tara_id is None or status is None or net_weight_fact is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            await update_job_status(
                conn,
                doc_id,
                request.user_id,
                material_id,
                tara_id,
                float(net_weight_fact),
                float(rest_gross_weight),
                int(add_processing_id),
                status)  # pylint: disable=too-many-function-args
        except Exception as exc:
            raise HTTPBadRequest(
                body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()

async def check_material_item_handler(request: Request):
    item = await request.json()
    material_id = item.get("materialID", None)
    tara_id = item.get("taraID", None)
    doc_id = item.get("taskID", None)

    doc_list = []

    if doc_id is None or material_id is None or tara_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            doc_list = await check_material_item(
                conn,
                material_id,
                tara_id,
                doc_id)  # pylint: disable=too-many-function-args
        except Exception as exc:
            raise HTTPBadRequest(
                body=str(exc))  # pylint: disable=raise-missing-from
    return await jsonify(doc_list, request)

async def update_jobs_status_handler(request: Request):
    payload: dict = await request.json()
    doc_id = payload.get("taskID", None)
    material_id = payload.get("materialID", None)
    jobs: list[dict] = payload.get("jobs", [])
    if len(jobs) == 0:
        return HTTPCreated()
    if doc_id is None or material_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            for j in jobs:
                await update_job_status(
                    conn,
                    doc_id,
                    request.user_id,
                    material_id,
                    **j)
        except Exception as exc:
            raise HTTPBadRequest(
                body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()

async def create_material_handler(request: Request):
    payload: dict = await request.json()
    material_name = payload.get("name", None)

    if material_name is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            new_material_id = await get_material_id(conn, material_name)
            if new_material_id is None:
                return Response(status=409, text=json.dumps({"new_material_id": 0}), content_type='application/json')            
        except Exception as exc:
            raise HTTPBadRequest(body=str(exc))  # pylint: disable=raise-missing-from
    return Response(status=201, text=json.dumps({"new_material_id": new_material_id}), content_type='application/json')


async def create_arrival_handler(request: Request):
    payload: dict = await request.json()
    stock_id = payload.get("stockID", None)
    user_id = payload.get("userID", None)
    operation_id = payload.get("operationID", None)
    doc_number = payload.get("docNumber", None)

    if stock_id is None or operation_id is None or user_id is None or doc_number is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            new_doc_id = await create_arrival(conn, stock_id, operation_id, user_id, doc_number)
            if new_doc_id is None:
                return Response(status=409, text=json.dumps({"new_doc_id": 0}), content_type='application/json')            
        except Exception as exc:
            raise HTTPBadRequest(body=str(exc))  # pylint: disable=raise-missing-from
    return Response(status=201, text=json.dumps({"new_doc_id": new_doc_id}), content_type='application/json')

async def update_operation_handler(request: Request):
    payload: dict = await request.json()
    print(payload);
    operation_id = payload.get("operationId", None)
    operation_name = payload.get("operationName", None)
    product_id = payload.get("productId", None)
    process_id = payload.get("processId", None)
    executors_id = payload.get("executorsId", None)
    is_completed = payload.get("isCompleted", None)
    document_template_id = payload.get("documentTemplateId", None)
    print(f"operation id: {payload}")
    print(f"is completed :{is_completed}")
    print(f"id of the template:{document_template_id}")
    print(f"{executors_id}")
    print(f"{operation_name}")    
    print(f"{product_id}")    
    print(f"{process_id}")    
    if operation_id is None or operation_name is None or product_id is None or process_id is None or executors_id is None or is_completed is None or document_template_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            await update_operation(conn, operation_id, operation_name, product_id, process_id, executors_id, is_completed, document_template_id)
        except Exception as exc:
            raise HTTPBadRequest(body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()


async def update_arrival_handler(request: Request):
    payload: dict = await request.json()
    stock_id = payload.get("stockID", None)
    doc_id = payload.get("docID", None)
    doc_number = payload.get("docNumber", None)
    doc_date = payload.get("docDate", None)
    arrival_items: list[dict] = payload.get("arrival_items", [])
    production_items: list[dict] = payload.get("production_items", [])

    if stock_id is None or doc_id is None or doc_number is None or doc_date is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            await update_arrival(conn, stock_id, doc_id, doc_number, doc_date, arrival_items, production_items)
        except DocumentExistsError as exc:
            raise HTTPConflict(body=str(exc))  # pylint: disable=raise-missing-from
        except ItemsExistsError as exc:
            raise HTTPConflict(body=str(exc))  # pylint: disable=raise-missing-from
        except ItemsConsumptionError as exc:
            raise HTTPConflict(body=str(exc))  # pylint: disable=raise-missing-from
        except MaterialError as exc:
            raise HTTPConflict(body=str(exc))  # pylint: disable=raise-missing-from
        except Exception as exc:
            raise HTTPBadRequest(body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()

async def delete_arrival_handler(request: Request):
    payload: dict = await request.json()
    doc_id = payload.get("docID", None)

    if doc_id is None:
        raise HTTPBadRequest()
    async with request.app["db"].acquire() as conn:
        try:
            await delete_arrival(conn, doc_id)
        except ItemsConsumptionError as exc:
            print("delete_arrival_handler")
            print(str(exc))
            raise HTTPConflict(body=str(exc))  # pylint: disable=raise-missing-from
        except Exception as exc:
            raise HTTPBadRequest(
                body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()

async def rest_gross_weight(request: Request):
    job = await request.json()
    # return HTTPCreated()
    doc_id = job.get("taskID", None)
    material_id = job.get("material_id", None)
    tare_id = job.get("tare_id", None)
    gross_weight = job.get("gross_weight", None)
    # if doc_id is None or material_id is None or tare_id is None or gross_weight is None:
    #     raise HTTPBadRequest()
    # async with request.app["db"].acquire() as conn:
    #     try:
    #         await update_rest_gross_weight(
    #             conn,
    #             doc_id,
    #             material_id,
    #             tare_id,
    #             gross_weight)
    #     except Exception as exc:
    #         raise HTTPBadRequest(
    #             body=str(exc))  # pylint: disable=raise-missing-from
    return HTTPCreated()
