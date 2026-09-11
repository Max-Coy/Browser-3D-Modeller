import {state} from "../state.js";
import {frame} from "../Render/renderer.js";
import {normalize} from "../Math/vector.js";
import {quatFromAxisAngle, quatMultiply, quatNormalize, rotatePoint} from "../Math/quaternion.js";
import {deselectVertices, deselectEdges, deselectFaces} from "../Geometry/selection.js";
import {convertSelection} from "../Geometry/selection.js";
import {exitEditing, enterCutMode} from "../Geometry/editing.js";

const {render, input, camera, geometry} = state;
const keyboard = input.keyboard;
const select = geometry.selection;

function handleKeyDown(event){
    keyboard.keyDown[event.code] = true;

    switch(event.code){
        case "KeyV": // switch on/off vertices
            render.showPoints = !render.showPoints; // convert to show selection mode and/or add function for it
            break;
        case "KeyZ": // switch on/off wireframe
            render.showWireframe = !render.showWireframe
            break;
        case "KeyF": // switch on/off faces
            render.showFaces = !render.showFaces;
            break; 
        case "KeyR": // reset camera orientation
            camera.orient = {w: 1, x: 0, y: 0, z: 0};
            break;
        case "KeyP": // currently unused (alternate orthographic and perspective views)
            render.vanishingView = !render.vanishingView;
            break;
        case "Digit1":
            convertSelection(select.mode, "vertex");
            break;
        case "Digit2":
            convertSelection(select.mode, "edge");
            break;
        case "Digit3":
            convertSelection(select.mode, "face");
            break;
        case "KeyK": // Enter knife/cutting tool
            enterCutMode();
            break;
        case "Escape":
            exitEditing();
            break;
    }
    keyRotate(); // Attempt to rotate viewport if wasdqe are held down
    requestAnimationFrame(frame); 
}

export function setupKeyboard(){
    // Add listeners for keyboard inputs, to be used in main.init()
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', (event) => {
        keyboard.keyDown[event.code] = false;
    });
}

function keyRotate(){
    // roatates the viewport if wasdqe are held down
    // Rotate via Z-axis 
    if(keyboard.keyDown.KeyE){ 
        const axis = normalize(rotatePoint({x:0, y:0, z:1}, camera.orient));
        const q = quatFromAxisAngle(axis, keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }
    if(keyboard.keyDown.KeyQ){
        const axis = normalize(rotatePoint({x:0, y:0, z:1}, camera.orient));
        const q = quatFromAxisAngle(axis, -keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }

    // Rotate via X axis
    if(keyboard.keyDown.KeyW){
        const axis = normalize(rotatePoint({x:1, y:0, z:0}, camera.orient));
        const q = quatFromAxisAngle(axis, keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }
    if(keyboard.keyDown.KeyS){
        const axis = normalize(rotatePoint({x:1, y:0, z:0}, camera.orient));
        const q = quatFromAxisAngle(axis, -keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }

    // Rotate via Y-axis
    if(keyboard.keyDown.KeyA){
        const axis = normalize(rotatePoint({x:0, y:1, z:0}, camera.orient));
        const q = quatFromAxisAngle(axis, keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }
    if(keyboard.keyDown.KeyD){
        const axis = normalize(rotatePoint({x:0, y:1, z:0}, camera.orient));
        const q = quatFromAxisAngle(axis, -keyboard.sensitivity);
        camera.orient = quatMultiply(q, camera.orient);
    }
    camera.orient = quatNormalize(camera.orient);
}