# SBBrowse2018
SBBBrowse public, revision June 2021

![Teaser image](img/teaser.png)

[Publication](https://link.springer.com/chapter/10.1007%2F978-3-319-43997-6_24)

Digital library (DL) support for different information seeking strategies (ISS) has not evolved as fast as their amount of offered stock or presentation quality. However, several studies argue for the support of explorative ISS in conjunction to the directed query-response paradigm. Hence, this paper presents a primarily explorative research system prototype for metadata harvesting allowing multimodal access to DL stock for researchers during the research idea development phase, i.e., while the information need (IN) is vague. To address evolving INs, the prototype also allows ISS transitions, e.g., to OPACs, if accuracy is needed.

As its second contribution, the paper presents a curated data set for digital humanities researchers that is automatically enriched with metadata derived by different algorithms including content-based image features. The automatic enrichment of originally bibliographic metadata is needed to support the exploration of large metadata stock as traditional metadata does not always address vague INs.

The presented proof of concept clearly shows that use case-specific metadata facilitates the interaction with large metadata corpora.

## Installation 

The only known issues during the installation occur under MacOS' ARM plattform are related to the build of the needed Python packages, e.g. _tables_.
The issues are described [here](https://github.com/PyTables/PyTables/issues/219) and [here](https://github.com/freqtrade/freqtrade/issues/4162#issuecomment-890377818) and basically boil down to running these commands before the pip-based installation using the provided _requirements.txt_: 
```
pip install cython
brew install hdf5
brew install c-blosc
export HDF5_DIR=/opt/homebrew/opt/hdf5 
export BLOSC_DIR=/opt/homebrew/opt/c-blosc
```

