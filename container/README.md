# Running the Tutorial from a Container

In case you have [Podman](https://podman.io) installed, there is a `Dockerfile` available in the `container`directory.

`Docker` might work as well but has not been tested.

## Building the Tutorial's Image

Make sure that you are running the following commands from within the `container`directory.

```
podman build  -t sbbrowse . 
```

This will take some time as it will build everything from scratch.

## Running the Container

After the creation of the image, you are set to run the container by executing the following command:
```
podman run  -p 127.0.0.1:8888:8888 -i -t localhost/sbbrowse
```
This command will ensure that you can access the Jupyter notebook under http://localhost:8888/notebooks/DataProcessing.ipynb . The address `127.0.0.1` is represented by `localhost`.

Furthermore, the command will open a terminal connection to the container in order to display all log output from Jupyter and launch the notebook automatically.

## Stopping the Container

To stop the container, you can use the `shut down` entry from Jupyter's `File` menu or activate the terminal running Jupyter and press `CTRL+C`. You will then be asked immediately if you want to shut down the Jupyter server. Enter `y` and Jupyter will shut down. 

After the server has been stopped, the container will exit as well.

__Attention:__ You will also lose all your data that has been created from within the notebook!
