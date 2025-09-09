const fractals = [

/*glsl*/` // 0 - tubes
vec3 tpos=p;
tpos.xz=abs(.5-mod(tpos.xz,1.));
vec4 p0=vec4(tpos,1.);
float y=max(0.,.35-abs(p.y-3.35))/.35;
for (int i=0; i<7; i++) {
    p0.xyz = abs(p0.xyz)-vec3(-0.02,1.98,-0.02);
    p0=p0*(2.0+0.*y)/clamp(dot(p0.xyz,p0.xyz),.4,1.)-vec4(0.5,1.,0.4,0.);
    p0.xz*=mat2(-0.416,-0.91,0.91,-0.416);

    orbit = min( orbit, length(p0.xyz - vec3(10., 0., -10.))*0.001);
}
float dist = (length(max(abs(p0.xyz)-vec3(0.1,5.0,0.1),vec3(0.0)))-0.05)/p0.w;
`,
/*glsl*/` // 1 - menger
vec3 b;
float r, a;
const float nIt = 8., sclFac = 2.4;
b = (sclFac - 1.) * vec3 (1., 1.125, 0.625);
r = length (p.xz);
a = (r > 0.) ? atan (p.z, - p.x) / (2. * PI) : 0.;
p.x = mod (16. * a + 1., 2.) - 1.;
p.z = r - 32. / (2. * PI);
p.yz = Rot2D(p.yz, PI * a);
for (float n = 0.; n < nIt; n ++) {
    p = abs (p);
    p.xy = (p.x > p.y) ? p.xy : p.yx;
    p.xz = (p.x > p.z) ? p.xz : p.zx;
    p.yz = (p.y > p.z) ? p.yz : p.zy;
    p = sclFac * p - b;
    p.z += b.z * step (p.z, -0.5 * b.z);
}
float dist = 0.8 * PrBoxDf (p, vec3 (1.)) / pow (sclFac, nIt);
`,
/*glsl*/` // 2 - flowers
float Scale = 1.34;
float FoldY = 1.025709;
float FoldX = 1.025709;
float FoldZ = 0.035271;
float JuliaX = -1.763517;
float JuliaY = 0.392486;
float JuliaZ = -1.734913;
float AngX = -51.080209;
float AngY = 0.0;
float AngZ = -29.096322;
float Offset = -3.036726;
bool EnableOffset = true;
int Iterations = 80;
float Precision = 1.0;

float u2 = 1.;
float v2 = 1.;
if(EnableOffset){ p = Offset+abs(vec3(p.x,p.y,p.z)); }

vec3 p0 = vec3(JuliaX,JuliaY,JuliaZ);
float l = 0.0;
int i=0;
for (i=0; i<Iterations; i++) {
    p = Rotate(p,AngX,AngY,AngZ);
    p.x=abs(p.x+FoldX)-FoldX;
    p.y=abs(p.y+FoldY)-FoldY;
    p.z=abs(p.z+FoldZ)-FoldZ;
    p=p*Scale+p0;
    l=length(p);
    float rr = dot(p,p);
    orbit = min(orbit, rr);
}
float dist = Precision*(l)*pow(Scale, -float(i));
`

]

    // vec3 tpos=pos;
    // tpos.xz=abs(.5-mod(tpos.xz,1.));
    // vec4 p=vec4(tpos,1.);
    // float y=max(0.,.35-abs(pos.y-3.35))/.35;
    // for (int i=0; i<7; i++) {
    //     p.xyz = abs(p.xyz)-vec3(-0.02,1.98,-0.02);
    //     p=p*(2.0+0.*y)/clamp(dot(p.xyz,p.xyz),.4,1.)-vec4(0.5,1.,0.4,0.);
    //     p.xz*=mat2(-0.416,-0.91,0.91,-0.416);

    //     orbit = min( orbit, length(p.xyz - vec3(10., 0., -10.))*0.001);
    // }
    // float dist = (length(max(abs(p.xyz)-vec3(0.1,5.0,0.1),vec3(0.0)))-0.05)/p.w;

function getFractal(i){
    return fractals[i];
}