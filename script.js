// Canvas
const canvas = document.querySelector('canvas.webgl');

// Vertex and fragment shaders for the wireframe
const vertexShader = `
attribute vec3 barycentric;

varying vec3 vBarycentric;
varying vec3 vNormal;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vBarycentric = barycentric;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 lineColor;
uniform float lineThickness;
uniform vec3 faceColor;

varying vec3 vBarycentric;
varying vec3 vNormal;

float edgeFactor() {
    vec3 d = fwidth(vBarycentric);
    vec3 a3 = smoothstep(vec3(0.0), d * lineThickness, vBarycentric);
    return min(min(a3.x, a3.y), a3.z);
}

void main() {
    float edge = edgeFactor();

    // If edge, set to line color; else, set to face color
    if (edge < 0.1) {
        gl_FragColor = vec4(lineColor, 1.0);
    } else {
        gl_FragColor = vec4(faceColor, 1.0);
    }
}
`;

// Create a geometry with barycentric coordinates
function createBarycentricGeometry(geometry) {
    const position = geometry.attributes.position;
    const count = position.count;

    // Ensure the geometry is made of triangles
    if (count % 3 !== 0) {
        console.error('The geometry is not made of triangles.');
        return;
    }

    const barycentric = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 3) {
        barycentric.set([1, 0, 0], i * 3);
        barycentric.set([0, 1, 0], (i + 1) * 3);
        barycentric.set([0, 0, 1], (i + 2) * 3);
    }

    geometry.setAttribute('barycentric', new THREE.BufferAttribute(barycentric, 3));
}

// Function to apply barycentric coordinates to all geometries in a model
function applyBarycentricCoordinatesToModel(model) {
    model.traverse((node) => {
        if (node.isMesh && node.geometry) {
            // Ensure geometry is non-indexed and composed of triangles
            let geometry = node.geometry;
            if (geometry.index !== null) {
                geometry = geometry.toNonIndexed();
            }

            // Convert geometry to triangles if necessary
            if (geometry.attributes.position.count % 3 !== 0) {
                geometry = THREE.BufferGeometryUtils.toTrianglesDrawMode(geometry, THREE.TrianglesDrawMode);
            }

            createBarycentricGeometry(geometry);
            node.geometry = geometry;
        }
    });
}

const scene = new THREE.Scene();

const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
}

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 5;
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = true;

const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        lineColor: { value: new THREE.Color(0xffbbff) },
        lineThickness: { value: 2.5 },
        faceColor: { value: new THREE.Color(0xff0000) }
    }
});

// Create a cube geometry
const geometry = new THREE.BoxGeometry(1, 1, 1);
createBarycentricGeometry(geometry);

// Create a mesh with the cube geometry and shader material
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0.7, 0.0, 0.0);
scene.add(mesh);



// Load the GLTF model
const loader = new THREE.GLTFLoader();
loader.load('./static/frame/White Pawn.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(0.5, -0.5, 0.0);
    applyBarycentricCoordinatesToModel(model);
    model.traverse((node) => {
        if (node.isMesh) {
            node.material = material;
        }
    });
    scene.add(model);
}, undefined, function (error) {
    console.error(error);
});

// Handle window resize
window.addEventListener('resize', () => {
    sizes.width = canvas.clientWidth;
    sizes.height = canvas.clientHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    renderer.render(scene, camera);
}

animate();
