from aiohttp import web
from datetime import datetime
import traceback
import sqlite3
import json
import logging

logging.basicConfig(level=logging.INFO)

database: sqlite3.Connection


async def post_update(req: web.Request) -> web.Response:
    if req.headers["APPID"] not in {"ArigiBBDC1207", "Arigi70005996"}:
        return web.Response(text="Error: Wrong APPID", status=400)
    try:
        name = req.query["name"]
        time = datetime.now().timestamp()
        value = float((await req.content.read()).decode("utf-8"))
        database.execute("insert into history values (?, ?, ?)", (name, time, value))
        database.execute("insert or replace into numbers values (?, ?)", (name, value))
        database.commit()
        return web.Response(text="Updated", status=200)
    except Exception as e:
        traceback.print_exc()
        return web.Response(text=f"Error: {e}", status=500)


async def get_numbers(req: web.Request) -> web.Response:
    ret = {
        name: {
            "value": value,
            "history": [
                {
                    "time": time,
                    "value": hvalue,
                }
                for time, hvalue in database.execute(
                    "select time, value from history where name = ? order by time",
                    (name,),
                )
            ],
        }
        for name, value in database.execute("select name, value from numbers")
    }
    return web.Response(text=json.dumps(ret, ensure_ascii=False, separators=(",", ":")))


async def get_index(req: web.Request) -> web.FileResponse:
    return web.FileResponse("index.html")


if __name__ == "__main__":
    database = sqlite3.connect("main.db")
    database.execute(
        "create table if not exists history ("  #
        " name text,"
        " time real,"
        " value real)"
    )
    database.execute(
        "create index if not exists history_nt on history ("  #
        " name,"
        " time)"
    )
    database.execute(
        "create table if not exists numbers ("
        " name primary key,"
        " value real)"
        " without rowid"
    )
    app = web.Application()
    app.router.add_post("/post_update", post_update)
    app.router.add_get("/get_numbers", get_numbers)
    app.router.add_get("/", get_index)
    app.router.add_static("/", "web")
    web.run_app(app, host="127.0.0.1", port=32451)
