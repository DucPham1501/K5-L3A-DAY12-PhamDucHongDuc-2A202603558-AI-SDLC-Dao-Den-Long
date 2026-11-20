export function frameMetrics(samples){
 if(!samples.length||samples.some(n=>!Number.isFinite(n)||n<=0))throw new Error('Expected positive frame intervals');
 const sorted=[...samples].sort((a,b)=>a-b),n=sorted.length,k=Math.max(1,Math.ceil(.01*n));
 return {avg_fps:1000*n/samples.reduce((a,b)=>a+b,0),p1_low_fps:1000/(sorted.slice(-k).reduce((a,b)=>a+b,0)/k),frame_ms_p95:sorted[Math.ceil(.95*n)-1],frames:n};
}
