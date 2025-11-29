# pylint: disable=too-many-lines

from aiomysql import Connection
from functools import reduce

class DocumentExistsError(Exception):
    pass

class ItemsExistsError(Exception):
    pass


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
    , ptd.operation
    , (SELECT material FROM material WHERE id = %(material_id)s) AS material
FROM
    production_task_doc ptd
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


async def select_operations(conn: Connection, user_id: int, stock_id: int):
    q = """
        SELECT 
            o.id
            , o.name AS operation 
            , IFNULL(a.doc_count, 0) AS doc_count 
        FROM operations AS o
        LEFT JOIN operation_executors AS oe ON oe.operation_id = o.id
        LEFT JOIN production_sequence_items AS psi ON psi.operation = o.id 
        LEFT JOIN 
            (
            SELECT operation, COUNT(doc_number) AS doc_count FROM arrival_doc AS doc
            WHERE operation <> '' AND stock = %(stock_id)s
            GROUP BY operation
            )a ON
            a.operation = o.id
        WHERE 
            executor_id = %(user_id)s 
            AND IFNULL(psi.done, 0) = 0   
    """
    operations = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id, "stock_id":stock_id})
        operations = await cur.fetchall()
    return operations

async def select_operation(conn: Connection, user_id: int, stock_id: int, operation_id: int):
    q = """
SELECT
	doc.id as doc_id 
	, doc_number
	, doc_date
	, a.material AS material_id
	, m.material AS material
	, SUM(net_weight) AS net_weight
	, SUM(tare_amount) AS tare_amount 
FROM
	arrival_doc AS doc
LEFT JOIN  
	arrival AS a ON
	a.doc_id = doc.id
LEFT JOIN material as m ON m.id = a.material    
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
	doc_date DESC
	, doc_number
    , material 
    """
    operation = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"user_id": user_id, "stock_id":stock_id, "operation_id":operation_id})
        operation = await cur.fetchall()
    return operation

async def select_arrival(conn: Connection, doc_id: int, material_id: int):
    q = """
SELECT
	key_material
	, tare_id
	, gross_weight
	, tare_type
    , tare.weight AS tare_weight 
FROM
	arrival
LEFT JOIN tare ON tare.id = arrival.tare_type    
WHERE 
	doc_id = %(doc_id)s 
	AND material = %(material_id)s
    """

    arrival = {}

    arrival = await select_arrival_meta(conn, doc_id, material_id)
    if arrival is None:
        return arrival

    arrival_items = []
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "material_id": material_id})
        arrival_items = await cur.fetchall()

    arrival["items"] = arrival_items

    arrival["tare_options"] = await select_tare_options(conn)

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

async def select_arrival_meta(conn: Connection, doc_id: int, material_id: int):
    q = """
SELECT
	doc_number
	, doc_date
    , (SELECT material FROM material WHERE id = %(material_id)s) as material
    , o.name as operation
FROM
	arrival_doc AS a
LEFT JOIN operations AS o ON o.id = a.operation
WHERE 
	a.id = %(doc_id)s 
    """
    arrival_meta = {}
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "material_id": material_id})
        arrival_meta = await cur.fetchone()
    return arrival_meta


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

def make_key_material_string(arrival_items: list[dict]):
    res_string = ""

    if arrival_items:
        res_string = reduce(lambda acc, item: acc  + ",'" +  str(item["key_material"]) + "'", arrival_items, "")
        res_string = res_string[1:]

    return res_string

def make_arrival_items_string(doc_id: int, material_id: int, arrival_items: list[dict]):

    res_string = ""

    for item in arrival_items:
        item_net_weight = item["gross_weight"] - item["tare_weight"]

        item_string = (f",({material_id},{item["tare_id"]},'{item["tare_type"]}',1"
        f",{item["gross_weight"]},{item_net_weight},{item["gross_weight"]},{item_net_weight}"
        f",'{item["key_material"]}',{doc_id})")

        res_string = res_string + item_string

    if res_string:
        res_string = res_string[1:]

    return res_string

async def update_arrival(conn: Connection, stock_id: int, doc_id: int, doc_number: str, doc_date: str, material_id: int, arrival_items: list[dict]):

    doc_number_exists = await check_doc_number(conn, doc_id, doc_number)

    if doc_number_exists:
        raise DocumentExistsError(f"Документ '{doc_number}' уже существует.")

    items_list = await check_items(conn, stock_id, doc_id, arrival_items)

    if items_list:
        raise ItemsExistsError(f"Позиции документа уже приняты из производства: {items_list}.")

    q_update_doc = """
		UPDATE arrival_doc
		SET
		doc_number = %(doc_number)s
		, doc_date = %(doc_date)s
		WHERE
		id = %(doc_id)s
    """

    q_delete_arrival = """
		DELETE FROM arrival
		WHERE
		doc_id = %(doc_id)s AND material = %(material_id)s
    """

    values_string = make_arrival_items_string(doc_id, material_id, arrival_items)
    q_insert_arrival = """
		INSERT INTO arrival (material, tare_id, tare_type, tare_amount, gross_weight_arrival, net_weight_arrival, gross_weight, net_weight, key_material, doc_id)
        VALUES
    """ + values_string
    
    async with conn.cursor() as cur:
        await cur.execute("START TRANSACTION;")

    try:
        async with conn.cursor() as cur:
            await cur.execute(q_update_doc, {"doc_id": doc_id, "doc_number": doc_number, "doc_date": doc_date})

        async with conn.cursor() as cur:
            await cur.execute(q_delete_arrival, {"doc_id": doc_id, "material_id": material_id})

        async with conn.cursor() as cur:
            await cur.execute(q_insert_arrival)

        async with conn.cursor() as cur:
            await cur.execute("COMMIT;")

    except Exception as e:
        async with conn.cursor() as cur:
            await cur.execute("ROLLBACK;")
        print(f"ERROR \"update_arrival\": {e}")

    return 0    


async def check_doc_number(conn: Connection, doc_id: int, doc_number: str):
    q = """ SELECT EXISTS (SELECT TRUE FROM arrival_doc WHERE doc_number = %(doc_number)s AND id <> %(doc_id)s) AS doc_number_exists """
    doc_number_exists = False
    async with conn.cursor() as cur:
        await cur.execute(q, {"doc_id": doc_id, "doc_number": doc_number})
        result = await cur.fetchone()
        if result.get("doc_number_exists", 0) == 1:
            doc_number_exists = True
    return doc_number_exists

async def check_items(conn: Connection, stock_id: int, doc_id: int, arrival_items: list):

    key_material_string = make_key_material_string(arrival_items)

    if not key_material_string:
        return ""
    
    q = """
        SELECT CONCAT('(', tare_id_list, ')', ' - ', doc_number) AS materia_exists FROM
        (
        SELECT doc.doc_number, GROUP_CONCAT(tare_id) AS tare_id_list FROM stock_data AS sd
        INNER JOIN arrival_doc AS doc ON doc.id = sd.doc_id AND doc.operation <> 0
        WHERE key_material IN (""" + key_material_string + """)
        AND sd.stock = %(stock_id)s
        AND doc_type = 0
        AND doc_id <> %(doc_id)s
        GROUP BY doc_number
        ) sd
    """

    print(q)

    items_list = []

    async with conn.cursor() as cur:
        await cur.execute(q, {"stock_id": stock_id, "doc_id": doc_id})
        items_list = await cur.fetchall()
        if isinstance(items_list, tuple):
            items_string = ""
        else:
            print(items_list)
            items_string = reduce(lambda acc, item: acc  + " " + item, items_list)

    print(items_string)

    return items_string


async def delete_arrival(conn: Connection, doc_id: int):

    q = """
		DELETE FROM arrival_doc
        WHERE
		id = %(doc_id)s
    """

    try:
        async with conn.cursor() as cur:
            await cur.execute(q, {"doc_id": doc_id})

    except Exception as e:
        print(f"ERROR \"delete_arrival\": {e}")

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
