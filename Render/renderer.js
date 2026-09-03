import {state} from "../state.js";
import {rotatePoint} from "../Math/quaternion.js";
import {convert, project, screenPosition} from "../Math/projection.js";
import {getFaceEdges, edgeKey} from "../Geometry/mesh.js";
import {drawMoveGizmo} from "../Viewport/gizmo.js";
import {pointInPolygon, segmentPolygonIntersections, lerp, lerp2D, faceDepthAtPoint} from "../Math/vector.js";


const {render, input, geometry, camera, interaction} = state;
const mouse = input.mouse;
const keyboard = input.keyboard;



function clear(){
    //Draw a blank canvas
    render.ctx.fillStyle = render.background;
    render.ctx.fillRect(0,0,render.screen.width, render.screen.height);
}

export function point({x, y}){
    // Render a point at coordinates x, y
    render.ctx.beginPath();
    render.ctx.arc(x,y,render.vertexSize,0,Math.PI*2);
    render.ctx.fill();
}

export function line(p1, p2, width, color){
    // Draw a line from point p1 to p2
    render.ctx.lineWidth = width;
    render.ctx.strokeStyle = color;
    render.ctx.beginPath();
    render.ctx.moveTo(p1.x, p1.y);
    render.ctx.lineTo(p2.x, p2.y);
    render.ctx.stroke();
}

function drawVertices(vertices){
    // Draw All Vertices in the scene (no z-ordering)
    const verts = [];
    for(const vertex of vertices){
        const rp = rotatePoint(vertex.position, camera.orient);
        const p = convert(project(rp), render.screen.width, render.screen.height);
        const selected = geometry.selection.vertices.has(vertex.id)
        verts.push({p:p,
                    selected: selected,
                    rp:rp});

    verts.sort((a, b) => a.rp.z - b.rp.z); // z ordering 
    for(const {p, selected} of verts){
        if(selected)
        {
            render.ctx.fillStyle = render.selectedElementColor;
        }else{
            render.ctx.fillStyle = render.deselectedVertexColor;
        }
        point(p);
        }
    }
}

// function drawWireframe(edges){
//     // Draw edge outline of mesh
//     for(let i = 0; i < edges.length; i++){

//         const a = geometry.mesh.vertices[edges[i].vertices[0]].position;
//         const b = geometry.mesh.vertices[edges[i].vertices[1]].position;

//         const ca = screenPosition(a);
//         const cb = screenPosition(b);
//         if(geometry.selection.edges.has(edges[i].id)){
//             line(ca, cb, render.wireframeWidth, render.selectedElementColor);
//         }else{
//             line(ca, cb, render.wireframeWidth, render.foreground);
//         }
        
//     }
// }

function drawSegmentedWireframe(segmentedEdges){
    for(const {edge, visibleSegments} of segmentedEdges){
        let color = (geometry.selection.edges.has(edge.id)) ? render.selectedElementColor : render.foreground;
        for(const [a, b] of visibleSegments){
            line(a, b, render.wireframeWidth, color);
        }
    }
}

function isFaceVisible(face){
    // return true;
    const rotatedNormal = rotatePoint(face.normal, camera.orient)
    return rotatedNormal.z > 0; // camera view is from positive z -> negative z means face is pointing away
}

function averageFaceDepth(face){
    // Finds the average z depth of vertices that make a face
    let sum = 0;
    for(const idx of face.vertices){
        const p = rotatePoint(geometry.mesh.vertices[idx].position, camera.orient);
        sum += p.z;
    }

    return sum / face.vertices.length;
}

function drawFace(face, fillStyle){
    // Draw a single face element
    const points = face.vertices.map(index => //Getting location of vertices in current view
        screenPosition(geometry.mesh.vertices[index].position))

    render.ctx.fillStyle = fillStyle;
    render.ctx.beginPath(); // drawing the face

    render.ctx.moveTo(points[0].x, points[0].y);

    for(let i = 1; i < points.length; i++){
        render.ctx.lineTo(points[i].x, points[i].y);
    }

    render.ctx.closePath();
    render.ctx.fill();
}

function drawFaces(visibleFaces){
    // Takes output from getVisibleFaces()
    // renders all visible faces using drawFace()
    for(const {face} of visibleFaces){
        if(geometry.selection.faces.has(face.id)){
            drawFace(face, render.selectedElementColor);
        }else{
            drawFace(face, render.faceColor);
        } 
    }
}

export function getVisibleFaces(){
    // Returns visible subfaces ordered by z-depth
    const visibleFaces = geometry.mesh.faces
        .flatMap(face =>
            face.subfaces
                .filter(isFaceVisible)
                .map(subface => ({
                    face: subface,
                    depth: averageFaceDepth(subface)
                }))
        )
        .sort((a, b) => b.depth - a.depth);

    return visibleFaces;
}

function clipEdgeAgainstFaces(edge, visibleFaces){
    const ae = geometry.mesh.vertices[edge.vertices[0]].position;
    const be = geometry.mesh.vertices[edge.vertices[1]].position;

    const ra = rotatePoint(ae, camera.orient);
    const rb = rotatePoint(be, camera.orient);

    const a = screenPosition(ae);
    const b = screenPosition(be);

    const cuts = [0, 1];

    // Store each visible face in both camera and screen space
    const faces = visibleFaces.map(({face}) => ({
        face: face,
        cameraPoints: face.vertices.map(id =>
            rotatePoint(
                geometry.mesh.vertices[id].position,
                camera.orient
            )
        ),
        screenPoints: face.vertices.map(id =>
            screenPosition(geometry.mesh.vertices[id].position)
        )
    }));

    // Add intersections between the edge and visible faces
    for(const {screenPoints} of faces){
        const intersections =
            segmentPolygonIntersections(a, b, screenPoints);

        for(const t of intersections){
            cuts.push(t);
        }
    }

    cuts.sort((a, b) => a - b);

    const uniqueCuts = [];
    const eps = 1e-6;

    for(const t of cuts){
        if(
            uniqueCuts.length === 0 ||
            Math.abs(t - uniqueCuts[uniqueCuts.length - 1]) > eps
        ){
            uniqueCuts.push(t);
        }
    }

    const visibleSegments = [];

    for(let i = 0; i < uniqueCuts.length - 1; i++){
        const t0 = uniqueCuts[i];
        const t1 = uniqueCuts[i + 1];

        const midpoint = lerp2D(a, b, (t0 + t1) / 2);
        const edgePoint = lerp(ra, rb, (t0 + t1) / 2);

        let occluded = false;

        for(const {screenPoints, cameraPoints} of faces){

            // Find the corresponding point in camera space.
            const facePoint = {
                x: edgePoint.x,
                y: edgePoint.y
            };

            const faceDepth =
                faceDepthAtPoint(facePoint, cameraPoints);

            if(faceDepth === null){
                continue;
            }

            // Only consider the face if the edge point is inside it.
            if(!pointInPolygon(midpoint, screenPoints)){
                continue;
            }

            // The face is closer to the camera than the edge.
            if(faceDepth > edgePoint.z + eps){
                occluded = true;
                break;
            }
        }

        if(!occluded){
            visibleSegments.push([
                lerp2D(a, b, t0),
                lerp2D(a, b, t1)
            ]);
        }
    }

    return visibleSegments;
} 

export function getVisibleEdges(visibleFaces, visibleVertices){
    const visibleVertexIds = new Set(
        visibleVertices.map(vertex => vertex.id)
    );

    const visibleFaceIds = new Set();

    // Collect unique parent faces
    for(const {face} of visibleFaces){
        visibleFaceIds.add(face.id);
    }

    const visibleEdgeIds = new Set();

    // Collect edges belonging to visible faces
    for(const faceId of visibleFaceIds){
        const meshFace = geometry.mesh.faces[faceId];

        for(const [a, b] of getFaceEdges(meshFace)){
            const edgeId = geometry.mesh.edgeMap.get(edgeKey(a, b));

            if(edgeId !== undefined){
                visibleEdgeIds.add(edgeId);
            }
        }
    }

    // Only retain edges whose endpoints are both visible
    const visibleEdges = [...visibleEdgeIds]
        .map(id => geometry.mesh.edges[id])
        .filter(edge => {
            const [a, b] = edge.vertices;

            return visibleVertexIds.has(a) &&
                   visibleVertexIds.has(b);
        });

    return visibleEdges.map(edge => ({
        edge: edge,
        visibleSegments: clipEdgeAgainstFaces(edge, visibleFaces)
    }));
}

function drawWireframe(segmentedEdges){
    for(const {edge, visibleSegments} of segmentedEdges){
        const color =
            geometry.selection.edges.has(edge.id)
                ? render.selectedElementColor
                : render.foreground;

        for(const [a, b] of visibleSegments){
            line(a, b, render.wireframeWidth, color);
        }
    }
}

export function getVisibleVertices(visibleFaces){
    const visibleVertexIds = new Set(); // set of all vertices attached to visible faces
    for(const{face} of visibleFaces){
        for(const vertex of face.vertices){
            visibleVertexIds.add(vertex);
        }
    }
    const visibleVertices = [...visibleVertexIds].map(id => state.geometry.mesh.vertices[id]); // convert ids to vertices
    
    const output = [];

    for(const vertex of visibleVertices){
        const vertexScreen = screenPosition(vertex.position)
        const vertexCamera = rotatePoint(vertex.position, camera.orient);

        let obscured = false;

        for(const {face, depth} of visibleFaces){
            // A face cannot obscure its own vertices
            if(face.vertices.includes(vertex.id)){
                continue;
            }

            // only consider faces closer to the camera
            if(depth <= vertexCamera.z){
                continue;
            }

            const polygon = face.vertices.map(id => screenPosition(geometry.mesh.vertices[id].position));
            
            if(pointInPolygon(vertexScreen, polygon)){
                obscured = true;
                break;
            }
        }

        if(!obscured){
            output.push(vertex)
        }
    }

    return output;
}

function drawSelectionBox(){
    // Draw drag selection box on the canvas
    const {x1, y1, x2, y2} = mouse.selectionBox;

    render.ctx.strokeStyle = render.selectionBoxColor; 
    render.ctx.lineWidth = render.selectionBoxWidth; 

    render.ctx.beginPath();
    render.ctx.rect(x1, y1, x2-x1, y2-y1);
    render.ctx.stroke()
}

export function frame() {
        clear()
    
        if(render.showFaces){
            const visibleFaces = getVisibleFaces();
            const visibleVertices = getVisibleVertices(visibleFaces);
            const visibleEdges = getVisibleEdges(visibleFaces, visibleVertices);
            const reversedFaces = [...visibleFaces].reverse();
            
            drawFaces(reversedFaces); // faces are ordered by height but we should draw the lowest first to prevent clipping
            
            if(render.showWireframe) drawWireframe(visibleEdges); // prevents wireframe overlap
            if(render.showPoints) drawVertices(visibleVertices); // prevents vertex overlap
            

        }else{
            if(render.showWireframe) { //draws all wireframes
                const segmentedEdges = geometry.mesh.edges.map(edge => {
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

            drawWireframe(segmentedEdges);
            } 
            if(render.showPoints) drawVertices(geometry.mesh.vertices); //draws all vertices
        }
        
        if(mouse.selectionBox) drawSelectionBox(); // draw drag selection box

        if(interaction.gizmoCenter){
            drawMoveGizmo(interaction.gizmoCenter);
        }
}
