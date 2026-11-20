export class Campaign{
  constructor(){this.reset();}
  reset(){this.night=1;this.scores=[0,0,0];this.won=[false,false,false];}
  complete(game){if(game.state!=='won')return false;this.scores[game.night-1]=game.score;this.won[game.night-1]=true;return true;}
  next(){if(this.night<3)this.night++;return this.night;}
  get total(){return this.scores.reduce((a,b)=>a+b,0);}
  get nightsWon(){return this.won.filter(Boolean).length;}
}
