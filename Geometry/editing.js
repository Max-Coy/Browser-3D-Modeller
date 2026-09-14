import {state} from "../state.js";
import {addVertex, addEdge, computeFaceNormal, edgeKey, getFaceEdges} from "./mesh.js";
import {updateFace} from "./operations.js";
import {updateGizmoCenter} from "../Viewport/gizmo.js";
import {screenPosition} from "../Math/projection.js";
import {projectOntoSegment2D, pointInPolygon, faceDepthAtPoint} from "../Math/vector.js";
import {rotatePoint, quatConjugate} from "../Math/quaternion.js";

const {camera, interaction, input, geometry, render} = state;
const selection = geometry.selection;

export function exitEditing() { 
    geometry.editing.mode = "none";
    geometry.editing.previewPosition = null;

    updateGizmoCenter();
}

export function enterCutMode() {
    if(selection.mode === "edge"){
        enterEdgeCutMode();
    }
    else if(selection.mode === "face") {
        enterFaceCutMode();
    }
    else {
        return;
    }
}

function enterEdgeCutMode() {
    // Keep only the first edge selected and discard the rest
    const firstEdge = selection.edges.values().next().value;

    selection.edges.clear();

    if(firstEdge === undefined){
        return;
    }

    selection.edges.add(firstEdge);

    geometry.editing.mode = "cut";

    interaction.gizmoCenter = null;
}

function enterFaceCutMode() {
    const firstFace = selection.faces.values().next().value;

    selection.faces.clear();

    if(firstFace === undefined){
        return;
    }

    selection.faces.add(firstFace);

    const face = geometry.mesh.faces.find(
        face => face.id === firstFace
    );

    if(!face){
        return;
    }

    const faceEdgePairs = getFaceEdges(face);

    selection.edges.clear();

    for(const [a, b] of faceEdgePairs){
        const key = edgeKey(a, b);
        const edge = geometry.mesh.edgeMap.get(key);

        if(edge){
            selection.edges.add(edge.id);
        }
    }

    geometry.editing.mode = "faceCut";
    geometry.editing.faceCutVertices = [];
    geometry.editing.faceCutEdges = [];
    geometry.editing.previewPosition = null;

    interaction.gizmoCenter = null;
}

export function cut(position){
    
    const cut = getCutPosition(position);

    if(!cut){
        return;
    }

    const vertexId = addVertex(cut.position);

    const newEdgeId = splitEdge(cut.edge, vertexId);

    selection.edges.add(newEdgeId);
}

export function getCutPosition(position){
    if(geometry.editing.mode !== "cut"){
        return null;
    }

    const selectedEdges = [...selection.edges]
        .map(edgeId =>
            geometry.mesh.edges.find(edge => edge.id === edgeId)
        )
        .filter(edge => edge !== undefined);

    const closest = findClosestEdge(
        position.x,
        position.y,
        selectedEdges,
        geometry.editing.cutThreshold
    );

    if(!closest){
        return null;
    }

    const edge = closest.edge;
    const t = closest.t;

    const u = geometry.mesh.vertices[edge.vertices[0]].position;
    const v = geometry.mesh.vertices[edge.vertices[1]].position;

    const cutPosition = {
        x: u.x + t * (v.x - u.x),
        y: u.y + t * (v.y - u.y),
        z: u.z + t * (v.z - u.z)
    };

    return {
        position: cutPosition,
        edge: edge
    };
}

export function findClosestEdge(mx, my, edges, threshold){
    const mousePosition = {x: mx, y: my};

    let closest = null;
    let minDist = Infinity;

    for(const edge of edges){
        const u = screenPosition(
            geometry.mesh.vertices[edge.vertices[0]].position
        );

        const v = screenPosition(
            geometry.mesh.vertices[edge.vertices[1]].position
        );

        const projection = projectOntoSegment2D(
            mousePosition,
            u,
            v
        );

        // Projection lies outside the actual edge
        if(projection.t < 0 || projection.t > 1){
            continue;
        }

        // Mouse is too far from the edge
        if(projection.distanceSquared > threshold * threshold){
            continue;
        }

        if(projection.distanceSquared < minDist){
            minDist = projection.distanceSquared;

            closest = {
                edge: edge,
                t: projection.t,
                point: projection.point
            };
        }
    }

    return closest;
}

function splitEdge(edge, vertexId){
    const mesh = geometry.mesh;
    const [a, b] = edge.vertices;

    // Remove the old edge from the edge map
    mesh.edgeMap.delete(edgeKey(a, b));

    // Modify the existing edge to become A-C
    edge.vertices = [a, vertexId];

    // Add the new A-C mapping using the existing edge ID
    mesh.edgeMap.set(edgeKey(a, vertexId), edge.id);

    // Add C-B as a new edge
    const newEdgeId = addEdge(vertexId, b);

    // Update faces containing the original A-B edge
    for(const face of mesh.faces){
        insertVertexIntoFace(face, a, b, vertexId);
    }

    return newEdgeId;
}

function insertVertexIntoFace(face, a, b, vertexId){
    const verts = face.vertices;

    for(let i = 0; i < verts.length; i++){
        const current = verts[i];
        const next = verts[(i + 1) % verts.length];

        if(
            (current === a && next === b) ||
            (current === b && next === a)
        ){
            face.vertices.splice(i + 1, 0, vertexId);

            face.normal = computeFaceNormal(
                geometry.mesh.vertices,
                face.vertices
            );

            updateFace(face);

            return;
        }
    }
}

export function getFaceCutPosition(position){
    if(geometry.editing.mode !== "faceCut"){
        return null;
    }

    const faceCutVertices = geometry.editing.faceCutVertices;

    const face = geometry.mesh.faces.find(
        face => face.id === selection.faces.values().next().value
    );

    if(!face){
        return null;
    }

    const faceEdgePairs = getFaceEdges(face);

    const faceEdges = faceEdgePairs
        .map(([a, b]) => {
            const edgeId = geometry.mesh.edgeMap.get(edgeKey(a, b));

            if(edgeId === undefined){
                return undefined;
            }

            return geometry.mesh.edges[edgeId];
        })
        .filter(edge => edge !== undefined);

    const closest = findClosestEdge(
        position.x,
        position.y,
        faceEdges,
        geometry.editing.cutThreshold
    );

    if(closest){
        const previous = faceCutVertices.at(-1);

        // Don't allow two consecutive points on the same edge
        if(!previous || previous.edge?.id !== closest.edge.id){
            const edge = closest.edge;
            const t = closest.t;

            const u = geometry.mesh.vertices[edge.vertices[0]].position;
            const v = geometry.mesh.vertices[edge.vertices[1]].position;

            const cutPosition = {
                x: u.x + t * (v.x - u.x),
                y: u.y + t * (v.y - u.y),
                z: u.z + t * (v.z - u.z)
            };

            return {
                position: cutPosition,
                edge: edge
            };
        }
    }

    if(faceCutVertices.length === 0){
        return null;
    }

    // No edge was close enough and/or valid, so check whether
    // the mouse is inside the face.
    const cameraPoints = face.vertices.map(vertexId =>
        rotatePoint(
            geometry.mesh.vertices[vertexId].position,
            camera.orient
        )
    );

    const polygon = cameraPoints.map(point => ({
        x: point.x * camera.zoom + render.screen.width / 2,
        y: -point.y * camera.zoom + render.screen.height / 2
    }));

    if(!pointInPolygon(position, polygon)){
        return null;
    }

    const cameraPoint = {
        x: (position.x - render.screen.width / 2) / camera.zoom,
        y: -(position.y - render.screen.height / 2) / camera.zoom,
        z: 0
    };

    cameraPoint.z = faceDepthAtPoint(
        cameraPoint,
        cameraPoints
    );

    if(cameraPoint.z === null){
        return null;
    }

    const worldPoint = rotatePoint(
        cameraPoint,
        quatConjugate(camera.orient)
    );

    return {
        position: worldPoint,
        edge: null
    };
}
// extrudeFace()
// deleteVertex()
// deleteEdge()
// deleteFace()
// mergeVertices()