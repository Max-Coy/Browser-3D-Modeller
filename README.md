# Browser-Based 3D Modeller

A lightweight browser-based 3D modelling application written in JavaScript. This project was created as an exploration of interactive graphics programming, implementing core modelling functionality from scratch without relying on external 3D engines.

**This project is still still currently under progress**

## Features

* Interactive 3D viewport
* Camera controls using keyboard or right-click + drag
* Vertex, edge, and face selection modes
* Independent visibility toggles for vertices, edges, and faces
* Box selection
* Vertex translation/editing
* Modular architecture separating rendering, geometry, input handling, math utilities, and viewport tools

## Project Structure

```
Geometry/   Mesh data structures and editing operations
Input/      Mouse and keyboard controls
Math/       Vector, quaternion, and projection utilities
Render/     Rendering pipeline
Viewport/   Viewport tools and gizmos
```

## Planned Features

* Improve edge rendering
* Support moving selected edges and faces
* Create and delete vertices, edges, and faces
* General polish and usability improvements

## Purpose

This project was primarily built as a learning exercise in computer graphics, geometry processing, and interactive application design. Rather than using an existing modelling framework, the goal was to better understand the underlying algorithms and data structures involved in 3D editing software.

## AI Assistance

This project was developed with assistance from GPT-5.5. The codebase is a combination of handwritten and AI-assisted code. AI was used as a development aid for implementation ideas, debugging, and refactoring, while the overall project design, architecture, and feature implementation were directed and integrated by the author.

## License

Released under the MIT License.
