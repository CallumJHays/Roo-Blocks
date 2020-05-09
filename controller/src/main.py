# This example demonstrates a simple temperature sensor peripheral.
#
# The sensor's local value updates every second, and it will notify
# any connected central every 10 seconds.

from micropython import const
import bluetooth as bt
import struct
import time

from advertising import advertising_payload

_IRQ_CENTRAL_CONNECT                 = const(1 << 0)
_IRQ_CENTRAL_DISCONNECT              = const(1 << 1)
# _IRQ_GATTS_WRITE                     = const(1 << 2)
# _IRQ_GATTS_READ_REQUEST              = const(1 << 3)
# _IRQ_GATTC_SERVICE_RESULT            = const(1 << 8)
# _IRQ_GATTC_CHARACTERISTIC_RESULT     = const(1 << 9)
# _IRQ_GATTC_DESCRIPTOR_RESULT         = const(1 << 10)
# _IRQ_GATTC_READ_RESULT               = const(1 << 11)
# _IRQ_GATTC_WRITE_STATUS              = const(1 << 12)
# _IRQ_GATTC_NOTIFY                    = const(1 << 13)
# _IRQ_GATTC_INDICATE                  = const(1 << 14)

# org.bluetooth.service.environmental_sensing
BLE_GENERIC_ACCESS_SERVICE = const(0x1800)
BLE_STRING_CHARACTERISTIC = const(0x2A3D)

upload_service_id = bt.UUID(BLE_GENERIC_ACCESS_SERVICE)
execution_service_id = bt.UUID(BLE_GENERIC_ACCESS_SERVICE)
# _TEMP_CHAR = (
#     bluetooth.UUID(0x2A6E),
#     bluetooth.
# )
# _ENV_SENSE_SERVICE = (
#     _ENV_SENSE_UUID,
#     (_TEMP_CHAR,),
# )


# class BLETemperature:

#     def __init__(self, ble, name="Roo-Blocks"):
#         self._ble = ble
#         self._ble.active(True)
#         self._ble.irq(handler=self._irq)
#         ((self._handle,),) = self._ble.gatts_register_services((_ENV_SENSE_SERVICE,))
#         self._connections = set()
#         self._payload = advertising_payload(
#             name=name, services=[_ENV_SENSE_UUID]
#         )
#         self._advertise()

#     def _irq(self, event, data):
#         # Track connections so we can send notifications.
#         if event == _IRQ_CENTRAL_CONNECT:
#             conn_handle, _, _, = data
#             print('add connection', data)
#             self._connections.add(conn_handle)
#         elif event == _IRQ_CENTRAL_DISCONNECT:
#             conn_handle, _, _, = data
#             print('remove connection', data)
#             self._connections.remove(conn_handle)
#             # Start advertising again to allow a new connection.
#             self._advertise()

#     def set_temperature(self, temp_deg_c, notify=False):
#         # Data is sint16 in degrees Celsius with a resolution of 0.01 degrees Celsius.
#         # Write the local value, ready for a central to read.
#         self._ble.gatts_write(self._handle, struct.pack("<h", int(temp_deg_c * 100)))
#         if notify:
#             for conn_handle in self._connections:
#                 # Notify connected centrals to issue a read.
#                 self._ble.gatts_notify(conn_handle, self._handle)

#     def _advertise(self, interval_us=500000):
#         self._ble.gap_advertise(interval_us, adv_data=self._payload)


# def main():
#     ble = bluetooth.BLE()
#     ble.active(True)
#     # on 
#     ble.irq(lamn)
#     temp = BLETemperature(ble)

#     t = 25
#     i = 0

#     while True:
#         status.value(not status.value())
#         # Write every second, notify every 10 seconds.
#         i = (i + 1) % 10
#         temp.set_temperature(t, notify=i == 0)
#         # Random walk the temperature.
#         t += random.uniform(-0.5, 0.5)
#         time.sleep_ms(1000)

ble = bt.BLE()
ble.active(True)

upload_service, execution_service = ble.gatts_register_services([
    # code upload service
    (upload_service_id, [(
        bt.UUID(BLE_STRING_CHARACTERISTIC),
        bt.FLAG_READ | bt.FLAG_NOTIFY | bt.FLAG_WRITE,
    )]),

    # code execution service
    (execution_service_id, [(
        bt.UUID(BLE_STRING_CHARACTERISTIC),
        bt.FLAG_READ | bt.FLAG_NOTIFY | bt.FLAG_WRITE,
    )])
])

def advertise():
    ble.gap_advertise(
        interval_us=500000, # seems to work well
        adv_data=advertising_payload(
            name="Roo-Blocks",
            services=[upload_service_id, execution_service_id]
        )
    )

connection = None
def on_central_msg(event, data):
    global connection

    if event == _IRQ_CENTRAL_CONNECT:
        connection, _, _, = data
        ble.gap_advertise(None) # stop advertising
    elif event == _IRQ_CENTRAL_DISCONNECT:
        connection = None

ble.irq(on_central_msg)
advertise()

while True:
    print('advertising')
    time.sleep(1)
