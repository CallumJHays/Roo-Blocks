# This example demonstrates a simple temperature sensor peripheral.
#
# The sensor's local value updates every second, and it will notify
# any connected central every 10 seconds.

from micropython import const
import bluetooth as bt
import struct
import time

from advertising import advertising_payload

# these characteristics have to be copied into bluetooth.py too
EXECUTION_STAGE_CHARACTERISTIC = "5497c8f9-6163-4fbd-b372-7a1d9e77168d"
UPLOAD_BUFFER_CHARACTERISTIC = "aa86a5d5-95f9-4c0b-8797-44b48a85f686"
# bytes that can be transferred at a time
UPLOAD_BUFFER_CHARACTERISTIC_MTU = 512

_IRQ_CENTRAL_CONNECT = const(1 << 0)
_IRQ_CENTRAL_DISCONNECT = const(1 << 1)
_IRQ_GATTS_WRITE = const(1 << 2)
# _IRQ_GATTS_READ_REQUEST              = const(1 << 3)
# _IRQ_GATTC_SERVICE_RESULT            = const(1 << 8)
# _IRQ_GATTC_CHARACTERISTIC_RESULT     = const(1 << 9)
# _IRQ_GATTC_DESCRIPTOR_RESULT         = const(1 << 10)
# _IRQ_GATTC_READ_RESULT               = const(1 << 11)
# _IRQ_GATTC_WRITE_STATUS              = const(1 << 12)
# _IRQ_GATTC_NOTIFY = const(1 << 13)
# _IRQ_GATTC_INDICATE = const(1 << 14)

ble = bt.BLE()
ble.active(True)

BLE_GENERIC_ACCESS_SERVICE = const(0x1800)

upload_service_id = bt.UUID(BLE_GENERIC_ACCESS_SERVICE)
execution_service_id = bt.UUID(BLE_GENERIC_ACCESS_SERVICE)

(upload_buffer,), (execution_service,) = ble.gatts_register_services([
    # code upload service
    (upload_service_id, [(
        bt.UUID(UPLOAD_BUFFER_CHARACTERISTIC),
        bt.FLAG_NOTIFY | bt.FLAG_WRITE,
    )]),

    # code execution service
    (execution_service_id, [(
        bt.UUID(EXECUTION_STAGE_CHARACTERISTIC),
        bt.FLAG_NOTIFY,
    )])
])

ble.gatts_set_buffer(upload_buffer, UPLOAD_BUFFER_CHARACTERISTIC_MTU)


def advertise():
    ble.gap_advertise(
        interval_us=500000,  # seems to work well
        adv_data=advertising_payload(
            name="Roo-Blocks",
            services=[upload_service_id, execution_service_id]
        )
    )


connection = None


def on_central_msg(event, data):
    global connection
    print('got event', event)

    if event == _IRQ_CENTRAL_CONNECT:
        connection, _, _, = data
        ble.gap_advertise(None)  # stop advertising
    elif event == _IRQ_CENTRAL_DISCONNECT:
        connection = None
        advertise()
    elif event == _IRQ_GATTS_WRITE:
        _, attr_handle = data
        if attr_handle == upload_buffer:
            time.sleep(0.1)
            ble.gatts_notify(connection, upload_buffer)


ble.irq(on_central_msg)
advertise()

while True:
    time.sleep(1)
