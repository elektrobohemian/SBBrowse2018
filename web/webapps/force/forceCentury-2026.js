/*
 * The MIT License
 *
 * Copyright 2018 David Zellhoefer.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @file
 * Interactive force-directed network visualisation of digitised collection
 * items from the Staatsbibliothek zu Berlin (SBB) Digitized Collections.
 *
 * OVERVIEW
 * --------
 * The page renders a D3 (v3) force layout in which
 *   - "century" nodes and "dateClean" nodes act as labelled hubs, and
 *   - every other node is a digitised work, drawn as a thumbnail of its
 *     first scanned page.
 *
 * The user starts on an overview graph (century.json). Double-clicking a
 * thumbnail drills down into the cluster that item belongs to
 * (clusters/<century>/<cluster>.json). Within any view, a selected item can
 * be compared to all other items: coloured "similarity edges" are drawn to
 * every item that shares a metadata value (creator, publisher, location, …)
 * with the selected one. The related items can then be exported as an HTML
 * table ("package"), and all geolocated items can be shown on a Google Map.
 *
 * DATA FORMAT
 * -----------
 * Each JSON file follows the D3 force-layout convention:
 *   { "nodes": [ {...}, ... ], "links": [ {source, target, value}, ... ] }
 * Item nodes carry (among others): id, name (PPN), title, alternative,
 * creator, publisher, source, subject, mediatype, dateClean, century,
 * cluster, textCluster, creatorCluster, location, locationRaw, lat, lng,
 * imagePath, type. Missing values are encoded as the string "nan".
 *
 * KEYBOARD SHORTCUTS
 * ------------------
 *   ←  / Backspace  back to the overview graph
 *   Esc             leave comparison mode, remove similarity edges
 *   b               build package (export related items as HTML table)
 *   c               enter comparison mode, draw similarity edges
 *   d               open detail dialog for the selected item
 *   m               show all geolocated items on a Google Map
 *   p               pause the force simulation
 *   s               (re)start the force simulation
 *   ?               open help dialog
 *
 * MOUSE INTERACTION
 * -----------------
 *   click           select item (and redraw edges if in comparison mode)
 *   double-click    drill down into the item's cluster (overview only)
 *   right-click     open detail dialog
 *   hover           enlarge thumbnail and bring it to the front
 *   drag            move a node (optionally pins it, see draggingFixEnabled)
 *   wheel / drag bg zoom and pan
 *
 * DEPENDENCIES (expected to be loaded by the host page)
 * -----------------------------------------------------
 *   - D3.js v3 (d3.layout.force, d3.scale.category20, d3.behavior.zoom)
 *   - jQuery + jQuery UI (dialogs: #dialog, #dialogMap, #dialogHelp,
 *     #dialogSettings)
 *   - Google Maps JavaScript API (google.maps.*)
 *
 * GLOBALS EXPECTED FROM THE HOST PAGE
 * -----------------------------------
 *   - dataPathPrefix  base path of the JSON data files
 *   - imgDir          base path of the thumbnail images (<imagePath>.jpg)
 *
 * DOM ELEMENTS EXPECTED
 * ---------------------
 *   #chart, #legend, #dialog / #myDialogText / #linkList, #dialogMap / #map,
 *   #dialogHelp, #dialogSettings / #dlgSettingsText
 *
 * CSS CLASSES USED
 * ----------------
 *   legend_<key>    colour swatch of a metadata field
 *   edgeLink_<key>  stroke style of a similarity edge for that field
 *   on / off        state of a toggle button in the settings dialog
 */

/*
Nice unicode characters:
&#8226; bullet
&#8227; triangular bullet
&#8718; black box (QED)
&#9210; black circle (record)
&#9209; black square (stop)
&#9608; full black block
*/
/* global dataPathPrefix */

/* =========================================================================
 * CONFIGURATION AND GLOBAL STATE
 * ========================================================================= */

/** Width and height of the SVG canvas in pixels. */
var w = 1600, //3000,
    h = 1100 //3000,
/**
 * Categorical colour scale used to fill node circles by their `group`.
 * NOTE: because of automatic semicolon insertion after `h = 1100`, this
 * becomes an implicit global rather than part of the `var` declaration.
 */
fill = d3.scale.category20();

//var overviewJSONpath = "century_test.json";

/** Path to the JSON file of the top-level overview graph. */
var overviewJSONpath = dataPathPrefix + "century.json"

/** True while the user is looking at a single cluster instead of the overview. */
var inClusterInspection = false;

/**
 * Items related to the currently selected item, keyed by node name (PPN).
 * Filled by drawSimilarityEdges(), consumed by createDownloadWindow().
 */
var relatedNodes = {};

/**
 * Per-metadata-field switch ("on" / "off") deciding whether shared values in
 * that field produce a similarity edge. Initialised from the keys of the
 * loaded JSON nodes and toggled in the settings dialog.
 */
var displayComparisonEdge = {};

/** Thumbnail edge length in px at rest and when hovered. */
var stdImageSize = 50;
var maxImageSize = 250;

/** If true, dragging a node pins it in place (d.fixed = true). */
var draggingFixEnabled = false;

/** True while similarity edges should be shown/kept up to date. */
var inComparisonMode = false;

/** Ensures the legend is only built once (implicit global). */
legendCreated = false;

/** True if the user paused the force simulation with 'p'. */
var animationPaused = false;

/** The D3 force layout of the current graph. */
var force;

/** The SVG <g> container that all graph elements are drawn into. */
var vis;

/* -------------------------------------------------------------------------
 * External link templates (SBB services). The PPN of an item is appended.
 * ------------------------------------------------------------------------- */

/** Direct image of a METS-described scan (currently unused). */
var linkHead = "https://ngcs.staatsbibliothek-berlin.de/?action=metsImage&format=jpg&metsFile=";
var linkTail = "&divID=PHYS_0001"; //&width=800&rotate=0";
/** SBB digital collections viewer. */
var sbbViewerLink = "https://digital.staatsbibliothek-berlin.de/werkansicht/?PPN=";
/** METS resolver. */
var metsLink = "https://digital.staatsbibliothek-berlin.de/metsresolver/?PPN=";
/** OPAC record (stabikat) – expects the PPN without the "PPN" prefix. */
var ppnLink = "https://stabikat.de/DB=1/PPN?PPN=";
/** OAI-PMH GetRecord, METS and Dublin Core flavours. */
var oaiGetRecordLink = "https://digital.staatsbibliothek-berlin.de/oai/?verb=GetRecord&metadataPrefix=mets&identifier=oai:digital.staatsbibliothek-berlin.de:";
var oaiGetRecordLink_DC = "https://digital.staatsbibliothek-berlin.de/oai/?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:digital.staatsbibliothek-berlin.de:";
/** OPAC search (currently unused). */
var stabikatSearchLink = "https://stabikat.de/DB=1/SET=1/TTL=1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM=";
/** stabikat+ discovery system (EBSCO EDS) free-text search. */
var stabikatPlusLink = "https://eds.b.ebscohost.com/eds/results?vid=0&hid=113&bdata=JmNsaTA9RlQxJmNsdjA9WSZsYW5nPWRlJnR5cGU9MCZzaXRlPWVkcy1saXZl&bquery="
    /* OLD comparison of two elements
    var queue = [];
    var queueData = [];
    */

/** Name (PPN) of the currently selected item, or null. */
var queue = null;
/** Full node object of the currently selected item, or null. */
var queueData = null;

/**
 * Marker data for the map view. Each entry is
 * [label, lat, lng, thumbnailUrl, nodeObject].
 */
var locations = [];

/* =========================================================================
 * KEYBOARD HANDLING
 * ========================================================================= */

/**
 * Global keyboard shortcuts (see file header for the full list).
 * Uses legacy `keyCode` values.
 */
document.body.addEventListener('keydown', function (e) {
    k = e.keyCode;
    if (k == 37 || k == 8) { // react on "left cursor" and "backspace"
        backToOverview();
    } else if (k == 27) { //ESC
        // leave comparison mode and resume the simulation unless paused
        //d3.selectAll("#compareEdge").remove();
        fadeOutSimilarityEdges();
        inComparisonMode = false;
        if (!animationPaused)
            force.start();
    } else if (k == 66) { // 'b' – build package
        createDownloadWindow();
    } else if (k == 67) { // 'c' – comparison mode
        inComparisonMode = true;
        drawSimilarityEdges();
    } else if (k == 68) { // 'd' – details of the selected item
        if (queueData != null)
            displayDetailDialog(queueData, 0);
    } else if (k == 77) { // 'm' – map of all geolocated items in the view
        locations = [];
        d3.selectAll("image").each(function (d) {
            if (d.lat != "nan") {
                locArray = [];
                locArray.push(d.source + " (" + d.location + ")");
                locArray.push(d.lat);
                locArray.push(d.lng);
                locArray.push(imgDir + d.imagePath + ".jpg");
                locArray.push(d);
                locations.push(locArray);
            }
        });
        $("#dialogMap").dialog("open");
        initMap();

    } else if (k == 80) { // 'p' – pause simulation
        force.stop();
        animationPaused = true;
    } else if (k == 83) { // 's' – start simulation
        force.start();
        animationPaused = false;
    } else if (k == 191) { // '?' – help
        $("#dialogHelp").dialog("open");
    }
    console.log(k);
});

/* =========================================================================
 * SIMILARITY EDGES (COMPARISON MODE)
 * ========================================================================= */

/**
 * Removes all similarity edges with a 400 ms fade-out and restores full
 * opacity on every thumbnail.
 */
function fadeOutSimilarityEdges() {
    //console.log("fade out");
    d3.selectAll("image").style("opacity", 1.0);
    d3.selectAll("#compareEdge")
        .transition()
        .duration(400)
        .style("opacity", 0.0)
        .remove();
}

/**
 * Draws a line from the selected item (queueData) to every item that shares
 * at least one metadata value with it. One line is drawn per shared field,
 * styled with the CSS class `edgeLink_<field>` so that each field has its own
 * colour. Fields switched "off" in displayComparisonEdge are ignored, as are
 * the technical fields type, weight, fixed and century.
 *
 * Items without anything in common are dimmed to 50 % opacity. Related items
 * are collected in `relatedNodes` for later export.
 *
 * The force simulation is stopped first, because the edges are drawn with
 * static coordinates and would not follow moving nodes.
 */
function drawSimilarityEdges() {
    // stop the animation in order to draw the lines without the need for updating them continuously
    force.stop();
    // remove old lines
    //d3.selectAll("#compareEdge").remove();
    fadeOutSimilarityEdges();
    // remove old related nodes
    for (var member in relatedNodes) delete relatedNodes[member];

    vis = d3.select("#chart svg");

    d3.selectAll("image").each(function (d) {
        somethingInCommon = false;
        Object.keys(d).forEach(function (key, index) {
            // key: the name of the object key
            // index: the ordinal position of the key within the object
            // type, weight, fixed are ignored
            if (key != "type" && key != "weight" && key != "fixed" && key != "century") {
                if (queueData != null) {
                    // NOTE: equivalent to queueData[key] == d[key]
                    if (eval("queueData." + key) == eval("d." + key) && displayComparisonEdge[key] == "on") {
                        somethingInCommon = true;
                        vis.append("svg:line")
                            //.attr("class", "link")
                            .attr("class", "edgeLink_" + key)
                            .attr("id", "compareEdge")
                            //.style("stroke-width", 1)
                            .attr("x1", queueData.x)
                            .attr("y1", queueData.y)
                            .attr("x2", d.x)
                            .attr("y2", d.y)
                            .transition()
                            .duration(400)
                            .style("stroke-opacity", 0.6);

                        if (!(d.name in relatedNodes)) {
                            relatedNodes[d.name] = d;
                            console.log("Added " + d.name);
                        }
                    }
                }
            }
        });
        if (!somethingInCommon) {
            d3.select(this).style("opacity", 0.5);
        } else {
            d3.select(this).style("opacity", 1.0);
        }
    }); // END selectAll + foreach
}

/* =========================================================================
 * NAVIGATION
 * ========================================================================= */

/**
 * Leaves cluster inspection, clears the current selection and related items,
 * and re-renders the overview graph.
 */
function backToOverview() {
    inClusterInspection = false;
    queue = null;
    queueData = null;
    // remove old related nodes
    for (var member in relatedNodes) delete relatedNodes[member];

    renderNetworkGraph(overviewJSONpath);
}

/* =========================================================================
 * EXPORT ("BUILD PACKAGE")
 * ========================================================================= */

/**
 * Builds an HTML table of the selected item (first row, bold) and all items
 * in `relatedNodes`, with links to the OAI-PMH METS/MODS and Dublin Core
 * records. The table is shown in a new browser window and offered as a
 * download named "metadata.html".
 *
 * Requires a selected item (queueData); call drawSimilarityEdges() first so
 * that relatedNodes is populated.
 */
function createDownloadWindow() {
    // example of a node record (for reference only, not used)
    sample = {
        "publisher": "Drucker des Bollanus",
        "imagePath": "PPN788641328",
        "century": 14,
        "name": "PPN788641328",
        "title": "De conceptione Beatae Virginis Mariae",
        "locationRaw": "Erfurt",
        "creator": "Bollanus, Dominicus",
        "mediatype": "Monograph",
        "cluster": "10",
        "source": "Bollanus, Dominicus: De conceptione Beatae Virginis Mariae. Erfurt  Berlin 1486",
        "dateClean": "1486",
        "alternative": "nan",
        "subject": "Historische Drucke",
        "type": "image",
        "id": "PPN788641328",
        "location": "Erfurt"
    }
    var w = window.open();
    var html = "<!DOCTYPE html><html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/></head><body></body></html>";

    // HTML skeleton of the downloadable file
    sorttableScript = ""
    var htmlHead = "<!DOCTYPE html><html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/><script src='https://code.jquery.com/jquery-latest.js'></script><style>table, th, td {border: 1px solid black;border-collapse: collapse;}</style></head><body>";
    var htmlBody = "";
    var tableHead = "<table><tr><th>ID</th><th>Title</th><th>METS/MODS URL</th><th>Dublin Core URL</th><th>Alternative</th><th>Creator</th><th>Publisher</th><th>Century</th><th>Date</th><th>Mediatype</th><th>Location</th><th>Longitude</th><th>Latitude</th><th>Location (raw)</th><th>titleCluster</th><th>creatorCluster</th></tr>\n";
    var tableTail = "</tbody></table>"
    var htmlTail = "</body><script>$('tbody').sortable();</script></html>";

    w.document.writeln(html);
    $(w.document.body).append("<h2>List of Related Media</h2>");

    // first row: the selected item itself, in bold
    tableHead = tableHead + "<tr>";
    tableHead = tableHead + "<td><b>" + queueData.id + "</b></td>";
    tableHead = tableHead + "<td><b>" + queueData.title + "</b></td>";

    tableHead = tableHead + "<td><a target='_blank' href='" + oaiGetRecordLink + queueData.name + "'>" + oaiGetRecordLink + queueData.name + "</a></td> "
    tableHead = tableHead + "<td><a target='_blank' href='" + oaiGetRecordLink_DC + queueData.name + "'>" + oaiGetRecordLink_DC + queueData.name + "</a></td>";

    tableHead = tableHead + "<td>" + queueData.alternative + "</td>";
    tableHead = tableHead + "<td>" + queueData.creator + "</td>";
    tableHead = tableHead + "<td>" + queueData.publisher + "</td>";
    tableHead = tableHead + "<td>" + queueData.century + "</td>";
    tableHead = tableHead + "<td>" + queueData.dateClean + "</td>";
    tableHead = tableHead + "<td>" + queueData.mediatype + "</td>";
    tableHead = tableHead + "<td>" + queueData.location + "</td>";
    tableHead = tableHead + "<td>" + queueData.lng + "</td>";
    tableHead = tableHead + "<td>" + queueData.lat + "</td>";
    tableHead = tableHead + "<td>" + queueData.locationRaw + "</td>";

    tableHead = tableHead + "<td>" + queueData.textCluster + "</td>";
    tableHead = tableHead + "<td>" + queueData.creatorCluster + "</td>";


    tableHead = tableHead + "</tr>\n<tbody>\n";

    // one row per related item
    for (var member in relatedNodes) {
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         TODO
         Tabelle mit maschinellen Korrekturen aus JSON anreichern
         (enrich the table with machine corrections from the JSON)
        * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
        //$(w.document.body).append("<p>" + relatedNodes[member].source + "</p>");
        //$(w.document.body).append("<a target='_blank' href='" + oaiGetRecordLink + relatedNodes[member].name + "'>METS/MODS</a> ");
        //$(w.document.body).append("<a target='_blank' href='" + oaiGetRecordLink_DC + relatedNodes[member].name + "'>Dublin Core</a>");
        //htmlBody = htmlBody + "<p>" + relatedNodes[member].source + "</p>";
        //htmlBody = htmlBody + "<a target='_blank' href='" + oaiGetRecordLink + relatedNodes[member].name + "'>METS/MODS</a> "
        //htmlBody = htmlBody + "<a target='_blank' href='" + oaiGetRecordLink_DC + relatedNodes[member].name + "'>Dublin Core</a>";
        tableHead = tableHead + "<tr>";
        //tableHead = tableHead + "<td>" + relatedNodes[member].source + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].id + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].title + "</td>";

        tableHead = tableHead + "<td><a target='_blank' href='" + oaiGetRecordLink + relatedNodes[member].name + "'>" + oaiGetRecordLink + relatedNodes[member].name + "</a></td> "
        tableHead = tableHead + "<td><a target='_blank' href='" + oaiGetRecordLink_DC + relatedNodes[member].name + "'>" + oaiGetRecordLink_DC + relatedNodes[member].name + "</a></td>";


        tableHead = tableHead + "<td>" + relatedNodes[member].alternative + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].creator + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].publisher + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].century + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].dateClean + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].mediatype + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].location + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].lng + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].lat + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].locationRaw + "</td>";

        tableHead = tableHead + "<td>" + relatedNodes[member].textCluster + "</td>";
        tableHead = tableHead + "<td>" + relatedNodes[member].creatorCluster + "</td>";


        tableHead = tableHead + "</tr>\n";


    };
    $(w.document.body).append(tableHead + tableTail);

    download("metadata.html", htmlHead + htmlBody + tableHead + tableTail + htmlTail);
}

/**
 * Triggers a client-side download of a text file.
 * Uses msSaveBlob on legacy IE/Edge, otherwise a temporary <a download> link
 * pointing at a Blob object URL.
 *
 * @param {string} filename  Suggested file name.
 * @param {string} text      File contents.
 */
function download(filename, text) {
    // source: http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
    /*
    var element = document.createElement('a');
    element.setAttribute('href', 'data:application/xhtml+xml;charset=utf-8,' + encodeURIComponent(text));
    //element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);*/

    var blob = new Blob([text], {
        type: 'text/plain'
    });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }

}

/* =========================================================================
 * HELPERS
 * ========================================================================= */

/**
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {string} Google Maps URL centred on the given coordinates.
 */
function createGoogleMapsLink(lat, lng) {
    return "https://maps.google.com/maps?q=" + lat + "," + lng;
}

/**
 * Prepares a metadata value for display in HTML.
 * Maps the placeholder "nan" to "- Unknown -" and encodes `<`, `>`, `&` and
 * all characters in U+00A0–U+9999 as numeric HTML entities.
 *
 * @param {string} rawStr  Raw metadata value.
 * @returns {string} HTML-safe string.
 */
function cleanUp(rawStr) {
    if (rawStr == "nan") {
        return "- Unknown -";
    } else
        return rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
}

/* =========================================================================
 * DIALOGS
 * ========================================================================= */

/**
 * Opens the settings dialog with one toggle button per comparable metadata
 * field. Each button switches the field on/off in displayComparisonEdge and
 * immediately redraws the similarity edges. Technical fields (id, lat, lng,
 * cluster, type, imagePath, century, name, locationRaw) are not offered.
 */
function displaySettingsDialog() {
    // example of comparable fields (for reference only, not used)
    sample = {
        "publisher": "Drucker des Bollanus",
        //"imagePath": "PPN788641328",
        //"century": 14,
        //"name": "PPN788641328",
        "title": "De conceptione Beatae Virginis Mariae",
        //"locationRaw": "Erfurt",
        "creator": "Bollanus, Dominicus",
        "mediatype": "Monograph",
        //"cluster": "10",
        "source": "Bollanus, Dominicus: De conceptione Beatae Virginis Mariae. Erfurt  Berlin 1486",
        "dateClean": "1486",
        "alternative": "nan",
        "subject": "Historische Drucke",
        //"type": "image",
        //"id": "PPN788641328",
        "location": "Erfurt",
        "ppn": "PPN123456789",
        "textCluster": "999"
    }

    $("#dlgSettingsText").empty();

    //draggingFixEnabled

    Object.keys(displayComparisonEdge).forEach(function (key, index) {
        if (key != "id" && key != "lat" && key != "lng" && key != "cluster" && key != "type" && key != "imagePath" && key != "century" && key != "name" && key != "locationRaw") {
            $('#dlgSettingsText').append("<span class='legend_" + key + "'>&#9608;&nbsp;</span>" + '<input type="button" id="' + key + '" value="' + key + '" class="' + displayComparisonEdge[key] + '" onfocus="blur();" onclick="toggleButton(this); drawSimilarityEdges();" /> <br />');
        }
    });
    //$('dlgSettingsText').append("<p>XYZ</p>");
    $('#dialogSettings').dialog('open');
}

/**
 * Flips a settings toggle button between "on" and "off" and mirrors the new
 * state into displayComparisonEdge (the button id is the field name).
 *
 * @param {HTMLInputElement} el  The clicked button.
 */
function toggleButton(el) {
    if (el.className == "on") {
        el.className = "off";
        displayComparisonEdge[el.id] = "off";
    } else {
        el.className = "on";
        displayComparisonEdge[el.id] = "on";
    }
    //console.log(el.className + " " + el.id);
}

/**
 * Shows the detail dialog for an item and makes it the current selection.
 * Bound to the right-click (contextmenu) event of thumbnails and to key 'd'.
 *
 * The dialog contains the thumbnail, action buttons ("Inspect cluster" –
 * overview only, "Show relationships", "Build package"), the main metadata
 * fields (with search links into stabikat+ and a Google Maps link if the
 * item is geolocated) and a list of external links (viewer, METS, OAI-PMH,
 * catalogue, discovery search).
 *
 * @param {Object} d  Node data of the item.
 * @param {number} i  Node index (unused).
 */
function displayDetailDialog(d, i) {
    //handle right click
    queue = d.name;
    queueData = d;

    $("#myDialogText").empty();
    $("#myDialogText").append("<img height='150px' src='" + imgDir + d.imagePath + ".jpg' /><br />");
    // drill-down button only makes sense on the overview
    if (!inClusterInspection)
        $("#myDialogText").append("<button type='button' onfocus='blur();' onclick=\"inClusterInspection=true;queue = null;queueData = null; renderNetworkGraph('" + dataPathPrefix + "/clusters/" + d.century + "/" + d.cluster + ".json');$('#dialog').dialog('close');\">Inspect cluster</button>");
    $("#myDialogText").append("&nbsp; <button type='button' onfocus='blur();' onclick=\"drawSimilarityEdges();\">Show relationships</button>");
    $("#myDialogText").append("&nbsp; <button type='button' onfocus='blur();' onclick=\"createDownloadWindow();\">Build package</button>");


    $("#myDialogText").append("<p><b>" + cleanUp(d.title) + " (" + cleanUp(d.dateClean) + ")</b></p>");

    // creator, linked to a discovery search if known
    cleanCreator = cleanUp(d.creator);
    if (cleanCreator != "- Unknown -")
        $("#myDialogText").append("<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: <a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(cleanCreator) + "'>" + cleanCreator + "</a></p>");
    else {
        $("#myDialogText").append("<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: " + cleanCreator + "</p>");
    }

    // publisher, linked to a discovery search if known
    cleanPublisher = cleanUp(d.publisher);
    if (cleanPublisher != "- Unknown -") {
        $("#myDialogText").append("<p><span class='legend_publisher'>&#9608;&nbsp;</span>Publisher: <a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(cleanPublisher) + "'>" + cleanPublisher + "</a></p>");
    } else {
        $("#myDialogText").append("<p><span class='legend_publisher'>&#9608;&nbsp;</span>Publisher: " + cleanPublisher + "</p>");
    }
    $("#myDialogText").append("<p><span class='legend_source'>&#9608;&nbsp;</span>Source: " + cleanUp(d.source) + "</p>");
    $("#myDialogText").append("<p><span class='legend_mediatype'>&#9608;&nbsp;</span>Mediatype: " + cleanUp(d.mediatype) + " (<span class='legend_subject'>&#9608;&nbsp;</span>" + cleanUp(d.subject) + ")</p>");

    // check if we can created a Google Maps link for the location
    if (d.lat != "nan") {
        mapURL = createGoogleMapsLink(d.lat, d.lng);
        $("#myDialogText").append("<p><span class='legend_location'>&#9608;&nbsp;</span>Spatial: <a target='_blank' href='" + mapURL + "'>" + d.location + "</a> (" + cleanUp(d.locationRaw) + ")</p>");
    } else {
        $("#myDialogText").append("<p><span class='legend_location'>&#9608;&nbsp;</span>Spatial: <em>" + d.location + "</em> (" + cleanUp(d.locationRaw) + ")</p>");
    }



    //console.log(d.century + ": " + d.cluster);

    // external links
    $("#linkList").empty();
    $("#linkList").append("<li><a target='_blank' href='" + sbbViewerLink + d.name + "'>View in SBB viewer</a></li>");
    //$("#linkList").append("<li><a target='_blank' href='" + linkHead + d.name + linkTail + "'>View first scanned pagein full size</a></li>");
    $("#linkList").append("<li><a target='_blank' href='" + metsLink + d.name + "'>METS/MODS metadata</a></li>");
    $("#linkList").append("<li><a target='_blank' href='" + oaiGetRecordLink + d.name + "'>OAI-PMH METS metadata GetRecord</a></li>");
    $("#linkList").append("<li><a target='_blank' href='" + ppnLink + d.name.replace("PPN", "") + "'>Show in catalog</a></li>");
    $("#linkList").append("<li><a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(d.name.replace("PPN", "")) + "'>Search for title in stabikat+ discovery system</a></li>");
    $("#dialog").dialog("open");
    //stop showing browser menu
    d3.event.preventDefault();
}

/* =========================================================================
 * MAP VIEW
 * ========================================================================= */

/**
 * Renders a Google Map (centred on Berlin, zoom 3) into #map with one marker
 * per entry in `locations`. Markers are jittered by up to ±0.01° so that
 * items sharing a place do not stack exactly on top of each other. Clicking a
 * marker opens an info window with the thumbnail, main metadata and links.
 */
function initMap() {
    $("#map").empty();

    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: new google.maps.LatLng(52.52000659999999, 13.404954), // centers on Berlin
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < locations.length; i++) {
        // in case of multiple markers at one location, we place these markes randomized around the original location
        latModifier = 1;
        lngModifier = 1;
        latOffset = Math.round(Math.random() * 10);
        lngOffset = Math.round(Math.random() * 10);
        // random sign for each axis
        if (latOffset % 2 == 0)
            latModifier = 1;
        else
            latModifier = -1;
        if (lngOffset % 2 == 0)
            lngModifier = 1;
        else
            lngModifier = -1;
        lat = parseFloat(locations[i][1]) + (Math.random() / 100.0) * latModifier;
        lng = parseFloat(locations[i][2]) + (Math.random() / 100.0) * lngModifier;

        marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: map
        });

        // IIFE captures the current marker and index for the click handler
        google.maps.event.addListener(marker, 'click', (function (marker, i) {
            return function () {
                d = locations[i][4];
                img = "<img height='150px' src='" + locations[i][3] + "' />";

                markerContent = "";
                markerContent += "<p><b>" + cleanUp(d.title) + " (" + cleanUp(d.dateClean) + ")</b></p>";
                markerContent += "<p>" + d.location + "</p>";
                cleanCreator = cleanUp(d.creator);
                if (cleanCreator != "- Unknown -")
                    markerContent += "<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: <a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(cleanCreator) + "'>" + cleanCreator + "</a></p>";
                else {
                    markerContent += "<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: " + cleanCreator + "</p>";
                }
                cleanPublisher = cleanUp(d.publisher);
                if (cleanPublisher != "- Unknown -") {
                    markerContent += "<p><span class='legend_publisher'>&#9608;&nbsp;</span>Publisher: <a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(cleanPublisher) + "'>" + cleanPublisher + "</a></p>";
                } else {
                    markerContent += "<p><span class='legend_publisher'>&#9608;&nbsp;</span>Publisher: " + cleanPublisher + "</p>";
                }


                markerContent += "<p><span class='legend_source'>&#9608;&nbsp;</span>Source: " + cleanUp(d.source) + "</p>";
                markerContent += "<p><span class='legend_mediatype'>&#9608;&nbsp;</span>Mediatype: " + cleanUp(d.mediatype) + " (<span class='legend_subject'>&#9608;&nbsp;</span>" + cleanUp(d.subject) + ")</p>";

                markerContent += "<ul>";
                markerContent += "<li><a target='_blank' href='" + metsLink + d.name + "'>METS/MODS metadata</a></li>";

                markerContent += "<li><a target='_blank' href='" + ppnLink + d.name.replace("PPN", "") + "'>Show in catalog</a></li>";
                markerContent += "<li><a target='_blank' href='" + stabikatPlusLink + d.location + "'>Search for location in stabikat+ discovery system</a></li>";
                markerContent += "</ul>";

                infowindow.setContent(img + markerContent);
                //infowindow.setContent(img + "<p>" + locations[i][0] + "</p>");
                infowindow.open(map, marker);
            }
        })(marker, i));
    }
}

/* =========================================================================
 * HOVER, ZOOM AND RENDERING
 * ========================================================================= */

/**
 * D3 selection extension: brings each selected element's node group (<g>)
 * to the front by re-appending it to its parent, so that an enlarged
 * thumbnail is not covered by its neighbours (SVG has no z-index).
 *
 * Expects the selection to contain <image> elements whose parent is the
 * node <g>, whose parent in turn is the main container.
 */
d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        // path is g.image
        farfarG = this.parentNode.parentNode;
        //g = this.parentNode.appendChild(this);
        farfarG.appendChild(this.parentNode);

    });
};

/**
 * Mouse-over handler for thumbnails: stops the simulation, brings the
 * thumbnail to the front and, after 500 ms, enlarges it to maxImageSize.
 */
function mouseover() {
    force.stop();
    d3.select(this).moveToFront();
    d3.select(this)
        .transition()
        .delay(500)
        .duration(750)
        .attr("height", maxImageSize)
        .attr("width", maxImageSize);
}

/**
 * Mouse-out handler for thumbnails: shrinks the thumbnail back to
 * stdImageSize and restarts the simulation unless it is paused or the user
 * is in comparison mode (edges would otherwise detach from moving nodes).
 */
function mouseout() {
    d3.select(this)
        .transition()
        .duration(750)
        .attr("height", stdImageSize)
        .attr("width", stdImageSize);
    if (!animationPaused && !inComparisonMode)
        force.start();
}

/**
 * Zoom/pan handler bound via d3.behavior.zoom(): applies the current
 * translation and scale to the main container.
 */
function redraw() {
    console.log("zooming...");
    vis.attr("transform",
        "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

/**
 * Zooms the graph around the canvas centre to a given scale, e.g. from an
 * external slider control. Not wired to any element in this file.
 *
 * @param {number} scale  Zoom factor (1 = 100 %).
 */
function zoomWithSlider(scale) {
    var svg = d3.select("#chart").select("svg");
    var container = svg.select("g");
    var h = svg.attr("height"),
        w = svg.attr("width");

    // Note: works only on the <g> element and not on the <svg> element
    // which is a common mistake
    container.attr("transform",
        "translate(" + w / 2 + ", " + h / 2 + ") " +
        "scale(" + scale + ") " +
        "translate(" + (-w / 2) + ", " + (-h / 2) + ")");
}

/**
 * Central rendering function. Clears #chart, loads a graph JSON file and
 * draws it as a force-directed layout.
 *
 * Steps:
 *  1. Create the SVG canvas and a zoomable <g> container (`vis`).
 *  2. Load the JSON. Use the keys of the second node (json.nodes[1]) to
 *     initialise displayComparisonEdge (all "on") and, on the first call
 *     only, build the colour legend in #legend.
 *  3. Start the force layout (charge -120, link distance 100).
 *  4. Draw links (<line>, width √value), then one <g> per node containing
 *     a <circle>, a <text> label (only for century/date hub nodes) and an
 *     <image> thumbnail (only for item nodes).
 *  5. Bind interaction handlers to thumbnails (click, dblclick,
 *     contextmenu, mouseover, mouseout, drag).
 *  6. Fade the graph in and update all positions on every simulation tick.
 *
 * @param {string} jsonFileName  Path of the graph JSON (overview or cluster).
 */
function renderNetworkGraph(jsonFileName) {
    d3.select("#chart").selectAll("*").remove();

    vis = d3.select("#chart")
        .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .call(d3.behavior.zoom().on("zoom", redraw));

    d3.json(jsonFileName, function (error, json) {
        // fail loudly instead of crashing inside d3.min.js
        if (error || !json) {
            console.error("Could not load graph JSON:", jsonFileName, error);
            return;
        }
        if (!Array.isArray(json.nodes)) {
            console.error("Graph JSON has no 'nodes' array:", jsonFileName, Object.keys(json));
            return;
        }
        if (!Array.isArray(json.links)) {
            console.warn("Graph JSON has no 'links' array, rendering nodes only:", jsonFileName, Object.keys(json));
            json.links = [];
        }

        // after the JSON has been loaded, create a settings object in order to steer the visibility of comparison edges and create an appropriate legend
        Object.keys(json.nodes[1]).forEach(function (key, index) {
            displayComparisonEdge[key] = "on";

            console.log(jsonFileName);
            if (!legendCreated) {
                $('#legend').append("<ul class='legend'>");
                console.log(key);
                // only user-facing metadata fields get a legend entry
                if (key != "id" && key != "lat" && key != "lng" && key != "cluster" && key != "type" && key != "imagePath" && key != "century" && key != "name" && key != "locationRaw") {
                    console.log("creating legend");
                    $('#legend').append("<li class='legend'><span class='legend_" + key + "'>&#9608;&nbsp;</span>" + key + "</li>");
                }
                $('#legend').append("</ul>");
            }
        });
        legendCreated = true;


        force = d3.layout.force()
            .charge(-120)
            .linkDistance(100)
            .nodes(json.nodes)
            .links(json.links)
            .size([w, h])
            .start();

        // http://bl.ocks.org/mbostock/3750558 "This example demonstrates how to prevent D3’s force layout from moving nodes that have been repositioned by the user."
        var drag = force.drag()
            .on("dragstart", dragstart);

        /**
         * Drag-start handler: if draggingFixEnabled, removes similarity
         * edges and pins the dragged node so the layout no longer moves it.
         * @param {Object} d  Node data.
         */
        function dragstart(d) {
            if (draggingFixEnabled) {
                d3.selectAll("#compareEdge").remove();
                //fadeOutSimilarityEdges();
                d3.select(this).classed("fixed", d.fixed = true);
            }
        }


        // ---- links ----
        var link = vis.selectAll("line.link")
            .data(json.links)
            .enter().append("svg:line")
            //.attr("class", "link")
            .attr("class", function (d) {
                return "link " + d.decade;
            })
            .attr("id", function (d) {
                return d.year;
            })
            .style("stroke-width", function (d) {
                return Math.sqrt(d.value);
            })
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        // ---- one group per node ----
        var g = vis.selectAll("circle.node")
            .data(json.nodes)
            .enter()
            .append("svg:g")
            //.attr("class", "g.nodegroup")
            .attr("class", function (d) {
                return "g.nodegroup " + d.decade;
            })
            .attr("id", function (d) {
                return d.year;
            });

        // circle (visible for all node types, coloured by group)
        var node = g.append("svg:circle")
            .attr("class", function (d) {
                if (d.type == "century" || d.type == "dateClean") return "node";
                else return "node"; //"nodeInvisible";
            })
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })
            .attr("r", 5)
            .style("fill", function (d) {
                return fill(d.group);
            }) // d referenziert ein JSON-Tag (d refers to a JSON node)
            // daz: http://stackoverflow.com/questions/8238990/unable-to-get-click-event-in-d3-javascript-library   http://stackoverflow.com/questions/24394369/adding-onclick-event-to-d3-force-layout-graph
            .call(force.drag);

        // text label: "<n>th" for century hubs, the date for date hubs
        var labels = g.append("text")
            //.attr("class", "labels")
            .attr("class", function (d) {
                if (d.type == "century" || d.type == "dateClean") return "centurylabels";
                else return "labels";
            })
            .text(function (d) {
                if (d.type == "century") return d.name + "th";
                else if (d.type == "dateClean") return d.name;
            })
            .attr("x", function (d) {
                return d.x;
            })
            .attr("y", function (d) {
                return d.y;
            })
            .call(force.drag);

        // thumbnail: item nodes only (hub nodes get a 0x0 image)
        var images = g.append("image")
            .attr("xlink:href", function (d) {
                if (d.type != "century" && d.type != "dateClean") {
                    if (d.imagePath != "undefined")
                        return imgDir + d.imagePath + ".jpg";
                    else
                        return "./blank.png";
                }
            })
            .attr("x", function (d) {
                return (d.x - stdImageSize / 2);
            })
            .attr("y", function (d) {
                return (d.y - stdImageSize / 2);
            })
            .attr("height", function (d) {
                if (d.type != "century" && d.type != "dateClean")
                    return stdImageSize;
                else return 0;
            })
            .attr("width", function (d) {
                if (d.type != "century" && d.type != "dateClean")
                    return stdImageSize;
                else return 0;
            })
            // click: select the item
            .on("click", function (d, i) {
                var pos = d3.mouse(this);
                console.log(pos);
                console.log(d.name);
                event.preventDefault();

                //d3.selectAll("#compareEdge").remove();
                fadeOutSimilarityEdges();

                queue = d.name;
                queueData = d;

                if (inComparisonMode)
                    drawSimilarityEdges();
                console.log(queue);
                console.log(queueData);
            })
            // double-click: drill down into the item's cluster (overview only)
            .on("dblclick", function (d) {
                if (!inClusterInspection) {
                    renderNetworkGraph(dataPathPrefix + "clusters/" + d.century + "/" + d.cluster + ".json");
                    queue = null;
                    queueData = null;
                    inClusterInspection = true;
                }

            })
            .on("contextmenu", displayDetailDialog)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .call(force.drag);


        //svg:title is automatically interpreted as a mouse-over balloon tip by the browser
        node.append("svg:title")
            .text(function (d) {
                return d.name;
            });

        images.append("svg:title")
            .text(function (d) {
                return d.name;
            });

        // fade in the whole graph
        vis.style("opacity", 1e-6)
            .transition()
            .duration(1000)
            .style("opacity", 1);

        // muss alle elemente beinhalten, die wichtig sind
        // (must update every element that has to follow the nodes)
        force.on("tick", function () {
            link.attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });


            node.attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                });

            labels.attr("x", function (d) {
                    return d.x;
                })
                .attr("y", function (d) {
                    return d.y;
                });

            // centre the thumbnail on the node (25 = stdImageSize / 2)
            images.attr("x", function (d) {
                    return d.x - 25;
                })
                .attr("y", function (d) {
                    return d.y - 25;
                });
        });
    });
};


/* =========================================================================
 * ENTRY POINT
 * ========================================================================= */

// render the overview graph on page load
renderNetworkGraph(overviewJSONpath);