import {state} from "../state.js";
import {edgeKey} from "./mesh.js";
const {geometry} = state;
const select = geometry.selection;

export function hasSelection(){
    return select.vertices.size > 0 ||
           select.edges.size > 0 ||
           select.faces.size > 0;
}

export function getSelectedVertices(){
    switch(select.mode){
        case "vertex":
            return new Set(select.vertices);
        case "edge":
            return toVertices();
        case "face":
            return toVertices();
    }
}

export function convertSelection(oldMode, newMode){
    if(newMode == "vertex"){ // face/edge -> vertex
        select.mode = "vertex"
        select.vertices = toVertices();
        deselectEdges();
        deselectFaces();
    }else if(newMode == "edge"){ // -> edge
        select.mode = "edge"
        if(oldMode == "vertex"){ // vertex -> edge
            select.edges = verticesToEdges();
            deselectVertices();
        }else if(oldMode == "face"){ // face -> edge
            select.edges = facesToEdges();
            deselectFaces();
        }
    }else{ // -> face
        select.mode = "face"
        if(oldMode == "vertex"){ // vertex -> face
            select.faces = verticesToFaces();
            deselectVertices();
        }else if(oldMode == "edge"){ // edge -> face
            select.faces = edgesToFaces();
            deselectEdges();
        }
    }
}

export function deselectVertices(){
    state.geometry.selection.vertices.clear();
}

export function deselectEdges(){
    state.geometry.selection.edges.clear();
}

export function deselectFaces(){
    state.geometry.selection.faces.clear();
}

function toVertices(){
    // Converts currently selected elements to vertices 
    const out = new Set();

    for(const v of select.vertices){
        out.add(v);
    }

    for(const edgeId of select.edges){
        const edge = geometry.mesh.edges[edgeId];
        for(const vertexId of edge.vertices){
            out.add(vertexId);
        }
    }

    for(const faceId of select.faces){
        const face = geometry.mesh.faces[faceId];
        for(const vertexId of face.vertices){
            out.add(vertexId);
        }
    }

    return out;
}

function facesToEdges(){
    const out = new Set();

    for(const faceId of select.faces){ //faces don't actually store edges so we need to derive from vertices
        const vertices = geometry.mesh.faces[faceId].vertices;
        for(let i = 0; i < vertices.length; i++){
            const edgeId = geometry.mesh.edgeMap.get(edgeKey(vertices[i],vertices[(i+1) % vertices.length]));
            out.add(edgeId);
        }
    }

    return out;
}

function verticesToEdges(){
    const out = new Set();

    for(const edge of geometry.mesh.edges){
        const [a, b] = edge.vertices;
        if(select.vertices.has(a) && select.vertices.has(b)){
            out.add(edge.id);
        }
    }

    return out;
}

function verticesToFaces(){
    const out = new Set();

    for(const face of geometry.mesh.faces){
        const full = face.vertices.every(vertexId => select.vertices.has(vertexId));
        if(full) out.add(face.id);
    }

    return out;
}

function edgesToFaces(){ // faces don't store edges so roundabout approach it is
    select.vertices = toVertices();
    const out = verticesToFaces();
    deselectVertices();
    return out;
}