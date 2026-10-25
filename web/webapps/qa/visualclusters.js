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
 * @file Interactive cluster browser built on D3 v4.
 *
 * Renders a hierarchical cluster tree (dendrogram, `d3.cluster`) from a CSV
 * file into the page's single <svg> element. Leaf nodes and "PPN…" nodes
 * show a thumbnail image that enlarges on hover. Clicking a node drills down
 * into a sub-cluster by loading another CSV and re-rendering the tree;
 * the left-arrow or Backspace key returns to the overview.
 *
 * ## Expected environment (defined elsewhere, e.g. in the host HTML page)
 * - `d3`             – D3.js **version 4** (uses the v4 `d3.csv(url, callback)`
 *                      signature and `d3.stratify` / `d3.cluster`).
 * - `dataPathPrefix` – {string} URL/path prefix of the CSV directory,
 *                      including a trailing slash.
 * - `imgDir`         – {string} URL/path prefix of the thumbnail directory,
 *                      including a trailing slash. Images are `<name>.jpg`.
 * - An `<svg>` element with numeric `width` and `height` attributes.
 * - CSS classes `.link`, `.node`, `.node--internal`, `.node--leaf`, `.labels`.
 *
 * ## CSV format
 * Each CSV needs at least an `id` column. Ids encode the hierarchy as
 * dot-separated paths; the parent of `a.b.c` is `a.b`, and the root has an
 * id without a dot. Example:
 *
 *     id
 *     all
 *     all.12
 *     all.12.PPN123456789
 *     all.12.more
 *
 * The last path segment is used as the node label and as the image name.
 * Some segments have special meaning (see {@link onNodeClick}):
 * - `all`  – clicking it returns to the overview (`clusters.csv`).
 * - `more` – clicking it loads the CSV named after the 2nd path segment.
 * - other  – clicking loads `<2nd segment>.csv` if that segment is shorter
 *            than 3 characters (i.e. a cluster number), otherwise nothing.
 */

/** Edge length (px) of a thumbnail in its resting state. */
var stdImageSize = 50;

/** Edge length (px) of a thumbnail while enlarged on mouse-over. */
var maxImageSize = 250;

/**
 * Path of the CSV currently displayed. Starts at the overview file and is
 * updated whenever the user navigates to another cluster.
 * @type {string}
 */
var csvDataPath = dataPathPrefix + "clusters.csv"

/*
 * Keyboard navigation: Left arrow (37) or Backspace (8) jumps back to the
 * cluster overview.
 * Note: `k` is assigned without `var` and therefore becomes a global.
 */
document.body.addEventListener('keydown', function (e) {
    k = e.keyCode;
    if (k == 37 || k == 8) { // react on "left cursor" and "backspace"
        backToOverview();
    }
});

/**
 * Central rendering function: clears the <svg>, loads a CSV and draws it as
 * a left-to-right dendrogram with labels and thumbnails.
 *
 * Rendering steps:
 * 1. Remove all previous content from the <svg> and add a group `g`
 *    shifted 40px right to leave room for root labels.
 * 2. Build the hierarchy with `d3.stratify`, deriving each node's parent
 *    from its dot-separated id.
 * 3. Lay it out with `d3.cluster` (all leaves aligned at the same depth).
 *    The layout is computed in (x = vertical, y = horizontal) and drawn
 *    with x/y swapped so the tree grows from left to right.
 * 4. Draw links as cubic Bézier curves, then one <g> per node containing
 *    a circle, a text label and (optionally) a thumbnail image.
 *
 * @param {string} dataPath URL of the CSV file to render.
 */
function renderNetworkGraph(dataPath) {

    csvDataPath = dataPath
    // Start from a blank canvas on every (re-)render.
    d3.select("svg").selectAll("*").remove();

    var svg = d3.select("svg"),
        width = +svg.attr("width"),   // unary + converts the attribute to a number
        height = +svg.attr("height"),
        g = svg.append("g").attr("transform", "translate(40,0)");

    // Dendrogram layout: breadth = svg height, depth = svg width minus a
    // 160px margin for the leaf labels/images on the right.
    var tree = d3.cluster()
        .size([height, width - 160]);

    // Converts the flat CSV rows into a hierarchy. The row's `id` is used as
    // node id (stratify default); the parent id is everything before the
    // last dot. The root's parent id resolves to "" (no dot found).
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

        // Assigns d.x (vertical position) and d.y (depth) to every node.
        tree(root);

        // --- Links -------------------------------------------------------
        // One path per non-root node, from the node back to its parent.
        // The control points sit 100px to the right of the parent, which
        // gives the curves their horizontal S-shape.
        var link = g.selectAll(".link")
            .data(root.descendants().slice(1))
            .enter().append("path")
            .attr("class", "link")
            .attr("d", function (d) {
                return "M" + d.y + "," + d.x + "C" + (d.parent.y + 100) + "," + d.x + " " + (d.parent.y + 100) + "," + d.parent.x + " " + d.parent.y + "," + d.parent.x;
            });

        // --- Nodes -------------------------------------------------------
        // A <g> per node, translated to its (swapped) layout position and
        // classed as internal or leaf for styling.
        var node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", function (d) {
                return "node" + (d.children ? " node--internal" : " node--leaf");
            })
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            })

        // Clickable dot for every node.
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

        // Label = last segment of the id. Internal nodes are labelled to the
        // left of the dot (right-aligned), leaves to the right.
        // (Both branches of the inner if/else currently return the same text.)
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

        // Thumbnail image (<imgDir><name>.jpg):
        // - leaves: always, except the special "more" node;
        // - internal nodes: only if their name starts with "PPN"
        //   (presumably a library catalogue identifier).
        // Returning null leaves the href unset, so nothing is shown.
        // Leaf images sit 50px to the left of the dot, i.e. over the link.
        node.append("image")
            .attr("xlink:href", function (d) {
                imgName = d.id.substring(d.id.lastIndexOf(".") + 1); // global (no var)
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

        // Very small trees (≤ 3 rows) would be spread over the full svg
        // height; shift them up by 800px so they appear near the top.
        // (Assumes a tall svg; the value is hard-coded.)
        if (data.length <= 3) {
            g.attr("transform", "translate(40,-800)");
        }
    });
}


/**
 * D3 selection extension: brings the *node group* containing each selected
 * element to the front by re-appending it to its parent (SVG has no
 * z-index; later siblings are painted on top).
 *
 * Despite the generic name, it moves `this.parentNode` (the node's <g>),
 * not the element itself, so an enlarged image isn't covered by
 * neighbouring nodes.
 *
 * @returns {d3.selection} The same selection, for chaining.
 */
d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        // path is g.image
        farfarG = this.parentNode.parentNode; // global (no var)
        //g = this.parentNode.appendChild(this);
        farfarG.appendChild(this.parentNode);

    });
};

/**
 * Mouse-over handler for thumbnails: brings the node to the front and,
 * after a 500ms delay, animates the image from {@link stdImageSize} to
 * {@link maxImageSize} over 750ms. Leaf images grow to the left
 * (x = -250) so they stay clear of the label.
 * `this` is the hovered <image> element.
 */
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

/**
 * Mouse-out handler for thumbnails: animates the image back to its resting
 * size and position over 750ms. Starting a new transition also cancels a
 * still-pending enlarge transition.
 * `this` is the <image> element.
 */
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

/**
 * Click handler for node circles and labels; implements drill-down
 * navigation between CSV files.
 *
 * With `cols = d.id.split(".")` and `imgName` = last id segment:
 * - `imgName == "all"`  → reload the overview (`clusters.csv`). Both
 *   branches of the inner if/else do the same thing.
 * - `imgName == "more"` → load `<cols[1]>.csv`. Short targets (< 3 chars)
 *   are logged as internal links, longer ones as "more in cluster".
 * - anything else       → load `<cols[1]>.csv` only if `cols[1]` is shorter
 *   than 3 characters (a cluster number); otherwise the click does nothing.
 *
 * Note: in D3 v4 the DOM event is `d3.event`; this code relies on the
 * browser's legacy global `window.event` instead. `imgName`, `cols` and
 * `jumpTarget` are implicit globals.
 *
 * @param {d3.HierarchyNode} d The clicked node's datum.
 * @param {number} i           Index of the node within its selection (unused).
 */
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

/**
 * Returns to the top-level cluster overview (`clusters.csv`).
 * Triggered by the Left-arrow / Backspace key handler.
 */
function backToOverview() {
    csvDataPath = dataPathPrefix + "clusters.csv"
    renderNetworkGraph(csvDataPath);
}

// Initial render: show the overview on page load.
renderNetworkGraph(csvDataPath);