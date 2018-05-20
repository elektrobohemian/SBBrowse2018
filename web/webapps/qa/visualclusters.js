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

var stdImageSize = 50;
var maxImageSize = 250;

var csvDataPath = dataPathPrefix + "clusters.csv"

document.body.addEventListener('keydown', function (e) {
    k = e.keyCode;
    if (k == 37 || k == 8) { // react on "left cursor" and "backspace"
        backToOverview();
    }
});

// central D3 rendering function
function renderNetworkGraph(dataPath) {

    csvDataPath = dataPath
    d3.select("svg").selectAll("*").remove();

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        g = svg.append("g").attr("transform", "translate(40,0)");

    var tree = d3.cluster()
        .size([height, width - 160]);

    var stratify = d3.stratify()
        .parentId(function (d) {
            return d.id.substring(0, d.id.lastIndexOf("."));
        });


    d3.csv(dataPath, function (error, data) {
        if (error) throw error;

        var root = stratify(data)
            /*.sort(function(a, b) {
                return (a.height - b.height) || a.id.localeCompare(b.id);
            })*/
        ;

        tree(root);

        var link = g.selectAll(".link")
            .data(root.descendants().slice(1))
            .enter().append("path")
            .attr("class", "link")
            .attr("d", function (d) {
                return "M" + d.y + "," + d.x + "C" + (d.parent.y + 100) + "," + d.x + " " + (d.parent.y + 100) + "," + d.parent.x + " " + d.parent.y + "," + d.parent.x;
            });

        var node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", function (d) {
                return "node" + (d.children ? " node--internal" : " node--leaf");
            })
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            })

        node.append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .style("cursor", function (d) {
                //if (!d.children)
                return "pointer";
                //else
                //    return "";
            })
            .on("click", onNodeClick);

        node.append("text")
            .attr("class", "labels")
            .attr("dy", 3)
            .attr("x", function (d) {
                return d.children ? -8 : 8;
            })
            .style("text-anchor", function (d) {
                return d.children ? "end" : "start";
            })
            .style("cursor", function (d) {
                //if (!d.children)
                return "pointer";
                //else
                //    return "";
            })
            .text(function (d) {
                if (!d.children)
                    return d.id.substring(d.id.lastIndexOf(".") + 1);
                else
                    return d.id.substring(d.id.lastIndexOf(".") + 1);
            })
            .on("click", onNodeClick);

        node.append("image")
            .attr("xlink:href", function (d) {
                imgName = d.id.substring(d.id.lastIndexOf(".") + 1);
                if (!d.children) {
                    if (imgName != "more")
                        return imgDir + imgName + ".jpg";
                    else
                        return null;

                } else {
                    if (imgName.startsWith("PPN")) {
                        return imgDir + imgName + ".jpg";
                    } else
                        return null;
                }

            })
            .attr("y", -stdImageSize / 2)
            .attr("x", function (d) {
                return d.children ? -8 : -50;
            })
            .attr("height", stdImageSize)
            .attr("width", stdImageSize)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
        //foo();
        if (data.length <= 3) {
            g.attr("transform", "translate(40,-800)");
        }
    });
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
    d3.select(this).moveToFront();
    d3.select(this)
        .transition()
        .delay(500)
        .duration(750)
        .attr("height", maxImageSize)
        .attr("width", maxImageSize)
        .attr("y", -stdImageSize / 2)
        .attr("x", function (d) {
            return d.children ? -8 : -250;
        });
}

function mouseout() {
    d3.select(this)
        .transition()
        .duration(750)
        .attr("height", stdImageSize)
        .attr("width", stdImageSize)
        .attr("y", -stdImageSize / 2)
        .attr("x", function (d) {
            return d.children ? -8 : -50;
        });
}

function onNodeClick(d, i) {
    event.preventDefault();
    imgName = d.id.substring(d.id.lastIndexOf(".") + 1);
    cols = d.id.split(".")
    if (imgName == "all") {
        if (csvDataPath != dataPathPrefix + "clusters.csv") {
            renderNetworkGraph(dataPathPrefix + "clusters.csv");
        } else {
            renderNetworkGraph(dataPathPrefix + "clusters.csv");
        }
    } else if (imgName == "more") {
        jumpTarget = cols[1];
        if (jumpTarget.length < 3) {
            console.log("Internal link, jumping to: " + cols[1]);
            renderNetworkGraph(dataPathPrefix + cols[1] + ".csv");
        } else {
            console.log("More in cluster " + jumpTarget);
            csvDataPath = dataPathPrefix + jumpTarget + ".csv"
            renderNetworkGraph(dataPathPrefix + jumpTarget + ".csv");
        }
    } else {
        jumpTarget = cols[1]
        if (jumpTarget.length < 3) {
            console.log("Normal link, jumping to: " + cols[1]);
            csvDataPath = dataPathPrefix + cols[1] + ".csv"
            renderNetworkGraph(csvDataPath);
        }
    }

}

function backToOverview() {
    csvDataPath = dataPathPrefix + "clusters.csv"
    renderNetworkGraph(csvDataPath);
}

renderNetworkGraph(csvDataPath);
