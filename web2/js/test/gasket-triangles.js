"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;

var points = [];

var numTimesToSubdivide = 2;

window.onload = function initTriangles(){
	canvas = document.getElementById( "gl-canvas" );

	gl = canvas.getContext("webgl2");
	if( !gl ){
		alert( "WebGL isn't available" );
	}

	// initialise data for Sierpinski gasket

	// first, initialise the corners of the gasket with three points.
	var vertices = [
        -1, -1, 0,
        1, -1, 0,
        1,  1, 0,
        -1,  1, 0
	];

	// var u = vec3.create();
	// vec3.set( u, -1, -1, 0 );
	var u = vec3.fromValues( vertices[0], vertices[1], vertices[2] );
	// var v = vec3.create();
	// vec3.set( v, 0, 1, 0 );
	var v = vec3.fromValues( vertices[3], vertices[4], vertices[5] );
	// var w = vec3.create();
	// vec3.set( w, 1, -1, 0 );
	var w = vec3.fromValues( vertices[6], vertices[7], vertices[8] );
	
	var x = vec3.fromValues( vertices[9], vertices[10], vertices[11] );
	divideTriangle( u, v, w, x, numTimesToSubdivide );

	// configure webgl
	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

	// load shaders and initialise attribute buffers
	var program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	// load data into gpu
	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( points ), gl.STATIC_DRAW );

	// associate out shader variables with data buffer
	var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vPosition );

	renderTriangles();
};

function triangle( a, b, c ,d){
	//var k;
	points.push( a[0], a[1], a[2] );
	points.push( b[0], b[1], b[2] );
	points.push( c[0], c[1], c[2] );
	points.push( d[0], d[1], d[2] );
	// for( k = 0; k < 3; k++ )
	// 	points.push( a[k] );
	// for( k = 0; k < 3; k++ )
	// 	points.push( b[k] );
	// for( k = 0; k < 3; k++ )
	// 	points.push( c[k] );
}

function divideTriangle( a, b, c, d,count ){
	// check for end of recursion
	if( count == 0 ){
		triangle( a, b, c ,d);
	}else{
		var ab = vec3.create();
		vec3.lerp( ab, a, b, 0.5 ); // ab=a*alpha+b*(1-alpha)
		var bc = vec3.create();
		vec3.lerp( bc, b, c, 0.5 );
		var cd = vec3.create();
		vec3.lerp( cd, c, d, 0.5 );
		var da = vec3.create();
		vec3.lerp(da, d, a, 0.5);
		var center = vec3.create();
		vec3.lerp(center, ab, cd, 0.5);

		// three new triangles
        divideTriangle(a, ab, center, da, count - 1);
        divideTriangle(ab, b, bc, center, count - 1);
        divideTriangle(center, bc, c, cd, count - 1);
        divideTriangle(da, center, cd, d, count - 1);

		//divideTriangle( ab, bc, ca, count-1 );
	}
}

function renderTriangles(){
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.drawArrays( gl.TRIANGLES, 0, points.length/3 );

	//gl.drawArrays( gl.LINES, 0, lineNumber );
}

function updateSubdivision() {
    const level = parseInt(document.getElementById('subdivisionLevel').value);
    if (level >= 0 && level <= 7) {
        numTimesToSubdivide = level;
		renderTriangles();
    } else {
        alert("请输入0-7之间的整数");
    }
}