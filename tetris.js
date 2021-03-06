main();

/************************************
 * MAIN
 ************************************/

function main() {

    console.log("Setting up the canvas");

    // Find the canavas tag in the HTML document
    const canvas = document.querySelector("#tetrisCanvas");

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");
 
    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    // Create a state for our scene
    var state = {
        camera: {
            position: vec3.fromValues(5.0, 10.0, 25.0),
            center: vec3.fromValues(5.0, 10.0, 0.0),
            up: vec3.fromValues(0.0, 1.0, 0.0),
        },
        lights: [
            {
                position: vec3.fromValues(0.0, 5.0, 5.0),
                colour: vec3.fromValues(1.0, 1.0, 1.0),
                strength: 10.0,
            }
        ],
        objects: [
            {
                model: {
                    cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(0.5, 0.5, 0.5),
                },
                programInfo: goodNormalShader(gl),
                buffers: null,
                texture: null,
				current_position: vec3.fromValues(0.0, 0.0, 0.0),
				color: vec3.fromValues(0.0, 0.0, 0.0),
            }, 
			{
                model: {
                    cube_position: vec3.fromValues(9.0, 19.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
                    rotation: mat4.create(), // Identity matrix
                    scale: vec3.fromValues(0.5, 0.5, 0.5),
                },
                programInfo: goodNormalShader(gl),
                buffers: null,
                texture: null,
				current_position: vec3.fromValues(9.0, 19.0, 0.0),
				color: vec3.fromValues(0.0, 0.0, 0.0),
            }, 
        ],
        canvas: canvas,
		cameraTheta: 1.4,
		currPiece: null, //the tetris piece that is currently moving
		isFirstPersonView: false,
		isRotate: true,
    };

    state.objects.forEach((object) => {
        initCubeBuffers(gl, object);
    });
	
	addPiece(gl, state)
	
    setupKeypresses(state, gl);

    console.log("Starting rendering loop");
	
    startRendering(gl, state);
}


/************************************
 * RENDERING CALLS
 ************************************/

function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;
	var flag = true;
    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        
        if (now%0.5 < 0.25 && flag) {
			updateState(state, gl);
			flag = false;
		}
		if (now%0.5 > 0.25) {
			flag = true;
		}

        // Draw our scene
        drawScene(gl, state);

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }

    // Draw the scene
    requestAnimationFrame(render);
}

function updateState(state, gl) {

	var reachBottom = false
	state.currPiece.objects.some(function(object) {
		
		vec3.add(object.model.piece_position, object.model.piece_position, vec3.fromValues(0, -1, 0));
        object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
		
		//console.log(object.current_position);//here
		if(object.current_position[1] <= 0){
			reachBottom = true;			
		}
		//set pieces checker
		var count = 0;
		var max = state.objects.length - 4;
		state.objects.some(function(setCube) {
			
			if (object.current_position[1] <= setCube.current_position[1]+1
				&& object.current_position[1] > setCube.current_position[1]
				&& Math.round(object.current_position[0]) == Math.round(setCube.current_position[0])) {
				
				reachBottom = true;
			}
			count += 1;
			return count === max;
		});
		
    });	
	if (reachBottom) {
		addPiece(gl, state);
		if(state.isFirstPersonView) {
			var transX = 5.0 - state.camera.center[0]; // - 5.0;
			var transY = 10.0 - state.camera.center[1];
			
			vec3.add(state.camera.center, state.camera.center, vec3.fromValues(transX, transY, 0.0));
			vec3.add(state.camera.position, state.camera.position, vec3.fromValues(transX, transY, 0.0));
			state.camera.up = vec3.fromValues(0.0, 1.0, 0.0);
		}
	}
	
	if (state.isRotate) {
		//rotate camera
		state.cameraTheta += 0.05;
		var transX = state.camera.center[0] - 5.0;
		state.camera.position = vec3.fromValues(25 * Math.cos(state.cameraTheta), state.camera.position[1], 25.0 * Math.sin(state.cameraTheta));
		state.camera.position[0] += transX;
	}
	
	//first person falling
	if(reachBottom == false) {
		if(state.isFirstPersonView) {
			vec3.add(state.camera.center, state.camera.center, vec3.fromValues(0.0, -1.0, 0.0));
			vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0.0, -1.0, 0.0));
		}
	}
	
}

function getCubePostition(relative, piece, rotation) {
	var temp = vec3.fromValues(0.0, 0.0, 0.0);
    vec3.transformMat4(temp, relative, rotation);
    vec3.add(temp, temp, piece);
	return temp;
}

function checkLine(state) {
	var lineCleared = true;
	while(lineCleared){
		lineCleared = false;
		var indexes = [];
		state.objects.some(function(obj1) {
			var count = 0;
			var index = 0;
			state.objects.some(function(obj2) {
				if (Math.round(obj1.current_position[1]) == Math.round(obj2.current_position[1])) {
					count += 1;
					indexes.push(index);
				}
				index +=1;
			});
			if (count == 10) {
				indexes.reverse();//reverse order of indexes to delete them properly
				indexes.some(function(i) {//remove cubes
					state.objects.splice(i,1);
				});
				state.objects.forEach((object) => {//shift remaining cubes down
					if (object.current_position[1] > obj1.current_position[1]) {
						vec3.add(object.model.piece_position, object.model.piece_position, vec3.fromValues(0, -1.0, 0));
						object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
					}
				});
				lineCleared = true;
				return true;
			}
			indexes = [];
		});
	}
}

function drawScene(gl, state) {
    // Set clear colour
    // This is a Red-Green-Blue-Alpha colour
    // See https://en.wikipedia.org/wiki/RGB_color_model
    // Here we use floating point values. In other places you may see byte representation (0-255).
    gl.clearColor(0.55686, 0.54902, 0.52157, 1.0);

    // Depth testing allows WebGL to figure out what order to draw our objects such that the look natural.
    // We want to draw far objects first, and then draw nearer objects on top of those to obscure them.
    // To determine the order to draw, WebGL can test the Z value of the objects.
    // The z-axis goes out of the screen
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.clearDepth(1.0); // Clear everything

    // Clear the color and depth buffer with specified clear colour.
    // This will replace everything that was in the previous frame with the clear colour.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    state.objects.forEach((object) => {
        // Choose to use our shader
        gl.useProgram(object.programInfo.program);

            // Update uniforms
        {
            var projectionMatrix = mat4.create();
            var fovy = 60.0 * Math.PI / 180.0; // Vertical field of view in radians
            var aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            var near = 0.1; // Near clipping plane
            var far = 100.0; // Far clipping plane
            // Generate the projection matrix using perspective
            mat4.perspective(projectionMatrix, fovy, aspect, near, far);

            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
        
            var viewMatrix = mat4.create();
            mat4.lookAt(
                viewMatrix,
                state.camera.position,
                state.camera.center,
                state.camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);


            // Update model transform -> ( Tpiece . Rotation . ( Tcube . Scale (x)))
			// no per-cube rotation and no piece scale -> order of transformations that we want
			var modelMatrix = mat4.create();
			
			//( Tpiece . Rotation . ( ... ))
			mat4.translate(modelMatrix, modelMatrix, object.model.piece_position);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
			
			// ( Tcube . Scale (x))
			mat4.translate(modelMatrix, modelMatrix, object.model.cube_position);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
			
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);
        
            // Update camera position
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);

            //Update lights
            gl.uniform3fv(object.programInfo.uniformLocations.light0Position, state.lights[0].position);
            gl.uniform3fv(object.programInfo.uniformLocations.light0Colour, state.lights[0].colour);
            gl.uniform1f(object.programInfo.uniformLocations.light0Strength, state.lights[0].strength);
			
			//update color
			gl.uniform3fv(object.programInfo.uniformLocations.color, object.color);
        }

		{
		// Draw 
        
            // Bind the buffer we want to draw
            gl.bindVertexArray(object.buffers.vao);

            if(object.texture != null) {
                gl.uniform1i(object.programInfo.uniformLocations.sampler, object.texture);
            }

            // Draw the object
            const offset = 0; // Number of elements to skip before starting
            gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
        }
	});
	
}


/************************************
 * UI EVENTS
 ************************************/

function setupKeypresses(state, gl){
    document.addEventListener("keydown", (event) => {
        //console.log(event.code);

        switch(event.code) {
        case "KeyA":
            console.log("YO");
			addPiece(gl, state);
            break;
			
		case "KeyF":
			if (state.isFistPersonView == true) {
				state.camera.up = vec3.fromValues(0.0, 1.0, 0.0);
			}
			state.isFirstPersonView = !(state.isFirstPersonView);
			break;
		case "KeyR":
			if (state.isRotate) {
				state.cameraTheta = 1.4;
				var transX = state.camera.center[0] - 5.0;
				state.camera.position = vec3.fromValues(25 * Math.cos(state.cameraTheta), state.camera.position[1], 25.0 * Math.sin(state.cameraTheta));
				state.camera.position[0] += transX;
			}
			state.isRotate = ! state.isRotate;
			break;
		
		case "ArrowLeft": //move left
            var move = true;
			state.currPiece.objects.forEach((object) => {
				if (Math.round(object.current_position[0]) == 0) {
                    move = false;
				}
				//set-piece checker
				var count = 0;
				var max = state.objects.length - 4;
				state.objects.some(function(setCube) {
					if (object.current_position[0] == setCube.current_position[0]+1
						&& object.current_position[1] == setCube.current_position[1]) {
						move = false;
					}
					count += 1;
					return count === max;
				});				
            });

            if (move) {
				if(state.isFirstPersonView == true) {
					vec3.add(state.camera.center, state.camera.center, vec3.fromValues(-1.0, 0.0, 0.0));
					vec3.add(state.camera.position, state.camera.position, vec3.fromValues(-1.0, 0.0, 0.0));
				}
                state.currPiece.objects.forEach((object) => {
					vec3.add(object.model.piece_position, object.model.piece_position, vec3.fromValues(-1.0, 0.0, 0));
					object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
				});
            }
			
			break;
		case "ArrowRight": //move right
			var move = true;
			state.currPiece.objects.forEach((object) => {
				if (Math.round(object.current_position[0]) == 9) {
                    move = false;
				}
				//set-piece checker
				var count = 0;
				var max = state.objects.length - 4;
				state.objects.some(function(setCube) {
					if (object.current_position[0] == setCube.current_position[0]-1
						&& object.current_position[1] == setCube.current_position[1]) {
						move = false;
					}
					count += 1;
					return count === max;
				});
            });

            if (move) {
				if(state.isFirstPersonView) {
					vec3.add(state.camera.center, state.camera.center, vec3.fromValues(1.0, 0.0, 0.0));
					vec3.add(state.camera.position, state.camera.position, vec3.fromValues(1.0, 0.0, 0.0));
				}
                state.currPiece.objects.forEach((object) => {
					vec3.add(object.model.piece_position, object.model.piece_position, vec3.fromValues(1.0, 0.0, 0));
					object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
				});
            }		
                
            break;
		
		case "ArrowUp": //rotate positive (left)
			//prechecks rotation
			var move = true;
			state.currPiece.objects.forEach((object) => {
                var temp = vec3.fromValues(0.0, 0.0, 0.0);
				var temp2 = mat4.create();
				mat4.rotateZ(temp2, object.model.rotation, Math.PI/2);
				temp = getCubePostition(object.model.cube_position, object.model.piece_position, temp2);
				if (temp[0] < 0 || temp[0] > 9) {
                    move = false;
				}
				//set-piece checker
				var count = 0;
				var max = state.objects.length - 4;
				state.objects.some(function(setCube) {
					if (temp[0] == setCube.current_position[0]
						&& temp[1] == setCube.current_position[1]) {
						move = false;
					}
					count += 1;
					return count === max;
				});
            });

            if (move) {
				if(state.isFirstPersonView) {
					vec3.rotateZ(state.camera.up, state.camera.up, vec3.fromValues(0.0, 0.0, 0.0), Math.PI/2);
				}
                state.currPiece.objects.forEach((object) => {
					mat4.rotateZ(object.model.rotation, object.model.rotation, Math.PI/2);//1.5708 rad = 90 deg
					object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
				});
            }

			break;			
		case "ArrowDown": //rotate negative (right)
			//prechecks rotation
			var move = true;
			state.currPiece.objects.forEach((object) => {
                var temp = vec3.fromValues(0.0, 0.0, 0.0);
				var temp2 = mat4.create();
				mat4.rotateZ(temp2, object.model.rotation, -Math.PI/2);
                temp = getCubePostition(object.model.cube_position, object.model.piece_position, temp2);				
				if (temp[0] < 0 || temp[0] > 9) {
                    move = false;
				}
				//set-piece checker
				var count = 0;
				var max = state.objects.length - 4;
				state.objects.some(function(setCube) {
					if (temp[0] == setCube.current_position[0]
						&& temp[1] == setCube.current_position[1]) {
						move = false;
					}
					count += 1;
					return count === max;
				});
            });

            if (move) {
				if(state.isFirstPersonView) {
					vec3.rotateZ(state.camera.up, state.camera.up, vec3.fromValues(0.0, 0.0, 0.0), -Math.PI/2);
				}
                state.currPiece.objects.forEach((object) => {
					mat4.rotateZ(object.model.rotation, object.model.rotation, -Math.PI/2);
					object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
				});
            }

			break;
		
        default:
            break;
        }
    });
}

/************************************
 * SHADER SETUP
 ************************************/

function goodNormalShader(gl){

    // Vertex shader source code
    const vsSource =
    `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;

    uniform vec3 uCameraPosition;

    out vec3 oNormal;

    void main() {
        // Position needs to be a vec4 with w as 1.0
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);

        oNormal = normalize((uModelMatrix * vec4(aNormal, 0.0)).xyz); // Good. When w == 0.0, the normal is correctly treated like a vector

    }
    `;

    // Fragment shader source code
    const fsSource =
    `#version 300 es
    precision highp float;

    out vec4 fragColor;

    in vec3 oNormal;
	
	uniform vec3 uColor;
	
    void main() {
		vec3 temp = abs(oNormal) + abs(uColor);
        fragColor = vec4(temp, 1.0);
    }
    `;


    // Create our shader program with our custom function
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    const programInfo = {
        // The actual shader program
        program: shaderProgram,
        // The attribute locations. WebGL will use there to hook up the buffers to the shader program.
        // NOTE: it may be wise to check if these calls fail by seeing that the returned location is not -1.
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            projection: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            view: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            model: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
			color: gl.getUniformLocation(shaderProgram, 'uColor'),
        },
    };

       // Check to see if we found the locations of our uniforms and attributes
    // Typos are a common source of failure
    if (programInfo.attribLocations.vertexPosition === -1 ||
        programInfo.attribLocations.vertexNormal === -1 ||
        programInfo.uniformLocations.projection === -1 ||
        programInfo.uniformLocations.view === -1 ||
		programInfo.uniformLocations.color === -1 ||
        programInfo.uniformLocations.model === -1 ) {
        printError('Shader Location Error', 'One or more of the uniform and attribute variables in the shaders could not be located');
    }

    return programInfo;
}
/************************************
 * TETRIS FUNCTIONS
 ************************************/

//adds a tetris piece to the screen 
function addPiece(gl, state) {
	
	checkLine(state);
	var piece = generateTetrisPeice(gl);
	
	state.currPiece = piece;

	var color = vec3.create();
	vec3.random(color); //makes a random unit vector (random color)
	console.log("color");
	console.log(color);
	//add objects in tetris piece to scene
	piece.objects.forEach((object) => {
	
		//add transformations (the tetris piece rotates and translates)
		object.model.piece_position = vec3.fromValues(4.0, 19.0, 0.0);
		object.model.rotation = mat4.create();
		object.current_position = getCubePostition(object.model.cube_position, object.model.piece_position, object.model.rotation);
		
		object.color = color;
		
		state.objects.push(object);
        initCubeBuffers(gl, object);
    });
	
	return;
}

function generateTetrisPeice(gl) {
	var piece;
	//var rand = 1;	//random number % num_shapes
	var rand = Math.floor(Math.random() * 7);
	
	switch(rand) {
		case 0:
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(-1.0, 0.0, 0.0),
					//relative_position: vec3.fromValues(-1.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),					
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					//relative_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(-1.0, -1.0, 0.0),
					//relative_position: vec3.fromValues(-1.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, -1.0, 0.0),
					//relative_position: vec3.fromValues(0.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end piece 1
	
	
		case 1:
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(-1.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},],
			};
			break;
		case 2: //backwards L
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(1.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end
			
		case 3: // T piece
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(-1.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
			},
			{
				model: {
					cube_position: vec3.fromValues(1.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end
		
		case 4: //tall piece
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, -2.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end
		case 5: //forward z
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(1.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(1.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end
			
		case 6: // backwards z
			piece = {
			objects: [
			{
				model: {
					cube_position: vec3.fromValues(-1.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 0.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(-1.0, -1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			{
				model: {
					cube_position: vec3.fromValues(0.0, 1.0, 0.0),
					piece_position: vec3.fromValues(0.0, 0.0, 0.0),
					rotation: mat4.create(), // Identity matrix
					scale: vec3.fromValues(0.5, 0.5, 0.5),
				},
				programInfo: goodNormalShader(gl),
				buffers: null,
				texture: null,
				current_position: null,
				color:null,
			},
			],};
			break;
			//end
	};
	return piece;
}

/************************************
 * BUFFER SETUP
 ************************************/

function initCubeBuffers(gl, object) {

     // We have 3 vertices with x, y, and z values
     const positionArray = new Float32Array([
        // Front face
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,
        
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,
        
        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        
        // Right face
        1.0, -1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,
        
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
    ]);

    const normalArray = new Float32Array([
        // Front
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,

        // Back
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,

        // Top
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,

        // Bottom
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,

        // Right
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,

        // Left
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
    ]);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indicesArray = new Uint16Array([
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ]);

    initBuffers(gl, object, positionArray, normalArray, null, null, indicesArray);
}

function initBuffers(gl, object, positionArray, normalArray, colourArray, textureCoordArray, indicesArray) {

    // We have 3 vertices with x, y, and z values
    const positions = new Float32Array(positionArray);

    const normals = new Float32Array(normalArray);

    const colours = new Float32Array(colourArray);

    const textureCoords = new Float32Array(textureCoordArray);

    // We are using gl.UNSIGNED_SHORT to enumerate the indices
    const indices = new Uint16Array(indicesArray);

    // Allocate and assign a Vertex Array Object to our handle
    var vertexArrayObject = gl.createVertexArray();

    // Bind our Vertex Array Object as the current used object
    gl.bindVertexArray(vertexArrayObject);

    object.buffers = {
        vao: vertexArrayObject,
        attributes: {
            position: initPositionAttribute(gl, object.programInfo, positions),
            normal: initNormalAttribute(gl, object.programInfo, normals),
        },
        indices: initIndexBuffer(gl, indices),
        numVertices: indices.length,
    };
}

function initPositionAttribute(gl, programInfo, positionArray) {
    if(positionArray != null && positionArray.length > 0 && programInfo.attribLocations.vertexPosition != null){
        // Create a buffer for the positions.
        const positionBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            positionArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3; // pull out 3 values per iteration, ie vec3
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from


            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        return positionBuffer;
    }
}


function initColourAttribute(gl, programInfo, colourArray) {

    if(colourArray != null && colourArray.length > 0 && programInfo.attribLocations.vertexColour != null) {
        // Create a buffer for the positions.
        const colourBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            colourArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 4; // pull out 4 values per iteration, ie vec4
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from

            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColour,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColour);
        }

        return colourBuffer;
    }
}


function initNormalAttribute(gl, programInfo, normalArray) {
    if(normalArray != null && normalArray.length > 0 && programInfo.attribLocations.vertexNormal != null){
        // Create a buffer for the positions.
        const normalBuffer = gl.createBuffer();

        // Select the buffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(
            gl.ARRAY_BUFFER, // The kind of buffer this is
            normalArray, // The data in an Array object
            gl.STATIC_DRAW // We are not going to change this data, so it is static
        );

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3; // pull out 4 values per iteration, ie vec3
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize between 0 and 1
            const stride = 0; // how many bytes to get from one set of values to the next
            // Set stride to 0 to use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from

            // Set the information WebGL needs to read the buffer properly
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            // Tell WebGL to use this attribute
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        return normalBuffer;
    }
}

function initIndexBuffer(gl, elementArray) {

    // Create a buffer for the positions.
    const indexBuffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER, // The kind of buffer this is
        elementArray, // The data in an Array object
        gl.STATIC_DRAW // We are not going to change this data, so it is static
    );

    return indexBuffer;
}
