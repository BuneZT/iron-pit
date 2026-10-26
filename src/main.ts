import { GameApp } from './GameApp';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const app = new GameApp(canvas);
void app.init();
