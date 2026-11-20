export class Campaign{
  constructor(){this.reset();}
  reset(){this.night=1;this.scores=[0,0,0];}
  complete(game){if(game.state!=='won')return false;this.scores[game.night-1]=game.score;return true;}
  next(){if(this.night<3)this.night++;return this.night;}
  get total(){return this.scores.reduce((a,b)=>a+b,0);}
}
