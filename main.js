/* PROJECT NAME ? PROJECT VERSION ?
Max Coy, 2026
Html based 3D modeller
*/


import {state} from "./state.js";
import {frame} from "./Render/renderer.js";
import {setupMouse} from "./Input/mouse.js";
import {setupKeyboard} from "./Input/keyboard.js";
import {makeBox} from "./Geometry/mesh.js";
import {initSceneTree} from "./UI/sceneTree.js";

function init() {
    state.render.screen = document.getElementById("screen");
    state.render.ctx = state.render.screen.getContext("2d");
    
    state.render.screen.width = state.render.width;
    state.render.screen.height = state.render.height;

    makeBox(0, 0, 0, 0.25, 0.25, 0.25);

    setupMouse();
    setupKeyboard();

    console.log(state);

    initSceneTree();

    requestAnimationFrame(frame);
}

init();
