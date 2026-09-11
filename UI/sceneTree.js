import {state} from "../state.js";

const sceneTree = document.getElementById("scene-tree");
const sceneTreeHeader = document.getElementById("scene-tree-header");
const sceneTreeContent = document.getElementById("scene-tree-content");


export function initSceneTree() {

    sceneTreeHeader.addEventListener("click", () => {
        sceneTree.classList.toggle("collapsed");
    });

    updateSceneTree();
}

export function updateSceneTree() {

    const treeState = getTreeState();

    sceneTreeContent.innerHTML = "";

    const vertices = createTreeNode(
    `Vertices (${state.geometry.mesh.vertices.length})`,
    createVertexNodes(),
    "vertices"
    );

    const edges = createTreeNode(
        `Edges (${state.geometry.mesh.edges.length})`,
        createEdgeNodes(),
        "edges"
    );

    const faces = createTreeNode(
        `Faces (${state.geometry.mesh.faces.length})`,
        createFaceNodes(),
        "faces"
    );

    const mesh = createTreeNode(
        "Mesh",
        [vertices, edges, faces],
        "mesh"
    );

    sceneTreeContent.appendChild(mesh);

    restoreTreeState(treeState);
}


function createTreeNode(label, children = [], treeId = null) {

    const node = document.createElement("div");
    node.classList.add("tree-node");

    if (treeId) {
        node.dataset.treeId = treeId;
    }

    const row = document.createElement("div");
    row.classList.add("tree-row");

    if (children.length > 0) {

        const arrow = document.createElement("span");
        arrow.classList.add("tree-arrow");
        arrow.textContent = "▸";

        row.appendChild(arrow);

        row.addEventListener("click", () => {
            node.classList.toggle("expanded");
        });

    } else {

        row.addEventListener("click", () => {
            // Selection will go here later
        });
    }

    const labelElement = document.createElement("span");
    labelElement.classList.add("tree-label");
    labelElement.textContent = label;

    row.appendChild(labelElement);

    const childContainer = document.createElement("div");
    childContainer.classList.add("tree-children");

    for (const child of children) {
        childContainer.appendChild(child);
    }

    node.appendChild(row);
    node.appendChild(childContainer);

    return node;
}

function createVertexNodes() {

    const vertexNodes = [];

    const sigFigs = 3;

    for (const vertex of state.geometry.mesh.vertices) {

        const position = vertex.position;

        const label = `Vertex ${vertex.id}: 
                    (${vertex.position.x.toFixed(sigFigs)}, 
                    ${vertex.position.y.toFixed(sigFigs)}, 
                    ${vertex.position.z.toFixed(sigFigs)})`;

        const node = createTreeNode(
            label
        );

        vertexNodes.push(node);
    }

    return vertexNodes;
}

function createEdgeNodes() {

    const edgeNodes = [];

    for (const edge of state.geometry.mesh.edges) {

        const node = createTreeNode(
            `Edge ${edge.id} [${edge.vertices[0]}, ${edge.vertices[1]}]`
        );

        edgeNodes.push(node);
    }

    return edgeNodes;
}

function createFaceNodes() {

    const faceNodes = [];

    for (const face of state.geometry.mesh.faces) {

        const node = createTreeNode(`Face ${face.id}`);

        faceNodes.push(node);
    }

    return faceNodes;
}

function getTreeState() {

    const treeState = {};

    const nodes = sceneTreeContent.querySelectorAll(".tree-node");

    for (const node of nodes) {

        const treeId = node.dataset.treeId;

        if (treeId) {
            treeState[treeId] = node.classList.contains("expanded");
        }
    }

    return treeState;
}

function restoreTreeState(treeState) {

    const nodes = sceneTreeContent.querySelectorAll(".tree-node");

    for (const node of nodes) {

        const treeId = node.dataset.treeId;

        if (treeId in treeState) {
            node.classList.toggle("expanded", treeState[treeId]);
        }
    }
}