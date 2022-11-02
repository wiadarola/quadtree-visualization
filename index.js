let camera, scene, renderer;
let width, height, worker;
const points = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-180, 180, 90, -90, -1, 1);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    worker = new Worker('./scripts/worker.js');
    worker.onmessage = function (event) { console.log("Message recieved") };
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

    if (event.shiftKey) {  // Create supercluster
        worker.postMessage({ type: 0, points: points });
    } else if (event.altKey) {
        worker.postMessage({})
    } else {  // Add new point
        const position = [mouse.x * 180, mouse.y * 90, 0];
        const pointGeometry = new THREE.BufferGeometry()
            .setAttribute('position', new THREE.BufferAttribute(new Float32Array(position), 3));
        const point = new THREE.Points(
            pointGeometry,
            new THREE.PointsMaterial({ color: 0xFF0000, size: 5, sizeAttenuation: true })
        );
        scene.add(point);
        points.push(position);
    }
});