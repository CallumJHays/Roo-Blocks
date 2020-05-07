# Installation

Download and install the conda package manager.

## Install dev environment

Run these commands to install all app dependencies.

```bash
conda env update -f environment.yml
cd app && npm i
```

It should look like: `C:\Users\<USER>\Miniconda3\envs\roo-blocks`

## Flashing the ESP32

Replace COM12 with your CP210x serial port found in windows device manager below.

```bash
cd controller
esptool --port COM12 erase_flash
esptool --port COM12 write_flash -z 0x1000 esp32-idf3-v1.12.bin
```