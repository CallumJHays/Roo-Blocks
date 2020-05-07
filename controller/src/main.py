# This example demonstrates a simple temperature sensor peripheral.
#
# The sensor's local value updates every second, and it will notify
# any connected central every 10 seconds.

from micropython import const
from advertising import advertising_payload
import bluetooth
import random
import struct
import time
from machine import Pin

status = Pin(4, Pin.OUT)
status.on()

_IRQ_CENTRAL_CONNECT = const(1 << 0)
_IRQ_CENTRAL_DISCONNECT = const(1 << 1)

# org.bluetooth.service.environmental_sensing
_ENV_GENERIC = bluetooth.UUID(0x1800)
# org.bluetooth.characteristic.temperature
_TEMP_CHAR = (
    bluetooth.UUID(0x2A3D),
    bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY,
)
_ENV_SENSE_SERVICE = (
    _ENV_GENERIC,
    (_TEMP_CHAR,),
)

# org.bluetooth.characteristic.gap.appearance.xml
_ADV_APPEARANCE_GENERIC_THERMOMETER = const(768)


class BLETemperature:
    def __init__(self, ble, name="mpy-temp"):
        self._ble = ble
        self._ble.active(True)
        self._ble.irq(handler=self._irq)
        ((self._handle,),) = self._ble.gatts_register_services((_ENV_SENSE_SERVICE,))
        self._connections = set()
        self._payload = advertising_payload(
            name=name, services=[
                _ENV_GENERIC], appearance=_ADV_APPEARANCE_GENERIC_THERMOMETER
        )
        self._advertise()

    def _irq(self, event, data):
        # Track connections so we can send notifications.
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _, = data
            self._connections.add(conn_handle)
        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _, = data
            self._connections.remove(conn_handle)
            # Start advertising again to allow a new connection.
            self._advertise()

    def set_temperature(self, temp_deg_c, notify=False):
        # Data is sint16 in degrees Celsius with a resolution of 0.01 degrees Celsius.
        # Write the local value, ready for a central to read.
        self._ble.gatts_write(self._handle, struct.pack(
            "<h", int(temp_deg_c * 100)))
        if notify:
            for conn_handle in self._connections:
                # Notify connected centrals to issue a read.
                self._ble.gatts_notify(conn_handle, self._handle)

    def _advertise(self, interval_us=625):
        self._ble.gap_advertise(100, adv_encode_name('HelloFri3d'))


def adv_encode(adv_type, value):
    return bytes((len(value) + 1, adv_type,)) + value


def adv_encode_name(name):
    return adv_encode(const(0x09), name.encode())


def demo():
    print('setting up bluetooth')
    ble = bluetooth.BLE()
    # print('setup temp')
    temp = BLETemperature(ble)
    print('temp', temp)

    # t = 25
    # i = 0

    while True:
        status.value(not status.value())
        print(ble)
        # # Write every second, notify every 10 seconds.
        # i = (i + 1) % 10
        # temp.set_temperature(t, notify=i == 0)
        # # Random walk the temperature.
        # t += random.uniform(-0.5, 0.5)
        time.sleep_ms(1000)


demo()
