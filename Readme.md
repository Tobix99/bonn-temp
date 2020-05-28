# Docker Commands
## Flash ESP with ESPHome config
```docker run --rm -v "${PWD}":/config --device=/dev/ttyUSB0 -it esphome/esphome esphome/bonn_temp.yml run```

## Build docker with node to deploy to DockerHub
```docker build -t tobix99/temp_server .```