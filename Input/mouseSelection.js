import {state} from "../state.js";
import {deselectVertices, deselectEdges, deselectFaces} from  "../Geometry/selection.js";
import {distToSegmentSquared2D, pointInPolygon} from "../Math/vector.js";
import {screenPosition} from "../Math/projection.js";
import {frame} from "../Render/renderer.js";

const {input, geometry} = state;
const mouse = input.mouse;
const keyboard = input.keyboard;

export function pickVertex(mx, my, vertices){
    //Find The closest Vertex from vertices in X-Y space to the mouse, if it is within the
    //threshold distance then add it to the set of selected vertices
    let closest = null;
    let minDist = Infinity;
    for(const vertex of vertices){
        const screenPos = screenPosition(vertex.position);

        const dx = screenPos.x - mx;
        const dy = screenPos.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if(dist < minDist){
            minDist = dist;
            closest = vertex.id;
        }
    }

    // Only want to select closest vertex if its within a threshold distance
    if(minDist < mouse.pickThreshold){
        const isSelected = geometry.selection.vertices.has(closest); //clicking selected point will deselect
        
        if(!keyboard.keyDown.ControlLeft){// can multiselect by holding ctrl
            deselectVertices(); 
            if(!isSelected){
                geometry.selection.vertices.add(closest); //selects if wasn't selected
            }
        }else{ // multi selecting
            if(!isSelected){
                geometry.selection.vertices.add(closest); 
            }else{
                geometry.selection.vertices.delete(closest); //already selected, deselecting
            }
        }
        
        requestAnimationFrame(frame);
    }else if(!keyboard.keyDown.ControlLeft) { //deselecting if ctrl not held
        deselectVertices();
        requestAnimationFrame(frame);
    }
}

export function boxSelectVertex(x, y, vertices){
    //Allows drag select of vertexes
    const lowerX = Math.min(mouse.lastLeft.x, x);
    const upperX = Math.max(mouse.lastLeft.x, x);
    const lowerY = Math.min(mouse.lastLeft.y, y);
    const upperY = Math.max(mouse.lastLeft.y, y);
    
    //deselecting other vertices if ctrl not held down
    if(!keyboard.keyDown.ControlLeft) deselectVertices(); 

    for(const vertex of vertices){
        //Converting Vertexes to their relative position with the current camera position
        const screenPos = screenPosition(vertex.position);
        
        const insideX = (screenPos.x >= lowerX) && (screenPos.x <= upperX)
        const insideY = (screenPos.y >= lowerY) && (screenPos.y <= upperY)
        if(insideX && insideY){ //Adding all points within box to selected vertices
            geometry.selection.vertices.add(vertex.id);
        }
    }
}

export function pickEdge(mx, my, edges){
    // Find the closest visible edge segment in X-Y space to the mouse.
    // If it is within the threshold distance, select the corresponding edge.

    let closest = null;
    let minDist = Infinity;

    for(const {edge, visibleSegments} of edges){
        for(const [a, b] of visibleSegments){
            const distSqr = distToSegmentSquared2D(
                {x: mx, y: my},
                a,
                b
            );

            if(distSqr < minDist){
                minDist = distSqr;
                closest = edge.id;
            }
        }
    }

    if(minDist < mouse.pickThreshold * mouse.pickThreshold){
        const isSelected = geometry.selection.edges.has(closest);

        if(!keyboard.keyDown.ControlLeft){
            deselectEdges();

            if(!isSelected){
                geometry.selection.edges.add(closest);
            }
        }else{
            if(!isSelected){
                geometry.selection.edges.add(closest);
            }else{
                geometry.selection.edges.delete(closest);
            }
        }
    }else if(!keyboard.keyDown.ControlLeft){
        deselectEdges();
    }

    requestAnimationFrame(frame);
}

export function boxSelectEdge(x, y, edges){
    //Selects edges if both vertices are included in box selection
    const lowerX = Math.min(mouse.lastLeft.x, x);
    const upperX = Math.max(mouse.lastLeft.x, x);
    const lowerY = Math.min(mouse.lastLeft.y, y);
    const upperY = Math.max(mouse.lastLeft.y, y);
    
    //deselecting other vertices if ctrl not held down
    if(!keyboard.keyDown.ControlLeft) deselectEdges(); 

    for(const edge of edges){
        const u = geometry.mesh.vertices[edge.vertices[0]].position;
        const v = geometry.mesh.vertices[edge.vertices[1]].position;

        const u_screenPos = screenPosition(u);
        const v_screenPos = screenPosition(v);
        
        const u_inside = (u_screenPos.x >= lowerX) && (u_screenPos.x <= upperX) &&
                         (u_screenPos.y >= lowerY) && (u_screenPos.y <= upperY);
        const v_inside = (v_screenPos.x >= lowerX) && (v_screenPos.x <= upperX) &&
                         (v_screenPos.y >= lowerY) && (v_screenPos.y <= upperY);
        if(u_inside && v_inside){ //Adding all points within box to selected vertices
            geometry.selection.edges.add(edge.id);
        }
    }
}

export function pickFace(mx, my, faces){
    // Selects a face if the cursor lies inside it
    // expects faces to be ordered by z-height
    for(const {face} of faces){
        const screenPolygon = []
        for(const vertexID of face.vertices){3
            screenPolygon.push(screenPosition(geometry.mesh.vertices[vertexID].position));
        }
        if(pointInPolygon({x:mx, y:my}, screenPolygon)){
            const isSelected = geometry.selection.faces.has(face.id);
            if(!keyboard.keyDown.ControlLeft){ // not multiselecting
                deselectFaces(); 
                if(!isSelected) geometry.selection.faces.add(face.id);
            }else{
                if(!isSelected){
                    geometry.selection.faces.add(face.id);
                }else{
                    geometry.selection.faces.delete(face.id);
                }
            }
            requestAnimationFrame(frame);
            return; // face found, ending loop
        }
    }
    // No intersection was found
    if(!keyboard.keyDown.ControlLeft) deselectFaces();
    requestAnimationFrame(frame);
}


export function boxSelectFace(x, y, faces){
    // Selects a face if it's center lies within selection box
    const lowerX = Math.min(mouse.lastLeft.x, x);
    const upperX = Math.max(mouse.lastLeft.x, x);
    const lowerY = Math.min(mouse.lastLeft.y, y);
    const upperY = Math.max(mouse.lastLeft.y, y);
    
    //deselecting other vertices if ctrl not held down
    if(!keyboard.keyDown.ControlLeft) deselectFaces(); 

    for(const {face} of faces){
        let vx = 0;
        let vy = 0;
        let vz = 0;
        for(const vertexId of face.vertices){
            const vertex = geometry.mesh.vertices[vertexId];
            vx += vertex.position.x;
            vy += vertex.position.y;
            vz += vertex.position.z;
        }
        const center = {x:vx/face.vertices.length,
                        y:vy/face.vertices.length,
                        z:vz/face.vertices.length};

        const screenPos = screenPosition(center);

        const insideX = (screenPos.x >= lowerX) && (screenPos.x <= upperX)
        const insideY = (screenPos.y >= lowerY) && (screenPos.y <= upperY)
        if(insideX && insideY){ //Adding all points within box to selected vertices
            geometry.selection.faces.add(face.id);
        }
    }
}