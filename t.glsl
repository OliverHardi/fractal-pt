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




float pickRandom(){
    seed += uvec2(3, 1);
    return hash(seed);
}

#define PI 3.14159265358979323846
#define TAU 2.*PI

vec3 sampleHemisphere(vec3 n){
    float theta = pickRandom() * 2. * PI;
    float phi = pickRandom() * 2. * PI;
    vec3 p = vec3(cos(theta) * sin(phi), sin(theta) * sin(phi), cos(phi));
    p += n;
    return normalize(p);
}


uvec2 seed = uvec2(0);

uvec2 getSeed(){
    return uvec2(gl_FragCoord.xy + mod(uFrame * vec2(913.27, 719.92), 9382.239));
}

void main(){
    seed = getSeed();
    // stuff here
}


vec3 wo;

float fresnel = fresnel(dot(rd, normal), 1.5);
// radiance = vec3(fresnel); break;
bool isReflection = false;
if(pickRandom() < fresnel){
    wo = reflect(rd, normal);
    isReflection = true;
}else{
    wo = sampleHemisphere(normal);
}



throughput *= 