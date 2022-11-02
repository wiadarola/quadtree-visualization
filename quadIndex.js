let camera, scene, renderer;
let width, height, worker;

init();
animate();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.OrthographicCamera(
        -180, // X-
        180, // X+
        90, // Y+
        -90, // Y-
        -1, // Scene Z
        1  // Camera Z
    );
    scene.add(camera);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const planes = [];
    worker = new Worker("./scripts/worker.js");
    worker.onmessage = function (event) {
        if (event.data.type === 0) {
            planes.forEach(plane => {
                scene.remove(plane);
                plane.material.dispose();
                plane.geometry.dispose();
            });

            const fullQuads = new Set();
            const drawnPlanes = new Set();

            for (let i = 0; i < event.data.paths.length; i++) {
                let x = 180;
                let y = 90;
                let fullPath = event.data.paths[i];
                let currentPath = [];
                let drawBorder = true;

                for (let height = 1; height <= fullPath.length; height++) {
                    const quadrant = fullPath[height - 1];
                    const lastPath = [...currentPath];
                    currentPath.push(quadrant);

                    // If what im looking to draw exists already, set the flag to not draw
                    let planeExists = false;
                    for (let plane of drawnPlanes.keys()) {
                        if (plane.toString() == lastPath.toString()) {
                            planeExists = true;
                            break
                        }
                    }

                    // If where im looking to maybe draw has a leaf, set the flag to draw it
                    let drawQuads = false;
                    for (let path of fullQuads.keys()) {
                        if (path.toString() == lastPath.toString()) {
                            drawQuads = true;
                            break;
                        }
                    }

                    const oldX = x;
                    const oldY = y;

                    // Draw the quadrants if the flags pass
                    if ((!planeExists && drawQuads) || (currentPath.length < fullPath.length && height !== 1)) {
                        // Draw the planes
                        for (let quadIndex = 1; quadIndex <= 4; quadIndex++) {
                            // Set X & Y back to center
                            x = oldX;
                            y = oldY;

                            // ...?
                            const xMax = x + 360 / Math.pow(2, height - 1);
                            const yMax = y + 180 / Math.pow(2, height - 1);
                            if (quadIndex === 1) {
                                x += (xMax - x) / 2;
                                y += (yMax - y) / 2;
                            } else if (quadIndex === 2) {
                                x -= (xMax - x) / 2;
                                y += (yMax - y) / 2;
                            } else if (quadIndex === 3) {
                                x -= (xMax - x) / 2;
                                y -= (yMax - y) / 2;
                            } else if (quadIndex === 4) {
                                x += (xMax - x) / 2;
                                y -= (yMax - y) / 2;
                            }

                            // ...?
                            const boundDivisor = Math.pow(2, height - 1);
                            const geometry = new THREE.PlaneGeometry(360 / boundDivisor, 180 / boundDivisor);
                            const edges = new THREE.EdgesGeometry(geometry);
                            const plane = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
                            plane.position.x = x - 180;
                            plane.position.y = y - 90;
                            scene.add(plane);

                            // Add the path to drawn & push the plane to planes
                            planes.push(plane);
                            drawnPlanes.add(currentPath.slice(0, currentPath.length - 1));
                        }
                    } else if (height === 1 && drawBorder) {
                        const geometry = new THREE.PlaneGeometry(360, 180);
                        const edges = new THREE.EdgesGeometry(geometry);
                        const plane = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
                        plane.position.x = 0;
                        plane.position.y = 0;
                        scene.add(plane);
                        drawBorder = false;
                    }
                    if (!drawQuads && height !== 1) {
                        fullQuads.add(currentPath.slice(0, currentPath.length - 1));
                    }
                    if (height !== 1) {
                        x = oldX;
                        y = oldY;

                        const xMax = x + 360 / Math.pow(2, height - 1);
                        const yMax = y + 180 / Math.pow(2, height - 1);

                        if (quadrant === 1) {
                            x += (xMax - x) / 2;
                            y += (yMax - y) / 2;
                        } else if (quadrant === 2) {
                            x -= (xMax - x) / 2;
                            y += (yMax - y) / 2;
                        } else if (quadrant === 3) {
                            x -= (xMax - x) / 2;
                            y -= (yMax - y) / 2;
                        } else if (quadrant === 4) {
                            x += (xMax - x) / 2;
                            y -= (yMax - y) / 2;
                        }
                    }
                }
            }
            drawBorder = true;
        }
    }
}


function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
document.addEventListener("click", event => {
    mouse.x = event.clientX / window.innerWidth * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const position = [mouse.x * 180, mouse.y * 90, 0];

    if (event.shiftKey === true) {
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length) {
            const obj = intersects[0].object;
            obj.visible = !obj.visible;
            worker.postMessage({
                type: 1,
                item: {
                    lat: obj.geometry.attributes.position.array[1],
                    lon: obj.geometry.attributes.position.array[0],
                    uuid: obj.uuid,
                    visible: obj.visible
                }
            });
        }
    } else if (event.altKey === true) {
        worker.postMessage({ type: 3, height: 3 })
        // const intersects = raycaster.intersectObjects(scene.children);
        // if (intersects.length) {
        //     const obj = intersects[0].object;
        //     obj.visible = !obj.visible;
        //     worker.postMessage({
        //         type: 2,
        //         item: {
        //             lat: obj.geometry.attributes.position.array[1],
        //             lon: obj.geometry.attributes.position.array[0],
        //             uuid: obj.uuid,
        //             visible: obj.visible
        //         }
        //     });
        // }
    } else if (event.ctrlKey === true) {
        worker.postMessage({ type: 4 })
    } else {
        const dotGeometry = new THREE.BufferGeometry()
            .setAttribute(
                'position',
                new THREE.BufferAttribute(new Float32Array(position), 3)
            );

        const dot = new THREE.Points(
            dotGeometry,
            new THREE.PointsMaterial({ color: 0xFF0000, size: 5, sizeAttenuation: true })
        );

        worker.postMessage({
            type: 0,
            item: {
                lat: position[1],
                lon: position[0],
                uuid: dot.uuid,
                visible: true
            }
        });
        scene.add(dot);
    }
});