import {state} from "../state.js";
import {frame, getVisibleFaces, getVisibleEdges, getVisibleVertices} from "../Render/renderer.js";
import {normalize} from "../Math/vector.js";
import {quatFromAxisAngle, quatMultiply, quatNormalize, rotatePoint} from "../Math/quaternion.js";
import {screenPosition} from "../Math/projection.js";
import {hasSelection} from "../Geometry/selection.js";
import {pickGizmoAxis, updateGizmoCenter} from "../Viewport/gizmo.js";
import {moveDrag} from "../Geometry/operations.js";
import {cut, getCutPosition, getFaceCutPosition} from "../Geometry/editing.js";
import {updateSceneTree} from "../UI/sceneTree.js";
import {pickVertex, pickEdge, pickFace, boxSelectVertex, boxSelectEdge, boxSelectFace} from "./mouseSelection.js";

const {render, input, geometry, camera, interaction} = state;
const mouse = input.mouse;

export function setupMouse(){
    //Adds listeners for mouse actions, to be used in main.init()
    render.screen.addEventListener("contextmenu", (e) => e.preventDefault()); //Disabling default right click
    render.screen.addEventListener("dragstart", (e) => e.preventDefault()); //Disabling default drag click
    render.screen.addEventListener("selectstart", (e) => e.preventDefault()); //Disabling default right click
    render.screen.addEventListener("mousedown", handleMouseDown);
    render.screen.addEventListener("mouseup", handleMouseUp);
    render.screen.addEventListener("wheel", handleMouseScroll)
    render.screen.addEventListener("mousemove", handleMouseMove);
}

function handleMouseScroll(event) {
    camera.zoom = Math.max(0.1, camera.zoom - (event.deltaY * mouse.zoomSensitivity));
    requestAnimationFrame(frame);
}

function getCanvasMousePosition(event) {
    const rect = render.screen.getBoundingClientRect();

    const scaleX = render.screen.width / rect.width;
    const scaleY = render.screen.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function handleMouseDown(event){
    switch(event.button){
        case 0: { //Left Mouse Down
            mouse.leftIsDragging = true;
            mouse.dragMoved = false; 
            event.preventDefault();
            const { x: mx, y: my } = getCanvasMousePosition(event);

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
    const { x: mx, y: my } = getCanvasMousePosition(event);

    if(mouse.leftIsDragging){ 
        mouse.dragMoved = true; // Disables click selection
        
        if(interaction.activeAxis){ // we are moving with gizmo
            moveDrag(mx, my);
            updateSceneTree();
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

    if(geometry.editing.mode === "cut" && !mouse.leftIsDragging){
        const cut = getCutPosition({x: mx, y: my});

        geometry.editing.previewPosition = cut 
            ? cut.position
            : null;

        requestAnimationFrame(frame);
    }

    if(geometry.editing.mode === "faceCut" && !mouse.leftIsDragging){

        const cut = getFaceCutPosition({
            x: mx,
            y: my
        });

        geometry.editing.previewPosition = cut
            ? cut.position
            : null;

        requestAnimationFrame(frame);
    }
}

function elementSelect(event){
    const { x: mx, y: my } = getCanvasMousePosition(event);

    if(geometry.editing.mode === "cut"){
        cut({x: mx, y: my, z: 0});

        mouse.leftIsDragging = false;
        mouse.selectionBox = null;

        requestAnimationFrame(frame);
        updateSceneTree();
        return;
    }
    else if(geometry.editing.mode === "faceCut") {
        const cut = getFaceCutPosition({x: mx, y: my})

        mouse.leftIsDragging = false;
        mouse.selectionBox = null;

        if(cut){
            geometry.editing.faceCutVertices.push(cut);
            geometry.editing.previewPosition = null;

            requestAnimationFrame(frame);
        }

        return;
    }

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
            let selectableEdges;
            if(render.showFaces){ // need to use only visible edges
                const visibleFaces = getVisibleFaces();
                const visibleVertices = getVisibleVertices(visibleFaces);
                edges = getVisibleEdges(visibleFaces, visibleVertices);
                selectableEdges = edges.map(({edge}) => edge);
            }else{ 
                edges = geometry.mesh.edges.map(edge => { // need to segment edges for pickedge function
                    const a = screenPosition(
                        geometry.mesh.vertices[edge.vertices[0]].position
                    );
                    const b = screenPosition(
                        geometry.mesh.vertices[edge.vertices[1]].position
                    );

                    return {
                        edge: edge,
                        visibleSegments: [[a, b]]
                    };
                });

                selectableEdges = geometry.mesh.edges;
            }
            if(mouse.dragMoved){
                boxSelectEdge(mx, my, selectableEdges);
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

    
    updateGizmoCenter();

    requestAnimationFrame(frame);
}


function mouseRotate(x, y){
    //Allows right click drag rotation of viewport
    const dx = x - mouse.lastRight.x;
    const dy = y - mouse.lastRight.y;

    mouse.lastRight.x = x;
    mouse.lastRight.y = y;

    const yawAxis = {x:0, y:1, z:0};
    const rightAxis = normalize(rotatePoint({x:1, y:0, z:0}, {w:1, x:0, y:0, z:0})); 

    const qYaw = quatFromAxisAngle(yawAxis, -dx * mouse.sensitivity);
    const qPitch = quatFromAxisAngle(rightAxis, -dy * mouse.sensitivity);

    camera.orient = quatMultiply(qPitch, quatMultiply(qYaw, camera.orient));
    camera.orient = quatNormalize(camera.orient);

    requestAnimationFrame(frame);
}