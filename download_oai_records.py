# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If you set 'allowDownloads' to True, all images will be downloaded and processed again
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
allowDownloads = False  # should be True if you run this for the first time or False if you want to use the provided sample data
allowDownloads = True  # daz temp
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If 'loadMissingData' is set to True, sample files will be downloaded automatically
# This is a RECOMMENDED SETTING as it will take care of a some extra work for you
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
loadMissingData = True

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# Directory used for reports etc.
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
reportDir = "./reports/"

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# Keep original downloaded TIFF images? Otherwise, they will be deleted and only JPEG thumbnails remain after download.
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

keepTIFFs = False

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If you set 'demoClustering' to False, the clustering steps will take about 2 hours
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
demoClustering = False  # should be False if you run this for the first time
demoClustering = True  # daz temp
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If you set 'allowComputationallyExpensiveCalculations' to True, various time consuming tasks (some of them running
# several hours) will be carried out and not only loaded from pre-computed data files
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
allowComputationallyExpensiveCalculations = (
    True  # should be True if you run this for the first time
)

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# Enabling this action activates exact string matching againt name lists
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
allowExactStringMatching = True

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If you set to True, some plots will be saved as PDF documents in ./figures/
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
saveFiguresAsPDF = True

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If you set to True, Google Map API will be used to resolve location names, if False OpenStreetMap will be used
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *i
useGoogleMapsAPI = False
privateGoogleKey = (
    "ENTER YOUR KEY HERE"  # if you want to use Google, you need a personal key
)

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If set to True, OpenStreetMap API will be used to fetch spatial names and alternative localized names, should be True at first run
# in case you want to retrieve all data from OSM (will take approx. 40 minutes)
#
# To get you setup fast, the pickelz/ subdirectory contains a ZIP file called "osm_results.zip" that contains cached results.
#
# PLEASE use this archive to relieve the OSM servers.
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
getSpatialNamesFromOSM = False

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If set to True, details per PPN will be saved as separate JSON files in "jsonWebDir"
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
serializePPNLookup2JSON = False
jsonWebDir = "./web/data/ppn/"

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If set to True, the raw features created by the Java application will be read from disk and converted for further usage, must be True at first run
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
reinterpretVisualWordRawFeatures = False

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# If set to True, a HTTP webserver will be started after all cells have been processed to show the results
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
launchHTTPServer = False


# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# Setup of the environment
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


# See all the "as ..." contructs? They're just aliasing the package names.
# That way we can call methods like plt.plot() instead of matplotlib.pyplot.plot().
import numpy as np
import scipy as sp
import matplotlib as mpl
import matplotlib.cm as cm
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import pandas as pd
import time
import yaml
import csv

from bs4 import BeautifulSoup
from collections import OrderedDict  # provides the ordered dictionary
import re  # for regular expressions used below
import urllib  # to read from URLs
import requests
import json
import itertools

import os.path
from datetime import datetime  # for time measurement
import time  # for time measurement
import sys
import os
import pickle
import subprocess as subp
import gzip
import math
import codecs
import subprocess
import platform
import zipfile
import shutil

# OAI
from sickle import Sickle

# image handling
from PIL import Image

# geo stuff
import googlemaps
from geopy.distance import geodesic
import geojson as gj

# progress bar
# try to load cybertqdm if it is available
try:
    from cybertqdm import cybertqdm as tqdm

    print("Using cybertqdm to display progress on external e-ink display.")
except ImportError:
    from tqdm import tqdm


# utility functions
# print a line with the current timestamp
def printLog(text):
    now = str(datetime.now())
    print("[" + now + "]\t" + text)
    # forces to output the result of the print command immediately, see: http://stackoverflow.com/questions/230751/how-to-flush-output-of-python-print
    sys.stdout.flush()


# serialize an object as a gzipped pickle file
def pickleCompress(fileName, pickledObject):
    printLog("Pickling to '%s'" % fileName)
    f = gzip.open(fileName, "wb")
    pickle.dump(pickledObject, f)
    f.close()
    printLog("Pickling done.")


# load a gzipped pickle file from disk
def pickleDecompress(fileName):
    # restore the object
    printLog("Depickling from '%s'" % fileName)
    f = gzip.open(fileName, "rb")
    pickledObject = pickle.load(f)
    f.close()
    printLog("Depickling done.")
    return pickledObject


# load a file from an URL and save it to a folder
def saveFileFromURL(file_url, output_dir):
    # get the path part of the URL
    path = urllib.parse.urlparse(file_url).path
    # remove the 8bit-inferno.de-specific path part
    file_part = path.replace("/_persistent/", "")

    printLog(f"Downloading {file_url} to '{output_dir}/{file_part}'")

    # send a GET request to the URL
    response = requests.get(file_url)
    # check if the request was successful
    if response.status_code == 200:
        # Open a local file in binary write mode
        with open(output_dir + "/" + file_part, "wb") as file:
            # Write the content of the response to the file
            file.write(response.content)
        printLog("Finished download.")
        return True
    else:
        printLog(
            f"Failed to download file with HTTP status code: {response.status_code}"
        )
        return False


# # OAI-PMH download of metadata records from the Staatsbibliothek zu Berlin

# configuration of the run, can be overwritten by a YAML config file (see below)
config = dict()

# check whether a YAML config exists and load it, otherwise use the configuration found in this file
configFile = "download_oai_records.yaml"
use_yaml_config = False
if os.path.isfile(configFile):
    with open(configFile, "r") as f:
        config = yaml.safe_load(f)
    use_yaml_config = True
printLog(
    f"Using YAML config: {use_yaml_config} {"from " if use_yaml_config else ""}{configFile}"
)

if not use_yaml_config:
    # number of metadata records to be retrieved
    config["maxDocs"] = 120000
    # file name for the local pickle file to save the records, will be used if forceOAIRedownload is set to false and the file exists
    config["recordDatabaseFile"] = "save_120k_dc_all.pickle"
    config["oaiEndpoint"] = "https://oai.sbb.berlin/oai"
    config["forceOAIRedownload"] = (
        False  # should all records be downloaded again even if a local pickle file exists? (default: False)
    )
    # download directory used for images etc. (must end with /)
    config["downloadDir"] = False
    # should all records be downloaded again even if a local pickle file exists? (default: False)
    config["forceImageDownload"] = False
    config["logfile"] = "downloadIssues.csv"

if not os.path.exists(config["downloadDir"]):
    os.makedirs(config["downloadDir"])

printLog(f"Configuration:")
for key in config:
    print(f"\t\t\t\t{key}: {config[key]}")
print("")

# 100 is just for testing, for more interesting results increase this value to 1000. ATTENTION! this will also take more time for reading data.
# maxDocs=100#

# a list of saved metadata records
savedRecords = []

# download override (e.g., when using the sample dataset)
# allowDownloads=False

if not os.path.exists(config["recordDatabaseFile"]) or config["forceOAIRedownload"]:
    if os.path.exists(config["recordDatabaseFile"]):
        printLog(
            f"Found existing record database file '{config["recordDatabaseFile"]}'"
        )
    if config["forceOAIRedownload"]:
        printLog("Ignoring record database as forced download is active.")

    # connect to a metadata repository
    # sickle = Sickle('http://digital.staatsbibliothek-berlin.de/oai')
    # in 2026 we switched to HTTPS and a new URL althought the old one still works
    # however, the old URL is redirected to HTTPS eventually slowing down the download process, so we use the new URL directly
    sickle = Sickle(config["oaiEndpoint"], timeout=60, max_retries=3)
    # 2026: added timeout and max_retries to avoid connection issues otherwise the request will wait forever and the notebook will not continue.
    # The default timeout is 30 seconds, but the SBB OAI-PMH server sometimes takes longer to respond.
    # The max_retries parameter will retry the request if it fails due to a timeout or connection error.

    # for debugging purposes you might want to uncomment the following commands
    # get the sets from the data provider connected to
    # sets = sickle.ListSets()
    # print the returned sets including their identifiers
    # print("Sets provided by data provider\n* * * * * * * * * * * * * * * * * * * * * ") # \n creates a new line
    # for s in sets:
    #    print("'"+s.setName+"' accessible via: '"+s.setSpec+"'")

    # get the records from this repository's document set 'all' (all records) or a specific set such as 'DC_krieg.1914.1918' (documents related to World War I)
    # using Dublin Core format
    records = sickle.ListRecords(metadataPrefix="oai_dc", set="all")

    printLog("Starting OAI-PMH record download...")
    # initialize some variables for counting and saving the metadata records
    savedDocs = 0

    # setup progress bar
    pbar = tqdm(
        total=config["maxDocs"], desc="Downloading OAI-PMH records", unit="record"
    )

    # save the records locally as we don't want to have to rely on a connection to the OAI-PMH server all the time
    # iterate over all records until maxDocs is reached
    # ATTENTION! if you re-run this cell, the contents of the savedRecords array will be altered!
    try:
        for record in records:
            # get the PPN of the digitized work as the DC identifier will reference different (analog) manifestations
            tokens = record.header.identifier.split(":")
            for t in tokens:
                if t.startswith("PPN"):
                    # the array building simply fixes the issue that all DC field come as arrays
                    record.metadata["PPN"] = [t]

            # check if we reach the maximum document value
            if savedDocs < config["maxDocs"]:
                savedDocs = savedDocs + 1
                # save the current record to the "savedRecords" array
                savedRecords.append(record.metadata)
                # classic text-based progress display
                # if savedDocs%1000==0:
                #    printLog("Downloaded %d of %d records."%(savedDocs,maxDocs))
            # if so, end the processing of the for-loop
            else:
                break  # break ends the processing of the loop
            pbar.update(1)
    except Exception as e:
        printLog(f"Error occurred during OAI-PMH download: {e}")

    finally:
        pbar.close()

        printLog("Finished OAI-PMH download of " + str(len(savedRecords)) + " records.")
        pickle.dump(savedRecords, open(config["recordDatabaseFile"], "wb"))

else:
    printLog(f"Loading records from file: {config['recordDatabaseFile']}")
    with open(config["recordDatabaseFile"], "rb") as file:
        savedRecords = pickle.load(file)

countSavedRecords = len(savedRecords)
printLog(f"Total records available: {countSavedRecords:,}")
printLog(f"Done.")

# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
#
# Image download and processing of the digitized works
#
# * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

# sys.exit(0)

# 2026: skip download if they take to long
DOWNLOAD_TIMEOUT = 60

# uncomment this line if you are continuing the execution of this notebook at a later point in time
# savedRecords=pickle.load( open( recordDatabaseFile, "rb" ) )

tiffDownloadPath = "https://content.staatsbibliothek-berlin.de/dms/%PPN%/800/0/00000001.tif?original=true"

printLog("Started image download and processing. This will take a while...")

logFile = open(config["downloadDir"] + config["logfile"], "a+")

# surpress PIL's DecompressionBombErrors and Warnings
Image.MAX_IMAGE_PIXELS = None

for i, record in tqdm(enumerate(savedRecords), total=countSavedRecords):
    ppn = ""
    for r in record["identifier"]:
        if r.startswith("PPN"):
            ppn = r
            break

    ppnTIFF = ppn + ".tif"
    ppnJPEGPAth = config["downloadDir"] + ppn + ".jpg"

    # prevent downloading of already present files
    if not os.path.isfile(ppnJPEGPAth) or config["forceImageDownload"]:
        tryDownload = True
        tiffPath = config["downloadDir"] + ppnTIFF
        url = tiffDownloadPath.replace("%PPN%", ppn)
        try:
            with (
                urllib.request.urlopen(url, timeout=DOWNLOAD_TIMEOUT) as response,
                open(tiffPath, "wb") as f,
            ):
                shutil.copyfileobj(response, f)
        except urllib.error.HTTPError as ex:
            # server answered, but with an error code (e.g. 404)
            logFile.write(
                f"{ppn},{str(datetime.now())},[HTTP],Problem with accessing {url},HTTP Code: {ex.code}\n"
            )
            continue
        except (TimeoutError, urllib.error.URLError, ConnectionError) as ex:
            # no answer in time, connection refused/reset, DNS failure, ...
            logFile.write(
                f"{ppn},{str(datetime.now())},[TIMEOUT/NETWORK],{url},{ex!r}\n"
            )
            if os.path.isfile(tiffPath):
                os.remove(tiffPath)  # don't keep a half-written TIFF
            continue

        try:
            img = Image.open(tiffPath)
            img.thumbnail((512, 512))
            img.save(ppnJPEGPAth)
        except Exception as ex:
            logFile.write(
                f"{ppn},{str(datetime.now())},[IMAGE],Problem converting {ppnTIFF},{ex!r}\n"
            )
        finally:
            if not keepTIFFs and os.path.isfile(tiffPath):
                os.remove(tiffPath)

logFile.close()

# analytics of error classes

error_count = dict()
ppn_per_error = dict()

with open(config["downloadDir"] + config["logfile"], newline="") as csvfile:
    csvrd = csv.reader(csvfile, delimiter=",")
    for row in csvrd:
        error_class = row[2]
        if not error_class in error_count:
            error_count[error_class] = 0
            ppn_per_error[error_class] = []
        error_count[error_class] += 1
        ppn_per_error[error_class].append(row[0])

print("\nError count per class")
for error_class in error_count:
    print(f"{error_class}: {error_count[error_class]}")
    if error_count[error_class] < 20:
        print(f"\t{ppn_per_error[error_class]}")
