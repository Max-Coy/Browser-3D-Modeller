import {state} from "../state.js";
import {screenPosition} from "../Math/projection.js";
import {rotatePoint} from "../Math/quaternion.js";
import {line, point} from "../Render/renderer.js";
import {dot, distToSegmentSquared2D, threePointPlane, pointInPlane} from "../Math/vector.js";
import {frame} from "../Render/renderer.js";
import {getFacesWithVertices, computeFaceNormal} from "./mesh.js";

const {camera, interaction, input, geometry} = state;
const mouse = input.mouse;

export function moveSelectedVertices(dx, dy, dz){
    for(const vertexId of geometry.selection.vertices){ // Updating vertex positions
        const p = geometry.mesh.vertices[vertexId].position;
        p.x += dx;
        p.y += dy;
        p.z += dz;
    }

    // Updating Rendering Information
    const oldFaces = getFacesWithVertices(geometry.selection.vertices, geometry.mesh.faces);
    for(const faceId of oldFaces){
        updateFace(geometry.mesh.faces[faceId]);
    }

    requestAnimationFrame(frame);
}

// function updateFace(face){
//     if(face.subfaces.length != 0){
//         face.subfaces.length = 0; //ensuring empty array
//     }
    

//     const plane = threePointPlane(face.vertices[0], face.vertices[1], face.vertices[2]);
//     const subFace = [face.vertices[0], face.vertices[1], face.vertices[2]];

//     if(!plane) return; // ends if plane is null
//     for(let i = 3; i < face.vertices.length; i++){
//         const p = geometry.mesh.vertices[face.vertices[i]];
//         if(pointInPlane(p, plane)){ // add to current subface
//             subFace.push({
//                         vertices:face.vertices[i],
//                         normal: computeFaceNormal(geometry.mesh.vertices, subFace)});

//         }else{// need to draw a new face
//             face.subfaces.push(subFace)
//             subFace.length = 0;
//             subFace = [face.vertices[i-1], face.vertices[i], face.vertices[(i+1) % face.vertices.length]];
//             i++;
//         }
//     }
//     if(subFace.length != face.vertices.length){ // pushing the last subFace to face.subfaces
//         face.subfaces.push(subFace);
//     }
// }

export function updateFace(face){
    face.subfaces = [];
    const verts = face.vertices;

    for(let i = 1; i < verts.length - 1; i++){
        face.subfaces.push({
            id: face.id,
            vertices: [verts[0], verts[i], verts[i+1]],
            normal: computeFaceNormal(
                geometry.mesh.vertices,
                [verts[0], verts[i], verts[i+1]]
            )
        });
    }
}

export function moveDrag(mx, my){
    const axis = interaction.activeAxis;
    if(!axis) return;

    const deltaX = mx - mouse.lastLeft.x;
    const deltaY = my - mouse.lastLeft.y;

    mouse.lastLeft.x = mx;
    mouse.lastLeft.y = my;

    const axisView = rotatePoint(axis.dir, camera.orient); // getting current view of axis
    const screenAxis = { // flattening into x-y
        x: axisView.x, 
        y: -axisView.y
    }

    // Normalizing
    const len = Math.sqrt(screenAxis.x * screenAxis.x + screenAxis.y * screenAxis.y);
    if(len < 0.0001) return;
    const ux = screenAxis.x / len;
    const uy = screenAxis.y / len;

    const projectedDelta = deltaX * ux + deltaY * uy; // projecting mouse movement onto axis

    const dr = projectedDelta * interaction.moveScale;
    const dx = axis.dir.x * dr;
    const dy = axis.dir.y * dr;
    const dz = axis.dir.z * dr;

    moveSelectedVertices(dx, dy, dz);
}

export function deleteSelection(){}

export function addVertex(position){}

export function addEdge(a,b){}

export function addFace(verties){}