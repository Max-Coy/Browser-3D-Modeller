import {state} from "../state.js";
import {rotatePoint} from "./quaternion.js";

export function project({x, y, z}){
    //Orthographic Projection of our Points
    return {
        x : x,
        y: y 
    }
}

export function convert(p, width, height, zoom = 1){
    //Converts Pixels on screen to be from [-1,1] in x-y
    //plane with origin in the center (inverts y-axis)

    return {
        x: p.x * zoom + width / 2,
        y: -p.y * zoom + height / 2
    };
}

export function screenPosition(p){
    // Converts a point from true position to screen position
    return convert(project(rotatePoint(p, state.camera.orient)),
                    state.render.screen.width,
                    state.render.screen.height,
                    state.camera.zoom);
}