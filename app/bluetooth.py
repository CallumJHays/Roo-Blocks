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

IPC_SOCKET = os.environ.get('IPC_SOCKET')

adapter = pygatt.GATTToolBackend()


def handle_data(handle, value):
    """
    handle -- integer, characteristic read handle the data was received on
    value -- bytearray, the data returned in the notification
    """
    print("Received data: %s" % hexlify(value))


def json_ipc(msg_type, data):
    return(json.dumps({
        'type': msg_type,
        'data': data
    }) + '\n').encode()


def upload_program(roo_blocks, program_file):
    pass


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

        roo_blocks = None
        while True:
            if roo_blocks is None or not roo_blocks._connected:
                roo_blocks = None
                for device in adapter.scan():
                    print(device['name'])
                    if device['name'] == 'Roo-Blocks':
                        roo_blocks = adapter.connect(device['address'])
                        roo_blocks.bond()  # encrypt connection

                writer.write(json_ipc('connected', roo_blocks is not None))
                await writer.drain()
            else:
                try:
                    async with timeout(5):
                        buffer = await reader.readline()
                        if buffer:
                            msg = json.loads(buffer)
                            if msg['type'] == 'upload':
                                upload_program(roo_blocks, msg['data'])
                        else:
                            raise "IPC connection closed unexpectedly"
                except asyncio.exceptions.TimeoutError:
                    pass

    finally:
        adapter.stop()

asyncio.run(main())
