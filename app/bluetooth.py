"""
Every BLE package on npm was broken for me. So I had to delegate bluetooth handling to python.

This handles discovery of Roo-Blocks over BLE as well as code upload & execution.
It communicates with the Electron App with JSON over IPC (for which it is the server and this is the client)

This must be run with root permissions (sudo).
"""

import pygatt
from binascii import hexlify
import asyncio
import time
import os
import json
from async_timeout import timeout
import threading

# these characteristics have to be copied into bluetooth.py too
STATE_CHARACTERISTIC = "5497c8f9-6163-4fbd-b372-7a1d9e77168d"
UPLOAD_BUFFER_CHARACTERISTIC = "aa86a5d5-95f9-4c0b-8797-44b48a85f686"
# bytes that can be transferred at a time
UPLOAD_BUFFER_CHARACTERISTIC_MTU = 512
UPLOADING_STATE = b'uploading'
IDLE_STATE = b'idle'

IPC_SOCKET = os.environ.get('IPC_SOCKET')

adapter = pygatt.GATTToolBackend()


def json_ipc(msg_type, data):
    return(json.dumps({
        'type': msg_type,
        'data': data
    }) + '\n').encode()


def upload_program(roo_blocks, program, progress_cb):
    print('writing program to flash over ble...')
    roo_blocks.char_write(STATE_CHARACTERISTIC, UPLOADING_STATE)
    received_notification = False

    def handle_notify(_a, _b):
        nonlocal received_notification
        received_notification = True
        print('received notification')
    roo_blocks.subscribe(UPLOAD_BUFFER_CHARACTERISTIC, handle_notify)

    program_size = len(program)

    for offset in range(0, program_size, UPLOAD_BUFFER_CHARACTERISTIC_MTU):
        received_notification = False
        roo_blocks.char_write(
            UPLOAD_BUFFER_CHARACTERISTIC,
            program[offset:offset + UPLOAD_BUFFER_CHARACTERISTIC_MTU].encode()
        )

        # this is hacky but I couldn't get the subscribe callback wrapped in a future properly.
        # It has something to do with the pygatt device event loop being run on a separate thread.
        # this causes the future to be cancelled most of the time but I can't figure out why.
        # Even when it doesn't cancel (intermittently), the main thread hangs on await
        # (the future isn't notifying the executor properly across threads)
        while not received_notification:
            time.sleep(0.01)

        progress_cb(
            round(
                min(
                    offset + UPLOAD_BUFFER_CHARACTERISTIC_MTU,
                    program_size)
                / program_size,
                2)
            * 100)

    print('setting idle')
    roo_blocks.char_write(STATE_CHARACTERISTIC, IDLE_STATE)
    print('done!')


def connect_ble(uuid):
    roo_blocks = adapter.connect(uuid)
    roo_blocks.bond()  # encrypt connection

    def on_disconnect(_e):
        global roo_blocks
        roo_blocks = None
        print('disconnected')
    roo_blocks.register_disconnect_callback(on_disconnect)
    print('connected!')
    return roo_blocks


async def main():
    try:
        adapter.start()
        print('connected to bluetooth')
        while True:
            try:
                reader, writer = await asyncio.open_unix_connection(IPC_SOCKET)
                break
            except FileNotFoundError:  # server hasn't set up yet
                time.sleep(1)
            except ConnectionRefusedError:  # socket is not in use and must be cleaned up
                os.remove(IPC_SOCKET)

        writer.write(json_ipc('connected', False))
        await writer.drain()

        roo_blocks = None
        while True:
            if roo_blocks is None:
                print('searching for roo-blocks...')
                roo_blocks = None
                for device in adapter.scan():
                    if device['name'] == 'Roo-Blocks':
                        roo_blocks = connect_ble(device['address'])
                writer.write(json_ipc('connected', roo_blocks is not None))
                await writer.drain()
            else:
                try:
                    async with timeout(5):
                        buffer = await reader.readline()
                        if buffer:
                            msg = json.loads(buffer)
                            print(msg)
                            if msg['type'] == 'upload':
                                # this function should be async but there are some issues with implementation
                                upload_program(
                                    roo_blocks,
                                    msg['data'],
                                    lambda progress: writer.write(json_ipc('upload', progress)))
                except asyncio.exceptions.TimeoutError:
                    pass

    finally:
        adapter.stop()

asyncio.run(main())
