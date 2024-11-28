"use strict";

const { vec3, vec4 } = glMatrix;

var canvas;
var gl;
var program;

var points = [];
var normals = [];

var numVertices = 36;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var theta = [0, 0, 0];
var flag = [true, true, true];

var thetaLoc;
var cameraPositionLoc;

// 相机位置
var cameraPosition = vec3.fromValues(0, 0, 2.5);

// 天空盒纹理
var skyboxTexture;

// 添加自动旋转控制
var autoRotate = true;
var rotationSpeed = 2.0;

function initCubeMap() {
    skyboxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

    // 创建粉色和蓝色的渐变数据
    const pinkColor = [255, 105, 180, 255];  // 粉色
    const blueColor = [0, 128, 255, 255];    // 蓝色
    
    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            color: pinkColor,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            color: blueColor,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            color: pinkColor,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            color: blueColor,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            color: pinkColor,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            color: blueColor,
        },
    ];

    faceInfos.forEach((faceInfo) => {
        const {target, color} = faceInfo;
        
        // 设置每个面的颜色
        gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                     new Uint8Array(color));

        // 如果有外部纹理图片，可以在这里加载
        if (faceInfo.url) {
            const image = new Image();
            image.src = faceInfo.url;
            image.onload = function() {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            };
        }
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
}

function generateSphere(radius, latitudeBands, longitudeBands) {
    var positions = [];
    var normals = [];
    var indices = [];
    
    // 生成顶点和法线
    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            // 计算顶点位置
            var x = radius * cosPhi * sinTheta;
            var y = radius * cosTheta;
            var z = radius * sinPhi * sinTheta;

            // 顶点位置
            positions.push(x);
            positions.push(y);
            positions.push(z);

            // 法线方向（归一化的顶点位置）
            var nx = x / radius;
            var ny = y / radius;
            var nz = z / radius;
            normals.push(nx);
            normals.push(ny);
            normals.push(nz);
        }
    }

    // 生成索引
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;

            indices.push(first);
            indices.push(first + 1);
            indices.push(second);

            indices.push(second);
            indices.push(first + 1);
            indices.push(second + 1);
        }
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        vertexBuffer,
        normalBuffer,
        indexBuffer,
        numIndices: indices.length
    };
}

// 修改相机位置设置，创建正四面体视角
function setupTetrahedronCamera() {
    const tetrahedronPoints = [
        vec3.fromValues(0.8, 0.8, 0.8),    // 缩小正四面体顶点坐标
        vec3.fromValues(-0.8, -0.8, 0.8),   
        vec3.fromValues(-0.8, 0.8, -0.8),   
        vec3.fromValues(0.8, -0.8, -0.8)    
    ];
    
    let currentPoint = 0;
    return function updateCamera() {
        currentPoint = (currentPoint + 1) % 4;
        const point = tetrahedronPoints[currentPoint];
        vec3.scale(cameraPosition, point, 2.5); // 调整相机距离
    };
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert("WebGL 2.0 isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 生成更细致的球体
    const buffers = generateSphere(0.85, 120, 120); // 稍微调整半径和增加细分度

    // 保存buffers为全局变量以供render函数使用
    window.buffers = buffers;

    // 设置顶点属性
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // 获取uniform变量位置
    thetaLoc = gl.getUniformLocation(program, "theta");
    if (!thetaLoc) {
        console.error("无法获取theta的uniform位置");
    }
    
    cameraPositionLoc = gl.getUniformLocation(program, "cameraPosition");
    if (!cameraPositionLoc) {
        console.error("无法获取cameraPosition的uniform位置");
    }

    // 初始化天空盒纹理
    initCubeMap();

    // 设置正四面体相机
    const updateCamera = setupTetrahedronCamera();

    // 初始化旋转角度
    gl.uniform3fv(thetaLoc, new Float32Array(theta));
    gl.uniform3fv(cameraPositionLoc, cameraPosition);

    // 设置天空盒纹理
    const skyboxLoc = gl.getUniformLocation(program, "u_skybox");
    gl.uniform1i(skyboxLoc, 0); // 使用纹理单元0

    // 修改按钮功能
    document.getElementById("ButtonX").onclick = function() {
        flag[0] = !flag[0]; // 切换X轴旋转
        console.log("Toggle X rotation:", flag[0]);
    };
    document.getElementById("ButtonY").onclick = function() {
        flag[1] = !flag[1]; // 切换Y轴旋转
        console.log("Toggle Y rotation:", flag[1]);
    };
    document.getElementById("ButtonZ").onclick = function() {
        flag[2] = !flag[2]; // 切换Z轴旋转
        console.log("Toggle Z rotation:", flag[2]);
    };

    render();
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 更新旋转角度，调整不同轴的旋转速度和方向
    if(flag[0]) theta[0] += rotationSpeed * 0.8;     // X轴慢速正向旋转
    if(flag[1]) theta[1] -= rotationSpeed * 1.2;     // Y轴较快反向旋转
    if(flag[2]) theta[2] += rotationSpeed * 1.5;     // Z轴最快正向旋转

    // 确保角度在0-360度范围内
    theta[0] = theta[0] % 360;
    theta[1] = theta[1] % 360;
    theta[2] = theta[2] % 360;

    // 更新uniform变量
    gl.uniform3fv(thetaLoc, new Float32Array(theta));
    gl.uniform3fv(cameraPositionLoc, cameraPosition);

    // 绑定天空盒纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

    // 绘制球体
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.buffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, window.buffers.numIndices, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}