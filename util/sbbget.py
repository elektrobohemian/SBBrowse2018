import argparse
import urllib.request
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
import os
from PIL import Image


# parser = argparse.ArgumentParser(description='Process some integers.')
# parser.add_argument('integers', metavar='N', type=int, nargs='+',
#                     help='an integer for the accumulator')
# parser.add_argument('--sum', dest='accumulate', action='store_const',
#                     const=sum, default=max,
#                     help='sum the integers (default: find the max)')
#
# args = parser.parse_args()
# print(args.accumulate(args.integers))

# Schalter
# Prefix für Ordner, in dem die Dateien landen -> downloadPathPrefix
# Schalter: Download Bilder in ALTO -> extractIllustrations
# skipXML-Schalter
#

metaDataDownloadURLPrefix="http://digital.staatsbibliothek-berlin.de/metsresolver/?PPN="
downloadPathPrefix="."
addPPNPrefix=True
extractIllustrations=True
illustrationExportFileType= ".tif"
# handy if a certain file set has been downloaded before and processing has to be limited to post-processing only
skipDownloads=False
verbose=True
# determines which ALTO elements should be extracted
# typically, Illustration should be enough, see https://www.loc.gov/standards/alto/techcenter/layout.html
consideredAltoElements=['{http://www.loc.gov/standards/alto/ns-v2#}Illustration']
#consideredAltoElements=['{http://www.loc.gov/standards/alto/ns-v2#}Illustration','{http://www.loc.gov/standards/alto/ns-v2#}GraphicalElement']

tiffDownloadLink="http://ngcs.staatsbibliothek-berlin.de/?action=metsImage&format=jpg&metsFile=@PPN@&divID=@PHYSID@&original=true"

downloadPathPrefix="download"

# Chinese book with fulltext
# ppn="3343669865"
# book with fulltext
ppn="610185136"
# book with printer's mark without fulltext
#ppn="715665294"

if addPPNPrefix:
    ppn="PPN"+ppn


if not os.path.exists(downloadPathPrefix+"/"):
    if verbose:
        print("Creating "+downloadPathPrefix+"/")
    os.mkdir(downloadPathPrefix+"/")
downloadPathPrefix=downloadPathPrefix+"/"+ppn
if not os.path.exists(downloadPathPrefix+"/"):
    if verbose:
        print("Creating "+downloadPathPrefix+"/")
    os.mkdir(downloadPathPrefix+"/")

currentDownloadURL=metaDataDownloadURLPrefix+ppn

# todo: error handling
metsModsPath=ppn+".xml"
urllib.request.urlretrieve(currentDownloadURL, metsModsPath)


# STANDARD file download settings
retrievalScope=['TIFF','FULLTEXT']
# per Schalter steuern, default: FULLTEXT und PRESENTATION
# <mets:fileGrp USE="THUMBS"
# <mets:fileGrp USE="DEFAULT">
# <mets:fileGrp USE="FULLTEXT">
# <mets:fileGrp USE="PRESENTATION">
# download der Files

tree = ET.parse(metsModsPath)
root = tree.getroot()

fileID2physID=dict()
# first, we have to build a dict mapping various IDs to physical pages
for div in root.iter('{http://www.loc.gov/METS/}div'):
    for fptr in div.iter('{http://www.loc.gov/METS/}fptr'):
        #print(fptr.tag,fptr.attrib)
        fileID2physID[fptr.attrib['FILEID']]=div.attrib['ID']
        #print(fptr.attrib['FILEID'],fileID2physID[fptr.attrib['FILEID']])


#raise SystemExit

# a list of downloaded TIFF files
alreadyDownloadedPhysID=[]
# a dict of paths to ALTO fulltexts (id->download dir)
altoPaths=dict()

# we are only interested in fileGrp nodes below fileSec...
for fileSec in root.iter('{http://www.loc.gov/METS/}fileSec'):
    for child in fileSec.iter('{http://www.loc.gov/METS/}fileGrp'):
        currentUse=child.attrib['USE']

        # which contains file nodes...
        for fileNode in child.iter('{http://www.loc.gov/METS/}file'):
        # embedding FLocat node pointing to the URLs of interest
            id = fileNode.attrib['ID']
            downloadDir="./"+downloadPathPrefix + "/" + id
            # only create need sub directories
            if currentUse in retrievalScope :
                if not os.path.exists(downloadDir):
                    if verbose:
                        print(downloadDir)
                    os.mkdir(downloadDir)

            if 'TIFF' in retrievalScope:
                # try to download TIFF first
                downloadDir = "./" + downloadPathPrefix + "/" + id
                tiffDir=downloadDir.replace(currentUse,'TIFF')
                if not os.path.exists(tiffDir):
                    os.mkdir(tiffDir)
                try:
                    if not fileID2physID[id] in alreadyDownloadedPhysID:
                        if verbose:
                            print("Downloading to " + tiffDir)
                        if not skipDownloads:
                            urllib.request.urlretrieve(tiffDownloadLink.replace('@PPN@',ppn).replace('@PHYSID@',fileID2physID[id]),tiffDir+"/"+ppn+".tif")
                        alreadyDownloadedPhysID.append(fileID2physID[id])
                except urllib.error.URLError:
                    print("Error downloading " + ppn+".tif")

            if currentUse in retrievalScope :
                for fLocat in fileNode.iter('{http://www.loc.gov/METS/}FLocat'):
                    if (fLocat.attrib['LOCTYPE'] == 'URL'):
                        if verbose:
                            print("Processing "+id)
                        href=fLocat.attrib['{http://www.w3.org/1999/xlink}href']
                        rawPath=urlparse(href).path
                        tokens=rawPath.split("/")
                        outputPath=tokens[-1]

                        if verbose:
                            print("\tSaving to: " + downloadDir + "/" + outputPath)
                        try:
                            if not skipDownloads:
                                urllib.request.urlretrieve(href, downloadDir+"/"+outputPath)
                            if currentUse=='FULLTEXT':
                                altoPaths[id]=[downloadDir,outputPath]
                        except urllib.error.URLError:
                            print("\tError processing "+href)

# extract illustrations found in ALTO files
if extractIllustrations:
    for key in altoPaths:
        print(key,altoPaths[key])
        tiffDir=altoPaths[key][0].replace('FULLTEXT','TIFF')+"/"+altoPaths[key][1].replace(".","_")+"/"
        tiffDir="."+tiffDir[1:-1]
        if not os.path.exists(tiffDir):
            os.mkdir(tiffDir)
            if verbose:
                print("Creating "+tiffDir)
        if verbose:
            print("Processing ALTO XML in: "+altoPaths[key][0]+"/"+altoPaths[key][1])
        tree = ET.parse(altoPaths[key][0]+"/"+altoPaths[key][1])
        root = tree.getroot()
        for e in root.findall('.//{http://www.loc.gov/standards/alto/ns-v2#}PrintSpace'):
            for el in e:
                if el.tag in consideredAltoElements:
                    illuID=el.attrib['ID']
                    if verbose:
                        print("\tExtracting "+illuID)
                    h=int(el.attrib['HEIGHT'])
                    w=int(el.attrib['WIDTH'])
                    hpos=int(el.attrib['HPOS'])
                    vpos=int(el.attrib['VPOS'])
                    #print(altoPaths[key])
                    #print(altoPaths[key][0].replace('FULLTEXT','TIFF')+"/"+ppn+'.tif')
                    img=Image.open(altoPaths[key][0].replace('FULLTEXT','TIFF')+"/"+ppn+'.tif')
                    if verbose:
                        print("\t\tImage size:",img.size)
                        print("\t\tCrop range:", h, w, vpos, hpos)
                    # (left, upper, right, lower)-tuple.
                    img2 = img.crop((hpos, vpos, hpos+w, vpos+h))
                    img2.save(tiffDir +'/' + illuID + illustrationExportFileType)

print("Done.")
