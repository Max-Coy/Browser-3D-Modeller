export function normalize(v){
    //Returns norm of 3D vector
    const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    return{
        x: v.x / len,
        y: v.y / len,
        z: v.z / len
    };
}

export function translate({x, y, z}, dx, dy, dz){
    //Move a 3D point by dx, dy, dz respectively
    return {x: x + dx, y: y + dy, z: z + dz};
}

export function add(a, b){
    //3D vector addition
    return{
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    }
}

export function subtract(a, b){
    //3D vector subtraction
    return{
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    }
}

function scale(u, t){
    return{
        x: u.x * t,
        y: u.y * t,
        z: u.z * t
    }
}

export function cross(a, b){
    //3D cross product
    return {
        x: a.y*b.z - a.z*b.y,
        y: a.z*b.x - a.x*b.z,
        z: a.x*b.y - a.y*b.x
    };
}

export function dot(a, b){
    //3D dot product
    return a.x*b.x + a.y*b.y + a.z*b.z;
}

function sqr(x){
    return x*x;
}
function dist2(u, v){
    //2D distance
    return Math.sqrt(sqr(u.x - v.x) + sqr(u.y - v.y));
}
function subtract2(u,v){
    //2D vector subtraction
    return{
        x: u.x - v.x,
        y: u.y - v.y,
    }
}

function add2(u,v){
    //2D vector subtraction
    return{
        x: u.x + v.x,
        y: u.y + v.y,
    }
}

function scale2(u, t){
    return{
        x: u.x * t,
        y: u.y * t
    }
}

function dot2(u, v){
    //2D dot product
    return u.x*v.x + u.y*v.y;
}

function determinant2D(u, v){
    return u.x * v.y - u.y * v.x; 
}

export function distToSegmentSquared2D(p, u, v){
    //Returns squared distance of point to 2D line segement
    //Define our line as: u + t * (u - v) where t is a scalar
    //Projection of p onto line is when t = [(p-u) . (v - u)] / |v-u|^2
    //Then just find distance to projection, unless it is outside of segment, then use closest vertex
    const uv = subtract2(v, u);   // segment direction
    const up = subtract2(p, u);   // mouse relative to segment start

    const len2 = dot2(uv, uv);    // |v-u|^2

    if(len2 === 0){
        return dot2(up, up);
    }

    let t = dot2(up, uv) / len2;
    t = Math.max(0, Math.min(1, t)); // Clamping to [0,1] to only allow projections on segment

    const closest = { // Either a point on segment or one of the segment ends
        x: u.x + t * uv.x,
        y: u.y + t * uv.y
    };

    const d = subtract2(p, closest);
    return dot2(d, d);
}

export function projectOntoSegment2D(p, u, v){
    const uv = subtract2(v, u);
    const up = subtract2(p, u);

    const len2 = dot2(uv, uv);

    if(len2 === 0){
        return {
            point: {x: u.x, y: u.y},
            t: 0,
            distanceSquared: dot2(up, up)
        };
    }

    const t = dot2(up, uv) / len2;

    const point = {
        x: u.x + t * uv.x,
        y: u.y + t * uv.y
    };

    const d = subtract2(p, point);

    return {
        point: point,
        t: t,
        distanceSquared: dot2(d, d)
    };
}

export function pointInPolygon(p, polygon){
    let inside = false;
    let eps = 1e-6; // tolerance for laying on the edge

    for(let i = 0; i < polygon.length; i++){
        const j = (i + 1) % polygon.length;

        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        // Checking whether p lies on the edge
        const cross = (p.x - xi) * (yj - yi)
                    - (p.y - yi) * (xj - xi)

        const onSegment = Math.abs(cross) < eps &&
                        p.x >= Math.min(xi, xj) - eps &&
                        p.x <= Math.max(xi, xj) + eps &&
                        p.y >= Math.min(yi, yj) - eps &&
                        p.y <= Math.max(yi, yj) + eps;

        if(onSegment){
            return false; // not including vertices that lay on the edge
        }

        // Checking if inside polygon
        const crossesY =
            (yi > p.y) !== (yj > p.y);

        if(crossesY){
            const intersectX =
                xi + (p.y - yi) * (xj - xi) / (yj - yi);

            if(p.x < intersectX){
                inside = !inside;
            }
        }
    }

    return inside;
}

export function segmentPolygonIntersections(a, b, polygon){
    // Finds the points at which a parameterized line from a -> b intersects a polygon
    const eps = 1e-6;
    const r = subtract2(b, a);
    const intersections = [];
    for(let i = 0; i < polygon.length; i++){
        const u = polygon[i];
        const v = polygon[(i+1) % polygon.length];

        const s = subtract2(v, u);
        const denom = determinant2D(r, s);
        if(denom == 0) continue; // line segments are parallel

        const ua = subtract2(u, a);
        let t = determinant2D(ua, s) / denom;
        const t_prime = determinant2D(ua, r) / denom;
        if(0 <= t && t <= 1 && 0 <= t_prime && t_prime <= 1){
            if(Math.abs(t) < eps) t = 0;
            if(Math.abs(t - 1) < eps) t = 1;
            intersections.push(t);
        }
    }

    return intersections.sort((a,b) => a - b);
}

export function lerp2D(a, b, t){
    // Linear interpolation 2D
    // Parameterizes a line between points a, b and returns the value at t
    // P(t) = a + t * (b - a); if t in [0,1] then it is on the line segment [a,b]
    const m = subtract2(b, a);
    return add2(a, scale2(m, t));
}

export function lerp(a, b, t){
    // 3D linear interpolation
    const m = subtract(b, a);
    return add(a, scale(m, t));
}

export function threePointPlane(p0, p1, p2){
    // Constructs the plane equation: Ax + By + Cz + D = 0 
    // using 3 points
    const v = subtract(p1, p0);
    const w = subtract(p2, p0);

    let normal = cross(v,w);
    // ensuring points aren't collinear
    if(normal.x === 0 && normal.y === 0 && normal.z === 0){
        return null;
    } 

    
    normal = normalize(normal);

    const d = -dot(normal, p0);
    return{a: normal.x,
           b: normal.y,
           c: normal.z,
           d: d};
}

export function pointInPlane(p, plane){
    // Checks to see if a point lies within a 3d plane
    return (plane.a * p.x + plane.b * p.y + plane.d * p.z + plane.d) == 0;
}

export function faceDepthAtPoint(point, cameraPoints){
    const plane = threePointPlane(
        cameraPoints[0],
        cameraPoints[1],
        cameraPoints[2]
    );

    if(!plane || Math.abs(plane.c) < 1e-8){
        return null;
    }

    return -(plane.a * point.x +
             plane.b * point.y +
             plane.d) / plane.c;
}