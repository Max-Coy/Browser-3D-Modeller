import {state} from "../state.js";
import {addVertex, addEdge, computeFaceNormal, edgeKey} from "./mesh.js";
import {updateFace} from "./operations.js";
import {updateGizmoCenter} from "../Viewport/gizmo.js";
import {screenPosition} from "../Math/projection.js";
import {projectOntoSegment2D} from "../Math/vector.js";

const {camera, interaction, input, geometry} = state;
const selection = geometry.selection;

export function exitEditing() { 
    geometry.editing.mode = "none";

    updateGizmoCenter();
}
export function enterCutMode() {
    if(selection.mode !== "edge"){
        return;
    }

    // Keep only the first edge selected and discard the rest
    const firstEdge = selection.edges.values().next().value;

    selection.edges.clear();

    if(firstEdge !== undefined){
        selection.edges.add(firstEdge);
    }

    geometry.editing.mode = "cut";

    interaction.gizmoCenter = null;
}

export function cut(position){
    if(geometry.editing.mode !== "cut"){
        return;
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
        10
    );

    if(!closest){
        return;
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

    const vertexId = addVertex(cutPosition);

    const newEdgeId = splitEdge(edge, vertexId);
    selection.edges.add(newEdgeId);
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

// enterCutMode()
// exitEditMode()
// cutEdge()
// extrudeFace()
// deleteVertex()
// deleteEdge()
// deleteFace()
// mergeVertices()