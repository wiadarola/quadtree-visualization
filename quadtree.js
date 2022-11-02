/**
 * @author <wiadarola@exoanalytic.com>
 */
class QuadTree {
    #size;
    #height;

    #quadrants;
    #leaf;

    #latMin;
    #latMax;
    #lonMin;
    #lonMax;

    /**
     *
     * @param {Number} latMin Minimum latitude of bounding box
     * @param {Number} latMax Maximum latitude of bounding box
     * @param {Number} lonMin Minimum longitude of bounding box
     * @param {Number} lonMax Maximum longitude of bounding box
     */
    constructor(latMin = -90, latMax = 90, lonMin = -180, lonMax = 180) {
        /* General Properties */
        this.#size = 0;
        this.#height = 0;

        /* Node Properties*/
        this.#quadrants = [];
        this.#leaf = new Set();

        /* Bound Properties*/
        this.#latMin = latMin;
        this.#latMax = latMax;
        this.#lonMin = lonMin;
        this.#lonMax = lonMax;
    }

    /**
     * @return {Number} The calculated height of the tree.
     */
    get height() {
        return this.#height;
    }

    /**
     * @return {Number} The number of points stored in the tree.
     */
    get size() {
        return this.#size;
    }

    /**
     * @return {Object} An object containing the minimum and maximum latitude and longitude of this tree's bound.
     */
    get bound() {
        return [
            [this.#lonMin, this.#latMax],
            [this.#lonMax, this.#latMax],
            [this.#lonMax, this.#latMin],
            [this.#lonMin, this.#latMin],
            [this.#lonMin, this.#latMax]
        ]
    }

    /**
     * Tests if an item can exist within this tree's bounds.
     *
     * @param {Object} item The item to be tested.
     * @returns {Boolean} True if test succeeded, false otherwise.
     */
    #inBounds(lat, lon) {
        return (
            lat >= this.#latMin &&
            lat <= this.#latMax &&
            lon >= this.#lonMin &&
            lon <= this.#lonMax
        )
    }

    /**
     * Inserts an item into the tree.
     *
     * @param {Object} item An object to be inserted into the tree that must contain at least the listed fields.
     * @param {Number} item.lat
     * @param {Number} item.lon
     * @param {String} item.uuid
     *
     * @return {Object} return[b] is the success flag, & return[h] is the height of the tree.
     */
    insert(item) {
        if (this.#inBounds(item.lat, item.lon)) {
            this.#size += 1;
            let equalPos = false;
            if (this.#leaf.size) {
                // Leaf is filled -> Test if item has equal position:
                const [first] = this.#leaf;
                equalPos = (first.lat === item.lat && first.lon === item.lon);
            }
            if (equalPos || this.size === 1) {
                // Leaf & item have same positions OR tree is empty -> Insert item:
                this.#leaf.add(item);
                this.#height = 1;
                return { b: true, h: this.#height };
            } else {
                // Conflicting leaf exists:
                if (this.#quadrants.length === 0) {
                    // No branch -> branch & insert leaf into quadrants:
                    this.#branch();
                    this.#leaf.forEach(leaf => {
                        this.#quadrants.forEach(quad => {
                            const res = quad.insert(leaf);
                            if (res.h >= this.#height) this.#height = res.h + 1;
                        });
                    });
                    this.#leaf.clear();
                }
                // Insert item into quadrants:
                let success = false;
                this.#quadrants.forEach(quad => {
                    const res = quad.insert(item);
                    if (res.h >= this.#height) this.#height = res.h + 1;
                    if (res.b) success = true;
                });
                return ({ b: success, h: this.#height });
            }
        } else {
            // Item doesn't fit inside bounds:
            return { b: false, h: this.#height };
        }
    }

    /**
     * Creates four QuadTree quadrants that divide this tree's
     * bounding box equally.
     */
    #branch() {
        this.#quadrants.push(new QuadTree(
            (this.#latMin + this.#latMax) / 2,
            this.#latMax,
            (this.#lonMin + this.#lonMax) / 2,
            this.#lonMax
        ));  // I
        this.#quadrants.push(new QuadTree(
            (this.#latMin + this.#latMax) / 2,
            this.#latMax,
            this.#lonMin,
            (this.#lonMin + this.#lonMax) / 2
        ));  // II
        this.#quadrants.push(new QuadTree(
            this.#latMin,
            (this.#latMin + this.#latMax) / 2,
            this.#lonMin,
            (this.#lonMin + this.#lonMax) / 2
        ));  // III
        this.#quadrants.push(new QuadTree(
            this.#latMin,
            (this.#latMin + this.#latMax) / 2,
            (this.#lonMin + this.#lonMax) / 2,
            this.#lonMax
        ));  // IV
    }

    /**
     *
     * @param {*} uuid
     * @param {*} hint
     * @param {*} _root
     * @returns
     */
    searchUUID(uuid, hint = null, _root = this) {
        const valid = false;
        if (hint !== null) {
            valid = this.#inBounds(hint.lat, hint.lon)
        }
        if (valid || hint === null) {
            if (this.#quadrants.length === 0) {
                for (let leaf of this.#leaf) {
                    if (leaf.uuid === uuid) {
                        return leaf;
                    }
                }
            } else {
                for (let quad of this.#quadrants) {
                    const res = quad.searchUUID(uuid, hint, _root);
                    if (res !== null) return res
                }
                if (this === _root && hint !== null) {
                    for (let quad of this.#quadrants) {
                        const res = quad.searchUUID(uuid, null, _root);
                        if (res !== null) return res
                    }
                }
            }
        }
        return null;
    }

    getPaths(paths = [], queue = [0]) {
        if (this.#quadrants.length === 0) {
            if (this.#leaf.size > 0) paths.push(queue);
        } else {
            for (let i = 0; i < 4; i++) {
                this.#quadrants[i].getPaths(paths, [...queue, i + 1]);
            }
        }
        return paths
    }

    /**
     * Removes a leaf from the tree.
     * @param {Object} item An object to be removed from the tree that must contain at least the listed fields.
     * @param {Number} item.lat
     * @param {Number} item.lon
     * @param {String} item.uuid
     * @return {Boolean} True if removal succeeded, false otherwise.
     */
    remove(item) {
        if (this.#inBounds(item.lat, item.lon)) {
            if (this.#quadrants.length === 0) {
                for (let leaf of this.#leaf) {
                    if (leaf.uuid === item.uuid) {
                        this.#size -= 1;
                        this.#leaf.delete(leaf);
                        if (this.#leaf.size === 0) this.#height -= 1;
                        return {
                            found: true,
                            hasLeaf: this.size > 0,
                            leaf: this.#leaf
                        };
                    }
                }
            } else {
                let leafCount = 0;
                const bools = [];
                let leaf = null;
                this.#quadrants.forEach(quad => {
                    const res = quad.remove(item);
                    bools.push(res.found);
                    leafCount += res.hasLeaf;
                    if (res.leaf.size) leaf = res.leaf;
                });
                for (let b of bools) {
                    if (b) {
                        this.#size -= 1;
                        if (leafCount === 1) {
                            this.#quadrants = [];
                            this.#leaf = leaf;
                            this.#height -= 1;
                        }
                        return {
                            found: true,
                            hasLeaf: this.size > 0,
                            leaf: this.#leaf
                        };
                    }
                }
            }
        }
        return {
            found: false,
            hasLeaf: this.size > 0,
            leaf: this.#leaf
        }
    }

    /**
     * 
     * @param {*} height 
     * @returns 
     */
    clusterAll(height) {
        return this.searchArea([[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]], true, height);
    }

    /**
     * Searches for items that have latlon coords within the 
     * passed polygon.
     * @param {Array<Number>} poly Polygon to search within.
     * @param {Boolean} cluster Flag for clustering.
     * @param {Number} height Tree height to find clusters.
     * @returns An array of sets of UUIDs representing clusters if cluster is true, 
     *          or an array of UUIDs that lay within the polygon.
     */
    searchArea(poly, cluster, height, found = new Set()) {
        const groups = [];
        if (this.#quadrants.length === 0) {
            // If at a leaf node:
            if (cluster) {
                // If clustering:
                if (height < 0 || this.#leaf.size > 1) {
                    /* 
                        * If the height is less than 0 and the leaf has 
                        * multiple items stored in it -> Add the UUID to the
                        * UUIDS set. 
                        * 
                        * The height must be less than 0 if this.leaf doesn't
                        * contain multiple values because a single leaf at level
                        * 0 is not and will not be a cluster.
                    */
                    const UUIDS = new Set();
                    this.#leaf.forEach(item => {
                        // Test each item to determine if it lays within the polygon:
                        if (this.pointInPolygon(poly, [item.lon, item.lat])) {
                            if(!found.has(item.uuid)) {
                                UUIDS.add(item.uuid);
                                found.add(item.uuid);
                            }
                        }
                    });
                    groups.push(UUIDS);
                }
            } else {
                // If not clustering -> add the items in the leaf to groups
                this.#leaf.forEach(item => {
                    if(!found.has(item.uuid)) {
                        groups.push(item.uuid);
                        found.add(item.uuid);
                    }
                });
            }
        } else {
            // If this tree has branched:
            const boundGroup = new Set();
            this.#quadrants.forEach(quad => {
                let pip = false; // 'point in polygon'
                // Test each point of the bound ...?
                for (let point of this.bound) {
                    if (quad.pointInPolygon(poly, point)) pip = true;
                }
                if (pip) {
                    const res = quad.searchArea(poly, cluster, height - 1, found);
                    if (cluster) {
                        if (res.length !== 0) {
                            if (height > 0) {
                                res.forEach(group => {
                                    if (group.size > 1) groups.push(group)
                                }); 
                            } else {
                                res[0].forEach(UUID => boundGroup.add(UUID));
                            }
                        }
                    } else {
                        res.forEach(UUID => groups.push(UUID));
                    }
                }
            });
            if (((height === 0 && boundGroup.size > 1) || height < 0) && cluster) {
                groups.push(boundGroup);
            }
        }
        return groups;
    }

    /**
     * Performs the even-odd-rule Algorithm (a raycasting algorithm) to find out whether a point is in a given polygon.
     * This runs in O(n) where n is the number of edges of the polygon.
     *
     * @param {Array} polygon an array representation of the polygon where polygon[i][0] is the x Value of the i-th point and polygon[i][1] is the y Value.
     * @param {Array} point   an array representation of the point where point[0] is its x Value and point[1] is its y Value
     * @return {boolean} whether the point is in the polygon (not on the edge, just turn < into <= and > into >= for that)
     */
    pointInPolygon = function (polygon, point) {
        //A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
        let odd = false;
        //For each edge (In this case for each point of the polygon and the previous one)
        for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
            //If a line from the point into infinity crosses this edge
            if (((polygon[i][1] > point[1]) !== (polygon[j][1] > point[1])) // One point needs to be above, one below our y coordinate
                // ...and the edge doesn't cross our Y corrdinate before our x coordinate (but between our x coordinate and infinity)
                && (point[0] < ((polygon[j][0] - polygon[i][0]) * (point[1] - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]))) {
                // Invert odd
                odd = !odd;
            }
            j = i;

        }
        //If the number of crossings was odd, the point is in the polygon
        return odd;
    }
} // END Quadtree