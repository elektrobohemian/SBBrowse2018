The following files have to be copied to the website root directory when published online:

- jpegdb.php (the image lookup backend if MODERN_LOOKUP is used in JavaScript)
- images.sqlite (the image database which can be downloaded from https://8bit-inferno.de/images.sqlite as a 3.39 GB file)

When running locally, i.e. on localhost, the JavaScript will expect the PHP backend under port 8080.

The following script will create 'images.sqlite' from a given directory containing all title page images:

- import.php
