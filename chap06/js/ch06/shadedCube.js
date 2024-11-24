"use strict";

const { vec3, vec4, mat4 } = glMatrix;

var canvas;
var gl;
var program;

var points = [];
var normals = [];

var lightPosition = vec4.fromValues(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4.fromValues(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4.fromValues(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4.fromValues(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4.fromValues(1.0, 0.8, 0.0, 1.0);
var materialShininess = 100.0;

var modelViewMatrix, projectionMatrix;
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var theta = [0, 0, 0];
var flag = true;

// 四面体的顶点
var va = vec4.fromValues(0.0, 0.0, 1.0, 1.0);
var vb = vec4.fromValues(0.0, 0.942809, -0.333333, 1.0);
var vc = vec4.fromValues(-0.816497, -0.471405, -0.333333, 1.0);
var vd = vec4.fromValues(0.816497, -0.471405, -0.333333, 1.0);

function triangle(a, b, c) {
    points.push(
        a[0], a[1], a[2], 1.0,
        b[0], b[1], b[2], 1.0,
        c[0], c[1], c[2], 1.0
    );
    
    // 创建并归一化法向量
    var na = vec3.fromValues(a[0], a[1], a[2]);
    var nb = vec3.fromValues(b[0], b[1], b[2]);
    var nc = vec3.fromValues(c[0], c[1], c[2]);
    
    vec3.normalize(na, na);
    vec3.normalize(nb, nb);
    vec3.normalize(nc, nc);
    
    normals.push(
        na[0], na[1], na[2],
        nb[0], nb[1], nb[2],
        nc[0], nc[1], nc[2]
    );
}

// 归一化函数
function normalizeVec4(v) {
    var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return vec4.fromValues(v[0]/len, v[1]/len, v[2]/len, 1.0);
}

// 混合两个向量
function mix(a, b, t) {
    var result = vec4.create();
    vec4.lerp(result, a, b, t);
    return result;
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalizeVec4(mix(a, b, 0.5));
        var ac = normalizeVec4(mix(a, c, 0.5));
        var bc = normalizeVec4(mix(b, c, 0.5));

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function initSphere() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert("WebGL 2.0 isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 清空并重新生成顶点
    points = [];
    normals = [];
    tetrahedron(va, vb, vc, vd, 5);  // 增加递归次数到5

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // 设置光照
    var ambientProduct = vec4.create();
    var diffuseProduct = vec4.create();
    var specularProduct = vec4.create();
    
    vec4.multiply(ambientProduct, lightAmbient, materialAmbient);
    vec4.multiply(diffuseProduct, lightDiffuse, materialDiffuse);
    vec4.multiply(specularProduct, lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), lightPosition);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");

    document.getElementById("ButtonX").onclick = function(){axis = xAxis;};
    document.getElementById("ButtonY").onclick = function(){axis = yAxis;};
    document.getElementById("ButtonZ").onclick = function(){axis = zAxis;};
    document.getElementById("ButtonT").onclick = function(){flag = !flag;};

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(flag) theta[axis] += 2.0;

    var eye = vec3.fromValues(0.0, 0.0, 3.0);
    var at = vec3.fromValues(0.0, 0.0, 0.0);
    var up = vec3.fromValues(0.0, 1.0, 0.0);

    var mvMatrix = mat4.create();
    mat4.lookAt(mvMatrix, eye, at, up);
    mat4.rotateX(mvMatrix, mvMatrix, theta[xAxis] * Math.PI/180.0);
    mat4.rotateY(mvMatrix, mvMatrix, theta[yAxis] * Math.PI/180.0);
    mat4.rotateZ(mvMatrix, mvMatrix, theta[zAxis] * Math.PI/180.0);

    var pMatrix = mat4.create();
    mat4.perspective(pMatrix, 45 * Math.PI/180.0, 1.0, 0.1, 100.0);

    gl.uniformMatrix4fv(modelViewMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(projectionMatrix, false, pMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, points.length/4);
    requestAnimationFrame(render);
}