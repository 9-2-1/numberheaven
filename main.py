from aiohttp import web
from datetime import datetime
import argparse
import traceback
import sqlite3
import time
import calendar
import json
import logging

logging.basicConfig(level=logging.INFO)

database: sqlite3.Connection

appid: list[str] = []

cache_timestamp = 0.0
ret_json = ""


async def post_update(req: web.Request) -> web.Response:
    global appid
    if req.headers["APPID"] not in appid:
        return web.Response(text="Error: Wrong APPID", status=400)
    try:
        name = req.query["name"]
        time = datetime.now().timestamp()
        value = float((await req.content.read()).decode("utf-8"))
        database.execute("insert or replace into lastupdate values (0, ?)", (time,))
        database.execute("insert into history values (?, ?, ?)", (name, time, value))
        database.execute("insert or replace into numbers values (?, ?)", (name, value))
        database.commit()
        return web.Response(text="Updated", status=200)
    except Exception as e:
        traceback.print_exc()
        return web.Response(text=f"Error: {e}", status=500)


async def get_numbers(req: web.Request) -> web.Response:
    global cache_timestamp, ret_json
    last_update = 0
    for (last,) in database.execute("select lastupdate from lastupdate"):
        last_update = last
    if cache_timestamp != last_update:
        cache_timestamp = last_update
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
        ret_json = json.dumps(ret, ensure_ascii=False, separators=(",", ":"))

    last_modified = time.strftime(
        "%a, %d %b %Y %H:%M:%S GMT", time.gmtime(int(cache_timestamp))
    )
    if_modified_since = req.headers.get("If-Modified-Since", "?")
    try:
        req_timestamp = calendar.timegm(
            time.strptime(if_modified_since, "%a, %d %b %Y %H:%M:%S GMT")
        )
    except ValueError:
        req_timestamp = int(cache_timestamp) - 1
    headers = {
        "Last-Modified": last_modified,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
    }
    if int(cache_timestamp) == int(req_timestamp):
        return web.Response(status=304, headers=headers)
    return web.Response(text=ret_json, headers=headers)


async def get_index(req: web.Request) -> web.FileResponse:
    return web.FileResponse("web/index.html")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default=32451, type=int)
    parser.add_argument("--db", default="main.db")
    args = parser.parse_args()
    with open("APPID.txt", "r") as f:
        appid = f.read().splitlines()
    database = sqlite3.connect(args.db)
    database.execute(
        "create table if not exists lastupdate ("  #
        " uniquev integer primary key,"
        " lastupdate real)"
    )
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
    web.run_app(app, host="127.0.0.1", port=args.port)
