"use strict";

const{vec3, vec4, mat3, mat4} = glMatrix;

const MIN_RADIUS = 0.5;  // 最小半径
const MAX_RADIUS = 5.0;  // 最大半径
const MIN_SUBDIVIDES = 0;  // 最小分块数
const MAX_SUBDIVIDES = 6;  // 最大分块数

function Renderer( canvasName, vertSrc, fragSrc )
{
	// public members
	this.lightPosition = vec4.fromValues( 5.0, 5.0, 5.0, 0.0 );
	this.lightAmbient = vec4.fromValues( 0.2, 0.2, 0.2, 1.0 );
	this.lightDiffuse = vec4.fromValues( 1.0, 1.0, 1.0, 1.0 );
	this.lightSpecular = vec4.fromValues( 1.0, 1.0, 1.0, 1.0 );

	this.materialAmbient = vec4.fromValues( 1.0, 0.0, 1.0, 1.0 );
	this.materialDiffuse = vec4.fromValues( 1.0, 0.0, 0.0, 1.0 );
	this.materialSpecular = vec4.fromValues( 1.0, 1.0, 1.0, 1.0 );
	this.materialShininess = 20.0;

	this.clearColor = vec4.fromValues( 0.0, 1.0, 1.0, 1.0 );

	// private members
	var modeVal = 1;

	var canvas;
	var gl;

	var va = vec4.fromValues(0.0, 0.0, -1.0,1);
	var vb = vec4.fromValues(0.0, 0.942809, 0.333333, 1);
	var vc = vec4.fromValues(-0.816497, -0.471405, 0.333333, 1);
	var vd = vec4.fromValues(0.816497, -0.471405, 0.333333,1);

	var near = -10;
	var far = 10;
	var radius = 1.5;
	var theta = 0.0;
	var phi = 0.0;
	var stept = 5.0 * Math.PI / 180.0;
	var stepm = 0.1;

	var left = -5.0;
	var right = 5.0;
	var ytop = 5.0;
	var bottom = -5.0;

	var eye = vec3.create();
	var at = vec3.fromValues( 0.0, 0.0, 0.0 );
	var up = vec3.fromValues( 0.0, 1.0, 0.0 );

	var points = [];	
	var normals = [];
	var index = 0;

	var vBuffer = null;
	var nBuffer = null;

	var numOfSubdivides = 2;

	var progID = 0;
	var vertID = 0;
	var fragID = 0;
	var vertSrc = vertSrc;
	var fragSrc = fragSrc;

	var vertexLoc = 0;
	var normalLoc = 0;

	var ambientProdLoc = 0;
	var diffuseProdLoc = 0;
	var specularProdLoc = 0;

	var modelViewMatrix = mat4.create();
	var projectionMatrix = mat4.create();
	var modelViewMatrixLoc = 0;
	var projectionMatrixLoc = 0;

	var lightPositionLoc = 0;
	var shininessLoc = 0;

	var normalMatrix = mat3.create();
	var normalMatrixLoc = 0;

	var currentKey = [];

	this.init = function(){
		this.canvas = document.getElementById( "gl-canvas" );
		try{
			gl = this.canvas.getContext("webgl2");
		}catch( e ){
			if( !gl ){
				window.alert( "Error: WebGL isn't available" );
			}
		}

		gl.clearColor( this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3] );
		gl.viewport( 0, 0, this.canvas.width, this.canvas.height );
		gl.enable( gl.DEPTH_TEST );

		setupShaders();

		initSphere();
		initBuffers();
		initShaderBuffers();

		document.onkeydown = this.handleKeyDown;
		document.onkeyup = this.handleKeyUp;

		initControls();
	}

	function initSphere(){
		// 初始化球体上四个顶点，x=rsin(theta)cos(phi),y=rsin(theta)sin(phi),z=rcos(theta)
		points = [];	
	    normals = [];
		divideTetra( va, vb, vc, vd, numOfSubdivides );
	}

	function initBuffers(){
		vBuffer = gl.createBuffer();
		nBuffer = gl.createBuffer();
	}

	function initShaderBuffers(){
		// 初始化着色器内存
		gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( points ), gl.STATIC_DRAW );

		gl.vertexAttribPointer( vertexLoc, 4, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( vertexLoc );

		gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( normals ), gl.STATIC_DRAW );

		gl.vertexAttribPointer( normalLoc, 4, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( normalLoc );
	}

	this.display = function(){
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		gl.useProgram( progID );

		var ambientProduct = vec4.create();
		vec4.multiply( ambientProduct, this.lightAmbient, this.materialAmbient );

		var diffuseProduct = vec4.create();
		vec4.multiply( diffuseProduct, this.lightDiffuse, this.materialDiffuse );

		var specularProduct = vec4.create();
		vec4.multiply(specularProduct, this.lightSpecular, this.materialSpecular );

		vec3.set( eye, radius * Math.sin( theta ) * Math.cos( phi ),
			radius * Math.sin( theta ) * Math.sin( phi ),
			radius * Math.cos( theta ) );

		mat4.lookAt( modelViewMatrix, eye, at, up );
		mat4.ortho( projectionMatrix, left, right, bottom, ytop, near, far );

		mat3.fromMat4( normalMatrix, modelViewMatrix );

		gl.uniform4fv( ambientProdLoc, new Float32Array( ambientProduct ) );
		gl.uniform4fv( diffuseProdLoc, new Float32Array( diffuseProduct ) );
		gl.uniform4fv( specularProdLoc, new Float32Array( specularProduct ) );
		gl.uniform4fv( lightPositionLoc, new Float32Array( this.lightPosition ) );
		gl.uniform1f( shininessLoc, this.materialShininess );

		gl.uniformMatrix4fv( modelViewMatrixLoc, false, new Float32Array( modelViewMatrix ) );
		gl.uniformMatrix4fv( projectionMatrixLoc, false, new Float32Array( projectionMatrix ) );
		gl.uniformMatrix3fv( normalMatrixLoc, false, new Float32Array( normalMatrix ) );

		gl.drawArrays(gl.TRIANGLES, 0, points.length/4 );
	}

	function triangle( a, b, c ){
		points.push( a[0], a[1], a[2], a[3] );
		points.push( b[0], b[1], b[2], b[3] );
		points.push( c[0], c[1], c[2], c[3] );

		switch( modeVal ){
			case 1:
			case 2:
				normals.push( a[0], a[1], a[2], 0.0 );
				normals.push( b[0], b[1], b[2], 0.0 );
				normals.push( c[0], c[1], c[2], 0.0 );
				index += 3;
				break;
			case 3:
			case 4:
			case 5:
			case 6:
				var t1 = vec4.create();
				vec4.subtract( t1, b, a );
				var t2 = vec4.create();
				vec4.subtract( t2, c, a );

				var n = vec4.create();
				var n1 = vec3.create();
				vec3.cross( n1, vec3.fromValues(t1[0], t1[1], t1[2]), vec3.fromValues( t2[0], t2[1], t2[3] ) );
				vec3.normalize( n1, n1 );
				vec4.set( n, n1[0], n1[1], n1[2], 0.0 );

				normals.push( n[0], n[1], n[2], 0.0 );
				normals.push( n[0], n[1], n[2], 0.0 );
				normals.push( n[0], n[1], n[2], 0.0 );
				index += 3;
				break;
			default:
				break;
		}

		index += 3;
	}

	function divideTriangle( a, b, c, n ){
		if( n > 0 ){
			var ab = vec4.create();
			vec4.lerp( ab, a, b, 0.5 );
			var abt = vec3.fromValues( ab[0], ab[1], ab[2] );
			vec3.normalize( abt, abt );
			vec4.set( ab, abt[0], abt[1], abt[2], 1.0 );

			var bc = vec4.create();
			vec4.lerp( bc, b, c, 0.5 );
			var bct = vec3.fromValues( bc[0], bc[1], bc[2] );
			vec3.normalize( bct, bct );
			vec4.set( bc, bct[0], bct[1], bct[2], 1.0 );

			var ac = vec4.create();
			vec4.lerp( ac, a, c, 0.5 );
			var act = vec3.fromValues( ac[0], ac[1], ac[2] );
			vec3.normalize( act, act );
			vec4.set( ac, act[0], act[1], act[2], 1.0 );

			divideTriangle( a, ab, ac, n - 1 );
			divideTriangle( ab, b, bc, n - 1 );
			divideTriangle( bc, c, ac, n - 1 );
			divideTriangle( ab, bc, ac, n - 1 );
		}else{
			triangle( a, b, c );
		}
	}

	function divideTetra( a, b, c, d, n ){
		divideTriangle( a, b, c, n );
		divideTriangle( d, c, b, n );
		divideTriangle( a, d, b, n );
		divideTriangle( a, c, d, n );
	}

	this.updateShader = function( newVertSrc, newFragSrc ){
		vertSrc = newVertSrc;
		fragSrc = newFragSrc;

		gl.deleteProgram( progID );
		gl.deleteShader( vertID );
		gl.deleteShader( fragID );

		setupShaders();
	}

	// private 
	function setupShaders(){
		// create shader
		vertID = gl.createShader( gl.VERTEX_SHADER );
		fragID = gl.createShader( gl.FRAGMENT_SHADER );

		// specify shader source
		gl.shaderSource( vertID, vertSrc );
		gl.shaderSource( fragID, fragSrc );

		// compile shader
		gl.compileShader( vertID );
		gl.compileShader( fragID );

		var error = false;
		if( !gl.getShaderParameter( vertID, gl.COMPILE_STATUS ) ){
			document.getElementById( "code_vert_error" ).innerHTML = "invalid vertex shader: " + gl.getShaderInfoLog( vertID );
			error = true;
		}else{
			document.getElementById( "code_vert_error" ).innerHTML = "";
		}

		if( !gl.getShaderParameter( fragID, gl.COMPILE_STATUS ) ){
			document.getElementById( "code_frag_error" ).innerHTML = "invalid fragment shader: " + gl.getShaderInfoLog( fragID );
			error = true;
		}else{
			document.getElementById( "code_frag_error" ).innerHTML = "";
		}

		if( error )
			return;

		// create program and attach shaders
		progID = gl.createProgram();
		gl.attachShader( progID, vertID );
		gl.attachShader( progID, fragID );

		// link the program
		gl.linkProgram( progID );
		if( !gl.getProgramParameter( progID, gl.LINK_STATUS ) ){
			alert( gl.getProgramInfoLog( progID ) );
			return;
		}

		// retrieve the location for in variables of the vertex shader
		vertexLoc = gl.getAttribLocation( progID, "vPosition" );
		normalLoc = gl.getAttribLocation( progID, "vNormal" );

		// retrieve the location of the uniform variables of the shader
		ambientProdLoc = gl.getUniformLocation( progID, "ambientProduct" );
		diffuseProdLoc = gl.getUniformLocation( progID, "diffuseProduct" );
		specularProdLoc = gl.getUniformLocation( progID, "specularProduct" );

		modelViewMatrixLoc = gl.getUniformLocation( progID, "modelViewMatrix" );
		projectionMatrixLoc = gl.getUniformLocation( progID, "projectionMatrix" );
		normalMatrixLoc = gl.getUniformLocation( progID, "normalMatrix" );

		lightPositionLoc = gl.getUniformLocation( progID, "lightPosition" );
		shininessLoc = gl.getUniformLocation( progID, "shininess" );
	}

	this.handleKeyDown = function(){
		var key = event.keyCode;
		currentKey[key] = true;
		switch(key){
			case 65: // a - 增加 theta
				theta = (theta + stept) % (2 * Math.PI);
				break;
			case 68: // d - 减少 theta
				theta = (theta - stept + 2 * Math.PI) % (2 * Math.PI);
				break;
			case 87: // w - 增加 phi
				phi = Math.min(phi + stept, Math.PI - 0.1);
				break;
			case 83: // s - 减少 phi
				phi = Math.max(phi - stept, 0.1);
				break;
			case 90: // z - 增大半径
				radius = Math.min(radius + stepm, MAX_RADIUS);
				break;
			case 88: // x - 减少半径
				radius = Math.max(radius - stepm, MIN_RADIUS);
				break;
			case 86: // v - 增加分块
				if(numOfSubdivides < MAX_SUBDIVIDES) {
					numOfSubdivides++;
					index = 0;
					points = [];
					normals = [];
					initSphere();
					initShaderBuffers();
				}
				break;
			case 66: // b - 减少分块
				if(numOfSubdivides > MIN_SUBDIVIDES) {
					numOfSubdivides--;
					index = 0;
					points = [];
					normals = [];
					initSphere();
					initShaderBuffers();
				}
				break;
		}
	}

	this.handleKeyUp = function(){
		currentKey[ event.keyCode ] = false;
	}

	function initControls() {
		// 材质系数控制
		document.getElementById("slider-ka").addEventListener("input", function(e) {
			materialKa = parseFloat(e.target.value);
			document.getElementById("slider-ka-value").innerHTML = materialKa;
		});
		
		document.getElementById("slider-kd").addEventListener("input", function(e) {
			materialKd = parseFloat(e.target.value);
			document.getElementById("slider-kd-value").innerHTML = materialKd;
		});
		
		document.getElementById("slider-ks").addEventListener("input", function(e) {
			materialKs = parseFloat(e.target.value);
			document.getElementById("slider-ks-value").innerHTML = materialKs;
		});
		
		document.getElementById("slider-sh").addEventListener("input", function(e) {
			materialShininess = parseFloat(e.target.value);
			document.getElementById("slider-sh-value").innerHTML = materialShininess;
		});

		// 材质颜色控制
		document.getElementById("ka-color").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			materialAmbient = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});
		
		document.getElementById("kd-color").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			materialDiffuse = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});
		
		document.getElementById("ks-color").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			materialSpecular = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});

		// 光源位置控制
		document.getElementById("light-x").addEventListener("input", function(e) {
			lightPosition[0] = parseFloat(e.target.value);
		});
		
		document.getElementById("light-y").addEventListener("input", function(e) {
			lightPosition[1] = parseFloat(e.target.value);
		});
		
		document.getElementById("light-z").addEventListener("input", function(e) {
			lightPosition[2] = parseFloat(e.target.value);
		});

		// 光源颜色控制
		document.getElementById("light-ambient").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			lightAmbient = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});
		
		document.getElementById("light-diffuse").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			lightDiffuse = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});
		
		document.getElementById("light-specular").addEventListener("input", function(e) {
			var color = hexToRgb(e.target.value);
			lightSpecular = vec4.fromValues(color.r/255, color.g/255, color.b/255, 1.0);
		});

		// 着色模式切换
		document.getElementById("shading-mode").addEventListener("change", function(e) {
			var mode = parseInt(e.target.value);
			if(mode === 5) {
				document.getElementById("code_vert").value = document.getElementById("vshader-5").value;
				document.getElementById("code_frag").value = document.getElementById("fshader-5").value;
			} else {
				document.getElementById("code_vert").value = document.getElementById("vshader-6").value;
				document.getElementById("code_frag").value = document.getElementById("fshader-6").value;
			}
			updateRenderer();
		});
	}

	// 辅助函数：将16进制颜色转换为RGB
	function hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
}