// ==========================================
// FILE: src/scripts/scene.js
// PURPOSE: 3D Background using Three.js
// ==========================================

function initScene() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    camera.position.y = 10;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Grid Helper (Cyberpunk Floor)
    const gridHelper = new THREE.GridHelper(200, 50, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        // Spread particles
        posArray[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x22d3ee, // Cyan-400
        transparent: true,
        opacity: 0.8,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Floating Cubes (Tech debris)
    const cubes = [];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true });

    for (let i = 0; i < 20; i++) {
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = (Math.random() - 0.5) * 80;
        cube.position.y = (Math.random() - 0.5) * 40;
        cube.position.z = (Math.random() - 0.5) * 60;
        cube.rotation.x = Math.random() * Math.PI;
        cube.rotation.y = Math.random() * Math.PI;
        
        // Random speed
        cube.userData = {
            rotSpeed: (Math.random() * 0.02) + 0.005,
            floatSpeed: (Math.random() * 0.05) + 0.01,
            floatOffset: Math.random() * Math.PI * 2
        };

        scene.add(cube);
        cubes.push(cube);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1);
    pointLight.position.set(20, 20, 20);
    scene.add(pointLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        targetX = mouseX * 0.001;
        targetY = mouseY * 0.001;

        // Smooth camera movement
        particlesMesh.rotation.y += 0.001;
        particlesMesh.rotation.x += 0.0005;

        // Move grid slightly
        gridHelper.position.z = (elapsedTime * 2) % 4;

        // Animate cubes
        cubes.forEach((cube, i) => {
            cube.rotation.x += cube.userData.rotSpeed;
            cube.rotation.y += cube.userData.rotSpeed;
            cube.position.y += Math.sin(elapsedTime + cube.userData.floatOffset) * 0.02;
        });

        // Interactive Camera
        camera.rotation.y += 0.05 * (targetX - camera.rotation.y);
        camera.rotation.x += 0.05 * (targetY - camera.rotation.x);

        renderer.render(scene, camera);
    }

    animate();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
} else {
    initScene();
}
