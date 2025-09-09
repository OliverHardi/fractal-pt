const fragShaderSrc = /*glsl*/`#version 300 es

precision highp float;

// constants
#define PI 3.141592653589793
#define TAU 6.283185307179586

// quality settings
#define NUM_BOUNCES 8

// material settings
#define ALBEDO vec3(0.69, 0.75, 0.54)
#define IOR 1.45
#define TRANSMISSION 0.

// camera settings
#define FOCAL_LEN 1.
#define FOCAL_PLANE 0.5
uniform float uFocalPlane;
#define APERTURE_RADIUS 0.001
uniform float uApertureRadius;
#define RADIAL_BLUR 0.
#define RADIAL_STREAKS 0.

uniform vec2 uResolution;
uniform float uFrame;

uniform mat4 uView;

uniform sampler2D uLastFrame;

uniform sampler2D uHDRI;

out vec4 fragColor;

struct Intersection{
    bool hit;
    bool internal;
    vec3 p;
    vec3 n;
    float t;
};

// inigo quilez hash
uint hash21( uvec2 p ){
    p *= uvec2(73333,7777);
    p ^= (uvec2(3333777777)>>(p>>28));
    uint n = p.x*p.y;
    return n^(n>>15);
}

float hash( uvec2 p ){
    uint h = hash21( p );
    return float(h)*(1.0/float(0xffffffffU));
}

float sdBox ( vec3 p, vec3 s ) {
  p = abs( p ) - s;
  return max( p.x, max( p.y, p.z ) );
}
#define rot(j) mat2(cos(j),-sin(j),sin(j),cos(j))
vec2 Rot2D(vec2 q, float a){
    vec2 cs;
    cs = sin(a + vec2 (0.5 * PI, 0.));
    return vec2(dot(q, vec2 (cs.x, - cs.y)), dot(q.yx, cs));
}
float PrBoxDf(vec3 p, vec3 b){
    vec3 d;
    d = abs(p) - b;
    return min(max(d.x, max (d.y, d.z)), 0.) + length (max (d, 0.));
}

mat2 rotate2D ( float r ) {
    return mat2(cos(r), sin(r), -sin(r), cos(r));
}


vec3 Rotate(vec3 z,float AngPFXY,float AngPFYZ,float AngPFXZ) {
    float sPFXY = sin(radians(AngPFXY)); float cPFXY = cos(radians(AngPFXY));
    float sPFYZ = sin(radians(AngPFYZ)); float cPFYZ = cos(radians(AngPFYZ));
    float sPFXZ = sin(radians(AngPFXZ)); float cPFXZ = cos(radians(AngPFXZ));

    float zx = z.x; float zy = z.y; float zz = z.z; float t;

    // rotate BACK
    t = zx; // XY
    zx = cPFXY * t - sPFXY * zy; zy = sPFXY * t + cPFXY * zy;
    t = zx; // XZ
    zx = cPFXZ * t + sPFXZ * zz; zz = -sPFXZ * t + cPFXZ * zz;
    t = zy; // YZ
    zy = cPFYZ * t - sPFYZ * zz; zz = sPFYZ * t + cPFYZ * zz;
    return vec3(zx,zy,zz);
}

vec2 sdf(vec3 p){
    float circle = length(p) - 2.;
    float orbit = 10000.0;
    
    ${getFractal(0)}

    dist = max(circle, dist);
    // dist = circle;
    return vec2(dist, orbit);
}



Intersection intersectScene(vec3 ro, vec3 rd){

    Intersection intersection;
    intersection.hit = false;

    float t = 0.;
    float num = 0.;
    float minOrbitTrap = 1e10;
    vec2 de = sdf(ro + rd*0.001);
    intersection.internal = de.x < 0.;
    float mult = intersection.internal ? -1. : 1.;
    for(int i = 0; i < 256; i++){
        // float dist = abs(de.x);
        minOrbitTrap = (de.y);
        t += abs(de.x)*0.99;
        if(t > 1e2){ return intersection; }
        if(de.x*mult < 1e-5){ break; }
        de = sdf(ro + t * rd);
        num += 1./512.;
    }

    vec3 p = ro + t * rd;
    // tetrahedron sdf normal approximation
    const float h = 1e-5;
    const vec2 k = vec2(1.,-1.);
    vec3 n = normalize( k.xyy*sdf( p + k.xyy*h ).x + 
                        k.yyx*sdf( p + k.yyx*h ).x + 
                        k.yxy*sdf( p + k.yxy*h ).x + 
                        k.xxx*sdf( p + k.xxx*h ).x );

    intersection.hit = true;
    intersection.p = p;
    intersection.n = n;
    // intersection.t = clamp(minOrbitTrap, 0., 1.);
    intersection.t = minOrbitTrap;
    // intersection.t = num;

    return intersection;
}

vec3 lambert(vec3 n, vec2 Xi){
    float theta = TAU * Xi.x;
    float phi = acos(1. - 2.*Xi.y);
    float sinPhi = sin(phi);
    vec3 p = vec3(sinPhi*cos(theta), sinPhi*sin(theta), cos(phi));
    return normalize(n + p);
}

float fresnel(float costheta, float eta){
    float c = abs(costheta);
    float g = eta * eta - 1. + c * c;
    if(g > 0.){
        g = sqrt(g);
        float A = (g - c) / (g + c);
        float B = (c * (g + c) - 1.) / (c * (g - c) + 1.);
        return 0.5 * A * A * (1. + B * B);
    }else{
        return 1.;
    }
}

bool rejectionTest(vec2 p){
    p = vec2(0.835*p.x, 0.8125*p.y+0.103);
    float t = p.x*p.x + p.y*p.y - 0.5;
    return (t*t*t - p.x*p.x*p.y*p.y*p.y < 0.);
}

vec2 sampleAperture(uvec2 s){
    // for(int i = 0; i < 12; i++){
    //     vec2 p = vec2( hash(s+uvec2(3+i, 9)), hash(s+uvec2(12, 1+i)) )*2.-1.;
    //     if(rejectionTest(p)){
    //         return p;
    //     }
    // }
    // return vec2(0.);

    float theta = TAU * hash(s + uvec2(3, 9));
    float r = pow(hash(s + uvec2(12, 1)), 0.5);
    return vec2(r * cos(theta), r * sin(theta));
}

vec2 rotate(vec2 p, float theta){
    return vec2(cos(theta)*p.x - sin(theta)*p.y, sin(theta)*p.x + cos(theta)*p.y);
}

vec3 sampleHdri(vec3 d){
    float lon = atan(d.z, d.x);
    float lat = asin(d.y);

    float u = 1. - (lon + PI) / (2. * PI);
    float v = (lat + PI*0.5) / PI;

    return texture(uHDRI, vec2(u, v)).rgb;
}



void main(){
    fragColor = vec4(1.);

    uvec2 seed = uvec2(gl_FragCoord.xy + mod(uFrame * vec2(913.27, 719.92), 9382.239));

    vec2 g = gl_FragCoord.xy + (vec2(hash(seed+uvec2(9, 13)), hash(seed+uvec2(13,9)))-0.5);
    vec2 uv = (g/uResolution - vec2(0.5)) * vec2(1., uResolution.y/uResolution.x);
    float luv = dot(uv, uv) * 2.;

    vec3 radiance = vec3(0.);
    vec3 throughput = vec3(1.);

    vec3 apertureLoc = vec3(sampleAperture(seed)*uApertureRadius, 0.);
    float rtheta = hash(seed+uvec2(17, 1))*2.-1.;
    // rtheta = rtheta * rtheta * rtheta;
    vec2 pixelPos = rotate( uv, luv * PI * rtheta * RADIAL_BLUR);
    pixelPos += ((hash(seed+uvec2(6, 7))*2.-1.) * uv) * luv * luv * RADIAL_STREAKS;
    vec3 focalPoint = vec3(pixelPos * uFocalPlane / FOCAL_LEN, uFocalPlane);
    vec3 rd = normalize( focalPoint - apertureLoc);

    // vec3 rd = normalize(vec3(uv * FOCAL_PLANE, FOCAL_LEN * FOCAL_PLANE) - vec3(apertureLoc * apertureRadius, 0.));
    
    rd = mat3(uView) * rd;
    vec3 ro = uView[3].xyz + mat3(uView) * apertureLoc;

    for(int i = 0; i < NUM_BOUNCES; i++){
        // radiance = vec3(length(uv)); break;

        Intersection intersection = intersectScene(ro, rd);
        if(!intersection.hit){
            // vec3 sky = mix(vec3(0.02, 0.05, 0.15), vec3(0.7, 0.9, 1.1), 0.5+0.5*dot(rd, vec3(0., 1., 0.)));
            // sky = mix(sky, rd*0.5+0.5, 0.3);
            // radiance += throughput * sky;
            vec3 sky = i == 0 ? vec3(0.) : sampleHdri(rd);
            // vec3 sky = sampleHdri(rd);
            radiance += throughput * sky;
            break;
        }

        // radiance = intersection.t < 1. ? vec3(1.) : vec3(0.); break;

        vec3 normal = intersection.n * (intersection.internal ? -1. : 1.);
        // radiance = normal*0.5+0.5; break;

        float rayIOR = mix(1.0, IOR, intersection.internal);
        float surfaceIOR = mix(IOR, 1.0, intersection.internal);
        float eta = surfaceIOR/rayIOR;


        float cosTheta = dot(rd, normal);
        float fresnel = fresnel(cosTheta, eta);

        vec3 wo = vec3(0.);

        float flip = 1.;
        bool isSpecular = false;

        float sinTheta = sqrt(1.- cosTheta*cosTheta);
        if( hash(seed + uvec2(2, 0)) < fresnel || (sinTheta / eta) > 1. ){
            wo = reflect(rd, normal);
            isSpecular = true;
        }else{
            if( hash(seed+uvec2(8, 1)) < TRANSMISSION ){
                flip = -1.;
                wo = refract(rd, normal, 1./eta);
            }else{
                wo = lambert( normal,  vec2(hash(seed+uvec2(17, 3)), hash(seed+uvec2(27, 1))) );
            }
        }

        // radiance += intersection.t < 0.5 ? vec3(0.6, 0.55, 0.34) : vec3(0.);

        // radiance += mix(vec3(1.), vec3(0.), intersection.t);
        // vec3 alb = mix(vec3(0.7, 0.01, 0.04), vec3(0.4, 0.16, 0.72), intersection.t);
        throughput *= mix(ALBEDO, vec3(1.), float(isSpecular));

        float rr = throughput.x + throughput.y + throughput.z;
        rr = clamp(rr * 1.333, 0., 1.);
        if(hash(seed+uvec2(8, 31)) > rr){
            break;
        }
        throughput /= rr;

        ro = intersection.p + normal * 5e-4 * flip;
        rd = wo;
    }
    

    radiance = max(radiance, vec3(0.));
    vec3 lastFrame = texture(uLastFrame, gl_FragCoord.xy/uResolution).rgb;
    fragColor.rgb = (radiance + lastFrame*uFrame)/(uFrame+1.);
}

`;


const postShaderSrc = /*glsl*/`#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform sampler2D uTex;

vec3 aces(vec3 x){
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main(){
    vec3 col = texture(uTex, gl_FragCoord.xy/uResolution).rgb;

    col = aces(col);

    col = pow(col, vec3(1./2.2));

    fragColor = vec4(col, 1.);
}


`;
