import {state} from "../state.js";
import {screenPosition} from "../Math/projection.js";
import {rotatePoint} from "../Math/quaternion.js";
import {line, point} from "../Render/renderer.js";
import {dot, distToSegmentSquared2D} from "../Math/vector.js";
import {frame} from "../Render/renderer.js";

const {camera, render, interaction, input, geometry} = state;
const moveGizmo = interaction.moveGizmo;
const mouse = input.mouse;

export function drawMoveGizmo(center){
    // center        // world-space gizmo origin
    // start         // projected 2D center
    // tip3D         // world-space axis endpoint
    // tip           // projected 2D axis endpoint
    // axisScreenDir // projected 2D direction vector

    const start = screenPosition(center);


    const axisDrawData = [];

    for(const axis of moveGizmo.axes){
        const tip3D = {
            x: center.x + axis.dir.x * moveGizmo.length,
            y: center.y + axis.dir.y * moveGizmo.length,
            z: center.z + axis.dir.z * moveGizmo.length
        };

        const tipView = rotatePoint(tip3D, camera.orient);

        const tip = screenPosition(tip3D); // slightly redudant as we are once again calling rotatePoint in this wrapper

        const base3D = {
            x: tip3D.x - axis.dir.x * moveGizmo.capLength,
            y: tip3D.y - axis.dir.y * moveGizmo.capLength,
            z: tip3D.z - axis.dir.z * moveGizmo.capLength
        };

        const base = screenPosition(base3D);

        axisDrawData.push({
            axis,
            tip3D,
            tipView,
            tip,
            base,
            depth: tipView.z
        });
    }
    axisDrawData.sort((a, b) => a.depth - b.depth);

    const overlays = [];
    for(const item of axisDrawData){
        line(start, item.base, moveGizmo.lineWidth, item.axis.color);

        const overlay = drawAxisCap(
                            start,
                            item.tip,
                            item.base,
                            item.axis.dir,
                            item.axis.color
                        );

        if(overlay) overlays.push(overlay);
    }

    for(const drawOverlay of overlays){
        drawOverlay();
    }
}

function drawAxisCap(start, tip, base, axisDir, color){
    const axisView = rotatePoint(axisDir, camera.orient);
    const alignment = dot(axisView, camera.dir);

    if(alignment > moveGizmo.capThreshold){
        return () => drawCircleDot(tip, color);
    }

    if(alignment < -moveGizmo.capThreshold){
        return () => drawCircleCross(start, color);
    }

    drawArrowHead(base, tip, color);
    return null;
}

function drawCircleDot(center, color){
    render.ctx.strokeStyle = color;
    render.ctx.lineWidth = moveGizmo.capWeight; // move to state

    render.ctx.beginPath();
    render.ctx.arc(center.x, center.y, moveGizmo.capRadius, 0, Math.PI * 2);
    render.ctx.stroke();

    render.ctx.fillStyle = color;
    render.ctx.beginPath();
    render.ctx.arc(center.x, center.y, moveGizmo.oDotCenter, 0, Math.PI * 2); // move to state
    render.ctx.fill();
}

function drawCircleCross(center, color){
    render.ctx.strokeStyle = color;
    render.ctx.lineWidth = moveGizmo.capWeight;

    // circle
    render.ctx.beginPath();
    render.ctx.arc(center.x, center.y, moveGizmo.capRadius, 0, Math.PI * 2);
    render.ctx.stroke();

    // x centered exactly on circle center
    render.ctx.beginPath();

    render.ctx.moveTo(center.x - moveGizmo.crossSize, center.y - moveGizmo.crossSize);
    render.ctx.lineTo(center.x + moveGizmo.crossSize, center.y + moveGizmo.crossSize);

    render.ctx.moveTo(center.x - moveGizmo.crossSize, center.y + moveGizmo.crossSize);
    render.ctx.lineTo(center.x + moveGizmo.crossSize, center.y - moveGizmo.crossSize);

    render.ctx.stroke();
}


function drawArrowHead(base, tip, color){
    const dx = tip.x - base.x;
    const dy = tip.y - base.y;

    const len = Math.sqrt(dx*dx + dy*dy);
    if(len < 0.001) return;

    const ux = dx / len;
    const uy = dy / len;

    const px = -uy;
    const py = ux;

    const arrowTip = {
        x: base.x + ux * moveGizmo.arrowLength,
        y: base.y + uy * moveGizmo.arrowLength
    };

    const left = {
        x: base.x + px * moveGizmo.arrowWidth,
        y: base.y + py * moveGizmo.arrowWidth
    };

    const right = {
        x: base.x - px * moveGizmo.arrowWidth,
        y: base.y - py * moveGizmo.arrowWidth
    };

    render.ctx.fillStyle = color;
    render.ctx.beginPath();
    render.ctx.moveTo(arrowTip.x, arrowTip.y);
    render.ctx.lineTo(left.x, left.y);
    render.ctx.lineTo(right.x, right.y);
    render.ctx.closePath();
    render.ctx.fill();
}

export function pickGizmoAxis(mx, my){
    if(!interaction.gizmoCenter) return null; // aborts if no gizmo is currently on screen

    let closest = null;
    let minDist = Infinity;

    const start = screenPosition(interaction.gizmoCenter);
    for(const axis of moveGizmo.axes){
        const tip3D = {
            x: interaction.gizmoCenter.x + axis.dir.x * moveGizmo.length,
            y: interaction.gizmoCenter.y + axis.dir.y * moveGizmo.length,
            z: interaction.gizmoCenter.z + axis.dir.z * moveGizmo.length
        };

        const tip = screenPosition(tip3D);

        const dist = distToSegmentSquared2D({x: mx, y: my}, start, tip);
        if(dist < minDist){
            minDist = dist;
            closest = axis;
        }
    }
    return minDist < moveGizmo.pickThreshold ? closest : null;
}


export function updateGizmoCenter(){
    if(geometry.selection.mode === "vertex"){
        const verts = geometry.selection.vertices;

        if(verts.size === 0){
            interaction.gizmoCenter = null;
            return;
        }

        const firstVertexId = verts.values().next().value;

        interaction.gizmoCenter =
            geometry.mesh.vertices[firstVertexId].position;
    }
    else if(geometry.selection.mode === "edge"){
        const edges = geometry.selection.edges;

        if(edges.size === 0){
            interaction.gizmoCenter = null;
            return;
        }

        const firstEdgeId = edges.values().next().value;
        const edge = geometry.mesh.edges[firstEdgeId];

        const a = geometry.mesh.vertices[edge.vertices[0]].position;
        const b = geometry.mesh.vertices[edge.vertices[1]].position;

        interaction.gizmoCenter = {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            z: (a.z + b.z) / 2
        };
    }
    else if(geometry.selection.mode === "face"){
    const faces = geometry.selection.faces;

    if(faces.size === 0){
        interaction.gizmoCenter = null;
        return;
    }

    const firstFaceId = faces.values().next().value;
    const face = geometry.mesh.faces[firstFaceId];

    let x = 0;
    let y = 0;
    let z = 0;

    for(const vertexId of face.vertices){
        const p = geometry.mesh.vertices[vertexId].position;

        x += p.x;
        y += p.y;
        z += p.z;
    }

    const count = face.vertices.length;

    interaction.gizmoCenter = {
        x: x / count,
        y: y / count,
        z: z / count
    };
}
}

export function getSelectionCenter(){}