import { simulate, stopSimulation } from '../controllers/SimulationController';
// const rawData = require('../../data/LongHistoryBTC.json');
const rawData = require('../../data/historyGold.json');

export function simulationHandler(msg) {
   if (msg === 'stop') {
      stopSimulation();
   } else {
      const { start, end, simuCalcWindow } = msg;
      simulate(start, end, simuCalcWindow, rawData);
   }
}
