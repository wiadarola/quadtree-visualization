importScripts('quadtree.js');

let tree = new QuadTree(-90, 90, -180, 180);

onmessage = function (event) {
    if (event.data.type === 0) tree.insert(event.data.item);
    else if (event.data.type === 1) tree.setVisibility(event.data.item);
    else if (event.data.type === 2) tree.remove(event.data.item);
    else if (event.data.type === 3) this.postMessage({type: 0, paths: tree.getPaths()});
}
