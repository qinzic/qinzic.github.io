"use strict";

const{vec2, vec3, vec4 } = glMatrix;

var canvas;
var gl;
var program;

var texSize = 4;

var image1 = new Array()
	for( var i=0; i<texSize; i++ ) 
		image1[i] = new Array();
	for( var i=0; i<texSize; i++ )
		for( var j=0; j<texSize; j++ )
			image1[i][j] = new Float32Array(4);
	for( var i=0; i<texSize; i++ )
		for( var j=0; j<texSize; j++ ){
			var c = ((( i & 0x2 ) == 0 ) ^ (( j & 0x2 ) == 0 ));
			image1[i][j] = [ c, c, c, 1 ];
		}

var image2 = new Uint8Array( 4 * texSize * texSize )
for( var i = 0; i < texSize; i++ )
	for( var j = 0; j < texSize; j++ )
		for( var k = 0; k < 4; k++ )
			image2[ 4 * texSize * i + 4 * j + k ] = 255 * image1[i][j][k];	

var points = [];
var colors = [];
var texCoords = [];
var normals = [];

var texture;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = xAxis;
var theta = [ 45.0, 45.0, 45.0 ];
var thetaLoc;

function triangle(a, b, c) {
    points.push(a[0], a[1], a[2], 1.0);
    points.push(b[0], b[1], b[2], 1.0);
    points.push(c[0], c[1], c[2], 1.0);
    
    var ta = vec2.fromValues(0.5 + Math.atan2(a[2], a[0])/(2*Math.PI), 
                            0.5 - Math.asin(a[1])/Math.PI);
    var tb = vec2.fromValues(0.5 + Math.atan2(b[2], b[0])/(2*Math.PI), 
                            0.5 - Math.asin(b[1])/Math.PI);
    var tc = vec2.fromValues(0.5 + Math.atan2(c[2], c[0])/(2*Math.PI), 
                            0.5 - Math.asin(c[1])/Math.PI);
    
    texCoords.push(ta[0], ta[1]);
    texCoords.push(tb[0], tb[1]);
    texCoords.push(tc[0], tc[1]);
    
    colors.push(1.0, 1.0, 1.0, 1.0);
    colors.push(1.0, 1.0, 1.0, 1.0);
    colors.push(1.0, 1.0, 1.0, 1.0);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = vec3.create();
        var ac = vec3.create();
        var bc = vec3.create();
        
        vec3.lerp(ab, a, b, 0.5);
        vec3.lerp(ac, a, c, 0.5);
        vec3.lerp(bc, b, c, 0.5);
        
        vec3.normalize(ab, ab);
        vec3.normalize(ac, ac);
        vec3.normalize(bc, bc);
        
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

function tetrahedron(count) {
    var v = [
        vec3.fromValues(0.0, 0.0, 1.0),
        vec3.fromValues(0.0, 0.942809, -0.333333),
        vec3.fromValues(-0.816497, -0.471405, -0.333333),
        vec3.fromValues(0.816497, -0.471405, -0.333333)
    ];
    
    divideTriangle(v[0], v[1], v[2], count);
    divideTriangle(v[3], v[2], v[1], count);
    divideTriangle(v[0], v[3], v[1], count);
    divideTriangle(v[0], v[2], v[3], count);
}

function makeSphere() {
    tetrahedron(6);
}

function configureTexture( image ){
	texture = gl.createTexture();
	
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, texture );
	gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image );	
	gl.generateMipmap( gl.TEXTURE_2D );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

window.onload = function initCube(){
	canvas = document.getElementById( "gl-canvas" );

	gl = canvas.getContext("webgl2");
	if( !gl ){
		alert( "WebGL isn't available" );
	}

	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

	gl.enable( gl.DEPTH_TEST );

	// Load shaders and initialize attribute buffers
	program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	makeSphere();

	var cBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( colors ), gl.STATIC_DRAW );

	var vColor = gl.getAttribLocation( program, "vColor" );
	gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vColor );

	var vBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( points ), gl.STATIC_DRAW );

	var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vPosition );

	var tBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( texCoords ), gl.STATIC_DRAW );

	var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
	gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vTexCoord );

	configureTexture( image2 );

	thetaLoc = gl.getUniformLocation( program, "theta" );
	document.getElementById( "ButtonX" ).onclick = function(){
		axis = xAxis;
	}

	document.getElementById( "ButtonY" ).onclick = function(){
		axis = yAxis;
	}

	document.getElementById( "ButtonZ" ).onclick = function(){
		axis = zAxis;
	}

	render();
}

function render(){
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	theta[ axis ] += 2.0;
	gl.uniform3fv( thetaLoc, theta );

	gl.drawArrays( gl.TRIANGLES, 0, points.length/4 );

	requestAnimFrame( render );
}