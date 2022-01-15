import socketIO from 'socket.io';
import { BEST_STATIC_PARAM, GIVEN_STATIC_PARAM, SIMULATION } from '../constants';
import { simulationHandler } from '../wsHandlers/SimulationHandler';
import { getChartWithBestParams, getChartWithGivenParams } from '../wsHandlers/StaticParamChartHandler';

const options = {
   path: '/notification/',
   cors: {},
};

let io = null;

function startService(httpServer) {
   io = socketIO(httpServer, options);
   io.on('connection', (socket) => {
      socket.on(SIMULATION, simulationHandler);
      socket.on(BEST_STATIC_PARAM, getChartWithBestParams);
      socket.on(GIVEN_STATIC_PARAM, getChartWithGivenParams);
   });
}

export function sendNotification(type, msg) {
   io.emit(type, msg);
}

// export function passIoInstanceToNotificationService(ioInstance) {
//    io = ioInstance;
//    io.on('connection', (socket) => {
//       socket.on('client2server', createOrder);
//       socket.on('disconnect', (reason) => {
//          console.log('disconnect :>> ', reason);
//       });
//       // socket.emit('server2client', 'server here!!');
//    });
// }

// const createOrder = (payload) => {
//    console.log('payload :>> ', payload);
// };

export default {
   startService,
};
