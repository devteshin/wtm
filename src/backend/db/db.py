# pylint: disable=too-many-lines

from aiomysql import Connection
from functools import reduce

class DocumentExistsError(Exception):
    pass

class MaterialError(Exception):
    pass

class ItemsExistsError(Exception):
    pass

class ItemsConsumptionError(Exception):
    pass


MATERIAL_KIND_MATERIAL = 0
MATERIAL_KIND_PROBE = 1

async def select_materials_data(
    conn: Connection, 
    user_id: int, 
    stock_id: int,
    materials: str = '',
    stocks: str = '',
    material_groups: str = '',
    indicators: str = '',
    indicator_conditions: str = '',
    detailed_mode: str = '',
    only_non_zero_mode: bool | str = False,
    element_order: str = ''
    ):

    print(materials)
    print(stocks)
    print(material_groups)
    print(indicators)
    print(indicator_conditions)
    print(detailed_mode)
    print(only_non_zero_mode)

    if isinstance(only_non_zero_mode, str):
        only_non_zero_mode_int = 1 if only_non_zero_mode.lower() in ('true', '1') else 0
    else:
        only_non_zero_mode_int = int(only_non_zero_mode)

    async with conn.cursor() as cur:

        try:
            await cur.callproc("report_material_stock", [materials, material_groups, stocks, indicators, indicator_conditions, detailed_mode, only_non_zero_mode_int, '', element_order])
        except Exception as e:
            print(f"ERROR callproc \"report_material_stock\": {e}")
            return report_result
        report_result = await cur.fetchall()


    return report_result

async def select_selection_data(
    conn: Connection, 
    stock_list: str = '',
    indicators: str = '',
    key_material_list: str = '',
    query_type: str = '',
    element_order: str = ''
    ):

    print(stock_list)
    print(indicators)
    print(key_material_list)
    print(query_type)

    async with conn.cursor() as cur:

        try:
            await cur.callproc("report_material_stock", ['', '', stock_list, indicators, '', query_type, 1, key_material_list, element_order])
        except Exception as e:
            print(f"ERROR callproc \"report_material_stock\": {e}")
            return report_result
        report_result = await cur.fetchall()


    return report_result


async def select_materials_meta(conn: Connection, user_id: int, stock_id: int):
    q_stock = """
SELECT 
    id
    , name 
    FROM stock
WHERE organization_id = 
    (SELECT organization_id FROM stock WHERE id = %(stock_id)s)    
    """

    q_element = """
SELECT 
    code
    , name 
    , min_value
    , max_value
    , umi
    , type
    FROM element
WHERE FIND_IN_SET((SELECT organization_id FROM stock WHERE id = %(stock_id)s), organization_id)
    ORDER BY code    
    """
    async with conn.cursor() as cur:
        await cur.execute(q_stock, {"stock_id": stock_id})
        stock_list = await cur.fetchall()

        await cur.execute(q_element, {"stock_id": stock_id})
        material_group_list = await cur.fetchall()

    material_list = await select_materials_list(conn)

    return {
        "material_list": material_list,
        "stock_list": stock_list,
        "material_group_list": material_group_list
    }


async def select_materials_list(conn: Connection):
    q_material = """
SELECT 
    id
    , material as name
    FROM material
WHERE kind = 0    
ORDER BY material    
    """
    async with conn.cursor() as cur:
        await cur.execute(q_material)
        material_list = await cur.fetchall()

    return material_list

async def select_tasks(conn: Connection, user_id: int, stock_id: int) -> list:
    """ получение списка заданий """

    q = """
SELECT
    doc_id
    , material_id
    , material
    , category
    , planned_date
    , technical_process
    , operation
    , weight
    , net_weight_fact
    , exists_in_categories
    , done
FROM
    (
    SELECT * FROM task_operator_materials
    ) tom
ORDER BY
    doc_id
    , material
	, CASE
	WHEN REPLACE(category, ',', '.') REGEXP '^-?[0-9]+(\\.[0-9]+)?$' THEN
	CAST(REPLACE(category, ',', '.') AS DECIMAL(10, 3))
	ELSE 0
	END,
	category ASC
    """

    result = []
    
    async with conn.cursor() as cur:

        try:
            await cur.callproc("app_get_operator_task_table", [user_id, stock_id])
        except Exception as e:
            print(f"ERROR callproc \"app_get_operator_task_table\": {e}")
            return result    
        try:
            await cur.execute(q)
        except Exception as e:
            return result    
        result = await cur.fetchall()
        if isinstance(result, tuple):
            result = []
    return result

async def select_tasks_progress(conn: Connection, user_id: int, stock_id: int) -> list:

    q = """
SELECT
    material
    , doc_id
    , doc_number
    , planned_date
    , technical_process
    , operation
    , category
    , weight
    , net_weight_fact AS weight_fact
    , done
FROM
    (
    SELECT * FROM task_operator_categories
    ) toc
ORDER BY
    doc_id ASC
	, CASE
	WHEN REPLACE(category, ',', '.') REGEXP '^-?[0-9]+(\\.[0-9]+)?$' THEN
	CAST(REPLACE(category, ',', '.') AS DECIMAL(10, 3))
	ELSE 0
	END,
	category ASC
    """

    result = []
    
    async with conn.cursor() as cur:
        try:
            await cur.callproc("app_get_operator_task_table", [user_id, stock_id])
        except Exception as e:
            print(f"ERROR callproc \"app_get_operator_task_table\": {e}")
            return result    
        try:
            await cur.execute(q)
        except Exception as e:
            return result    
        result = await cur.fetchall()
        if isinstance(result, tuple):
            result = []
    return result


async def select_task_meta(conn: Connection, stock_id: int, doc_id: int, material_id: int):

    q = """
SELECT
    ptd.id
    , ptd.doc_number
    , ptd.doc_date
    , ptd.planned_date
    , ptd.stock
    , ptd.technical_process
    , o.name AS operation
    , (SELECT material FROM material WHERE id = %(material_id)s) AS material
FROM
    production_task_doc ptd
LEFT JOIN operations AS o ON o.id = ptd.operation    
WHERE
    ptd.id = %(doc_id)s
    AND
    ptd.stock = %(stock_id)s
    AND
    ptd.done = 0
"""

    q_categories_materials = """
SELECT 
	category
	, GROUP_CONCAT(DISTINCT m.material SEPARATOR ';') AS meterials
FROM 
	selection_materials AS sm
LEFT JOIN material AS m ON
    m.id = sm.material
WHERE
    pt_doc_id = (SELECT IF(parent_doc_id = 0, id, parent_doc_id) FROM production_task_doc WHERE id = %(doc_id)s)
GROUP BY
    category
"""

    task = None
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "stock_id": stock_id, "material_id": material_id})
        task = await cur.fetchone()
        if task is not None:
            catmat = {}
            await cur.execute(q_categories_materials, {"doc_id": doc_id})
            for row in await cur.fetchall():
                catmat[row["category"]] = row["meterials"]
            task["catmat"] = catmat
    return task


async def select_processing_types(conn: Connection):
    q = """SELECT pt.id, pt.process_name FROM processing_type AS pt ORDER BY pt.id ASC"""
    processing_types: list[dict] = []
    async with conn.cursor() as cur:
        await cur.execute(q)
        processing_types.extend(await cur.fetchall())
    return processing_types


async def select_task(conn: Connection, stock_id: int, doc_id: int, material_id: int, user_id: int):
    """ получение позиций задания """

    async with conn.cursor() as cur:
        try:
            await cur.callproc("app_get_task_table", [doc_id, material_id])
        except Exception as e:
            print(f"ERROR callproc \"app_get_task_table\": {e}")
            return None    

    task = await select_task_meta(conn, stock_id, doc_id, material_id)
    if task is None:
        return task

    task["task_weights"] = await get_task_weights(conn, doc_id, material_id, user_id)
    task["processing_types"] = await select_processing_types(conn)

    q = """
SELECT 
	material
	, material_id
	, tare_id
	, tare_mark
	, tare_type
	, tara_weight
	, category
	, rest_gross_weight
	, task_tare_amount
	, task_net_weight
	, net_weight_fact
	, add_processing_id
	, done
	FROM
	(
		SELECT * FROM app_production_task_items
	) pti
    """

    jobs = []
    async with conn.cursor() as cur:
        await cur.execute(q)
        jobs = await cur.fetchall()
    task["jobs"] = jobs

    return task


async def get_task_weights(conn: Connection, doc_id: int, material_id: int, user_id: int):
    
    q1 = """
SELECT
	doc_id
	, material_id
	, material
	, category
	, tare_amount
	, task_weight
	, tare_amount_fact
	, net_weight_fact
	, category_details
FROM
	(
	SELECT * FROM task_weight
	) tw
"""
    task_weights: list[dict] = []

    async with conn.cursor() as cur:
        await cur.execute(q1)
        task_weights = await cur.fetchall()
        # fix: пустой результат возвращает пустой tuple, а не list
        if isinstance(task_weights, tuple):
            task_weights = []
    return task_weights

async def check_material_item(conn: Connection, material_id: int, tare_id: int, doc_id: int):
    
    q = """
SELECT	@next_doc_number_list AS next_doc_number_list
    """
    next_doc_list: list[dict] = []

    async with conn.cursor() as cur:
        try:
            await cur.callproc("check_material_next_process", [material_id, tare_id, doc_id])
        except Exception as e:
            print(f"ERROR callproc \"check_material_next_process\": {e}")
            return next_doc_list    

        await cur.execute(q)
        next_doc_list = await cur.fetchall()
        if isinstance(next_doc_list, tuple):
            next_doc_list = []

    return next_doc_list



async def check_user(conn: Connection, login: str, password_hash: str):
    """ проверка авторизации пользователя """
    q = """
SELECT
    s.id
    , s.login
    , s.employee_name
    , s.can_login
FROM
    staff s
WHERE
    s.can_login IS TRUE
    AND
    s.login = %(login)s
    AND
    s.password = %(password_hash)s
    """
    result = {}
    async with conn.cursor() as cur:
        await cur.execute(q, {"login": login, "password_hash": password_hash})
        result = await cur.fetchone()
    return result


async def change_password(conn: Connection, user_id: int, password_hash: str):
    q = """
    UPDATE staff
    SET password=%(password_hash)s
    WHERE id = %(user_id)s AND can_login = 1
    """
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id, "password_hash": password_hash})


async def check_can_login(conn: Connection, user_id: int):
    """ проверка возможности входа по токену"""
    q = """ SELECT EXISTS (SELECT TRUE FROM staff s WHERE s.id = %(user_id)s AND s.can_login IS TRUE ) AS can_login """
    can_login = False
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id})
        result = await cur.fetchone()
        if result.get("can_login", 0) == 1:
            can_login = True
    return can_login


async def select_dnm_doc_number(conn: Connection, operation_id: int):
    if operation_id == 0:
        return ""

    async with conn.cursor() as cur:
        try:
            await cur.callproc("get_dnm_doc_number", [operation_id])
        except Exception as e:
            print(f"ERROR callproc \"get_dnm_doc_number\": {e}")
            return ""   
        try:
            await cur.execute("SELECT @dnm_doc_number AS dnm_doc_number")
            result = await cur.fetchone()
            dnm_doc_number = result.get("dnm_doc_number", None)
            return dnm_doc_number
        except Exception as e:
            print(f"ERROR \"select_dnm_doc_number\": {e}")

    return ""


async def select_operations(conn: Connection, user_id: int, stock_id: int, active_operation_mode: int):
    q = """
        SELECT 
            o.id
            , o.name AS operation 
            , IFNULL(a.doc_count, 0) AS doc_count
        FROM operations AS o
        LEFT JOIN operation_executors AS oe ON oe.operation_id = o.id
        LEFT JOIN 
            (
            SELECT operation, COUNT(doc_number) AS doc_count FROM arrival_doc AS doc
            WHERE operation <> '' AND stock = %(stock_id)s
            GROUP BY operation
            )a ON
            a.operation = o.id
        WHERE 
            executor_id = %(user_id)s 
            AND o.done <> %(active_operation_mode)s   
    """
    operations = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id, "stock_id":stock_id, "active_operation_mode":active_operation_mode})
        operations = await cur.fetchall()
    return operations

async def select_operations_meta(conn: Connection, user_id: int, stock_id: int):
    operations_meta = {}
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, process_name FROM technical_process")
        processes = await cur.fetchall()
        await cur.execute("SELECT id, employee_name FROM staff")
        executors = await cur.fetchall()
        await cur.execute("SELECT id, name AS template_name FROM doc_num_modifier")
        doc_templates = await cur.fetchall()
    material_list = await select_materials_list(conn)
    operations_meta["products"] =  [
            {
                "id": item["id"],
                "product_name": item["name"],
            }
            for item in material_list
    ]
    operations_meta["processes"] = processes
    operations_meta["executors"] = executors
    operations_meta["doc_templates"] = doc_templates
    return operations_meta

async def select_operation_data(conn: Connection, operation_id: int):
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT name, product_id, dnm_id, tp_id, done
            FROM operations
            WHERE id = %(operation_id)s
            """,
            {"operation_id": operation_id},
        )
        row = await cur.fetchone()

        if row is None:
            return None

        operation_data = {
            "operationName": row["name"],
            "productId": row["product_id"],
            "processId": row["tp_id"],
            "documentTemplateId": row["dnm_id"],
            "isCompleted": bool(row["done"]),
        }

        await cur.execute(
            """
            SELECT ptd.id AS task_id FROM production_task_doc AS ptd 
            INNER JOIN operations AS o ON o.id = ptd.operation AND o.id = %(operation_id)s
            WHERE ptd.type = 0 AND ptd.doc_number = o.name
            """,
            {"operation_id": operation_id},
        )
        result = await cur.fetchone()
        if result:
            operation_data["taskId"] = result["task_id"]
        else:    
            operation_data["taskId"] = 0


        await cur.execute(
            "SELECT executor_id FROM operation_executors WHERE operation_id = %(operation_id)s",
            {"operation_id": operation_id},
        )
        executors_raw = await cur.fetchall()
        operation_data["executorIds"] = [e["executor_id"] for e in executors_raw]

        return operation_data

async def update_operation(conn: Connection, operation_id: int, operation_name: str, product_id: int, process_id: int, executors_id: list[int], is_completed: bool, document_template_id: int, task_id: int):

    new_operation_id = None
    async with conn.cursor() as cur:
        await conn.begin()
        try:

            await cur.callproc("upsert_operation", [operation_id, operation_name, product_id, document_template_id, process_id, int(is_completed), 1])
            result = await cur.fetchone()
            if result and len(result) > 0:
                new_operation_id = result.get("operation_id")

            if new_operation_id is None:
                await conn.rollback()
                raise ValueError("Хранимая процедура upsert_operation не вернула operation_id")

            if executors_id:
                await cur.execute("DELETE FROM operation_executors WHERE operation_id = %(operation_id)s", {"operation_id":new_operation_id})
                q_insert_executors = "INSERT INTO operation_executors (operation_id, executor_id) VALUES (%s, %s)"
                values = [(new_operation_id, eid) for eid in executors_id]
                await cur.executemany(q_insert_executors, values)

            if task_id:
                await cur.execute("UPDATE production_task_doc SET doc_number = %(operation_name)s WHERE id = %(task_id)s", {"operation_name":operation_name}, {"task_id":task_id})

        except Exception as e:
            await conn.rollback()
            print(f"ERROR \"update_operation\": {e}")
            return
        await conn.commit()

    return new_operation_id   


async def select_operation(conn: Connection, user_id: int, stock_id: int, operation_id: int):
    q = """
SELECT
	doc.id as doc_id 
	, doc_number
	, DATE_FORMAT(doc_date, '%%d.%%m.%%Y') AS doc_date
	, a.material AS material_id
	, m.material AS material
	, ROUND(SUM(net_weight), 2) AS net_weight
	, SUM(tare_amount) AS tare_amount
    , doc_date AS sorted_doc_date 
FROM
	arrival_doc AS doc
LEFT JOIN  
	arrival AS a ON
	a.doc_id = doc.id
LEFT JOIN material as m ON m.id = a.material
INNER JOIN operations AS o ON o.id = doc.operation
    AND o.id IN (SELECT operation_id FROM operation_executors WHERE executor_id = %(user_id)s)    
WHERE 
	doc.stock = %(stock_id)s 
	AND doc.operation = %(operation_id)s
GROUP BY 
	doc.id
    , doc_number
	, doc_date
    , material_id
    , material
ORDER BY 
	sorted_doc_date DESC
	, doc_number
    , material 
    """
    operation = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id, "stock_id":stock_id, "operation_id":operation_id})
        operation = await cur.fetchall()
    return operation

async def select_max_tare_id(conn: Connection, material: str):
    q = """
    SELECT IFNULL(MAX(tare_id), 0) AS max_tare_id FROM arrival
    INNER JOIN material AS m ON m.id = arrival.material AND m.material = %(material)s
"""

    async with conn.cursor() as cur:
        try:
            await cur.execute(q, {"material": material})
            result = await cur.fetchone()
            max_tare_id = result.get("max_tare_id", 0)
            return max_tare_id

        except Exception as e:
            return 0

async def select_arrival(conn: Connection, doc_id: int):
    q_items = """
SELECT
    CONCAT(m.material, '_', tare_id) AS key_material
	, m.material AS material
	, tare_id
	, gross_weight
	, tare_type
	, tare.weight AS tare_weight
    , IFNULL(next_operation_flag, '') AS next_operation_flag 
FROM
	arrival
LEFT JOIN tare ON tare.id = arrival.tare_type    
LEFT JOIN material AS m ON m.id = arrival.material
WHERE 
	doc_id = %(doc_id)s 
    """

    arrival = {}

    arrival = await select_arrival_meta(conn, doc_id)
    if arrival is None:
        return None

    arrival_items = []
    async with conn.cursor() as cur:
        await cur.execute(q_items, {"doc_id": doc_id})
        arrival_items = await cur.fetchall()

    arrival["items"] = arrival_items

    arrival["tare_options"] = await select_tare_options(conn)

    # получаем материалы - продукты предыдущих этапов из схемы производства
    arrival["base_raw_materials"] = await select_base_raw_material(conn, arrival["operation"])

    # получаем материалы (позиции документа) списанные на операцию текущего документа прихода из производства по ссылке из этого документа
    # на документ production_doc 
    arrival["raw_materials"] = await select_raw_materials_to_arrival_doc_operation(conn, doc_id)

    return arrival

async def select_tare_options(conn: Connection):
    q = """
SELECT
	id as tare_type
	, weight as tare_weight
	, type_id as tare_type_id
FROM
	tare
WHERE app = 1    
ORDER BY id    
    """
    tare_options = []
    async with conn.cursor() as cur:
        await cur.execute(q)
        tare_options = await cur.fetchall()

    return tare_options

async def select_arrival_meta(conn: Connection, doc_id: int):
    q = """
SELECT
	doc_number
	, doc_date
    , o.name as operation
    , IFNULL(m.material, '') AS operation_material
FROM
	arrival_doc AS a
LEFT JOIN operations AS o ON o.id = a.operation
LEFT JOIN material AS m ON m.id = o.product_id
WHERE 
	a.id = %(doc_id)s 
    """
    arrival_meta = {}
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id})
        arrival_meta = await cur.fetchone()
    return arrival_meta

async def select_base_raw_material(conn: Connection, operation: str):
    q = """
        SELECT DISTINCT sd.material AS material_id, m.material AS material FROM stock_data AS sd
        INNER JOIN arrival_doc AS doc ON doc.id = sd.doc_id 
        AND doc.operation IN (
            SELECT operation FROM production_sequence_items AS psi
            INNER JOIN
            (
                SELECT ps_id, stage - 1 AS stage FROM production_sequence_items AS psi
                INNER JOIN operations AS o ON o.id = psi.operation AND o.name = %(operation)s
            ) prev_psi ON prev_psi.ps_id = psi.ps_id AND prev_psi.stage = psi.stage
        )
        LEFT JOIN material AS m ON m.id = sd.material
        WHERE sd.doc_type = 0
    """
    base_raw_material = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"operation": operation})
        base_raw_material = await cur.fetchall()

    return base_raw_material

async def select_raw_materials_to_arrival_doc_operation(conn: Connection, arrival_doc_id: int):
    # материалы списанные на операцию документа прихода из производства
    q = """
        SELECT p.material AS material_id, m.material, tare_id, net_weight FROM production AS p
        INNER JOIN production_doc AS doc ON p.doc_id = doc.id 
            AND doc.id = (SELECT pr_doc_id FROM arrival_doc WHERE id = %(arrival_doc_id)s)
        LEFT JOIN material AS m ON m.id = p.material
        order by m.material, tare_id
    """
    raw_materials = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"arrival_doc_id": arrival_doc_id})
        raw_materials = await cur.fetchall()

    return [
            {
                "material_id": int(item["material_id"]),
                "material": item["material"],
                "tare_id": item["tare_id"],
                "net_weight": item["net_weight"],
            }
            for item in raw_materials
        ]

async def select_stocks(conn: Connection, user_id: int):
    q = """
SELECT
    s.id
    , s.name
    , SUM(IF(ptd.done = 0 AND pte.executor_id = %(user_id)s, 1, 0)) tasks_count
FROM
    stock s
LEFT JOIN production_task_doc ptd ON
    ptd.stock = s.id
LEFT JOIN production_task_executor pte ON
    pte.doc_id = ptd.id
WHERE
    s.app IS TRUE
GROUP BY
    s.id
    , s.name
ORDER BY
    s.name
    """
    stocks = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id})
        stocks = await cur.fetchall()
    return stocks

def make_arrival_items_string(doc_id: int, material_id_dict: dict, arrival_items: list[dict]):

    res_string = ""

    for item in arrival_items:
        item_net_weight = item["gross_weight"] - item["tare_weight"]
        item_next_operation_flag = item["next_operation_flag"] if item["next_operation_flag"] != "" else "NULL"    

        item_string = (f",({material_id_dict[item["material"]]},{item["tare_id"]},'{item["tare_type"]}',1"
        f",{item["gross_weight"]},{item_net_weight},{item["gross_weight"]},{item_net_weight}"
        f",'{material_id_dict[item["material"]]}_{item["tare_id"]}',{doc_id},{item_next_operation_flag})")

        res_string = res_string + item_string

    if res_string:
        res_string = res_string[1:]

    return res_string

def make_production_items_string(production_items: list[dict]):

    res_string = ""

    for item in production_items:

        item_string = (f",('{item["material_id"]}_{item["tare_id"]}',1"
        f",{item["net_weight"]},{item["material_id"]},{item["tare_id"]},0)")

        res_string = res_string + item_string

    if res_string:
        res_string = res_string[1:]

    return res_string

async def update_arrival(conn: Connection, stock_id: int, doc_id: int, doc_number: str, doc_date: str, arrival_items: list[dict], production_items: list[dict]):

    doc_number_exists = await check_doc_number_arrival(conn, doc_id, doc_number)

    if doc_number_exists:
        raise DocumentExistsError(f"Документ приема из производства'{doc_number}' уже существует.")

    if production_items:
        doc_number_exists = await check_doc_number_production(conn, doc_id, doc_number)

        if doc_number_exists:
            raise DocumentExistsError(f"Документ списания материалов в производство'{doc_number}' уже существует.")

    material_id_dict = await get_material_id_dict(conn, arrival_items)
    if material_id_dict is None:
        raise MaterialError(f"Ошибка при формировании кода материала.")

    q_get_org_id = """
        select organization_id from stock where id = %(stock_id)s
    """
    
    q_insert_doc_tmp = """
        insert into arrival_doc_tmp 
        (
        doc_number, doc_date, operation, car_number, car_brand, car_driver, stock, stock_from
        )
        select 
        %(doc_number)s, %(doc_date)s, operation, car_number, car_brand, car_driver, stock, stock_from 
        from arrival_doc where id = %(doc_id)s
    """

    arrival_values_string = make_arrival_items_string(doc_id, material_id_dict, arrival_items)
    if arrival_values_string:
        q_insert_arrival_tmp = """
            INSERT INTO arrival_tmp (material, tare_id, tare_type, tare_amount, gross_weight_arrival
            , net_weight_arrival, gross_weight, net_weight, key_material, doc_id, next_operation_flag)
            VALUES
        """ + arrival_values_string

    production_values_string = make_production_items_string(production_items)
    if production_values_string:
        q_insert_production_tmp = """
            INSERT INTO production_tmp (key_material, tare_amount, net_weight, material, tare_id, doc_id)
            VALUES
        """ + production_values_string

    async with conn.cursor() as cur:
        await cur.callproc("action_arrival_write_before")
        #await cur.execute("START TRANSACTION;")
        await conn.begin()
        try:
            await cur.execute(q_get_org_id, {"stock_id": stock_id})
            result = await cur.fetchone()
            if result is None:
                print("Не установлена организация")    
            org_id = result.get("organization_id", 1)
            await cur.execute(q_insert_doc_tmp, {"doc_number": doc_number, "doc_date": doc_date, "doc_id": doc_id})
            if arrival_values_string:
                await cur.execute(q_insert_arrival_tmp)
            if production_values_string:
                await cur.execute(q_insert_production_tmp)
            await cur.callproc("action_arrival_write", [doc_id, 0])
            await cur.callproc("action_arrival_util_ind_transmit", [org_id, doc_id])
            await cur.callproc("action_arrival_util_app_update_production", [doc_id])

        except Exception as e:
            await conn.rollback()
            #await cur.execute("ROLLBACK;")
            print(f"ERROR \"update_arrival\": {e}")
            return

        err_string = await check_arrival_error(conn, "check_consumption_err")
        if err_string:
            await conn.rollback()
            #await cur.execute("ROLLBACK;")

            raise ItemsConsumptionError(f"Есть списание по позициям: {err_string}.")
        err_string = await check_arrival_error(conn, "check_extra_input_err")
        if err_string:
            await conn.rollback()
            #await cur.execute("ROLLBACK;")
            raise ItemsConsumptionError(f"Повторный приход по позициям: {err_string}.")
        await conn.commit()
        #await cur.execute("COMMIT;")


    return    

async def get_material_id_dict(conn: Connection, arrival_items: list[dict]):
    material_id_dict = {}

    for item in {item["material"] for item in arrival_items}:
        material_id_dict[item] = await get_material_id(conn, item)
        if material_id_dict[item] == 0:
            return None
    return material_id_dict

async def get_material_id(conn: Connection, material: str):
    q = "select id, kind from material where material = %(material)s"
    async with conn.cursor() as cur:
        await cur.execute(q, {"material": material})
        result = await cur.fetchone()
        if result is None:
            q = "insert into material (material, kind) values (%(material)s, %(kind)s)"
            await cur.execute(q, {"material": material, "kind": MATERIAL_KIND_MATERIAL})
            await cur.execute("SELECT LAST_INSERT_ID() AS id")
            result = await cur.fetchone()
            return result.get("id", 0)
        else:
            if result.get("kind", None) == MATERIAL_KIND_PROBE:
                return 0
            else:
                return result.get("id", 0)

async def check_operation_name(conn: Connection, operation_id: int, operation_name: str):
    q = """ SELECT EXISTS (SELECT TRUE FROM operations 
    WHERE name = %(operation_name)s 
    AND id <> %(operation_id)s) AS operation_exists 
    """
    async with conn.cursor() as cur:
        await cur.execute(q, {"operation_id": operation_id, "operation_name": operation_name})
        result = await cur.fetchone()

    return bool(result.get("operation_exists", 0))


async def check_doc_number_arrival(conn: Connection, doc_id: int, doc_number: str):
    q = """ SELECT EXISTS (SELECT TRUE FROM arrival_doc WHERE doc_number = %(doc_number)s AND id <> %(doc_id)s) AS doc_number_exists """
    doc_number_exists = False
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "doc_number": doc_number})
        result = await cur.fetchone()
        if result.get("doc_number_exists", 0) == 1:
            doc_number_exists = True
    return doc_number_exists

async def check_doc_number_production(conn: Connection, doc_id: int, doc_number: str):
    q = """ SELECT EXISTS (SELECT TRUE FROM production_doc 
    WHERE doc_number = %(doc_number)s 
    AND id <> (SELECT pr_doc_id FROM arrival_doc WHERE id = %(doc_id)s)) AS doc_number_exists 
    """
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "doc_number": doc_number})
        result = await cur.fetchone()

    return bool(result.get("doc_number_exists", 0))


async def delete_operation(conn: Connection, operation_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.callproc("delete_unused_operation", [operation_id])
        return cur.rowcount == 1
    
async def delete_arrival(conn: Connection, doc_id: int):

    async with conn.cursor() as cur:
        try:
            await cur.callproc("action_arrival_delete_before")
            #await cur.execute("START TRANSACTION;")
            await conn.begin()
            await cur.callproc("action_arrival_util_app_delete_production", [doc_id])
            await cur.callproc("action_arrival_delete", [doc_id])

        except Exception as e:
            await conn.rollback()
            #await cur.execute("ROLLBACK;")
            print(f"ERROR \"delete_arrival\": {e}")
            return

        err_string = await check_arrival_error(conn, "check_consumption_err")
        if err_string:
            await conn.rollback()
            #await cur.execute("ROLLBACK;")
            raise ItemsConsumptionError(f"Есть списание по позициям: {err_string}.")
        await conn.commit()
        #await cur.execute("COMMIT;")


async def check_arrival_error(conn: Connection, err_table_name: str):
    async with conn.cursor() as cur:
        try:
            await cur.execute("SELECT material, tare_id FROM " + err_table_name)
            err_list = await cur.fetchall()
            err_string = ""
            if not isinstance(err_list, tuple):
                for item in err_list:
                    err_string += f", '{item['material']} номер {item['tare_id']}'"
                err_string = err_string[1:] if err_string else ""
            return err_string
        except:
            return ""


async def create_arrival(conn: Connection, stock_id: int, operation_id: int, user_id: int, doc_number: str):
    if operation_id == 0:
        return None

    q_create = """
        INSERT INTO arrival_doc (doc_number, doc_date, operation, stock)
        VALUES (%(doc_number)s, CURDATE(), %(operation_id)s, %(stock_id)s)
    """

    try:
        async with conn.cursor() as cur:
            await cur.execute(q_create, {"stock_id": stock_id, "operation_id": operation_id, "user_id": user_id, "doc_number": doc_number})

            await cur.execute("SELECT LAST_INSERT_ID() AS id")
            result = await cur.fetchone()
            new_doc_id = result.get("id", None)
            return new_doc_id

    except Exception as e:
        print(f"ERROR \"create_arrival\": {e}")

    return None


async def update_job_status(conn: Connection, doc_id: int, user_id: int, material_id: int, tara_id: int, net_weight_fact: float, rest_gross_weight: float, add_processing_id: int, status: bool):

    async with conn.cursor() as cur:
        try:
            await cur.callproc("app_update_job_status", [doc_id, user_id, material_id, tara_id, net_weight_fact, rest_gross_weight, add_processing_id, status])
        except Exception as e:
            print(f"ERROR callproc \"app_update_job_status\": {e}")
    return


async def update_rest_gross_weight(conn: Connection, doc_id: int, material_id: int, tare_id: int, gross_weight: float):
     q = """
 UPDATE production_task
 SET
     gross_weight = %(gross_weight)s
 WHERE
     doc_id = %(doc_id)s
     AND
     material = %(material_id)s
     AND
     tare_id = %(tare_id)s
     """
     async with conn.cursor() as cur:
         await cur.execute(q, {
             "doc_id": doc_id,
             "material_id": material_id,
             "tare_id": tare_id,
             "gross_weight": gross_weight
         })
