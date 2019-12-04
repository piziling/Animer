#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_slot1;

const float lineJitter = 0.5;
const float lineWidth = 10.0;
const float gridWidth = 1.7;
const float scale = 0.0013;
const float Samples = 5.;

float timeProgress;
vec2 circlePos = vec2(0.);
float circleRadius = 0.0008;
float mStartVelocity = 3000.;
float mFriction = 0.56;
float mStiffness = 300.;
float mDampingRatio = 0.078;
float mVelocity = 0.;
float mFactor = 0.3;
bool reset = false;
float mDuration = 10.;
// t/d timeProgress,t currentTime
vec4 bezierPoint = vec4(0.725,0.011,0.398,1.000);
float mCustomTension = 0.;
float mCustomFriction = 0.;

int duration_mode = 2;

#define mFunction CubicBezierSimulator

float rand (in vec2 co) {
    return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}


float computeDampingRatio(in float tension,in float friction) {
	float myMass = 1.0;
	return friction / (2. * sqrt(myMass * tension));
}

float computeTFSpringDuration(in float tension,in float friction) {
	float durationFactor = 2.;
	float epsilon = 0.001;
	float velocity = 0.0;
	float myMass = 1.0;
	float dampingRatio = computeDampingRatio(tension, friction);
	float undampedFrequency = sqrt(tension / myMass);
	if (dampingRatio < 1.) {
		float a = sqrt(1. - pow(dampingRatio, 2.));
		float b = velocity / (a * undampedFrequency);
		float c = dampingRatio / a;
		float d = -((b - c) / epsilon);
		if (d <= 0.) {
			return 0.0;
		}
		return log(d) / (dampingRatio * undampedFrequency);
	} else {
		return 0.0;
	}
}

float computeSDSpringDuration(in float stiffness,in float dampingRatio) {
	float durationFactor = 2.;
	float epsilon = 0.001;
	float velocity = 0.0;
	float myMass = 1.0;
	float undampedFrequency = sqrt(stiffness / myMass);
	if (dampingRatio < 1.) {
		float a = sqrt(1. - pow(dampingRatio, 2.));
		float b = velocity / (a * undampedFrequency);
		float c = dampingRatio / a;
		float d = -((b - c) / epsilon);
		if (d <= 0.) {
			return 0.0;
		}
		return log(d) / (dampingRatio * undampedFrequency);
	} else {
		return 0.0;
	}
}

vec2 calculateFling(in float velocity,in float friction){
	float mRealFriction = friction*-4.2;

    for (float i = 1./60.;i < 4.;i += 1./60.){
        float currentVelocity = velocity * exp(i * mRealFriction) ;
        float currentTransition = (velocity/ mRealFriction) * (exp(mRealFriction * i ) - 1.);
		float speedThereshold = 2.3;

        if(abs(currentVelocity) <=  speedThereshold){
            return vec2(i,currentTransition);
        }
        else{
            continue;
            //console.log('transitionVal is: ' + valTransition + 'currentVelocity is: ' + mFlingVelocity + 'currentFrame is: ' + Math.round(i*60));
        }

    }
}




float FlingSimulator(in float time){
    vec2 flingCalc = calculateFling(mStartVelocity,mFriction);
    float startVal = 0.; 
    float deltaT = time * flingCalc.x;
    float mRealFriction = mFriction*(-4.2); 
    float valTransition =  (0. - mStartVelocity/mRealFriction) + ( mStartVelocity/ mRealFriction) * (exp(mRealFriction * deltaT ) );
    float mLastVal = valTransition/flingCalc.y; 
    return mLastVal/2.;
}



float SpringSimulator(in float time){
    float deltaT = time*1. * computeSDSpringDuration(mStiffness,mDampingRatio); 
    float starVal = 0.; 
    float endVal = 1.; 
    float mNaturalFreq = sqrt(mStiffness); 
    float mDampedFreq = mNaturalFreq*sqrt(1.0 - mDampingRatio* mDampingRatio); 
    float lastVelocity =  mVelocity; 
    float lastDisplacement  = time*1. - endVal; 
    float coeffB = 1.0 / mDampedFreq * (mDampingRatio * mNaturalFreq * lastDisplacement + lastVelocity); 
    float displacement = pow(2.718281828459045,-mDampingRatio * mNaturalFreq * deltaT) * (lastDisplacement * cos(mDampedFreq * deltaT) + coeffB * sin(mDampedFreq * deltaT)); 
    float mValue = displacement + endVal; 
    return mValue/2.+0.;
}



float CubicBezierSimulator(in float time) {
    if (time > 1.0) {
        return 1.;
    } else if(time < 0.){
        return 0.;
    }
    float x = time;
    float z;
    vec2 c,b,a;
    for (int i = 1; i < 20; i++) {
        c.x = 3. * bezierPoint[0];
        b.x = 3. * (bezierPoint[2] - bezierPoint[0]) - c.x;
        a.x = 1. - c.x - b.x;
        z = x * (c.x + x * (b.x + x * a.x)) - time;
        if (abs(z) < 1e-3) {
            break;
        }
        x -= z / (c.x + x * (2. * b.x + 3. * a.x * x));
    }

    c.y = 3. * bezierPoint[1];
    b.y = 3. * (bezierPoint[3] - bezierPoint[1]) - c.y;
    a.y = 1. - c.y - b.y;
    float mValue = x * (c.y + x * (b.y + x * a.y));

    return mValue/1.;
}



float AccelerateInterpolator(in float time){
    if (mFactor == 1.0) {
        return time * time;
    } else {
        return pow(time, 2.*mFactor);
    }
}

float DecelerateInterpolator(in float time) {
    if (time == 1.0) {
        return (1.0 - (1.0 - time) * (1.0 - time))*0.9;
    } else {
        return (1.0 - pow((1.0 - time), 2.0 * mFactor))*0.9;
    }
    return time;
}

float LinearInterpolator(in float time){
    return time;
}

float AccelerateDecelerateInterpolator(in float time){
    return (cos((time + 1.) * 3.1415926) / 2.0) + 0.5;
}

float AnticipateInterpolator(in float time){
	return time * time * ((mFactor + 1.) * time - mFactor);
}

float OverShootInterpolator(float time) {
    time -= 1.0;
    return time * time * ((mFactor + 1.) * time + mFactor) + 1.0;
}

float AOSIA(float t, float s) {
    return t * t * ((s + 1.) * t - s);
}

float AOSIO(float t, float s) {
    return t * t * ((s + 1.) * t + s);
}


float AnticipateOverShootInterpolator(float time) {
    float t = time;
    if (t < 0.5) return 0.5 * AOSIA(t * 2.0, mFactor*1.5);
    else return 0.5 * (AOSIO(t * 2.0 - 2.0, mFactor*1.5) + 2.0);
}

float BounceInterpolator(in float time){
    float t= time;
    t *= 1.1226;
    if (t < 0.3535) return t * t * 8.0;
    else if (t < 0.7408) return (t - 0.54719)*(t - 0.54719)*8. + 0.7;
    else if (t < 0.9644) return (t - 0.8526)*(t - 0.8526)*8. + 0.9;
    else return (t - 1.0435)*(t - 1.0435)*8. + 0.95;
}

float CycleInterpolator(in float time) {
    float mValue = sin(2. * mFactor * 3.1415926 * time);
    return mValue/2. + 0.5;
}

float FastOutLinearInterpolator(in float time){
    bezierPoint = vec4(0.40,0.00,1.00,1.00);
    return CubicBezierSimulator(time);
}

float FastOutSlowInInterpolator(in float time){
    bezierPoint = vec4(0.40,0.00,0.20,1.00);
    return CubicBezierSimulator(time);
}

float LinearOutSlowInInterpolator(in float time){
    bezierPoint = vec4(0.00,0.00,0.20,1.00);
    return CubicBezierSimulator(time);
}

float CustomSpringInterpolator(in float ratio) {
    if (ratio == 0.0 || ratio == 1.0)
        return ratio/2.;
    else {

        float value = (pow(2., -10. * ratio) * sin((ratio - mFactor / 4.0) * (2.0 * 3.1415926) / mFactor) + 1.);
        return value/2.;
    }
}



float CustomBounceInterpolator(in float ratio){
    float amplitude = 1.;
    float phase = 0.;
    float originalStiffness = 12.;
    float originalFrictionMultipler = 0.3;
    float mass = 0.058;
    float maxStifness = 50.;
    float maxFrictionMultipler = 1.;
    
    float aTension = min(max(mCustomTension,0.),100.) * (maxStifness- originalStiffness)/100.;
    float aFriction = min(max(mCustomFriction,0.),100.) * (maxFrictionMultipler - originalFrictionMultipler)/100.;
    
 	float pulsation = sqrt((originalStiffness + aTension) / mass);
    float friction = (originalFrictionMultipler + aFriction) * pulsation;
    
    if (ratio == 0.0 || ratio == 1.0)
        return ratio/2.;
    else {
        float value = amplitude * exp(-friction * ratio) * cos(pulsation * ratio + phase) ;
        return (-abs(value)+1.)/2.;
    }
}

float CustomDampingInterpolator(in float ratio){
    float amplitude = 1.;
    float phase = 0.;
    float originalStiffness = 12.;
    float originalFrictionMultipler = 0.3;
    float mass = 0.058;
    float maxStifness = 50.;
    float maxFrictionMultipler = 1.;
    
    float aTension = min(max(mCustomTension,0.),100.) * (maxStifness- originalStiffness)/100.;
    float aFriction = min(max(mCustomFriction,0.),100.) * (maxFrictionMultipler - originalFrictionMultipler)/100.;
    
 	float pulsation = sqrt((originalStiffness + aTension) / mass);
    float friction = (originalFrictionMultipler + aFriction) * pulsation;
    
    if (ratio == 0.0 || ratio == 1.0)
        return ratio/2.;
    else {
        float value = amplitude * exp(-friction * ratio) * cos(pulsation * ratio + phase) ;
        return (-(value)+1.)/2.;
    }
}


float mMocosTension = 100.;
float mMocosFriction = 15.;
float mMocosVelocity = 0.;

float CustomMocosSpringInterpolator(in float ratio) {
    if (ratio >= 1.) {
        return 1./2.;
    }
    
    float tension = mMocosTension;
    float damping = mMocosFriction;
    float velocity = mMocosVelocity;
    
    float mEps = 0.001;
    float mGamma,mVDiv2,mB,mA,mMocosDuration;

    bool mOscilative = (4. * tension - damping * damping > 0.);
    if (mOscilative) {
        mGamma = sqrt(4. * tension - damping * damping) / 2.;
        mVDiv2 = damping / 2.;
        mB = atan(-mGamma / (velocity - mVDiv2));
        mA = -1. / sin(mB);
        mMocosDuration = log(abs(mA) / mEps) / mVDiv2;
    } else {
        mGamma = sqrt(damping * damping - 4. * tension) / 2.;
        mVDiv2 = damping / 2.;
        mA = (velocity - (mGamma + mVDiv2)) / (2. * mGamma);
        mB = -1. - mA;
        mMocosDuration = log(abs(mA) / mEps) / (mVDiv2 - mGamma);
    }
    
    
    float t = ratio * mMocosDuration;
    if(mOscilative){
        return (mA * exp(-mVDiv2 * t) * sin(mGamma * t + mB) + 1.)/2.;
    }
    else{
        return (mA * exp((mGamma - mVDiv2) * t) + mB * exp(-(mGamma + mVDiv2) * t) + 1.)/2.;
    }
}


vec3 plot2D(in vec2 _st, in float _width ) {
    const float samples = float(Samples);

    vec2 steping = _width*vec2(scale)/samples;

    float count = 0.0;
    float mySamples = 0.0;
    for (float i = 0.0; i < samples; i++) {
        for (float j = 0.0;j < samples; j++) {
            if (i*i+j*j>samples*samples) 
                continue;
            mySamples++;
            float ii = i + lineJitter*rand(vec2(_st.x+ i*steping.x,_st.y+ j*steping.y));
            float jj = j + lineJitter*rand(vec2(_st.y + i*steping.x,_st.x+ j*steping.y));

            float f = mFunction((_st.x+ ii*steping.x) )-(_st.y+ jj*steping.y);
            count += (f>0.0) ? 1. : -1.0 ;
        }
    }
    
    
    vec3 color = vec3(1.0);
    if (abs(count)!=mySamples)
        return color = vec3(abs(float(count))/float(mySamples));
    return color ;
}

vec3 grid2D( in vec2 _st, in float _width ) {
    float axisDetail = _width*scale;
    if (abs(_st.x)<axisDetail || abs(_st.y)<axisDetail) 
        //return 1.0-vec3(0.65,0.65,1.0);
    if (abs(mod(_st.x,1.0))<axisDetail || abs(mod(_st.y,1.0))<axisDetail) 
        return 1.0-vec3(0.80,0.80,1.0);
    if (abs(mod(_st.x,0.25))<axisDetail || abs(mod(_st.y,0.25))<axisDetail) 
        return 1.0-vec3(0.95,0.95,1.0);
    return vec3(0.0);
}

float circle(in vec2 _st, in float _radius){
    vec2 dist = _st-vec2(0.5);
	return 1.-smoothstep(_radius-(_radius*0.01),_radius+(_radius*0.01),dot(dist,dist)*4.0);
}



void main(){
    vec2 st = (gl_FragCoord.xy/u_resolution.xy);
    vec2 uv = (gl_FragCoord.xy/u_resolution.xy);
    
    //#Scale
    st.x *= u_resolution.x/u_resolution.y;
    float mScale = 0.5;
    st.x *= 1./mScale;
    st.x -= (1./mScale - 1.)/2.;
 	st.y *= 1./mScale;
    st.y -= (1./mScale - 1.)/2.;

    timeProgress = min(u_time,1.);
    
    //#trigger
    if(!reset){
        //computeSDSpringDuration(mStiffness,mDampingRatio)
        mDuration = (duration_mode == 0)? calculateFling(mStartVelocity,mFriction)[0] :((duration_mode == 1)?computeSDSpringDuration(mStiffness,mDampingRatio):mDuration );
        timeProgress = min(mod(u_time,mDuration)/mDuration,1.);
    }
    
    //#animator
    // mDampingRatio = 0.5*max(u_slot1,0.01);
    // mFactor = 2.*u_slot1;
    // bezierPoint[0] = 0.5+u_slot1*0.5;
    // bezierPoint[1] = 0.5-u_slot1*0.5;
    // bezierPoint[2] = 0.5-u_slot1*0.5;
    // bezierPoint[3] = 0.5+u_slot1*0.5;
    
    float bottomRange = -0.5;
    float topRange = 1.5;
    vec3 color = vec3(1.);


    if(st.x>-0.01 &&st.y>bottomRange && st.y<topRange && st.x<1.0000){
        color = plot2D(st,lineWidth) ;
        if(st.x<timeProgress){
           
           color += plot2D(st,lineWidth)*vec3(10.,0.,0.) ;
           //color = plot2D(st,lineWidth);
    	}
        
    }
    

    float zoom = 2.;
    uv *= zoom;
    color -= grid2D(uv,gridWidth);
    
    float step = 0.005;
    circlePos = vec2(timeProgress+step,mFunction(timeProgress+step));
    color -= circle(uv - circlePos+vec2(0.001,0.004),circleRadius)*vec3(-10.,1.,1.);

 
    gl_FragColor = vec4(color,1.0);
}