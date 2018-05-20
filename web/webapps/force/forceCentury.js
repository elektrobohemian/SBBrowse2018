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

// dimensions of the SVG canvas
var w = 1600, //3000,
    h = 1100 //3000,
fill = d3.scale.category20();

//var overviewJSONpath = "century_test.json";

var overviewJSONpath = dataPathPrefix + "century.json"

// flag showing if the user is currently inspecting a cluster
var inClusterInspection = false;

// a "dictionary" containing related nodes with respect to the current node
var relatedNodes = {};

// display settings object for comparison edges
var displayComparisonEdge = {};

var stdImageSize = 50;
var maxImageSize = 250;

var draggingFixEnabled = false;

// checks whether comparison lines have to be drawn
var inComparisonMode = false;



legendCreated = false;

var animationPaused = false;

// the force layout
var force;

// the SVG "canvas"
var vis;

var linkHead = "http://ngcs.staatsbibliothek-berlin.de/?action=metsImage&format=jpg&metsFile=";
var linkTail = "&divID=PHYS_0001"; //&width=800&rotate=0";
var sbbViewerLink = "http://digital.staatsbibliothek-berlin.de/werkansicht/?PPN=";
var metsLink = "http://digital.staatsbibliothek-berlin.de/metsresolver/?PPN=";
var ppnLink = "http://stabikat.de/DB=1/PPN?PPN=";
var oaiGetRecordLink = "http://digital.staatsbibliothek-berlin.de/oai/?verb=GetRecord&metadataPrefix=mets&identifier=oai:digital.staatsbibliothek-berlin.de:";
var oaiGetRecordLink_DC = "http://digital.staatsbibliothek-berlin.de/oai/?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:digital.staatsbibliothek-berlin.de:";
var stabikatSearchLink = "http://stabikat.de/DB=1/SET=1/TTL=1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM=";
var stabikatPlusLink = "http://eds.b.ebscohost.com/eds/results?vid=0&hid=113&bdata=JmNsaTA9RlQxJmNsdjA9WSZsYW5nPWRlJnR5cGU9MCZzaXRlPWVkcy1saXZl&bquery="
    /* OLD comparison of two elements
    var queue = [];
    var queueData = [];
    */
var queue = null;
var queueData = null;

var locations = [];

document.body.addEventListener('keydown', function (e) {
    k = e.keyCode;
    if (k == 37 || k == 8) { // react on "left cursor" and "backspace"
        backToOverview();
    } else if (k == 27) { //ESC
        // remove old lines
        //d3.selectAll("#compareEdge").remove();
        fadeOutSimilarityEdges();
        inComparisonMode = false;
        if (!animationPaused)
            force.start();
    } else if (k == 66) { // 'b'
        createDownloadWindow();
    } else if (k == 67) { // 'c'
        inComparisonMode = true;
        drawSimilarityEdges();
    } else if (k == 68) { // 'd'
        if (queueData != null)
            displayDetailDialog(queueData, 0);
    } else if (k == 77) { // 'm'
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

    } else if (k == 80) { // p
        force.stop();
        animationPaused = true;
    } else if (k == 83) { // s
        force.start();
        animationPaused = false;
    } else if (k == 191) { // ?
        $("#dialogHelp").dialog("open");
    }
    console.log(k);
});

function fadeOutSimilarityEdges() {
    //console.log("fade out");
    d3.selectAll("image").style("opacity", 1.0);
    d3.selectAll("#compareEdge")
        .transition()
        .duration(400)
        .style("opacity", 0.0)
        .remove();
}

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

function backToOverview() {
    inClusterInspection = false;
    queue = null;
    queueData = null;
    // remove old related nodes
    for (var member in relatedNodes) delete relatedNodes[member];

    renderNetworkGraph(overviewJSONpath);
}

function createDownloadWindow() {
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

    sorttableScript = ""
    var htmlHead = "<!DOCTYPE html><html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/><script src='http://code.jquery.com/jquery-latest.js'></script><style>table, th, td {border: 1px solid black;border-collapse: collapse;}</style></head><body>";
    var htmlBody = "";
    var tableHead = "<table><tr><th>ID</th><th>Title</th><th>METS/MODS URL</th><th>Dublin Core URL</th><th>Alternative</th><th>Creator</th><th>Publisher</th><th>Century</th><th>Date</th><th>Mediatype</th><th>Location</th><th>Longitude</th><th>Latitude</th><th>Location (raw)</th><th>titleCluster</th><th>creatorCluster</th></tr>\n";
    var tableTail = "</tbody></table>"
    var htmlTail = "</body><script>$('tbody').sortable();</script></html>";

    w.document.writeln(html);
    $(w.document.body).append("<h2>List of Related Media</h2>");

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

    for (var member in relatedNodes) {
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         TODO
         Tabelle mit maschinellen Korrekturen aus JSON anreichern
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

function createGoogleMapsLink(lat, lng) {
    return "http://maps.google.com/maps?q=" + lat + "," + lng;
}

// takes an input raw string and encodes all special characters as HTML entities
function cleanUp(rawStr) {
    if (rawStr == "nan") {
        return "- Unknown -";
    } else
        return rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
}

function displaySettingsDialog() {
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

function displayDetailDialog(d, i) {
    //handle right click
    queue = d.name;
    queueData = d;

    $("#myDialogText").empty();
    $("#myDialogText").append("<img height='150px' src='" + imgDir + d.imagePath + ".jpg' /><br />");
    if (!inClusterInspection)
        $("#myDialogText").append("<button type='button' onfocus='blur();' onclick=\"inClusterInspection=true;queue = null;queueData = null; renderNetworkGraph('" + dataPathPrefix + "/clusters/" + d.century + "/" + d.cluster + ".json');$('#dialog').dialog('close');\">Inspect cluster</button>");
    $("#myDialogText").append("&nbsp; <button type='button' onfocus='blur();' onclick=\"drawSimilarityEdges();\">Show relationships</button>");
    $("#myDialogText").append("&nbsp; <button type='button' onfocus='blur();' onclick=\"createDownloadWindow();\">Build package</button>");


    $("#myDialogText").append("<p><b>" + cleanUp(d.title) + " (" + cleanUp(d.dateClean) + ")</b></p>");
    cleanCreator = cleanUp(d.creator);
    if (cleanCreator != "- Unknown -")
        $("#myDialogText").append("<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: <a target='_blank' href='" + stabikatPlusLink + encodeURIComponent(cleanCreator) + "'>" + cleanCreator + "</a></p>");
    else {
        $("#myDialogText").append("<p><span class='legend_creator'>&#9608;&nbsp;</span>Creator: " + cleanCreator + "</p>");
    }

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

d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        // path is g.image
        farfarG = this.parentNode.parentNode;
        //g = this.parentNode.appendChild(this);
        farfarG.appendChild(this.parentNode);

    });
};

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

function mouseout() {
    d3.select(this)
        .transition()
        .duration(750)
        .attr("height", stdImageSize)
        .attr("width", stdImageSize);
    if (!animationPaused && !inComparisonMode)
        force.start();
}

function redraw() {
    console.log("zooming...");
    vis.attr("transform",
        "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

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

// central D3 rendering function
function renderNetworkGraph(jsonFileName) {
    d3.select("#chart").selectAll("*").remove();

    vis = d3.select("#chart")
        .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .call(d3.behavior.zoom().on("zoom", redraw));

    d3.json(jsonFileName, function (json) {
        // after the JSON has been loaded, create a settings object in order to steer the visibility of comparison edges and create an appropriate legend
        Object.keys(json.nodes[1]).forEach(function (key, index) {
            displayComparisonEdge[key] = "on";

            console.log(jsonFileName);
            if (!legendCreated) {
                $('#legend').append("<ul class='legend'>");
                console.log(key);
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

        function dragstart(d) {
            if (draggingFixEnabled) {
                d3.selectAll("#compareEdge").remove();
                //fadeOutSimilarityEdges();
                d3.select(this).classed("fixed", d.fixed = true);
            }
        }



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
            }) // d referenziert ein JSON-Tag
            // daz: http://stackoverflow.com/questions/8238990/unable-to-get-click-event-in-d3-javascript-library   http://stackoverflow.com/questions/24394369/adding-onclick-event-to-d3-force-layout-graph
            .call(force.drag);

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

        vis.style("opacity", 1e-6)
            .transition()
            .duration(1000)
            .style("opacity", 1);

        // muss alle elemente beinhalten, die wichtig sind
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

            images.attr("x", function (d) {
                    return d.x - 25;
                })
                .attr("y", function (d) {
                    return d.y - 25;
                });
        });
    });
};



renderNetworkGraph(overviewJSONpath);
