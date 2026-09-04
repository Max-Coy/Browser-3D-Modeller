import {state} from "../state.js";
import {screenPosition} from "../Math/projection.js";
import {rotatePoint} from "../Math/quaternion.js";
import {line, point} from "../Render/renderer.js";
import {dot, distToSegmentSquared2D, threePointPlane, pointInPlane} from "../Math/vector.js";
import {frame} from "../Render/renderer.js";
import {getFacesWithVertices, computeFaceNormal} from "./mesh.js";
import {updateGizmoCenter} from "../viewport/gizmo.js";

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

export function moveSelectedEdges(dx, dy, dz){
    const affectedVertices = new Set();

    for(const edgeId of geometry.selection.edges){
        const edge = geometry.mesh.edges[edgeId];

        for(const vertexId of edge.vertices){
            affectedVertices.add(vertexId);
        }
    }

    for(const vertexId of affectedVertices){
        const p = geometry.mesh.vertices[vertexId].position;

        p.x += dx;
        p.y += dy;
        p.z += dz;
    }

    const oldFaces = getFacesWithVertices(
        [...affectedVertices],
        geometry.mesh.faces
    );

    for(const faceId of oldFaces){
        updateFace(geometry.mesh.faces[faceId]);
    }

    updateGizmoCenter();
    
    requestAnimationFrame(frame);
}

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

    if(state.geometry.selection.mode === "vertex"){
         moveSelectedVertices(dx, dy, dz);
    }
   else if(state.geometry.selection.mode === "edge"){
        moveSelectedEdges(dx, dy, dz);
   }
}



export function deleteSelection(){}

export function addVertex(position){}

export function addEdge(a,b){}

export function addFace(verties){}