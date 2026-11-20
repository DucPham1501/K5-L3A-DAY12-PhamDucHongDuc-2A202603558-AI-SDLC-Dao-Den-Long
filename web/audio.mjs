export class Soundscape{
  constructor(volume=.5){this.volume=volume;this.context=null;this.master=null;this.music=null;this.lastCountdown=-1;}
  async start(){
    try{this.context??=new(window.AudioContext||window.webkitAudioContext)();await this.context.resume();if(this.master)return;this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);
      this.music=this.context.createGain();this.music.gain.value=.025;this.music.connect(this.master);
      for(const f of [130.81,196,261.63]){const osc=this.context.createOscillator();osc.type='sine';osc.frequency.value=f;osc.connect(this.music);osc.start();}
    }catch{}
  }
  setVolume(value){this.volume=value;if(this.master)this.master.gain.setTargetAtTime(value,this.context.currentTime,.05);}
  setPlaying(playing){if(this.music)this.music.gain.setTargetAtTime(playing?.025:0,this.context.currentTime,.2);}
  effect(name){
    if(!this.master)return;
    const notes={mote_picked:[880],lantern_lit:[523,659,784],pulse:[220,440],player_hit:[150,100],jump:[330,440],dash:[440,660],won:[523,659,784,1046],lost:[330,261,196],shade_spawned:[110,130],countdown:[700],charm_picked:[659,880],drifter_steal:[220,180],wind:[140,150]};
    for(const [i,f]of(notes[name]??[]).entries()){const time=this.context.currentTime+i*.09,osc=this.context.createOscillator(),gain=this.context.createGain();osc.type=['player_hit','shade_spawned'].includes(name)?'triangle':'sine';osc.frequency.setValueAtTime(f,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.08,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+.32);osc.connect(gain);gain.connect(this.master);osc.start(time);osc.stop(time+.35);}
  }
}
