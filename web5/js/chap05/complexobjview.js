"use strict";

const { vec3, vec4, mat3, mat4 } = glMatrix;

var canvas;
var gl;

var points = [];
var colors = [];
var normals = [];
var texCoords = [];

// Shader variables
var program;
var vBuffer, cBuffer, nBuffer, tBuffer;
var vPosition, vColor, vNormal, vTexCoord;

// Transformation matrices
var modelViewMatrix = mat4.create();
var projectionMatrix = mat4.create();

// Camera parameters
var eye = vec3.fromValues(0.0, 0.0, 5.0);
var at = vec3.fromValues(0.0, 0.0, 0.0);
var up = vec3.fromValues(0.0, 1.0, 0.0);

// Model parameters
var modelRotation = vec3.create();
var modelPosition = vec3.create();
var modelScale = vec3.fromValues(1, 1, 1);

// Drawing mode
var wireframe = true;
var currentColor = [0.3, 0.3, 0.3, 1.0];

// Projection parameters
var useOrtho = true;
var near = 0.1;
var far = 100.0;
var fovy = 45.0;
var aspect;

function initWindow() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders and buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    initBuffers();
    initEventListeners();

    // Start rendering
    render();
}

function initBuffers() {
    // Create and bind vertex buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and bind color buffer
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function initEventListeners() {
    // File input handler
    document.getElementById("fileInput").addEventListener("change", handleFileSelect);

    // Projection type handler
    document.getElementById("ortho").addEventListener("change", () => { useOrtho = true; });
    document.getElementById("persp").addEventListener("change", () => { useOrtho = false; });

    // Drawing mode handler
    document.getElementById("wire").addEventListener("change", () => { wireframe = true; });
    document.getElementById("solid").addEventListener("change", () => { wireframe = false; });

    // Color picker handler
    document.getElementById("objcolor").addEventListener("input", (e) => {
        let hex = e.target.value;
        currentColor = [
            parseInt(hex.slice(1,3), 16) / 255,
            parseInt(hex.slice(3,5), 16) / 255,
            parseInt(hex.slice(5,7), 16) / 255,
            1.0
        ];
    });

    // Transform controls
    setupTransformControls();
    setupMouseControls();
    setupKeyboardControls();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const objData = e.target.result;
        loadOBJFromString(objData);
    };
    reader.readAsText(file);
}

function loadOBJFromString(objStr) {
    // Clear existing data
    points = [];
    colors = [];
    normals = [];
    texCoords = [];

    // Parse OBJ file and populate arrays
    // ... (OBJ parsing implementation)

    // Update buffers
    updateBuffers();
}

function updateBuffers() {
    // Update vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // Update color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update view matrix
    mat4.lookAt(modelViewMatrix, eye, at, up);

    // Update projection matrix
    aspect = canvas.width / canvas.height;
    if (useOrtho) {
        mat4.ortho(projectionMatrix, -2*aspect, 2*aspect, -2, 2, near, far);
    } else {
        mat4.perspective(projectionMatrix, fovy, aspect, near, far);
    }

    // Apply model transformations
    mat4.translate(modelViewMatrix, modelViewMatrix, modelPosition);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, modelRotation[0]);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, modelRotation[1]);
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, modelRotation[2]);
    mat4.scale(modelViewMatrix, modelViewMatrix, modelScale);

    // Set uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, modelViewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, projectionMatrix);

    // Draw
    if (wireframe) {
        gl.drawArrays(gl.LINES, 0, points.length / 4);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, points.length / 4);
    }

    requestAnimationFrame(render);
}

// Helper functions for controls
function setupTransformControls() {
    // Position controls
    ["xpos", "ypos", "zpos"].forEach((id, i) => {
        document.getElementById(id).addEventListener("input", (e) => {
            if (document.getElementById("obj").checked) {
                modelPosition[i] = parseFloat(e.target.value);
            } else {
                eye[i] = parseFloat(e.target.value);
            }
        });
    });

    // Rotation controls
    ["xrot", "yrot", "zrot"].forEach((id, i) => {
        document.getElementById(id).addEventListener("input", (e) => {
            modelRotation[i] = parseFloat(e.target.value) * Math.PI / 180;
        });
    });
}

function setupMouseControls() {
    let dragging = false;
    let lastX, lastY;

    canvas.addEventListener("mousedown", (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    canvas.addEventListener("mouseup", () => {
        dragging = false;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        if (document.getElementById("cam").checked) {
            // Orbit camera
            const sensitivity = 0.01;
            eye[0] = Math.cos(deltaX * sensitivity) * eye[0] - Math.sin(deltaX * sensitivity) * eye[2];
            eye[2] = Math.sin(deltaX * sensitivity) * eye[0] + Math.cos(deltaX * sensitivity) * eye[2];
            eye[1] += deltaY * sensitivity;
        }

        lastX = e.clientX;
        lastY = e.clientY;
    });
}

function setupKeyboardControls() {
    window.addEventListener("keydown", (e) => {
        const step = 0.1;
        switch(e.key.toLowerCase()) {
            case 'w': modelPosition[2] -= step; break;
            case 's': modelPosition[2] += step; break;
            case 'a': modelPosition[0] -= step; break;
            case 'd': modelPosition[0] += step; break;
            case 'q': modelPosition[1] += step; break;
            case 'e': modelPosition[1] -= step; break;
        }
    });
}