export const state = {
    render: {
        background: "#101010",
        foreground: "green",

        screen: null,
        ctx: null,

        width: 600, // pixel width of screen
        height: 600, // pixel height of screen

        lastTime: 0, // legacy, currently unused?
        FPS: 60, // legacy, currently unused?

        showPoints: true,
        showWireframe: true,
        showFaces: true,
        vanishingView: false, // legacy, currently unused

        faceColor: "rgba(255,255,255,1.0)",

        wireframeWidth: 3,
        wireframeColor: "green",

        selectionBoxWidth: 2,
        selectionBoxColor: "blue",

        vertexSize: 6,
        selectedElementColor: "yellow",
        deselectedVertexColor: "blue"
    },

    camera: {
        orient: {w:1, x:0, y:0, z:0}, // current rotation of viewport
        dir: {x: 0, y:0, z: 1}, // Location of camera
        zoom: 1
    },

    geometry: {
        mesh: {
            vertices: [], // {id, position: {x: #, y: #, z: #}}
            edges: [], // {id, vertices: [a, b]}
            faces: [], // {id, vertices: [index, index, index ...], normal: {x: #, y: #, z:#}, subfaces: []}
            edgeMap: new Map() // index-index, ordered low -> high
        },
        selection: {
            mode: "vertex", // "edge", "face"
            vertices: new Set(),
            edges: new Set(),
            faces: new Set()
        },
        editing: {
            mode: "none" // "cut", "extrude", "delete", "merge", "link"
        }
    },

    input: {
        keyboard: {              // Technically only need to initialize rotation keys, the rest are just for reference
            keyDown: {           // All key rotations are inverted:
                    KeyE: false, // rotate counter-clockwise
                    KeyQ: false, // rotate clockwise
                    KeyW: false, // rotate down
                    KeyS: false, // rotate up
                    KeyD: false, // rotate right
                    KeyA: false, // rotate left
                    KeyF: false, // switch showFaces
                    KeyZ: false, // switch showWireframe
                    KeyV: false, // switch showPoints
                    Digit1: false, // Vertex Selection Mode
                    Digit2: false, // Edge Selection Mode
                    Digit3: false, // Face Selection Mode
                    ControlLeft: false // Multiselect (i.e. don't deselect when selecting new items)
                },
            sensitivity: Math.PI * 0.01 // when rotating with keys
        },

        mouse: {
            sensitivity: 0.005, // when drag rotating
            pickThreshold: 25, // pixel distance for clicking on vertices

            rightIsDragging: false,
            leftIsDragging: false,
            dragMoved: false,

            lastRight: {x:0, y:0},
            lastLeft: {x:0, y:0},

            selectionBox: null
        }
    },
    interaction: {
        moveGizmo: { // drawing the axis arrows for moving elements
            length: 0.4,
            axes: [
                {dir:{x:1, y:0, z:0}, color:"red"}, // x - axis
                {dir:{x:0, y:1, z:0}, color:"green"}, // y
                {dir:{x:0, y:0, z:1}, color:"blue"} // z
            ],
            capLength: 0.08, // Size of axis cap (arrowhead, o-dot, o-cross)
            lineWidth: 4, // weight of axis line
            capThreshold: 0.97, // what viewing angle do we switch from arrowhead to other cap options
            capRadius: 8, // size of circle for o-dot and o-cross cap
            capWeight: 2, // Stroke weight of circle for o-dot and o-cross
            oDotCenter: 2.5, // size of center dot in o-dot cap
            crossSize: 4, // length of lines in o-cross cap
            arrowLength: 10, // length of arrowhead cap
            arrowWidth: 5, // width of arrowhead cap
            pickThreshold: 400 // checking distance squared
        },
        gizmoCenter: null,
        activeAxis: null,
        isMoving: false,
        dragStartMouse: null,
        dragStartPositions: new Map(),
        moveScale: 0.005
    }
};