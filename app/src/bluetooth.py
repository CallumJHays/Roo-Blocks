"""
Every BLE package on npm was broken for me. So I had to delegate bluetooth handling to python.

This handles discovery of Roo-Blocks over BLE as well as code upload & execution.
It communicates with the Electron App over IPC (for which it is the server and this is the client)

This must be run with root permissions (sudo).
"""

import pygatt
from binascii import hexlify
import asyncio

adapter = pygatt.GATTToolBackend()
adapter.start()

def handle_data(handle, value):
    """
    handle -- integer, characteristic read handle the data was received on
    value -- bytearray, the data returned in the notification
    """
    print("Received data: %s" % hexlify(value))

async def main():
    try:
        _reader, writer = await asyncio.open_unix_connection('/tmp/roo-blocks.sock')
        writer.write('connected')
        await writer.drain()

        device = None
        for device in adapter.scan():
            if device['name'] == 'Roo-Blocks':
                device = adapter.connect(device['address'])
                device.bond() # encrypt connection

        writer.write('connected to device')
        await writer.drain()
    finally:
        adapter.stop()

asyncio.run(main)