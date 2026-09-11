import {state} from "../state.js";
import {subtract, cross, normalize} from "../Math/vector.js";
import {updateFace} from "./operations.js";


export function edgeKey(a, b){ 
    // Edges are refered to by unordered vertex pair -> (1,0) == (0,1)
    // This function prevents duplicates by always sorting key as "low # - high #"
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function addEdge(a, b){ 
    // Attempting to add new edge pair, will only add if unique, otherwise returns index of pre-existing edge
    const mesh = state.geometry.mesh;
    const key = edgeKey(a, b);

    if(mesh.edgeMap.has(key)){ // Edge already exists in the state variable
        return mesh.edgeMap.get(key) // returning index of pre-existing Edge
    }

    const edgeId = mesh.edges.length;
    mesh.edges.push({ // Adding new edge
        id: edgeId, // Index of edge
        vertices: [a, b] // vertices that make edge
    });

    mesh.edgeMap.set(key, edgeId);
    return edgeId; // returns index of newly added edge
}


export function makeBox(cx, cy, cz, sx, sy, sz){
    //Creating a box centered at {cx, cy, cz} with edge lengths {sx, sy, sz}
    //updates state.geometry mesh to include new vertices, edges, and faces
    const {mesh} = state.geometry;

    const dx = sx/2; 
    const dy = sy/2;
    const dz = sz/2;

    const baseVertex = mesh.vertices.length; // Starting id index for vertices

    const verts = [
        {x: cx - dx, y: cy - dy, z: cz - dz},
        {x: cx + dx, y: cy - dy, z: cz - dz},
        {x: cx + dx, y: cy + dy, z: cz - dz},
        {x: cx - dx, y: cy + dy, z: cz - dz},

        {x: cx - dx, y: cy - dy, z: cz + dz},
        {x: cx + dx, y: cy - dy, z: cz + dz},
        {x: cx + dx, y: cy + dy, z: cz + dz},
        {x: cx - dx, y: cy + dy, z: cz + dz}
    ];

    for(const position of verts){ // Updating state.geometry.mesh.vertices 
        mesh.vertices.push({
            id: mesh.vertices.length,
            position: position
        });
    }

    // local index of Vertexes that create each face
    // adjacent indexes == edge
    const faceIndices = [ 
        [0,3,2,1], // back
        [4,5,6,7], // front
        [0,1,5,4], // bottom
        [1,2,6,5], // right
        [2,3,7,6], // top
        [3,0,4,7]  // left
    ];

    for(const localFace of faceIndices){
        const verts = localFace.map(i => i + baseVertex); //converting local index to global
        const edges = [];
        for(let i = 0; i< verts.length; i++){ //converting face vertexes into edge pairs
            const a = verts[i];
            const b = verts[(i+1) % verts.length];
            edges.push(addEdge(a,b)); // attempting to add edge to state.geometry.mesh.edges
        }

        mesh.faces.push({ // updating state.geometry.mesh.faces
            id: mesh.faces.length,
            vertices: verts, 
            normal: computeFaceNormal(mesh.vertices, verts),
            subfaces: []
        });
        updateFace(mesh.faces[mesh.faces.length-1]); // adding triangle subfaces
    }
}

export function getFaceEdges(face){
    //Returns edge pairs in a face
    const edges = []
    for(let i = 0; i < face.vertices.length; i++){
        const a = face.vertices[i]
        const b = face.vertices[(i + 1) % face.vertices.length];

        edges.push([a, b])
    }

    return edges;
}


export function computeFaceNormal(vertices, indices){
    // Finds outward normal of face, requires that vertex indices are preordered properly
    const v0 = vertices[indices[0]].position;
    const v1 = vertices[indices[1]].position;
    const v2 = vertices[indices[2]].position;

    const edge1 = subtract(v1, v0);
    const edge2 = subtract(v2, v0);

    return normalize(cross(edge1, edge2));
}

export function getFacesWithVertices(vertexIds, faces){
    const faceIds = new Set()
    for(const vId of vertexIds){
        for(const face of faces){
            if(face.vertices.includes(vId)){
                faceIds.add(face.id)
            }
        }
    }
    return faceIds;
}

export function addVertex(position){
    const mesh = state.geometry.mesh;

    const vertexId = mesh.vertices.length;

    mesh.vertices.push({
        id: vertexId,
        position: position
    });

    return vertexId;
}