// 3D rotation using quaternions
// prevents degenerate rotation states that arise from simple pitch/yaw/roll 3d rotation

export function quatMultiply(q1, q2){
    return{
        w: q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z,
        x: q1.w*q2.x + q1.x*q2.w + q1.y*q2.z - q1.z*q2.y,
        y: q1.w*q2.y - q1.x*q2.z + q1.y*q2.w + q1.z*q2.x,
        z: q1.w*q2.z + q1.x*q2.y - q1.y*q2.x + q1.z*q2.w
    };
}

export function quatFromAxisAngle(axis, angle){
    const half = angle / 2;
    const s = Math.sin(half);
    return{
        w: Math.cos(half),
        x: axis.x * s,
        y: axis.y * s,
        z: axis.z * s
    };
}

export function quatConjugate(q){
    return {w: q.w, x: -q.x, y: -q.y, z: -q.z};
}

export function quatNormalize(q){
    const len = Math.sqrt(q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z);
    return{
        w: q.w / len,
        x: q.x / len,
        y: q.y / len,
        z: q.z / len
    };
}

export function rotatePoint(p, q){
    const pQuat = {w: 0, x: p.x, y: p.y, z: p.z};
    const qConj = quatConjugate(q);

    const result = quatMultiply(
        quatMultiply(q, pQuat),
        qConj
    );

    return {x: result.x, y: result.y, z: result.z};
}