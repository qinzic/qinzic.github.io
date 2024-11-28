import * as THREE from 'three';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const initializeScene = ({ root, antialias = true } = {}) => {
    // 创建场景
    const scene = new THREE.Scene();

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    );
    camera.position.z = 110;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    root.appendChild(renderer.domElement);

    // 窗口大小调整处理
    const onWindowResize = () => {
        // 调整相机和渲染器的尺寸
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        controls.update();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
    };
    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);

    // 创建GUI控制面板
    const gui = new GUI({ container: root });

    // 创建性能监视器
    const stats = new Stats();
    stats.showPanel(0);
    root.appendChild(stats.domElement);

    return {
        scene,
        renderer,
        camera,
        controls,
        gui,
        stats,
    };
}

// 获取随机极坐标
const getRandomPolarCoordinate = (radius) => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 2;
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(theta);
    return { x, y, z };
}

const init = (root) => {
    // 定义参数
    const params = {
        // 星系参数
        particleCount: 250000,    // 粒子数量
        particleSize: 0.02,       // 粒子大小
        branches: 6,              // 分支数量
        branchRadius: 5,          // 分支半径
        spin: 0.2,               // 旋转程度
        radialRandomness: 0.5,    // 径向随机度
        innerColor: '#ff812e',    // 内部颜色
        outerColor: '#a668ff',    // 外部颜色
        
        // 颜色方案
        colorSchemes: {
            default: { inner: '#ff812e', outer: '#a668ff' },  // 默认配色
            fire: { inner: '#ff4400', outer: '#ff8800' },     // 火焰配色
            ice: { inner: '#00ffff', outer: '#0044ff' },      // 冰霜配色
            nature: { inner: '#00ff44', outer: '#88ff00' },   // 自然配色
            cosmic: { inner: '#ff00ff', outer: '#0000ff' }    // 宇宙配色
        },
        selectedScheme: 'default',    // 当前选择的配色方案
        colorIntensity: 1.0,          // 颜色强度
        colorSaturation: 1.0,         // 颜色饱和度
        glowIntensity: 1.0,           // 发光强度
        colorBlend: 0.5               // 颜色混合
    };

    // 初始化场景
    const { scene, renderer, camera, gui, stats, controls } = initializeScene({
        root,
    });

    camera.position.set(7, 4, 7);
    controls.update();

    // 定义全局变量
    let spinDirection = 1;
    let material = null;
    let geometry = null;
    let points = null;

    // 加载粒子纹理
    const particleTexture = new THREE.TextureLoader().load('https://file.threehub.cn/threeExamples/shader/star.png');

    // 生成星系
    const generateGalaxy = () => {
        // 移除旧的粒子系统
        if (points) {
            geometry.dispose();
            material.dispose();
            scene.remove(points);
        }

        // 创建新的粒子系统
        const positions = new Float32Array(params.particleCount * 3);
        const colors = new Float32Array(params.particleCount * 3);
        const innerColor = new THREE.Color(params.innerColor);
        const outerColor = new THREE.Color(params.outerColor);
        
        // 生成粒子位置和颜色
        for (let i = 0; i < params.particleCount; i++) {
            const i3 = i * 3;

            // 计算位置
            const radius = params.branchRadius * Math.random();
            const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;
            const spinAngle = params.spin * radius * Math.PI * 2;

            // 添加随机偏移
            const randRadius = Math.random() * params.radialRandomness * radius;
            const { x: randX, y: randY, z: randZ } = getRandomPolarCoordinate(randRadius);

            // 设置位置
            positions[i3] = radius * Math.cos(branchAngle + spinAngle) + randX;
            positions[i3 + 1] = randY;
            positions[i3 + 2] = radius * Math.sin(branchAngle + spinAngle) + randZ;

            // 设置颜色
            const mixedColor = innerColor.clone().lerp(outerColor, radius / params.branchRadius);
            colors[i3] = mixedColor.r;
            colors[i3 + 1] = mixedColor.g;
            colors[i3 + 2] = mixedColor.b;
        }

        // 获取当前配色方案
        const scheme = params.colorSchemes[params.selectedScheme];
        innerColor.copy(scheme.inner);
        outerColor.copy(scheme.outer);

        // 应用颜色调整
        innerColor.multiplyScalar(params.colorIntensity);
        outerColor.multiplyScalar(params.colorIntensity);

        // 调整饱和度
        const adjustSaturation = (color, saturation) => {
            const hsl = {};
            color.getHSL(hsl);
            color.setHSL(hsl.h, hsl.s * saturation, hsl.l);
        };

        adjustSaturation(innerColor, params.colorSaturation);
        adjustSaturation(outerColor, params.colorSaturation);

        // 创建材质
        material = new THREE.PointsMaterial({
            size: params.particleSize,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            transparent: true,
            alphaMap: particleTexture,
            opacity: params.glowIntensity
        });
        
        // 创建几何体
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // 创建点云系统
        points = new THREE.Points(geometry, material);
        scene.add(points);

        // 设置旋转方向
        spinDirection = params.spin > 0 ? 1 : -1;
    };

    generateGalaxy();

    // 创建GUI控制面板
    gui.width = 360;

    // 添加基本控制项
    gui.add(params, 'particleCount', 5000, 500000, 100).onFinishChange(generateGalaxy);
    gui.add(params, 'particleSize', 0.005, 0.15).onFinishChange(generateGalaxy);
    gui.add(params, 'branches', 2, 15, 1).onFinishChange(generateGalaxy);
    gui.add(params, 'branchRadius', 1, 10).onFinishChange(generateGalaxy);
    gui.add(params, 'spin', -1, 1).onFinishChange(generateGalaxy);
    gui.add(params, 'radialRandomness', 0, 1).onFinishChange(generateGalaxy);
    gui.addColor(params, 'innerColor').onFinishChange(generateGalaxy);
    gui.addColor(params, 'outerColor').onFinishChange(generateGalaxy);

    // 创建颜色控制面板
    const colorFolder = gui.addFolder('颜色控制');
    
    // 添加配色方案选择
    colorFolder.add(params, 'selectedScheme', 
        Object.keys(params.colorSchemes)
    ).name('配色方案').onChange(generateGalaxy);

    // 添加颜色相关控制
    colorFolder.add(params, 'colorIntensity', 0.1, 2.0)
        .name('颜色强度')
        .onChange(generateGalaxy);

    colorFolder.add(params, 'colorSaturation', 0.0, 2.0)
        .name('饱和度')
        .onChange(generateGalaxy);

    colorFolder.add(params, 'glowIntensity', 0.1, 1.0)
        .name('发光强度')
        .onChange(generateGalaxy);

    colorFolder.add(params, 'colorBlend', 0, 1)
        .name('颜色混合')
        .onChange(generateGalaxy);

    // 为每个配色方案添加颜色选择器
    Object.keys(params.colorSchemes).forEach(scheme => {
        const schemeFolder = colorFolder.addFolder(`${scheme}配色`);
        schemeFolder.addColor(params.colorSchemes[scheme], 'inner')
            .name('内部颜色')
            .onChange(generateGalaxy);
        schemeFolder.addColor(params.colorSchemes[scheme], 'outer')
            .name('外部颜色')
            .onChange(generateGalaxy);
    });

    // 动画循环
    const tick = () => {
        requestAnimationFrame(tick);
        stats.begin();

        controls.update();

        // 更新颜色动画效果
        if (material) {
            const time = performance.now() * 0.001;
            const pulseIntensity = Math.sin(time) * 0.1 + 1;
            material.opacity = params.glowIntensity * pulseIntensity;
        }

        // 更新旋转
        geometry.rotateY(0.001 * spinDirection);

        stats.end();
        renderer.render(scene, camera);
    };

    tick();
};

// 启动程序
window.onload = () => {
    init(document.getElementById('box'));
}; 