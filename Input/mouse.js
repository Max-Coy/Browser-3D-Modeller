import {state} from "../state.js";
import {frame, getVisibleFaces, getVisibleEdges, getVisibleVertices} from "../Render/renderer.js";
import {normalize, distToSegmentSquared2D, pointInPolygon} from "../Math/vector.js";
import {quatFromAxisAngle, quatMultiply, quatNormalize, rotatePoint} from "../Math/quaternion.js";
import {screenPosition} from "../Math/projection.js";
import {deselectVertices, deselectEdges, deselectFaces, hasSelection} from "../Geometry/selection.js";
import {pickGizmoAxis, updateGizmoCenter} from "../Viewport/gizmo.js";
import {moveDrag} from "../Geometry/operations.js";
const {render, input, geometry, camera, interaction} = state;
const mouse = input.mouse;
const keyboard = input.keyboard;


export function setupMouse(){
    //Adds listeners for mouse actions, to be used in main.init()
    render.screen.addEventListener("contextmenu", (e) => e.preventDefault()); //Disabling default right click
    render.screen.addEventListener("dragstart", (e) => e.preventDefault()); //Disabling default drag click
    render.screen.addEventListener("selectstart", (e) => e.preventDefault()); //Disabling default right click
    render.screen.addEventListener("mousedown", handleMouseDown);
    render.screen.addEventListener("mouseup", handleMouseUp);
    render.screen.addEventListener("mousemove", handleMouseMove);
}

function handleMouseDown(event){
    switch(event.button){
        case 0: { //Left Mouse Down
            mouse.leftIsDragging = true;
            mouse.dragMoved = false; 
            event.preventDefault();
            const rect = render.screen.getBoundingClientRect();
            const mx = event.clientX - rect.left;
            const my = event.clientY - rect.top;
            mouse.lastLeft.x = mx;
            mouse.lastLeft.y = my;
            if(hasSelection()) interaction.activeAxis = pickGizmoAxis(mx, my);
            break;
        }case 2: {//Right Mouse Down
            mouse.rightIsDragging = true;
            event.preventDefault();
            mouse.lastRight.x = event.clientX;
            mouse.lastRight.y = event.clientY;
            break;
        }
    }
}

function handleMouseUp(event){
    switch(event.button){
        case 0: { //Left Mouse Up
            if(interaction.activeAxis){
                interaction.activeAxis = null;
                mouse.leftIsDragging = false;
                mouse.selectionBox = null;
            }else{
                elementSelect(event);
            }
            break;
        }case 2: { //Right Mouse Up
            mouse.rightIsDragging = false;
            break;
        }
    }
}

function handleMouseMove(event){
    if(mouse.leftIsDragging){ 
        mouse.dragMoved = true; // Disables click selection
        const rect = render.screen.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        if(interaction.activeAxis){ // we are moving with gizmo
            moveDrag(mx, my);
        }else{ //we are drag selecting
            mouse.selectionBox = { //update selection box
                x1: mouse.lastLeft.x,
                y1: mouse.lastLeft.y,
                x2: mx,
                y2: my
            };
            requestAnimationFrame(frame); // redraw updated selection box
        }
        
    }
    if(mouse.rightIsDragging) //we are drag rotating
    {
        mouseRotate(event.clientX, event.clientY);
    }
}

function elementSelect(event){
    const rect = render.screen.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    switch(geometry.selection.mode){
        case "vertex":
            let vertices;
            if(render.showFaces){ //Need to use only visible vertices
                const visibleFaces = getVisibleFaces();
                vertices = getVisibleVertices(visibleFaces);
            }else{
                vertices = geometry.mesh.vertices;
            }
            if(mouse.dragMoved){ //We have just drag selected, now select points in box
                boxSelectVertex(mx, my, vertices);
            }else{ //We have just clicked, attempt to select vertex
                pickVertex(mx, my, vertices);
            }
            break;

        case "edge":
            let edges;
            if(render.showFaces){ // need to use only visible edges
                const visibleFaces = getVisibleFaces();
                edges = getVisibleEdges(visibleFaces);
            }else{
                edges = geometry.mesh.edges;
            }
            if(mouse.dragMoved){
                boxSelectEdge(mx, my, edges);
            }else{
                pickEdge(mx, my, edges);
            }
            break;

        case "face":
            if(mouse.dragMoved){
                boxSelectFace(mx, my, getVisibleFaces());
            }else{
                pickFace(mx, my, getVisibleFaces());
            }
            break;
    }

    mouse.leftIsDragging = false;
    mouse.selectionBox = null;

    if(geometry.selection.mode == "vertex"){
        updateGizmoCenter();
    }

    requestAnimationFrame(frame);
}


function pickEdge(mx, my, edges){
    //Find The closest Edge in X-Y space to the mouse, if it is within the
    //threshold distance then add it to the set of selected edges
    let closest = null;
    let minDist = Infinity;
    for(const edge of edges){
        const u = geometry.mesh.vertices[edge.vertices[0]].position;
        const v = geometry.mesh.vertices[edge.vertices[1]].position;

        const u_screenPos = screenPosition(u);
        const v_screenPos = screenPosition(v);

        const distSqr = distToSegmentSquared2D({x: mx, y: my}, u_screenPos, v_screenPos);
        if(distSqr < minDist){
            minDist = distSqr;
            closest = edge.id;
        }
    }

    if(minDist < mouse.pickThreshold*mouse.pickThreshold){
        const isSelected = geometry.selection.edges.has(closest); //clicking selected edge will deselect
        
        if(!keyboard.keyDown.ControlLeft){// can multiselect by holding ctrl
            deselectEdges(); 
            if(!isSelected){
                geometry.selection.edges.add(closest); //selects if wasn't selected
            }
        }else{ // multi selecting
            if(!isSelected){
                geometry.selection.edges.add(closest); 
            }else{
                geometry.selection.vertices.delete(closest); //already selected, deselecting
            }
        }
    }else if(!keyboard.keyDown.ControlLeft) { //deselecting if ctrl not held
        deselectEdges();   
    }
    requestAnimationFrame(frame);
}

function boxSelectEdge(x, y, edges){
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

function pickFace(mx, my, faces){
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

// if(!keyboard.keyDown.ControlLeft){// can multiselect by holding ctrl
//     deselectEdges(); 
//     if(!isSelected){
//         geometry.selection.edges.add(closest); //selects if wasn't selected
//     }
// }else{ // multi selecting
//     if(!isSelected){
//         geometry.selection.edges.add(closest); 
//     }else{
//         geometry.selection.vertices.delete(closest); //already selected, deselecting
//     }
// }

function boxSelectFace(x, y, faces){
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

function pickVertex(mx, my, vertices){
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

function boxSelectVertex(x, y, vertices){
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

function mouseRotate(x, y){
    //Allows right click drag rotation of viewport
    const dx = x - mouse.lastRight.x;
    const dy = y - mouse.lastRight.y;

    mouse.lastRight.x = x;
    mouse.lastRight.y = y;

    const yawAxis = {x:0, y:1, z:0};
    const rightAxis = normalize(rotatePoint({x:1, y:0, z:0}, camera.orient));

    const qYaw = quatFromAxisAngle(yawAxis, -dx * mouse.sensitivity);
    const qPitch = quatFromAxisAngle(rightAxis, -dy * mouse.sensitivity);

    camera.orient = quatMultiply(qPitch, quatMultiply(qYaw, camera.orient));
    camera.orient = quatNormalize(camera.orient);

    requestAnimationFrame(frame);
}