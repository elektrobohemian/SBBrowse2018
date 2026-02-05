# use the latest Alpine Linux image as the base
FROM alpine:latest

# setup the container
RUN apk update && apk add --no-cache \
    python3 \
    python3-dev \
    git \
    g++ \
    pkgconfig \
    freetype \
    make \
    wget \
    lscpu

RUN mkdir sbbrowse
WORKDIR "/sbbrowse"

RUN git clone https://github.com/ghaerr/agg-2.6.git
WORKDIR "/sbbrowse/agg-2.6/agg-src"
RUN make
RUN cp ./src/libagg.a /usr/lib/libagg.a
RUN rm -rf /sbbrowse/agg-2.6/

WORKDIR "/sbbrowse"
RUN git clone https://github.com/elektrobohemian/SBBrowse2018.git

WORKDIR "/sbbrowse/SBBrowse2018"
RUN python3 -m venv ./venv
RUN source ./venv/bin/activate && pip install --upgrade pip &&pip3 install -r requirements.txt

# download sample data (all but the images because they are about 6 GB)
RUN wget https://8bit-inferno.de/_persistent/save_120k_dc_all.pickle
RUN wget https://8bit-inferno.de/_persistent/save_120k_dc_all_2021.pickle

# extract archives contained in the repository
WORKDIR "/sbbrowse/SBBrowse2018/picklez"
RUN unzip osm_results.zip
RUN rm -f osm_results.zip
RUN rm -rf ./__MACOSX



EXPOSE 8888
EXPOSE 8000

WORKDIR "/sbbrowse/SBBrowse2018"
ADD start_jupyter_in_container.sh /sbbrowse/SBBrowse2018/start_jupyter_in_container.sh
CMD ["/bin/sh", "/sbbrowse/SBBrowse2018/start_jupyter_in_container.sh"]

# after activationg the virtual environment, the jupyter notebook can be started with:
# source ./venv/bin/activate
# jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root --NotebookApp.token='' --NotebookApp.password=''

