# Installation

Download and install the conda package manager.

## Install dev environment

Run these commands to install all app dependencies.

```bash
conda env update -f environment.yml
conda activate roo-blocks
cd app && npm i
```

Ensure that you always activate the `roo-blocks` environment before you do anything else:
```bash
conda activate roo-blocks
```

## Flashing the ESP32

Replace serial port below.
For Windows this will look like COM12 found in windows device manager.
For linux this will look like ttyUSB0.

```bash
cd controller
esptool --port /dev/ttyUSB0 erase_flash
esptool --port /dev/ttyUSB0 write_flash -z 0x1000 esp32-idf4-v1.12.bin
```

