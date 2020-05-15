from micropython import const
import bluetooth as bt
import struct
import time
import sys
import _thread
import struct

# these constants have to be copied into bluetooth.py too
STATE_CHARACTERISTIC = "5497c8f9-6163-4fbd-b372-7a1d9e77168d"
UPLOAD_BUFFER_CHARACTERISTIC = "aa86a5d5-95f9-4c0b-8797-44b48a85f686"
DELAY_CHARACTERISTIC = "9d4e5866-d299-44f6-8733-6ab2d67b46b9"
TELEM_CHARACTERISTIC = "785b926d-72fd-4b3e-bd03-e14800480792"
# bytes that can be transferred at a time
UPLOAD_BUFFER_CHARACTERISTIC_MTU = 220
UPLOADING_STATE = b'uploading'
IDLE_STATE = b'idle'
EXECUTING_STATE = b'executing'
PAUSED_STATE = b'paused'

_IRQ_CENTRAL_CONNECT = const(1 << 0)
_IRQ_CENTRAL_DISCONNECT = const(1 << 1)
_IRQ_GATTS_WRITE = const(1 << 2)

ble = bt.BLE()
ble.active(True)

BLE_GENERIC_ACCESS_SERVICE = const(0x1800)
roo_blocks_service = bt.UUID("b6faa483-ce9b-4d36-822c-686352cd124c")

((upload_buffer_attr, state_attr, delay_attr, telem_attr),) = ble.gatts_register_services([
    # code upload service
    (roo_blocks_service, [(
        bt.UUID(UPLOAD_BUFFER_CHARACTERISTIC),
        bt.FLAG_WRITE,
    ), (
        bt.UUID(STATE_CHARACTERISTIC),
        bt.FLAG_WRITE,
    ), (
        bt.UUID(DELAY_CHARACTERISTIC),
        bt.FLAG_WRITE,
    ), (
        bt.UUID(TELEM_CHARACTERISTIC),
        bt.FLAG_NOTIFY,
    )])
])

ble.gatts_set_buffer(upload_buffer_attr, UPLOAD_BUFFER_CHARACTERISTIC_MTU)


# Generate a payload to be passed to gap_advertise(adv_data=...).
def advertising_payload(limited_disc=False, br_edr=False, name=None, services=None, appearance=0):
    _ADV_TYPE_FLAGS = const(0x01)
    _ADV_TYPE_NAME = const(0x09)
    _ADV_TYPE_UUID16_COMPLETE = const(0x3)
    _ADV_TYPE_UUID32_COMPLETE = const(0x5)
    _ADV_TYPE_UUID128_COMPLETE = const(0x7)
    _ADV_TYPE_APPEARANCE = const(0x19)

    payload = bytearray()

    def _append(adv_type, value):
        nonlocal payload
        payload += struct.pack("BB", len(value) + 1, adv_type) + value

    _append(
        _ADV_TYPE_FLAGS,
        struct.pack("B", (0x01 if limited_disc else 0x02) +
                    (0x00 if br_edr else 0x04)),
    )

    if name:
        _append(_ADV_TYPE_NAME, name)

    if services:
        for uuid in services:
            b = bytes(uuid)
            if len(b) == 2:
                _append(_ADV_TYPE_UUID16_COMPLETE, b)
            elif len(b) == 4:
                _append(_ADV_TYPE_UUID32_COMPLETE, b)
            elif len(b) == 16:
                _append(_ADV_TYPE_UUID128_COMPLETE, b)

    # See org.bluetooth.characteristic.gap.appearance.xml
    _append(_ADV_TYPE_APPEARANCE, struct.pack("<h", appearance))

    return payload


def advertise():
    ble.gap_advertise(
        interval_us=500000,  # seems to work well
        adv_data=advertising_payload(
            name="Roo-Blocks",
            services=(roo_blocks_service,)
        )
    )


def run_program():
    # reimport module if it's already imported
    if 'program' in sys.modules:
        del sys.modules['program']
    from program import program
    # run the program, handing it telemetry capabilities through "pause" callback
    program(pause)


connection = None
program_file = None
state = IDLE_STATE
delay = 1


class CancelProgram(Exception):
    pass


def pause(block_id):
    if delay:
        ble.gatts_notify(connection, telem_attr, block_id)
    if state == IDLE_STATE:
        print('cancel program')
        raise CancelProgram
    if delay:
        print('sleeping for', delay)
        time.sleep(delay)
    while state == PAUSED_STATE:
        time.sleep(0.1)


def on_central_msg(event, data):
    global connection, program_file, state, delay
    print('got event', event)

    if event == _IRQ_CENTRAL_CONNECT:
        connection, _, _, = data
        ble.gap_advertise(None)  # stop advertising
    elif event == _IRQ_CENTRAL_DISCONNECT:
        connection = None
        advertise()
    elif event == _IRQ_GATTS_WRITE:
        _, attr_handle = data
        if attr_handle == state_attr:
            old_state = state
            state = ble.gatts_read(state_attr)
            print('state', state)
            if state == UPLOADING_STATE:
                program_file = open('program.py', 'wb')
                print('opening file')
            elif old_state == UPLOADING_STATE:
                program_file.close()
            elif old_state == IDLE_STATE and state == EXECUTING_STATE:
                print('running program')
                _thread.start_new_thread(run_program, ())
        elif attr_handle == upload_buffer_attr:
            program_file.write(ble.gatts_read(upload_buffer_attr))
        elif attr_handle == delay_attr:
            delay, = struct.unpack('f', ble.gatts_read(delay_attr))


ble.irq(on_central_msg)
advertise()

while True:
    time.sleep(1)
