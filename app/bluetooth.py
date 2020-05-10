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

# these characteristics have to be copied into bluetooth.py too
EXECUTION_STAGE_CHARACTERISTIC = "5497c8f9-6163-4fbd-b372-7a1d9e77168d"
UPLOAD_BUFFER_CHARACTERISTIC = "aa86a5d5-95f9-4c0b-8797-44b48a85f686"
# bytes that can be transferred at a time
UPLOAD_BUFFER_CHARACTERISTIC_MTU = 512

IPC_SOCKET = os.environ.get('IPC_SOCKET')

adapter = pygatt.GATTToolBackend()


def json_ipc(msg_type, data):
    return(json.dumps({
        'type': msg_type,
        'data': data
    }) + '\n').encode()


async def upload_program(roo_blocks, program_file):
    with open(program_file, 'rb') as program:
        while True:
            chunk = program.read(UPLOAD_BUFFER_CHARACTERISTIC_MTU)
            if not chunk:  # finished
                break
            roo_blocks.char_write(
                UPLOAD_BUFFER_CHARACTERISTIC,
                chunk
            )
            ack = asyncio.Future()

            def handle_notify():
                ack.set_result(None)
                print('notify handled')
            roo_blocks.subscribe(UPLOAD_BUFFER_CHARACTERISTIC, handle_notify)
            await ack


def connect_ble(uuid):
    roo_blocks = adapter.connect(uuid)
    roo_blocks.bond()  # encrypt connection

    def on_disconnect(_e):
        nonlocal roo_blocks
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
                            if msg['type'] == 'upload':
                                await upload_program(roo_blocks, msg['data'])
                        else:
                            raise "IPC connection closed unexpectedly"
                except asyncio.exceptions.TimeoutError:
                    pass

    finally:
        adapter.stop()

asyncio.run(main())
