from machine import Pin, PWM, ADC

pins = {}


class RescaleError(Exception):
    pass


def _rescale(i1, i2, o1, o2, i):
    if i < i1 or i > i2:
        raise RescaleError
    return (i - i1) / (i2 - i1) * (o2 - o1) + o1


def drive_motor(port, speed):
    if port not in pins:
        pin = Pin(port)
        pins[port] = (pin, PWM(pin, freq=50))
    _, pwm = pins[port]
    pwm.duty(int(_rescale(-100, 100, 0, 100, speed)))
    print('driving servo-motor speed', speed)


def read_sensor(port):
    if port not in pins:
        pin = Pin(port)
        adc = ADC(pin)
        pins[port] = (pin, adc)
        adc.atten(ADC.ATTN_11DB)
    _, adc = pins[port]
    reading = int(_rescale(0, 4095, 0, 100, adc.read()))
    print('reading', reading)
    return reading


def turn_pin(port, on):
    if port not in pins:
        pin = Pin(port, Pin.OUT)
        pins[port] = (pin, None)
    led, _ = pins[port]
    led.value(on)
